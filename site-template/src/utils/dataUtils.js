// Parse CSV text into array of objects.
// RFC-4180 aware: quoted fields may contain commas, escaped quotes ("") and
// newlines, so abstracts that span multiple lines parse correctly.
export function parseCSV(text) {
  const rows = parseCSVRows(text).filter(r => r.some(c => c.trim() !== ''))
  if (rows.length === 0) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1).map(values => {
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim()
    })
    return row
  })
}

// Split full CSV text into rows (each an array of field strings),
// correctly handling quoted fields that contain newlines.
function parseCSVRows(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += char
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field); field = ''
    } else if (char === '\r') {
      // ignore; the following \n (or end of text) ends the row
    } else if (char === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else field += char
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// Count occurrences and return sorted array of [key, count]
export function countBy(arr, fn) {
  const counts = {}
  arr.forEach(item => {
    const key = fn(item)
    if (Array.isArray(key)) {
      key.forEach(k => {
        if (k.trim()) counts[k.trim()] = (counts[k.trim()] || 0) + 1
      })
    } else if (key) {
      counts[key] = (counts[key] || 0) + 1
    }
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

// Map an award string to its display icon and CSS class name.
// Priority order: "best paper" → 🏆, "competition" → 🙌, otherwise → 🏅
export function getAwardStyle(award) {
  const a = (award || '').toLowerCase()
  if (a.includes('best paper'))  return { icon: '🏆', className: 'tag-award-best' }
  if (a.includes('competition')) return { icon: '🙌', className: 'tag-award-competition' }
  return { icon: '🏅', className: 'tag-award-honorable' }
}

// Get Swiss author names as an array
export function getSwissAuthorNames(swissAuthors) {
  if (!swissAuthors) return []

  return swissAuthors.split('; ').map(a => {
    const match = a.match(/^([^(]+)/)
    return match ? match[1].trim() : ''
  }).filter(n => n)
}
