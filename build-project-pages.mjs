// ============================================================
// JOYA — static site generator
//
// Genera el sitio en dos idiomas desde una sola fuente:
//   español  -> home.html, studio.html        (raíz)
//   inglés   -> en/home.html, en/studio.html
// y, además, projects/<slug>.html para cada entrada de projects.json
// más las filas del índice dentro de projects.html (entre marcadores).
//
// Todo el texto visible vive en CONTENT, abajo. Para cambiar una frase
// se edita ahí y se regeneran las dos versiones a la vez: así no se
// pueden desincronizar.
//
// Rerun después de editar projects.json, CONTENT, o de agregar, quitar
// o reordenar imágenes.
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

// ------------------------------------------------------------
// Idiomas. 'es' vive en la raíz, 'en' en /en/.
// ------------------------------------------------------------
const LANGS = ['es', 'en'];
const DEFAULT_LANG = 'es';

// Desde una página de ese idioma, cuánto hay que subir para llegar a la raíz.
const prefixFor = lang => (lang === DEFAULT_LANG ? '' : '../');
// Carpeta de salida de ese idioma.
const dirFor = lang => (lang === DEFAULT_LANG ? '.' : lang);
// Ruta de `page` tal como hay que escribirla estando en una página de
// `from`. Dentro del mismo idioma es el nombre pelado, porque las páginas
// de un idioma viven todas en la misma carpeta.
function hrefTo(from, to, page){
  if (from === to) return page;
  return to === DEFAULT_LANG ? `../${page}` : `${to}/${page}`;
}
// URL absoluta dentro del sitio, para hreflang.
const pathFor = (lang, page) => (lang === DEFAULT_LANG ? page : `${lang}/${page}`);

const CONTENT = {
  es: {
    htmlLang: 'es',
    nav: { studio: 'Estudio' },
    menu: { open: 'Menú', close: 'Cerrar', aria: 'Abrir menú', ariaClose: 'Cerrar menú' },
    switchLabel: 'EN',
    switchAria: 'View this page in English',
    home: {
      title: 'JOYA — Arquitectura e Interiorismo',
      description: 'JOYA es un estudio de arquitectura, interiorismo y diseño con base en Barcelona.',
      slidesAria: 'Trabajos seleccionados',
    },
    studio: {
      title: 'Estudio — JOYA',
      description: 'JOYA es un estudio de arquitectura e interiorismo fundado por Riccardo y Mariano, con base en Barcelona.',
      primary: [
        'JOYA es un estudio de arquitectura e interiorismo fundado por Riccardo y Mariano tras coincidir profesionalmente en Barcelona.',
        'La combinación de sus distintas trayectorias permite abordar cada proyecto desde una mirada amplia, integrando arquitectura, interiores y diseño en una propuesta coherente. El estudio trabaja en diferentes escalas, prestando especial atención a la claridad espacial, la materialidad y la relación entre cada intervención y su contexto.',
        'Entendemos el diseño como un proceso de síntesis: identificar lo esencial, ordenar las necesidades y convertirlas en espacios precisos, funcionales y con una identidad propia.',
      ],
      secondaryEyebrow: '¿Qué hacemos?',
      secondary: [
        'Desarrollamos proyectos de arquitectura e interiorismo a medida, desde las primeras decisiones conceptuales hasta su definición técnica y ejecución.',
        'El alcance de cada colaboración se adapta a las necesidades del proyecto e incluye diseño, documentación, coordinación técnica y seguimiento de obra.',
        'También trabajamos junto a otros estudios de arquitectura e interiorismo como equipo externo, sumándonos puntualmente a sus proyectos allí donde necesiten refuerzo.',
      ],
    },
    footer: { instagram: 'Síguenos en Instagram' },
    project: {
      labels: { client: 'Cliente', location: 'Ubicación', program: 'Programa', year: 'Año', credits: 'Créditos' },
      index: 'Índice de proyectos',
    },
  },

  en: {
    htmlLang: 'en',
    nav: { studio: 'Studio' },
    menu: { open: 'Menu', close: 'Close', aria: 'Open menu', ariaClose: 'Close menu' },
    switchLabel: 'ES',
    switchAria: 'Ver esta página en español',
    home: {
      title: 'JOYA — Architecture & Interior Design',
      description: 'JOYA is an architecture, interior design and design studio based in Barcelona.',
      slidesAria: 'Selected work',
    },
    studio: {
      title: 'Studio — JOYA',
      description: 'JOYA is an architecture and interior design studio founded by Riccardo and Mariano, based in Barcelona.',
      primary: [
        'JOYA is an architecture and interior design studio founded by Riccardo and Mariano after their paths crossed professionally in Barcelona.',
        'The combination of their different backgrounds allows each project to be approached from a broad perspective, bringing architecture, interiors and design together into a coherent proposal. The studio works across different scales, with particular attention to spatial clarity, materiality and the relationship between each intervention and its context.',
        'We understand design as a process of synthesis: identifying what is essential, ordering needs and turning them into precise, functional spaces with an identity of their own.',
      ],
      secondaryEyebrow: 'What we do',
      secondary: [
        'We develop bespoke architecture and interior design projects, from the first conceptual decisions through to technical definition and construction.',
        'The scope of each collaboration adapts to the needs of the project and covers design, documentation, technical coordination and site supervision.',
        'We also work alongside other architecture and interior design studios as an external team, joining their projects wherever extra support is needed.',
      ],
    },
    footer: { instagram: 'Follow us on Instagram' },
    project: {
      labels: { client: 'Client', location: 'Location', program: 'Program', year: 'Year', credits: 'Credits' },
      index: 'Project index',
    },
  },
};

