import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {createRemoteJWKSet, jwtVerify} from 'jose';
import {S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';

const pool = new Pool({connectionString: process.env.DATABASE_URL, max: 3});
pool.on('error', error => console.error('Database pool error', error.message));
const s3 = new S3Client({forcePathStyle: true});
const jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL));
const issuer = new URL(process.env.NEON_AUTH_BASE_URL).origin;
const bucket = 'snowlog-journal-media';
const extensions = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
const pathPattern = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm|mov)$/;
const allowedOrigins = new Set(['https://hcwwwwaiii.github.io', 'http://127.0.0.1:5189', 'http://localhost:5189']);

function cors(request) {
  const origin = request.headers.get('origin');
  return origin && allowedOrigins.has(origin) ? {'access-control-allow-origin':origin,'access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'POST, OPTIONS','vary':'origin'} : {};
}
function reply(request, status, body) {
  return Response.json(body, {status, headers:cors(request)});
}
async function ownerFor(token) {
  const {payload} = await jwtVerify(token, jwks, {issuer});
  if (!payload.sub || !/^[a-f0-9-]{36}$/.test(payload.sub)) throw Error('unauthorized');
  const result = await pool.query('select id from neon_auth."user" where id=$1 and "emailVerified" and not coalesce(banned,false)', [payload.sub]);
  if (!result.rowCount) throw Error('unauthorized');
  const claim = await pool.query('select snowlog_import.claim_legacy_user($1::uuid) as id', [payload.sub]);
  return claim.rows[0].id || payload.sub;
}
async function boundedBody(request, limit) {
  const reader = request.body?.getReader();
  if (!reader) throw Error('empty');
  const chunks = []; let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {await reader.cancel(); throw Error('too large');}
    chunks.push(value);
  }
  if (!size) throw Error('empty');
  return Buffer.concat(chunks, size);
}
async function authorizedPath(owner, path) {
  if (!pathPattern.test(path)) return false;
  const result = await pool.query(`select 1 from snowlog_import.media_objects m where m.path=$1 and (
    m.user_id=$2 or exists (select 1 from snowlog_import.journals j
      where j.shared and j.media @> jsonb_build_array(jsonb_build_object('path',m.path))
      and exists(select 1 from snowlog_import.memberships own where own.trip_id=j.trip_id and own.user_id=$2)
      and exists(select 1 from snowlog_import.memberships author where author.trip_id=j.trip_id and author.user_id=j.user_id)))`, [path, owner]);
  return result.rowCount > 0;
}
export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors(request)});
    if (request.method !== 'POST') return reply(request,405,{error:'不支援的操作'});
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return reply(request,401,{error:'請先登入'});
    let owner;
    try {owner = await ownerFor(auth.slice(7));} catch {return reply(request,401,{error:'請先驗證電郵並登入'});}
    try {
      const action = new URL(request.url).pathname.split('/').filter(Boolean).pop();
      if (action === 'upload') {
        const type = (request.headers.get('content-type') || '').toLowerCase();
        if (!Object.hasOwn(extensions,type)) return reply(request,400,{error:'不支援的影像格式'});
        const kind = type.startsWith('image/') ? 'image' : 'video';
        const bytes = await boundedBody(request, (kind === 'image' ? 10 : 50) * 1024 * 1024);
        const id = randomUUID(), path = `${owner}/${id}.${extensions[type]}`;
        await s3.send(new PutObjectCommand({Bucket:bucket,Key:path,Body:bytes,ContentType:type}));
        try {await pool.query('insert into snowlog_import.media_objects(path,user_id,mime,bytes) values($1,$2,$3,$4)',[path,owner,type,bytes.length]);}
        catch (error) {await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:path})).catch(()=>{}); throw error;}
        return reply(request,200,{id,path,type,kind,size:bytes.length});
      }
      const body = await request.json();
      if (!Array.isArray(body.paths) || body.paths.length > 6 || body.paths.some(path => typeof path !== 'string' || !pathPattern.test(path))) return reply(request,400,{error:'影像位置無效'});
      const paths = [...new Set(body.paths)];
      if (action === 'sign') {
        const result = {};
        for (const path of paths) if (await authorizedPath(owner,path)) result[path] = await getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:path}),{expiresIn:600});
        return reply(request,200,result);
      }
      if (action === 'remove') {
        const db = await pool.connect();
        try {
          await db.query('begin');
          for (const path of paths.sort()) {
            const row = await db.query('select path from snowlog_import.media_objects where path=$1 and user_id=$2 for update',[path,owner]);
            if (!row.rowCount) throw Error('not owner');
            const used = await db.query('select 1 from snowlog_import.journals where media @> jsonb_build_array(jsonb_build_object(\'path\',$1::text)) limit 1',[path]);
            if (used.rowCount) throw Error('still referenced');
          }
          for (const path of paths) {
            await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:path}));
            await db.query('delete from snowlog_import.media_objects where path=$1 and user_id=$2',[path,owner]);
          }
          await db.query('commit');
        } catch (error) {await db.query('rollback'); throw error;} finally {db.release();}
        return reply(request,200,{ok:true});
      }
      return reply(request,404,{error:'找不到操作'});
    } catch (error) {
      console.error('Media request failed', error.message);
      return reply(request,400,{error:'影像操作未完成，請重試。'});
    }
  },
};
