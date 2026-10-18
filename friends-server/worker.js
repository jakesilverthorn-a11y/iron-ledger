/* Iron Ledger friends server: a tiny Cloudflare Worker.
   Gives friends usernames + passwords, a shared leaderboard and live challenges.
   Stores only public scores and challenge progress. Workouts, height and weight never leave the phone.
   Needs ONE KV namespace bound to this Worker with the variable name  DB  (see SERVER-SETUP.txt). */
const ITER = 30000;               // password stretching; kept modest so it fits the free plan's CPU limit
const MAX_USERS = 300, MAX_DOC = 16000, DAYS = 86400;
const COLS = ['people', 'ch', 'cp'];
const enc = new TextEncoder();
let SECRET = null;                // signing key, created once and kept in KV

const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '86400' };
const out = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS, extra) });
const bad = (m, s = 400) => out({ error: m }, s);

async function hmacKey(env) {
  if (!SECRET) {
    let s = await env.DB.get('secret');
    if (!s) { s = b64(crypto.getRandomValues(new Uint8Array(32))); await env.DB.put('secret', s); }
    SECRET = await crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  }
  return SECRET;
}
async function sign(env, text) { return b64(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(text))); }
async function mkToken(env, uid) { const body = uid + '.' + (Math.floor(Date.now() / 1000) + 90 * DAYS); return body + '.' + await sign(env, body); }
async function who(env, req) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer (.+)$/); if (!m) return null;
  const p = m[1].split('.'); if (p.length !== 3) return null;
  if (!same(await sign(env, p[0] + '.' + p[1]), p[2])) return null;
  if (+p[1] < Date.now() / 1000) return null;
  return p[0];
}
async function hashPw(pw, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: ITER }, k, 256));
}
async function readIdx(env) { return JSON.parse((await env.DB.get('idx')) || '[]'); }
async function addIdx(env, uid) { const i = await readIdx(env); if (i.indexOf(uid) < 0) { i.push(uid); await env.DB.put('idx', JSON.stringify(i)); } return i; }

async function everyone(env) {
  const idx = await readIdx(env), res = { people: {}, ch: {}, cp: {} };
  const docs = await Promise.all(idx.map(u => env.DB.get('d:' + u, 'json')));
  idx.forEach((u, i) => { const d = docs[i]; if (d) COLS.forEach(c => { if (d[c]) res[c][u] = d[c]; }); });
  return res;
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!env.DB) return bad('The KV namespace is not connected. Bind a KV namespace named DB to this Worker.', 500);
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path === '/' || path === '/ping') return out({ ok: true, app: 'iron-ledger', v: 1 });
      if (req.method === 'POST' && (path === '/signup' || path === '/login')) {
        let b; try { b = await req.json(); } catch (e) { return bad('Bad request'); }
        const name = String(b.u || '').trim(), pw = String(b.p || ''), un = name.toLowerCase();
        if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return bad('Use 3 to 16 letters, numbers or underscores for the username.');
        if (pw.length < 6 || pw.length > 100) return bad('The password needs at least 6 characters.');
        const rec = await env.DB.get('u:' + un, 'json');
        if (path === '/signup') {
          if (rec) return bad('That username is taken. Try another.', 409);
          if ((await readIdx(env)).length >= MAX_USERS) return bad('This group is full.', 403);
          const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
          await env.DB.put('u:' + un, JSON.stringify({ name, salt, h: await hashPw(pw, salt), at: Date.now() }));
          await addIdx(env, un);
          return out({ token: await mkToken(env, un), uid: un, name });
        }
        if (!rec || !same(await hashPw(pw, rec.salt), rec.h)) return bad('Wrong username or password.', 401);
        await addIdx(env, un);
        return out({ token: await mkToken(env, un), uid: un, name: rec.name });
      }
      const uid = await who(env, req); if (!uid) return bad('Sign in again.', 401);
      if (req.method === 'GET' && path === '/all') {
        const ck = new Request(url.origin + '/__all', { method: 'GET' }), cache = caches.default;
        let hit = await cache.match(ck);
        if (hit) return new Response(hit.body, { status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS) });
        const body = JSON.stringify(await everyone(env));
        ctx.waitUntil(cache.put(ck, new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=8' } })));
        return new Response(body, { status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS) });
      }
      const m = path.match(/^\/c\/(people|ch|cp)\/([a-z0-9_]{3,16})$/);
      if (m && (req.method === 'PUT' || req.method === 'DELETE')) {
        if (m[2] !== uid) return bad('You can only change your own data.', 403);
        if (!(await env.DB.get('u:' + uid))) return bad('Account no longer exists.', 401);
        const cur = (await env.DB.get('d:' + uid, 'json')) || {};
        if (req.method === 'PUT') {
          const txt = await req.text(); if (txt.length > MAX_DOC) return bad('Too large', 413);
          let v; try { v = JSON.parse(txt); } catch (e) { return bad('Bad JSON'); }
          if (!v || typeof v !== 'object' || Array.isArray(v)) return bad('Bad JSON');
          cur[m[1]] = v;
        } else delete cur[m[1]];
        await env.DB.put('d:' + uid, JSON.stringify(cur));
        ctx.waitUntil(caches.default.delete(new Request(url.origin + '/__all', { method: 'GET' })));
        return out({ ok: true });
      }
      if (req.method === 'POST' && path === '/password') {
        const b = await req.json().catch(() => ({})), rec = await env.DB.get('u:' + uid, 'json');
        if (!rec || !same(await hashPw(String(b.p || ''), rec.salt), rec.h)) return bad('Current password is wrong.', 401);
        if (String(b.np || '').length < 6) return bad('The new password needs at least 6 characters.');
        const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
        rec.salt = salt; rec.h = await hashPw(String(b.np), salt);
        await env.DB.put('u:' + uid, JSON.stringify(rec));
        return out({ ok: true });
      }
      if (req.method === 'POST' && path === '/delete-account') {
        const b = await req.json().catch(() => ({})), rec = await env.DB.get('u:' + uid, 'json');
        if (!rec || !same(await hashPw(String(b.p || ''), rec.salt), rec.h)) return bad('Password is wrong.', 401);
        await env.DB.delete('u:' + uid); await env.DB.delete('d:' + uid);
        const i = (await readIdx(env)).filter(x => x !== uid); await env.DB.put('idx', JSON.stringify(i));
        ctx.waitUntil(caches.default.delete(new Request(url.origin + '/__all', { method: 'GET' })));
        return out({ ok: true });
      }
      return bad('Not found', 404);
    } catch (e) { return bad('Server error', 500); }
  }
};
