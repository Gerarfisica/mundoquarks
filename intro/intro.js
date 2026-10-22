/* ================= Intro de Mundo Quarks =================
   Pantalla de entrada: espacio profundo con nebulosa y galaxia, tres quarks de plasma enlazados por órbitas de luz
   y un botón «INGRESAR». Secuencia: aparece el espacio, luego los quarks, se enlazan y se forma el botón.
   Al pulsarlo, la escena se parte en dos compuertas que se separan (arriba y abajo) y deja ver la portada.
   - Se muestra una vez por sesión del navegador; no aparece si la URL trae un ancla (#contacto, etc.).
   - Con «?intro» en la URL se fuerza (para probarla).
   - Sin JavaScript o si algo falla, la portada queda accesible: el telón tiene un tiempo límite. */
(function () {
  'use strict';
  var root = document.documentElement, KEY = 'mq-intro-vista';
  var forzar = /[?&]intro\b/.test(location.search);
  var vista = false;
  try { vista = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  if (!forzar && (vista || location.hash)) return;

  root.classList.add('mqi-on', 'mqi-wait');
  // si la intro no llega a armarse, se levanta el telón igual
  var failsafe = setTimeout(limpiar, 4000);
  function limpiar() { root.classList.remove('mqi-on', 'mqi-wait'); }

  var reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function armar() {
    try { montar(); clearTimeout(failsafe); }
    catch (e) { clearTimeout(failsafe); var o = document.getElementById('mq-intro'); if (o) o.remove(); limpiar(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar); else armar();

  function montar() {
    // ---------- estructura ----------
    var ov = document.createElement('div');
    ov.id = 'mq-intro';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Bienvenida a Mundo Quarks');
    ov.innerHTML =
      '<div class="mqi-half mqi-top"><canvas aria-hidden="true"></canvas><div class="mqi-shade"></div><div class="mqi-edge"></div></div>' +
      '<div class="mqi-half mqi-bot"><canvas aria-hidden="true"></canvas><div class="mqi-shade"></div><div class="mqi-edge"></div></div>' +
      '<div class="mqi-seam" aria-hidden="true"></div><div class="mqi-flare" aria-hidden="true"></div>' +
      '<button type="button" class="mqi-enter"><span>INGRESAR</span>' +
      '<svg class="mqi-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" class="mqi-skip">Omitir intro</button>';
    // la portada queda inerte (ni foco ni lector de pantalla) mientras dura la intro
    var inertes = [];
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.tagName === 'SCRIPT' || el.hasAttribute('inert')) return;
      inertes.push([el, el.getAttribute('aria-hidden')]); el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true');
    });
    document.body.appendChild(ov);
    root.classList.remove('mqi-wait');

    var cTop = ov.querySelector('.mqi-top canvas'), cBot = ov.querySelector('.mqi-bot canvas');
    var gTop = cTop.getContext('2d'), gBot = cBot.getContext('2d');
    var btn = ov.querySelector('.mqi-enter'), skip = ov.querySelector('.mqi-skip'), bot = ov.querySelector('.mqi-bot');
    try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); }

    // ---------- utilidades ----------
    var TAU = Math.PI * 2;
    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function mezcla(c, d, k) { return [Math.round(c[0] + (d[0] - c[0]) * k), Math.round(c[1] + (d[1] - c[1]) * k), Math.round(c[2] + (d[2] - c[2]) * k)]; }
    function suave(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    var semilla = 7;
    function azar() { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }
    function lienzo(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
    // ruido de valor y fBm (para la nebulosa y la textura del plasma)
    function hsh(x, y) { var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
    function ruido(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hsh(xi, yi), b = hsh(xi + 1, yi), c = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function fbm(x, y, oct) { var s = 0, a = 0.5, n = 0; for (var i = 0; i < oct; i++) { s += a * ruido(x, y); n += a; var x2 = x * 1.6 - y * 1.2, y2 = x * 1.2 + y * 1.6; x = x2 + 3.1; y = y2 + 1.7; a *= 0.5; } return s / n; }
    // resplandor radial pre-dibujado (se estampa con drawImage)
    function brillo(col, r, nucleo) {
      var c = lienzo(2 * r, 2 * r), g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, rgba(nucleo || col, 1)); gr.addColorStop(0.18, rgba(col, 0.55)); gr.addColorStop(0.5, rgba(col, 0.14)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 2 * r, 2 * r); return c;
    }

    // ---------- escena ----------
    var W = 0, H = 0, DPR = 1, m = 0, D = 0, fondo = null, raf = 0, t0 = performance.now(), estado = 'idle', tGo = 0;
    var titilan = [], hebras = [], spLuz = null, spChispa = null;
    var QUARKS = [
      { col: [40, 120, 255], base: [0, -1], fase: 0.0 },          // azul, arriba
      { col: [255, 70, 40], base: [-1.35, 0.46], fase: 2.3 },     // rojo anaranjado, abajo a la izquierda
      { col: [30, 225, 130], base: [1.35, 0.46], fase: 4.4 }      // verde esmeralda, abajo a la derecha
    ];

    function medir() {
      W = ov.clientWidth || innerWidth; H = ov.clientHeight || innerHeight; m = Math.min(W, H);
      DPR = Math.min(window.devicePixelRatio || 1, 1.75);
      D = Math.min(H * 0.26, (W / 2 - 14) / 1.85);                   // tamaño del triángulo de quarks
      [cTop, cBot].forEach(function (c) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
      semilla = 7;
      pintarFondo();
      titilan = [];
      var NT = Math.round(Math.min(110, W * H / 11000));
      for (var i = 0; i < NT; i++) titilan.push({ x: azar() * W, y: azar() * H, f: azar() * TAU, v: 0.4 + azar() * 1.4, r: 0.7 + azar() * 1.2, cruz: azar() < 0.15, z: 0.3 + azar() * 0.7 });
      spLuz = brillo([190, 220, 255], 10, [255, 255, 255]);
      spChispa = brillo([255, 255, 255], 4);
      var rq = D * 0.25;
      QUARKS.forEach(function (q) {
        q.r = rq; q.cuerpo = plasma(q.col, rq); q.halo = brillo(q.col, rq * 3.6, mezcla(q.col, [255, 255, 255], 0.35));
        q.chispas = []; for (var k = 0; k < 46; k++) q.chispas.push({ a: azar() * TAU, v: 0.15 + azar() * 0.5, f: azar(), d: 1.05 + azar() * 1.3, s: 0.6 + azar() * 1.4 });
        q.brillos = []; for (var b = 0; b < 26; b++) { var ang = azar() * TAU, rr = Math.sqrt(azar()) * 0.85; q.brillos.push({ x: Math.cos(ang) * rr, y: Math.sin(ang) * rr, f: azar() * TAU, v: 1 + azar() * 3 }); }
      });
      // órbitas de luz: curvas cerradas que pasan cerca de los tres quarks
      hebras = [];
      var PALH = [[70, 140, 255], [130, 90, 255], [90, 200, 255], [200, 120, 255]];
      for (var h = 0; h < 30; h++) {
        var off = []; for (var j = 0; j < 3; j++) off.push({ r: -0.12 + azar() * 0.62, t: (azar() - 0.5) * 0.7, f: azar() * TAU });
        hebras.push({ off: off, mixta: azar() < 0.6, col: PALH[h % PALH.length], a: 0.12 + azar() * 0.3, w: 0.5 + azar() * 0.9, f: azar() * TAU, vel: 0.04 + azar() * 0.06, u0: azar(), luz: azar() < 0.5, ap: 1.2 + h * 0.045 });
      }
    }

    // fondo: nebulosa filamentosa (ruido fractal con distorsión), galaxia espiral y estrellas
    function pintarFondo() {
      fondo = lienzo(W * DPR, H * DPR);
      var f = fondo.getContext('2d'); f.scale(DPR, DPR);
      var S = 3, nw = Math.ceil(W / S), nh = Math.ceil(H / S), chico = lienzo(nw, nh), gc = chico.getContext('2d'), img = gc.createImageData(nw, nh), px = img.data;
      var esc = 3.2 / Math.max(nw, nh), asp = W > H;
      for (var j = 0; j < nh; j++) for (var i = 0; i < nw; i++) {
        var x = i * esc, y = j * esc, u = i / nw, v = j / nh;
        var q = fbm(x + 0.3, y + 1.1, 4), r = fbm(x + 3.2 * q + 1.7, y + 3.2 * q + 9.2, 5);
        // banda diagonal de la nebulosa (de abajo a la izquierda hacia arriba a la derecha)
        var dl = asp ? v - (0.85 - 0.6 * u) : u - (0.15 + 0.6 * (1 - v)), mask = Math.exp(-(dl / 0.34) * (dl / 0.34)) * 0.9 + 0.3;
        var dens = Math.pow(Math.max(0, (r - 0.36) * 2.6), 1.3) * mask * (0.55 + 0.9 * fbm(x * 4.5 + 11, y * 4.5 + 2, 3));
        dens *= 1 - 0.6 * suave(0.56, 0.72, fbm(x * 2.3 + 7, y * 2.3 + 3, 3));       // franjas de polvo oscuro
        var tc = fbm(x * 0.8 + 20, y * 0.8 + 5, 3), luz = suave(0.62, 0.88, r) * mask;
        var cen = Math.exp(-((u - 0.5) * (u - 0.5) * 5 + (v - 0.52) * (v - 0.52) * 7)) * 0.45;   // centro algo más oscuro
        var k = (1 - cen) * 1.15;
        var gr2 = 0.75 + 0.5 * ruido(i * 1.7, j * 1.7); k *= 0.72 * gr2;
        var R = 2 + (18 + 85 * tc) * dens * k + 110 * luz * dens * k, G = 4 + (40 + 30 * tc) * dens * k + 130 * luz * dens * k, B = 12 + (150 + 70 * tc) * dens * k + 190 * luz * dens * k;
        var o = (j * nw + i) * 4; px[o] = Math.min(255, R); px[o + 1] = Math.min(255, G); px[o + 2] = Math.min(255, B); px[o + 3] = 255;
      }
      gc.putImageData(img, 0, 0);
      f.imageSmoothingEnabled = true; f.imageSmoothingQuality = 'high'; f.drawImage(chico, 0, 0, W, H);
      f.globalCompositeOperation = 'lighter';
      // galaxia espiral, arriba a la derecha
      var gx = W * (asp ? 0.8 : 0.78), gy = H * (asp ? 0.15 : 0.1), gs = m * 0.17;
      f.save(); f.translate(gx, gy); f.rotate(-0.45);
      var disco = f.createRadialGradient(0, 0, 0, 0, 0, gs); disco.addColorStop(0, 'rgba(170,150,255,0.25)'); disco.addColorStop(1, 'rgba(90,70,200,0)');
      f.fillStyle = disco; f.save(); f.scale(1, 0.42); f.beginPath(); f.arc(0, 0, gs, 0, TAU); f.fill(); f.restore();
      for (var a = 0; a < 2; a++) for (var n = 0; n < 1100; n++) {
        var fr = n / 650, rr = gs * (0.06 + 0.94 * fr), th = a * Math.PI + fr * 4.4 + (azar() - 0.5) * 0.5, sp = (azar() - 0.5) * gs * 0.08;
        var xx = Math.cos(th) * rr + sp, yy = (Math.sin(th) * rr + sp) * 0.42;
        f.fillStyle = azar() < 0.3 ? 'rgba(255,200,240,' + (0.25 * (1 - fr)) + ')' : 'rgba(190,190,255,' + (0.06 + 0.25 * (1 - fr)) + ')';
        f.fillRect(xx, yy, 1, 1);
      }
      var nucleo = f.createRadialGradient(0, 0, 0, 0, 0, gs * 0.22); nucleo.addColorStop(0, 'rgba(255,240,250,0.95)'); nucleo.addColorStop(0.4, 'rgba(230,170,255,0.35)'); nucleo.addColorStop(1, 'rgba(160,110,255,0)');
      f.fillStyle = nucleo; f.save(); f.scale(1, 0.6); f.beginPath(); f.arc(0, 0, gs * 0.22, 0, TAU); f.fill(); f.restore();
      f.restore();
      // estrellas: muchas y chicas, algunas con brillo
      var NS = Math.round(Math.min(2200, W * H / 600));
      for (var s = 0; s < NS; s++) {
        var sx = azar() * W, sy = azar() * H, br = Math.pow(azar(), 3), tono = azar();
        var sc = tono < 0.12 ? [255, 215, 200] : tono < 0.45 ? [180, 205, 255] : [235, 240, 255];
        f.fillStyle = rgba(sc, 0.15 + br * 0.75); var tam = 0.5 + br * 1.2; f.fillRect(sx, sy, tam, tam);
        if (br > 0.93) { var gl = f.createRadialGradient(sx, sy, 0, sx, sy, 3 + br * 4); gl.addColorStop(0, rgba(sc, 0.22)); gl.addColorStop(1, rgba(sc, 0)); f.fillStyle = gl; f.fillRect(sx - 9, sy - 9, 18, 18); }
      }
      // polvo de estrellas: grano fino sobre todo el cielo
      for (var pz = 0; pz < Math.min(6000, W * H / 160); pz++) { f.fillStyle = "rgba(170,190,255," + (0.03 + azar() * 0.09) + ")"; f.fillRect(azar() * W, azar() * H, 1, 1); }
      f.globalCompositeOperation = 'source-over';
      // viñeta suave en los bordes
      var vi = f.createRadialGradient(W / 2, H / 2, m * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vi.addColorStop(0, 'rgba(0,0,0,0)'); vi.addColorStop(1, 'rgba(0,0,6,0.5)');
      f.fillStyle = vi; f.fillRect(0, 0, W, H);
    }

    // quark: esfera de plasma con textura granulada, núcleo brillante y borde iluminado
    function plasma(col, r) {
      var R = Math.ceil(r * 1.25), sz = Math.ceil(2 * R * DPR), c = lienzo(sz, sz), g = c.getContext('2d'), img = g.createImageData(sz, sz), px = img.data;
      var claro = mezcla(col, [255, 255, 255], 0.55), k = 9 / sz;
      for (var j = 0; j < sz; j++) for (var i = 0; i < sz; i++) {
        var x = (i + 0.5) / DPR - R, y = (j + 0.5) / DPR - R, rho = Math.hypot(x, y) / r;
        if (rho > 1.02) continue;
        var limbo = Math.sqrt(Math.max(0, 1 - rho * rho)), n = fbm(i * k + col[0] * 0.01, j * k + col[1] * 0.01, 4), n2 = ruido(i * k * 4, j * k * 4);
        var luz = 0.35 + 0.65 * limbo, gran = Math.max(0, n - 0.5) * 2.2 + Math.max(0, n2 - 0.82) * 3;
        var rim = Math.pow(rho, 5) * 0.9, centro = Math.exp(-rho * rho * 6) * 0.9;
        var o = (j * sz + i) * 4;
        px[o] = Math.min(255, col[0] * (luz * (0.55 + 0.6 * n) + rim) + claro[0] * gran * limbo + 255 * centro);
        px[o + 1] = Math.min(255, col[1] * (luz * (0.55 + 0.6 * n) + rim) + claro[1] * gran * limbo + 255 * centro);
        px[o + 2] = Math.min(255, col[2] * (luz * (0.55 + 0.6 * n) + rim) + claro[2] * gran * limbo + 255 * centro);
        px[o + 3] = 255 * Math.min(1, (1.02 - rho) * 25);
      }
      g.putImageData(img, 0, 0); c.R = R; return c;
    }

    // posición de cada quark: el triángulo de la referencia, con un vaivén suave
    function posiciones(t, abre) {
      var cx = W / 2, cy = H / 2 + D * 0.03, rot = 0.05 * Math.sin(t * 0.21), k = 1 + abre * 1.2, cr = Math.cos(rot), sr = Math.sin(rot);
      return QUARKS.map(function (q, i) {
        var bx = q.base[0] * D * k + Math.sin(t * 0.5 + q.fase) * D * 0.04, by = q.base[1] * D * k + Math.cos(t * 0.41 + q.fase * 1.3) * D * 0.035;
        return { q: q, i: i, x: cx + bx * cr - by * sr, y: cy + bx * sr + by * cr };
      });
    }

    // curva cerrada (Catmull-Rom) por tres puntos: devuelve los 3 arcos como listas de puntos
    function arcos(Q) {
      var out = [];
      for (var i = 0; i < 3; i++) {
        var p0 = Q[(i + 2) % 3], p1 = Q[i], p2 = Q[(i + 1) % 3], p3 = Q[(i + 2) % 3], pts = [];
        for (var s = 0; s <= 18; s++) {
          var t = s / 18, t2 = t * t, t3 = t2 * t;
          pts.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
        }
        out.push(pts);
      }
      return out;
    }

    function cuadro(now) {
      var ts = reducido ? 99 : (now - t0) / 1000, t = reducido ? 8 : ts, abre = estado === 'go' ? Math.min(1, (now - tGo) / 1500) : 0, g = gTop;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.drawImage(fondo, 0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      // estrellas que titilan
      for (var i = 0; i < titilan.length; i++) {
        var e = titilan[i], tw = 0.5 + 0.5 * Math.sin(t * e.v + e.f), x = e.x + Math.sin(t * 0.05) * 8 * e.z, y = e.y + Math.cos(t * 0.04) * 5 * e.z;
        g.globalAlpha = (0.2 + 0.7 * tw) * e.z; g.fillStyle = '#e6eeff'; g.fillRect(x - e.r / 2, y - e.r / 2, e.r, e.r);
        if (e.cruz) { g.globalAlpha *= 0.45; g.fillRect(x - e.r * 3.5, y - 0.3, e.r * 7, 0.6); g.fillRect(x - 0.3, y - e.r * 3.5, 0.6, e.r * 7); }
      }
      g.globalAlpha = 1;

      var P = posiciones(t, abre);
      var cx = (P[0].x + P[1].x + P[2].x) / 3, cy = (P[0].y + P[1].y + P[2].y) / 3;
      var apQ = P.map(function (p, i) { return suave(0.5 + i * 0.25, 1.3 + i * 0.25, ts); });   // los quarks aparecen de a uno

      // órbitas de luz que enlazan los tres quarks
      for (var h = 0; h < hebras.length; h++) {
        var hb = hebras[h], al = suave(hb.ap, hb.ap + 0.7, ts) * (1 - abre);
        if (al <= 0) continue;
        var Q = P.map(function (p, k) { var o = hb.off[k], dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1, rr = o.r + 0.05 * Math.sin(t * 0.35 + o.f), tt = o.t + 0.04 * Math.sin(t * 0.29 + o.f);
          return [p.x + dx / L * rr * D - dy / L * tt * D, p.y + dy / L * rr * D + dx / L * tt * D]; });
        var A = arcos(Q), inten = hb.a * al * (0.7 + 0.3 * Math.sin(t * 0.5 + hb.f));
        for (var k = 0; k < 3; k++) {
          var pts = A[k], c1 = hb.mixta ? P[k].q.col : hb.col, c2 = hb.mixta ? P[(k + 1) % 3].q.col : hb.col;
          var gr = g.createLinearGradient(pts[0][0], pts[0][1], pts[18][0], pts[18][1]);
          gr.addColorStop(0, rgba(c1, inten)); gr.addColorStop(0.5, rgba(mezcla(c1, c2, 0.5).map(function (v, n) { return Math.min(255, v + 40); }), inten * 0.8)); gr.addColorStop(1, rgba(c2, inten));
          g.strokeStyle = gr; g.lineWidth = hb.w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var s = 1; s < pts.length; s++) g.lineTo(pts[s][0], pts[s][1]); g.stroke();
        }
        if (hb.luz) {   // luz que recorre la órbita
          var u = ((hb.u0 + t * hb.vel) % 1) * 3, ka = Math.floor(u), fr = u - ka, pa = A[ka % 3], idx = fr * 18, i0 = Math.floor(idx), f0 = idx - i0, pp = pa[Math.min(18, i0)], pn = pa[Math.min(18, i0 + 1)];
          var lx = pp[0] + (pn[0] - pp[0]) * f0, ly = pp[1] + (pn[1] - pp[1]) * f0;
          g.globalAlpha = al * 0.9; g.drawImage(spLuz, lx - 6, ly - 6, 12, 12); g.globalAlpha = 1;
        }
      }

      // quarks
      P.forEach(function (p, i) { if (apQ[i] > 0) quark(g, p, t, abre, apQ[i]); });
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      // entrada desde el negro
      if (ts < 0.9) { g.fillStyle = 'rgba(1,2,8,' + (1 - suave(0, 0.9, ts)) + ')'; g.fillRect(0, 0, W, H); }
      // la mitad de abajo muestra la misma escena
      gBot.setTransform(1, 0, 0, 1, 0, 0); gBot.drawImage(cTop, 0, 0);
      if (!listo && ts > 1.9) { listo = true; ov.classList.add('mqi-listo'); }
      if (!reducido && estado !== 'fin') raf = requestAnimationFrame(cuadro);
    }
    var listo = false;

    function quark(g, p, t, abre, ap) {
      var q = p.q, esc = (0.6 + 0.4 * ap) * (1 + 0.035 * Math.sin(t * 1.8 + q.fase) + abre * 0.3), r = q.r * esc;
      // halo volumétrico
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.75 * ap; var Hh = q.r * 3.6 * esc; g.drawImage(q.halo, p.x - Hh, p.y - Hh, 2 * Hh, 2 * Hh);
      // chispas que salen de la superficie y se apagan
      for (var i = 0; i < q.chispas.length; i++) {
        var c = q.chispas[i], vida = (t * c.v + c.f) % 1, d = r * (c.d + vida * 0.9), a = c.a + t * 0.12;
        g.globalAlpha = ap * Math.sin(Math.PI * vida) * 0.85; var s = 2.5 * c.s;
        g.drawImage(spChispa, p.x + Math.cos(a) * d - s, p.y + Math.sin(a) * d * 0.9 - s, 2 * s, 2 * s);
        g.globalAlpha *= 0.6; g.fillStyle = rgba(mezcla(q.col, [255, 255, 255], 0.5), 1); g.fillRect(p.x + Math.cos(a) * d - 0.6, p.y + Math.sin(a) * d * 0.9 - 0.6, 1.2, 1.2);
      }
      // la esfera de plasma (gira apenas)
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = ap;
      var R = q.cuerpo.R * esc; g.save(); g.translate(p.x, p.y); g.rotate(t * 0.06 + q.fase); g.drawImage(q.cuerpo, -R, -R, 2 * R, 2 * R); g.restore();
      // destellos que titilan dentro de la esfera
      g.globalCompositeOperation = 'lighter';
      for (var b = 0; b < q.brillos.length; b++) {
        var br = q.brillos[b], tw = Math.max(0, Math.sin(t * br.v + br.f)); if (tw < 0.2) continue;
        g.globalAlpha = ap * tw * 0.9; var ss = 1.5 + tw * 2.5; g.drawImage(spChispa, p.x + br.x * r - ss, p.y + br.y * r - ss, 2 * ss, 2 * ss);
      }
      g.globalAlpha = 1;
    }

    medir(); cuadro(performance.now());
    if (reducido) ov.classList.add('mqi-listo');
    var rz = 0; window.addEventListener('resize', onResize);
    function onResize() { clearTimeout(rz); rz = setTimeout(function () { medir(); if (reducido) cuadro(performance.now()); }, 150); }

    // ---------- entrada y salida ----------
    function marcar() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }
    function terminar() {
      if (estado === 'fin') return; estado = 'fin';
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey);
      inertes.forEach(function (p) { p[0].removeAttribute('inert'); if (p[1] === null) p[0].removeAttribute('aria-hidden'); else p[0].setAttribute('aria-hidden', p[1]); });
      ov.remove(); limpiar(); marcar();
    }
    function ingresar() {
      if (estado !== 'idle') return;               // un solo clic cuenta
      btn.disabled = true; skip.disabled = true; marcar(); ov.classList.add('mqi-listo');
      if (reducido) { estado = 'fade'; ov.classList.add('mqi-fade'); setTimeout(terminar, 400); return; }
      // respuesta breve del botón y después la apertura
      estado = 'press'; ov.classList.add('mqi-press');
      setTimeout(function () {
        estado = 'go'; tGo = performance.now(); ov.classList.add('mqi-go');
        bot.addEventListener('transitionend', function (e) { if (e.target === bot && e.propertyName === 'transform') terminar(); });
        setTimeout(terminar, 2600);                 // por si el navegador no avisa el fin de la transición
      }, 260);
    }
    function onKey(e) { if (e.key === 'Escape') terminar(); }
    btn.addEventListener('click', ingresar);
    skip.addEventListener('click', terminar);
    document.addEventListener('keydown', onKey);
  }
})();
