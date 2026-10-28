-- Test branch only. Neon Data API verifies the JWT before auth.uid() is read.
create or replace function public.snowlog_migration_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  neon_id uuid := auth.uid();
  v_owner_id uuid;
  user_name text;
begin
  select u.name into user_name from neon_auth."user" u
    where u.id = neon_id and u."emailVerified" and not coalesce(u.banned, false);
  if user_name is null then raise exception '請先驗證電郵並登入'; end if;
  v_owner_id := coalesce(snowlog_import.claim_legacy_user(neon_id), neon_id);
  return jsonb_build_object(
    'userId', v_owner_id,
    'profile', coalesce((select to_jsonb(p) from snowlog_import.profiles p where p.id = v_owner_id),
      jsonb_build_object('name', user_name, 'stance', '未確定', 'goal', '')),
    'progress', coalesce((select jsonb_agg(to_jsonb(p)) from snowlog_import.progress p where p.user_id = v_owner_id), '[]'::jsonb),
    'journals', coalesce((select jsonb_agg(to_jsonb(j) || jsonb_build_object('skillIds', j.skill_ids) order by j.date desc, j.updated_at desc) from snowlog_import.journals j where j.user_id = v_owner_id), '[]'::jsonb),
    'trips', coalesce((select jsonb_agg(to_jsonb(t) order by t.start_date desc) from snowlog_import.trips t where exists (select 1 from snowlog_import.memberships m where m.trip_id = t.id and m.user_id = v_owner_id)), '[]'::jsonb),
    'members', coalesce((select jsonb_agg(to_jsonb(m) || jsonb_build_object('name', p.name, 'stance', p.stance)) from snowlog_import.memberships m left join snowlog_import.profiles p on p.id = m.user_id where exists (select 1 from snowlog_import.memberships own where own.trip_id = m.trip_id and own.user_id = v_owner_id)), '[]'::jsonb),
    'sharedJournals', coalesce((select jsonb_agg(to_jsonb(j) || jsonb_build_object('skillIds', j.skill_ids, 'author_name', p.name) order by j.date desc) from snowlog_import.journals j left join snowlog_import.profiles p on p.id = j.user_id where j.user_id <> v_owner_id and j.shared and exists (select 1 from snowlog_import.memberships own where own.trip_id = j.trip_id and own.user_id = v_owner_id) and exists (select 1 from snowlog_import.memberships author where author.trip_id = j.trip_id and author.user_id = j.user_id)), '[]'::jsonb),
    'progressHistory', coalesce((select jsonb_agg(to_jsonb(h) order by h.recorded_at desc, h.id desc) from snowlog_import.progress_history h where h.user_id = v_owner_id), '[]'::jsonb),
    'resources', coalesce((select jsonb_agg(to_jsonb(r) || jsonb_build_object('author_name', coalesce(p.name, '滑雪同伴')) order by r.updated_at desc) from snowlog_import.resources r left join snowlog_import.profiles p on p.id = r.user_id), '[]'::jsonb)
  );
end; $$;
revoke all on function public.snowlog_migration_snapshot() from public, anonymous;
grant execute on function public.snowlog_migration_snapshot() to authenticated;
