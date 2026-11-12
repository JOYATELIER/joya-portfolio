// ============================================================
// JOYA — trae las fotos de la portada desde Google Drive
//
// El estudio gestiona una carpeta de Drive. Este script la lee, se
// descarga las fotos, las endereza, las encoge si hacen falta, las
// pasa a JPEG optimizado y deja assets/images/home/ igual que la
// carpeta. Corre dentro del build de Vercel, antes del generador.
//
// EL ORDEN ES EL DE LOS NOMBRES EN DRIVE (el mismo que ve el estudio
// al ordenar por nombre). Para mandar en el orden, se numeran los
// archivos en Drive: 01-..., 02-..., etc.
//
// Variables de entorno necesarias (configuradas en Vercel):
//   GOOGLE_API_KEY     clave de API con Drive API habilitada
//   DRIVE_FOLDER_ID    id de la carpeta, el trozo largo de su URL
//
// Si faltan, o si Drive no responde, NO toca nada y deja las fotos
// que ya están en el repositorio. Así un fallo de Google nunca deja
// la portada en blanco ni rompe el despliegue.
// ============================================================
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GOOGLE_API_KEY;
const FOLDER = process.env.DRIVE_FOLDER_ID;
const DEST = path.join('assets', 'images', 'home');

const MAX_SIDE = 2400;
const QUALITY = 82;
const EXT_OK = /\.(jpe?g|png|webp)$/i;

function aviso(msg){ console.log(`[drive] ${msg}`); }

// "01- aguilo.JPG" -> "aguilo"   |   "OBRA 2.JPEG" -> "obra-2"
// El resultado es el nombre del archivo final y también el texto
// alternativo de la imagen, así que conviene que se lea.
function slugify(filename){
  const base = filename.replace(/\.[^.]+$/, '');
  const sinNumero = base.replace(/^[\s.]*\d+[\s._-]+/, '');
  const limpia = s => s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // fuera acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const corto = limpia(sinNumero);
  return corto.length >= 2 ? corto : (limpia(base) || 'foto');
}

async function listar(){
  const q = encodeURIComponent(`'${FOLDER}' in parents and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}`
    + `&key=${KEY}&fields=files(id,name,mimeType,size)&pageSize=200`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Drive respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const { files = [] } = await r.json();
  return files
    .filter(f => EXT_OK.test(f.name) && f.mimeType.startsWith('image/'))
    // El mismo orden que ve el estudio en Drive ordenando por nombre.
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }));
}

async function descargar(file){
  const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`no se pudo bajar ${file.name}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function procesar(buf){
  const meta = await sharp(buf).metadata();
  const out = await sharp(buf)
    .rotate()                                   // aplica la orientación EXIF
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toBuffer();

  // Si ya venía bien y más comprimida, se deja el original: reprocesarla
  // la engordaría y le metería una segunda pérdida de calidad.
  const yaEstaBien =
    meta.format === 'jpeg' &&
    !(meta.orientation && meta.orientation !== 1) &&
    Math.max(meta.width, meta.height) <= MAX_SIDE &&
    buf.length <= out.length;

  return yaEstaBien ? buf : out;
}

async function main(){
  if (!KEY || !FOLDER) {
    aviso('sin GOOGLE_API_KEY o DRIVE_FOLDER_ID: se usan las fotos del repositorio.');
    return;
  }

  let files;
  try {
    files = await listar();
  } catch (e) {
    aviso(`no se pudo leer la carpeta (${e.message}).`);
    aviso('se dejan las fotos del repositorio y el despliegue continúa.');
    return;
  }

  if (!files.length) {
    aviso('la carpeta está vacía: se dejan las fotos del repositorio.');
    return;
  }

  // A partir de aquí la lista es buena, así que la carpeta local pasa a
  // ser un espejo: lo que ya no está en Drive, se va.
  fs.mkdirSync(DEST, { recursive: true });
  const escritos = new Set();
  let antes = 0, despues = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const nombre = `${String(i + 1).padStart(2, '0')}-${slugify(f.name)}.jpg`;
    const destino = path.join(DEST, nombre);

    const buf = await descargar(f);
    const out = await procesar(buf);
    fs.writeFileSync(destino, out);

    escritos.add(nombre);
    antes += buf.length;
    despues += out.length;
    console.log(`[drive] ${nombre.padEnd(34)} <- ${f.name}  ${Math.round(buf.length/1024)} KB -> ${Math.round(out.length/1024)} KB`);
  }

  for (const viejo of fs.readdirSync(DEST)) {
    if (!escritos.has(viejo)) {
      fs.rmSync(path.join(DEST, viejo));
      aviso(`quitada (ya no está en Drive): ${viejo}`);
    }
  }

  aviso(`${files.length} fotos sincronizadas. ${(antes/1024/1024).toFixed(1)} MB -> ${(despues/1024/1024).toFixed(1)} MB`);
}

await main();
