-- Private equipment presets and immutable-by-default journal configurations.
begin;
alter table snowlog_import.gear add column specs jsonb not null default '{}' check(jsonb_typeof(specs)='object');
create table snowlog_import.gear_sets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,
 name text not null check(length(name) between 1 and 120),
 gear_ids jsonb not null check(jsonb_typeof(gear_ids)='array' and jsonb_array_length(gear_ids) between 1 and 30),
 setup jsonb not null default '{}' check(jsonb_typeof(setup)='object'),is_default boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp()
);
create index gear_sets_owner on snowlog_import.gear_sets(user_id,updated_at desc);
create unique index gear_sets_one_default on snowlog_import.gear_sets(user_id) where is_default;
alter table snowlog_import.gear_sets enable row level security;
revoke all on snowlog_import.gear_sets from public,anonymous,authenticated;
create table snowlog_import.journal_gear(
 journal_id uuid primary key references snowlog_import.journals(id) on delete cascade,user_id uuid not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),updated_at timestamptz not null default clock_timestamp()
);
create index journal_gear_owner on snowlog_import.journal_gear(user_id,journal_id);
alter table snowlog_import.journal_gear enable row level security;
revoke all on snowlog_import.journal_gear from public,anonymous,authenticated;

create function snowlog_import.gear_specs(p_category text,p_specs jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare allowed text[]; k text; v text; result jsonb:='{}';
begin
 allowed:=case p_category when '單板' then array['length','profile','flex'] when '固定器' then array['flex','mounting'] when '雪鞋' then array['lacing','flex'] when '頭盔／護具' then array['protection'] when '雪鏡' then array['lens'] when '衣物' then array['layer','waterproof'] when '其他' then array['detail'] else '{}'::text[] end;
 if jsonb_typeof(p_specs) is distinct from 'object' or octet_length(p_specs::text)>8000 then raise exception '裝備規格格式或長度無效'; end if;
 for k in select jsonb_object_keys(p_specs) loop
  if not k=any(allowed) then raise exception '裝備規格與分類不符'; end if;
  if k='length' then
   if p_specs->k='""'::jsonb then continue; end if;
   if jsonb_typeof(p_specs->k) is distinct from 'number' or (p_specs->>k)::numeric<1 or (p_specs->>k)::numeric>300 then raise exception '板長請以 1–300 cm 填寫'; end if;
   result:=result||jsonb_build_object(k,p_specs->k);
  else
   v:=snowlog_import.text_field(p_specs,k,120);
   if v<>'' then result:=result||jsonb_build_object(k,v); end if;
  end if;
 end loop;
 return result;
end; $$;
revoke all on function snowlog_import.gear_specs(text,jsonb) from public,anonymous,authenticated;

create function snowlog_import.gear_configuration(p_ids jsonb,p_setup jsonb,p_set_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=snowlog_import.current_owner(); element jsonb; gid uuid; gear snowlog_import.gear; preset snowlog_import.gear_sets;
 seen uuid[]:='{}'; items jsonb:='[]'; setup jsonb:='{}'; k text; n numeric; stance text;
begin
 if uid is null then raise exception '請先驗證電郵並登入'; end if;
 if jsonb_typeof(p_ids) is distinct from 'array' or jsonb_array_length(p_ids) not between 1 and 30 then raise exception '請選擇 1–30 件自己的裝備'; end if;
 if jsonb_typeof(p_setup) is distinct from 'object' or octet_length(p_setup::text)>2000 then raise exception '裝備設定格式無效'; end if;
 for k in select jsonb_object_keys(p_setup) loop
  if k not in ('stance','frontAngle','backAngle','stanceWidth') then raise exception '裝備設定欄位無效'; end if;
  if k='stance' then
   stance:=snowlog_import.text_field(p_setup,k,40);
   if stance not in ('','Regular 左腳在前','Goofy 右腳在前') then raise exception '請選擇有效慣用腳'; end if;
   if stance<>'' then setup:=setup||jsonb_build_object(k,stance); end if;
  else
   if jsonb_typeof(p_setup->k) is distinct from 'number' then raise exception '角度及站距請填數字'; end if;
   n:=(p_setup->>k)::numeric;
   if (k='stanceWidth' and (n<1 or n>100)) or (k<>'stanceWidth' and (n< -90 or n>90 or trunc(n)<>n)) then raise exception '角度限 -90 至 90 整數，站距限 1–100 cm'; end if;
   setup:=setup||jsonb_build_object(k,n);
  end if;
 end loop;
 for element in select value from jsonb_array_elements(p_ids) loop
  if jsonb_typeof(element) is distinct from 'string' then raise exception '裝備編號格式無效'; end if;
  gid:=(element#>>'{}')::uuid;
  if gid=any(seen) then raise exception '同一件裝備不可重複選擇'; end if;
  seen:=array_append(seen,gid);
  select g.* into gear from snowlog_import.gear g where g.id=gid and g.user_id=uid for share;
  if not found then raise exception '找不到你選擇的裝備，請重新載入'; end if;
  items:=items||jsonb_build_array(jsonb_build_object('id',gear.id,'name',gear.name,'category',gear.category,'brand',gear.brand,'model',gear.model,'size',gear.size,'specs',gear.specs));
 end loop;
 if p_set_id is not null then
  select s.* into preset from snowlog_import.gear_sets s where s.id=p_set_id and s.user_id=uid for share;
  if not found then raise exception '找不到你的裝備組合'; end if;
 end if;
 return jsonb_build_object('items',items,'setup',setup,'setId',preset.id,'setName',preset.name);
exception when invalid_text_representation then raise exception '裝備編號或設定格式無效';
end; $$;
revoke all on function snowlog_import.gear_configuration(jsonb,jsonb,uuid) from public,anonymous,authenticated;

create function public.snowlog_gear_set_save(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; sid uuid; prior snowlog_import.gear_sets; saved snowlog_import.gear_sets; config jsonb; ids jsonb; v_name text; v_default boolean;
begin
 perform snowlog_import.claim_legacy_user(auth.uid());uid:=snowlog_import.current_owner();
 if uid is null then raise exception '請先驗證電郵並登入'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>12000 then raise exception '裝備組合格式或長度無效'; end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('id','name','gearIds','setup','isDefault','expectedUpdatedAt')) then raise exception '裝備組合欄位無效'; end if;
 if jsonb_typeof(p_data->'isDefault') is distinct from 'boolean' then raise exception '常用組合選項無效'; end if;
 v_name:=snowlog_import.text_field(p_data,'name',120,true);v_default:=(p_data->>'isDefault')::boolean;
 perform 1 from snowlog_import.profiles p where p.id=uid for update;
 if nullif(p_data->>'id','') is not null then
  sid:=(p_data->>'id')::uuid;
  select s.* into prior from snowlog_import.gear_sets s where s.id=sid and s.user_id=uid for update;
  if not found then raise exception '找不到你的裝備組合'; end if;
  if not p_data?'expectedUpdatedAt' or prior.updated_at is distinct from nullif(p_data->>'expectedUpdatedAt','')::timestamptz then raise exception '裝備組合已在其他視窗更新，請重新載入'; end if;
 end if;
 config:=snowlog_import.gear_configuration(p_data->'gearIds',coalesce(p_data->'setup','{}'),null);
 select jsonb_agg(e->'id') into ids from jsonb_array_elements(config->'items') e;
 if v_default then update snowlog_import.gear_sets s set is_default=false,updated_at=clock_timestamp() where s.user_id=uid and s.is_default and s.id is distinct from sid; end if;
 if sid is null then
  insert into snowlog_import.gear_sets(user_id,name,gear_ids,setup,is_default) values(uid,v_name,ids,config->'setup',v_default) returning * into saved;
 else
  update snowlog_import.gear_sets s set name=v_name,gear_ids=ids,setup=config->'setup',is_default=v_default,updated_at=clock_timestamp() where s.id=sid and s.user_id=uid returning s.* into saved;
 end if;
 return to_jsonb(saved);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception '裝備組合編號或版本格式無效';
end; $$;

create function public.snowlog_equipment_snapshot() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 perform snowlog_import.claim_legacy_user(auth.uid());uid:=snowlog_import.current_owner();
 if uid is null then raise exception '請先驗證電郵並登入'; end if;
 return jsonb_build_object(
  'gear',coalesce((select jsonb_agg(to_jsonb(g) order by g.updated_at desc,g.id) from snowlog_import.gear g where g.user_id=uid),'[]'),
  'gearSets',coalesce((select jsonb_agg(to_jsonb(s) order by s.is_default desc,s.updated_at desc,s.id) from snowlog_import.gear_sets s where s.user_id=uid),'[]'),
  'journalGear',coalesce((select jsonb_agg(to_jsonb(u) order by u.updated_at desc) from snowlog_import.journal_gear u join snowlog_import.journals j on j.id=u.journal_id where u.user_id=uid and j.user_id=uid),'[]')
 );
end; $$;

create function public.snowlog_journal_gear_save(p_data jsonb,p_practices jsonb,p_gear jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; saved jsonb; jid uuid; config jsonb; mode text;
begin
 perform snowlog_import.claim_legacy_user(auth.uid());uid:=snowlog_import.current_owner();
 if uid is null then raise exception '請先驗證電郵並登入'; end if;
 if p_gear is not null then
  if jsonb_typeof(p_gear) is distinct from 'object' or octet_length(p_gear::text)>12000 then raise exception '當天裝備格式或長度無效'; end if;
  if exists(select 1 from jsonb_object_keys(p_gear) k where k not in ('mode','gearIds','setup','setId')) then raise exception '當天裝備欄位無效'; end if;
  mode:=snowlog_import.text_field(p_gear,'mode',10,true);
  if mode not in ('keep','set','clear') then raise exception '請選擇保留、更新或清除裝備配置'; end if;
 end if;
 -- Match the existing journal/profile lock order before taking equipment locks.
 saved:=public.snowlog_journal_practice_save(p_data,p_practices);jid:=(saved->>'journalId')::uuid;
 if mode='set' then
  config:=snowlog_import.gear_configuration(p_gear->'gearIds',coalesce(p_gear->'setup','{}'),nullif(p_gear->>'setId','')::uuid);
  insert into snowlog_import.journal_gear(journal_id,user_id,snapshot) values(jid,uid,config)
   on conflict(journal_id) do update set snapshot=excluded.snapshot,updated_at=clock_timestamp() where journal_gear.user_id=uid;
 elsif mode='clear' then delete from snowlog_import.journal_gear u where u.journal_id=jid and u.user_id=uid;
 end if;
 return saved;
exception when invalid_text_representation then raise exception '當天裝備編號格式無效';
end; $$;
revoke all on function public.snowlog_gear_set_save(jsonb),public.snowlog_equipment_snapshot(),public.snowlog_journal_gear_save(jsonb,jsonb,jsonb) from public,anonymous;
grant execute on function public.snowlog_gear_set_save(jsonb),public.snowlog_equipment_snapshot(),public.snowlog_journal_gear_save(jsonb,jsonb,jsonb) to authenticated;

-- The existing gear writer, with category-specific specs added below.

create or replace function public.snowlog_gear_save(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid; gid uuid; existing snowlog_import.gear; saved snowlog_import.gear;
  v_name text; v_category text; v_brand text; v_model text; v_size text; v_status text; v_notes text; v_date text; purchased date;
  v_specs jsonb; photos jsonb; photo jsonb; normalized jsonb:='[]'; v_path text; object snowlog_import.media_objects;
begin
  perform snowlog_import.claim_legacy_user(auth.uid());
  uid:=snowlog_import.current_owner();
  if uid is null then raise exception '請先驗證電郵並登入'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>18000 then raise exception '裝備資料格式或長度無效'; end if;
  if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('id','name','category','brand','model','size','purchasedOn','notes','status','photos','specs','expectedUpdatedAt')) then raise exception '裝備欄位無效'; end if;
  v_name:=snowlog_import.text_field(p_data,'name',120,true);
  v_category:=snowlog_import.text_field(p_data,'category',20,true);
  v_brand:=snowlog_import.text_field(p_data,'brand',120);
  v_model:=snowlog_import.text_field(p_data,'model',120);
  v_size:=snowlog_import.text_field(p_data,'size',120);
  v_notes:=snowlog_import.text_field(p_data,'notes',4000);
  v_status:=snowlog_import.text_field(p_data,'status',20,true);
  if v_category not in ('單板','固定器','雪鞋','頭盔／護具','雪鏡','衣物','其他') or v_status not in ('使用中','備用','已退役') then raise exception '請選擇有效的裝備分類及狀態'; end if;
  v_date:=snowlog_import.text_field(p_data,'purchasedOn',10);
  if v_date<>'' then
    if v_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception '請填寫有效的購入日期'; end if;
    purchased:=v_date::date;
    if to_char(purchased,'YYYY-MM-DD')<>v_date then raise exception '請填寫有效的購入日期'; end if;
  end if;
  v_specs:=snowlog_import.gear_specs(v_category,coalesce(p_data->'specs','{}'));
  photos:=coalesce(p_data->'photos','[]');
  if jsonb_typeof(photos) is distinct from 'array' then raise exception '照片資料格式無效'; end if;
  if jsonb_array_length(photos)>1 then raise exception '每件裝備最多一張照片'; end if;
  for photo in select value from jsonb_array_elements(photos) loop
    v_path:=snowlog_import.text_field(photo,'path',200,true);
    if v_path !~ ('^'||uid::text||'/gear/[a-f0-9-]{36}\.(jpg|png|webp)$') then raise exception '裝備照片位置無效'; end if;
    select m.* into object from snowlog_import.media_objects m where m.path=v_path and m.user_id=uid for share;
    if not found or object.mime not in ('image/jpeg','image/png','image/webp') or object.bytes>10485760 then raise exception '裝備照片尚未上傳完成'; end if;
    normalized:=jsonb_build_array(jsonb_build_object('id',split_part(split_part(v_path,'/',3),'.',1),'path',v_path,'kind','image','type',object.mime,'size',object.bytes,'name',snowlog_import.text_field(photo,'name',200,true)));
  end loop;
  if nullif(p_data->>'id','') is not null then
    gid:=(p_data->>'id')::uuid;
    select g.* into existing from snowlog_import.gear g where g.id=gid and g.user_id=uid for update;
    if not found then raise exception '找不到這件裝備，或你沒有修改權限'; end if;
    if existing.updated_at is distinct from nullif(p_data->>'expectedUpdatedAt','')::timestamptz then raise exception '裝備已在其他視窗更新，請重新載入後再編輯'; end if;
    update snowlog_import.gear g set name=v_name,category=v_category,brand=v_brand,model=v_model,size=v_size,purchased_on=purchased,notes=v_notes,status=v_status,photos=normalized,specs=case when p_data?'specs' then v_specs when existing.category=v_category then existing.specs else '{}'::jsonb end,updated_at=clock_timestamp()
    where g.id=gid and g.user_id=uid returning g.* into saved;
  else
    insert into snowlog_import.gear(user_id,name,category,brand,model,size,purchased_on,notes,status,photos,specs)
    values(uid,v_name,v_category,v_brand,v_model,v_size,purchased,v_notes,v_status,normalized,v_specs) returning * into saved;
  end if;
  return to_jsonb(saved);
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then
  raise exception '裝備資料格式無效，請檢查日期後重試';
end; $$;

notify pgrst,'reload schema';
commit;
