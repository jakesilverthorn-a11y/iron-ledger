/* ===== cartoon exercise figures =====
   A tiny 2-D skeleton (forward kinematics + two-bone IK) drawn as a cartoon character, animated between two key poses.
   Angles: limbs measured from straight down, positive = toward the way the figure faces (right). Torso from straight up. */
var FIG = (function () {
  var FY = 178;
  var LEN = { th: 38, sh: 38, to: 50, ua: 27, fa: 25, hd: 19 };
  function R(d) { return d * Math.PI / 180; }
  function dn(a) { return [Math.sin(R(a)), Math.cos(R(a))]; }
  function up(t) { return [Math.sin(R(t)), -Math.cos(R(t))]; }
  function pt(p, d, l) { return [p[0] + d[0] * l, p[1] + d[1] * l]; }
  function f1(v) { return Math.round(v * 10) / 10; }
  function ik(root, tg, l1, l2, side) {
    var dx = tg[0] - root[0], dy = tg[1] - root[1], d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    var mx = l1 + l2 - 0.05, mn = Math.abs(l1 - l2) + 0.05;
    var dd = Math.min(mx, Math.max(mn, d)), ux = dx / d, uy = dy / d;
    var a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    var bx = root[0] + ux * a, by = root[1] + uy * a;
    var j = [bx + (-uy) * h * -side, by + ux * h * -side];
    return { j: j, e: [root[0] + ux * dd, root[1] + uy * dd] };
  }
  function ease(k) { return k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k); }
  function mix(A, B, k) {
    var o = {}, key;
    for (key in A) o[key] = A[key];
    for (key in B) {
      var a = A[key], b = B[key];
      if (typeof a === 'number' && typeof b === 'number') o[key] = a + (b - a) * k;
      else if (a && b && a.length && b.length && typeof a[0] === 'number') o[key] = a.map(function (v, i) { return v + (b[i] - v) * k; });
      else o[key] = k >= .5 ? b : (a === undefined ? b : a);
    }
    return o;
  }
  function ang(v) { return Math.atan2(v[0], v[1]) * 180 / Math.PI; }

  /* ---------- side-view solver ---------- */
  function solve(P) {
    var J = {}, t = P.t || 0, ank, hip;
    var th = P.th || 0, sh = P.sh || 0;
    if (P.stand) ank = [P.ax || 150, FY - 6 - (P.lift || 0)]; else ank = P.ank;
    if (P.hip) hip = P.hip.slice(); else hip = [ank[0] - dn(th)[0] * LEN.th - dn(sh)[0] * LEN.sh, ank[1] - dn(th)[1] * LEN.th - dn(sh)[1] * LEN.sh];
    J.hip = hip;
    if (P.hip && P.ank && !P.stand) { var r = ik(hip, ank, LEN.th, LEN.sh, P.kb === undefined ? 1 : P.kb); J.kn = r.j; J.an = r.e; }
    else { J.kn = pt(hip, dn(th), LEN.th); J.an = pt(J.kn, dn(sh), LEN.sh); }
    var toeFloor = P.stand || P.toe, ft;
    if (toeFloor) { ft = Math.acos(Math.max(0, Math.min(1, (FY - J.an[1]) / 13))) * 180 / Math.PI; } else ft = P.ft === undefined ? 62 : P.ft;
    J.toe = pt(J.an, dn(ft), 13);
    if (P.ank2) { var r2 = ik(hip, P.ank2, LEN.th, LEN.sh, P.kb2 === undefined ? 1 : P.kb2); J.kn2 = r2.j; J.an2 = r2.e; var f2 = P.toe2 ? Math.acos(Math.max(0, Math.min(1, (FY - J.an2[1]) / 13))) * 180 / Math.PI : (P.ft2 === undefined ? 62 : P.ft2); J.toe2 = pt(J.an2, dn(f2), 13); }
    else if (P.th2 !== undefined) { J.kn2 = pt(hip, dn(P.th2), LEN.th); J.an2 = pt(J.kn2, dn(P.sh2 || 0), LEN.sh); J.toe2 = pt(J.an2, dn(P.ft2 === undefined ? 62 : P.ft2), 13); }
    else { J.kn2 = [J.kn[0] - 4, J.kn[1]]; J.an2 = [J.an[0] - 4, J.an[1]]; J.toe2 = [J.toe[0] - 4, J.toe[1]]; }
    var u = up(t); J.u = u;
    J.sho = pt(hip, u, LEN.to);
    var hd = pt(J.sho, up(t + (P.hd || 0)), LEN.hd); J.head = hd; J.hdAng = t + (P.hd || 0);
    var tg = null;
    if (P.hand) tg = P.hand; else if (P.hs) tg = [J.sho[0] + P.hs[0], J.sho[1] + P.hs[1]]; else if (P.hh) tg = [hd[0] + P.hh[0], hd[1] + P.hh[1]]; else if (P.hp) tg = [hip[0] + P.hp[0], hip[1] + P.hp[1]];
    if (tg) { var ra = ik(J.sho, tg, LEN.ua, LEN.fa, P.eb === undefined ? 1 : P.eb); J.el = ra.j; J.wr = ra.e; }
    else { J.el = pt(J.sho, dn(P.ua || 0), LEN.ua); J.wr = pt(J.el, dn(P.fa || 0), LEN.fa); }
    var ha = P.hnd === undefined ? ang([J.wr[0] - J.el[0], J.wr[1] - J.el[1]]) : P.hnd;
    J.hand = pt(J.wr, dn(ha), 8);
    J.el2 = [J.el[0] - 4, J.el[1] + 1]; J.wr2 = [J.wr[0] - 4, J.wr[1] + 1];
    return J;
  }

  function ln(a, b, w, c) { return '<line class="' + c + '" x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '" stroke-width="' + w + '"/>'; }
  function limb(a, b, w, c) { return ln(a, b, w + 3, 'o') + ln(a, b, w, c); }
  function circ(p, r, c) { return '<circle class="' + c + '" cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + r + '"/>'; }
  function lerp(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
  function ellipse(c, rx, ry, rot, cls) { return '<ellipse class="' + cls + '" cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + f1(rot) + ' ' + f1(c[0]) + ' ' + f1(c[1]) + ')"/>'; }
  function rect(x, y, w, h, r, cls) { return '<rect class="' + cls + '" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="' + (r || 0) + '"/>'; }

  function anchor(J, a) {
    if (a === 'hand') return J.hand ? lerp(J.wr, J.hand, .55) : J.wr;
    if (a === 'hand2') return [J.wr2[0], J.wr2[1]];
    if (a === 'hip') return J.hip; if (a === 'sho') return J.sho; if (a === 'head') return J.head;
    if (a === 'ank') return J.an; if (a === 'kn') return J.kn; if (a === 'wr') return J.wr; if (a === 'toe') return J.toe;
    return a;
  }
  function eqDraw(J, it, P) {
    var p = it.at ? anchor(J, it.at) : null;
    if (p && it.dx) p = [p[0] + it.dx, p[1] + (it.dy || 0)];
    switch (it.k) {
      case 'plate': return circ(p, it.r || 11, 'plate') + circ(p, (it.r || 11) * .42, 'hub');
      case 'db': return '<g transform="rotate(' + (it.rot || 0) + ' ' + f1(p[0]) + ' ' + f1(p[1]) + ')">' + rect(p[0] - 9, p[1] - 3, 18, 6, 2, 'bar') + rect(p[0] - 10, p[1] - 6.5, 5, 13, 2, 'plate') + rect(p[0] + 5, p[1] - 6.5, 5, 13, 2, 'plate') + '</g>';
      case 'kb': return circ([p[0], p[1] + 4], 8, 'plate') + '<path class="kbh" d="M' + f1(p[0] - 5) + ' ' + f1(p[1] + 1) + ' q5 -9 10 0"/>';
      case 'ball': return circ(p, 9, 'plate');
      case 'rect': return rect(it.x, it.y, it.w, it.h, it.r === undefined ? 3 : it.r, it.c || 'pad');
      case 'line': return ln(it.a, it.b, it.w || 3, it.c || 'bar');
      case 'plat': { var pa = R(it.ang || 0), v = [Math.cos(pa), Math.sin(pa)], l = it.len || 24; return ln([p[0] - v[0] * l, p[1] - v[1] * l], [p[0] + v[0] * l, p[1] + v[1] * l], 6, 'pad'); }
      case 'cable': { var q = it.to; return ln(p, q, 1.6, 'cab') + circ(q, 3.6, 'hub'); }
      case 'cable2': { var q2 = it.to, a2 = anchor(J, it.at2 || 'hand2'); return ln(p, q2, 1.6, 'cab') + circ(q2, 3.6, 'hub'); }
      case 'padline': {
        var u = J.u, nrm = [-u[1], u[0]], a = pt(pt(J.hip, nrm, -(it.off || 15)), u, it.s0 === undefined ? -6 : it.s0), b = pt(pt(J.hip, nrm, -(it.off || 15)), u, it.s1 === undefined ? 62 : it.s1);
        var out = ln(a, b, it.w || 9, 'pad');
        if (it.post) { out = ln([a[0], a[1]], [a[0], FY], 3, 'bar') + ln([b[0], b[1]], [b[0], FY], 3, 'bar') + out; }
        return out;
      }
    }
    return '';
  }
  function hlDraw(J, h) {
    var seg = { ua: [J.sho, J.el], fa: [J.el, J.wr], th: [J.hip, J.kn], sh: [J.kn, J.an], to: [J.hip, J.sho], hip: [J.hip, J.sho] }[h[0]];
    if (!seg) return '';
    var a = seg[0], b = seg[1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1, d = [dx / l, dy / l];
    var nrm = h[0] === 'to' || h[0] === 'hip' ? [-d[1], d[0]] : [d[1], -d[0]];
    var c = pt(pt(a, d, l * h[1]), nrm, h[2]);
    return ellipse(c, h[3] || 8, h[4] || 8, Math.atan2(d[1], d[0]) * 180 / Math.PI, 'hl');
  }
  function face(J) {
    var a = J.hdAng, n = [Math.cos(R(a)), Math.sin(R(a))], u = up(a), h = J.head;
    var skinC = pt(h, n, 2);
    var eye = pt(pt(h, n, 6.2), u, 1.8);
    return circ(h, 11.6, 'hair') + circ(skinC, 10.4, 'skin') + circ(eye, 1.7, 'eye');
  }
  function drawSide(J, P, T) {
    var s = '', i;
    // far limbs
    s += limb(J.hip, J.kn2, 13, 'skf') + limb(J.kn2, J.an2, 11.5, 'skf') + ln(J.an2, J.toe2, 11, 'o') + ln(J.an2, J.toe2, 8, 'shoe');
    s += limb(J.sho, J.el2, 10, 'skf') + limb(J.el2, J.wr2, 9, 'skf');
    // torso
    s += limb(J.hip, J.sho, 21, 'shirt');
    s += ln(J.hip, lerp(J.hip, J.sho, .22), 21.5, 'shorts');
    // near leg
    s += limb(J.hip, J.kn, 15, 'sk') + ln(J.hip, lerp(J.hip, J.kn, .5), 17, 'shorts');
    s += limb(J.kn, J.an, 12.5, 'sk') + ln(J.an, J.toe, 12, 'o') + ln(J.an, J.toe, 9, 'shoe');
    // equipment behind hands (pads, benches)
    var eq = T.eq || [];
    for (i = 0; i < eq.length; i++) if (eq[i].back) s += eqDraw(J, eq[i], P);
    // arm
    s += limb(J.el, J.wr, 9.5, 'sk') + limb(J.sho, J.el, 11.5, 'sk') + ln(J.sho, lerp(J.sho, J.el, .42), 12.5, 'shirt');
    s += ln(J.wr, J.hand, 8, 'o') + ln(J.wr, J.hand, 6.5, 'sk');
    s += face(J);
    var hl = T.hl || [];
    for (i = 0; i < hl.length; i++) s += hlDraw(J, hl[i]);
    for (i = 0; i < eq.length; i++) if (!eq[i].back) s += eqDraw(J, eq[i], P);
    return s;
  }

  /* ---------- front-view solver / drawing ---------- */
  function solveF(P) {
    var J = {}, t = P.t || 0, cx = P.cx || 150;
    var thl = P.thl === undefined ? -3 : P.thl, thr = P.thr === undefined ? 3 : P.thr, shl = P.shl === undefined ? thl : P.shl, shr = P.shr === undefined ? thr : P.shr, fl = P.fl || 1;
    var hip;
    if (P.s) { J.s = P.s.slice(); hip = [J.s[0] - up(t)[0] * LEN.to, J.s[1] - up(t)[1] * LEN.to]; }
    else {
      var hy = P.hy !== undefined ? P.hy : (FY - 6 - (Math.cos(R(thl)) * LEN.th * fl + Math.cos(R(shl)) * LEN.sh));
      hip = [cx, hy]; J.s = pt(hip, up(t), LEN.to);
    }
    J.hip = hip;
    var raise = P.shr2 || 0;
    J.sl = [J.s[0] - 15, J.s[1] - raise]; J.sr = [J.s[0] + 15, J.s[1] - raise];
    J.hl = [hip[0] - 8, hip[1]]; J.hr = [hip[0] + 8, hip[1]];
    J.kl = pt(J.hl, dn(thl), LEN.th * fl); J.al = pt(J.kl, dn(shl), LEN.sh);
    J.kr = pt(J.hr, dn(thr), LEN.th * fl); J.ar = pt(J.kr, dn(shr), LEN.sh);
    function arm(root, tg, ua, fa, side) {
      if (tg) { var r = ik(root, tg, LEN.ua, LEN.fa, side); return { e: r.j, w: r.e }; }
      var e = pt(root, dn(ua || 0), LEN.ua); return { e: e, w: pt(e, dn(fa || 0), LEN.fa) };
    }
    var al = arm(J.sl, P.hdl, P.ual, P.fal, P.ebl === undefined ? -1 : P.ebl), ar = arm(J.sr, P.hdr, P.uar, P.far, P.ebr === undefined ? 1 : P.ebr);
    J.el = al.e; J.wl = al.w; J.er = ar.e; J.wrr = ar.w;
    J.head = pt(J.s, up(t), LEN.hd); J.hdAng = t;
    return J;
  }
  function faceF(J) {
    var h = J.head;
    return circ(h, 11.6, 'hair') + circ([h[0], h[1] + 1.5], 10.4, 'skin') + circ([h[0] - 3.6, h[1] + 1], 1.5, 'eye') + circ([h[0] + 3.6, h[1] + 1], 1.5, 'eye') +
      '<path class="mouth" d="M' + f1(h[0] - 3) + ' ' + f1(h[1] + 6) + ' q3 2.4 6 0"/>';
  }
  function eqDrawF(J, it) {
    var wl = J.wl, wr = J.wrr;
    switch (it.k) {
      case 'dbF': return [wl, wr].map(function (p) { return rect(p[0] - 3, p[1] - 8, 6, 16, 2, 'bar') + rect(p[0] - 7, p[1] - 6, 14, 5, 2, 'plate') + rect(p[0] - 7, p[1] + 2, 14, 5, 2, 'plate'); }).join('');
      case 'barF': return ln([wl[0] - 9, wl[1]], [wr[0] + 9, wr[1]], 3, 'bar') + [wl[0] - 10, wr[0] + 10].map(function (x, i) { var y = i ? wr[1] : wl[1]; return rect(x - 2.5, y - 11, 5, 22, 2, 'plate'); }).join('');
      case 'grip': return ln([wl[0] - 4, wl[1]], [wr[0] + 4, wr[1]], 3.5, 'bar');
      case 'cableF': return ln(wl, it.l, 1.6, 'cab') + ln(wr, it.r, 1.6, 'cab') + circ(it.l, 3.6, 'hub') + circ(it.r, 3.6, 'hub');
      case 'rect': return rect(it.x, it.y, it.w, it.h, it.r === undefined ? 3 : it.r, it.c || 'pad');
      case 'line': return ln(it.a, it.b, it.w || 3, it.c || 'bar');
      case 'plate': return circ(wl, it.r || 9, 'plate') + circ(wr, it.r || 9, 'plate');
      case 'plateMid': { var pm = lerp(wl, wr, .5); return circ(pm, it.r || 8, 'plate') + circ(pm, (it.r || 8) * .42, 'hub'); }
      case 'dbL': return rect(wl[0] - 3, wl[1] - 8, 6, 16, 2, 'bar') + rect(wl[0] - 7, wl[1] - 6, 14, 5, 2, 'plate') + rect(wl[0] - 7, wl[1] + 2, 14, 5, 2, 'plate');
    }
    return '';
  }
  function hlDrawF(J, h) {
    var c = { delt: [[J.sl, -2, -1], [J.sr, 2, -1]], trap: [[[J.s[0] - 9, J.s[1] - 5], 0, 0], [[J.s[0] + 9, J.s[1] - 5], 0, 0]], chest: [[[J.s[0] - 8, J.s[1] + 12], 0, 0], [[J.s[0] + 8, J.s[1] + 12], 0, 0]], lat: [[[J.s[0] - 13, J.s[1] + 20], 0, 0], [[J.s[0] + 13, J.s[1] + 20], 0, 0]], bi: [[lerp(J.sl, J.el, .5), 0, 0], [lerp(J.sr, J.er, .5), 0, 0]] }[h];
    if (!c) return '';
    var rx = { delt: 8, trap: 9, chest: 9, lat: 6, bi: 6 }[h], ry = { delt: 8, trap: 6, chest: 8, lat: 14, bi: 10 }[h];
    return c.map(function (q) { return ellipse(q[0], rx, ry, 0, 'hl'); }).join('');
  }
  function drawFront(J, P, T) {
    var s = '', i, eq = T.eq || [];
    for (i = 0; i < eq.length; i++) if (eq[i].back) s += eqDrawF(J, eq[i]);
    s += limb(J.hl, J.kl, 13, 'sk') + ln(J.hl, lerp(J.hl, J.kl, .5), 15, 'shorts') + limb(J.kl, J.al, 11.5, 'sk');
    s += limb(J.hr, J.kr, 13, 'sk') + ln(J.hr, lerp(J.hr, J.kr, .5), 15, 'shorts') + limb(J.kr, J.ar, 11.5, 'sk');
    s += ln(J.al, [J.al[0] - 6, J.al[1]], 9, 'o') + ln(J.al, [J.al[0] - 6, J.al[1]], 6.5, 'shoe') + ln(J.ar, [J.ar[0] + 6, J.ar[1]], 9, 'o') + ln(J.ar, [J.ar[0] + 6, J.ar[1]], 6.5, 'shoe');
    s += limb(J.hip, J.s, 29, 'shirt') + ln(J.hip, lerp(J.hip, J.s, .2), 29.5, 'shorts');
    s += limb(J.sl, J.el, 11, 'sk') + ln(J.sl, lerp(J.sl, J.el, .4), 12.5, 'shirt') + limb(J.el, J.wl, 9.5, 'sk') + circ(J.wl, 4.6, 'sk');
    s += limb(J.sr, J.er, 11, 'sk') + ln(J.sr, lerp(J.sr, J.er, .4), 12.5, 'shirt') + limb(J.er, J.wrr, 9.5, 'sk') + circ(J.wrr, 4.6, 'sk');
    s += faceF(J);
    var hl = T.hl || [];
    for (i = 0; i < hl.length; i++) s += hlDrawF(J, hl[i]);
    for (i = 0; i < eq.length; i++) if (!eq[i].back) s += eqDrawF(J, eq[i]);
    return s;
  }

  function frame(T, k) {
    var P = mix(T.A, T.B, ease(k)), J, body;
    if (T.fv) { J = solveF(P); body = drawFront(J, P, T); } else { J = solve(P); body = drawSide(J, P, T); }
    var sc = (T.sc || 1) * 1.06, pv = T.pv || [150, FY];
    body = '<g transform="translate(' + pv[0] + ' ' + pv[1] + ') scale(' + f1(sc) + ') translate(' + (-pv[0]) + ' ' + (-pv[1]) + ')">' + body + '</g>';
    return (T.noFloor ? '' : '<rect class="floor" x="0" y="' + FY + '" width="300" height="22"/><line class="floorl" x1="0" y1="' + FY + '" x2="300" y2="' + FY + '"/>') + body;
  }

  /* ---------- templates ---------- */
  function X(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function held(h, at) {
    at = at || 'hand';
    if (h === 'bar') return [{ k: 'plate', at: at, r: 11 }];
    if (h === 'db') return [{ k: 'db', at: at }];
    if (h === 'kb') return [{ k: 'kb', at: at }];
    if (h === 'ball') return [{ k: 'ball', at: at }];
    return [];
  }
  function seated(hx, hy, extra) {
    return X({ hip: [hx, hy], ank: [hx + 40, FY - 6], kb: 1, ft: 70 }, extra || {});
  }
  function seatEq(hx, hy, back) {
    var o = [{ k: 'rect', x: hx - 26, y: hy + 10, w: 52, h: 9, r: 3, c: 'pad', back: 1 }, { k: 'rect', x: hx - 3, y: hy + 19, w: 6, h: FY - hy - 19, r: 1, c: 'bar', back: 1 }];
    if (back) o.push({ k: 'rect', x: hx - 32, y: hy - 70, w: 9, h: 84, r: 4, c: 'pad', back: 1 });
    return o;
  }
  var B = {};
  B.curl = function (o) {
    var eq = held(o.h), A = { stand: 1, t: 0, ua: 2, fa: 2 }, Bp = { stand: 1, t: -2, ua: 6, fa: 158 };
    if (o.h === 'cable') { eq = [{ k: 'cable', at: 'hand', to: [240, 172] }, { k: 'rect', x: 250, y: 120, w: 22, h: 58, r: 3, c: 'pad', back: 1 }]; }
    if (o.h === 'bar') eq = [{ k: 'plate', at: 'hand', r: 8 }];
    if (o.h === 'db' && o.hammer) eq = [{ k: 'db', at: 'hand', rot: 90 }];
    return { A: A, B: Bp, eq: eq, hl: [['ua', .5, 6, 10, 6]] };
  };
  B.ohp = function (o) {
    var Ap = { t: 0, ua: 40, fa: 172, eb: 1 }, Bp = { t: 0, ua: 172, fa: 178 }, eq = held(o.h), back = [];
    if (o.seated) { var base = seated(120, 146, { ft: 70 }); Ap = X(base, Ap); Bp = X(base, Bp); back = seatEq(120, 146, true); }
    else { Ap = X({ stand: 1 }, Ap); Bp = X({ stand: 1 }, Bp); }
    if (o.h === 'bar') eq = [{ k: 'plate', at: 'hand', r: 8 }];
    return { A: Ap, B: Bp, eq: back.concat(eq), hl: [['to', 1, 0, 9, 9]], sc: .82 };
  };
  B.fraise = function (o) {
    var eq = held(o.h);
    if (o.h === 'cable') eq = [{ k: 'cable', at: 'hand', to: [230, 172] }];
    return { A: { stand: 1, t: 0, ua: 2, fa: 4 }, B: { stand: 1, t: -3, ua: 88, fa: 92 }, eq: eq, hl: [['to', 1, 2, 8, 8]] };
  };
  B.lat = function (o) {
    return { fv: 1, A: { ual: -6, fal: -4, uar: 6, far: 4 }, B: { ual: -84, fal: -92, uar: 84, far: 92 }, eq: o.h === 'cable' ? [] : [{ k: 'dbF' }], hl: ['delt'] };
  };
  B.shrug = function (o) {
    return { fv: 1, A: { ual: -4, fal: -4, uar: 4, far: 4, shr2: 0 }, B: { ual: -4, fal: -4, uar: 4, far: 4, shr2: 8 }, eq: [o.h === 'bar' ? { k: 'barF' } : { k: 'dbF' }], hl: ['trap'] };
  };
  B.fly = function (o) {
    return { fv: 1, A: { ual: -78, fal: -100, uar: 78, far: 100 }, B: { ual: -22, fal: 6, uar: 22, far: -6 }, eq: o.h === 'cable' ? [{ k: 'cableF', l: [30, 22], r: [270, 22] }] : [{ k: 'dbF' }], hl: ['chest'] };
  };
  B.pulldown = function (o) {
    var seat = [{ k: 'rect', x: 118, y: 126, w: 64, h: 9, r: 3, c: 'pad', back: 1 }, { k: 'rect', x: 146, y: 135, w: 8, h: 43, r: 1, c: 'bar', back: 1 }, { k: 'rect', x: 110, y: 112, w: 80, h: 7, r: 3, c: 'bar', back: 1 }];
    return { fv: 1, A: { hy: 118, fl: .5, thl: -10, thr: 10, shl: -4, shr: 4, ual: -150, fal: -168, uar: 150, far: 168 }, B: { hy: 118, fl: .5, thl: -10, thr: 10, shl: -4, shr: 4, ual: -50, fal: -168, uar: 50, far: 168 }, eq: [{ k: 'grip', back: 0 }].concat(seat).concat([{ k: 'line', a: [150, 0], b: [150, 20], w: 2, c: 'cab', back: 1 }]), hl: ['lat'] };
  };
  B.pullup = function () {
    var post = [{ k: 'line', a: [92, 24], b: [92, 0], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [208, 24], b: [208, 0], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [88, 24], b: [212, 24], w: 5, c: 'bar', back: 1 }];
    var legs = { thl: -3, thr: 3, shl: -8, shr: 8, hdl: [126, 26], hdr: [174, 26], ebl: 1, ebr: -1 };
    return { fv: 1, noFloor: 1, sc: .8, pv: [150, 24], A: X(legs, { s: [150, 78] }), B: X(legs, { s: [150, 56] }), eq: post, hl: ['lat'] };
  };
  B.bench = function (o) {
    var inc = o.inc || 0, hip = inc ? [205, 150] : [205, 150], t = -90 + inc, legs = { hip: hip, ank: [236, FY - 6], kb: 1, ft: 70, t: t };
    var Ap, Bp, eq = [];
    var hsA = inc ? [22, -16 - inc * .25] : [24, -14], hsB = inc ? [10, -52 + inc * .1] : [12, -50];
    Ap = X(legs, { hs: hsA, eb: -1 }); Bp = X(legs, { hs: hsB, eb: -1 });
    if (inc) { eq.push({ k: 'padline', off: 16, s0: -14, s1: 66, w: 9, post: 1, back: 1 }, { k: 'rect', x: 178, y: 163, w: 56, h: 8, r: 3, c: 'pad', back: 1 }, { k: 'rect', x: 204, y: 171, w: 6, h: FY - 171, r: 1, c: 'bar', back: 1 }); }
    else eq.push({ k: 'rect', x: 106, y: 161, w: 136, h: 9, r: 4, c: 'pad', back: 1 }, { k: 'rect', x: 124, y: 170, w: 6, h: FY - 170, r: 1, c: 'bar', back: 1 }, { k: 'rect', x: 220, y: 170, w: 6, h: FY - 170, r: 1, c: 'bar', back: 1 });
    eq = eq.concat(o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : [{ k: 'plate', at: 'hand', r: 9 }]);
    return { A: Ap, B: Bp, eq: eq, hl: [['to', .8, 12, 11, 7]] };
  };
  B.chestMachine = function () {
    var b = seated(120, 146, { t: 0, ft: 70 });
    return { A: X(b, { hs: [18, 6], eb: -1 }), B: X(b, { hs: [50, -2], eb: -1 }), eq: seatEq(120, 146, true).concat([{ k: 'line', a: [150, 70], b: [150, 150], w: 0.1, c: 'bar' }, { k: 'plate', at: 'hand', r: 3.5 }]), hl: [['to', .78, 11, 11, 7]] };
  };
  B.pushup = function () {
    function pose(beta, hx) {
      var r = (90 - beta);
      return { ank: [58, FY - 10], toe: 1, th: -r, sh: -r, t: r, hd: 14, hand: [hx, FY - 4], eb: -1, ft: 40 };
    }
    return { A: pose(24, 182), B: pose(4, 182), eq: [], hl: [['to', .85, 9, 10, 7]] };
  };
  B.bentRow = function (o) {
    var base = { stand: 1, ax: 126, th: 24, sh: -18, t: 58, hd: -30 };
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : [{ k: 'plate', at: 'hand', r: 11 }];
    return { A: X(base, { ua: 2, fa: 2 }), B: X(base, { ua: -82, fa: 4 }), eq: eq, hl: [['to', .66, -11, 11, 7]] };
  };
  B.rowSeated = function () {
    var b = { hip: [112, 150], ank: [186, 168], kb: 1, ft: 70, t: -2 };
    var eq = seatEq(112, 150, 0).concat([{ k: 'rect', x: 186, y: 140, w: 7, h: 38, r: 2, c: 'pad', back: 1 }, { k: 'rect', x: 250, y: 100, w: 24, h: 78, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [250, 128] }]);
    return { A: X(b, { hs: [52, 6], eb: -1 }), B: X(b, { hs: [20, 40], eb: -1 }), eq: eq, hl: [['to', .7, -11, 11, 7]] };
  };
  B.squat = function (o) {
    var Ap = { stand: 1, ax: 150, th: 3, sh: 0, t: 0 }, Bp = { stand: 1, ax: 150, th: 88, sh: -36, t: 36 }, eq = [];
    var v = o.v || 'back';
    if (v === 'back') { Ap.hs = Bp.hs = [-4, -7]; Ap.eb = Bp.eb = -1; eq = [{ k: 'plate', at: 'sho', dx: -5, dy: -6, r: 10 }]; }
    else if (v === 'front') { Ap.hs = Bp.hs = [12, -3]; Ap.eb = Bp.eb = 1; eq = [{ k: 'plate', at: 'sho', dx: 11, dy: -2, r: 10 }]; }
    else if (v === 'goblet') { Ap.hs = Bp.hs = [10, 10]; Ap.eb = Bp.eb = 1; eq = [{ k: 'db', at: 'hand', rot: 90 }]; }
    else if (v === 'db') { Ap.ua = Bp.ua = 0; Ap.fa = Bp.fa = 0; Bp.ua = 8; Bp.fa = 8; eq = [{ k: 'db', at: 'hand', rot: 90 }]; }
    else if (v === 'smith') { Ap.hs = Bp.hs = [-4, -7]; Ap.eb = Bp.eb = -1; eq = [{ k: 'plate', at: 'sho', dx: -5, dy: -6, r: 10 }, { k: 'line', a: [116, 20], b: [116, FY], w: 2, c: 'bar', back: 1 }]; }
    else if (v === 'hack') { Ap.ua = Bp.ua = 0; Ap.fa = Bp.fa = 0; eq = []; }
    else { Ap.ua = 0; Ap.fa = 0; Bp.ua = 88; Bp.fa = 90; Ap.ua = 60; Ap.fa = 82; }
    return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, 9, 14, 8], ['hip', 0, -4, 9, 9]] };
  };
  B.lunge = function (o) {
    var Ap = { stand: 1, ax: 168, th: 14, sh: 0, t: 0, ank2: [116, FY - 6], kb2: 1, toe2: 1, ua: 0, fa: 0 };
    var Bp = { stand: 1, ax: 176, th: 86, sh: -4, t: 4, ank2: [92, FY - 11], kb2: 1, toe2: 1, ua: 0, fa: 0 };
    var eq = held(o.h === 'bar' ? 'none' : o.h);
    if (o.h === 'db') eq = [{ k: 'db', at: 'hand', rot: 90 }];
    if (o.h === 'bar') { Ap.hs = Bp.hs = [-4, -7]; Ap.eb = Bp.eb = -1; eq = [{ k: 'plate', at: 'sho', dx: -5, dy: -6, r: 10 }]; }
    return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, 9, 14, 8], ['hip', 0, -4, 9, 9]] };
  };
  B.deadlift = function (o) {
    var Ap = { stand: 1, ax: 140, th: 66, sh: -22, t: 52, hd: -28, hs: [8, 52], eb: -1 }, Bp = { stand: 1, ax: 140, th: 2, sh: 0, t: 3, hd: -2, hs: [4, 52], eb: -1 };
    return { A: Ap, B: Bp, eq: [{ k: 'plate', at: 'hand', r: 11 }], hl: [['hip', 0, -3, 9, 9], ['th', .5, -9, 12, 7]] };
  };
  B.rdl = function (o) {
    var Ap = { stand: 1, ax: 140, th: 22, sh: -10, t: 78, hd: -50, hs: [6, 50], eb: -1 }, Bp = { stand: 1, ax: 140, th: 2, sh: 0, t: 3, hd: -2, hs: [4, 50], eb: -1 };
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : [{ k: 'plate', at: 'hand', r: 9 }];
    if (o.gm) { Ap.hs = Bp.hs = [-4, -7]; eq = [{ k: 'plate', at: 'sho', dx: -5, dy: -6, r: 9 }]; Ap.hd = -60; }
    return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, -9, 12, 7], ['hip', 0, -3, 9, 9]] };
  };
  B.hipthrust = function (o) {
    var legs = { ank: [186, FY - 6], kb: 1, ft: 70 };
    var Ap = X(legs, { hip: [128, 150], t: -84, hp: [0, 0] }), Bp = X(legs, { hip: [128, 126], t: -108 });
    Ap.ua = 80; Ap.fa = 85; Bp.ua = 80; Bp.fa = 85;
    var eq = [{ k: 'rect', x: 36, y: 142, w: 62, h: 36, r: 5, c: 'pad', back: 1 }];
    if (o.floor) eq = []; else if (o.h === 'bar') eq.push({ k: 'plate', at: 'hip', dy: -12, r: 9 });
    if (o.floor) { Ap = X(legs, { hip: [128, 162], t: -90, ua: 80, fa: 85 }); Bp = X(legs, { hip: [128, 138], t: -112, ua: 80, fa: 85 }); }
    return { A: Ap, B: Bp, eq: eq, hl: [['hip', 0, -5, 10, 10]] };
  };
  B.legpress = function () {
    var b = { hip: [74, 152], t: -50, ft: 70 };
    var eq = [{ k: 'padline', off: 15, s0: -10, s1: 60, w: 9, back: 1 }, { k: 'line', a: [74, 168], b: [250, 100], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [74, 168], b: [74, FY], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [250, 100], b: [250, FY], w: 4, c: 'cab', back: 1 }];
    return { A: X(b, { ank: [114, 116], kb: 1, ua: 60, fa: 70 }), B: X(b, { ank: [146, 102], kb: 1, ua: 60, fa: 70 }), eq: eq.concat([{ k: 'plat', at: 'ank', ang: 69, len: 22 }]), hl: [['th', .5, 10, 14, 8]] };
  };
  B.legext = function () {
    var hx = 110, hy = 140, b = { hip: [hx, hy], t: -6, th: 88, ua: 30, fa: 70 };
    return { A: X(b, { sh: 4 }), B: X(b, { sh: 84 }), eq: seatEq(hx, hy, true).concat([{ k: 'rect', x: hx + 36, y: hy + 12, w: 7, h: 26, r: 3, c: 'pad' }]).map(function (e) { return e; }), hl: [['th', .55, 9, 14, 8]] };
  };
  B.legcurl = function () {
    var hx = 110, hy = 140, b = { hip: [hx, hy], t: -6, th: 88, ua: 30, fa: 70 };
    return { A: X(b, { sh: 84 }), B: X(b, { sh: -14 }), eq: seatEq(hx, hy, true).concat([{ k: 'rect', x: hx + 4, y: hy - 22, w: 38, h: 8, r: 3, c: 'pad' }]), hl: [['th', .5, -9, 14, 7]] };
  };
  B.calf = function (o) {
    if (o.seated) {
      var hx = 110, hy = 120, b = { hip: [hx, hy], t: -2, th: 86, sh: 0, ank: null };
      var A = { hip: [hx, hy], t: -2, th: 86, sh: 0, ft: 62, ank: [hx + 38, hy + 38 + 0], kb: 1, ua: 20, fa: 80 }, Bq = X(A, { ank: [hx + 38, hy + 38 - 10], ft: 40 });
      return { A: X(A, {}), B: Bq, eq: seatEq(hx, hy, false).concat([{ k: 'rect', x: hx + 22, y: hy - 14, w: 34, h: 9, r: 3, c: 'pad' }]), hl: [['sh', .35, -8, 11, 6]] };
    }
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : [];
    return { A: { stand: 1, lift: 0, ua: 2, fa: 2 }, B: { stand: 1, lift: 15, ua: 2, fa: 2 }, eq: [{ k: 'rect', x: 120, y: FY - 6, w: 56, h: 6, r: 2, c: 'pad', back: 1 }].concat(eq), hl: [['sh', .35, -8, 11, 6]] };
  };
  B.crunch = function (o) {
    var legs = { hip: [176, 164], ank: [212, FY - 6], kb: 1, ft: 70 };
    var Bp = X(legs, { t: o.full ? -14 : -58, hh: [-5, -2], hd: -10, eb: 1 });
    var Ap = X(legs, { t: -90, hh: [-5, -2], hd: -8, eb: 1 });
    return { A: Ap, B: Bp, eq: [{ k: 'rect', x: 40, y: FY - 4, w: 220, h: 4, r: 2, c: 'pad', back: 1 }], hl: [['to', .35, 10, 10, 7]] };
  };
  B.lyleg = function () {
    var b = { hip: [150, 166], t: -90, ua: 90, fa: 90, hd: -4 };
    return { A: X(b, { th: 86, sh: 88 }), B: X(b, { th: 168, sh: 172 }), eq: [{ k: 'rect', x: 40, y: FY - 4, w: 220, h: 4, r: 2, c: 'pad', back: 1 }], hl: [['to', .2, 10, 9, 7]] };
  };
  B.hangleg = function () {
    var base = { hip: [150, 128], t: 2, hand: [150, 26], eb: 1 };
    return { noFloor: 1, sc: .78, pv: [150, 26], A: X(base, { th: 4, sh: 4 }), B: X(base, { th: 88, sh: 92 }), eq: [{ k: 'line', a: [100, 26], b: [200, 26], w: 5, c: 'bar', back: 1 }, { k: 'line', a: [100, 26], b: [100, 0], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [200, 26], b: [200, 0], w: 4, c: 'cab', back: 1 }], hl: [['to', .2, 10, 9, 7]] };
  };
  B.cablecrunch = function () {
    var kn = { hip: [140, 140], ank: [100, FY - 5], kb: -1, toe: 1 };
    var eq = [{ k: 'rect', x: 250, y: 20, w: 26, h: 100, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [244, 24] }];
    return { A: X(kn, { t: 6, hh: [4, 4], eb: 1 }), B: X(kn, { t: 78, hh: [2, 10], eb: 1, hd: 10 }), eq: eq, hl: [['to', .3, 10, 10, 7]] };
  };
  B.plank = function () {
    function pose(d) { return { ank: [60, FY - 10], toe: 1, th: -80, sh: -80, t: 80, hd: 12, hand: [168, FY - 4], eb: -1, ft: 40 }; }
    var a = pose(), b = pose(); b.t = 79; b.th = -79; b.sh = -79;
    return { A: a, B: b, eq: [], hl: [['to', .3, 10, 10, 7]] };
  };
  B.pushdown = function () {
    var eq = [{ k: 'cable', at: 'hand', to: [182, 14] }, { k: 'rect', x: 250, y: 20, w: 26, h: 158, r: 3, c: 'pad', back: 1 }, { k: 'line', a: [182, 14], b: [250, 14], w: 3, c: 'bar', back: 1 }];
    return { A: { stand: 1, t: 0, ua: 4, fa: 112 }, B: { stand: 1, t: 0, ua: 4, fa: 4 }, eq: eq, hl: [['ua', .5, -6, 10, 6]] };
  };
  B.skull = function (o) {
    var legs = { hip: [200, 150], ank: [236, FY - 6], kb: 1, ft: 70, t: -90 };
    var eq = [{ k: 'rect', x: 106, y: 161, w: 136, h: 9, r: 4, c: 'pad', back: 1 }, { k: 'rect', x: 124, y: 170, w: 6, h: FY - 170, r: 1, c: 'bar', back: 1 }, { k: 'rect', x: 220, y: 170, w: 6, h: FY - 170, r: 1, c: 'bar', back: 1 }].concat(held(o.h === 'bar' ? 'bar' : 'db', 'hand'));
    if (o.h === 'bar') eq[eq.length - 1] = { k: 'plate', at: 'hand', r: 8 };
    return { A: X(legs, { ua: 180, fa: -48 }), B: X(legs, { ua: 180, fa: -180 }), eq: eq, hl: [['ua', .5, 6, 10, 6]] };
  };
  B.triExt = function (o) {
    var b = { stand: 1, t: 0, ua: 178 };
    return { A: X(b, { fa: -14 }), B: X(b, { fa: -180 }), eq: o.h === 'bar' ? [{ k: 'plate', at: 'hand', r: 8 }] : [{ k: 'db', at: 'hand', rot: 90 }], hl: [['ua', .5, -6, 12, 6]], sc: .82 };
  };
  B.uprow = function (o) {
    return { fv: 1, A: { ual: -6, fal: -4, uar: 6, far: 4 }, B: { ual: -100, fal: 56, uar: 100, far: -56 }, eq: [o.h === 'db' ? { k: 'dbF' } : { k: 'barF' }], hl: ['delt', 'trap'] };
  };
  B.kickback = function () {
    var base = { stand: 1, ax: 126, th: 22, sh: -14, t: 68, hd: -30, ua: -80 };
    return { A: X(base, { fa: 0 }), B: X(base, { fa: -80 }), eq: [{ k: 'db', at: 'hand', rot: 90 }], hl: [['ua', .5, -6, 11, 6]] };
  };
  B.dip = function () {
    var base = { t: 14, hd: -8, th: -8, sh: -44 };
    function p(sy, e) { return X(base, { hip: [138, sy + 48], hand: [158, 96], eb: -1, th: -6, sh: -40 }); }
    var eq = [{ k: 'line', a: [150, 96], b: [190, 96], w: 5, c: 'bar', back: 1 }, { k: 'line', a: [190, 96], b: [190, FY], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [150, 96], b: [150, FY], w: 4, c: 'cab', back: 1 }];
    return { A: p(46), B: p(70), eq: eq, hl: [['ua', .5, -6, 10, 6]] };
  };
  B.wristcurl = function (o) {
    var b = { hip: [100, 140], ank: [140, FY - 6], kb: 1, ft: 70, t: 38, hh: null, hs: [18, 40], eb: -1 };
    b.hs = [22, 38];
    var eq = seatEq(100, 140, false).concat([{ k: 'db', at: 'hand', rot: 0 }]);
    return { A: X(b, { hnd: 120 }), B: X(b, { hnd: 30 }), eq: eq, hl: [['fa', .5, 5, 9, 5]] };
  };
  B.jjack = function () {
    return { fv: 1, A: { thl: -3, thr: 3, shl: -3, shr: 3, ual: -6, fal: -4, uar: 6, far: 4 }, B: { thl: -22, thr: 22, shl: -22, shr: 22, ual: -158, fal: -170, uar: 158, far: 170 }, eq: [], hl: [], sc: .84 };
  };
  B.run = function () {
    function p(a) {
      return { hip: [150, 106], t: 8, th: a, sh: a - 50 + (a > 0 ? 0 : 40), th2: -a, sh2: -a - 50 + (a < 0 ? 0 : 40), ua: -a * 1.2 + 10, fa: -a * 1.2 + 90, ft: 60, ft2: 60, hd: -4 };
    }
    return { A: p(48), B: p(-48), eq: [], hl: [] };
  };

  /* ---- added templates ---- */
  function benchEq() { return [{ k: 'rect', x: 106, y: 161, w: 136, h: 9, r: 4, c: 'pad', back: 1 }, { k: 'rect', x: 124, y: 170, w: 6, h: FY - 170, r: 1, c: 'bar', back: 1 }, { k: 'rect', x: 220, y: 170, w: 6, h: FY - 170, r: 1, c: 'bar', back: 1 }]; }
  B.revfly = function (o) {
    var eq = o.h === 'cable' ? [{ k: 'cableF', l: [40, 150], r: [260, 150] }] : o.h === 'machine' ? [] : [{ k: 'dbF' }];
    return { fv: 1, A: { ual: -14, fal: -30, uar: 14, far: 30, hd: 0 }, B: { ual: -88, fal: -96, uar: 88, far: 96 }, eq: eq, hl: ['delt', 'trap'] };
  };
  B.facepull = function () {
    var eq = [{ k: 'rect', x: 252, y: 20, w: 24, h: 158, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [252, 58] }];
    return { A: { stand: 1, ax: 130, t: -4, hs: [50, 2], eb: 1 }, B: { stand: 1, ax: 130, t: -4, hs: [12, -22], eb: 1 }, eq: eq, hl: [['ua', .2, -5, 9, 7]] };
  };
  B.hyperext = function () {
    var eq = [{ k: 'line', a: [146, 128], b: [96, 170], w: 9, c: 'pad', back: 1 }, { k: 'rect', x: 80, y: 162, w: 16, h: 10, r: 4, c: 'pad', back: 1 }, { k: 'line', a: [118, 150], b: [118, FY], w: 4, c: 'bar', back: 1 }];
    var b = { hip: [146, 118], ank: [84, 158], kb: -1, ft: 150, hs: [10, 12], eb: 1 };
    return { A: X(b, { t: 168, hd: -20 }), B: X(b, { t: 52, hd: -6 }), eq: eq, hl: [['to', .15, -10, 10, 7], ['hip', 0, -4, 9, 9]] };
  };
  B.benchdip = function () {
    var b = { ank: [228, FY - 6], kb: 1, ft: 70, t: 4, hd: -4, hand: [112, 134], eb: 1 };
    var eq = [{ k: 'rect', x: 72, y: 134, w: 56, h: 9, r: 3, c: 'pad', back: 1 }, { k: 'rect', x: 96, y: 143, w: 6, h: FY - 143, r: 1, c: 'bar', back: 1 }];
    return { A: X(b, { hip: [124, 120] }), B: X(b, { hip: [126, 146] }), eq: eq, hl: [['ua', .5, 6, 10, 6]] };
  };
  B.sidebend = function () {
    return { fv: 1, A: { t: -22, ual: -2, fal: -2, uar: 0, far: 0 }, B: { t: 20, ual: -2, fal: -2, uar: 0, far: 0 }, eq: [{ k: 'dbL' }], hl: [] };
  };
  B.twist = function (o) {
    var b = { hy: 158, fl: .45, thl: -40, thr: 40, shl: 10, shr: -10, t: 0 };
    var eq = o.h === 'ball' ? [{ k: 'plateMid', r: 9 }] : [{ k: 'plateMid', r: 7 }];
    return { fv: 1, sc: .95, A: X(b, { hdl: [112, 138], hdr: [132, 138], t: -6 }), B: X(b, { hdl: [168, 138], hdr: [188, 138], t: 6 }), eq: eq, hl: [] };
  };
  B.swing = function (o) {
    var eq = o.h === 'cable' ? [{ k: 'cable', at: 'hand', to: [40, 172] }, { k: 'rect', x: 18, y: 150, w: 22, h: 28, r: 3, c: 'pad', back: 1 }] : [{ k: 'kb', at: 'hand' }];
    return { A: { stand: 1, ax: 150, th: 30, sh: -12, t: 72, hd: -40, hs: [-12, 54], eb: -1 }, B: { stand: 1, ax: 150, th: 2, sh: 0, t: -2, hd: 0, hs: null, ua: o.h === 'cable' ? 8 : 92, fa: o.h === 'cable' ? 8 : 92 }, eq: eq, hl: [['hip', 0, -4, 9, 9], ['th', .5, -9, 12, 7]] };
  };
  B.pullover = function (o) {
    var legs = { hip: [205, 150], ank: [236, FY - 6], kb: 1, ft: 70, t: -90 };
    return { A: X(legs, { ua: 186, fa: 190 }), B: X(legs, { ua: 262, fa: 266 }), eq: benchEq().concat(o.h === 'bar' ? [{ k: 'plate', at: 'hand', r: 8 }] : [{ k: 'db', at: 'hand', rot: 0 }]), hl: [['to', .8, 12, 11, 7], ['ua', .3, 5, 9, 6]] };
  };
  B.stepup = function (o) {
    var box = [{ k: 'rect', x: 152, y: FY - 32, w: 64, h: 32, r: 3, c: 'pad', back: 1 }];
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : [];
    var A = { hip: [138, 116], ank: [178, FY - 38], kb: 1, ft: 70, ank2: [124, FY - 6], kb2: 1, toe2: 1, t: 10, ua: 2, fa: 2 };
    var Bq = { hip: [176, 82], ank: [182, FY - 38], kb: 1, ft: 70, ank2: null, toe2: 0, t: 2, th2: 70, sh2: -10, ua: 2, fa: 2 };
    if (o.knee) Bq.th2 = 96;
    return { A: A, B: Bq, eq: box.concat(eq), hl: [['th', .5, 9, 14, 8], ['hip', 0, -4, 9, 9]], sc: .95 };
  };
  B.invrow = function () {
    var eq = [{ k: 'line', a: [100, 96], b: [140, 96], w: 5, c: 'bar', back: 1 }, { k: 'line', a: [104, 96], b: [104, FY], w: 4, c: 'cab', back: 1 }];
    var b = { ank: [246, FY - 8], kb: 1, ft: 50, hand: [118, 98], eb: -1, hd: -16 };
    return { A: X(b, { hip: [180, 156], t: -76 }), B: X(b, { hip: [176, 130], t: -78 }), eq: eq, hl: [['to', .66, -11, 11, 7]] };
  };
  B.abduct = function (o) {
    var b = { hy: 120, fl: .5, ual: -12, fal: -8, uar: 12, far: 8 };
    var seat = [{ k: 'rect', x: 110, y: 124, w: 80, h: 9, r: 3, c: 'pad', back: 1 }, { k: 'rect', x: 146, y: 133, w: 8, h: 45, r: 1, c: 'bar', back: 1 }, { k: 'rect', x: 116, y: 50, w: 68, h: 70, r: 6, c: 'pad', back: 1 }];
    var narrow = { thl: -8, thr: 8, shl: -2, shr: 2 }, wide = { thl: -48, thr: 48, shl: -20, shr: 20 };
    return { fv: 1, A: X(b, o.add ? wide : narrow), B: X(b, o.add ? narrow : wide), eq: seat, hl: [] };
  };
  B.clean = function (o) {
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : o.h === 'kb' ? [{ k: 'kb', at: 'hand' }] : [{ k: 'plate', at: 'hand', r: 11 }];
    return { A: { stand: 1, ax: 140, th: 40, sh: -16, t: 46, hd: -24, hs: [8, 52], eb: -1 }, B: { stand: 1, ax: 140, th: 18, sh: -8, t: 4, hs: [14, -2], eb: 1 }, eq: eq, hl: [['hip', 0, -3, 9, 9], ['to', 1, 0, 9, 9]] };
  };
  B.thruster = function (o) {
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : o.h === 'kb' ? [{ k: 'kb', at: 'hand' }] : [{ k: 'plate', at: 'hand', r: 9 }];
    return { sc: .82, A: { stand: 1, ax: 150, th: 84, sh: -34, t: 30, hs: [14, -2], eb: 1 }, B: { stand: 1, ax: 150, th: 2, sh: 0, t: 0, hs: null, ua: 172, fa: 178 }, eq: eq, hl: [['th', .5, 9, 14, 8], ['to', 1, 0, 9, 9]] };
  };
  B.rollout = function () {
    var b = { ank: [76, FY - 6], kb: -1, toe: 1, ft: 160, hd: 8, eb: 1 };
    return { A: X(b, { hip: [110, 136], t: 46, hand: [150, FY - 9] }), B: X(b, { hip: [130, 150], t: 76, hand: [218, FY - 9] }), eq: [{ k: 'ball', at: 'hand' }], hl: [['to', .35, 10, 10, 7]] };
  };
  B.pallof = function () {
    var eq = [{ k: 'rect', x: 252, y: 60, w: 24, h: 118, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [252, 96] }];
    return { A: { stand: 1, ax: 130, t: 0, hs: [12, 22], eb: 1 }, B: { stand: 1, ax: 130, t: 0, hs: [50, 20], eb: 1 }, eq: eq, hl: [['to', .35, 10, 10, 7]] };
  };
  B.cableTri = function () {
    var eq = [{ k: 'rect', x: 20, y: 120, w: 24, h: 58, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [44, 170] }];
    return { sc: .82, A: { stand: 1, ax: 160, t: 8, ua: 170, fa: -20 }, B: { stand: 1, ax: 160, t: 8, ua: 170, fa: 168 }, eq: eq, hl: [['ua', .5, -6, 12, 6]] };
  };

  /* ---------- picking a template for an exercise ---------- */
  function hold(n) { if (/dumbbell|db /.test(n)) return 'db'; if (/barbell|\bez\b|bar\b|\bolympic\b|smith|axle|trap bar/.test(n)) return 'bar'; if (/cable|rope|pulley|band/.test(n)) return 'cable'; if (/kettlebell/.test(n)) return 'kb'; return 'none'; }
  function pick0(ex) {
    var n = ex.n.toLowerCase(), c = ex.c, h = hold(n);
    function T(re) { return re.test(n); }
    if (c === 'stretching' || T(/smr\b|stretch/)) return null;
    if (T(/jumping jack|star jump/)) return ['jjack', {}];
    if (T(/^(running|jogging|trail running|walking)/) && T(/running|jogging|walking/)) return ['run', {}];
    if (c === 'plyometrics' || c === 'strongman' || c === 'cardio') return null;
    if (T(/hanging/) && T(/raise|pike|tuck|leg/)) return ['hangleg', {}];
    if (T(/knee\/hip raise on parallel/)) return ['hangleg', {}];
    if (T(/^(flat bench lying leg raise|leg raise|flutter|leg lift|bottoms up|reverse crunch|leg pull-in|decline reverse crunch|suspended reverse crunch|cable reverse crunch)/) || T(/lying leg raise/)) return ['lyleg', {}];
    if (T(/cable crunch|ab crunch machine/) && !T(/russian|twist|oblique|bosu|side|triceps|alternating/)) return ['cablecrunch', {}];
    if (T(/crunch|sit-?up|v-up|jackknife/) && !T(/russian|twist|oblique|bicycle|side|wheel|machine|cable|alternating|cross|reverse|rope|gorilla|frog|janda|press sit|seated|elbow|jackknife sit/)) return ['crunch', { full: T(/sit-?up/) }];
    if (T(/^plank$|^front plank|^elbow plank/)) return ['plank', {}];
    if (T(/push-?ups?|pushups?/) && !T(/plyo|depth|clap|handstand|spiderman|dive|medicine|ball|rotation|clock|chest push|side plank|bosu|isometric|to side|kettlebell|off of a dumbbell|feet on/)) return ['pushup', {}];
    if (T(/pull-?ups?\b|pullups|chin-?ups?\b|^chins?\b|sternum chins|mixed grip chin/) && !T(/assist|band|machine|towel|one arm|archer|side|kipping|l-pull|sit|ring|to chin|muscle|scapular|rocky|neck/)) return ['pullup', {}];
    if (T(/pull-?down|pulldown|lat pull/) && !T(/shoulders|tricep|pushdown|dumbbell|delt|raise|pullover|behind the neck|straight-arm|one arm/)) return ['pulldown', {}];
    if (T(/straight-arm pulldown|one arm lat pulldown/)) return ['pulldown', {}];
    if (T(/upright (barbell |cable )?row|upright row/) && !T(/band|one-arm|smith machine one/)) return ['uprow', { h: T(/dumbbell/) ? 'db' : 'bar' }];
    if (T(/\brows?\b/) && !T(/upright|inverted|suspended|bodyweight|stationary|renegade|rowing|band|lying|sled|shotgun|bench mid|rear delt|high row/)) {
      if (T(/seated|cable|machine|low pulley|lever|leverage|pulley|iso/) && !T(/smith/)) return ['rowSeated', {}];
      return ['bentRow', { h: T(/dumbbell|one-arm|one arm|kettlebell/) ? 'db' : 'bar' }];
    }
    if (T(/shrug/)) return ['shrug', { h: T(/dumbbell/) ? 'db' : 'bar' }];
    if (T(/lateral raise|side lateral|side raise/) && !T(/front|bent|reverse|rear|incline|lying|band|to front/)) return ['lat', { h: T(/cable/) ? 'cable' : 'db' }];
    if (T(/front (dumbbell|cable|plate|raise)|^front raise|alternate front|front two-dumbbell/) && T(/raise/) && !T(/pullover|lateral|delt raise above|over head|incline/)) return ['fraise', { h: h === 'none' ? 'bar' : h }];
    if (T(/fl(y|ye|yes)\b|crossover|pec deck|butterfly|peck deck/) && !T(/reverse|rear|bent|band|stretch|bodyweight|twist/)) return ['fly', { h: T(/cable|crossover|machine|pec|butterfly|peck/) ? 'cable' : 'db' }];
    if (T(/machine shoulder|leverage shoulder|smith machine overhead|shoulder press - machine/)) return ['ohp', { h: 'bar', seated: true }];
    if ((T(/(overhead|shoulder|military|arnold|push) press|^arnold|seated dumbbell press|standing (alternating )?(palm.?s?.in )?(one-arm )?dumbbell press|standing palm(?!.*wrist)|clean and press|seated barbell military|press behind/)) && !T(/tricep|bench|incline|decline|floor|chest|leg|jerk|snatch|band|log|stone|sled|smith machine bench|cuban|bradford|neck press/)) return ['ohp', { h: T(/dumbbell|arnold|kettlebell/) ? 'db' : 'bar', seated: T(/seated|arnold|dumbbell/) }];
    if (T(/kettlebell.*(military press|seated press|arnold press|push press)/) && !T(/jerk|side|para|seesaw|see-saw|clean/)) return ['ohp', { h: 'kb', seated: false }];
    if (T(/bench press|bench dumbbell|floor press|dumbbell press|chest press|machine bench/) && !T(/row|curl|fly|flye|push|skull|tricep|pullover|leg-over|bench pull|shrug|raise|lateral|dip|extension|kick|stretch|neck|crunch|sit-up|hip|reverse grip|standing|arnold|band|chain|guillotine|jerk|alternating floor/)) {
      if (T(/leverage|machine bench|cable chest|chest press$/) && !T(/smith/)) return ['chestMachine', {}];
      return ['bench', { inc: T(/incline/) ? 30 : 0, h: T(/dumbbell|db|kettlebell/) ? 'db' : 'bar' }];
    }
    if (T(/^(alternating |one arm |one-arm |extended range one-arm kettlebell )?floor press|leg-over floor/) && !T(/chain/)) return ['bench', { inc: 0, h: T(/dumbbell|kettlebell/) ? 'db' : 'bar' }];
    if (T(/pull-?over|face pull|hyperext|back extension|reverse hyper/)) return null;
    if (T(/kickback/) && T(/tricep/)) return ['kickback', { h: 'db' }];
    if (T(/split squat|lunge|step-?ups?|step up/) && !T(/stretch|jump|leap|crossover|knee tuck|suspended|overhead|bosu|wall|pass through|sprint|turkish|elevated back|knee raise|side split/)) return ['lunge', { h: T(/dumbbell/) ? 'db' : T(/barbell/) ? 'bar' : 'none' }];
    if (T(/hack squat/)) return ['squat', { v: 'hack' }];
    if (T(/squat/) && !T(/jump|hop|leap|sprint|sissy|pistol|single|one-leg|one leg|bosu|suspended|wall|split|thruster|isometric|stability|ball|pulse|step|band|kettlebell swing|jerk|kneeling|lying|plate mover|jefferson|frankenstein|zercher|turkish|overhead|chain|reverse|freehand|pass/)) {
      var v = T(/goblet/) ? 'goblet' : T(/front/) ? 'front' : T(/smith/) ? 'smith' : T(/dumbbell|kettlebell/) ? 'db' : T(/body|air|chair|weighted squat|sit squat/) ? 'none' : 'back';
      return ['squat', { v: v }];
    }
    if (T(/good morning/) && !T(/band|hanging|seated|pins/)) return ['rdl', { gm: 1, h: 'bar' }];
    if (T(/romanian|stiff|rdl|rack pull/) && !T(/band|chain/)) return ['rdl', { h: T(/dumbbell/) ? 'db' : 'bar' }];
    if (T(/deadlift/) && !T(/rickshaw|axle|car |jefferson|snatch|clean|band|suspended|kettlebell|one-arm|cable|one-legged|single|reverse|chain/)) return ['deadlift', {}];
    if (T(/hip thrust|glute bridge|butt lift|bent-knee hip raise/) && !T(/single|physioball|ball|band|smith/)) return ['hipthrust', { floor: T(/glute bridge|bridge|bent-knee|butt lift/) && !T(/barbell hip thrust/), h: T(/barbell/) ? 'bar' : 'none' }];
    if (T(/leg press/) && !T(/calf|smith/)) return ['legpress', {}];
    if (T(/leg extension/)) return ['legext', {}];
    if (T(/leg curl|hamstring curl/) && !T(/ball|band|slide/)) return ['legcurl', {}];
    if (T(/calf raise|calf press|toe press|seated calf/) && !T(/band|reverse|smith/)) return ['calf', { seated: T(/seated/), h: T(/dumbbell/) ? 'db' : 'none' }];
    if (T(/wrist curl|finger curl/) && !T(/behind/)) return ['wristcurl', {}];
    if (T(/curl/) && !T(/leg|hamstring|wrist|nordic|ball|glute.?ham|lower back|neck|band|tricep|reverse plate|twist|crunch|knee|ab /)) return ['curl', { h: T(/dumbbell|hammer|concentration|zottman|spider|drag|machine/) ? 'db' : T(/cable|rope|pulley/) ? 'cable' : T(/barbell|ez|bar curl|e-z|bar$|preacher curl/) ? 'bar' : 'db', hammer: T(/hammer/) }];
    if (T(/push-?down|press-?down|pushdown/) && !T(/shoulder/)) return ['pushdown', {}];
    if (T(/skull|lying.*(tricep|extension)|french press|incline.*tricep|decline.*tricep/) && !T(/cable|band/)) return ['skull', { h: T(/dumbbell/) ? 'db' : 'bar' }];
    if (T(/tricep/) && T(/extension|press/) && !T(/machine|band|kickback|towel|speed|chain|lying|body|reverse|sled|bent-over|bench|cable|close/)) return ['triExt', { h: T(/barbell|ez/) && !T(/dumbbell/) ? 'bar' : 'db' }];
    if (T(/\bdips?\b/) && !T(/bench|between|assist|jerk|weighted bench/) ) return ['dip', {}];
    return null;
  }

  function pick1(ex) {
    var n = ex.n.toLowerCase(), c = ex.c, h = hold(n);
    function T(re) { return re.test(n); }
    if (c === 'stretching' || T(/smr\b|stretch/)) return null;
    if (T(/face pull/)) return ['facepull', {}];
    if (T(/reverse fly|reverse flye|rear delt (fly|raise|row)|rear lateral|bent over.*rear delt|bent-over rear delt|back flyes|rear delt fly|reverse machine fly|bent over low-pulley side lateral|sled reverse fl|seated bent-over rear/)) return ['revfly', { h: T(/cable|pulley|band|sled/) ? 'cable' : T(/machine/) ? 'machine' : 'db' }];
    if (T(/band pull apart/)) return ['revfly', { h: 'machine' }];
    if (T(/hyperextension|back extension|glute ham raise|glute-ham raise/) && !T(/reverse/)) return ['hyperext', {}];
    if (T(/bench dips?|weighted bench dip|body tricep press/)) return ['benchdip', {}];
    if (T(/side bend/)) return ['sidebend', {}];
    if (T(/russian twist|seated barbell twist|plate twist/)) return ['twist', { h: T(/ball/) ? 'ball' : 'none' }];
    if (T(/kettlebell swing|one-arm kettlebell swings|^pull through|kettlebell pass between/)) return ['swing', { h: T(/pull through/) ? 'cable' : 'kb' }];
    if (T(/pullover|pull-over/) && !T(/front raise and/)) return ['pullover', { h: T(/barbell/) ? 'bar' : 'db' }];
    if (T(/step-?ups?|step up/) && !T(/jump|leap|bench jump/)) return ['stepup', { h: T(/dumbbell/) ? 'db' : 'none', knee: T(/knee/) }];
    if (T(/inverted row|suspended row|bodyweight mid row/)) return ['invrow', {}];
    if (T(/thigh abductor|hip abduction|abductor/)) return ['abduct', {}];
    if (T(/thigh adductor|hip adduction|adductor/)) return ['abduct', { add: 1 }];
    if (T(/thruster/)) return ['thruster', { h: T(/dumbbell/) ? 'db' : T(/kettlebell/) ? 'kb' : 'bar' }];
    if (T(/\bclean\b|clean from/) && !T(/jerk|press|clean and|sled|log|stone|keg|sandbag|deadlift|pull|shrug|squat/)) return ['clean', { h: T(/dumbbell/) ? 'db' : T(/kettlebell/) ? 'kb' : 'bar' }];
    if (T(/snatch pull/)) return ['deadlift', {}];
    if (T(/ab roller|rollout|ab wheel|suspended fallout/)) return ['rollout', {}];
    if (T(/pallof/)) return ['pallof', {}];
    if (T(/cable lying triceps/)) return ['skull', { h: 'bar' }];
    if (T(/(rope|cable|low cable|kneeling cable|speed band|cable incline).*(overhead )?tricep.*extension|cable rope overhead triceps|cable one arm tricep extension|low cable triceps extension|standing towel triceps/)) return ['cableTri', {}];
    if (T(/(seated|standing) bent-over (one|two)-arm dumbbell triceps extension/)) return ['kickback', { h: 'db' }];
    if (T(/jm press|tate press/)) return ['skull', { h: T(/tate/) ? 'db' : 'bar' }];
    if (T(/oblique crunch|cross-body crunch|decline oblique|elbow to knee/)) return ['crunch', {}];
    if (T(/^(cable seated crunch|rope crunch|standing rope crunch)/)) return ['cablecrunch', {}];
    if (T(/single leg glute bridge|physioball hip bridge|smith machine hip raise|butt-ups|hip lift/)) return ['hipthrust', { floor: 1, h: 'none' }];
    if (T(/kettlebell one-legged deadlift|one-arm side deadlift/)) return ['rdl', { h: 'db' }];
    if (T(/weighted pull ?ups?|side to side chins|band assisted pull-up/)) return ['pullup', {}];
    if (T(/smith machine calf raise|smith machine reverse calf/)) return ['calf', { h: 'none' }];
    if (T(/incline dumbbell bench with palms|decline smith press|smith machine decline press|pin presses|board press|close-grip ez-bar press|reverse triceps bench press/)) return ['bench', { inc: T(/incline/) ? 30 : 0, h: T(/dumbbell/) ? 'db' : 'bar' }];
    if (T(/zercher|one leg barbell squat/) && !T(/jump/)) return ['squat', { v: T(/zercher/) ? 'front' : 'back' }];
    if (T(/jump squat/)) return ['squat', { v: 'none' }];
    if (T(/standing cable chest press/)) return ['chestMachine', {}];
    if (T(/standing front barbell raise over head|front raise and pullover|straight-arm front delt raise above|single dumbbell raise|dumbbell raise$|front incline dumbbell raise|side laterals to front raise/)) return ['fraise', { h: h === 'none' ? 'db' : h }];
    if (T(/one-arm incline lateral|lying one-arm lateral|alternating deltoid raise|dumbbell scaption|low-pulley deltoid raise/)) return ['lat', { h: T(/pulley|cable/) ? 'cable' : 'db' }];
    if (T(/one-arm upright row|leverage high row|incline bench pull|lying t-bar row|lying cambered|straight bar bench mid row|shotgun row|alternating renegade row|sled row/)) return ['bentRow', { h: T(/barbell|t-bar|cambered|straight bar/) ? 'bar' : 'db' }];
    if (T(/wide-grip pulldown behind the neck/)) return ['pulldown', {}];
    if (T(/wrist roller|reverse plate curls|plate pinch|wrist rotations/)) return ['wristcurl', {}];
    if (T(/alternating kettlebell press|double kettlebell jerk|kettlebell seesaw|one-arm kettlebell para|see-saw press|kettlebell thruster/)) return ['ohp', { h: 'kb', seated: false }];
    return null;
  }
  function pick(ex) {
    var r = pick1(ex) || pick0(ex);
    if (!r && /band|chain/i.test(ex.n)) {
      var m = ex.n.replace(/\s*-\s*with bands?/i, '').replace(/\s*with (bands?|chains)/i, '').replace(/^reverse band /i, '').replace(/\bband(ed)? /i, '').replace(/ with band$/i, '');
      if (m !== ex.n) { var e2 = { n: m, c: ex.c }; r = pick1(e2) || pick0(e2); }
    }
    return r;
  }

  /* ---------- registry: one cached template per (template, options) ---------- */
  var cache = {}, syms = {}, uid = 0;
  function key(p) { return p[0] + ':' + JSON.stringify(p[1]); }
  function tpl(p) {
    var id = key(p);
    if (!cache[id]) { var t = B[p[0]](p[1]); t.id = 'fg' + (uid++); cache[id] = t; }
    return cache[id];
  }
  var memo = {};
  function forEx(ex) {
    if (!(ex.n in memo)) { var p = null; try { p = pick(ex); } catch (e) { p = null; } memo[ex.n] = p && B[p[0]] ? tpl(p) : null; }
    return memo[ex.n];
  }
  function svgDoc(T, k, cls) { return '<svg class="' + (cls || 'fig') + '" viewBox="0 0 300 200" role="img" aria-hidden="true">' + frame(T, k) + '</svg>'; }
  function thumb(T) {
    var host = document.getElementById('fig-defs');
    if (host && !syms[T.id]) { syms[T.id] = 1; host.insertAdjacentHTML('beforeend', '<symbol id="' + T.id + '" viewBox="0 0 300 200">' + frame(T, 0.85) + '</symbol>'); }
    return '<svg class="fig" viewBox="0 0 300 200" aria-hidden="true"><use href="#' + T.id + '"/></svg>';
  }
  /* live animation: updates one <svg> until it leaves the page */
  function cycle(ms) {
    var p = ms % 3000;
    if (p < 1200) return ease(p / 1200);
    if (p < 1500) return 1;
    if (p < 2700) return 1 - ease((p - 1500) / 1200);
    return 0;
  }
  function live(svg, T) {
    var still = false;
    try { still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
    var t0 = Date.now();
    function nextFrame(fn) { if (window.requestAnimationFrame) window.requestAnimationFrame(fn); else setTimeout(fn, 33); }
    function step() {
      if (!document.body.contains(svg)) return;
      if (still) { svg.innerHTML = frame(T, Math.floor((Date.now() - t0) / 1300) % 2); setTimeout(step, 1300); return; }
      svg.innerHTML = frame(T, cycle(Date.now() - t0));
      nextFrame(step);
    }
    step();
  }
  return { forEx: forEx, svgDoc: svgDoc, thumb: thumb, live: live, frame: frame, pick: pick, tpl: tpl, B: B, FY: FY };
})();
