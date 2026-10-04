// ============================================================
// JOYA — static site generator
// Regenerates projects/<slug>.html for every entry in projects.json,
// and the project index rows inside projects.html (between markers).
// Rerun after editing projects.json or adding/removing/reordering images.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const projects = JSON.parse(fs.readFileSync('projects.json', 'utf8'));

// assets/images/_fallback.jpg ships committed in the repo (used when a
// project has no photos yet) — this script has no npm dependencies on
// purpose, so it can run unmodified in Vercel's build step.

const IMG_RE = /^(\d+)(-.+)?\.(jpe?g|png|webp)$/i;

function imagesFor(project){
  const dir = path.join('assets', 'images', project.slug);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => IMG_RE.test(f))
    .sort((a, b) => parseInt(a.match(IMG_RE)[1], 10) - parseInt(b.match(IMG_RE)[1], 10))
    .map(f => `assets/images/${project.slug}/${f}`);
}

function previewFor(project){
  const imgs = imagesFor(project);
  return imgs[0] || 'assets/images/_fallback.jpg';
}

// La tipografía es la del sistema (Helvetica Neue / Helvetica / Arial), así que
// no se carga ninguna fuente externa. Ver FUENTES.txt.
const HEAD_FONTS = '';

const icons = prefix => `<link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${prefix}assets/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="${prefix}assets/favicon-180.png">`;

function header(prefix, active){
  const links = [
    ['Projects', 'projects.html'],
    ['Studio', 'studio.html'],
  ];
  const navLinks = links.map(([label, href]) =>
    `<a href="${prefix}${href}"${active === label ? ' class="is-active"' : ''}>${label}</a>`
  ).join('\n      ');
  const mobileLinks = links.map(([label, href]) => `<a href="${prefix}${href}">${label}</a>`).join('\n    ');

  return `<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <a href="${prefix}home.html" class="header-logo">
      <img src="${prefix}assets/joya-logo.svg" alt="JOYA">
    </a>
    <nav class="header-nav">
      ${navLinks}
    </nav>
    <button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false">Menu</button>
  </div>
</header>

<div class="mobile-menu" id="mobileMenu">
  <div class="mobile-menu-top">
    <img src="${prefix}assets/joya-logo.svg" alt="JOYA" style="height:14px;">
    <button class="mobile-close" id="mobileClose" aria-label="Close menu">Close</button>
  </div>
  <nav class="mobile-menu-links">
    ${mobileLinks}
  </nav>
</div>`;
}

function footer(prefix){
  return `<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-contact">
      <a href="mailto:circolojoya@gmail.com">circolojoya@gmail.com</a>
      <a href="tel:+34602402094">(+34) 602 402 094</a>
      <a href="tel:+393663447818">(+39) 366 344 7818</a>
      <a href="https://instagram.com/joya_aaaaaaaaaaaa" target="_blank" rel="noopener">Follow us on Instagram</a>
    </div>
    <div class="footer-place">JOYA / 08012 Barcelona</div>
  </div>
  <span class="built-by">Built by Sean Harrison</span>
</footer>`;
}

