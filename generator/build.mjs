// Build the self-contained generator HTML by inlining the wrangler logic, the
// ZIP writer, the generator UI, and the entire site-template into one file.
// Output: generator/swisschi-generator.html (double-click to open via file://).
//
//   node generator/build.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative, join, extname, basename } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

// Strip ES `export` keywords so files run as classic inline scripts in one scope.
function stripExports(src) {
  return src.replace(/^export\s+(default\s+)?/gm, '')
}

// --- collect site-template files ---
const TEMPLATE_DIR = resolve(root, 'site-template')
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'dist-single', '.git'])
const EXCLUDE_FILES = new Set(['.DS_Store'])
const TEXT_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json',
  '.yaml', '.yml', '.md', '.svg', '.txt', '.map'])

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (EXCLUDE_FILES.has(name)) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

const manifest = {}
let textCount = 0, binCount = 0
for (const full of walk(TEMPLATE_DIR)) {
  const rel = relative(TEMPLATE_DIR, full).split('\\').join('/')
  const ext = extname(full).toLowerCase()
  const isText = TEXT_EXT.has(ext) || basename(full) === '.gitignore'
  if (isText) {
    manifest[rel] = { t: 'text', c: readFileSync(full, 'utf-8') }
    textCount++
  } else {
    manifest[rel] = { t: 'b64', c: readFileSync(full).toString('base64') }
    binCount++
  }
}

// --- default config from conference.yaml (flat key: 'value' lines) ---
const yamlText = readFileSync(resolve(TEMPLATE_DIR, 'conference.yaml'), 'utf-8')
const defaultConfig = {}
for (const line of yamlText.split('\n')) {
  const m = line.match(/^([A-Za-z][\w]*):\s*'((?:[^']|'')*)'\s*$/)
  if (m) defaultConfig[m[1]] = m[2].replace(/''/g, "'")
}

// --- assemble ---
const wrangler = stripExports(readFileSync(resolve(root, 'wrangler/wrangler.js'), 'utf-8'))
const zip = stripExports(readFileSync(resolve(here, 'src/zip.js'), 'utf-8'))
const siteSingle = stripExports(readFileSync(resolve(here, 'src/site-single.js'), 'utf-8'))
const ui = readFileSync(resolve(here, 'src/generator-ui.js'), 'utf-8')

// Serialize objects for embedding inside an inline <script>. Escaping '<' as
// < prevents an embedded '</script>' (e.g. in site-template/index.html)
// from prematurely closing the script tag. The strings decode back unchanged.
const jsonForScript = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c')

let html = readFileSync(resolve(here, 'generator-template.html'), 'utf-8')
html = html
  .replace('/*__ZIP__*/', () => zip)
  .replace('/*__WRANGLER__*/', () => wrangler)
  .replace('/*__SITE_TEMPLATE__*/', () => 'const SITE_TEMPLATE = ' + jsonForScript(manifest) + ';')
  .replace('/*__SITE_SINGLE__*/', () => siteSingle)
  .replace('/*__DEFAULT_CONFIG__*/', () => 'const DEFAULT_CONFIG = ' + jsonForScript(defaultConfig) + ';')
  .replace('/*__UI__*/', () => ui)

const outPath = resolve(here, '../index.html')
writeFileSync(outPath, html)
const kb = (html.length / 1024).toFixed(0)
console.log(`Built ${relative(root, outPath)} (${kb} KB)`)
console.log(`  site-template files embedded: ${textCount} text, ${binCount} binary`)
console.log(`  single-page builder inlined: ${(siteSingle.length / 1024).toFixed(0)} KB`)
console.log(`  default config keys: ${Object.keys(defaultConfig).length}`)
