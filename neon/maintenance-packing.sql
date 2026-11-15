-- Owner-only maintenance and individual trip preparation. Shared trip todos stay unchanged.
begin;
create table snowlog_import.gear_maintenance(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,
 gear_id uuid not null references snowlog_import.gear(id) on delete cascade,
 date date not null,kind text not null check(kind in ('打蠟','修邊','維修','清潔','其他')),
 notes text not null default '' check(length(notes)<=1000),
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp()
);
create index gear_maintenance_owner on snowlog_import.gear_maintenance(user_id,gear_id,date desc);
alter table snowlog_import.gear_maintenance enable row level security;
revoke all on snowlog_import.gear_maintenance from public,anonymous,authenticated;
create table snowlog_import.trip_packing(
 trip_id uuid not null references snowlog_import.trips(id) on delete cascade,user_id uuid not null,
 items jsonb not null default '[]' check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=100),
 updated_at timestamptz not null default clock_timestamp(),primary key(trip_id,user_id)
);
create index trip_packing_owner on snowlog_import.trip_packing(user_id);
alter table snowlog_import.trip_packing enable row level security;
revoke all on snowlog_import.trip_packing from public,anonymous,authenticated;

create function public.snowlog_maintenance_packing_snapshot() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 perform snowlog_import.claim_legacy_user(auth.uid());uid:=snowlog_import.current_owner();
 if uid is null then raise exception '請先驗證電郵並登入'; end if;
 return jsonb_build_object(
  'maintenance',coalesce((select jsonb_agg(to_jsonb(m) order by m.date desc,m.created_at desc) from snowlog_import.gear_maintenance m join snowlog_import.gear g on g.id=m.gear_id where m.user_id=uid and g.user_id=uid),'[]'),
  'packing',coalesce((select jsonb_agg(to_jsonb(p) order by p.updated_at desc) from snowlog_import.trip_packing p where p.user_id=uid),'[]')
 );
end; $$;

create function public.snowlog_maintenance_save(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; gid uuid; mid uuid; v_date text; v_kind text; v_notes text; day date; prior snowlog_import.gear_maintenance; saved snowlog_import.gear_maintenance;
begin
 perform snowlog_import.claim_legacy_user(auth.uid());uid:=snowlog_import.current_owner();
 if uid is null then raise exception '請先驗證電郵並登入'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>10000 then raise exception '保養紀錄格式或長度無效'; end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('id','gearId','date','kind','notes','expectedUpdatedAt')) then raise exception '保養紀錄欄位無效'; end if;
 gid:=(p_data->>'gearId')::uuid;
 perform 1 from snowlog_import.gear g where g.id=gid and g.user_id=uid for share;
 if not found then raise exception '找不到你的裝備'; end if;
 v_kind:=snowlog_import.text_field(p_data,'kind',20,true);v_notes:=snowlog_import.text_field(p_data,'notes',1000);
 if v_kind not in ('打蠟','修邊','維修','清潔','其他') then raise exception '請選擇有效的保養項目'; end if;
 v_date:=snowlog_import.text_field(p_data,'date',10,true);
 if v_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception '請填寫有效的保養日期'; end if;
 day:=v_date::date;
 if to_char(day,'YYYY-MM-DD')<>v_date then raise exception '請填寫有效的保養日期'; end if;
 if day>(now() at time zone 'Asia/Hong_Kong')::date then raise exception '保養日期不可晚於今天'; end if;
 if nullif(p_data->>'id','') is not null then
  mid:=(p_data->>'id')::uuid;
  select m.* into prior from snowlog_import.gear_maintenance m where m.id=mid and m.user_id=uid and m.gear_id=gid for update;
  if not found then raise exception '找不到你的保養紀錄'; end if;
  if not p_data?'expectedUpdatedAt' or prior.updated_at is distinct from nullif(p_data->>'expectedUpdatedAt','')::timestamptz then raise exception '保養紀錄已在其他視窗更新，請重新載入'; end if;
  update snowlog_import.gear_maintenance m set date=day,kind=v_kind,notes=v_notes,updated_at=clock_timestamp() where m.id=mid and m.user_id=uid returning m.* into saved;
 else
  insert into snowlog_import.gear_maintenance(user_id,gear_id,date,kind,notes) values(uid,gid,day,v_kind,v_notes) returning * into saved;
 end if;
 return to_jsonb(saved);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception '保養紀錄編號或日期格式無效';
end; $$;

