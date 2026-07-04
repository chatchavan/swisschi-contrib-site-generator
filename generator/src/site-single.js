// From-scratch single-page site builder (no React/Vite). Produces one
// self-contained HTML file with the conference config + papers embedded as
// JSON, plus a small vanilla-JS app replicating the React template's behavior:
// header, active-filter chips, clickable type/institute/award/author tags,
// expandable Author's Message, URL-hash filter sync, footer.
//
// Inlining caveats (this file is inlined into the generator's <script>):
// never write a literal closing script tag (use the '<\/script>' escape) and
// keep the source free of Liquid trigger sequences.

// CSS ported from site-template/src (index, App, Header, Filters, PaperList,
// PaperCard, Error), with #root renamed to #app.
const SITE_CSS = `
:root {
  --swiss-red: #dc0018;
  --swiss-red-dark: #8b0012;
  --swiss-red-light: rgba(220, 0, 24, 0.08);
  --accent: #2c3e50;
  --accent-light: #3498db;
  --text-primary: #2c3e50;
  --text-secondary: #5a6c7d;
  --text-muted: #95a5a6;
  --bg-primary: #f8f9fa;
  --bg-card: #ffffff;
  --bg-hover: #fafbfc;
  --border-color: #e9ecef;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-primary);
}
#app { min-height: 100vh; }
.app { min-height: 100vh; display: flex; flex-direction: column; }
.container { max-width: 1400px; margin: 0 auto; padding: 20px; flex: 1; }
.section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 25px;
  margin-bottom: 30px;
}
.section h2 {
  margin-bottom: 20px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
  font-weight: 600;
}
.papers-count { margin-bottom: 15px; color: var(--text-secondary); }
.footer { text-align: center; padding: 30px; color: var(--text-secondary); font-size: 0.9em; }
.footer a { color: var(--accent-light); }
.header {
  background: #ffffff;
  color: var(--text-primary);
  padding: 40px 20px;
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 1px solid var(--border-color);
}
.header h1 { font-size: 2.2em; margin-bottom: 8px; font-weight: 600; }
.header p { font-size: 1.1em; color: var(--text-secondary); margin-bottom: 15px; }
.header-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.95em;
  color: var(--text-secondary);
}
.header-links a { color: var(--accent-light); text-decoration: none; font-weight: 500; transition: color 0.2s; }
.header-links a:hover { color: var(--accent); text-decoration: underline; }
.header-links .separator { color: var(--text-muted); }
.header-links .linkedin-link { display: inline-flex; align-items: center; gap: 4px; }
.header-links .linkedin-link svg { flex-shrink: 0; }
@media (max-width: 768px) {
  .header h1 { font-size: 1.8em; }
}
.active-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 15px; }
.active-filters-label { font-size: 0.9em; color: #666; }
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 0.85em;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.filter-chip:hover { background: #e0e0e0; transform: scale(1.02); }
.filter-chip-type { background: #e8f4f8; border-color: #b8d4e3; }
.filter-chip-type:hover { background: #d0e8f0; }
.filter-chip-institute { background: #f0f4f8; border-color: #c5d3e0; }
.filter-chip-institute:hover { background: #e0e8f0; }
.filter-chip-award { background: #fff8e1; border-color: #ffd700; }
.filter-chip-award:hover { background: #ffecb3; }
.filter-chip-remove { font-size: 1.2em; font-weight: bold; line-height: 1; color: #666; }
.filter-chip:hover .filter-chip-remove { color: #333; }
.clear-all-filters {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #999;
  border-radius: 20px;
  font-size: 0.85em;
  color: #666;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.clear-all-filters:hover { background: #333; border-color: #333; color: white; }
.paper-list { display: flex; flex-direction: column; gap: 15px; }
.paper-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  background: #ffffff;
  transition: box-shadow 0.2s, transform 0.2s;
}
.paper-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.paper-card h3 { margin-bottom: 10px; color: #222; font-size: 1.1em; }
.paper-card h3 a { color: var(--text-primary); text-decoration: none; }
.paper-card h3 a:hover { color: var(--accent-light); text-decoration: underline; }
.paper-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.tag { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.85em; font-weight: 500; }
.tag-type { background: #e0e0e0; color: #333; }
.tag-institute { background: #e8e8e8; color: #444; }
.tag-award { font-weight: 600; }
.tag-award-best { background: #ffd700; color: #5d4800; }
.tag-award-best.tag-clickable:hover { background: #e6c200; }
.tag-award-honorable { background: #e8d5b7; color: #6b5a3e; }
.tag-award-honorable.tag-clickable:hover { background: #d9c4a3; }
.tag-award-competition { background: #d9f2e6; color: #1f5e42; }
.tag-award-competition.tag-clickable:hover { background: #c2e8d4; }
.tag-clickable { cursor: pointer; border: none; transition: background 0.2s, transform 0.1s; }
.tag-clickable:hover { background: #d0d0d0; transform: scale(1.05); }
.tag-type.tag-clickable:hover { background: var(--accent); color: white; }
.paper-authors { font-size: 0.9em; color: var(--text-secondary); margin-bottom: 10px; line-height: 1.5; }
.swiss-author-link {
  background: #fff3cd;
  padding: 2px 4px;
  border-radius: 3px;
  border: none;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  color: #856404;
  font-weight: 500;
  transition: background 0.2s;
}
.swiss-author-link:hover { background: #ffc107; color: #533f03; }
.expand-toggle {
  display: block;
  width: 100%;
  padding: 8px;
  margin-top: 10px;
  background: transparent;
  border: 1px dashed #ccc;
  border-radius: var(--radius-sm);
  color: #666;
  font-size: 0.85em;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.expand-toggle:hover { background: #f5f5f5; border-color: #999; color: #333; }
.paper-expandable { margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; }
.paper-expandable p { font-size: 0.9em; color: var(--text-secondary); line-height: 1.6; margin: 0; }
.error-container { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: 20px; }
.error-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 40px;
  max-width: 500px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.error-card h2 { color: var(--swiss-red); margin-bottom: 15px; }
.error-message { color: var(--text-primary); font-size: 1.1em; }
`

