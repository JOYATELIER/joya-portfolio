// ============================================================
// JOYA — shared site behavior
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Splash ---------- */
  const splash = document.getElementById('splash');
  if (splash){
    splash.addEventListener('click', () => {
      splash.classList.add('is-leaving');
      setTimeout(() => { window.location.href = 'projects.html'; }, 350);
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

  /* ---------- Project carousel ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.carousel-wrap').forEach(wrap => {
    const track = wrap.querySelector('.carousel-track');
    if (!track) return;
    const originals = Array.from(track.children);
    if (!originals.length){ wrap.classList.add('no-images'); return; }

    // Duplicate the sequence once for a seamless loop.
    originals.forEach(node => track.appendChild(node.cloneNode(true)));

    let setWidth = 0;
    let offset = 0;
    let isPaused = reduceMotion;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let resumeTimer = null;
    const VELOCITY = 26; // px/sec
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0');

    function measure(){
      setWidth = 0;
      originals.forEach((img, i) => {
        setWidth += img.getBoundingClientRect().width;
        if (i < originals.length - 1) setWidth += gap;
      });
      setWidth += gap; // gap connecting last-of-set to first-of-duplicate
    }

    function applyTransform(){
      track.style.transform = `translateX(${-offset}px)`;
    }

    function wrapOffset(){
      if (setWidth <= 0) return;
      offset = ((offset % setWidth) + setWidth) % setWidth;
    }

    let lastT = null;
    function tick(t){
      if (lastT === null) lastT = t;
      const dt = (t - lastT) / 1000;
      lastT = t;
      if (!isPaused && !isDragging && setWidth > 0){
        offset += VELOCITY * dt;
        wrapOffset();
        applyTransform();
      }
      requestAnimationFrame(tick);
    }

    function scheduleResume(){
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { isPaused = reduceMotion ? true : false; }, 1400);
    }

    // Pause on hover / focus.
    wrap.addEventListener('mouseenter', () => { isPaused = true; });
    wrap.addEventListener('mouseleave', () => { if (!isDragging) scheduleResume(); });
    wrap.addEventListener('focusin', () => { isPaused = true; });
    wrap.addEventListener('focusout', () => scheduleResume());

    // Drag (mouse + touch via Pointer Events).
    wrap.addEventListener('pointerdown', (e) => {
      isDragging = true;
      isPaused = true;
      dragStartX = e.clientX;
      dragStartOffset = offset;
      wrap.classList.add('is-dragging');
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      offset = dragStartOffset - (e.clientX - dragStartX);
      wrapOffset();
      applyTransform();
    });
    function endDrag(){
      if (!isDragging) return;
      isDragging = false;
      wrap.classList.remove('is-dragging');
      scheduleResume();
    }
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);

    // Horizontal wheel / trackpad.
    wrap.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // let vertical page scroll pass through
      e.preventDefault();
      isPaused = true;
      offset += e.deltaX;
      wrapOffset();
      applyTransform();
      scheduleResume();
    }, { passive: false });

    // Keyboard arrows.
    wrap.setAttribute('tabindex', '0');
    wrap.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      isPaused = true;
      const step = originals[0] ? originals[0].getBoundingClientRect().width + gap : 300;
      track.style.transition = 'transform .4s cubic-bezier(.4,0,.2,1)';
      offset += (e.key === 'ArrowRight') ? step : -step;
      wrapOffset();
      applyTransform();
      setTimeout(() => { track.style.transition = ''; }, 420);
      scheduleResume();
    });

    // Measure once images are loaded, then start the loop.
    const imgs = Array.from(track.querySelectorAll('img'));
    Promise.all(imgs.map(img => img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
      .then(() => {
        measure();
        requestAnimationFrame(tick);
      });
    window.addEventListener('resize', () => measure());
  });

});
