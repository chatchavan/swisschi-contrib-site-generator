// Generator UI — two independent stages:
//   Stage 1: program JSON  -> swiss_papers.csv  (download)
//   Stage 2: curated CSV    -> deployable site ZIP (download)
// Depends on inlined globals: findSwissPapers, papersToCSV (wrangler),
// makeZip, utf8, base64ToBytes (zip), renderSingleSite (site-single),
// SITE_TEMPLATE + DEFAULT_CONFIG (injected).

;(function () {
  'use strict'

  // Stop the browser from navigating to / opening a file dropped anywhere on the
  // page (the default action). Without this, a drop that lands outside a zone —
  // or whose drop target is a child element — opens the file instead of being
  // handled. Zone-specific listeners still receive the event and read its files.
  ;['dragover', 'drop'].forEach((ev) =>
    window.addEventListener(ev, (e) => { e.preventDefault() }, false))

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id)

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function wireDrop(zoneId, onFile, accept) {
    const zone = $(zoneId)
    const onpick = (file) => { if (file) onFile(file) }
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag') })
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'))
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('drag')
      onpick(e.dataTransfer.files[0])
    })
    const input = zone.querySelector('input[type=file]')
    if (accept) input.accept = accept
    zone.addEventListener('click', () => input.click())
    input.addEventListener('change', () => onpick(input.files[0]))
  }

  // minimal RFC-4180 CSV parse -> { headers, rows }
  function parseCSV(text) {
    const rows = []
    let row = [], field = '', q = false
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else q = false }
        else field += c
      } else if (c === '"') q = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else field += c
    }
    if (field.length || row.length) { row.push(field); rows.push(row) }
    const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''))
    const headers = (nonEmpty[0] || []).map((h) => h.trim())
    const objs = nonEmpty.slice(1).map((r) => {
      const o = {}; headers.forEach((h, i) => (o[h] = (r[i] || '').trim())); return o
    })
    return { headers, rows: objs }
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  }

  function renderPapersPreview(target, rows) {
    if (!rows.length) { target.innerHTML = '<p class="muted">No Swiss papers found.</p>'; return }
    const head = rows.slice(0, 8).map((r) => `
      <tr><td>${escapeHtml(r.Title || r['Title'] || '')}</td>
          <td>${escapeHtml(r['Swiss Institutes'] || '')}</td>
          <td>${escapeHtml(r.Type || '')}</td></tr>`).join('')
    target.innerHTML = `
      <table class="preview">
        <thead><tr><th>Title</th><th>Swiss Institutes</th><th>Type</th></tr></thead>
        <tbody>${head}</tbody>
      </table>
      ${rows.length > 8 ? `<p class="muted">…and ${rows.length - 8} more.</p>` : ''}`
  }

  // ---------- Stage 1: JSON -> CSV ----------
  let stage1Csv = null
  wireDrop('s1-drop', (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        const papers = findSwissPapers(data)
        stage1Csv = papersToCSV(papers)
        const conf = data.conference || {}
        $('s1-status').textContent =
          `✓ ${papers.length} Swiss papers from ${conf.shortName || '?'} ${conf.year || ''} (${file.name}).`
        $('s1-status').className = 'status ok'
        renderPapersPreview($('s1-preview'), parseCSV(stage1Csv).rows)
        $('s1-download').disabled = false
      } catch (err) {
        stage1Csv = null
        $('s1-status').textContent = '✗ ' + (err.message || 'Could not parse JSON.')
        $('s1-status').className = 'status err'
        $('s1-preview').innerHTML = ''
        $('s1-download').disabled = true
      }
    }
    reader.readAsText(file)
  }, '.json,application/json')

  $('s1-download').addEventListener('click', () => {
    if (!stage1Csv) return
    downloadBlob(new Blob([stage1Csv], { type: 'text/csv' }), 'swiss_papers.csv')
  })

  // ---------- Stage 2: CSV -> site ZIP ----------
  let stage2Csv = null

  // Prefill config form from the template defaults.
  const CFG_FIELDS = ['pageTitle', 'headerTitle', 'headerSubtitle', 'location',
    'chapterUrl', 'linkedinUrl', 'footerCredit', 'sheetCsvUrl']
  CFG_FIELDS.forEach((k) => { if ($('cfg-' + k)) $('cfg-' + k).value = DEFAULT_CONFIG[k] || '' })
  // Embed mode by default: clear the sheet URL so the curated CSV is used.
  if ($('cfg-sheetCsvUrl')) $('cfg-sheetCsvUrl').value = ''

  // Persist the config text fields in localStorage so they survive reloads.
  // Saved values override the template defaults above.
  const STORE_KEY = 'swisschi-generator:config'
  const PERSIST_IDS = ['cfg-deployUrl', ...CFG_FIELDS.map((k) => 'cfg-' + k)]
  function loadSaved() {
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { saved = {} }
    PERSIST_IDS.forEach((id) => {
      if (id in saved && $(id)) $(id).value = saved[id]
    })
  }
  function saveFields() {
    const data = {}
    PERSIST_IDS.forEach((id) => { if ($(id)) data[id] = $(id).value })
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
  }
  loadSaved()
  PERSIST_IDS.forEach((id) => { if ($(id)) $(id).addEventListener('input', saveFields) })

  wireDrop('s2-drop', (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      stage2Csv = reader.result
      const { headers, rows } = parseCSV(stage2Csv)
      const hasTitle = headers.includes('Title')
      $('s2-status').textContent = hasTitle
        ? `✓ ${rows.length} rows loaded from ${file.name}.`
        : `⚠ Loaded ${file.name}, but no "Title" column found — is this the right CSV?`
      $('s2-status').className = 'status ' + (hasTitle ? 'ok' : 'err')
      renderPapersPreview($('s2-preview'), rows)
      $('s2-build').disabled = false
    }
    reader.readAsText(file)
  }, '.csv,text/csv')

  // Derive { basePath, folder, homepage } from a deploy URL or host.
  function parseDeploy(input) {
    const raw = (input || '').trim()
    if (!raw) return { basePath: '/', folder: 'swisschi-site', homepage: '' }
    let u
    try { u = new URL(/^https?:\/\//.test(raw) ? raw : 'https://' + raw) }
    catch { return { basePath: '/', folder: 'swisschi-site', homepage: '' } }
    let path = u.pathname.replace(/\/+$/, '')
    const basePath = path ? path + '/' : '/'
    const seg = path.split('/').filter(Boolean)
    const folder = seg.length ? seg[seg.length - 1] : u.hostname
    const homepage = u.origin + (path || '')
    return { basePath, folder, homepage }
  }

  function yamlEscape(v) {
    return "'" + String(v ?? '').replace(/'/g, "''") + "'"
  }

  function buildConferenceYaml(cfg, basePath) {
    const f = (k, v) => `${k}: ${yamlEscape(v)}`
    return [
      '# Generated by the SwissCHI site generator.',
      '# Per-conference configuration (baked in at build time).',
      '',
      '# --- Data source ---',
      '# sheetCsvUrl empty => use the embedded public/<dataFile> CSV.',
      f('sheetCsvUrl', cfg.sheetCsvUrl || ''),
      f('dataFile', 'swiss_papers.csv'),
      '',
      '# --- Page metadata ---',
      f('pageTitle', cfg.pageTitle),
      f('faviconPath', '/swisschi.svg'),
      '',
      '# --- Header ---',
      f('headerTitle', cfg.headerTitle),
      f('headerSubtitle', cfg.headerSubtitle),
      f('location', cfg.location),
      '',
      '# --- Social / org links ---',
      f('chapterUrl', cfg.chapterUrl),
      f('linkedinUrl', cfg.linkedinUrl),
      '',
      '# --- Footer ---',
      f('footerCredit', cfg.footerCredit),
      '',
      '# --- Build / deploy ---',
      f('basePath', basePath),
      '',
    ].join('\n')
  }

  function patchPackageJson(text, homepage) {
    if (!homepage) return text
    try {
      const pkg = JSON.parse(text)
      pkg.homepage = homepage
      return JSON.stringify(pkg, null, 2) + '\n'
    } catch { return text }
  }

  // Regenerate the conference-specific top of README.md from the config,
  // keeping the generic sections (from "## Configuration" onward) unchanged.
  function patchReadme(original, cfg, homepage) {
    const title = cfg.headerTitle || '🇨🇭 Swiss Contributions'
    const sub = cfg.headerSubtitle || ''
    const loc = cfg.location || ''
    const where = [sub, loc && !sub.includes(loc) ? loc : ''].filter(Boolean).join(' · ')
    const header = [
      `# ${title}`,
      '',
      `A web app showcasing Swiss research contributions${where ? ` — ${where}` : ''}.`,
      '',
      homepage ? `**Live site:** ${homepage}\n` : '',
      '## Features',
      '',
      '- Browse all Swiss contributions',
      '- Filter by type, institution, author, or award',
      '- Clickable tags for quick filtering',
      '- View author messages',
      '- Best Paper 🏆 and Honorable Mention 🏅 highlights',
      '',
    ].join('\n')
    const idx = original.indexOf('## Configuration')
    return idx >= 0 ? header + '\n' + original.slice(idx) : header
  }

  const outputMode = () => {
    const el = document.querySelector('input[name="s2-output"]:checked')
    return el ? el.value : 'single'
  }
  document.querySelectorAll('input[name="s2-output"]').forEach((r) =>
    r.addEventListener('change', () => {
      $('s2-build').textContent = outputMode() === 'single' ? 'Build single HTML' : 'Build site ZIP'
    }))
  $('s2-build').textContent = 'Build single HTML'

  $('s2-build').addEventListener('click', () => {
    if (!stage2Csv) return
    const cfg = {}
    CFG_FIELDS.forEach((k) => (cfg[k] = $('cfg-' + k) ? $('cfg-' + k).value.trim() : ''))
    const deploy = parseDeploy($('cfg-deployUrl').value)

    // Single static HTML output: a from-scratch vanilla page with the parsed
    // CSV embedded as JSON (Liquid/Jekyll-safe serialization).
    if (outputMode() === 'single') {
      const { rows } = parseCSV(stage2Csv)
      const htmlOut = renderSingleSite(cfg, rows)
      downloadBlob(new Blob([htmlOut], { type: 'text/html' }), deploy.folder + '.html')
      $('s2-status').textContent =
        `✓ Built ${deploy.folder}.html — one self-contained page (${rows.length} papers embedded as JSON). Open it directly or host it anywhere.`
      $('s2-status').className = 'status ok'
      return
    }

    const entries = []
    const add = (name, bytes) => entries.push({ name: deploy.folder + '/' + name, bytes })

    for (const [path, file] of Object.entries(SITE_TEMPLATE)) {
      let bytes
      if (path === 'conference.yaml') {
        bytes = utf8(buildConferenceYaml(cfg, deploy.basePath))
      } else if (path === 'package.json') {
        bytes = utf8(patchPackageJson(file.c, deploy.homepage))
      } else if (path === 'README.md') {
        bytes = utf8(patchReadme(file.c, cfg, deploy.homepage))
      } else if (file.t === 'b64') {
        bytes = base64ToBytes(file.c)
      } else {
        bytes = utf8(file.c)
      }
      add(path, bytes)
    }
    // Embed the curated CSV so the site is self-contained.
    add('public/swiss_papers.csv', utf8(stage2Csv))

    const blob = makeZip(entries)
    downloadBlob(blob, deploy.folder + '.zip')
    $('s2-status').textContent =
      `✓ Built ${deploy.folder}.zip (basePath ${deploy.basePath}). Unzip, then: npm install && npm run deploy`
    $('s2-status').className = 'status ok'
  })
})()
