-- Snowlog: all app records are private or limited to current trip members.
-- Tables have RLS. Writes go through authenticated RPCs with explicit ownership checks.
create schema if not exists snowlog_private;
revoke all on schema snowlog_private from public, anon;
grant usage on schema snowlog_private to authenticated;

create table public.snowlog_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  stance text not null default '未確定' check (stance in ('未確定','Regular 左腳在前','Goofy 右腳在前')),
  goal text not null default '' check(length(goal)<=4000)
);
create table public.snowlog_progress (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null, status integer not null default 0 check(status between 0 and 3),
  conditions text not null default '', notes text not null default '', next_step text not null default '',
  video text not null default '', feedback text not null default '', updated_at timestamptz not null default now(),
  unique(user_id,skill_id), check(status<>3 or length(trim(conditions))>0)
);
create table public.snowlog_trips (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  title text not null check(length(title) between 1 and 120), resort text not null check(length(resort) between 1 and 120),
  start_date date not null, end_date date not null check(end_date>=start_date),
  accommodation text not null default '', transport text not null default '', itinerary text not null default '',
  todos jsonb not null default '[]'::jsonb check(jsonb_typeof(todos)='array'),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),
  updated_at timestamptz not null default now()
);
create index snowlog_trips_owner_idx on public.snowlog_trips(owner_id);
create table public.snowlog_memberships (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.snowlog_trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, goal text not null default '' check(length(goal)<=4000),
  unique(trip_id,user_id)
);
create index snowlog_memberships_user_idx on public.snowlog_memberships(user_id);
create table public.snowlog_journals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, resort text not null check(length(resort) between 1 and 120),
  skill_ids jsonb not null default '[]'::jsonb check(jsonb_typeof(skill_ids)='array'),
  notes text not null default '', next_step text not null default '', snow text not null default '',
  mood text not null default '順利' check(mood in ('順利','有突破','需要練習','自由滑行')),
  video text not null default '', trip_id uuid references public.snowlog_trips(id) on delete set null,
  shared boolean not null default false, updated_at timestamptz not null default now(),
  check(not shared or trip_id is not null)
);
create index snowlog_journals_user_date_idx on public.snowlog_journals(user_id,date desc);
create index snowlog_journals_trip_idx on public.snowlog_journals(trip_id);
create table public.snowlog_resources (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(title) between 1 and 120), type text not null check(type in ('教學','雪場','裝備','行前清單','其他')),
  url text not null default '', notes text not null default '', skill_id text not null default '',
  updated_at timestamptz not null default now()
);
create index snowlog_resources_user_idx on public.snowlog_resources(user_id);

