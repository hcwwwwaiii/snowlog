-- Run only on an isolated test branch; the caught exception rolls back fixtures.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  oldid uuid := gen_random_uuid();
  mail text := gen_random_uuid()::text || '@example.invalid';
begin
  begin
    insert into snowlog_import.legacy_identity values (oldid, mail);
    insert into neon_auth."user" (id, name, email, "emailVerified") values (a, 'Temporary migration test', mail, false);
    if snowlog_import.claim_legacy_user(a) is not null then raise exception 'Unverified user was accepted'; end if;
    update neon_auth."user" set "emailVerified" = true where id = a;
    if snowlog_import.claim_legacy_user(a) is distinct from oldid then raise exception 'Verified owner was not matched'; end if;
    update neon_auth."user" set email = gen_random_uuid()::text || '@example.invalid' where id = a;
    insert into neon_auth."user" (id, name, email, "emailVerified") values (b, 'Temporary migration test', mail, true);
    if snowlog_import.claim_legacy_user(b) is not null then raise exception 'Claimed records were reassigned'; end if;
    if snowlog_import.claim_legacy_user(a) is distinct from oldid then raise exception 'Existing claim was lost'; end if;
    update neon_auth."user" set banned = true where id = a;
    if snowlog_import.claim_legacy_user(a) is not null then raise exception 'Banned user was accepted'; end if;
    raise sqlstate 'ZX001' using message = 'rollback temporary fixtures';
  exception when sqlstate 'ZX001' then null;
  end;
end $$;
