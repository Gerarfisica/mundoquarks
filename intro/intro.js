/* ================= Intro de Mundo Quarks =================
   Pantalla de entrada: espacio profundo, tres quarks luminosos unidos por hebras de energía y un botón «INGRESAR».
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
      '<div class="mqi-seam" aria-hidden="true"></div>' +
      '<button type="button" class="mqi-enter"><span>INGRESAR</span>' +
      '<svg class="mqi-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
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
    var semilla = 7;
    function azar() { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }
    function lienzo(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
    // resplandor radial pre-dibujado (se estampa con drawImage: mucho más barato que crear gradientes en cada cuadro)
    function brillo(col, r, nucleo) {
      var c = lienzo(2 * r, 2 * r), g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, rgba(nucleo || col, 1)); gr.addColorStop(0.18, rgba(col, 0.55)); gr.addColorStop(0.5, rgba(col, 0.14)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 2 * r, 2 * r); return c;
    }

    // ---------- escena ----------
    var W = 0, H = 0, DPR = 1, m = 0, fondo = null, raf = 0, t0 = performance.now(), estado = 'idle', tGo = 0;
    var titilan = [], polvo = [], hebras = [], spLuz = null, spPolvo = null;
    var QUARKS = [
      { col: [70, 200, 255], fase: 0.0 },    // azul cian
      { col: [255, 92, 38], fase: 2.3 },     // rojo anaranjado
      { col: [40, 222, 140], fase: 4.4 }     // verde esmeralda
    ];
    // superficie de partículas: puntos repartidos sobre una esfera (espiral de Fibonacci)
    var SUP = [];
    (function () { var N = 90, ga = Math.PI * (3 - Math.sqrt(5)); for (var i = 0; i < N; i++) { var y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y); SUP.push([Math.cos(ga * i) * r, y, Math.sin(ga * i) * r]); } })();

    function medir() {
      W = ov.clientWidth || innerWidth; H = ov.clientHeight || innerHeight; m = Math.min(W, H);
      DPR = Math.min(window.devicePixelRatio || 1, 1.75);
      [cTop, cBot].forEach(function (c) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
      semilla = 7;
      pintarFondo();
      // estrellas brillantes que titilan, en tres profundidades
      titilan = [];
      var NT = Math.round(Math.min(90, W * H / 14000));
      for (var i = 0; i < NT; i++) titilan.push({ x: azar() * W, y: azar() * H, z: 0.3 + azar() * 0.7, f: azar() * TAU, v: 0.3 + azar() * 1.2, r: 0.6 + azar() * 1.1, cruz: azar() < 0.12, tinte: azar() });
      // polvo luminoso que flota delante y detrás (sensación de profundidad)
      polvo = [];
      var NP = Math.round(Math.min(46, W * H / 30000));
      for (var j = 0; j < NP; j++) polvo.push({ x: azar() * W, y: azar() * H, z: azar(), f: azar() * TAU, vx: (azar() - 0.5) * 6, vy: -2 - azar() * 5 });
      spLuz = brillo([200, 235, 255], 10, [255, 255, 255]);
      spPolvo = brillo([120, 160, 255], 12, [190, 215, 255]);
      // sprites de cada quark según su tamaño
      var rq = Math.max(13, Math.min(26, m * 0.032));
      QUARKS.forEach(function (q) { q.r = rq; q.sprite = esfera(q.col, rq); q.halo = brillo(q.col, rq * 7, mezcla(q.col, [255, 255, 255], 0.3)); });
      // hebras de energía: varias por cada par de quarks
      hebras = [];
      [[0, 1], [1, 2], [2, 0]].forEach(function (p, k) {
        [-0.16, 0.04, 0.2, 0.36].forEach(function (b, s) {
          hebras.push({ a: p[0], b: p[1], bow: b, f: azar() * TAU, w: 0.25 + azar() * 0.35, vel: 0.05 + azar() * 0.07, u0: azar(), luces: s % 2 === 0 ? 2 : 1, k: k });
        });
      });
    }

    function pintarFondo() {
      fondo = lienzo(W * DPR, H * DPR);
      var f = fondo.getContext('2d'); f.scale(DPR, DPR);
      // negro azulado de base, un poco más claro hacia los bordes
      var base = f.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
      base.addColorStop(0, '#010208'); base.addColorStop(0.6, '#03061a'); base.addColorStop(1, '#050a22');
      f.fillStyle = base; f.fillRect(0, 0, W, H);
      // nebulosas: muchas nubes tenues superpuestas, lejos del centro
      var PAL = [[40, 70, 190], [95, 55, 185], [60, 40, 150], [25, 110, 170], [140, 60, 170]];
      f.globalCompositeOperation = 'lighter';
      var focos = [[0.12, 0.2], [0.88, 0.78], [0.82, 0.12], [0.18, 0.88], [0.5, -0.05], [1.05, 0.45]];
      focos.forEach(function (fo, n) {
        var cx = fo[0] * W, cy = fo[1] * H, esc = Math.max(W, H) * (0.22 + azar() * 0.18), col = PAL[n % PAL.length];
        for (var i = 0; i < 64; i++) {
          var a = azar() * TAU, d = Math.pow(azar(), 0.7) * esc, x = cx + Math.cos(a) * d * 1.4, y = cy + Math.sin(a) * d * 0.8;
          var r = esc * (0.14 + azar() * 0.42), c = mezcla(col, PAL[(n + 1 + (i % 3)) % PAL.length], azar() * 0.5);
          var gr = f.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, rgba(c, 0.022 + azar() * 0.022)); gr.addColorStop(0.5, rgba(c, 0.01)); gr.addColorStop(1, rgba(c, 0));
          f.fillStyle = gr; f.fillRect(x - r, y - r, 2 * r, 2 * r);
        }
      });
      // filamentos más brillantes en las nubes
      for (var k = 0; k < 26; k++) {
        var fo2 = focos[k % focos.length], x2 = fo2[0] * W + (azar() - 0.5) * W * 0.3, y2 = fo2[1] * H + (azar() - 0.5) * H * 0.25, r2 = 8 + azar() * 40;
        var g2 = f.createRadialGradient(x2, y2, 0, x2, y2, r2), c2 = PAL[k % PAL.length];
        g2.addColorStop(0, rgba(mezcla(c2, [200, 210, 255], 0.4), 0.06)); g2.addColorStop(1, rgba(c2, 0));
        f.fillStyle = g2; f.fillRect(x2 - r2, y2 - r2, 2 * r2, 2 * r2);
      }
      f.globalCompositeOperation = 'source-over';
      // el centro queda oscuro para que se destaquen los quarks y el botón
      var cen = f.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, m * 0.62);
      cen.addColorStop(0, 'rgba(1,2,8,0.88)'); cen.addColorStop(0.55, 'rgba(1,2,8,0.45)'); cen.addColorStop(1, 'rgba(1,2,8,0)');
      f.fillStyle = cen; f.fillRect(0, 0, W, H);
      // estrellas fijas: muchas y muy chicas, con algo de color
      var NS = Math.round(Math.min(1400, W * H / 900));
      for (var s = 0; s < NS; s++) {
        var sx = azar() * W, sy = azar() * H, br = Math.pow(azar(), 3), dc = Math.hypot(sx - W / 2, sy - H / 2) / (m * 0.5);
        var tono = azar(), sc = tono < 0.15 ? [255, 220, 200] : tono < 0.4 ? [190, 210, 255] : [235, 240, 255];
        f.fillStyle = rgba(sc, (0.12 + br * 0.7) * Math.min(1, 0.35 + dc * 0.6));
        var tam = 0.5 + br * 1.1; f.fillRect(sx, sy, tam, tam);
      }
      // viñeta suave en los bordes
      var vi = f.createRadialGradient(W / 2, H / 2, m * 0.5, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vi.addColorStop(0, 'rgba(0,0,0,0)'); vi.addColorStop(1, 'rgba(0,0,4,0.55)');
      f.fillStyle = vi; f.fillRect(0, 0, W, H);
    }

    // esfera de energía: resplandor, cuerpo con relieve y núcleo blanco
    function esfera(col, r) {
      var R = r * 2.6, c = lienzo(2 * R * DPR, 2 * R * DPR), g = c.getContext('2d'); g.scale(DPR, DPR);
      var claro = mezcla(col, [255, 255, 255], 0.55), oscuro = mezcla(col, [0, 0, 20], 0.45);
      g.globalCompositeOperation = 'lighter';
      var h = g.createRadialGradient(R, R, r * 0.6, R, R, R); h.addColorStop(0, rgba(col, 0.5)); h.addColorStop(0.4, rgba(col, 0.16)); h.addColorStop(1, rgba(col, 0));
      g.fillStyle = h; g.fillRect(0, 0, 2 * R, 2 * R);
      g.globalCompositeOperation = 'source-over';
      var b = g.createRadialGradient(R - r * 0.35, R - r * 0.35, r * 0.05, R, R, r);
      b.addColorStop(0, rgba(claro, 1)); b.addColorStop(0.45, rgba(col, 0.95)); b.addColorStop(0.85, rgba(oscuro, 0.9)); b.addColorStop(1, rgba(col, 0.6));
      g.fillStyle = b; g.beginPath(); g.arc(R, R, r, 0, TAU); g.fill();
      g.globalCompositeOperation = 'lighter';
      var n = g.createRadialGradient(R, R, 0, R, R, r * 0.75); n.addColorStop(0, 'rgba(255,255,255,0.95)'); n.addColorStop(0.35, rgba(claro, 0.55)); n.addColorStop(1, rgba(col, 0));
      g.fillStyle = n; g.beginPath(); g.arc(R, R, r * 0.75, 0, TAU); g.fill();
      // borde iluminado (como una atmósfera)
      g.strokeStyle = rgba(claro, 0.35); g.lineWidth = 1.2; g.beginPath(); g.arc(R, R, r - 0.6, 0, TAU); g.stroke();
      c.R = R; return c;
    }

    // posición de cada quark: órbita lenta con variaciones suaves, nunca mecánica
    function posiciones(t, abre) {
      var cx = W / 2, cy = H / 2;
      var rx = Math.max(Math.min(W * 0.3, 340), 140 + m * 0.07), ry = Math.min(H * 0.29, 270);
      var k = 1 + abre * 1.1, giro = t * 0.11 + abre * abre * 1.4;
      return QUARKS.map(function (q, i) {
        var a = giro + i * TAU / 3 + 0.22 * Math.sin(t * 0.37 + q.fase) + 0.1 * Math.sin(t * 0.91 + 2 * q.fase);
        var rr = k * (1 + 0.07 * Math.sin(t * 0.53 + q.fase));
        var z = Math.sin(a + 0.6);
        return { q: q, i: i, x: cx + Math.cos(a) * rx * rr + 8 * Math.sin(t * 0.7 + q.fase), y: cy + Math.sin(a) * ry * rr + 7 * Math.sin(t * 1.1 + q.fase * 1.3), z: z, s: 1 + 0.12 * z };
      });
    }

    function cuadro(now) {
      var t = reducido ? 8 : (now - t0) / 1000, abre = estado === 'go' ? Math.min(1, (now - tGo) / 1500) : 0, g = gTop;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.drawImage(fondo, 0, 0, W, H);
      g.globalCompositeOperation = 'lighter';

      // estrellas que titilan (las más cercanas se desplazan un poco: paralaje)
      for (var i = 0; i < titilan.length; i++) {
        var e = titilan[i], tw = 0.5 + 0.5 * Math.sin(t * e.v + e.f), x = e.x + Math.sin(t * 0.05) * 10 * e.z, y = e.y + Math.cos(t * 0.04) * 6 * e.z;
        g.globalAlpha = (0.25 + 0.6 * tw) * e.z; g.fillStyle = e.tinte < 0.3 ? '#cfe0ff' : '#ffffff';
        g.fillRect(x - e.r / 2, y - e.r / 2, e.r, e.r);
        if (e.cruz) { g.globalAlpha *= 0.5; g.fillRect(x - e.r * 3, y - 0.3, e.r * 6, 0.6); g.fillRect(x - 0.3, y - e.r * 3, 0.6, e.r * 6); }
      }
      // polvo luminoso, desenfocado según la profundidad
      for (var j = 0; j < polvo.length; j++) {
        var p = polvo[j], px = ((p.x + p.vx * t * (0.4 + p.z)) % W + W) % W, py = ((p.y + p.vy * t * (0.4 + p.z)) % H + H) % H, s = 2 + p.z * 7;
        g.globalAlpha = (0.05 + 0.12 * p.z) * (0.6 + 0.4 * Math.sin(t * 0.8 + p.f));
        g.drawImage(spPolvo, px - s, py - s, 2 * s, 2 * s);
      }
      g.globalAlpha = 1;

      var P = posiciones(t, abre);
      var cx = W / 2, cy = H / 2;
      // hebras de energía entre cada par de quarks
      for (var h = 0; h < hebras.length; h++) {
        var hb = hebras[h], A = P[hb.a], B = P[hb.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
        // la curva se arquea hacia afuera del centro (lejos del botón); el arco respira despacio
        var nx = -dy / L, ny = dx / L; if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        var bow = (hb.bow + 0.05 * Math.sin(t * 0.4 + hb.f)) * L, qx = mx + nx * bow, qy = my + ny * bow;
        var inten = hb.w * (0.65 + 0.35 * Math.sin(t * 0.55 + hb.f)) * (1 - abre * 0.6);
        var gr = g.createLinearGradient(A.x, A.y, B.x, B.y);
        gr.addColorStop(0, rgba(A.q.col, inten)); gr.addColorStop(0.5, 'rgba(210,225,255,' + inten * 0.7 + ')'); gr.addColorStop(1, rgba(B.q.col, inten));
        g.strokeStyle = gr; g.lineWidth = 3.2; g.globalAlpha = 0.18; g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(qx, qy, B.x, B.y); g.stroke();
        g.lineWidth = 0.9; g.globalAlpha = 1; g.stroke();
        // luces que recorren la hebra
        for (var l = 0; l < hb.luces; l++) {
          var u = ((hb.u0 + l / hb.luces + t * hb.vel * (l % 2 ? -1 : 1)) % 1 + 1) % 1, w1 = (1 - u) * (1 - u), w2 = 2 * u * (1 - u), w3 = u * u;
          var lx = w1 * A.x + w2 * qx + w3 * B.x, ly = w1 * A.y + w2 * qy + w3 * B.y, rr = 5 + 3 * Math.sin(Math.PI * u);
          g.globalAlpha = Math.sin(Math.PI * u) * 0.85 * (1 - abre * 0.5); g.drawImage(spLuz, lx - rr, ly - rr, 2 * rr, 2 * rr);
        }
      }
      g.globalAlpha = 1;

      // quarks: primero los de atrás
      P.slice().sort(function (a, b) { return a.z - b.z; }).forEach(function (p) { quark(g, p, t, abre); });
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      // la mitad de abajo muestra la misma escena
      gBot.setTransform(1, 0, 0, 1, 0, 0); gBot.drawImage(cTop, 0, 0);
      if (!reducido && estado !== 'fin') raf = requestAnimationFrame(cuadro);
    }

    function quark(g, p, t, abre) {
      var q = p.q, r = q.r * p.s, pul = 1 + 0.05 * Math.sin(t * 2.2 + q.fase) + abre * 0.4, claro = mezcla(q.col, [255, 255, 255], 0.6);
      // resplandor volumétrico (sprite grande y tenue)
      var Hh = q.r * 7 * p.s * pul; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(q.halo, p.x - Hh, p.y - Hh, 2 * Hh, 2 * Hh);
      // partículas en órbita alrededor de la esfera
      g.globalAlpha = 1; g.fillStyle = rgba(claro, 1);
      for (var i = 0; i < 26; i++) {
        var ph = q.fase * 3 + i * 2.39996, ro = r * (1.45 + 1.4 * ((i * 0.6180339) % 1)), sp = 0.5 + ((i * 0.37) % 1) * 0.9, a = ph + t * sp * (i % 2 ? 1 : -0.8), inc = 0.5 + 0.9 * ((i * 0.27) % 1);
        var ox = Math.cos(a) * ro, oz = Math.sin(a) * ro, oy = oz * Math.sin(inc) * 0.6 + Math.sin(t * 0.9 + ph) * r * 0.25;
        var dep = oz / ro;                                // −1 atrás, 1 adelante
        if (dep < -0.2 && Math.hypot(ox, oy) < r) continue;  // oculta por la esfera
        g.globalAlpha = (0.25 + 0.55 * (0.5 + 0.5 * dep)) * (0.6 + 0.4 * Math.sin(t * 3 + i)); var sz = 0.8 + 0.9 * (0.5 + 0.5 * dep);
        g.fillRect(p.x + ox - sz / 2, p.y + oy - sz / 2, sz, sz);
      }
      // la esfera
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      var R = q.sprite.R * p.s * pul; g.drawImage(q.sprite, p.x - R, p.y - R, 2 * R, 2 * R);
      // textura de partículas en la superficie, que gira despacio
      g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(claro, 1);
      var ay = t * 0.35 + q.fase, ca = Math.cos(ay), sa = Math.sin(ay), ct = Math.cos(0.45), st = Math.sin(0.45), rs = r * pul;
      for (var k = 0; k < SUP.length; k++) {
        var v = SUP[k], x1 = v[0] * ca + v[2] * sa, z1 = -v[0] * sa + v[2] * ca, y1 = v[1] * ct - z1 * st, z2 = v[1] * st + z1 * ct;
        if (z2 < 0.05) continue;
        g.globalAlpha = 0.12 + 0.5 * z2 * (0.6 + 0.4 * Math.sin(t * 4 + k));
        g.fillRect(p.x + x1 * rs - 0.6, p.y + y1 * rs - 0.6, 1.2, 1.2);
      }
      g.globalAlpha = 1;
    }

    medir(); cuadro(performance.now());
    var rz = 0; window.addEventListener('resize', onResize);
    function onResize() { clearTimeout(rz); rz = setTimeout(function () { medir(); if (reducido) cuadro(performance.now()); }, 120); }

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
      btn.disabled = true; skip.disabled = true; marcar();
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
