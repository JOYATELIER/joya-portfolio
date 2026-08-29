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

const HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">`;

function header(prefix, active){
  const links = [
    ['Projects', 'projects.html'],
    ['Studio', 'studio.html'],
    ['Contact', 'contact.html'],
  ];
  const navLinks = links.map(([label, href]) =>
    `<a href="${prefix}${href}"${active === label ? ' class="is-active"' : ''}>${label}</a>`
  ).join('\n      ');
  const mobileLinks = links.map(([label, href]) => `<a href="${prefix}${href}">${label}</a>`).join('\n    ');

  return `<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <a href="${prefix}projects.html" class="header-logo">
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
  return `<footer class="site-footer wrap">
  <a href="mailto:hello@joyastudio.com">hello@joyastudio.com</a>
  <a href="https://instagram.com/joya.studio" target="_blank" rel="noopener">Instagram</a>
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

function indexRow(project){
  const preview = previewFor(project);
  return `    <li>
      <div class="index-row" data-preview="${preview}" data-href="projects/${project.slug}.html">
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

  const rows = projects.map(indexRow).join('\n');
  replaceBetweenMarkers('projects.html', '<!-- INDEX:START -->', '<!-- INDEX:END -->', rows);

  console.log(`Built ${projects.length} project pages + index.`);
}

build();
