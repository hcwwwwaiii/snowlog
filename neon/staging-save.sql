create function snowlog_import.current_owner() returns uuid language sql stable security invoker set search_path='' as $$ select coalesce((select c.legacy_user_id from snowlog_import.identity_claims c where c.neon_user_id=u.id),u.id) from neon_auth."user" u where u.id=auth.uid() and u."emailVerified" and not coalesce(u.banned,false) $$;

CREATE OR REPLACE FUNCTION snowlog_import.text_field(p jsonb, k text, max_length integer DEFAULT 4000, required boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare v text:=trim(coalesce(p->>k,''));begin
  if p ? k and p->k<>'null'::jsonb and jsonb_typeof(p->k)<>'string' then raise exception '文字資料格式無效：%',k;end if;
  if length(v)>max_length or (required and v='') then raise exception '請填寫有效內容：%',k;end if;return v;
end;$function$;

CREATE OR REPLACE FUNCTION snowlog_import.is_member(p_trip uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select snowlog_import.current_owner()) is not null and exists(select 1 from snowlog_import.memberships where trip_id=p_trip and user_id=(select snowlog_import.current_owner()));
$function$;

CREATE OR REPLACE FUNCTION snowlog_import.can_read_shared(p_trip uuid, p_author uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select snowlog_import.current_owner()) is not null and snowlog_import.is_member(p_trip)
  and exists(select 1 from snowlog_import.memberships where trip_id=p_trip and user_id=p_author);
$function$;

CREATE OR REPLACE FUNCTION snowlog_import.normalize_assessment(skill text, a jsonb, old jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 defs constant jsonb:='{"one-foot":{"checks":["c1","c2","c3"],"sides":[]},"heel-edge":{"checks":["c1","c2","c3"],"sides":[]},"toe-edge":{"checks":["c1","c2","c3"],"sides":[]},"falling-leaf":{"checks":["c1","c2","c3"],"sides":["left","right"]},"j-turn":{"checks":["c1","c2","c3"],"sides":["heel","toe"]},"linked-turns":{"checks":["c1","c2","c3"],"sides":["heel-to-toe","toe-to-heel"]},"speed-control":{"checks":["c1","c2","c3"],"sides":["heel","toe"]},"turn-rhythm":{"checks":["c1","c2","c3"],"sides":["heel","toe"]},"carving":{"checks":["c1","c2","c3"],"sides":["heel","toe"]},"switch":{"checks":["c1","c2","c3"],"sides":["heel","toe"]},"short-turns":{"checks":["c1","c2","c3"],"sides":["heel","toe"]},"variable-snow":{"checks":["c1","c2","c3"],"sides":["heel","toe"]},"terrain":{"checks":["c1","c2","c3"],"sides":[]},"ollie":{"checks":["c1","c2","c3"],"sides":["regular","switch"]},"butter":{"checks":["c1","c2","c3"],"sides":["nose","tail"]},"park":{"checks":["c1","c2","c3"],"sides":[]}}';
 choices constant jsonb:='{"slope":["","緩坡","中等坡度","較陡坡度","平地／設施區"],"snow":["","壓雪","鬆雪","硬雪／冰面","濕雪","混合雪況"],"speed":["","低速","中速","較快"],"stance":["","正腳","反腳","兩者都有"]}';
 item jsonb; prior jsonb; normalized jsonb:='[]'; checked jsonb; sides jsonb; conditions jsonb;
 key text; val jsonb; bid uuid; seen text[]:='{}'; text_value text; note_value text; resolved_value boolean; created_value jsonb; resolved_time jsonb;
begin
 if jsonb_typeof(a) is distinct from 'object' or octet_length(a::text)>24000 or not defs ? skill then raise exception '自評格式或長度無效';end if;
 if exists(select 1 from jsonb_object_keys(a) k where k not in ('checked','sides','conditions','blockers')) then raise exception '自評欄位無效';end if;
 checked:=coalesce(a->'checked','[]');sides:=coalesce(a->'sides','{}');conditions:=coalesce(a->'conditions','{}');
 if jsonb_typeof(checked) is distinct from 'array' then raise exception '掌握項目格式無效';end if;
 if jsonb_array_length(checked)>3 or exists(select 1 from jsonb_array_elements(checked) c where jsonb_typeof(c.value)<>'string' or not (defs->skill->'checks') ? (c.value#>>'{}')) or
 (select count(distinct value) from jsonb_array_elements_text(checked))<>jsonb_array_length(checked) then raise exception '掌握項目無效或重複';end if;
 select coalesce(jsonb_agg(value order by value),'[]') into checked from jsonb_array_elements_text(checked);
 if jsonb_typeof(sides) is distinct from 'object' then raise exception '分邊程度格式無效';end if;
 for key,val in select * from jsonb_each(sides) loop
  if not (defs->skill->'sides') ? key or jsonb_typeof(val)<>'number' or val::text not in ('0','1','2','3') then raise exception '分邊程度無效';end if;
 end loop;
 -- Canonical empty values make an untouched form a no-op.
 select coalesce(jsonb_object_agg(e.key,e.value),'{}') into sides from jsonb_each(sides) e where e.value<>'0'::jsonb;
 if jsonb_typeof(conditions) is distinct from 'object' then raise exception '成功條件格式無效';end if;
 for key,val in select * from jsonb_each(conditions) loop
  if not choices ? key or jsonb_typeof(val)<>'string' or not (choices->key) ? (val#>>'{}') then raise exception '成功條件選項無效';end if;
 end loop;
 select coalesce(jsonb_object_agg(e.key,e.value),'{}') into conditions from jsonb_each(conditions) e where e.value<>'""'::jsonb;
 if jsonb_typeof(coalesce(a->'blockers','[]')) is distinct from 'array' then raise exception '待改善事項格式無效';end if;
 if jsonb_array_length(coalesce(a->'blockers','[]'))>30 then raise exception '每項技巧最多保存 30 項待改善事項';end if;
 for item in select value from jsonb_array_elements(coalesce(a->'blockers','[]')) loop
  if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'id') is distinct from 'string' or jsonb_typeof(item->'resolved') is distinct from 'boolean' then raise exception '待改善事項格式無效';end if;
  bid:=(item->>'id')::uuid;if bid::text=any(seen) then raise exception '待改善事項不可重複';end if;seen:=array_append(seen,bid::text);
  text_value:=snowlog_import.text_field(item,'text',240,true);note_value:=snowlog_import.text_field(item,'note',1000);resolved_value:=(item->>'resolved')::boolean;
  select value into prior from jsonb_array_elements(coalesce(old->'blockers','[]')) where value->>'id'=bid::text;
  created_value:=coalesce(prior->'created_at',to_jsonb(now()));
  resolved_time:=case when not resolved_value then 'null'::jsonb when coalesce((prior->>'resolved')::boolean,false) then coalesce(prior->'resolved_at',to_jsonb(now())) else to_jsonb(now()) end;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('id',bid,'text',text_value,'resolved',resolved_value,'note',note_value,'created_at',created_value,'resolved_at',resolved_time));
 end loop;
 if exists(select 1 from jsonb_array_elements(coalesce(old->'blockers','[]')) b where not (b.value->>'id')=any(seen)) then raise exception '待改善紀錄須保留；可標記已解決';end if;
 if checked='[]' and sides='{}' and conditions='{}' and normalized='[]' then return '{}';end if;
 return jsonb_build_object('checked',checked,'sides',sides,'conditions',conditions,'blockers',normalized);
end;$function$;

CREATE OR REPLACE FUNCTION snowlog_import.normalize_journal_media(p_user uuid, p_media jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare item jsonb; result jsonb:='[]'; v_path text; mime text; kind text; bytes bigint; total bigint:=0; file_metadata jsonb;
begin
 if p_user is distinct from (select snowlog_import.current_owner()) or p_user is null then raise exception '請先登入';end if;
 if jsonb_typeof(p_media) is distinct from 'array' or jsonb_array_length(p_media)>6 then raise exception '每篇日誌最多 6 個影像';end if;
 for item in select value from jsonb_array_elements(p_media) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'size') is distinct from 'number' then raise exception '影像資料格式無效';end if;
  v_path:=snowlog_import.text_field(item,'path',200,true);mime:=snowlog_import.text_field(item,'type',80,true);kind:=snowlog_import.text_field(item,'kind',10,true);bytes:=(item->>'size')::bigint;
  if v_path !~ ('^'||p_user::text||'/[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm|mov)$') or split_part(v_path,'/',2)<>snowlog_import.text_field(item,'id',36,true)||'.'||split_part(v_path,'.',2) then raise exception '影像位置無效';end if;
  if not mime=any(array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']) or kind<>(case when mime like 'image/%' then 'image' else 'video' end) then raise exception '不支援的影像格式';end if;
  if bytes<=0 or bytes>(case when kind='image' then 10485760 else 52428800 end) then raise exception '相片上限 10 MB，影片上限 50 MB';end if;
  total:=total+bytes;if total>104857600 then raise exception '每篇日誌影像合計上限 100 MB';end if;
  if exists(select 1 from jsonb_array_elements(result) r where r->>'path'=v_path) then raise exception '影像重複';end if;
  select jsonb_build_object('mimetype',o.mime,'size',o.bytes) into file_metadata from snowlog_import.media_objects o where o.path=v_path and o.user_id=p_user for share;
  if not found or file_metadata->>'mimetype' is distinct from mime or (file_metadata->>'size')::bigint is distinct from bytes then raise exception '影像尚未上傳完成，請重新選擇檔案';end if;
  result:=result||jsonb_build_array(jsonb_build_object('id',item->>'id','path',v_path,'type',mime,'kind',kind,'size',bytes,'name',snowlog_import.text_field(item,'name',200,true)));
 end loop;
 return result;
end;$function$;

CREATE OR REPLACE FUNCTION snowlog_import.save(p_action text, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid:=(select snowlog_import.current_owner()); rid uuid; tid uuid; t snowlog_import.trips; val text; v_url text; v_skill text;
  v_date date; v_end date; v_status integer; v_shared boolean; v_todos jsonb; v_item jsonb; v_index integer; v_before jsonb; v_after jsonb; v_assessment jsonb;
  allowed text[]:=array['one-foot','heel-edge','toe-edge','falling-leaf','j-turn','linked-turns','speed-control','turn-rhythm','carving','switch','short-turns','variable-snow','terrain','ollie','butter','park'];
begin
  if uid is null then raise exception '請先登入';end if;
  if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>100000 then raise exception '資料格式或長度無效';end if;
  insert into snowlog_import.profiles(id,name) values(uid,left(coalesce(nullif(auth.jwt()->'user_metadata'->>'display_name',''),nullif(split_part(auth.jwt()->>'email','@',1),''),'滑雪同伴'),120)) on conflict(id) do nothing;
  if p_action='progress' then perform 1 from snowlog_import.profiles where id=uid for update;end if;
  if p_action='focus' then
    if jsonb_typeof(p_data->'skillIds') is distinct from 'array' then raise exception '練習重點格式無效';end if;
    if jsonb_array_length(p_data->'skillIds')>3 then raise exception '最多選擇 3 項練習重點';end if;
    if exists(select 1 from jsonb_array_elements(p_data->'skillIds') s where jsonb_typeof(s.value)<>'string' or not (s.value#>>'{}')=any(allowed)) then raise exception '技巧不存在';end if;
    if (select count(distinct value) from jsonb_array_elements_text(p_data->'skillIds'))<>jsonb_array_length(p_data->'skillIds') then raise exception '練習重點不可重複';end if;
    update snowlog_import.profiles set focus_skills=array(select jsonb_array_elements_text(p_data->'skillIds')) where id=uid;
  elsif p_action='profile' then
    update snowlog_import.profiles set name=snowlog_import.text_field(p_data,'name',120,true),stance=snowlog_import.text_field(p_data,'stance',120,true),goal=snowlog_import.text_field(p_data,'goal') where id=uid;
  elsif p_action='progress' then
    v_skill:=snowlog_import.text_field(p_data,'skillId',120,true);v_status:=(p_data->>'status')::integer;
    if not v_skill=any(allowed) or v_status is null or v_status not between 0 and 3 then raise exception '技巧或狀態無效';end if;
    val:=snowlog_import.text_field(p_data,'conditions');if v_status=3 and val='' then raise exception '標記為穩定時，請填寫適用條件';end if;
    v_url:=snowlog_import.text_field(p_data,'video',2000);if v_url<>'' and v_url !~* '^https?://[^[:space:]]+$' then raise exception '連結必須以 https:// 或 http:// 開頭';end if;
    select to_jsonb(p) into v_before from snowlog_import.progress p where user_id=uid and skill_id=v_skill;
    if p_data ? 'expectedUpdatedAt' and (p_data->>'expectedUpdatedAt')::timestamptz is distinct from (v_before->>'updated_at')::timestamptz then raise exception '這項技巧已在其他地方更新，請關閉視窗並重新整理後再修改';end if;
    v_assessment:=case when p_data ? 'assessment' then snowlog_import.normalize_assessment(v_skill,p_data->'assessment',coalesce(v_before->'assessment','{}')) else coalesce(v_before->'assessment','{}') end;
    insert into snowlog_import.progress(user_id,skill_id,status,conditions,notes,next_step,video,feedback,assessment) values(uid,v_skill,v_status,val,snowlog_import.text_field(p_data,'notes'),snowlog_import.text_field(p_data,'nextStep'),v_url,snowlog_import.text_field(p_data,'feedback'),v_assessment)
    on conflict(user_id,skill_id) do update set status=excluded.status,conditions=excluded.conditions,notes=excluded.notes,next_step=excluded.next_step,video=excluded.video,feedback=excluded.feedback,assessment=excluded.assessment,updated_at=now();
    select to_jsonb(p) into v_after from snowlog_import.progress p where user_id=uid and skill_id=v_skill;
    if (v_before-'updated_at') is distinct from (v_after-'updated_at') then
      insert into snowlog_import.progress_history(user_id,skill_id,previous_status,snapshot) values(uid,v_skill,(v_before->>'status')::integer,v_after);
    end if;
  elsif p_action='journal' then
    rid:=coalesce((p_data->>'id')::uuid,gen_random_uuid());tid:=(p_data->>'tripId')::uuid;v_date:=(p_data->>'date')::date;v_shared:=coalesce((p_data->>'shared')::boolean,false);
    if p_data ? 'id' and p_data->>'id' is not null and not exists(select 1 from snowlog_import.journals where id=rid and user_id=uid) then raise exception '找不到你的日誌';end if;
    if v_date is null or v_date::text<>p_data->>'date' then raise exception '滑雪日期無效';end if;
    if tid is not null then
      select * into t from snowlog_import.trips where id=tid for share;
      if not found or not snowlog_import.is_member(tid) then raise exception '你未加入這個行程';end if;
      if v_date<t.start_date or v_date>t.end_date then raise exception '日誌日期須在所選行程日期內';end if;
    end if;
    if v_shared and tid is null then raise exception '分享日誌前請先選擇同行行程';end if;
    if jsonb_typeof(p_data->'skillIds')<>'array' or jsonb_array_length(p_data->'skillIds')>16 then raise exception '練習技巧格式無效';end if;
    if exists(select 1 from jsonb_array_elements_text(p_data->'skillIds') s where not s.value=any(allowed)) then raise exception '技巧不存在';end if;
    v_url:=snowlog_import.text_field(p_data,'video',2000);if v_url<>'' and v_url !~* '^https?://[^[:space:]]+$' then raise exception '附件連結無效';end if;
    insert into snowlog_import.journals(id,user_id,date,resort,skill_ids,notes,next_step,snow,mood,video,trip_id,shared) values(rid,uid,v_date,snowlog_import.text_field(p_data,'resort',120,true),p_data->'skillIds',snowlog_import.text_field(p_data,'notes'),snowlog_import.text_field(p_data,'nextStep'),snowlog_import.text_field(p_data,'snow',120),snowlog_import.text_field(p_data,'mood',120,true),v_url,tid,v_shared)
    on conflict(id) do update set date=excluded.date,resort=excluded.resort,skill_ids=excluded.skill_ids,notes=excluded.notes,next_step=excluded.next_step,snow=excluded.snow,mood=excluded.mood,video=excluded.video,trip_id=excluded.trip_id,shared=excluded.shared,updated_at=now() where journals.user_id=uid;
    if p_data ? 'media' then update snowlog_import.journals set media=snowlog_import.normalize_journal_media(uid,p_data->'media') where id=rid and user_id=uid;end if;
  elsif p_action='trip' then
    tid:=coalesce((p_data->>'id')::uuid,gen_random_uuid());v_date:=(p_data->>'startDate')::date;v_end:=(p_data->>'endDate')::date;v_todos:=p_data->'todos';
    if v_date is null or v_end is null or v_date::text<>p_data->>'startDate' or v_end::text<>p_data->>'endDate' or v_end<v_date then raise exception '開始與結束日期無效';end if;
    if jsonb_typeof(v_todos)<>'array' or jsonb_array_length(v_todos)>50 then raise exception '待辦清單格式無效';end if;
    for v_item in select value from jsonb_array_elements(v_todos) loop
      if jsonb_typeof(v_item)<>'object' or jsonb_typeof(v_item->'done')<>'boolean' then raise exception '待辦格式無效';end if;
      rid:=(v_item->>'id')::uuid;if rid is null then raise exception '待辦編號無效';end if;
      perform snowlog_import.text_field(v_item,'text',120,true);perform snowlog_import.text_field(v_item,'assignee',120);
    end loop;
    if p_data ? 'id' and p_data->>'id' is not null then
      select * into t from snowlog_import.trips where id=tid for update;
      if not found or t.owner_id<>uid then raise exception '只有行程建立者可以修改共同安排';end if;
      update snowlog_import.trips set title=snowlog_import.text_field(p_data,'title',120,true),resort=snowlog_import.text_field(p_data,'resort',120,true),start_date=v_date,end_date=v_end,accommodation=snowlog_import.text_field(p_data,'accommodation'),transport=snowlog_import.text_field(p_data,'transport'),itinerary=snowlog_import.text_field(p_data,'itinerary'),todos=v_todos,updated_at=now() where id=tid;
    else
      insert into snowlog_import.trips(id,owner_id,title,resort,start_date,end_date,accommodation,transport,itinerary,todos) values(tid,uid,snowlog_import.text_field(p_data,'title',120,true),snowlog_import.text_field(p_data,'resort',120,true),v_date,v_end,snowlog_import.text_field(p_data,'accommodation'),snowlog_import.text_field(p_data,'transport'),snowlog_import.text_field(p_data,'itinerary'),v_todos);
      insert into snowlog_import.memberships(trip_id,user_id) values(tid,uid);
    end if;
  elsif p_action='join' then
    val:=upper(snowlog_import.text_field(p_data,'code',16,true));if val !~ '^[A-F0-9]{16}$' then raise exception '請輸入 16 位邀請碼';end if;
    select * into t from snowlog_import.trips where invite_code=val for update;if not found then raise exception '邀請碼不存在或已更新';end if;
    insert into snowlog_import.memberships(trip_id,user_id) values(t.id,uid) on conflict(trip_id,user_id) do nothing;
  elsif p_action in ('tripGoal','todo','rotateInvite','leaveTrip') then
    tid:=(p_data->>'tripId')::uuid;select * into t from snowlog_import.trips where id=tid for update;
    if not found or not snowlog_import.is_member(tid) then raise exception '你未加入這個行程';end if;
    if p_action='tripGoal' then
      update snowlog_import.memberships set goal=snowlog_import.text_field(p_data,'goal') where trip_id=tid and user_id=uid;
    elsif p_action='todo' then
      if jsonb_typeof(p_data->'done')<>'boolean' then raise exception '待辦狀態無效';end if;
      select (ordinality-1)::integer into v_index from jsonb_array_elements(t.todos) with ordinality where value->>'id'=p_data->>'todoId';
      if v_index is null then raise exception '待辦事項已刪除';end if;
      update snowlog_import.trips set todos=jsonb_set(todos,array[v_index::text,'done'],p_data->'done'),updated_at=now() where id=tid;
    elsif p_action='rotateInvite' then
      if t.owner_id<>uid then raise exception '只有建立者可以更新邀請碼';end if;
      update snowlog_import.trips set invite_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),updated_at=now() where id=tid;
    else
      if t.owner_id=uid then raise exception '建立者須刪除行程；其他成員可退出';end if;
      update snowlog_import.journals set shared=false,trip_id=null,updated_at=now() where trip_id=tid and user_id=uid;
      delete from snowlog_import.memberships where trip_id=tid and user_id=uid;
    end if;
  elsif p_action='resource' then
    rid:=coalesce((p_data->>'id')::uuid,gen_random_uuid());
    if p_data ? 'id' and p_data->>'id' is not null and not exists(select 1 from snowlog_import.resources where id=rid and user_id=uid) then raise exception '找不到你的收藏';end if;
    v_url:=snowlog_import.text_field(p_data,'url',2000);if v_url<>'' and v_url !~* '^https?://[^[:space:]]+$' then raise exception '連結必須以 https:// 或 http:// 開頭';end if;
    v_skill:=snowlog_import.text_field(p_data,'skillId',120);if v_skill<>'' and not v_skill=any(allowed) then raise exception '技巧不存在';end if;
    insert into snowlog_import.resources(id,user_id,title,type,url,notes,skill_id) values(rid,uid,snowlog_import.text_field(p_data,'title',120,true),snowlog_import.text_field(p_data,'type',120,true),v_url,snowlog_import.text_field(p_data,'notes'),v_skill)
    on conflict(id) do update set title=excluded.title,type=excluded.type,url=excluded.url,notes=excluded.notes,skill_id=excluded.skill_id,updated_at=now() where resources.user_id=uid;
  elsif p_action='delete' then
    rid:=(p_data->>'id')::uuid;val:=p_data->>'kind';
    if val='journal' then delete from snowlog_import.journals where id=rid and user_id=uid;
    elsif val='resource' then delete from snowlog_import.resources where id=rid;
    elsif val='trip' then
      select * into t from snowlog_import.trips where id=rid for update;if not found or t.owner_id<>uid then raise exception '只有建立者可以刪除行程';end if;
      update snowlog_import.journals set shared=false,trip_id=null,updated_at=now() where trip_id=rid;
      delete from snowlog_import.trips where id=rid;
    else raise exception '操作無效';end if;
  else raise exception '不支援這個操作';end if;
  return jsonb_build_object('ok',true);
exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then raise exception '日期、編號或資料格式無效';
end;$function$;

revoke all on function snowlog_import.current_owner() from public;

revoke all on function snowlog_import.text_field(jsonb,text,integer,boolean) from public;

revoke all on function snowlog_import.is_member(uuid) from public;

revoke all on function snowlog_import.can_read_shared(uuid,uuid) from public;

revoke all on function snowlog_import.normalize_assessment(text,jsonb,jsonb) from public;

revoke all on function snowlog_import.normalize_journal_media(uuid,jsonb) from public;

revoke all on function snowlog_import.save(text,jsonb) from public;

create function public.snowlog_migration_save(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$ declare uid uuid:=auth.uid(); begin if not exists (select 1 from neon_auth."user" u where u.id=uid and u."emailVerified" and not coalesce(u.banned,false)) then raise exception '請先驗證電郵並登入'; end if; perform snowlog_import.claim_legacy_user(uid); return snowlog_import.save(p_action,p_data); end $$;

revoke all on function public.snowlog_migration_save(text,jsonb) from public,anonymous;

grant execute on function public.snowlog_migration_save(text,jsonb) to authenticated;

