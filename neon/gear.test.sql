-- Isolated branch only. Authentication subjects are stubbed inside a rolled-back subtransaction.
do $test$
declare
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); unverified uuid:=gen_random_uuid();
  item jsonb; changed jsonb; n integer; photo_path text; photo jsonb;
begin
  begin
    execute $stub$ create or replace function snowlog_import.current_owner() returns uuid language sql stable security invoker set search_path='' as 'select u.id from neon_auth."user" u where u.id=nullif(current_setting(''snowlog.gear_test_user'',true),'''')::uuid and u."emailVerified" and not coalesce(u.banned,false)' $stub$;
    insert into neon_auth."user"(id,name,email,"emailVerified") values
      (a,'Gear fixture A',a::text||'@example.invalid',true),
      (b,'Gear fixture B',b::text||'@example.invalid',true),
      (unverified,'Gear unverified',unverified::text||'@example.invalid',false);
    perform set_config('snowlog.gear_test_user',a::text,true);
    set local role authenticated;
    if public.snowlog_gear_snapshot()<>'[]' then raise exception 'new user list not empty'; end if;
    item:=public.snowlog_gear_save('{"name":"Test board","category":"單板","brand":"Test","model":"Model A","size":"152 cm","status":"使用中","purchasedOn":"2025-12-01","notes":"fixture","photos":[]}');
    if item->>'user_id'<>a::text or jsonb_array_length(public.snowlog_gear_snapshot())<>1 then raise exception 'create/owner failed'; end if;
    changed:=public.snowlog_gear_save(jsonb_build_object('id',item->>'id','name','Edited board','category','單板','status','備用','expectedUpdatedAt',item->>'updated_at'));
    if changed->>'status'<>'備用' or changed->>'name'<>'Edited board' then raise exception 'edit failed'; end if;
    begin
      perform public.snowlog_gear_save(jsonb_build_object('id',item->>'id','name','stale','category','單板','status','使用中','expectedUpdatedAt',item->>'updated_at'));
      raise exception 'stale edit accepted';
    exception when others then if sqlerrm='stale edit accepted' then raise; end if; end;
    begin
      perform public.snowlog_gear_save('{"name":" ","category":"單板","status":"使用中"}');
      raise exception 'blank accepted';
    exception when others then if sqlerrm='blank accepted' then raise; end if; end;
    begin
      perform public.snowlog_gear_save('{"name":"bad","category":"invalid","status":"使用中"}');
      raise exception 'invalid category accepted';
    exception when others then if sqlerrm='invalid category accepted' then raise; end if; end;
    begin
      perform public.snowlog_gear_save('{"name":"bad","category":"單板","status":"使用中","purchasedOn":"2026-02-30"}');
      raise exception 'invalid date accepted';
    exception when others then if sqlerrm='invalid date accepted' then raise; end if; end;
    begin
      execute 'select count(*) from snowlog_import.gear' into n;
      raise exception 'direct table access accepted';
    exception when insufficient_privilege then null; end;
    perform set_config('snowlog.gear_test_user',b::text,true);
    if public.snowlog_gear_snapshot()<>'[]' then raise exception 'other user can read gear'; end if;
    begin
      perform public.snowlog_gear_save(jsonb_build_object('id',changed->>'id','name','overwrite','category','單板','status','使用中','expectedUpdatedAt',changed->>'updated_at'));
      raise exception 'other user can edit gear';
    exception when others then if sqlerrm='other user can edit gear' then raise; end if; end;
    begin
      perform public.snowlog_gear_save(jsonb_build_object('user_id',a,'name','spoof','category','單板','status','使用中'));
      raise exception 'owner spoof accepted';
    exception when others then if sqlerrm='owner spoof accepted' then raise; end if; end;
    perform set_config('snowlog.gear_test_user',unverified::text,true);
    begin
      perform public.snowlog_gear_snapshot();
      raise exception 'unverified access accepted';
    exception when others then if sqlerrm='unverified access accepted' then raise; end if; end;
    reset role;
    photo_path:=a::text||'/gear/'||gen_random_uuid()::text||'.png';
    insert into snowlog_import.media_objects values(photo_path,a,'image/png',100);
    photo:=jsonb_build_object('path',photo_path,'name','board.png');
    perform set_config('snowlog.gear_test_user',a::text,true);
    set local role authenticated;
    changed:=public.snowlog_gear_save(jsonb_build_object('id',changed->>'id','name','With photo','category','單板','status','已退役','expectedUpdatedAt',changed->>'updated_at','photos',jsonb_build_array(photo)));
    if changed->'photos'->0->>'path'<>photo_path then raise exception 'photo not saved'; end if;
    perform set_config('snowlog.gear_test_user',b::text,true);
    begin
      perform public.snowlog_gear_save(jsonb_build_object('name','foreign photo','category','單板','status','使用中','photos',jsonb_build_array(photo)));
      raise exception 'foreign photo accepted';
    exception when others then if sqlerrm='foreign photo accepted' then raise; end if; end;
    reset role;
    set local role anonymous;
    begin
      perform public.snowlog_gear_snapshot();
      raise exception 'anonymous access accepted';
    exception when insufficient_privilege then null; end;
    reset role;
    raise sqlstate 'ZX001' using message='PASS: create, edit, stale-write protection, validation, owner isolation, private photos and anonymous denial';
  exception when sqlstate 'ZX001' then raise notice '%',sqlerrm;
  end;
end $test$;
