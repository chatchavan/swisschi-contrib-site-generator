// Swiss-papers data wrangler — browser/Node ES module.
// Pure functions over a parsed SIGCHI program-JSON object: no fs, no network.
// A port of find_swiss_papers.py from https://github.com/swisschi-chi26/chi26-data-wrangler

// Entity resolution mapping for Swiss institutes.
export const INSTITUTE_MAPPING = {
  // ETH Zurich variations
  'ETH Zürich': 'ETH Zurich',
  'ETH': 'ETH Zurich',
  'Institute of Cartography and Geoinformation, ETH Zurich': 'ETH Zurich',
  // EPFL variations
  'Ecole Polytechnique Fédérale de Lausanne (EPFL)': 'EPFL',
  'Ecole polytechnique fédérale de Lausanne (EPFL)': 'EPFL',
  // University of Zurich variations
  'University of Zürich': 'University of Zurich',
  // University of St. Gallen variations
  'University of St.Gallen': 'University of St. Gallen',
  // USI variations
  'Università della Svizzera Italiana': 'Università della Svizzera Italiana (USI)',
  'Università della Svizzera italiana': 'Università della Svizzera Italiana (USI)',
  'Università della Svizzera italiana (USI)': 'Università della Svizzera Italiana (USI)',
  'Università della Svizzera italiana, USI': 'Università della Svizzera Italiana (USI)',
  // University of Neuchâtel variations
  'Université de Neuchâtel': 'University of Neuchâtel',
  // Zurich University of the Arts variations
  'Zurich University of Arts': 'Zurich University of the Arts',
  // Google variations
  'Google Research': 'Google',
  // Psychiatric hospital variations
  'Psychiatric University Clinic': 'Psychiatric University Hospital Zurich',
}

// Normalize an institute name using the mapping (identity if not mapped).
export function normalizeInstitute(name, mapping = INSTITUTE_MAPPING) {
  return mapping[name] ?? name
}

// Build the public program link for a content item, generically from the
// conference's shortName + year (e.g. CHI/2026 -> .../chi/2026/...,
// DIS/2026 -> .../dis/2026/...). A correct link resolves to the content page;
// a wrong slug/year redirects to the program homepage.
export function buildContentLink(conference, id) {
  const slug = String(conference?.shortName ?? '').toLowerCase()
  const year = conference?.year ?? ''
  return `https://programs.sigchi.org/${slug}/${year}/program/content/${id}`
}

// Find all papers with at least one Switzerland-affiliated author.
// `data` is the parsed program JSON object.
export function findSwissPapers(data, { mapping = INSTITUTE_MAPPING } = {}) {
  const people = data.people ?? []
  const peopleLookup = new Map(people.map((p) => [p.id, p]))

  const typeLookup = new Map((data.contentTypes ?? []).map((ct) => [ct.id, ct.name]))


  const conference = data.conference ?? {}
  const items = data.contents ?? []
  const swissPapers = []

  for (const item of items) {
    const authors = item.authors ?? []
    const swissAuthors = []
    const allAuthors = []

    for (const author of authors) {
      const personId = author.personId
      const person = peopleLookup.get(personId) ?? {}
      const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
      const affiliations = author.affiliations ?? []

      // First affiliation feeds the "all authors" display string.
      if (affiliations.length > 0) {
        const aff = affiliations[0]
        allAuthors.push(`${name} (${aff.institution ?? 'N/A'})`)
      } else {
        allAuthors.push(name)
      }

      for (const affiliation of affiliations) {
        if (affiliation.country === 'Switzerland') {
          swissAuthors.push({
            personId,
            name,
            institution: affiliation.institution,
            city: affiliation.city,
          })
          break // one Swiss affiliation per author is enough
        }
      }
    }

    if (swissAuthors.length > 0) {
      function translateAward(award) {
        const awardMap = {
          "HONORABLE_MENTION": "Honorable Mention",
          "BEST_PAPER": "Best Paper",
        };
        
        return awardMap[award] || award;
      }

      const awards = translateAward(item.award) ;

      // Truncate on the raw string (counting CRLF as 2 chars, like the Python
      // reference), then normalize embedded newlines to '\n' to match the
      // Google-Sheet export the website consumes.
      const rawAbstract = item.abstract ?? ''
      const abstract = (
        rawAbstract.length > 200 ? rawAbstract.slice(0, 200) + '...' : rawAbstract
      ).replace(/\r\n?/g, '\n')

      swissPapers.push({
        id: item.id,
        title: item.title,
        type: typeLookup.get(item.typeId) ?? 'Unknown',
        importedId: item.importedId,
        link: buildContentLink(conference, item.id),
        abstract,
        swissAuthors,
        allAuthors,
        totalAuthors: authors.length,
        awards,
      })
    }
  }

  return swissPapers
}

// Unique, normalized list of Swiss institutes for a paper.
export function swissInstitutes(paper, mapping = INSTITUTE_MAPPING) {
  const seen = []
  for (const a of paper.swissAuthors) {
    const inst = normalizeInstitute(a.institution, mapping)
    if (!seen.includes(inst)) seen.push(inst)
  }
  return seen
}

// CSV column order consumed by the website (Google-Sheet schema).
// `Author's Message` is emitted empty by default — they belong to
// the manual-curation layer.
export const CSV_COLUMNS = [
  'ID',
  'Link',
  'Title',
  'Type',
  'Awards',
  "Author's Message",
  'Swiss Institutes',
  'Swiss Authors Count',
  'Swiss Authors',
  'All Authors',
  'Abstract',
]

// Convert one paper to a row object keyed by CSV_COLUMNS.
export function paperToRow(paper, mapping = INSTITUTE_MAPPING) {
  const swissAuthorsStr = paper.swissAuthors
    .map((a) => `${a.name} (${a.institution}, ${a.city})`)
    .join('; ')
  return {
    ID: String(paper.id ?? ''),
    Link: paper.link ?? '',
    Title: paper.title ?? '',
    Type: paper.type ?? '',
    Awards: paper.awards,
    "Author's Message": paper.authorMessage ?? '',
    'Swiss Institutes': swissInstitutes(paper, mapping).join('; '),
    'Swiss Authors Count': String(paper.swissAuthors.length),
    'Swiss Authors': swissAuthorsStr,
    'All Authors': (paper.allAuthors ?? []).join('; '),
    Abstract: paper.abstract ?? '',
  }
}

// RFC-4180 field escaping.
function csvField(value) {
  const s = String(value ?? '')
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

// Serialize papers to a CSV string (CRLF line endings, matching the Sheet export).
export function papersToCSV(papers, mapping = INSTITUTE_MAPPING) {
  const lines = [CSV_COLUMNS.map(csvField).join(',')]
  for (const paper of papers) {
    const row = paperToRow(paper, mapping)
    lines.push(CSV_COLUMNS.map((c) => csvField(row[c])).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}
