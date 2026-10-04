// ============================================================
// JOYA — shared site behavior
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Splash ---------- */
  const splash = document.getElementById('splash');
  if (splash){
    splash.addEventListener('click', () => {
      splash.classList.add('is-leaving');
      setTimeout(() => { window.location.href = 'home.html'; }, 350);
    });
  }

  /* ---------- Mobile menu ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');
  function openMenu(){ mobileMenu?.classList.add('is-open'); menuToggle?.setAttribute('aria-expanded', 'true'); }
  function closeMenu(){ mobileMenu?.classList.remove('is-open'); menuToggle?.setAttribute('aria-expanded', 'false'); }
  menuToggle?.addEventListener('click', openMenu);
  mobileClose?.addEventListener('click', closeMenu);
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- Project index: hover preview (desktop) ---------- */
  const previewImg = document.getElementById('indexPreviewImg');
  const indexRows = document.querySelectorAll('.index-row[data-preview]');
  indexRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      if (!previewImg) return;
      previewImg.src = row.dataset.preview;
      previewImg.classList.add('is-visible');
    });
    row.addEventListener('click', () => {
      window.location.href = row.dataset.href;
    });
    row.setAttribute('tabindex', '0');
    row.setAttribute('role', 'link');
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.location.href = row.dataset.href;
    });
    row.addEventListener('focus', () => {
      if (!previewImg) return;
      previewImg.src = row.dataset.preview;
      previewImg.classList.add('is-visible');
    });
  });

  /* ---------- Project index: sort by column ---------- */
  const indexHead = document.querySelector('.index-head');
  const indexUl = document.querySelector('.index-list ul');
  if (indexHead && indexUl){
    let sortKey = null, sortDir = 1;
    const items = Array.from(indexUl.children);

    indexHead.querySelectorAll('[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.sort;
        sortDir = (sortKey === key) ? sortDir * -1 : 1;
        sortKey = key;

        indexHead.querySelectorAll('[data-sort]').forEach(b => b.removeAttribute('data-dir'));
        btn.setAttribute('data-dir', sortDir === 1 ? 'asc' : 'desc');

        const sorted = items.slice().sort((a, b) => {
          const va = a.querySelector('.index-row').dataset[key];
          const vb = b.querySelector('.index-row').dataset[key];
          if (key === 'year') return (parseInt(va, 10) - parseInt(vb, 10)) * sortDir;
          return va.localeCompare(vb, 'es', { sensitivity: 'base' }) * sortDir;
        });
        sorted.forEach(li => indexUl.appendChild(li));
      });
    });
  }

  /* ---------- Home: una imagen por vez ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const slides = document.getElementById('homeSlides');
  if (slides){
    const imgs = Array.from(slides.querySelectorAll('img'));
    let current = 0, timer = null;

    function show(n){
      current = (n + imgs.length) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === current));
    }
    function arm(){
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(() => show(current + 1), 4500);
    }

    slides.addEventListener('click', () => { show(current + 1); arm(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight'){ show(current + 1); arm(); }
      else if (e.key === 'ArrowLeft'){ show(current - 1); arm(); }
    });

    let startX = 0;
    slides.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; }, { passive: true });
    slides.addEventListener('touchend', (e) => {
      const d = e.changedTouches[0].clientX - startX;
      if (Math.abs(d) > 45){ show(current + (d < 0 ? 1 : -1)); arm(); }
    }, { passive: true });

    show(0);
    arm();
  }

});
