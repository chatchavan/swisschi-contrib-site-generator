// Static checks of the from-scratch single-page builder, with hostile data
// (Liquid triggers, script-closing injection attempts, multi-line abstracts).
// Run: node generator/test/single-site.test.mjs
// Also writes generator/test-single.html for a manual/browser look.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { renderSingleSite } from '../src/site-single.js'

const here = dirname(fileURLToPath(import.meta.url))

let failures = 0
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { console.error('  ✗ ' + m); failures++ }

const conf = {
  pageTitle: 'Swiss @ DIS 2026',
  headerTitle: '🇨🇭 Swiss Contributions at DIS 2026',
  headerSubtitle: 'Singapore, July 2026',
  chapterUrl: 'https://swisschi.acm.org/',
  linkedinUrl: 'https://www.linkedin.com/company/swisschi/',
  footerCredit: 'Data from DIS 2026 Program',
}

const MSG = "Try </scr" + "ipt><script>alert(1)</scr" + "ipt> injection"
const papers = [
  {
    ID: '1', Link: 'http://x/1',
    Title: 'Liquid attack {{ site.title }} and {% raw %} test',
    Type: 'Paper', Awards: 'Best Paper',
    "Author's Message": MSG,
    'Swiss Institutes': 'ETH Zurich; EPFL',
    'Swiss Authors Count': '2',
    'Swiss Authors': 'Ann Muster (ETH Zurich, Zurich); Bo Beispiel (EPFL, Lausanne)',
    'All Authors': 'Ann Muster (ETH Zurich); Carol Other (MIT); Bo Beispiel (EPFL)',
    Abstract: 'Line one\nLine two with {{ double }} braces',
  },
  {
    ID: '2', Link: 'http://x/2', Title: 'Plain paper', Type: 'Poster',
    Awards: 'Honorable Mention', "Author's Message": '',
    'Swiss Institutes': 'University of Zurich', 'Swiss Authors Count': '1',
    'Swiss Authors': 'Cy Dent (UZH, Zurich)', 'All Authors': 'Cy Dent (UZH)',
    Abstract: 'Short',
  },
  {
    ID: '3', Link: 'http://x/3', Title: 'Third one', Type: 'Paper',
    Awards: '', "Author's Message": 'Hello, world!',
    'Swiss Institutes': 'EPFL', 'Swiss Authors Count': '1',
    'Swiss Authors': 'Bo Beispiel (EPFL, Lausanne)',
    'All Authors': 'Bo Beispiel (EPFL); Dee Else (KTH)',
    Abstract: 'x',
  },
]

console.log('Single-page builder checks\n')

const html = renderSingleSite(conf, papers)
writeFileSync(resolve(here, '../test-single.html'), html)

const liquidOut = (html.match(/\{\{/g) || []).length
const liquidTag = (html.match(/\{%/g) || []).length
const closers = (html.match(/<\/script>/g) || []).length

if (liquidOut === 0) ok('no Liquid output sequences in produced page')
else fail(`found ${liquidOut} Liquid output-tag sequences`)
if (liquidTag === 0) ok('no Liquid block-tag sequences in produced page')
else fail(`found ${liquidTag} Liquid block-tag sequences`)
if (closers === 1) ok('exactly one script closer (the page\'s own)')
else fail(`expected 1 script closer, found ${closers}`)
if (!html.startsWith('---')) ok('no Jekyll front-matter marker at start')
else fail('page starts with --- (front-matter risk)')

// JSON survives the escaping: extract PAPERS and round-trip it.
const m = html.match(/var PAPERS = (\[.*?\]);\n/s)
if (!m) fail('could not locate embedded PAPERS JSON')
else {
  const parsed = JSON.parse(m[1])
  const t = parsed[0].Title
  if (parsed.length === 3 && t === 'Liquid attack {{ site.title }} and {% raw %} test')
    ok('embedded JSON round-trips exactly (escapes decode back)')
  else fail('embedded JSON corrupted: ' + JSON.stringify(t))
  if (parsed[0]["Author's Message"] === MSG) ok('script-injection message survives intact as data')
  else fail('message corrupted')
}

// No React/Vite remnants.
if (!/react|vite/i.test(html)) ok('no React/Vite traces in output')
else fail('output references React/Vite')

console.log('')
if (failures) { console.error(`FAILED (${failures})`); process.exit(1) }
console.log('All checks passed.')
