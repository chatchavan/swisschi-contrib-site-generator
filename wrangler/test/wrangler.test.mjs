// JS wrangler reproduces the reference Python output. 
// Run: node wrangler/test/wrangler.test.mjs
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { findSwissPapers, paperToRow } from '../wrangler.js'

const WS = dirname(fileURLToPath(import.meta.url))


// --- check JSON test files and provide download instructions ---

const chiFile = join('test', 'CHI_2026_program.json');
const disFile = join('test', 'DIS_2026_program.json');

const chiExists = existsSync(chiFile);
const disExists = existsSync(disFile);

if (!chiExists || !disExists) {
    console.log('\nPlease download the missing files:');
    
    if (!chiExists) {
        console.log('- "CHI_2026_program.json" can be downloaded from https://programs.sigchi.org/chi/2026');
    }
    
    if (!disExists) {
        console.log('- "DIS_2026_program.json"  can be downloaded from https://programs.sigchi.org/dis/2026');
    }
    console.log('\nAt the bottom of each page, click "Get conference data JSON". Put the files in the "test" folder and re-run this test.');
    process.exit(1);

} else {

    console.log('All required JSON test files found successfully!');
}


// --- minimal RFC-4180 CSV parser (handles quoted fields with commas/newlines) ---
function parseCSV(text) {
  const rows = []
  let row = [],
    field = '',
    inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

function csvToObjects(text) {
  const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ''))
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
}

let failures = 0
const fail = (msg) => { console.error('  ✗ ' + msg); failures++ }
const ok = (msg) => console.log('  ✓ ' + msg)

// --- load inputs ---
const program = JSON.parse(
  readFileSync(resolve(WS, 'CHI_2026_program.json'), 'utf-8'),
)
const expected = csvToObjects(
  readFileSync(resolve(WS, 'SwissCHI CHI 2026 - swiss_papers.csv'), 'utf-8'),
).filter((r) => r.ID && r.ID.trim()) // drop manually-added blank-ID rows

const papers = findSwissPapers(program)
const rows = papers.map((p) => paperToRow(p))
const byId = new Map(rows.map((r) => [r.ID, r]))
const expById = new Map(expected.map((r) => [r.ID, r]))

console.log('Core verification\n')

// 1) deterministic row count == reference Python script (86)
if (papers.length === 86) ok(`found ${papers.length} Swiss papers (matches Python script)`)
else fail(`expected 86 deterministic papers, got ${papers.length}`)

// 2) algorithm-controlled columns match the expected CSV on shared rows, 0 mismatches
const ALGO_COLS = [
  'Link', 'Title', 'Type',
  'Swiss Authors Count', 'Swiss Authors', 'All Authors', 'Abstract', 'Awards'
]
const shared = [...byId.keys()].filter((id) => expById.has(id))
let mism = 0
for (const id of shared) {
  for (const col of ALGO_COLS) {
    const got = (byId.get(id)[col] ?? '').trim()
    const exp = (expById.get(id)[col] ?? '').trim()
    if (got !== exp) {
      mism++
      if (mism <= 5) fail(`id=${id} col="${col}"\n      exp: ${JSON.stringify(exp.slice(0, 80))}\n      got: ${JSON.stringify(got.slice(0, 80))}`)
    }
  }
}
if (mism === 0) ok(`${shared.length} shared rows × ${ALGO_COLS.length} algorithm columns: 0 mismatches`)
else fail(`${mism} algorithm-column mismatches across ${shared.length} shared rows`)

// 3) curation columns are emitted empty by default
const nonEmptyCuration = rows.filter((r) => r["Author's Message"]).length
if (nonEmptyCuration === 0) ok('Author\'s Message emitted empty by default')
else fail(`${nonEmptyCuration} rows have non-empty curation columns (should be 0)`)

// 4) CHI link shape
if (rows.every((r) => r.Link.startsWith('https://programs.sigchi.org/chi/2026/program/content/')))
  ok('all links use the CHI 2026 content URL')
else fail('some links do not match the CHI content URL pattern')

// 5) generic content URL derives slug+year from the conference object.
console.log('\nContent derives slug+year from the conference object in JSON\n')
import('../wrangler.js').then(({ buildContentLink }) => {
  const chiLink = buildContentLink({ shortName: 'CHI', year: 2026 }, 1)
  if (chiLink === 'https://programs.sigchi.org/chi/2026/program/content/1')
    ok('CHI conference -> chi/2026 link')
  else fail(`CHI link wrong: ${chiLink}`)

  // DIS fixture: slug/year/ids all sourced from the official DIS program JSON.
  const dis = JSON.parse(readFileSync(resolve(WS, 'DIS_2026_program.json'), 'utf-8'))
  const disPapers = findSwissPapers(dis)
  const allDis = disPapers.every((p) =>
    p.link.startsWith('https://programs.sigchi.org/dis/2026/program/content/'),
  )
  if (disPapers.length > 0 && allDis)
    ok(`DIS conference -> dis/2026 links (${disPapers.length} papers)`)
  else fail('DIS links not generically derived')

  console.log('')
  if (failures) { console.error(`FAILED (${failures} check(s))`); process.exit(1) }
  console.log('All checks passed.')
})
