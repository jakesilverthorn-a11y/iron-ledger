/* Iron Ledger friends server: a tiny Cloudflare Worker.
   Gives friends usernames + passwords, a shared leaderboard and live challenges.
   Stores only public scores, challenge progress and the sets of live workouts you share. Workouts, height and weight never leave the phone.
   Needs ONE KV namespace bound to this Worker with the variable name  DB  (see SERVER-SETUP.txt). */
const ITER = 30000;               // password stretching; kept modest so it fits the free plan's CPU limit
const MAX_USERS = 300, MAX_DOC = 16000, DAYS = 86400;
const COLS = ['people', 'ch', 'cp', 'tg'];   // tg = live 'train together' sessions
const VISION = '@cf/meta/llama-3.2-11b-vision-instruct';
const enc = new TextEncoder();
let SECRET = null;                // signing key, created once and kept in KV

const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '86400' };
const out = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS, extra) });
const bad = (m, s = 400) => out({ error: m }, s);
const out_ok = data => out({ ok: true, data });

async function hmacKey(env) {
  if (!SECRET) {
    let s = await env.DB.get('secret');
    if (!s) { s = b64(crypto.getRandomValues(new Uint8Array(32))); await env.DB.put('secret', s); }
    SECRET = await crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  }
  return SECRET;
}
async function sign(env, text) { return b64(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(text))); }
/* token: uid.gen.exp.sig — gen lives in the user record and changes on password change / account deletion,
   so old tokens stop working for writes. (Older 3-part tokens are still accepted until the account sets a gen.) */
async function mkToken(env, uid, gen) { const body = uid + '.' + (gen || '0') + '.' + (Math.floor(Date.now() / 1000) + 90 * DAYS); return body + '.' + await sign(env, body); }
async function who(env, req) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer (.+)$/); if (!m) return null;
  const p = m[1].split('.');
  if (p.length === 3) { if (!same(await sign(env, p[0] + '.' + p[1]), p[2]) || +p[1] < Date.now() / 1000) return null; return { uid: p[0], gen: '0' }; }
  if (p.length !== 4) return null;
  if (!same(await sign(env, p[0] + '.' + p[1] + '.' + p[2]), p[3]) || +p[2] < Date.now() / 1000) return null;
  return { uid: p[0], gen: p[1] };
}
const newGen = () => b64(crypto.getRandomValues(new Uint8Array(6)));
/* a write needs the account to exist and the token's generation to be current */
async function writer(env, tok) {
  const rec = await env.DB.get('u:' + tok.uid, 'json');
  if (!rec || (rec.gen || '0') !== tok.gen) return null;
  return rec;
}
/* every change bumps 'ver' so polls can return "nothing new" for a single KV read */
async function bump(env) { await env.DB.put('ver', Date.now().toString(36) + Math.random().toString(36).slice(2, 6)); }
/* tidy what people store about themselves: right name, sane types and sizes */
function clean(col, v, uid, rec) {
  const num = (x, lo, hi) => { x = +x; return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };
  const str = (x, n) => String(x == null ? '' : x).slice(0, n);
  if (col === 'people') {
    const g = {}, ex = {}; Object.keys(v.g || {}).slice(0, 20).forEach(k => { const n = num(v.g[k], 0, 100); if (n != null) g[str(k, 20)] = n; });
    Object.keys(v.ex || {}).slice(0, 12).forEach(k => { const n = num(v.ex[k], 0, 100); if (n != null) ex[str(k, 60)] = n; });
    const o = { v: 1, u: rec.name, un: uid, ov: num(v.ov, 0, 100), g, ex, w30: num(v.w30, 0, 999) || 0, s30: num(v.s30, 0, 99999) || 0, n: num(v.n, 0, 99999) || 0, last: num(v.last, 0, 9e15) || 0, at: Date.now() };
    if (v.b && typeof v.b === 'object') { const bg = {}; Object.keys(v.b.g || {}).slice(0, 20).forEach(k => { const n = num(v.b.g[k], 0, 100); if (n != null) bg[str(k, 20)] = n; }); o.b = { c: num(v.b.c, 0, 9e15) || 0, ov: num(v.b.ov, 0, 100), g: bg }; }
    return o;
  }
  if (col === 'tg') { v.u = rec.name; v.at = Date.now(); if (+v.pv > Date.now() + 60000) v.pv = Date.now(); return v; }
  v.at = Date.now(); return v;
}
/* small per-key counters for rate limits (expire on their own) */
async function hits(env, key, ttl) { const n = (+(await env.DB.get(key)) || 0) + 1; await env.DB.put(key, String(n), { expirationTtl: ttl }); return n; }
async function count(env, key) { return +(await env.DB.get(key)) || 0; }
async function hashPw(pw, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: ITER }, k, 256));
}
async function readIdx(env) { return JSON.parse((await env.DB.get('idx')) || '[]'); }
async function addIdx(env, uid) { const i = await readIdx(env); if (i.indexOf(uid) < 0) { i.push(uid); await env.DB.put('idx', JSON.stringify(i)); } return i; }