create function public.snowlog_maintenance_delete(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; prior snowlog_import.gear_maintenance;
begin
 perform snowlog_import.claim_legacy_user(auth.uid());uid:=snowlog_import.current_owner();
 if uid is null then raise exception '請先驗證電郵並登入'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>1000 or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('id','expectedUpdatedAt')) then raise exception '保養紀錄格式無效'; end if;
 select m.* into prior from snowlog_import.gear_maintenance m where m.id=(p_data->>'id')::uuid and m.user_id=uid for update;
 if not found then raise exception '找不到你的保養紀錄'; end if;
 if not p_data?'expectedUpdatedAt' or prior.updated_at is distinct from nullif(p_data->>'expectedUpdatedAt','')::timestamptz then raise exception '保養紀錄已在其他視窗更新，請重新載入後再刪除'; end if;
 delete from snowlog_import.gear_maintenance m where m.id=prior.id and m.user_id=uid;
 return jsonb_build_object('ok',true);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception '保養紀錄編號或版本格式無效';
end; $$;

create function public.snowlog_trip_packing_save(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; tid uuid; prior snowlog_import.trip_packing; saved snowlog_import.trip_packing;
 source jsonb; item jsonb; iid uuid; gid uuid; label text; checked boolean; normalized jsonb:='[]'; seen uuid[]:='{}'; gear_seen uuid[]:='{}';
begin
 perform snowlog_import.claim_legacy_user(auth.uid());uid:=snowlog_import.current_owner();
 if uid is null then raise exception '請先驗證電郵並登入'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>60000 then raise exception '打包清單格式或長度無效'; end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('tripId','items','expectedUpdatedAt')) then raise exception '打包清單欄位無效'; end if;
 tid:=(p_data->>'tripId')::uuid;
 perform 1 from snowlog_import.trips t where t.id=tid for share;
 if not found or not snowlog_import.is_member(tid) then raise exception '你未加入這個行程'; end if;
 perform 1 from snowlog_import.memberships m where m.trip_id=tid and m.user_id=uid for share;
 perform 1 from snowlog_import.profiles p where p.id=uid for update;
 select p.* into prior from snowlog_import.trip_packing p where p.trip_id=tid and p.user_id=uid for update;
 if not p_data?'expectedUpdatedAt' or prior.updated_at is distinct from nullif(p_data->>'expectedUpdatedAt','')::timestamptz then raise exception '私人打包清單已在其他視窗更新，請重新載入'; end if;
 source:=p_data->'items';
 if jsonb_typeof(source) is distinct from 'array' or jsonb_array_length(source)>100 then raise exception '打包清單最多 100 項'; end if;
 for item in select value from jsonb_array_elements(source) loop
  if jsonb_typeof(item) is distinct from 'object' or exists(select 1 from jsonb_object_keys(item) k where k not in ('id','text','checked','gearId')) then raise exception '打包物品格式無效'; end if;
  if jsonb_typeof(item->'id') is distinct from 'string' or jsonb_typeof(item->'checked') is distinct from 'boolean' then raise exception '打包物品編號或勾選格式無效'; end if;
  iid:=(item->>'id')::uuid;
  if iid=any(seen) then raise exception '打包物品編號重複'; end if;seen:=array_append(seen,iid);
  label:=snowlog_import.text_field(item,'text',120,true);checked:=(item->>'checked')::boolean;
  if item?'gearId' and jsonb_typeof(item->'gearId') not in ('string','null') then raise exception '打包裝備編號格式無效'; end if;
  gid:=nullif(item->>'gearId','')::uuid;
  if gid is not null then
   if gid=any(gear_seen) then raise exception '同一件裝備不可重複加入'; end if;gear_seen:=array_append(gear_seen,gid);
   perform 1 from snowlog_import.gear g where g.id=gid and g.user_id=uid for share;
   if not found then raise exception '只能加入自己的裝備'; end if;
  end if;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('id',iid,'text',label,'checked',checked,'gearId',gid));
 end loop;
 insert into snowlog_import.trip_packing(trip_id,user_id,items) values(tid,uid,normalized)
  on conflict(trip_id,user_id) do update set items=excluded.items,updated_at=clock_timestamp() returning * into saved;
 return to_jsonb(saved);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception '打包清單編號或版本格式無效';
end; $$;

revoke all on function public.snowlog_maintenance_packing_snapshot(),public.snowlog_maintenance_save(jsonb),public.snowlog_maintenance_delete(jsonb),public.snowlog_trip_packing_save(jsonb) from public,anonymous;
grant execute on function public.snowlog_maintenance_packing_snapshot(),public.snowlog_maintenance_save(jsonb),public.snowlog_maintenance_delete(jsonb),public.snowlog_trip_packing_save(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
