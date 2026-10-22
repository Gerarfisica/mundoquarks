/* ================= Intro de Mundo Quarks =================
   Pantalla de entrada con tres quarks unidos por tubos de flujo de gluones y un botón «INGRESAR».
   Al pulsarlo, la escena se parte en dos mitades que se separan (arriba y abajo) y deja ver la portada.
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
      '<div class="mqi-half mqi-top"><canvas aria-hidden="true"></canvas></div>' +
      '<div class="mqi-half mqi-bot"><canvas aria-hidden="true"></canvas></div>' +
      '<div class="mqi-seam" aria-hidden="true"></div>' +
      '<button type="button" class="mqi-enter">INGRESAR</button>' +
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

    // ---------- escena ----------
    var W = 0, H = 0, DPR = 1, fondo = null, estrellas = [], raf = 0, t0 = performance.now(), estado = 'idle', tGo = 0;
    var QUARKS = [
      { col: [61, 139, 255], fase: 0.0 },     // azul
      { col: [255, 96, 40], fase: 2.1 },      // rojo anaranjado
      { col: [54, 224, 138], fase: 4.2 }      // verde
    ];
    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function azar(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

    function medir() {
      W = ov.clientWidth || innerWidth; H = ov.clientHeight || innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 2);
      [cTop, cBot].forEach(function (c) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
      // fondo fijo: nebulosas tenues en un lienzo aparte, se dibuja una vez por tamaño
      fondo = document.createElement('canvas'); fondo.width = cTop.width; fondo.height = cTop.height;
      var f = fondo.getContext('2d'); f.scale(DPR, DPR);
      f.fillStyle = '#02030a'; f.fillRect(0, 0, W, H);
      [[0.22, 0.30, 0.55, [70, 40, 140], 0.20], [0.80, 0.68, 0.60, [20, 80, 150], 0.18], [0.62, 0.18, 0.35, [140, 40, 90], 0.10], [0.30, 0.85, 0.40, [20, 110, 110], 0.10]]
        .forEach(function (n) {
          var r = n[2] * Math.max(W, H), g = f.createRadialGradient(n[0] * W, n[1] * H, 0, n[0] * W, n[1] * H, r);
          g.addColorStop(0, rgba(n[3], n[4])); g.addColorStop(1, rgba(n[3], 0)); f.fillStyle = g; f.fillRect(0, 0, W, H);
        });
      var N = Math.min(420, Math.round(W * H / 2600)); estrellas = [];
      for (var i = 0; i < N; i++) estrellas.push({ x: azar(i) * W, y: azar(i + 1e3) * H, r: 0.3 + azar(i + 2e3) * 1.1, f: azar(i + 3e3) * 6.28, v: 0.4 + azar(i + 4e3) * 1.6 });
    }

    // posición de cada quark: órbitas curvas alrededor del centro, con perspectiva
    function posiciones(t, abre) {
      var cx = W / 2, cy = H / 2, m = Math.min(W, H);
      var R = Math.min(Math.max(m * 0.28, 140), m * 0.42) * (1 + abre * 0.9), giro = t * 0.32 * (1 + abre * 3);
      return QUARKS.map(function (q, i) {
        var a = giro + i * 2.094 + 0.38 * Math.sin(t * 0.83 + q.fase), rr = R * (1 + 0.16 * Math.sin(t * 1.21 + q.fase * 1.7));
        var x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.62, z = Math.sin(a);
        var inc = 0.35 * Math.sin(t * 0.17);                       // la órbita se inclina despacio
        return { q: q, x: cx + x * Math.cos(inc) - y * Math.sin(inc), y: cy + x * Math.sin(inc) + y * Math.cos(inc), z: z, s: 1 + 0.22 * z };
      });
    }

    // tubo de flujo de color: una cuerda ondulante y luminosa del quark al punto de unión
    function tubo(g, a, b, col, t, k) {
      var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, N = 40, pts = [];
      for (var i = 0; i <= N; i++) {
        var u = i / N, amp = 5 * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(t * 2 + k));
        var w = amp * Math.sin(u * 14 - t * 6 + k);
        pts.push([a.x + dx * u + nx * w, a.y + dy * u + ny * w]);
      }
      [[9, 0.07], [4, 0.18], [1.6, 0.75]].forEach(function (p) {
        var gr = g.createLinearGradient(a.x, a.y, b.x, b.y);
        gr.addColorStop(0, rgba(col, p[1])); gr.addColorStop(1, 'rgba(235,240,255,' + p[1] + ')');
        g.strokeStyle = gr; g.lineWidth = p[0]; g.beginPath();
        pts.forEach(function (q, i) { i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke();
      });
    }

    function quark(g, p, t) {
      var r = 15 * p.s, pul = 1 + 0.08 * Math.sin(t * 3 + p.q.fase);
      var halo = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4.2 * pul);
      halo.addColorStop(0, rgba(p.q.col, 0.55)); halo.addColorStop(0.35, rgba(p.q.col, 0.16)); halo.addColorStop(1, rgba(p.q.col, 0));
      g.fillStyle = halo; g.beginPath(); g.arc(p.x, p.y, r * 4.2 * pul, 0, 6.2832); g.fill();
      var nucleo = g.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 0, p.x, p.y, r);
      nucleo.addColorStop(0, '#ffffff'); nucleo.addColorStop(0.35, rgba(p.q.col.map(function (c) { return Math.min(255, c + 90); }), 1)); nucleo.addColorStop(1, rgba(p.q.col, 0.9));
      g.fillStyle = nucleo; g.beginPath(); g.arc(p.x, p.y, r, 0, 6.2832); g.fill();
    }

    function cuadro(now) {
      var t = (now - t0) / 1000, abre = estado === 'go' ? Math.min(1, (now - tGo) / 1400) : 0, g = gTop;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.drawImage(fondo, 0, 0, W, H);
      // estrellas que titilan
      g.fillStyle = '#dfe8ff';
      for (var i = 0; i < estrellas.length; i++) {
        var e = estrellas[i]; g.globalAlpha = reducido ? 0.6 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * e.v + e.f));
        g.fillRect(e.x, e.y, e.r * 1.4, e.r * 1.4);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
      var P = posiciones(t, abre);
      // punto de unión de los tres tubos (modelo «en Y» del barión)
      var J = { x: (P[0].x + P[1].x + P[2].x) / 3, y: (P[0].y + P[1].y + P[2].y) / 3 };
      P.forEach(function (p, i) { tubo(g, p, J, p.q.col, t, i * 2.1); });
      var nj = g.createRadialGradient(J.x, J.y, 0, J.x, J.y, 22);
      nj.addColorStop(0, 'rgba(235,240,255,.55)'); nj.addColorStop(1, 'rgba(235,240,255,0)'); g.fillStyle = nj; g.beginPath(); g.arc(J.x, J.y, 22, 0, 6.2832); g.fill();
      // gluones que viajan entre pares de quarks por arcos curvos
      for (var k = 0; k < 3; k++) {
        var a = P[k], b = P[(k + 1) % 3], u = ((t * 0.55 + k / 3) % 1), mx = (a.x + b.x) / 2 + (J.x - (a.x + b.x) / 2) * -0.6, my = (a.y + b.y) / 2 + (J.y - (a.y + b.y) / 2) * -0.6;
        var x = (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * mx + u * u * b.x, y = (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * my + u * u * b.y;
        var gg = g.createRadialGradient(x, y, 0, x, y, 9); gg.addColorStop(0, 'rgba(255,255,255,.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = Math.sin(Math.PI * u); g.fillStyle = gg; g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.fill(); g.globalAlpha = 1;
      }
      P.slice().sort(function (a, b) { return a.z - b.z; }).forEach(function (p) { quark(g, p, t); });
      g.globalCompositeOperation = 'source-over';
      // la mitad de abajo muestra la misma escena
      gBot.setTransform(1, 0, 0, 1, 0, 0); gBot.drawImage(cTop, 0, 0);
      if (!reducido && estado !== 'fin') raf = requestAnimationFrame(cuadro);
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
      estado = 'go'; tGo = performance.now(); ov.classList.add('mqi-go');
      bot.addEventListener('transitionend', function (e) { if (e.propertyName === 'transform') terminar(); });
      setTimeout(terminar, 2400);                   // por si el navegador no avisa el fin de la transición
    }
    function onKey(e) { if (e.key === 'Escape') terminar(); }
    btn.addEventListener('click', ingresar);
    skip.addEventListener('click', terminar);
    document.addEventListener('keydown', onKey);
  }
})();
