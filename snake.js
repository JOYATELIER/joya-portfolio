// ============================================================
// JOYA — huevo de pascua: snake escondido
//
// No hay ningún botón visible. Se abre de dos maneras:
//   · teclado  -> el código Konami: ↑ ↑ ↓ ↓ ← → ← → B A
//   · táctil   -> mantener pulsado el logotipo de la cabecera 900 ms
//
// El segundo existe porque en un móvil no hay flechas. La pulsación
// larga cancela el clic del logo, así que no navega al home.
//
// Para cambiar el disparador, tocar KONAMI o HOLD_MS aquí abajo.
// Para quitar el juego entero, borrar este archivo y su <script>.
// ============================================================
(() => {
  'use strict';

  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const HOLD_MS = 900;

  const INK = '#121210';
  const PAPER = '#ffffff';
  const GRAY = '#8c8c87';
  const HAIRLINE = '#e4e4e1';
  const RED = '#ED1C24';   // el rojo original de JOYA, por si no carga el icono

  // La "manzana" es el favicon: el cuadrado rojo con la J. La ruta se lee
  // del propio <head>, así resuelve bien tanto desde la raíz como desde
  // /en/ o /projects/. Se usa el PNG de 180 px y no el SVG porque algunos
  // navegadores no saben a qué tamaño dibujar un SVG sin width/height.
  const apple = document.querySelector('link[rel="apple-touch-icon"]');
  const icon = apple || document.querySelector('link[rel="icon"][sizes]');
  let foodImg = null;
  if (icon) {
    const img = new Image();
    img.onload = () => { foodImg = img; };
    img.src = icon.href;
  }

  const CELLS = 21;        // tablero cuadrado de 21 x 21
  const START_MS = 130;    // milisegundos por paso al empezar
  const MIN_MS = 70;       // tope de velocidad
  const BEST_KEY = 'joya-snake-best';

  let overlay = null;

  // ---------- apertura ----------

  let progress = 0;
  document.addEventListener('keydown', (e) => {
    if (overlay) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progress = (key === KONAMI[progress]) ? progress + 1 : (key === KONAMI[0] ? 1 : 0);
    if (progress === KONAMI.length) { progress = 0; open(); }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.header-logo') || document.querySelector('.splash-logo');
    if (!logo) return;
    let timer = null, fired = false;

    const start = () => {
      fired = false;
      timer = setTimeout(() => { fired = true; open(); }, HOLD_MS);
    };
    const cancel = () => { clearTimeout(timer); };

    logo.addEventListener('pointerdown', start);
    logo.addEventListener('pointerup', cancel);
    logo.addEventListener('pointerleave', cancel);
    logo.addEventListener('pointercancel', cancel);
    // Si la pulsación larga llegó a disparar, el clic que viene detrás
    // no debe navegar al home.
    logo.addEventListener('click', (e) => {
      if (fired) { e.preventDefault(); e.stopPropagation(); fired = false; }
    }, true);
  });

  // ---------- el juego ----------

  function open() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'snake-overlay';
    overlay.innerHTML = `
      <div class="snake-box">
        <div class="snake-head">
          <span class="snake-score">0</span>
          <span class="snake-best"></span>
          <button class="snake-close" type="button" aria-label="Cerrar">Close</button>
        </div>
        <canvas class="snake-canvas"></canvas>
        <p class="snake-hint"></p>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const canvas = overlay.querySelector('.snake-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = overlay.querySelector('.snake-score');
    const bestEl = overlay.querySelector('.snake-best');
    const hintEl = overlay.querySelector('.snake-hint');

    const touch = window.matchMedia('(hover: none)').matches;
    hintEl.textContent = touch ? 'Desliza para mover · Toca fuera para salir'
                               : 'Flechas o WASD para mover · Esc para salir';

    let best = 0;
    try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch { /* sin almacenamiento */ }
    const paintBest = () => { bestEl.textContent = best ? `Best ${best}` : ''; };
    paintBest();

    // Lienzo nítido en pantallas de alta densidad.
    let cell = 0;
    function resize() {
      const side = Math.min(window.innerWidth * 0.86, window.innerHeight * 0.62, 560);
      cell = Math.floor(side / CELLS);
      const px = cell * CELLS;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = px * dpr;
      canvas.height = px * dpr;
      canvas.style.width = px + 'px';
      canvas.style.height = px + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    let snake, dir, pending, food, score, speed, dead, acc, last, raf;

    function reset() {
      const mid = Math.floor(CELLS / 2);
      snake = [{ x: mid - 1, y: mid }, { x: mid - 2, y: mid }, { x: mid - 3, y: mid }];
      dir = { x: 1, y: 0 };
      pending = [];
      score = 0;
      speed = START_MS;
      dead = false;
      acc = 0;
      last = performance.now();
      placeFood();
      scoreEl.textContent = '0';
    }

    function placeFood() {
      const free = [];
      for (let y = 0; y < CELLS; y++)
        for (let x = 0; x < CELLS; x++)
          if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
      food = free[Math.floor(Math.random() * free.length)] || null;
    }

    function turn(nx, ny) {
      // Se encola el giro: así dos pulsaciones rápidas no se pisan ni
      // permiten girar 180 grados sobre uno mismo.
      const base = pending.length ? pending[pending.length - 1] : dir;
      if (base.x === -nx && base.y === -ny) return;
      if (base.x === nx && base.y === ny) return;
      if (pending.length < 2) pending.push({ x: nx, y: ny });
    }

    function step() {
      if (pending.length) dir = pending.shift();
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      const hitWall = head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS;
      const hitSelf = snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y);
      if (hitWall || hitSelf) { dead = true; return; }

      snake.unshift(head);
      if (food && head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = String(score);
        speed = Math.max(MIN_MS, START_MS - score * 2);
        placeFood();
        if (score > best) {
          best = score;
          paintBest();
          try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* sin almacenamiento */ }
        }
      } else {
        snake.pop();
      }
    }

    function draw() {
      const px = cell * CELLS;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, px, px);

      ctx.strokeStyle = HAIRLINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, px - 1, px - 1);

      if (food) {
        const pad = cell * 0.12;
        const size = cell - pad * 2;
        if (foodImg) {
          ctx.drawImage(foodImg, food.x * cell + pad, food.y * cell + pad, size, size);
        } else {
          ctx.fillStyle = RED;
          ctx.fillRect(food.x * cell + cell * 0.22, food.y * cell + cell * 0.22, cell * 0.56, cell * 0.56);
        }
      }

      ctx.fillStyle = INK;
      snake.forEach((s, i) => {
        const inset = i === 0 ? 1 : 2;
        ctx.fillRect(s.x * cell + inset, s.y * cell + inset, cell - inset * 2, cell - inset * 2);
      });

      if (dead) {
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.fillRect(0, 0, px, px);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.font = '500 20px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.fillText(`${score}`, px / 2, px / 2 - 6);
        ctx.fillStyle = GRAY;
        ctx.font = '400 12px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.fillText(touch ? 'Toca para volver a jugar' : 'Pulsa una tecla para volver a jugar', px / 2, px / 2 + 18);
      }
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (dead) return;
      acc += now - last;
      last = now;
      if (acc < speed) return;
      acc = 0;
      step();
      draw();
    }

    // ---------- controles ----------
    // En fase de captura, para pasar por delante del carrusel del home,
    // que escucha las flechas en document.
    function onKey(e) {
      const k = e.key;
      if (k === 'Escape') { close(); return; }
      if (dead) { e.preventDefault(); e.stopPropagation(); reset(); draw(); return; }

      const moves = {
        ArrowUp: [0,-1], w: [0,-1], ArrowDown: [0,1], s: [0,1],
        ArrowLeft: [-1,0], a: [-1,0], ArrowRight: [1,0], d: [1,0],
      };
      const m = moves[k] || moves[k.toLowerCase?.()];
      if (!m) return;
      e.preventDefault();
      e.stopPropagation();
      turn(m[0], m[1]);
    }
    document.addEventListener('keydown', onKey, true);

    let sx = 0, sy = 0;
    canvas.addEventListener('touchstart', (e) => {
      sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY;
      if (dead) { reset(); draw(); }
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
      else turn(0, dy > 0 ? 1 : -1);
    }, { passive: true });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.snake-close').addEventListener('click', close);
    window.addEventListener('resize', resize);

    function close() {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', resize);
      overlay.remove();
      overlay = null;
      document.body.style.overflow = '';
    }

    reset();
    resize();
    raf = requestAnimationFrame(loop);
  }
})();