// Datos de contacto: una sola copia, igual en los dos idiomas.
const CONTACT = {
  email: 'info@estudiojoya.com',
  phones: [
    { label: '(+34) 602 402 094', href: 'tel:+34602402094' },
    { label: '(+39) 366 344 7818', href: 'tel:+393663447818' },
  ],
  instagram: 'https://instagram.com/joya_aaaaaaaaaaaa',
};

const SITE = 'https://estudiojoya.com';

const icons = prefix => `<link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${prefix}assets/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="${prefix}assets/favicon-180.png">`;

// Le dice a los buscadores que las dos versiones son la misma página en
// distinto idioma, en vez de contenido duplicado.
function alternates(page){
  return LANGS
    .map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}/${pathFor(l, page)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${SITE}/${pathFor(DEFAULT_LANG, page)}">`)
    .join('\n');
}

// `page` es el nombre del archivo dentro del idioma (home.html, studio.html),
// y sirve para que el conmutador de idioma lleve a la misma página.
function header(lang, page, active){
  const t = CONTENT[lang];
  const prefix = prefixFor(lang);
  const other = LANGS.find(l => l !== lang);
  // Projects está fuera del menú mientras Marian repiensa la sección.
  // Las páginas se siguen generando y projects.json queda intacto: para
  // volver a publicarlas basta con descomentar esta línea y quitar las
  // redirecciones de vercel.json.
  const links = [
    // ['projects', t.nav.projects, 'projects.html'],
    ['studio', t.nav.studio, 'studio.html'],
  ];

  // El conmutador apunta a la misma página en el otro idioma; si estamos en
  // una página que solo existe en español (las de proyecto), vuelve al home.
  const switchTarget = hrefTo(lang, other, page || 'home.html');
  const switchLink = `<a href="${switchTarget}" class="lang-switch" lang="${other}" hreflang="${other}" aria-label="${t.switchAria}">${t.switchLabel}</a>`;

  const navLinks = links.map(([key, label, href]) =>
    `<a href="${hrefTo(lang, lang, href)}"${active === key ? ' class="is-active"' : ''}>${label}</a>`
  ).join('\n      ');
  const mobileLinks = links.map(([, label, href]) =>
    `<a href="${hrefTo(lang, lang, href)}">${label}</a>`
  ).join('\n    ');

  return `<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <a href="${hrefTo(lang, lang, 'home.html')}" class="header-logo">
      <img src="${prefix}assets/joya-logo.svg" alt="JOYA">
    </a>
    <nav class="header-nav">
      ${navLinks}
      ${switchLink}
    </nav>
    <button class="menu-toggle" id="menuToggle" aria-label="${t.menu.aria}" aria-expanded="false">${t.menu.open}</button>
  </div>
</header>

<div class="mobile-menu" id="mobileMenu">
  <div class="mobile-menu-top">
    <img src="${prefix}assets/joya-logo.svg" alt="JOYA" style="height:14px;">
    <button class="mobile-close" id="mobileClose" aria-label="${t.menu.ariaClose}">${t.menu.close}</button>
  </div>
  <nav class="mobile-menu-links">
    ${mobileLinks}
    ${switchLink}
  </nav>
</div>`;
}

function footer(lang){
  const t = CONTENT[lang];
  const phones = CONTACT.phones
    .map(p => `      <a href="${p.href}">${p.label}</a>`)
    .join('\n');

  return `<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-contact">
      <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>
${phones}
      <a href="${CONTACT.instagram}" target="_blank" rel="noopener">${t.footer.instagram}</a>
    </div>
  </div>
  <span class="built-by">Built by Sean Harrison</span>
</footer>`;
}