create function snowlog_private.is_member(p_trip uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(select 1 from public.snowlog_memberships where trip_id=p_trip and user_id=(select auth.uid()));
$$;
create function snowlog_private.can_read_shared(p_trip uuid,p_author uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and snowlog_private.is_member(p_trip)
  and exists(select 1 from public.snowlog_memberships where trip_id=p_trip and user_id=p_author);
$$;
alter table public.snowlog_profiles enable row level security;
alter table public.snowlog_progress enable row level security;
alter table public.snowlog_trips enable row level security;
alter table public.snowlog_memberships enable row level security;
alter table public.snowlog_journals enable row level security;
alter table public.snowlog_resources enable row level security;
create policy profiles_own on public.snowlog_profiles for select to authenticated using(id=(select auth.uid()));
create policy progress_own on public.snowlog_progress for select to authenticated using(user_id=(select auth.uid()));
create policy trips_members on public.snowlog_trips for select to authenticated using(snowlog_private.is_member(id));
create policy memberships_members on public.snowlog_memberships for select to authenticated using(snowlog_private.is_member(trip_id));
create policy journals_read on public.snowlog_journals for select to authenticated using(user_id=(select auth.uid()) or (shared and snowlog_private.can_read_shared(trip_id,user_id)));
create policy resources_own on public.snowlog_resources for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.snowlog_profiles,public.snowlog_progress,public.snowlog_trips,public.snowlog_memberships,public.snowlog_journals,public.snowlog_resources from public,anon,authenticated;
grant select on public.snowlog_profiles,public.snowlog_progress,public.snowlog_trips,public.snowlog_memberships,public.snowlog_journals,public.snowlog_resources to authenticated;

create function snowlog_private.text_field(p jsonb,k text,max_length integer default 4000,required boolean default false) returns text
language plpgsql immutable set search_path='' as $$
declare v text:=trim(coalesce(p->>k,''));begin
  if p ? k and p->k<>'null'::jsonb and jsonb_typeof(p->k)<>'string' then raise exception '文字資料格式無效：%',k;end if;
  if length(v)>max_length or (required and v='') then raise exception '請填寫有效內容：%',k;end if;return v;
end;$$;
create function snowlog_private.snapshot() returns jsonb
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
    'resources',coalesce((select jsonb_agg(to_jsonb(r) order by updated_at desc) from public.snowlog_resources r where user_id=uid),'[]'::jsonb)
  );
end;$$;

create function snowlog_private.save(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=(select auth.uid()); rid uuid; tid uuid; t public.snowlog_trips; val text; v_url text; v_skill text;
  v_date date; v_end date; v_status integer; v_shared boolean; v_todos jsonb; v_item jsonb; v_index integer;
  allowed text[]:=array['one-foot','heel-edge','toe-edge','falling-leaf','j-turn','linked-turns','speed-control','turn-rhythm','carving','switch','short-turns','variable-snow','terrain','ollie','butter','park'];
begin
  if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception '請先登入';end if;
  if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>100000 then raise exception '資料格式或長度無效';end if;
  insert into public.snowlog_profiles(id,name) values(uid,left(coalesce(nullif(auth.jwt()->'user_metadata'->>'display_name',''),nullif(split_part(auth.jwt()->>'email','@',1),''),'滑雪同伴'),120)) on conflict(id) do nothing;
  if p_action='profile' then
    update public.snowlog_profiles set name=snowlog_private.text_field(p_data,'name',120,true),stance=snowlog_private.text_field(p_data,'stance',120,true),goal=snowlog_private.text_field(p_data,'goal') where id=uid;
  elsif p_action='progress' then
    v_skill:=snowlog_private.text_field(p_data,'skillId',120,true);v_status:=(p_data->>'status')::integer;
    if not v_skill=any(allowed) or v_status is null or v_status not between 0 and 3 then raise exception '技巧或狀態無效';end if;
    val:=snowlog_private.text_field(p_data,'conditions');if v_status=3 and val='' then raise exception '標記為穩定時，請填寫適用條件';end if;
    v_url:=snowlog_private.text_field(p_data,'video',2000);if v_url<>'' and v_url !~* '^https?://[^[:space:]]+$' then raise exception '連結必須以 https:// 或 http:// 開頭';end if;
    insert into public.snowlog_progress(user_id,skill_id,status,conditions,notes,next_step,video,feedback) values(uid,v_skill,v_status,val,snowlog_private.text_field(p_data,'notes'),snowlog_private.text_field(p_data,'nextStep'),v_url,snowlog_private.text_field(p_data,'feedback'))
    on conflict(user_id,skill_id) do update set status=excluded.status,conditions=excluded.conditions,notes=excluded.notes,next_step=excluded.next_step,video=excluded.video,feedback=excluded.feedback,updated_at=now();
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

create function public.snowlog_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$select snowlog_private.snapshot();$$;
create function public.snowlog_save(p_action text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select snowlog_private.save(p_action,p_data);$$;
revoke all on all functions in schema snowlog_private from public,anon,authenticated;
grant execute on function snowlog_private.snapshot(),snowlog_private.save(text,jsonb),snowlog_private.is_member(uuid),snowlog_private.can_read_shared(uuid,uuid) to authenticated;
revoke all on function public.snowlog_snapshot(),public.snowlog_save(text,jsonb) from public,anon,authenticated;
grant execute on function public.snowlog_snapshot(),public.snowlog_save(text,jsonb) to authenticated;