function projectPage(project, prefix, prevProject, nextProject){
  const imgs = imagesFor(project);
  const carouselImgs = imgs.map(src => `      <img src="${prefix}${src}" alt="${project.title}" draggable="false">`).join('\n');
  const carouselClass = imgs.length ? '' : ' no-images';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${project.title} — JOYA</title>
${HEAD_FONTS}
${icons(prefix)}
<link rel="stylesheet" href="${prefix}styles.css">
</head>
<body>

${header(prefix, 'Projects')}

<main class="project-main">
  <div class="carousel-wrap${carouselClass}" aria-label="${project.title} gallery">
    <div class="carousel-track">
${carouselImgs}
    </div>
  </div>

  <div class="wrap project-info">
    <div class="project-info-grid">
      <h1 class="project-info-title">${project.title}</h1>
      <p class="project-info-desc">${project.role}</p>
      <div class="project-meta-list">
        ${project.client ? `<div class="m-row"><span class="m-label">Client</span>${project.client}</div>` : ''}
        <div class="m-row"><span class="m-label">Location</span>${project.location}</div>
        <div class="m-row"><span class="m-label">Program</span>${project.category}</div>
        <div class="m-row"><span class="m-label">Year</span>${project.year}</div>
        <div class="m-row"><span class="m-label">Credits</span>${project.credit}</div>
      </div>
    </div>
  </div>

  <nav class="project-nav wrap">
    <a href="${prevProject ? `${prevProject.slug}.html` : '#'}">${prevProject ? '← ' + prevProject.title : ''}</a>
    <a href="${prefix}projects.html" class="nav-center">Project index</a>
    <a href="${nextProject ? `${nextProject.slug}.html` : '#'}">${nextProject ? nextProject.title + ' →' : ''}</a>
  </nav>
</main>

${footer(prefix)}

<script src="${prefix}main.js"></script>
</body>
</html>
`;
}

// Carrusel del home: toma las primeras imágenes de cada proyecto y las
// intercala, para que la portada muestre variedad sin curaduría manual.
function homeImages(limit = 14){
  const perProject = projects.map(p => ({ p, imgs: imagesFor(p) })).filter(x => x.imgs.length);
  const out = [];
  for (let i = 0; out.length < limit; i++){
    const before = out.length;
    for (const { p, imgs } of perProject){
      if (imgs[i] && out.length < limit) out.push({ src: imgs[i], title: p.title });
    }
    if (out.length === before) break;
  }
  return out;
}

function homePage(){
  const imgs = homeImages();
  const slides = imgs.map(i =>
    `      <img src="${i.src}" alt="${i.title}" draggable="false">`).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JOYA — Arquitectura e Interiorismo</title>
<meta name="description" content="JOYA es un estudio de arquitectura, interiorismo y diseño con base en Barcelona.">
${icons('')}
<link rel="stylesheet" href="styles.css">
</head>
<body>

${header('', null)}

<main class="home-main">
  <div class="carousel-wrap home-carousel" aria-label="Selected work">
    <div class="carousel-track">
${slides}
    </div>
  </div>
</main>

${footer('')}

<script src="main.js"></script>
</body>
</html>
`;
}

function indexRow(project){
  const preview = previewFor(project);
  return `    <li>
      <div class="index-row" data-preview="${preview}" data-href="projects/${project.slug}.html"
        data-title="${project.title}" data-category="${project.category}" data-year="${project.year}">
        <div class="index-row-media"><img src="${preview}" alt="" loading="lazy"></div>
        <span class="p-title">${project.title}</span>
        <span class="p-meta">${project.category}</span>
        <span class="p-meta">${project.location}</span>
        <span class="p-meta">${project.year}</span>
      </div>
    </li>`;
}

function replaceBetweenMarkers(filePath, startMarker, endMarker, newContent){
  const html = fs.readFileSync(filePath, 'utf8');
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) throw new Error(`Markers not found in ${filePath}`);
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  fs.writeFileSync(filePath, `${before}\n${newContent}\n  ${after}`);
}

async function build(){
  fs.mkdirSync('projects', { recursive: true });
  projects.forEach((project, i) => {
    const prev = projects[i - 1] || null;
    const next = projects[i + 1] || null;
    fs.writeFileSync(path.join('projects', `${project.slug}.html`), projectPage(project, '../', prev, next));
  });

  fs.writeFileSync('home.html', homePage());

  const rows = projects.map(indexRow).join('\n');
  replaceBetweenMarkers('projects.html', '<!-- INDEX:START -->', '<!-- INDEX:END -->', rows);

  console.log(`Built ${projects.length} project pages + home (${homeImages().length} fotos) + index.`);
}

build();
