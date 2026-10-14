-- Practice focus and private progress history. Existing journal sharing stays unchanged.
-- Guard against replacing a newer private RPC implementation.
do $$begin
 if (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='snowlog_private' and proname='save')<>'fe90f888ede86d2e0e13d06363377d19' or
    (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='snowlog_private' and proname='snapshot')<>'213a070029a831352687feb9d76b7c9b' then
   raise exception 'Existing Snowlog functions changed; review before applying';
 end if;
end;$$;
alter table public.snowlog_profiles add column focus_skills text[] not null default '{}'::text[]
 check(cardinality(focus_skills)<=3 and focus_skills<@array['one-foot','heel-edge','toe-edge','falling-leaf','j-turn','linked-turns','speed-control','turn-rhythm','carving','switch','short-turns','variable-snow','terrain','ollie','butter','park']::text[]);
create table snowlog_private.progress_history(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 skill_id text not null,
 previous_status integer check(previous_status between 0 and 3),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 recorded_at timestamptz not null default now(), baseline boolean not null default false
);
create index snowlog_progress_history_user_time_idx on snowlog_private.progress_history(user_id,recorded_at desc);
alter table snowlog_private.progress_history enable row level security;
create policy progress_history_owner_read on snowlog_private.progress_history for select to authenticated using((select auth.uid())=user_id);
revoke all on table snowlog_private.progress_history from public,anon,authenticated;
grant select on table snowlog_private.progress_history to authenticated;
-- This is a labelled starting snapshot, not reconstructed historical updates.
insert into snowlog_private.progress_history(user_id,skill_id,snapshot,recorded_at,baseline)
 select user_id,skill_id,to_jsonb(p),updated_at,true from public.snowlog_progress p;
