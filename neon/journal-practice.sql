-- Per-session observations are private, even when the parent journal is shared.
begin;
create table snowlog_import.journal_practices (
  journal_id uuid not null references snowlog_import.journals(id) on delete cascade,
  skill_id text not null,
  user_id uuid not null,
  outcome integer not null default 0 check(outcome between 0 and 3),
  notes text not null default '' check(length(notes)<=1000),
  next_step text not null default '' check(length(next_step)<=400),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(journal_id,skill_id)
);
create index journal_practice_owner on snowlog_import.journal_practices(user_id,journal_id);
alter table snowlog_import.journal_practices enable row level security;
revoke all on snowlog_import.journal_practices from public,anonymous,authenticated;
alter table snowlog_import.progress_history add column source_journal_id uuid references snowlog_import.journals(id) on delete set null;

-- Return newly written identifiers; existing callers still receive their original ok flag.
do $patch$
declare def text;
begin
  def:=pg_get_functiondef('snowlog_import.save(text,jsonb)'::regprocedure);
  if position('uid uuid:=' in def)=0 or position('v_before jsonb;' in def)=0 or
    position('values(uid,v_skill,(v_before->>''status'')::integer,v_after);' in def)=0 or
    position('return jsonb_build_object(''ok'',true);' in def)=0 then
    raise exception '儲存函式版本已變更，請先核對遷移';
  end if;
  def:=replace(def,'v_before jsonb;','v_history_id uuid; v_before jsonb;');
  def:=replace(def,'values(uid,v_skill,(v_before->>''status'')::integer,v_after);','values(uid,v_skill,(v_before->>''status'')::integer,v_after) returning id into v_history_id;');
  def:=replace(def,'return jsonb_build_object(''ok'',true);','return jsonb_build_object(''ok'',true,''journalId'',case when p_action=''journal'' then rid end,''progressHistoryId'',v_history_id);');
  execute def;
  def:=pg_get_functiondef('public.snowlog_migration_snapshot()'::regprocedure);
  if position('''resources'', coalesce(' in def)=0 then raise exception '讀取函式版本已變更，請先核對遷移'; end if;
  def:=replace(def,'''resources'', coalesce(', $addition$'practices', coalesce((select jsonb_agg(to_jsonb(p) order by p.updated_at desc) from snowlog_import.journal_practices p join snowlog_import.journals j on j.id=p.journal_id where p.user_id=v_owner_id and j.user_id=v_owner_id and j.skill_ids ? p.skill_id),'[]'::jsonb),
    'resources', coalesce($addition$);
  execute def;
end $patch$;

create function public.snowlog_journal_practice_save(p_data jsonb,p_practices jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid; jid uuid; old_journal snowlog_import.journals; saved jsonb;
  item jsonb; sid text; result integer; note text; next_point text; confirmed boolean; seen text[]:='{}';
  prior snowlog_import.progress; expected timestamptz; conditions text; progress_result jsonb;
begin
  perform snowlog_import.claim_legacy_user(auth.uid());
  uid:=snowlog_import.current_owner();
  if uid is null then raise exception '請先驗證電郵並登入'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_practices) is distinct from 'array' then raise exception '日誌或逐項練習格式無效'; end if;
  if octet_length(p_practices::text)>100000 or jsonb_array_length(p_practices)>16 then raise exception '逐項練習內容過長'; end if;
  if jsonb_typeof(p_data->'skillIds') is distinct from 'array' then raise exception '請選擇有效技巧'; end if;
  if jsonb_array_length(p_data->'skillIds')<>jsonb_array_length(p_practices) then raise exception '請核對已選技巧的逐項練習'; end if;
  if nullif(p_data->>'id','') is not null then
    select j.* into old_journal from snowlog_import.journals j where j.id=(p_data->>'id')::uuid and j.user_id=uid for update;
    if not found then raise exception '找不到你的日誌'; end if;
    if not p_data ? 'expectedUpdatedAt' or old_journal.updated_at is distinct from nullif(p_data->>'expectedUpdatedAt','')::timestamptz then
      raise exception '日誌已在其他視窗更新，請重新載入後再編輯';
    end if;
  end if;
  saved:=snowlog_import.save('journal',p_data);
  jid:=(saved->>'journalId')::uuid;
  if jid is null then raise exception '未能確認已儲存日誌'; end if;
  -- The existing progress writer uses this same lock for concurrent edits.
  perform 1 from snowlog_import.profiles p where p.id=uid for update;
  for item in select value from jsonb_array_elements(p_practices) loop
    if jsonb_typeof(item) is distinct from 'object' then raise exception '逐項練習格式無效'; end if;
    if exists(select 1 from jsonb_object_keys(item) k where k not in ('skillId','outcome','notes','nextStep','syncProgress','expectedUpdatedAt')) then raise exception '逐項練習欄位無效'; end if;
    sid:=snowlog_import.text_field(item,'skillId',120,true);
    if not (p_data->'skillIds') ? sid or sid=any(seen) then raise exception '技巧不符或重複'; end if;
    seen:=array_append(seen,sid);
    if jsonb_typeof(item->'outcome') is distinct from 'number' or (item->'outcome')::text not in ('0','1','2','3') or
      jsonb_typeof(item->'syncProgress') is distinct from 'boolean' then raise exception '當天表現或同步選項無效'; end if;
    result:=(item->>'outcome')::integer;
    note:=snowlog_import.text_field(item,'notes',1000);
    next_point:=snowlog_import.text_field(item,'nextStep',400);
    confirmed:=(item->>'syncProgress')::boolean;
    insert into snowlog_import.journal_practices(journal_id,skill_id,user_id,outcome,notes,next_step)
      values(jid,sid,uid,result,note,next_point)
      on conflict(journal_id,skill_id) do update set outcome=excluded.outcome,notes=excluded.notes,next_step=excluded.next_step,updated_at=clock_timestamp()
      where journal_practices.user_id=uid;
    if confirmed then
      if result=0 then raise exception '未評估的技巧不能同步整體進度'; end if;
      if (p_data->>'date')::date>(now() at time zone 'Asia/Hong_Kong')::date then raise exception '未來日期不能更新目前技巧進度'; end if;
      select p.* into prior from snowlog_import.progress p where p.user_id=uid and p.skill_id=sid;
      expected:=nullif(item->>'expectedUpdatedAt','')::timestamptz;
      if not item ? 'expectedUpdatedAt' or prior.updated_at is distinct from expected then
        raise exception '技巧已在其他地方更新，請重新載入後確認；這次日誌尚未儲存';
      end if;
      conditions:=coalesce(nullif(prior.conditions,''),'日誌 '||(p_data->>'date')||' · '||(p_data->>'resort')||case when coalesce(p_data->>'snow','')<>'' then ' · '||(p_data->>'snow') else '' end);
      progress_result:=snowlog_import.save('progress',jsonb_build_object(
        'skillId',sid,'status',result,'conditions',conditions,'notes',coalesce(prior.notes,''),
        'nextStep',coalesce(nullif(next_point,''),prior.next_step,''),'video',coalesce(prior.video,''),'feedback',coalesce(prior.feedback,''),
        'expectedUpdatedAt',expected));
      if progress_result->>'progressHistoryId' is not null then
        update snowlog_import.progress_history h set source_journal_id=jid where h.id=(progress_result->>'progressHistoryId')::uuid and h.user_id=uid;
      end if;
    end if;
  end loop;
  delete from snowlog_import.journal_practices p where p.journal_id=jid and p.user_id=uid and not p.skill_id=any(seen);
  return jsonb_build_object('ok',true,'journalId',jid);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
  raise exception '逐項練習的日期、編號或格式無效';
end; $$;
revoke all on function public.snowlog_journal_practice_save(jsonb,jsonb) from public,anonymous;
grant execute on function public.snowlog_journal_practice_save(jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
