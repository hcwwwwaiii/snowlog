-- Private equipment. Existing journal, trip and shared-resource RPCs stay unchanged.
begin;
create table snowlog_import.gear (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null check(length(name) between 1 and 120),
  category text not null check(category in ('單板','固定器','雪鞋','頭盔／護具','雪鏡','衣物','其他')),
  brand text not null default '' check(length(brand)<=120),
  model text not null default '' check(length(model)<=120),
  size text not null default '' check(length(size)<=120),
  purchased_on date,
  notes text not null default '' check(length(notes)<=4000),
  status text not null check(status in ('使用中','備用','已退役')),
  photos jsonb not null default '[]' check(jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=1),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index gear_owner_updated on snowlog_import.gear(user_id,updated_at desc);
alter table snowlog_import.gear enable row level security;
revoke all on snowlog_import.gear from public, anonymous, authenticated;

create function public.snowlog_gear_snapshot() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
  perform snowlog_import.claim_legacy_user(auth.uid());
  uid:=snowlog_import.current_owner();
  if uid is null then raise exception '請先驗證電郵並登入'; end if;
  return coalesce((select jsonb_agg(to_jsonb(g) order by g.updated_at desc,g.id) from snowlog_import.gear g where g.user_id=uid),'[]');
end; $$;

create function public.snowlog_gear_save(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid; gid uuid; existing snowlog_import.gear; saved snowlog_import.gear;
  v_name text; v_category text; v_brand text; v_model text; v_size text; v_status text; v_notes text; v_date text; purchased date;
  photos jsonb; photo jsonb; normalized jsonb:='[]'; v_path text; object snowlog_import.media_objects;
begin
  perform snowlog_import.claim_legacy_user(auth.uid());
  uid:=snowlog_import.current_owner();
  if uid is null then raise exception '請先驗證電郵並登入'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>18000 then raise exception '裝備資料格式或長度無效'; end if;
  if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('id','name','category','brand','model','size','purchasedOn','notes','status','photos','expectedUpdatedAt')) then raise exception '裝備欄位無效'; end if;
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
    update snowlog_import.gear g set name=v_name,category=v_category,brand=v_brand,model=v_model,size=v_size,purchased_on=purchased,notes=v_notes,status=v_status,photos=normalized,updated_at=clock_timestamp()
    where g.id=gid and g.user_id=uid returning g.* into saved;
  else
    insert into snowlog_import.gear(user_id,name,category,brand,model,size,purchased_on,notes,status,photos)
    values(uid,v_name,v_category,v_brand,v_model,v_size,purchased,v_notes,v_status,normalized) returning * into saved;
  end if;
  return to_jsonb(saved);
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then
  raise exception '裝備資料格式無效，請檢查日期後重試';
end; $$;
revoke all on function public.snowlog_gear_snapshot() from public, anonymous;
revoke all on function public.snowlog_gear_save(jsonb) from public, anonymous;
grant execute on function public.snowlog_gear_snapshot() to authenticated;
grant execute on function public.snowlog_gear_save(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
