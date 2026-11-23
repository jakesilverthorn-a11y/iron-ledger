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
    if (a === 'trap') { var tu = J.u || [0, -1]; return [J.sho[0] + tu[1] * 6.5 + tu[0] * 1.5, J.sho[1] - tu[0] * 6.5 + tu[1] * 1.5]; }
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
      case 'barTo': return ln(p, it.to, 4, 'bar') + circ(lerp(p, it.to, .12), 8, 'plate');
      case 'roller': return circ(p, it.r || 6, 'pad');
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
    var hl2 = (h[3] || 8) * 1.15, hw = Math.min((h[4] || 8) * .62, 6.8);
    return musc(pt(c, d, -hl2), pt(c, d, hl2), 1, 1, hw, hw, 'hl', .5);
  }
  /* ---- anatomy-illustration style: tapered, shaded muscle shapes instead of sticks ---- */
  function P2(p) { return f1(p[0]) + ' ' + f1(p[1]); }
  // a limb segment from a (half-width ra) to b (half-width rb), bulging to m1 / m2 at bp along its length
  function musc(a, b, ra, rb, m1, m2, cls, bp) {
    bp = bp === undefined ? .45 : bp;
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1, d = [dx / l, dy / l], n = [-d[1], d[0]];
    var c1 = 2 * m1 - (ra + rb) / 2, c2 = 2 * m2 - (ra + rb) / 2, m = lerp(a, b, bp);
    return '<path class="' + cls + '" d="M' + P2(pt(a, n, ra)) + 'Q' + P2(pt(m, n, c1)) + ' ' + P2(pt(b, n, rb)) +
      'Q' + P2(pt(b, d, rb * 1.35)) + ' ' + P2(pt(b, n, -rb)) + 'Q' + P2(pt(m, n, -c2)) + ' ' + P2(pt(a, n, -ra)) +
      'Q' + P2(pt(a, d, -ra * 1.35)) + ' ' + P2(pt(a, n, ra)) + 'Z"/>';
  }
  function crease(a, b, k0, k1, off) {   // a muscle-definition line along a segment
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1, n = [-dy / l, dx / l];
    var p = pt(lerp(a, b, k0), n, off), q = pt(lerp(a, b, k1), n, off * .6), c = pt(lerp(a, b, (k0 + k1) / 2), n, off * 1.25);
    return '<path class="mdef" d="M' + P2(p) + 'Q' + P2(c) + ' ' + P2(q) + '"/>';
  }
  function thigh(h, k, cls) { return musc(h, k, 10.2, 6.2, 11, 9.6, cls, .36) + crease(h, k, .22, .82, -2); }
  function shin(k, a, cls) { return musc(k, a, 6.2, 3.4, 8.2, 5.4, cls, .3); }   // calf bulges at the back
  function uarm(sh, e, cls) { return musc(sh, e, 8.4, 4.8, 7.4, 7.8, cls, .4) + crease(sh, e, .3, .85, .5); }
  function farm(e, w, cls) { return musc(e, w, 5, 3, 6.2, 5.2, cls, .28); }
  function foot(an, toe, cls) { return musc(an, toe, 3.6, 2.4, 3.4, 3, cls, .4); }
  function hand(w, h, cls) { return musc(w, h, 2.8, 2.6, 3.3, 3.3, cls, .55); }
  function torsoSide(hip, sho, cls) {   // chest in front, glutes behind; 'front' is the way the body faces
    var dx = sho[0] - hip[0], dy = sho[1] - hip[1], l = Math.sqrt(dx * dx + dy * dy) || 1, u = [dx / l, dy / l], f = [-u[1], u[0]];
    if (f[0] * 1 + 0 < 0 && Math.abs(f[0]) > .05) { }   // (kept facing right by the solver)
    function q(k, o) { return pt(pt(hip, u, l * k), f, o); }
    var F = [q(-.04, 8.6), q(.3, 10), q(.62, 13), q(.84, 13.6), q(1.04, 7)], Bk = [q(1.05, -9), q(.8, -12.6), q(.45, -10), q(.16, -13), q(-.09, -9.6)];
    var d = 'M' + P2(F[0]);
    for (var i = 1; i < F.length; i++) d += 'Q' + P2(F[i]) + ' ' + P2(lerp(F[i], F[i + 1] || Bk[0], .5));
    for (i = 0; i < Bk.length; i++) d += 'Q' + P2(Bk[i]) + ' ' + P2(lerp(Bk[i], Bk[i + 1] || F[0], .5));
    var abs = '<path class="mdef" d="M' + P2(q(.62, 9.6)) + 'Q' + P2(q(.66, 4)) + ' ' + P2(q(.6, 1)) + '"/>' +
      '<path class="mdef" d="M' + P2(q(.48, 8)) + 'L' + P2(q(.48, 5.4)) + 'M' + P2(q(.36, 7.8)) + 'L' + P2(q(.36, 5.2)) + '"/>';
    return '<path class="' + cls + '" d="' + d + 'Z"/>' + abs;
  }
  function shortsSide(hip, sho, kn) {
    var dx = sho[0] - hip[0], dy = sho[1] - hip[1], l = Math.sqrt(dx * dx + dy * dy) || 1, u = [dx / l, dy / l], f = [-u[1], u[0]];
    var g = musc(lerp(hip, sho, .22), hip, 10.8, 11.4, 11.6, 12.6, 'shorts', .5) + musc(pt(hip, u, -2), lerp(hip, kn, .48), 11.2, 8.6, 11.4, 10.6, 'shorts', .4);
    return g.replace(/class="shorts"/g, 'class="shortso"') + g;
  }
  function headSide(J) {
    var a = J.hdAng, n = [Math.cos(R(a)), Math.sin(R(a))], u = up(a), h = J.head;
    var jaw = pt(pt(h, n, 4.6), u, -6.2), neckB = pt(J.sho, u, 2);
    var neck = '';
    var skull = '<ellipse class="m" cx="' + f1(h[0]) + '" cy="' + f1(h[1]) + '" rx="9.6" ry="10.6" transform="rotate(' + f1(a) + ' ' + f1(h[0]) + ' ' + f1(h[1]) + ')"/>';
    var face = musc(pt(h, u, 2), jaw, 6.4, 3.4, 6.6, 5, 'm', .5);
    var hair = '<path class="hair" d="M' + P2(pt(pt(h, n, 6), u, 6.4)) + 'Q' + P2(pt(pt(h, n, 1), u, 12.6)) + ' ' + P2(pt(pt(h, n, -7), u, 7.2)) + 'Q' + P2(pt(pt(h, n, -10.6), u, 1)) + ' ' + P2(pt(pt(h, n, -7.4), u, -3)) + 'Q' + P2(pt(pt(h, n, -2), u, 4)) + ' ' + P2(pt(pt(h, n, 6), u, 6.4)) + 'Z"/>';
    var eye = circ(pt(pt(h, n, 6.6), u, 1.6), 1.15, 'eye'), ear = '<ellipse class="mdk" cx="' + f1(pt(h, n, -1.4)[0]) + '" cy="' + f1(pt(h, n, -1.4)[1]) + '" rx="1.8" ry="2.8" transform="rotate(' + f1(a) + ' ' + f1(pt(h, n, -1.4)[0]) + ' ' + f1(pt(h, n, -1.4)[1]) + ')"/>';
    return solid(face + skull) + hair + ear + eye;
  }
  function face(J) { return headSide(J); }
  function solid(str) {   // draw a group of body shapes as one figure: outlines first, then fills, so joints don't show seams
    var outl = str.replace(/<path class="mdef"[^>]*\/>/g, '').replace(/class="(m|mf)"/g, 'class="$1o"');
    return outl + str;
  }
  function drawSide(J, P, T) {
    var s = '', i;
    // far limbs (a shade darker, behind the body)
    s += solid(thigh(J.hip, J.kn2, 'mf') + shin(J.kn2, J.an2, 'mf') + foot(J.an2, J.toe2, 'mf'));
    s += solid(uarm(J.sho, J.el2, 'mf') + farm(J.el2, J.wr2, 'mf') + hand(J.wr2, pt(J.wr2, [J.wr2[0] - J.el2[0], J.wr2[1] - J.el2[1]].map(function (v, k, A) { return v / (Math.sqrt(A[0] * A[0] + A[1] * A[1]) || 1); }), 7), 'mf'));
    // torso, neck and near leg as one shape, then the shorts
    var a0 = J.hdAng, u0 = up(a0);
    s += solid(torsoSide(J.hip, J.sho, 'm') + musc(lerp(J.sho, J.head, .02), lerp(J.sho, J.head, .66), 6.4, 5, 6.2, 6, 'm', .5) + thigh(J.hip, J.kn, 'm') + shin(J.kn, J.an, 'm') + foot(J.an, J.toe, 'm'));
    s += shortsSide(J.hip, J.sho, J.kn);
    var eq = T.eq || [];
    for (i = 0; i < eq.length; i++) if (eq[i].back) s += eqDraw(J, eq[i], P);
    s += headSide(J);
    var hl = T.hl || [], hlLimb = '';
    for (i = 0; i < hl.length; i++) if (hl[i][0] !== 'ua' && hl[i][0] !== 'fa' && !(hl[i][0] === 'to' && hl[i][1] >= .85)) s += hlDraw(J, hl[i]); else hlLimb += hlDraw(J, hl[i]);
    // near arm on top, with its own highlights
    s += solid(musc(pt(J.sho, [J.el[0] - J.sho[0], J.el[1] - J.sho[1]].map(function (v) { return -v * .12; }), 0), lerp(J.sho, J.el, .55), 8.6, 6, 9.4, 9.4, 'm', .3) + uarm(J.sho, J.el, 'm') + farm(J.el, J.wr, 'm') + hand(J.wr, J.hand, 'm'));
    s += hlLimb;
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
    if (P.bend) { J.s = [hip[0], hip[1] - LEN.to * (1 - P.bend)]; }   // bent over, seen from the front: the back is foreshortened
    var raise = P.shr2 || 0;
    J.sl = [J.s[0] - 15, J.s[1] - raise]; J.sr = [J.s[0] + 15, J.s[1] - raise];
    J.hl = [hip[0] - 8, hip[1]]; J.hr = [hip[0] + 8, hip[1]];
    J.kl = pt(J.hl, dn(thl), LEN.th * fl); J.al = pt(J.kl, dn(shl), LEN.sh);
    J.kr = pt(J.hr, dn(thr), LEN.th * fl); J.ar = pt(J.kr, dn(shr), LEN.sh);
    var af = P.af === undefined ? 1 : P.af;   // arm pointing toward or away from the viewer looks shorter
    function arm(root, tg, ua, fa, side) {
      if (tg) { var r = ik(root, tg, LEN.ua * af, LEN.fa * af, side); return { e: r.j, w: r.e }; }
      var e = pt(root, dn(ua || 0), LEN.ua * af); return { e: e, w: pt(e, dn(fa || 0), LEN.fa * af) };
    }
    var al = arm(J.sl, P.hdl, P.ual, P.fal, P.ebl === undefined ? -1 : P.ebl), ar = arm(J.sr, P.hdr, P.uar, P.far, P.ebr === undefined ? 1 : P.ebr);
    J.el = al.e; J.wl = al.w; J.er = ar.e; J.wrr = ar.w;
    J.head = P.bend ? [J.s[0], J.s[1] + 4] : pt(J.s, up(t), LEN.hd); J.hdAng = t;
    return J;
  }
  function faceF(J) {
    var h = J.head;
    return musc([h[0], J.s[1] + 2], [h[0], h[1] + 6], 5.6, 4.8, 5.6, 5.6, 'm', .5) +
      '<ellipse class="m" cx="' + f1(h[0]) + '" cy="' + f1(h[1] + .5) + '" rx="9" ry="10.8"/>' +
      '<path class="hair" d="M' + f1(h[0] - 9.2) + ' ' + f1(h[1] - 1) + 'Q' + f1(h[0] - 9) + ' ' + f1(h[1] - 12) + ' ' + f1(h[0]) + ' ' + f1(h[1] - 11.4) + 'Q' + f1(h[0] + 9) + ' ' + f1(h[1] - 12) + ' ' + f1(h[0] + 9.2) + ' ' + f1(h[1] - 1) + 'Q' + f1(h[0] + 6) + ' ' + f1(h[1] - 6.4) + ' ' + f1(h[0]) + ' ' + f1(h[1] - 6.6) + 'Q' + f1(h[0] - 6) + ' ' + f1(h[1] - 6.4) + ' ' + f1(h[0] - 9.2) + ' ' + f1(h[1] - 1) + 'Z"/>' +
      circ([h[0] - 3.4, h[1] + 1], 1.1, 'eye') + circ([h[0] + 3.4, h[1] + 1], 1.1, 'eye') +
      '<path class="mdef" d="M' + f1(h[0] - 2.4) + ' ' + f1(h[1] + 6.4) + ' q2.4 1.2 4.8 0"/>';
  }
  function torsoFront(hip, s, bend) {
    var dx = s[0] - hip[0], dy = s[1] - hip[1], l = Math.sqrt(dx * dx + dy * dy) || 1, u = [dx / l, dy / l], r = [-u[1] * -1, u[0] * -1];
    r = [u[1] * -1 * -1, -u[0]];   // sideways (to the viewer's right)
    r = [-u[1], u[0]]; if (r[0] < 0) r = [-r[0], -r[1]];
    function q(k, o) { return pt(pt(hip, u, l * k), r, o); }
    var W = bend ? [17, 18, 23, 25, 24] : [17, 15.6, 20.5, 24, 21.5];
    var R1 = [q(-.05, W[0]), q(.34, W[1]), q(.7, W[2]), q(.93, W[3]), q(1.06, W[4] - 7)], L1 = R1.map(function (p, i) { var k = [-.05, .34, .7, .93, 1.06][i], o = [W[0], W[1], W[2], W[3], W[4] - 7][i]; return q(k, -o); }).reverse();
    var pts = R1.concat(L1), d = 'M' + P2(lerp(pts[pts.length - 1], pts[0], .5));
    for (var i = 0; i < pts.length; i++) d += 'Q' + P2(pts[i]) + ' ' + P2(lerp(pts[i], pts[(i + 1) % pts.length], .5));
    var out = '<path class="m" d="' + d + 'Z"/>';
    if (!bend) {
      out += '<path class="mdef" d="M' + P2(q(.62, -15)) + 'Q' + P2(q(.56, -6)) + ' ' + P2(q(.6, 0)) + 'Q' + P2(q(.56, 6)) + ' ' + P2(q(.62, 15)) + '"/>';
      out += '<path class="mdef" d="M' + P2(q(.55, 0)) + 'L' + P2(q(.12, 0)) + 'M' + P2(q(.44, -6)) + 'L' + P2(q(.44, 6)) + 'M' + P2(q(.32, -6)) + 'L' + P2(q(.32, 6)) + 'M' + P2(q(.2, -6)) + 'L' + P2(q(.2, 6)) + '"/>';
    }
    return out;
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
    return c.map(function (q) { return musc([q[0][0], q[0][1] - ry * .95], [q[0][0], q[0][1] + ry * .95], 1, 1, rx * .8, rx * .8, 'hl', .5); }).join('');
  }
  function shortsF(J) {   // one pair of shorts: waistband, crotch, two leg openings
    var w = lerp(J.hip, J.s, .2), up_ = [(J.s[0] - J.hip[0]), (J.s[1] - J.hip[1])], ul = Math.hypot(up_[0], up_[1]) || 1; up_ = [up_[0] / ul, up_[1] / ul];
    var r = [-up_[1], up_[0]]; if (r[0] < 0) r = [-r[0], -r[1]];
    var lo = lerp(J.hl, J.kl, .4), ro = lerp(J.hr, J.kr, .4);
    function side(p, q) { var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }
    var nl = side(J.hl, J.kl), nr = side(J.hr, J.kr); if (nl[0] > 0) nl = [-nl[0], -nl[1]]; if (nr[0] < 0) nr = [-nr[0], -nr[1]];
    var crotch = pt(J.hip, up_, -7);
    var pts = [pt(w, r, -15.6), pt(w, r, 15.6), pt(J.hr, r, 9.6), pt(ro, nr, 8.6), pt(ro, nr, -7.4), crotch, pt(lo, nl, -7.4), pt(lo, nl, 8.6), pt(J.hl, r, -9.6)];
    return '<path class="shorts" d="M' + pts.map(P2).join('L') + 'Z" stroke-linejoin="round"/>';
  }
  function drawFront(J, P, T) {
    var s = '', i, eq = T.eq || [];
    for (i = 0; i < eq.length; i++) if (eq[i].back) s += eqDrawF(J, eq[i]);
    function legF(h, k, a, side) { return thigh(h, k, 'm') + shin(k, a, 'm') + foot(a, [a[0] + side * 6, a[1] + 1], 'm'); }
    var bent = J.s[1] > J.hip[1] - LEN.to * .5;
    if (!bent) s += solid(faceF(J).replace(/<path class="hair"[\s\S]*$/, '')) + faceF(J).replace(/^[\s\S]*?(<path class="hair")/, '$1');
    s += solid(legF(J.hl, J.kl, J.al, -1) + legF(J.hr, J.kr, J.ar, 1) + torsoFront(J.hip, J.s, bent));
    s += shortsF(J);
    function armF(sh, e, w) { var hd = pt(w, [(w[0] - e[0]) / (Math.hypot(w[0] - e[0], w[1] - e[1]) || 1), (w[1] - e[1]) / (Math.hypot(w[0] - e[0], w[1] - e[1]) || 1)], 4.2); return solid(musc([sh[0], sh[1] - 2], lerp(sh, e, .5), 8.6, 6.4, 9.6, 9.6, 'm', .3) + uarm(sh, e, 'm') + farm(e, w, 'm') + hand(w, hd, 'm')); }
    s += armF(J.sl, J.el, J.wl) + armF(J.sr, J.er, J.wrr);
    if (bent) s += solid(faceF(J).replace(/<path class="hair"[\s\S]*$/, '')) + faceF(J).replace(/^[\s\S]*?(<path class="hair")/, '$1');   // bent over: the head sits in front of the back
    var hl = T.hl || [];
    for (i = 0; i < hl.length; i++) s += hlDrawF(J, hl[i]);
    for (i = 0; i < eq.length; i++) if (!eq[i].back) s += eqDrawF(J, eq[i]);
    return s;
  }

  /* ---------- a front view worked out from a side-view pose ----------
     Heights come straight from the side view; left and right are set by the body's width. Knees and elbows
     spread a little as they come forward, the way they do in a real squat or press. */
  function projF(J, P) {
    var cx = 150, F = {};
    function sp(a, b, l, base, add) { return base + add * Math.min(1, Math.abs(b[0] - a[0]) / l); }
    F.hip = [cx, J.hip[1]]; F.s = [cx, J.sho[1]]; F.head = [cx, J.head[1]]; F.hdAng = 0;
    F.sl = [cx - 15, J.sho[1]]; F.sr = [cx + 15, J.sho[1]];
    F.hl = [cx - 8, J.hip[1]]; F.hr = [cx + 8, J.hip[1]];
    var kx = sp(J.hip, J.kn, LEN.th, 9, 7), kx2 = sp(J.hip, J.kn2, LEN.th, 9, 7);
    F.kl = [cx - kx2, J.kn2[1]]; F.al = [cx - Math.max(9, kx2 - 2), J.an2[1]];
    F.kr = [cx + kx, J.kn[1]]; F.ar = [cx + Math.max(9, kx - 2), J.an[1]];
    var wx = 17 + (P.wide || 0), ex = Math.max(sp(J.sho, J.el, LEN.ua, 18, 5), wx + (P.wide ? 6 : 0));
    F.el = [cx - ex, J.el2[1] - 1]; F.er = [cx + ex, J.el[1]];
    F.wl = [cx - wx, J.wr2[1] - 1]; F.wrr = [cx + wx, J.wr[1]];
    return F;
  }
  function frontEq(T) {
    var out = [], A = T.A;
    (T.eq || []).forEach(function (it) {
      if (it.k === 'db' && (it.at === 'hand' || it.at === 'wr')) out.push({ k: 'dbF' });
      else if (it.k === 'plate' && (it.at === 'hand' || it.at === 'wr')) out.push({ k: 'barF' });
      else if (it.k === 'kb' || it.k === 'ball') out.push({ k: it.k === 'ball' ? 'plateMid' : 'plate', r: 7 });
    });
    if (A.hip && !A.stand) {   // seat (and backrest) seen from the front
      var hy = A.hip[1];
      if ((T.eq || []).some(function (it) { return it.k === 'padline' && (it.off || 15) > 0; })) out.unshift({ k: 'rect', x: 129, y: hy - 58, w: 42, h: 62, r: 5, c: 'pad', back: 1 });
      out.unshift({ k: 'rect', x: 128, y: hy + 8, w: 44, h: 9, r: 3, c: 'pad', back: 1 }, { k: 'rect', x: 147, y: hy + 17, w: 6, h: FY - hy - 17, r: 1, c: 'bar', back: 1 });
    }
    return out;
  }
  function hlDrawP(F, h) {
    var segs = { ua: [[F.sl, F.el], [F.sr, F.er]], fa: [[F.el, F.wl], [F.er, F.wrr]], th: [[F.hl, F.kl], [F.hr, F.kr]], sh: [[F.kl, F.al], [F.kr, F.ar]],
      to: [[[F.hip[0] - 7, F.hip[1]], [F.s[0] - 7, F.s[1]]], [[F.hip[0] + 7, F.hip[1]], [F.s[0] + 7, F.s[1]]]] }[h[0] === 'hip' ? 'to' : h[0]];
    if (!segs || h[0] === 'hip') return '';   // glutes can't be seen from the front
    return segs.map(function (sg) {
      var a = sg[0], b = sg[1], c = lerp(a, b, h[1]), l = Math.max(4, Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])));
      var dd = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], hh = Math.min(h[4] || 8, l * .45 + 3) * 1.1, ww = Math.min(h[3] || 8, 7) * .72;
      return musc(pt(c, dd, -hh), pt(c, dd, hh), 1, 1, ww, ww, 'hl', .5);
    }).join('');
  }
  function frontOK(T) {   // only for upright and seated moves: a lying body seen end-on tells you nothing
    if (T.fv || T.noFront || T.K || T.top) return false;
    function up_(P) { return Math.abs(P.t || 0) <= 50 && !P.floor; }
    if (!up_(T.A) || !up_(T.B)) return false;
    try { var J = solve(T.A); if (J.hip[1] > FY - 28) return false; } catch (e) { return false; }
    return true;
  }
  function frameFront(T, k) {
    var P = mix(T.A, T.B, ease(k)); if (T.wide === undefined) T.wide = (T.eq || []).some(function (it) { return it.k === 'plate' && (it.at === 'hand' || it.at === 'wr'); }) ? 12 : 0; P.wide = T.wide; var F = projF(solve(P), P), s = '',
      barSho = (T.eq || []).some(function (it) { return it.k === 'plate' && (it.at === 'sho' || it.at === 'trap'); });
    if (barSho) {   // bar across the shoulders: hands wide at shoulder height, elbows down
      F.wl = [F.sl[0] - 18, F.sl[1] - 3]; F.wrr = [F.sr[0] + 18, F.sr[1] - 3]; F.el = [F.sl[0] - 14, F.sl[1] + 14]; F.er = [F.sr[0] + 14, F.sr[1] + 14];
    }
    var eq = T.feq || (T.feq = frontEq(T)), i;
    s = drawFront(F, P, { eq: eq.filter(function (q) { return q.back; }), hl: [] });
    if (barSho) s += ln([F.s[0] - 52, F.s[1] - 4], [F.s[0] + 52, F.s[1] - 4], 3, 'bar') + rect(F.s[0] - 56, F.s[1] - 15, 6, 22, 2, 'plate') + rect(F.s[0] + 50, F.s[1] - 15, 6, 22, 2, 'plate');
    var hl = T.hl || []; for (i = 0; i < hl.length; i++) s += hlDrawP(F, hl[i]);
    for (i = 0; i < eq.length; i++) if (!eq[i].back) s += eqDrawF(F, eq[i]);   // weights in front of the highlight
    var sc = (T.sc || 1) * 1.06;
    return '<rect class="floor" x="0" y="' + FY + '" width="300" height="22"/><line class="floorl" x1="0" y1="' + FY + '" x2="300" y2="' + FY + '"/>' +
      '<g transform="translate(150 ' + FY + ') scale(' + f1(sc) + ') translate(-150 ' + (-FY) + ')">' + s + '</g>';
  }
  function keyPose(T, k) {   // a move with more than two key poses plays them in order
    if (!T.K) return mix(T.A, T.B, ease(k));
    var n = T.K.length - 1, x = Math.max(0, Math.min(n - 1e-6, k * n)), i = Math.floor(x);
    return mix(T.K[i], T.K[i + 1], ease(x - i));
  }
  var DEFS = '<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>' +
    '<linearGradient id="ilSk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".55" stop-color="#d3d3d3"/><stop offset="1" stop-color="#9c9c9c"/></linearGradient>' +
    '<linearGradient id="ilSkF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfcfcf"/><stop offset="1" stop-color="#8a8a8a"/></linearGradient>' +
    '<linearGradient id="ilHl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7a07a"/><stop offset=".5" stop-color="#e8613c"/><stop offset="1" stop-color="#b9361c"/></linearGradient>' +
    '<linearGradient id="ilSh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4a4a"/><stop offset="1" stop-color="#121212"/></linearGradient>' +
    '<linearGradient id="ilMet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f4f6"/><stop offset=".5" stop-color="#b7bcc2"/><stop offset="1" stop-color="#7d838a"/></linearGradient>' +
    '<radialGradient id="ilPl" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="#5b5b5b"/><stop offset=".6" stop-color="#262626"/><stop offset="1" stop-color="#0b0b0b"/></radialGradient>' +
    '<linearGradient id="ilPad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c4c4c"/><stop offset="1" stop-color="#141414"/></linearGradient>' +
    '</defs></svg>';
  function frame(T, k, view) {
    if (view === 'front') return frameFront(T, k);
    var P = keyPose(T, k), J, body;
    if (T.fv) { J = solveF(P); body = drawFront(J, P, T); } else { J = solve(P); body = drawSide(J, P, T); }
    if (T.top) {   // lying on a bench, seen from above: the front-view body turned on its side
      body = '<g transform="rotate(-90 150 100)">' + body + '</g>';
      return '<rect class="floor" x="0" y="0" width="300" height="200" opacity=".5"/>' + '<g transform="translate(150 100) scale(' + f1(T.sc || 1) + ') translate(-150 -100)">' + body + '</g>';
    }
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
    var eq = held(o.h), A = { stand: 1, t: 0, ua: 2, fa: 2 }, Bp = { stand: 1, t: -2, ua: 6, fa: 158 }, hl = [['ua', .5, 6, 10, 6]];
    if (o.h === 'cable') { eq = [{ k: 'cable', at: 'hand', to: [240, 172] }, { k: 'rect', x: 250, y: 120, w: 22, h: 58, r: 3, c: 'pad', back: 1 }]; }
    if (o.h === 'bar') eq = [{ k: 'plate', at: 'hand', r: 8 }];
    if (o.h === 'db' && o.hammer) eq = [{ k: 'db', at: 'hand', rot: 90 }];
    var b;
    if (o.v === 'incline') {   // lying back on an incline bench, arms hanging straight down behind the body, elbows stay put
      b = seated(150, 146, { t: -40, ft: 70 });
      return { A: X(b, { ua: -3, fa: -3 }), B: X(b, { ua: -5, fa: 150 }), eq: seatEq(150, 146, false).concat([{ k: 'padline', off: 14, s0: -6, s1: 66, w: 9, post: 1, back: 1 }], eq), hl: hl };
    }
    if (o.v === 'spider') {    // chest down on an incline bench, arms hanging straight down in front
      A = { stand: 1, ax: 128, t: 42, ua: 0, fa: 0 }; Bp = { stand: 1, ax: 128, t: 42, ua: 0, fa: 150 };
      return { A: A, B: Bp, eq: [{ k: 'padline', off: -14, s0: 4, s1: 62, w: 9, post: 1, back: 1 }].concat(eq), hl: hl, noFront: 1 };
    }
    if (o.v === 'preacher') {  // seated, upper arm resting on the sloped pad
      b = seated(122, 146, { t: 6, ft: 70 });
      var J0 = solve(X(b, { ua: 42, fa: 50 })), d = dn(42), nr = [-d[1], d[0]];
      var pa = pt(pt(J0.sho, d, 6), nr, 9), pb = pt(pt(J0.el, d, 4), nr, 9);
      return { A: X(b, { ua: 42, fa: 52 }), B: X(b, { ua: 42, fa: 168 }), eq: seatEq(122, 146, false).concat([{ k: 'line', a: pa, b: pb, w: 9, c: 'pad', back: 1 }, { k: 'line', a: pb, b: [pb[0], FY], w: 4, c: 'bar', back: 1 }], eq), hl: hl };
    }
    if (o.v === 'conc') {      // seated, leaning over, elbow braced against the inner thigh
      b = seated(130, 146, { t: 30, ft: 70 });
      return { A: X(b, { ua: 6, fa: 6 }), B: X(b, { ua: 6, fa: 155 }), eq: seatEq(130, 146, false).concat(eq), hl: hl };
    }
    if (o.v === 'drag') { Bp = { stand: 1, t: 0, ua: -32, fa: 125 }; }   // bar drags up the body, elbows go back
    return { A: A, B: Bp, eq: eq, hl: hl };
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
    if (v === 'back') { Ap.hs = Bp.hs = [-13, -1]; Ap.eb = Bp.eb = -1; eq = [{ k: 'plate', at: 'trap', r: 10 }]; }
    else if (v === 'front') { Ap.hs = Bp.hs = [12, -3]; Ap.eb = Bp.eb = 1; eq = [{ k: 'plate', at: 'sho', dx: 11, dy: -2, r: 10 }]; }
    else if (v === 'goblet') { Ap.hs = Bp.hs = [10, 10]; Ap.eb = Bp.eb = 1; eq = [{ k: 'db', at: 'hand', rot: 90 }]; }
    else if (v === 'db') { Ap.ua = Bp.ua = 0; Ap.fa = Bp.fa = 0; Bp.ua = 8; Bp.fa = 8; eq = [{ k: 'db', at: 'hand', rot: 90 }]; }
    else if (v === 'smith') { Ap.hs = Bp.hs = [-13, -1]; Ap.eb = Bp.eb = -1; eq = [{ k: 'plate', at: 'trap', r: 10 }, { k: 'line', a: [116, 20], b: [116, FY], w: 2, c: 'bar', back: 1 }]; }
    else if (v === 'hack') {
      Ap = { stand: 1, ax: 168, th: -14, sh: -14, t: -18, hs: [4, -6], eb: -1 }; Bp = { stand: 1, ax: 168, th: 72, sh: -40, t: -18, hs: [4, -6], eb: -1 };
      eq = [{ k: 'line', a: [78, 30], b: [130, FY], w: 4, c: 'cab', back: 1 }, { k: 'padline', off: 14, s0: -4, s1: 60, w: 9, back: 1 }, { k: 'rect', x: 150, y: FY - 8, w: 44, h: 8, r: 2, c: 'pad', back: 1 }];
      return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, 9, 14, 8], ['hip', 0, -4, 9, 9]], noFront: 1 };
    }
    else { Ap.ua = 0; Ap.fa = 0; Bp.ua = 88; Bp.fa = 90; Ap.ua = 60; Ap.fa = 82; }
    return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, 9, 14, 8], ['hip', 0, -4, 9, 9]] };
  };
  B.lunge = function (o) {
    var Ap = { stand: 1, ax: 168, th: 14, sh: 0, t: 0, ank2: [116, FY - 6], kb2: 1, toe2: 1, ua: 0, fa: 0 };
    var Bp = { stand: 1, ax: 176, th: 86, sh: -4, t: 4, ank2: [92, FY - 11], kb2: 1, toe2: 1, ua: 0, fa: 0 };
    var eq = held(o.h === 'bar' ? 'none' : o.h);
    if (o.h === 'db') eq = [{ k: 'db', at: 'hand', rot: 90 }];
    if (o.h === 'bar') { Ap.hs = Bp.hs = [-13, -1]; Ap.eb = Bp.eb = -1; eq = [{ k: 'plate', at: 'trap', r: 10 }]; }
    return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, 9, 14, 8], ['hip', 0, -4, 9, 9]] };
  };
  B.deadlift = function (o) {
    var Ap = { stand: 1, ax: 140, th: 66, sh: -22, t: 52, hd: -28, hs: [8, 52], eb: -1 }, Bp = { stand: 1, ax: 140, th: 2, sh: 0, t: 3, hd: -2, hs: [4, 52], eb: -1 };
    return { A: Ap, B: Bp, eq: [o && o.h === 'kb' ? { k: 'kb', at: 'hand' } : { k: 'plate', at: 'hand', r: 11 }], hl: [['hip', 0, -3, 9, 9], ['th', .5, -9, 12, 7]] };
  };
  B.rdl = function (o) {
    var Ap = { stand: 1, ax: 140, th: 22, sh: -10, t: 78, hd: -50, hs: [6, 50], eb: -1 }, Bp = { stand: 1, ax: 140, th: 2, sh: 0, t: 3, hd: -2, hs: [4, 50], eb: -1 };
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : [{ k: 'plate', at: 'hand', r: 9 }];
    if (o.gm) { Ap.hs = Bp.hs = [-13, -1]; eq = [{ k: 'plate', at: 'trap', r: 9 }]; Ap.hd = -60; }
    return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, -9, 12, 7], ['hip', 0, -3, 9, 9]] };
  };
  function torsoTo(hip, sho) { var dx = sho[0] - hip[0], dy = sho[1] - hip[1]; return Math.atan2(dx, -dy) * 180 / Math.PI; }   // torso angle that puts the shoulders at sho
  B.hipthrust = function (o) {
    var legs = { ank: [188, FY - 6], kb: 1, ft: 70 }, Ap, Bp, eq = [];
    if (o.floor) {   // glute bridge: shoulders stay on the floor
      Ap = X(legs, { hip: [130, 164], t: torsoTo([130, 164], [80, 166]), ua: 90, fa: 90, hd: -6 });
      Bp = X(legs, { hip: [130, 128], t: torsoTo([130, 128], [92, 160]), ua: 60, fa: 75, hd: -30 });
      if (o.one) { Ap.th2 = Bp.th2 = 160; Ap.sh2 = Bp.sh2 = 175; }
      if (o.h === 'bar') eq.push({ k: 'plate', at: 'hip', dy: -12, r: 9 });
      if (o.h === 'db') eq.push({ k: 'db', at: 'hip', dy: -10 });
    } else {         // hip thrust: upper back on a bench
      eq = [{ k: 'rect', x: 34, y: 140, w: 62, h: 38, r: 5, c: 'pad', back: 1 }];
      Ap = X(legs, { hip: [124, 166], t: torsoTo([124, 166], [84, 138]), ua: 90, fa: 90, hd: -10 });
      Bp = X(legs, { hip: [132, 128], t: torsoTo([132, 128], [84, 140]), ua: 90, fa: 90, hd: -40 });
      if (o.h === 'bar') eq.push({ k: 'plate', at: 'hip', dy: -12, r: 9 }); else if (o.h === 'db') eq.push({ k: 'db', at: 'hip', dy: -10 });
    }
    return { A: Ap, B: Bp, eq: eq, hl: [['hip', 0, -5, 10, 10]], noFront: 1 };
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
  B.hangleg = function (o) {
    var base = { hip: [150, 128], t: 2, hand: [150, 26], eb: 1 };
    var Bq = o && o.knee ? X(base, { th: 92, sh: 6 }) : X(base, { th: 88, sh: 92 }), Aq = o && o.hold ? X(Bq, { th: 87 }) : X(base, { th: 4, sh: 4 });
    return { noFloor: 1, sc: .78, pv: [150, 26], A: Aq, B: Bq, eq: [{ k: 'line', a: [100, 26], b: [200, 26], w: 5, c: 'bar', back: 1 }, { k: 'line', a: [100, 26], b: [100, 0], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [200, 26], b: [200, 0], w: 4, c: 'cab', back: 1 }], hl: [['to', .2, 10, 9, 7]] };
  };
  B.cablecrunch = function () {
    var kn = { hip: [140, 140], ank: [100, FY - 5], kb: -1, toe: 1 };
    var eq = [{ k: 'rect', x: 250, y: 20, w: 26, h: 100, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [244, 24] }];
    return { A: X(kn, { t: 14, hh: [4, 4], eb: 1, hd: 0 }), B: X(kn, { hip: [134, 142], t: 64, hh: [2, 10], eb: 1, hd: 38 }), eq: eq, hl: [['to', .3, 10, 10, 7]], noFront: 1 };
  };
  B.plank = function (o) {
    function pose(d) { return { ank: [58, FY - 10], toe: 1, th: -79 - d, sh: -79 - d, t: 79 + d, hd: 10, ua: 2, fa: 90, ft: 40 }; }
    if (o && o.high) return { A: X(pose(0), { th: -68, sh: -68, t: 68, ua: null, fa: null, hand: [174, FY - 4], eb: -1 }), B: X(pose(0), { th: -67, sh: -67, t: 67, ua: null, fa: null, hand: [174, FY - 4], eb: -1 }), eq: [], hl: [['to', .3, 10, 10, 7]], noFront: 1 };
    return { A: pose(0), B: pose(-1), eq: [], hl: [['to', .3, 10, 10, 7]], noFront: 1 };
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
  B.dip = function (o) {
    function p(sx, sy, t) { var u = up(t); return { hip: [sx - u[0] * LEN.to, sy - u[1] * LEN.to], t: t, hd: -10, th: 10, sh: -80, ft: 20, hand: [166, 80], eb: -1 }; }
    var eq = [{ k: 'line', a: [118, 80], b: [204, 80], w: 5, c: 'bar', back: 1 }, { k: 'line', a: [124, 80], b: [124, FY], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [198, 80], b: [198, FY], w: 4, c: 'cab', back: 1 }];
    var lean = o && o.chest ? 30 : 12;
    return { sc: .92, A: p(162, 32, lean), B: p(152, 62, lean + 6), eq: eq, hl: [['ua', .5, -6, 10, 6], ['to', .82, 10, 10, 7]], noFront: 1 };
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
  function kneel(kn, th, t, extra) {   // kneeling: knee on the floor, shin flat behind; th = thigh angle, t = torso
    var hip = [kn[0] - dn(th)[0] * LEN.th, kn[1] - dn(th)[1] * LEN.th];
    return X({ hip: hip, th: th, sh: -96, ft: -10, t: t }, extra || {});
  }
  B.rollout = function (o) {
    if (o && o.standing) return { A: { ank: [100, FY - 6], hip: [116, 112], kb: 1, toe: 1, t: 66, hd: -20, hand: [160, FY - 14], eb: 1 }, B: { ank: [100, FY - 6], hip: [168, 142], kb: 1, toe: 1, t: 86, hd: 6, hand: [256, FY - 14], eb: 1 }, eq: [{ k: 'ball', at: 'hand' }], hl: [['to', .35, 10, 10, 7]], noFront: 1 };
    var kn = [100, FY - 9];
    return { A: kneel(kn, -4, 62, { hd: -14, hand: [150, FY - 14], eb: 1 }), B: kneel(kn, -52, 82, { hd: 4, hand: [222, FY - 14], eb: 1 }), eq: [{ k: 'ball', at: 'hand' }], hl: [['to', .35, 10, 10, 7]], noFront: 1 };
  };
  B.pallof = function () {
    var eq = [{ k: 'rect', x: 252, y: 60, w: 24, h: 118, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [252, 96] }];
    return { A: { stand: 1, ax: 130, t: 0, hs: [12, 22], eb: 1 }, B: { stand: 1, ax: 130, t: 0, hs: [50, 20], eb: 1 }, eq: eq, hl: [['to', .35, 10, 10, 7]] };
  };
  B.cableTri = function () {
    var eq = [{ k: 'rect', x: 20, y: 120, w: 24, h: 58, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [44, 170] }];
    return { sc: .82, A: { stand: 1, ax: 160, t: 8, ua: 170, fa: -20 }, B: { stand: 1, ax: 160, t: 8, ua: 170, fa: 168 }, eq: eq, hl: [['ua', .5, -6, 12, 6]] };
  };

  /* ---- templates added in the full sweep (Nov 2026) ---- */
  function benchAt(x, w, y) { y = y || 142; return [{ k: 'rect', x: x, y: y, w: w, h: 9, r: 4, c: 'pad', back: 1 }, { k: 'rect', x: x + 8, y: y + 9, w: 6, h: FY - y - 9, r: 1, c: 'bar', back: 1 }, { k: 'rect', x: x + w - 14, y: y + 9, w: 6, h: FY - y - 9, r: 1, c: 'bar', back: 1 }]; }
  function line3(a, b) { var d = [b[0] - a[0], b[1] - a[1]], l = Math.sqrt(d[0] * d[0] + d[1] * d[1]); return [d[0] / l, d[1] / l]; }
  // a straight body from the feet (ank) out to the shoulders at a given rise angle: returns hip, torso and leg angles
  function plankLine(ank, deg, extra) {
    var d = [Math.cos(R(deg)), -Math.sin(R(deg))], hip = [ank[0] + d[0] * (LEN.th + LEN.sh), ank[1] + d[1] * (LEN.th + LEN.sh)];
    return X({ hip: hip, ank: ank, kb: -1, toe: 1, ft: 40, t: 90 - deg, hd: 12, eb: -1 }, extra || {});
  }
  B.pushupV = function (o) {
    if (o.v === 'incline') return { A: plankLine([46, FY - 8], 38, { hand: [150, 140] }), B: plankLine([46, FY - 8], 22, { hand: [150, 140] }), eq: benchAt(118, 80, 140), hl: [['to', .85, 9, 10, 7]], noFront: 1 };
    if (o.v === 'decline') return { A: plankLine([62, 136], 6, { hand: [186, FY - 4], toe: 0, ft: 100 }), B: plankLine([62, 136], -8, { hand: [186, FY - 4], toe: 0, ft: 100 }), eq: benchAt(30, 56, 140), hl: [['to', .85, 9, 10, 7]], noFront: 1 };
    if (o.v === 'knee') { var kn = [104, FY - 9]; return { A: kneel(kn, -58, 60, { hand: [178, FY - 4], eb: -1, hd: 14 }), B: kneel(kn, -76, 77, { hand: [178, FY - 4], eb: -1, hd: 14 }), eq: [], hl: [['to', .85, 9, 10, 7]], noFront: 1 }; }
    if (o.v === 'pike') return { A: { hip: [140, 104], ank: [104, FY - 6], kb: 1, toe: 1, t: 128, hd: 24, hand: [188, FY - 4], eb: -1 }, B: { hip: [144, 108], ank: [104, FY - 6], kb: 1, toe: 1, t: 150, hd: 26, hand: [188, FY - 4], eb: -1 }, eq: [], hl: [['to', .95, 0, 9, 9]], noFront: 1 };
    if (o.v === 'renegade') { var b = plankLine([50, FY - 8], 24); return { A: X(b, { hand: [178, FY - 6] }), B: X(b, { hand: [150, 138] }), eq: [{ k: 'db', at: 'hand', rot: 90 }], hl: [['to', .66, -11, 11, 7]], noFront: 1 }; }
    return null;
  };
  B.wallsit = function () {
    var b = { hip: [146, 134], ank: [186, FY - 6], kb: 1, ft: 70, t: 0, hd: 0, hand: [176, 128], eb: 1 };
    return { A: b, B: X(b, { t: 1 }), eq: [{ k: 'rect', x: 124, y: 10, w: 10, h: FY - 10, r: 2, c: 'pad', back: 1 }], hl: [['th', .5, 9, 14, 8]], noFront: 1 };
  };
  B.walk = function (o) {
    function p(a) { return { hip: [150, 98], t: 3, th: a, sh: a - (a > 0 ? 4 : 16), th2: -a, sh2: -a - (a < 0 ? 4 : 16), ft: 82, ft2: 82, hd: -3, ua: o.h ? 0 : -a * .9, fa: o.h ? 0 : -a * .9 + 14 }; }
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : o.h === 'kb' ? [{ k: 'kb', at: 'hand' }] : [];
    return { A: p(22), B: p(-22), eq: eq, hl: o.h ? [['fa', .5, 5, 9, 5]] : [], noFront: 1 };
  };
  B.legcurlLying = function () {
    var b = { hip: [130, 146], t: 90, hd: 4, th: -90, hand: [204, 166], eb: -1, ft: -60 };
    return { A: X(b, { sh: -92 }), B: X(b, { sh: -172 }), eq: [{ k: 'rect', x: 88, y: 154, w: 118, h: 9, r: 4, c: 'pad', back: 1 }, { k: 'rect', x: 140, y: 163, w: 7, h: FY - 163, r: 1, c: 'bar', back: 1 }, { k: 'roller', at: 'ank', dy: 4, r: 6 }], hl: [['th', .5, 9, 14, 7]], noFront: 1 };
  };
  B.legcurlStand = function () {
    var b = { stand: 1, ax: 150, t: 8, hs: [34, 20], eb: -1, th2: 2 };
    return { A: X(b, { sh2: 2 }), B: X(b, { sh2: -110 }), eq: [{ k: 'rect', x: 184, y: 60, w: 12, h: 118, r: 3, c: 'pad', back: 1 }], hl: [['th', .5, -9, 14, 7]], noFront: 1 };
  };
  B.straightPulldown = function () {
    var b = { stand: 1, ax: 140, th: 8, sh: 0, t: 16, hd: -6 };
    var eq = [{ k: 'rect', x: 250, y: 10, w: 24, h: 168, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [250, 22] }];
    return { A: X(b, { ua: 128, fa: 132 }), B: X(b, { ua: -10, fa: -8 }), eq: eq, hl: [['to', .66, -11, 11, 7]], noFront: 1 };
  };
  B.bulgarian = function (o) {
    var eq = [{ k: 'rect', x: 50, y: FY - 38, w: 60, h: 9, r: 4, c: 'pad', back: 1 }, { k: 'rect', x: 76, y: FY - 29, w: 6, h: 29, r: 1, c: 'bar', back: 1 }];
    var Ap = { stand: 1, ax: 176, th: 12, sh: 0, t: 4, ank2: [96, FY - 44], kb2: 1, ft2: -110, ua: 0, fa: 0 };
    var Bp = { stand: 1, ax: 176, th: 80, sh: -12, t: 12, ank2: [96, FY - 44], kb2: 1, ft2: -110, ua: 2, fa: 2 };
    if (o.h === 'db') eq.push({ k: 'db', at: 'hand', rot: 90 });
    if (o.h === 'bar') { Ap.hs = Bp.hs = [-13, -1]; Ap.eb = Bp.eb = -1; Ap.ua = Bp.ua = Ap.fa = Bp.fa = undefined; eq.push({ k: 'plate', at: 'trap', r: 10 }); }
    return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, 9, 14, 8], ['hip', 0, -4, 9, 9]], noFront: 1 };
  };
  B.sideLunge = function (o) {   // front view: step out to one side, sit back on that leg, the other leg stays straight
    var hands = { hdl: [143, 72], hdr: [157, 72], ebl: 1, ebr: -1 };
    var eq = o.h === 'db' ? [{ k: 'plateMid', r: 7 }] : [];
    return { fv: 1, A: X({ cx: 150, thl: -28, thr: 28, shl: -28, shr: 28 }, X(hands, { hdl: [143, 62], hdr: [157, 62] })), B: X({ cx: 138, thl: -55, shl: 10, thr: 35, shr: 35 }, hands), eq: eq, hl: [] };
  };
  B.rdl1 = function (o) {   // single-leg RDL: the free leg rises behind as the body tips forward
    var Ap = { stand: 1, ax: 140, th: 8, sh: -4, t: 80, hd: -50, ua: 0, fa: 0, th2: -78, sh2: -82 }, Bp = { stand: 1, ax: 140, th: 2, sh: 0, t: 2, hd: -2, ua: 2, fa: 2, th2: 4, sh2: -10 };
    var eq = o.h === 'kb' ? [{ k: 'kb', at: 'hand' }] : o.h === 'none' ? [] : [{ k: 'db', at: 'hand', rot: 90 }];
    return { A: Ap, B: Bp, eq: eq, hl: [['th', .5, -9, 12, 7], ['hip', 0, -3, 9, 9]], noFront: 1 };
  };
  B.donkeyCalf = function () {
    var b = { stand: 1, ax: 120, th: 2, sh: 0, t: 84, hd: -40, hand: [186, 102], eb: -1 };
    return { A: X(b, { lift: 0 }), B: X(b, { lift: 14 }), eq: [{ k: 'rect', x: 170, y: 104, w: 36, h: 9, r: 3, c: 'pad', back: 1 }, { k: 'rect', x: 184, y: 113, w: 6, h: FY - 113, r: 1, c: 'bar', back: 1 }, { k: 'rect', x: 98, y: FY - 6, w: 50, h: 6, r: 2, c: 'pad', back: 1 }], hl: [['sh', .35, -8, 11, 6]], noFront: 1 };
  };
  B.toeRaise = function () {   // tibialis raise: back on the wall, heels down, toes come up
    var b = { hip: [146, 98], ank: [168, FY - 6], kb: 1, t: -4, ua: 4, fa: 4 };
    return { A: X(b, { ft: 66 }), B: X(b, { ft: 124 }), eq: [{ k: 'rect', x: 122, y: 10, w: 10, h: FY - 10, r: 2, c: 'pad', back: 1 }], hl: [['sh', .5, 8, 11, 6]], noFront: 1 };
  };
  B.legpressCalf = function () {
    var b = { hip: [74, 152], t: -50, ua: 60, fa: 70, ank: [148, 100], kb: 1 };
    var eq = [{ k: 'padline', off: 15, s0: -10, s1: 60, w: 9, back: 1 }, { k: 'line', a: [74, 168], b: [250, 100], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [74, 168], b: [74, FY], w: 4, c: 'cab', back: 1 }, { k: 'line', a: [250, 100], b: [250, FY], w: 4, c: 'cab', back: 1 }];
    return { A: X(b, { ft: 80 }), B: X(b, { ank: [151, 99], ft: 44 }), eq: eq.concat([{ k: 'plat', at: 'toe', ang: 69, len: 20 }]), hl: [['sh', .35, -8, 11, 6]] };
  };
  B.snatch = function (o) {
    var eq = o.h === 'db' ? [{ k: 'db', at: 'hand', rot: 90 }] : o.h === 'kb' ? [{ k: 'kb', at: 'hand' }] : [{ k: 'plate', at: 'hand', r: 11 }];
    return { sc: .82, A: { stand: 1, ax: 140, th: 40, sh: -16, t: 46, hd: -24, hs: [8, 52], eb: -1 }, B: { stand: 1, ax: 140, th: 4, sh: 0, t: 0, hs: null, ua: 176, fa: 178 }, eq: eq, hl: [['hip', 0, -3, 9, 9], ['to', 1, 0, 9, 9]] };
  };
  B.revcrunch = function () {
    var b = { t: -90, ua: 90, fa: 90, hd: -4 };
    return { A: X(b, { hip: [150, 166], th: 180, sh: 95 }), B: X(b, { hip: [146, 160], t: -100, th: 220, sh: 150 }), eq: [{ k: 'rect', x: 40, y: FY - 4, w: 220, h: 4, r: 2, c: 'pad', back: 1 }], hl: [['to', .2, 10, 9, 7]], noFront: 1 };
  };
  B.hollow = function () {
    var b = { hip: [150, 166], t: -74, hd: -4, ua: -118, fa: -116, th: 74, sh: 76 };
    return { A: b, B: X(b, { th: 72, sh: 74, t: -73 }), eq: [{ k: 'rect', x: 30, y: FY - 4, w: 240, h: 4, r: 2, c: 'pad', back: 1 }], hl: [['to', .2, 10, 9, 7]], noFront: 1 };
  };
  B.flutter = function () {
    var b = { hip: [150, 166], t: -90, ua: 90, fa: 90, hd: -6 };
    return { A: X(b, { th: 70, sh: 70, th2: 84, sh2: 84 }), B: X(b, { th: 84, sh: 84, th2: 70, sh2: 70 }), eq: [{ k: 'rect', x: 40, y: FY - 4, w: 220, h: 4, r: 2, c: 'pad', back: 1 }], hl: [['to', .2, 10, 9, 7]], noFront: 1 };
  };
  B.dragonflag = function () {
    var S = [104, 156];
    function p(a) { var u = up(-a), hip = [S[0] - u[0] * LEN.to, S[1] - u[1] * LEN.to]; return { hip: hip, t: -a, th: a, sh: a, ft: a, hand: [88, 150], eb: 1, hd: -10 }; }
    return { A: p(138), B: p(104), eq: benchAt(60, 150, 160), hl: [['to', .3, 10, 10, 7]], noFront: 1 };
  };
  B.birddog = function () {
    var kn = [118, FY - 9], b = kneel(kn, 0, 90, { hd: -6, eb: -1 });
    return { A: X(b, { hand: [168, FY - 4], th2: 0, sh2: -96, ft2: -10 }), B: X(b, { hand: [226, 120], eb: 1, th2: -90, sh2: -92, ft2: 0 }), eq: [], hl: [['to', .2, -10, 10, 7], ['hip', 0, -4, 9, 9]], noFront: 1 };
  };
  B.chestRow = function (o) {   // chest on an incline bench, arms hang, then row the elbows back
    var b = { stand: 1, ax: 112, th: 16, sh: -6, t: 46, hd: -10 };
    var eq = [{ k: 'padline', off: -14, s0: 4, s1: 62, w: 9, post: 1, back: 1 }].concat(o.h === 'bar' ? [{ k: 'plate', at: 'hand', r: 10 }] : [{ k: 'db', at: 'hand', rot: 90 }]);
    return { A: X(b, { ua: 0, fa: 0 }), B: X(b, { ua: -64, fa: 12 }), eq: eq, hl: [['to', .66, -11, 11, 7]], noFront: 1 };
  };
  B.nordic = function () {   // kneeling, body straight from the knees, lower forward slowly
    var kn = [110, FY - 9];
    return { A: kneel(kn, -4, 4, { hd: 0, ua: 4, fa: 4 }), B: kneel(kn, -64, 64, { hd: 0, ua: 70, fa: 74 }), eq: [{ k: 'rect', x: 50, y: FY - 16, w: 14, h: 10, r: 4, c: 'pad', back: 1 }], hl: [['th', .5, -9, 12, 7]], noFront: 1 };
  };
  B.yraise = function (o) {
    return { fv: 1, A: { ual: -8, fal: -6, uar: 8, far: 6 }, B: { ual: -152, fal: -154, uar: 152, far: 154 }, eq: o.h === 'cable' ? [{ k: 'cableF', l: [20, 172], r: [280, 172] }] : [{ k: 'dbF' }], hl: ['delt'], sc: .86 };
  };
  B.highCurl = function () {
    return { fv: 1, A: { ual: -88, fal: -90, uar: 88, far: 90 }, B: { ual: -88, fal: 168, uar: 88, far: -168 }, eq: [{ k: 'cableF', l: [14, 52], r: [286, 52] }], hl: ['bi'] };
  };
  B.flyTop = function (o) {    // lying on a flat bench, seen from above: arms open wide, then come together over the chest
    var eq = [{ k: 'rect', x: 132, y: 18, w: 36, h: 100, r: 5, c: 'pad', back: 1 }];
    if (o.h === 'cable') eq.push({ k: 'cableF', l: [6, 70], r: [294, 70] }); else eq.push({ k: 'dbF' });
    return { fv: 1, top: 1, sc: 1.05, A: { ual: -86, fal: -100, uar: 86, far: 100, af: 1 }, B: { ual: -14, fal: 30, uar: 14, far: -30, af: .34 }, eq: eq, hl: ['chest'] };
  };
  B.revflyBent = function (o) {   // bent over (seen from the front): arms hang, then open out to the sides
    var b = { bend: .78, thl: -4, thr: 4, shl: -1, shr: 1 };
    var eq = o.h === 'cable' ? [{ k: 'cableF', l: [40, 172], r: [260, 172] }] : [{ k: 'dbF' }];
    return { fv: 1, A: X(b, { ual: -6, fal: -2, uar: 6, far: 2, af: .9 }), B: X(b, { ual: -86, fal: -92, uar: 86, far: 92, af: 1 }), eq: eq, hl: ['delt', 'trap'] };
  };
  B.cableHipF = function (o) {   // standing, one leg moves out (abduction) or in across (adduction) against the cable
    var Aw = o.add ? 26 : 3, Bw = o.add ? -6 : 34;
    return { fv: 1, A: { hdl: [118, 70], ebl: 1, ual: 6, far: 6, thr: Aw, shr: Aw }, B: { hdl: [118, 70], ebl: 1, ual: 6, far: 6, thr: Bw, shr: Bw }, eq: [{ k: 'rect', x: 92, y: 40, w: 12, h: 138, r: 3, c: 'pad', back: 1 }], hl: [] };
  };
  B.landmine = function () {
    return { A: { stand: 1, ax: 140, t: 10, hs: [12, 2], eb: 1, hd: -4 }, B: { stand: 1, ax: 140, t: 14, hs: [44, -40], eb: 1, hd: -4 }, eq: [{ k: 'barTo', at: 'hand', to: [40, FY - 2] }], hl: [['to', 1, 0, 9, 9]], noFront: 1 };
  };
  B.bayesian = function () {   // facing away from a low cable, arm stays behind the body
    return { A: { stand: 1, ax: 160, t: 6, ua: -24, fa: -20 }, B: { stand: 1, ax: 160, t: 6, ua: -24, fa: 130 }, eq: [{ k: 'rect', x: 20, y: 120, w: 22, h: 58, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [42, 150] }], hl: [['ua', .5, 6, 10, 6]], noFront: 1 };
  };
  B.standPress = function () {   // standing cable chest press: cables from behind, press straight forward
    var b = { stand: 1, ax: 130, t: 6, ank2: [100, FY - 6], kb2: 1, toe2: 1, eb: -1 };
    return { A: X(b, { hs: [10, 10] }), B: X(b, { hs: [50, 4] }), eq: [{ k: 'rect', x: 30, y: 40, w: 22, h: 138, r: 3, c: 'pad', back: 1 }, { k: 'cable', at: 'hand', to: [52, 82] }], hl: [['to', .78, 11, 11, 7]], noFront: 1 };
  };
  B.burpee = function () {
    var stand = { hip: [150, 96], ank: [150, FY - 6], kb: 1, toe: 1, t: 0, hd: 0, hand: [153, 146], eb: 1 };
    var squat = { hip: [134, 142], ank: [150, FY - 6], kb: 1, toe: 1, t: 64, hd: -30, hand: [184, FY - 4], eb: -1 };
    var plank = plankLine([58, FY - 8], 24, { hand: [184, FY - 4], toe: 1 });
    var jump = { hip: [150, 84], ank: [150, FY - 18], kb: 1, toe: 0, ft: 30, t: 0, hd: -4, hand: [160, -12], eb: 1 };
    return { K: [stand, squat, plank, squat, jump], A: stand, B: jump, eq: [], hl: [['th', .5, 9, 14, 8]], sc: .86, noFront: 1 };
  };
  B.seatedCurl = function (o) {
    var b = seated(124, 146, { t: 0, ft: 70 });
    var eq = seatEq(124, 146, false).concat(o.hammer ? [{ k: 'db', at: 'hand', rot: 90 }] : held('db'));
    return { A: X(b, { ua: 2, fa: 4 }), B: X(b, { ua: 6, fa: 150 }), eq: eq, hl: [['ua', .5, 6, 10, 6]] };
  };
  B.lyingCurl = function (o) {   // lying face down on a high bench, arms hanging over the end
    var b = { hip: [100, 120], t: 90, hd: -6, th: -92, sh: -92, ft: -90 };
    var eq = [{ k: 'rect', x: 40, y: 128, w: 114, h: 10, r: 4, c: 'pad', back: 1 }, { k: 'rect', x: 92, y: 138, w: 7, h: FY - 138, r: 1, c: 'bar', back: 1 }].concat(o.h === 'db' ? [{ k: 'db', at: 'hand' }] : [{ k: 'plate', at: 'hand', r: 8 }]);
    return { A: X(b, { ua: 0, fa: 0 }), B: X(b, { ua: 4, fa: 150 }), eq: eq, hl: [['ua', .5, 6, 10, 6]], noFront: 1 };
  };
  B.platePinch = function () {
    return { A: { stand: 1, ua: 1, fa: 1 }, B: { stand: 1, ua: 1, fa: 1, t: 1 }, eq: [{ k: 'plate', at: 'hand', r: 10 }], hl: [['fa', .5, 5, 9, 5]], noFront: 1 };
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
    if ((T(/(overhead|shoulder|military|arnold|push) press|^arnold|seated dumbbell press|standing (alternating )?(palm.?s?.in )?(one-arm )?dumbbell press|standing palm(?!.*wrist)|clean and press|seated barbell military|press behind/)) && !T(/tricep|bench|incline|decline|floor|chest|leg|jerk|snatch|band|log|stone|sled|smith machine bench|cuban|bradford|neck press/)) return ['ohp', { h: T(/dumbbell|arnold|kettlebell/) ? 'db' : 'bar', seated: T(/seated|arnold/) || (T(/dumbbell/) && !T(/standing|push press/)) }];
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
    if (T(/curl/) && !T(/leg|hamstring|wrist|nordic|ball|glute.?ham|lower back|neck|band|tricep|reverse plate|twist|crunch|knee|ab /)) return ['curl', { h: T(/dumbbell|hammer|concentration|zottman|spider|drag|machine/) && !T(/barbell/) ? 'db' : T(/cable|rope|pulley/) ? 'cable' : T(/barbell|ez|bar curl|e-z|bar$|preacher curl/) ? 'bar' : 'db', hammer: T(/hammer/),
      v: T(/spider|prone|lying against an incline|chest.?supported/) ? 'spider' : T(/preacher|scott|over incline bench/) ? 'preacher' : T(/incline/) ? 'incline' : T(/concentration/) ? 'conc' : T(/drag/) ? 'drag' : '' }];
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
  /* exact matches, checked first: exercises the name rules above would draw wrong. null = no cartoon (photos show instead) */
  var OVR = {"incline push-up": ["pushupV", {"v": "incline"}], "incline push-up close-grip": ["pushupV", {"v": "incline"}], "incline push-up medium": ["pushupV", {"v": "incline"}], "incline push-up reverse grip": ["pushupV", {"v": "incline"}], "incline push-up wide": ["pushupV", {"v": "incline"}], "decline push-up": ["pushupV", {"v": "decline"}], "push-ups with feet elevated": ["pushupV", {"v": "decline"}], "knee push-up": ["pushupV", {"v": "knee"}], "pike push-up": ["pushupV", {"v": "pike"}], "alternating renegade row": ["pushupV", {"v": "renegade"}], "wall sit": ["wallsit", {}], "burpee": ["burpee", {}], "dumbbell devil press": null, "kneeling jump squat": null, "bulgarian split squat": ["bulgarian", {"h": "none"}], "dumbbell bulgarian split squat": ["bulgarian", {"h": "db"}], "smith single-leg split squat": ["bulgarian", {"h": "none"}], "cossack squat": ["sideLunge", {}], "dumbbell lateral lunge": ["sideLunge", {"h": "db"}], "lying leg curls": ["legcurlLying", {}], "standing leg curl": ["legcurlStand", {}], "kettlebell one-legged deadlift": ["rdl1", {"h": "kb"}], "single-leg dumbbell romanian deadlift": ["rdl1", {"h": "db"}], "donkey calf raises": ["donkeyCalf", {}], "tibialis raise": ["toeRaise", {}], "smith machine reverse calf raises": ["toeRaise", {}], "calf press on the leg press machine": ["legpressCalf", {}], "calf press": ["legpressCalf", {}], "one leg barbell squat": null, "belt squat": ["squat", {"v": "db"}], "barbell step ups": ["stepup", {"h": "none", "knee": false}], "band hip adductions": ["cableHipF", {"add": 1}], "cable hip adduction": ["cableHipF", {"add": 1}], "dumbbell farmer's carry": ["walk", {"h": "db"}], "walking": ["walk", {}], "walking, treadmill": ["walk", {}], "trail running/walking": ["walk", {}], "plate pinch": ["platePinch", {}], "reverse crunch": ["revcrunch", {}], "decline reverse crunch": ["revcrunch", {}], "cable reverse crunch": ["revcrunch", {}], "suspended reverse crunch": ["revcrunch", {}], "leg pull-in": ["revcrunch", {}], "bottoms up": ["revcrunch", {}], "hollow body hold": ["hollow", {}], "flutter kicks": ["flutter", {}], "dragon flag": ["dragonflag", {}], "bird dog": ["birddog", {}], "stir the pot": null, "hanging knee raise": ["hangleg", {"knee": 1}], "knee/hip raise on parallel bars": ["hangleg", {"knee": 1}], "l-sit": ["hangleg", {"hold": 1}], "windshield wipers": null, "plank": ["plank", {}], "ab roller": ["rollout", {}], "barbell ab rollout - on knees": ["rollout", {}], "barbell ab rollout": ["rollout", {"standing": 1}], "suspended fallout": ["rollout", {"standing": 1}], "natural glute ham raise": ["nordic", {}], "floor glute-ham raise": ["nordic", {}], "hyperextensions with no hyperextension bench": null, "bosu ball cable crunch with side bends": null, "cable russian twists": null, "dumbbell flyes": ["flyTop", {"h": "db"}], "one-arm flat bench dumbbell flye": ["flyTop", {"h": "db"}], "decline dumbbell flyes": ["flyTop", {"h": "db"}], "incline dumbbell flyes": ["flyTop", {"h": "db"}], "flat bench cable flyes": ["flyTop", {"h": "cable"}], "incline cable flye": ["flyTop", {"h": "cable"}], "standing cable chest press": ["standPress", {}], "dips - chest version": ["dip", {"chest": 1}], "straight-arm pulldown": ["straightPulldown", {}], "rope straight-arm pulldown": ["straightPulldown", {}], "kneeling high pulley row": ["pulldown", {}], "kneeling single-arm high pulley row": ["pulldown", {}], "cable rope rear-delt rows": ["facepull", {}], "dumbbell incline row": ["chestRow", {"h": "db"}], "incline bench pull": ["chestRow", {"h": "db"}], "lying t-bar row": ["chestRow", {"h": "bar"}], "lying cambered barbell row": ["chestRow", {"h": "bar"}], "straight bar bench mid rows": ["chestRow", {"h": "bar"}], "dumbbell one-arm upright row": ["uprow", {"h": "db"}], "smith machine one-arm upright row": ["uprow", {"h": "bar"}], "leverage high row": ["rowSeated", {}], "sled row": null, "barbell rear delt row": ["bentRow", {"h": "bar"}], "middle back shrug": null, "reverse flyes": ["revflyBent", {"h": "db"}], "reverse flyes with external rotation": ["revflyBent", {"h": "db"}], "seated bent-over rear delt raise": ["revflyBent", {"h": "db"}], "bent over dumbbell rear delt raise with head on bench": ["revflyBent", {"h": "db"}], "cable rear delt fly": ["revflyBent", {"h": "cable"}], "bent over low-pulley side lateral": ["revflyBent", {"h": "cable"}], "back flyes - with bands": ["revflyBent", {"h": "cable"}], "dumbbell rear delt row": ["revflyBent", {"h": "db"}], "dumbbell lying rear lateral raise": ["revflyBent", {"h": "db"}], "dumbbell lying one-arm rear lateral raise": ["revflyBent", {"h": "db"}], "lying rear delt raise": ["revflyBent", {"h": "db"}], "sled reverse flye": null, "dumbbell y-raise": ["yraise", {"h": "db"}], "cable y-raise": ["yraise", {"h": "cable"}], "standing dumbbell straight-arm front delt raise above head": ["yraise", {"h": "db"}], "side laterals to front raise": ["lat", {"h": "db"}], "front raise and pullover": ["pullover", {"h": "bar"}], "landmine press": ["landmine", {}], "standing alternating dumbbell press": ["ohp", {"h": "db", "seated": false}], "standing dumbbell press": ["ohp", {"h": "db", "seated": false}], "standing palm-in one-arm dumbbell press": ["ohp", {"h": "db", "seated": false}], "standing palms-in dumbbell press": ["ohp", {"h": "db", "seated": false}], "dumbbell push press": ["ohp", {"h": "db", "seated": false}], "kettlebell seated press": ["ohp", {"h": "kb", "seated": true}], "bayesian cable curl": ["bayesian", {}], "high cable curls": ["highCurl", {}], "overhead cable curl": ["highCurl", {}], "lying cable curl": null, "lying close-grip bar curl on high pulley": null, "lying supine dumbbell curl": ["curl", {"h": "db", "hammer": false, "v": "incline"}], "lying high bench barbell curl": ["lyingCurl", {"h": "bar"}], "machine bicep curl": ["curl", {"h": "bar", "hammer": false, "v": "preacher"}], "seated dumbbell curl": ["seatedCurl", {}], "seated dumbbell inner biceps curl": ["seatedCurl", {}], "cable hammer curls - rope attachment": ["curl", {"h": "cable", "hammer": false, "v": ""}], "standing low-pulley one-arm triceps extension": ["cableTri", {}], "triceps overhead extension with rope": ["cableTri", {}], "cable incline pushdown": null, "dumbbell snatch": ["snatch", {"h": "db"}], "kettlebell deadlift": ["deadlift", {"h": "kb"}], "barbell thruster": ["thruster", {"h": "bar"}], "dumbbell thruster": ["thruster", {"h": "db"}], "wrist roller": null, "wrist rotations with straight bar": null};
  function pick(ex) {
    var n0 = ex.n.toLowerCase();
    if (OVR.hasOwnProperty(n0)) return OVR[n0];
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
    if (!(ex.n in memo)) { var p = null; try { p = OVR.hasOwnProperty(ex.n.toLowerCase()) ? OVR[ex.n.toLowerCase()] : ((ex.fx && pick({ n: ex.fx, c: ex.c })) || pick(ex)); } catch (e) { p = null; } memo[ex.n] = p && B[p[0]] ? tpl(p) : null; }
    return memo[ex.n];
  }
  function svgDoc(T, k, cls) { return '<svg class="' + (cls || 'fig') + '" viewBox="0 0 300 200" role="img" aria-hidden="true">' + frame(T, k) + '</svg>'; }
  function ensureDefs() {   // the shading gradients live once in the page
    if (typeof document === 'undefined' || document.getElementById('ilSk')) return;
    var host = document.getElementById('fig-defs'), inner = DEFS.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    if (host) host.insertAdjacentHTML('afterbegin', inner); else if (document.body) document.body.insertAdjacentHTML('beforeend', DEFS);
  }
  function thumb(T) {
    ensureDefs();
    var host = document.getElementById('fig-defs');
    if (!syms[T.id]) syms[T.id] = frame(T, 0.85);   // drawn once, then reused as markup (styles don't reach inside <use> copies)
    return '<svg class="fig" viewBox="0 0 300 200" aria-hidden="true">' + syms[T.id] + '</svg>';
  }
  /* live animation: updates one <svg> until it leaves the page */
  function cycle(ms) {
    var p = ms % 3000;
    if (p < 1200) return ease(p / 1200);
    if (p < 1500) return 1;
    if (p < 2700) return 1 - ease((p - 1500) / 1200);
    return 0;
  }
  function live(svg, T, view, t0in) {
    ensureDefs();
    var still = false;
    try { still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
    var t0 = t0in || Date.now();
    function nextFrame(fn) { if (window.requestAnimationFrame) window.requestAnimationFrame(fn); else setTimeout(fn, 33); }
    function step() {
      if (!document.body.contains(svg)) return;
      if (still) { svg.innerHTML = frame(T, Math.floor((Date.now() - t0) / 1300) % 2, view); setTimeout(step, 1300); return; }
      svg.innerHTML = frame(T, cycle(Date.now() - t0), view);
      nextFrame(step);
    }
    step();
  }
  return { defs: function () { return DEFS; }, frontOK: frontOK, forEx: forEx, svgDoc: svgDoc, thumb: thumb, live: live, frame: frame, pick: pick, tpl: tpl, B: B, FY: FY };
})();