create or replace function snowlog_private.save(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=(select auth.uid()); rid uuid; tid uuid; t public.snowlog_trips; val text; v_url text; v_skill text;
  v_date date; v_end date; v_status integer; v_shared boolean; v_todos jsonb; v_item jsonb; v_index integer; v_before jsonb; v_after jsonb;
  allowed text[]:=array['one-foot','heel-edge','toe-edge','falling-leaf','j-turn','linked-turns','speed-control','turn-rhythm','carving','switch','short-turns','variable-snow','terrain','ollie','butter','park'];
begin
  if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception '請先登入';end if;
  if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>100000 then raise exception '資料格式或長度無效';end if;
  insert into public.snowlog_profiles(id,name) values(uid,left(coalesce(nullif(auth.jwt()->'user_metadata'->>'display_name',''),nullif(split_part(auth.jwt()->>'email','@',1),''),'滑雪同伴'),120)) on conflict(id) do nothing;
  if p_action='progress' then perform 1 from public.snowlog_profiles where id=uid for update;end if;
  if p_action='focus' then
    if jsonb_typeof(p_data->'skillIds') is distinct from 'array' then raise exception '練習重點格式無效';end if;
    if jsonb_array_length(p_data->'skillIds')>3 then raise exception '最多選擇 3 項練習重點';end if;
    if exists(select 1 from jsonb_array_elements(p_data->'skillIds') s where jsonb_typeof(s.value)<>'string' or not (s.value#>>'{}')=any(allowed)) then raise exception '技巧不存在';end if;
    if (select count(distinct value) from jsonb_array_elements_text(p_data->'skillIds'))<>jsonb_array_length(p_data->'skillIds') then raise exception '練習重點不可重複';end if;
    update public.snowlog_profiles set focus_skills=array(select jsonb_array_elements_text(p_data->'skillIds')) where id=uid;
  elsif p_action='profile' then
    update public.snowlog_profiles set name=snowlog_private.text_field(p_data,'name',120,true),stance=snowlog_private.text_field(p_data,'stance',120,true),goal=snowlog_private.text_field(p_data,'goal') where id=uid;
  elsif p_action='progress' then
    v_skill:=snowlog_private.text_field(p_data,'skillId',120,true);v_status:=(p_data->>'status')::integer;
    if not v_skill=any(allowed) or v_status is null or v_status not between 0 and 3 then raise exception '技巧或狀態無效';end if;
    val:=snowlog_private.text_field(p_data,'conditions');if v_status=3 and val='' then raise exception '標記為穩定時，請填寫適用條件';end if;
    v_url:=snowlog_private.text_field(p_data,'video',2000);if v_url<>'' and v_url !~* '^https?://[^[:space:]]+$' then raise exception '連結必須以 https:// 或 http:// 開頭';end if;
    select to_jsonb(p) into v_before from public.snowlog_progress p where user_id=uid and skill_id=v_skill;
    insert into public.snowlog_progress(user_id,skill_id,status,conditions,notes,next_step,video,feedback) values(uid,v_skill,v_status,val,snowlog_private.text_field(p_data,'notes'),snowlog_private.text_field(p_data,'nextStep'),v_url,snowlog_private.text_field(p_data,'feedback'))
    on conflict(user_id,skill_id) do update set status=excluded.status,conditions=excluded.conditions,notes=excluded.notes,next_step=excluded.next_step,video=excluded.video,feedback=excluded.feedback,updated_at=now();
    select to_jsonb(p) into v_after from public.snowlog_progress p where user_id=uid and skill_id=v_skill;
    if (v_before-'updated_at') is distinct from (v_after-'updated_at') then
      insert into snowlog_private.progress_history(user_id,skill_id,previous_status,snapshot) values(uid,v_skill,(v_before->>'status')::integer,v_after);
    end if;
  elsif p_action='journal' then
    rid:=coalesce((p_data->>'id')::uuid,gen_random_uuid());tid:=(p_data->>'tripId')::uuid;v_date:=(p_data->>'date')::date;v_shared:=coalesce((p_data->>'shared')::boolean,false);
    if p_data ? 'id' and p_data->>'id' is not null and not exists(select 1 from public.snowlog_journals where id=rid and user_id=uid) then raise exception '找不到你的日誌';end if;
    if v_date is null or v_date::text<>p_data->>'date' then raise exception '滑雪日期無效';end if;
    if tid is not null then
      select * into t from public.snowlog_trips where id=tid for share;
      if not found or not snowlog_private.is_member(tid) then raise exception '你未加入這個行程';end if;
      if v_date<t.start_date or v_date>t.end_date then raise exception '日誌日期須在所選行程日期內';end if;
    end if;
    if v_shared and tid is null then raise exception '分享日誌前請先選擇同行行程';end if;
    if jsonb_typeof(p_data->'skillIds')<>'array' or jsonb_array_length(p_data->'skillIds')>16 then raise exception '練習技巧格式無效';end if;
    if exists(select 1 from jsonb_array_elements_text(p_data->'skillIds') s where not s.value=any(allowed)) then raise exception '技巧不存在';end if;
    v_url:=snowlog_private.text_field(p_data,'video',2000);if v_url<>'' and v_url !~* '^https?://[^[:space:]]+$' then raise exception '附件連結無效';end if;
    insert into public.snowlog_journals(id,user_id,date,resort,skill_ids,notes,next_step,snow,mood,video,trip_id,shared) values(rid,uid,v_date,snowlog_private.text_field(p_data,'resort',120,true),p_data->'skillIds',snowlog_private.text_field(p_data,'notes'),snowlog_private.text_field(p_data,'nextStep'),snowlog_private.text_field(p_data,'snow',120),snowlog_private.text_field(p_data,'mood',120,true),v_url,tid,v_shared)
    on conflict(id) do update set date=excluded.date,resort=excluded.resort,skill_ids=excluded.skill_ids,notes=excluded.notes,next_step=excluded.next_step,snow=excluded.snow,mood=excluded.mood,video=excluded.video,trip_id=excluded.trip_id,shared=excluded.shared,updated_at=now() where snowlog_journals.user_id=uid;
  elsif p_action='trip' then
    tid:=coalesce((p_data->>'id')::uuid,gen_random_uuid());v_date:=(p_data->>'startDate')::date;v_end:=(p_data->>'endDate')::date;v_todos:=p_data->'todos';
    if v_date is null or v_end is null or v_date::text<>p_data->>'startDate' or v_end::text<>p_data->>'endDate' or v_end<v_date then raise exception '開始與結束日期無效';end if;
    if jsonb_typeof(v_todos)<>'array' or jsonb_array_length(v_todos)>50 then raise exception '待辦清單格式無效';end if;
    for v_item in select value from jsonb_array_elements(v_todos) loop
      if jsonb_typeof(v_item)<>'object' or jsonb_typeof(v_item->'done')<>'boolean' then raise exception '待辦格式無效';end if;
      rid:=(v_item->>'id')::uuid;if rid is null then raise exception '待辦編號無效';end if;
      perform snowlog_private.text_field(v_item,'text',120,true);perform snowlog_private.text_field(v_item,'assignee',120);
    end loop;
    if p_data ? 'id' and p_data->>'id' is not null then
      select * into t from public.snowlog_trips where id=tid for update;
      if not found or t.owner_id<>uid then raise exception '只有行程建立者可以修改共同安排';end if;
      update public.snowlog_trips set title=snowlog_private.text_field(p_data,'title',120,true),resort=snowlog_private.text_field(p_data,'resort',120,true),start_date=v_date,end_date=v_end,accommodation=snowlog_private.text_field(p_data,'accommodation'),transport=snowlog_private.text_field(p_data,'transport'),itinerary=snowlog_private.text_field(p_data,'itinerary'),todos=v_todos,updated_at=now() where id=tid;
    else
      insert into public.snowlog_trips(id,owner_id,title,resort,start_date,end_date,accommodation,transport,itinerary,todos) values(tid,uid,snowlog_private.text_field(p_data,'title',120,true),snowlog_private.text_field(p_data,'resort',120,true),v_date,v_end,snowlog_private.text_field(p_data,'accommodation'),snowlog_private.text_field(p_data,'transport'),snowlog_private.text_field(p_data,'itinerary'),v_todos);
      insert into public.snowlog_memberships(trip_id,user_id) values(tid,uid);
    end if;
  elsif p_action='join' then
    val:=upper(snowlog_private.text_field(p_data,'code',16,true));if val !~ '^[A-F0-9]{16}$' then raise exception '請輸入 16 位邀請碼';end if;
    select * into t from public.snowlog_trips where invite_code=val for update;if not found then raise exception '邀請碼不存在或已更新';end if;
    insert into public.snowlog_memberships(trip_id,user_id) values(t.id,uid) on conflict(trip_id,user_id) do nothing;
  elsif p_action in ('tripGoal','todo','rotateInvite','leaveTrip') then
    tid:=(p_data->>'tripId')::uuid;select * into t from public.snowlog_trips where id=tid for update;
    if not found or not snowlog_private.is_member(tid) then raise exception '你未加入這個行程';end if;
    if p_action='tripGoal' then
      update public.snowlog_memberships set goal=snowlog_private.text_field(p_data,'goal') where trip_id=tid and user_id=uid;
    elsif p_action='todo' then
      if jsonb_typeof(p_data->'done')<>'boolean' then raise exception '待辦狀態無效';end if;
      select (ordinality-1)::integer into v_index from jsonb_array_elements(t.todos) with ordinality where value->>'id'=p_data->>'todoId';
      if v_index is null then raise exception '待辦事項已刪除';end if;
      update public.snowlog_trips set todos=jsonb_set(todos,array[v_index::text,'done'],p_data->'done'),updated_at=now() where id=tid;
    elsif p_action='rotateInvite' then
      if t.owner_id<>uid then raise exception '只有建立者可以更新邀請碼';end if;
      update public.snowlog_trips set invite_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),updated_at=now() where id=tid;
    else
      if t.owner_id=uid then raise exception '建立者須刪除行程；其他成員可退出';end if;
      update public.snowlog_journals set shared=false,trip_id=null,updated_at=now() where trip_id=tid and user_id=uid;
      delete from public.snowlog_memberships where trip_id=tid and user_id=uid;
    end if;
  elsif p_action='resource' then
    rid:=coalesce((p_data->>'id')::uuid,gen_random_uuid());
    if p_data ? 'id' and p_data->>'id' is not null and not exists(select 1 from public.snowlog_resources where id=rid and user_id=uid) then raise exception '找不到你的收藏';end if;
    v_url:=snowlog_private.text_field(p_data,'url',2000);if v_url<>'' and v_url !~* '^https?://[^[:space:]]+$' then raise exception '連結必須以 https:// 或 http:// 開頭';end if;
    v_skill:=snowlog_private.text_field(p_data,'skillId',120);if v_skill<>'' and not v_skill=any(allowed) then raise exception '技巧不存在';end if;
    insert into public.snowlog_resources(id,user_id,title,type,url,notes,skill_id) values(rid,uid,snowlog_private.text_field(p_data,'title',120,true),snowlog_private.text_field(p_data,'type',120,true),v_url,snowlog_private.text_field(p_data,'notes'),v_skill)
    on conflict(id) do update set title=excluded.title,type=excluded.type,url=excluded.url,notes=excluded.notes,skill_id=excluded.skill_id,updated_at=now() where snowlog_resources.user_id=uid;
  elsif p_action='delete' then
    rid:=(p_data->>'id')::uuid;val:=p_data->>'kind';
    if val='journal' then delete from public.snowlog_journals where id=rid and user_id=uid;
    elsif val='resource' then delete from public.snowlog_resources where id=rid and user_id=uid;
    elsif val='trip' then
      select * into t from public.snowlog_trips where id=rid for update;if not found or t.owner_id<>uid then raise exception '只有建立者可以刪除行程';end if;
      update public.snowlog_journals set shared=false,trip_id=null,updated_at=now() where trip_id=rid;
      delete from public.snowlog_trips where id=rid;
    else raise exception '操作無效';end if;
  else raise exception '不支援這個操作';end if;
  return jsonb_build_object('ok',true);
exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then raise exception '日期、編號或資料格式無效';
end;$$;
create or replace function snowlog_private.snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());begin
  if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception '請先登入';end if;
  return jsonb_build_object(
    'profile',coalesce((select to_jsonb(p) from public.snowlog_profiles p where id=uid),jsonb_build_object('name',coalesce(nullif(auth.jwt()->'user_metadata'->>'display_name',''),split_part(auth.jwt()->>'email','@',1),'滑雪同伴'),'stance','未確定','goal','')),
    'progress',coalesce((select jsonb_agg(to_jsonb(p)) from public.snowlog_progress p where user_id=uid),'[]'::jsonb),
    'journals',coalesce((select jsonb_agg(to_jsonb(j)||jsonb_build_object('skillIds',j.skill_ids) order by date desc,updated_at desc) from public.snowlog_journals j where user_id=uid),'[]'::jsonb),
    'trips',coalesce((select jsonb_agg(to_jsonb(t) order by start_date desc) from public.snowlog_trips t where exists(select 1 from public.snowlog_memberships m where m.trip_id=t.id and m.user_id=uid)),'[]'::jsonb),
    'members',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('name',p.name,'stance',p.stance)) from public.snowlog_memberships m left join public.snowlog_profiles p on p.id=m.user_id where exists(select 1 from public.snowlog_memberships own where own.trip_id=m.trip_id and own.user_id=uid)),'[]'::jsonb),
    'sharedJournals',coalesce((select jsonb_agg(to_jsonb(j)||jsonb_build_object('skillIds',j.skill_ids,'author_name',p.name) order by date desc) from public.snowlog_journals j left join public.snowlog_profiles p on p.id=j.user_id where j.user_id<>uid and j.shared and snowlog_private.can_read_shared(j.trip_id,j.user_id)),'[]'::jsonb),
    'progressHistory',coalesce((select jsonb_agg(to_jsonb(h) order by recorded_at desc,id desc) from snowlog_private.progress_history h where user_id=uid),'[]'::jsonb),
    'resources',coalesce((select jsonb_agg(to_jsonb(r) order by updated_at desc) from public.snowlog_resources r where user_id=uid),'[]'::jsonb)
  );
end;$$;
-- CREATE OR REPLACE preserves the existing RPC grants. The new table is not in an exposed schema.
