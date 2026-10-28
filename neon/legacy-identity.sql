-- Private migration tables must already exist; callers must authenticate users server-side.
create table snowlog_import.identity_claims (
  neon_user_id uuid primary key,
  legacy_user_id uuid not null unique references snowlog_import.legacy_identity(legacy_user_id),
  claimed_at timestamptz not null default now()
);
alter table snowlog_import.identity_claims enable row level security;
revoke all on snowlog_import.identity_claims from public;

create function snowlog_import.resolve_legacy_user(p_neon_user_id uuid)
returns uuid language sql stable security invoker set search_path = '' as $$
  select i.legacy_user_id
  from snowlog_import.legacy_identity i
  join neon_auth."user" u on lower(trim(u.email)) = i.verified_email
  where u.id = p_neon_user_id and u."emailVerified" = true and coalesce(u.banned, false) = false
$$;
revoke all on function snowlog_import.resolve_legacy_user(uuid) from public;

create function snowlog_import.claim_legacy_user(p_neon_user_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_legacy uuid; v_user uuid;
begin
  select u.id into v_user from neon_auth."user" u
  where u.id = p_neon_user_id and u."emailVerified" = true and coalesce(u.banned, false) = false;
  if v_user is null then return null; end if;
  select c.legacy_user_id into v_legacy from snowlog_import.identity_claims c where c.neon_user_id = v_user;
  if v_legacy is not null then return v_legacy; end if;
  select snowlog_import.resolve_legacy_user(v_user) into v_legacy;
  if v_legacy is null then return null; end if;
  insert into snowlog_import.identity_claims(neon_user_id, legacy_user_id)
    values(v_user, v_legacy) on conflict do nothing;
  select c.legacy_user_id into v_legacy from snowlog_import.identity_claims c where c.neon_user_id = v_user;
  return v_legacy;
end; $$;
revoke all on function snowlog_import.claim_legacy_user(uuid) from public;