// The in-page application. Serialized into the generated page via .toString(),
// so it must be fully self-contained (no references to outer scope).
function siteApp(conference, papers) {
  'use strict'

  if (conference.pageTitle) document.title = conference.pageTitle

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  function awardStyle(award) {
    var a = (award || '').toLowerCase()
    if (a.indexOf('best paper') !== -1)  return { icon: '🏆', cls: 'tag-award-best' }
    if (a.indexOf('competition') !== -1) return { icon: '🙌', cls: 'tag-award-competition' }
    return { icon: '🏅', cls: 'tag-award-honorable' }
  }
  function awardIcon(award) { return awardStyle(award).icon }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c] })
  }

  // Swiss author names from the "Swiss Authors" column ("Name (Inst, City); …")
  function swissNames(swissAuthors) {
    if (!swissAuthors) return []
    return swissAuthors.split('; ').map(function (a) {
      var m = a.match(/^([^(]+)/)
      return m ? m[1].trim() : ''
    }).filter(Boolean)
  }

  // ---------- state ----------
  var state = { search: '', type: '', institute: '', award: '' }
  var expanded = {} // paper ID -> true when Author's Message is open

  // Supports #filter:value and #search=x&type=y&institute=z&award=w
  function parseHashFilters() {
    var hash = window.location.hash.slice(1)
    if (!hash) return {}
    if (hash.indexOf('filter:') === 0) {
      return { search: decodeURIComponent(hash.slice(7)) }
    }
    var params = new URLSearchParams(hash)
    return {
      search: params.get('search') || '',
      type: params.get('type') || '',
      institute: params.get('institute') || '',
      award: params.get('award') || '',
    }
  }

  function applyHashToState() {
    var f = parseHashFilters()
    state.search = f.search || ''
    state.type = f.type || ''
    state.institute = f.institute || ''
    state.award = f.award || ''
  }

  function syncHash() {
    var params = new URLSearchParams()
    if (state.search) params.set('search', state.search)
    if (state.type) params.set('type', state.type)
    if (state.institute) params.set('institute', state.institute)
    if (state.award) params.set('award', state.award)
    var qs = params.toString()
    var newHash = qs ? '#' + qs : ''
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash || window.location.pathname)
    }
  }

  function setFilter(key, value) {
    state[key] = value
    syncHash()
    render()
  }

  // ---------- filtering (same logic as the deployable site) ----------
  function filteredPapers() {
    var q = state.search.toLowerCase()
    return papers.filter(function (p) {
      var matchesSearch = !state.search ||
        (p.Title || '').toLowerCase().indexOf(q) !== -1 ||
        (p['All Authors'] || '').toLowerCase().indexOf(q) !== -1 ||
        (p.Abstract || '').toLowerCase().indexOf(q) !== -1
      var matchesType = !state.type || p.Type === state.type
      var matchesInstitute = !state.institute ||
        (p['Swiss Institutes'] || '').indexOf(state.institute) !== -1
      var matchesAward = !state.award ||
        (p.Awards || '').toLowerCase().indexOf(state.award.toLowerCase()) !== -1
      return matchesSearch && matchesType && matchesInstitute && matchesAward
    })
  }

  // ---------- rendering ----------
  function chipsHtml() {
    var active = state.search || state.type || state.institute || state.award
    if (!active) return ''
    var h = '<div class="active-filters"><span class="active-filters-label">Active filters:</span>'
    if (state.search) {
      h += '<button class="filter-chip" data-clear="search">Search: "' + esc(state.search) +
        '"<span class="filter-chip-remove">×</span></button>'
    }
    if (state.type) {
      h += '<button class="filter-chip filter-chip-type" data-clear="type">' + esc(state.type) +
        '<span class="filter-chip-remove">×</span></button>'
    }
    if (state.institute) {
      h += '<button class="filter-chip filter-chip-institute" data-clear="institute">' + esc(state.institute) +
        '<span class="filter-chip-remove">×</span></button>'
    }
    if (state.award) {
      var ic = awardIcon(state.award)
      h += '<button class="filter-chip filter-chip-award" data-clear="award">' + ic + ' ' + esc(state.award) +
        '<span class="filter-chip-remove">×</span></button>'
    }
    h += '<button class="clear-all-filters" data-clear="all">Clear all</button></div>'
    return h
  }

  function authorsHtml(p) {
    var all = p['All Authors'] || ''
    if (!all) return ''
    var names = swissNames(p['Swiss Authors'] || '')
    if (!names.length) return esc(all)
    var escaped = names.map(function (n) { return n.replace(/[.*+?^$()|[\]\\]/g, '\\$&') })
    var re = new RegExp('(' + escaped.join('|') + ')', 'g')
    return all.split(re).map(function (part) {
      if (names.indexOf(part) !== -1) {
        return '<button class="swiss-author-link" data-action="author" data-value="' + esc(part) + '">' +
          esc(part) + '</button>'
      }
      return '<span>' + esc(part) + '</span>'
    }).join('')
  }

  function cardHtml(p) {
    var institutes = (p['Swiss Institutes'] || '').split('; ').filter(Boolean)
    var award = (p.Awards || '').trim()
    var message = (p["Author's Message"] || '').trim()
    var id = String(p.ID || '')
    var h = '<article class="paper-card">'
    h += '<h3><a href="' + esc(p.Link || '#') + '" target="_blank" rel="noopener noreferrer">' +
      esc(p.Title) + '</a></h3>'
    h += '<div class="paper-meta">'
    h += '<button class="tag tag-type tag-clickable" data-action="type" data-value="' + esc(p.Type) + '">' +
      esc(p.Type) + '</button>'
    institutes.forEach(function (inst) {
      h += '<button class="tag tag-institute tag-clickable" data-action="institute" data-value="' + esc(inst) + '">' +
        esc(inst) + '</button>'
    })
    if (award) {
      var as = awardStyle(award)
      h += '<button class="tag tag-award tag-clickable ' + as.cls +
        '" data-action="award" data-value="' + esc(award) + '">' + as.icon + ' ' + esc(award) + '</button>'
    }
    h += '</div>'
    h += '<div class="paper-authors">' + authorsHtml(p) + '</div>'
    if (message) {
      var open = !!expanded[id]
      h += '<button class="expand-toggle" data-action="toggle" data-id="' + esc(id) + '">' +
        (open ? "▲ Hide Author's Message" : "▼ Author's Message") + '</button>'
      if (open) h += '<div class="paper-expandable"><p>' + esc(message) + '</p></div>'
    }
    h += '</article>'
    return h
  }

  function render() {
    var list = filteredPapers()
    document.getElementById('filters').innerHTML = chipsHtml()
    document.getElementById('count').textContent = 'Showing ' + list.length + ' contributions'
    document.getElementById('list').innerHTML = list.map(cardHtml).join('')
  }

  // ---------- static shell ----------
  function shellHtml() {
    var linkedinSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
    return '<div class="app">' +
      '<header class="header">' +
      '<h1>' + esc(conference.headerTitle) + '</h1>' +
      '<p>' + esc(conference.headerSubtitle) + '</p>' +
      '<div class="header-links">' +
      '<span>A project by</span>' +
      '<a href="' + esc(conference.chapterUrl) + '" target="_blank" rel="noopener noreferrer">Chapter</a>' +
      '<span class="separator">·</span>' +
      '<a href="' + esc(conference.linkedinUrl) + '" target="_blank" rel="noopener noreferrer" class="linkedin-link">' +
      linkedinSvg + 'LinkedIn</a>' +
      '</div></header>' +
      '<div class="container"><section class="section">' +
      '<h2>All Contributions</h2>' +
      '<div id="filters"></div>' +
      '<div class="papers-count" id="count"></div>' +
      '<div class="paper-list" id="list"></div>' +
      '</section></div>' +
      '<footer class="footer">' + esc(conference.footerCredit) +
      ' • Vibe-Coded by Claude and <a href="https://peachlab.inf.ethz.ch/" target="_blank" rel="noopener noreferrer">April Wang</a> with ❤️. ' +
      'Additional contributions from <a href="https://chatw.ch" target="_blank" rel="noopener noreferrer">Chat Wacharamanotham</a>' +
      '</footer></div>'
  }

  function errorHtml(message) {
    return '<div class="error-container"><div class="error-card">' +
      '<h2>Error loading data</h2><p class="error-message">' + esc(message) + '</p>' +
      '</div></div>'
  }

  // ---------- boot ----------
  var root = document.getElementById('app')
  if (!papers || !papers.length) {
    root.innerHTML = errorHtml('No data found in this page.')
    return
  }
  root.innerHTML = shellHtml()

  // Event delegation: survives re-renders of chips and list.
  root.addEventListener('click', function (e) {
    var btn = e.target.closest('button')
    if (!btn) return
    if (btn.hasAttribute('data-clear')) {
      var which = btn.getAttribute('data-clear')
      if (which === 'all') {
        state.search = ''; state.type = ''; state.institute = ''; state.award = ''
      } else {
        state[which] = ''
      }
      syncHash()
      render()
      return
    }
    var action = btn.getAttribute('data-action')
    if (action === 'toggle') {
      var id = btn.getAttribute('data-id')
      expanded[id] = !expanded[id]
      render()
    } else if (action === 'author') {
      setFilter('search', btn.getAttribute('data-value'))
    } else if (action === 'type') {
      setFilter('type', btn.getAttribute('data-value'))
    } else if (action === 'institute') {
      setFilter('institute', btn.getAttribute('data-value'))
    } else if (action === 'award') {
      setFilter('award', btn.getAttribute('data-value'))
    }
  })

  window.addEventListener('hashchange', function () {
    applyHashToState()
    render()
  })

  applyHashToState()
  render()
}

// Serialize a value as JSON safe to embed inside a script element of an HTML
// file that Jekyll/Liquid might process: '<' becomes the < escape (so no
// closing-script-tag sequence can form) and any '{' directly followed by '{'
// or '%' becomes { (so no Liquid trigger survives). Both substitutions
// only ever apply inside JSON string values, where \u escapes are valid; JSON
// structure alone never produces those sequences.
function jsonForPage(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\{(?=[{%])/g, '\\u007b')
}

function escTitle(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  })
}

// Build the complete one-page site. `conf` is the conference config object;
// `papers` is the array of row objects parsed from the curated CSV.
export function renderSingleSite(conf, papers) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<title>' + escTitle(conf.pageTitle || 'Swiss Contributions') + '</title>',
    '<style>' + SITE_CSS + '</style>',
    '</head>',
    '<body>',
    '<div id="app"></div>',
    '<script>',
    'var CONFERENCE = ' + jsonForPage(conf) + ';',
    'var PAPERS = ' + jsonForPage(papers) + ';',
    '(' + siteApp.toString() + ')(CONFERENCE, PAPERS);',
    '<\/script>',
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