let LAST = null;   // last /all built by this isolate: { v, body }
async function everyone(env) {
  const idx = await readIdx(env), res = { people: {}, ch: {}, cp: {}, tg: {} };
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
        const ip = req.headers.get('CF-Connecting-IP') || 'x';
        const rec = await env.DB.get('u:' + un, 'json');
        if (path === '/signup') {
          if (rec) return bad('That username is taken. Try another.', 409);
          if (await count(env, 'su:' + ip) >= 5) return bad('Too many new accounts from this network today. Try again tomorrow.', 429);
          if ((await readIdx(env)).length >= MAX_USERS) return bad('This group is full.', 403);
          const salt = b64(crypto.getRandomValues(new Uint8Array(16))), gen = newGen();
          await env.DB.put('u:' + un, JSON.stringify({ name, salt, h: await hashPw(pw, salt), at: Date.now(), gen }));
          await hits(env, 'su:' + ip, DAYS);
          await addIdx(env, un); await bump(env);
          return out({ token: await mkToken(env, un, gen), uid: un, name });
        }
        if (await count(env, 'lf:' + ip) >= 10 || await count(env, 'lu:' + un) >= 10) return bad('Too many wrong passwords. Wait 15 minutes and try again.', 429);
        if (!rec || !same(await hashPw(pw, rec.salt), rec.h)) { await hits(env, 'lf:' + ip, 900); await hits(env, 'lu:' + un, 900); return bad('Wrong username or password.', 401); }
        await addIdx(env, un);
        return out({ token: await mkToken(env, un, rec.gen || '0'), uid: un, name: rec.name });
      }
      const tok = await who(env, req); if (!tok) return bad('Sign in again.', 401);
      const uid = tok.uid;
      if (req.method === 'GET' && path === '/all') {
        // one KV read when nothing changed since the caller's last copy
        const ver = (await env.DB.get('ver')) || '0';
        if (url.searchParams.get('v') === ver) return out({ same: true, v: ver });
        let body;
        if (LAST && LAST.v === ver) body = LAST.body;
        else { const res = await everyone(env); res.v = ver; body = JSON.stringify(res); LAST = { v: ver, body }; }
        return new Response(body, { status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS) });
      }
      const m = path.match(/^\/c\/(people|ch|cp|tg)\/([a-z0-9_]{3,16})$/);
      if (m && (req.method === 'PUT' || req.method === 'DELETE')) {
        if (m[2] !== uid) return bad('You can only change your own data.', 403);
        const rec = await writer(env, tok); if (!rec) return bad('Sign in again.', 401);
        const cur = (await env.DB.get('d:' + uid, 'json')) || {};
        if (req.method === 'PUT') {
          const txt = await req.text(); if (txt.length > MAX_DOC) return bad('Too large', 413);
          let v; try { v = JSON.parse(txt); } catch (e) { return bad('Bad JSON'); }
          if (!v || typeof v !== 'object' || Array.isArray(v)) return bad('Bad JSON');
          cur[m[1]] = clean(m[1], v, uid, rec);
        } else delete cur[m[1]];
        await env.DB.put('d:' + uid, JSON.stringify(cur));
        const idx = await readIdx(env); if (idx.indexOf(uid) < 0) { idx.push(uid); await env.DB.put('idx', JSON.stringify(idx)); }   // heal the index if a signup race dropped us
        await bump(env);
        return out({ ok: true });
      }
      if (req.method === 'POST' && path === '/password') {
        const b = await req.json().catch(() => ({})), rec = await env.DB.get('u:' + uid, 'json');
        if (!rec || (rec.gen || '0') !== tok.gen) return bad('Sign in again.', 401);
        if (!same(await hashPw(String(b.p || ''), rec.salt), rec.h)) return bad('Current password is wrong.', 403);
        if (String(b.np || '').length < 6) return bad('The new password needs at least 6 characters.');
        const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
        rec.salt = salt; rec.h = await hashPw(String(b.np), salt); rec.gen = newGen();   // other devices are signed out
        await env.DB.put('u:' + uid, JSON.stringify(rec));
        return out({ ok: true, token: await mkToken(env, uid, rec.gen) });
      }
      if (req.method === 'POST' && path === '/delete-account') {
        const b = await req.json().catch(() => ({})), rec = await env.DB.get('u:' + uid, 'json');
        if (!rec || (rec.gen || '0') !== tok.gen) return bad('Sign in again.', 401);
        if (!same(await hashPw(String(b.p || ''), rec.salt), rec.h)) return bad('Password is wrong.', 403);
        await env.DB.delete('u:' + uid); await env.DB.delete('d:' + uid);
        const i = (await readIdx(env)).filter(x => x !== uid); await env.DB.put('idx', JSON.stringify(i));
        await bump(env);
        return out({ ok: true });
      }
      if (req.method === 'POST' && path === '/analyze') {
        if (!env.AI) return bad('AI is not turned on for this server. Add a Workers AI binding named AI.', 501);
        const day = new Date().toISOString().slice(0, 10), ck = 'ai:' + uid + ':' + day, used = +(await env.DB.get(ck)) || 0;
        if (used >= 8) return bad('Daily photo limit reached. Try again tomorrow.', 429);
        const txt = await req.text(); if (txt.length > 2500000) return bad('Photo too large', 413);
        let b; try { b = JSON.parse(txt); } catch (e) { return bad('Bad request'); }
        const img = String(b.image || ''), prompt = String(b.prompt || '').slice(0, 4000);
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(img) || !prompt) return bad('Bad request');
        const messages = [{ role: 'system', content: 'You are a careful, kind strength coach. You answer with JSON only.' }, { role: 'user', content: prompt }];
        const run = () => env.AI.run(VISION, { messages, image: img, max_tokens: 700, temperature: 0.2 });
        let r;
        try { r = await run(); }
        catch (e) {
          // Meta's model needs a one-time licence agreement; accept it and retry once
          if (/agree|licen[cs]e/i.test(String(e && e.message))) { try { await env.AI.run(VISION, { prompt: 'agree' }); } catch (e2) { } r = await run(); }
          else throw e;
        }
        const out = typeof r === 'string' ? r : (r && (r.response || (r.result && (r.result.response || r.result)))) || '';
        const m = String(typeof out === 'string' ? out : JSON.stringify(out)).match(/\{[\s\S]*\}/);
        if (!m) return bad('The AI did not return a plan. Try another photo.', 502);
        let data; try { data = JSON.parse(m[0]); } catch (e) { return bad('The AI answer could not be read. Try again.', 502); }
        await env.DB.put(ck, String(used + 1), { expirationTtl: 2 * DAYS });   // only successful analyses count toward the daily limit
        return out_ok(data);
      }
      return bad('Not found', 404);
    } catch (e) { return bad('Server error', 500); }
  }
};