// ------------------------------------------------------------
// Páginas de proyecto. Siguen existiendo solo en español: los datos
// (título, rol, créditos) vienen de projects.json y no hay traducción.
// La sección está fuera del sitio, así que no se nota; cuando vuelva,
// o se traduce projects.json o se deja en un idioma a propósito.
// ------------------------------------------------------------
function projectPage(project, prevProject, nextProject){
  const lang = DEFAULT_LANG;
  const t = CONTENT[lang];
  const prefix = '../';
  const imgs = imagesFor(project);
  const galleryImgs = imgs.map(src => `    <img src="${prefix}${src}" alt="${project.title}" loading="lazy">`).join('\n');

  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${project.title} — JOYA</title>
${HEAD_FONTS}
${icons(prefix)}
<link rel="stylesheet" href="${prefix}styles.css">
</head>
<body>

${header(lang, null, 'projects')}

<main class="project-main">
  <div class="wrap project-info">
    <div class="project-info-grid">
      <h1 class="project-info-title">${project.title}</h1>
      <p class="project-info-desc">${project.role}</p>
      <div class="project-meta-list">
        ${project.client ? `<div class="m-row"><span class="m-label">${t.project.labels.client}</span>${project.client}</div>` : ''}
        <div class="m-row"><span class="m-label">${t.project.labels.location}</span>${project.location}</div>
        <div class="m-row"><span class="m-label">${t.project.labels.program}</span>${project.category}</div>
        <div class="m-row"><span class="m-label">${t.project.labels.year}</span>${project.year}</div>
        <div class="m-row"><span class="m-label">${t.project.labels.credits}</span>${project.credit}</div>
      </div>
    </div>
  </div>

  <div class="project-gallery" aria-label="${project.title}">
${galleryImgs}
  </div>

  <nav class="project-nav wrap">
    <a href="${prevProject ? `${prevProject.slug}.html` : '#'}">${prevProject ? '← ' + prevProject.title : ''}</a>
    <a href="${prefix}projects.html" class="nav-center">${t.project.index}</a>
    <a href="${nextProject ? `${nextProject.slug}.html` : '#'}">${nextProject ? nextProject.title + ' →' : ''}</a>
  </nav>
</main>

${footer(lang)}

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

function homePage(lang){
  const t = CONTENT[lang];
  const prefix = prefixFor(lang);
  const slides = homeImages().map((i, n) =>
    `      <img src="${prefix}${i.src}" alt="${i.title}" draggable="false"${n ? '' : ' class="is-on"'}>`).join('\n');

  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t.home.title}</title>
<meta name="description" content="${t.home.description}">
${icons(prefix)}
${alternates('home.html')}
<link rel="stylesheet" href="${prefix}styles.css">
</head>
<body>

${header(lang, 'home.html', null)}

<main class="home-main">
  <div class="home-slides" id="homeSlides" aria-label="${t.home.slidesAria}">
${slides}
  </div>
</main>

${footer(lang)}

<script src="${prefix}main.js"></script>
</body>
</html>
`;
}

function studioPage(lang){
  const t = CONTENT[lang];
  const prefix = prefixFor(lang);
  const para = arr => arr.map(p => `      <p>${p}</p>`).join('\n');

  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t.studio.title}</title>
<meta name="description" content="${t.studio.description}">
${icons(prefix)}
${alternates('studio.html')}
<link rel="stylesheet" href="${prefix}styles.css">
</head>
<body>

${header(lang, 'studio.html', 'studio')}

<main class="studio-main wrap">
  <div class="studio-layout">
    <div class="studio-primary">
${para(t.studio.primary)}
    </div>
    <div class="studio-secondary">
      <span class="eyebrow">${t.studio.secondaryEyebrow}</span>
${para(t.studio.secondary)}
    </div>
  </div>
</main>

${footer(lang)}

<script src="${prefix}main.js"></script>
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
    fs.writeFileSync(path.join('projects', `${project.slug}.html`), projectPage(project, prev, next));
  });

  for (const lang of LANGS){
    const dir = dirFor(lang);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'home.html'), homePage(lang));
    fs.writeFileSync(path.join(dir, 'studio.html'), studioPage(lang));
  }

  const rows = projects.map(indexRow).join('\n');
  replaceBetweenMarkers('projects.html', '<!-- INDEX:START -->', '<!-- INDEX:END -->', rows);

  console.log(`Built ${LANGS.length} idiomas (${LANGS.join(', ')}) × home + studio, ${projects.length} páginas de proyecto, home con ${homeImages().length} fotos, índice.`);
}

build();
