import { useState } from 'react'
import { getSwissAuthorNames, getAwardStyle } from '../utils/dataUtils'
import './PaperCard.css'

function PaperCard({ paper, onAuthorClick, onInstituteClick, onTypeClick, onAwardClick }) {
  const [expanded, setExpanded] = useState(false)
  const institutes = (paper['Swiss Institutes'] || '')
    .split('; ')
    .filter(Boolean)

  const award = (paper['Awards'] || '').trim()
  const authorsMessage = (paper["Author's Message"] || '').trim()

  const allAuthors = paper['All Authors'] || ''
  const swissNames = getSwissAuthorNames(paper['Swiss Authors'] || '')

  // Render authors with clickable Swiss author names
  const renderAuthors = () => {
    if (!allAuthors) return null
    
    // Build a regex to split by Swiss author names
    if (swissNames.length === 0) return allAuthors
    
    const escapedNames = swissNames.map(name => 
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    const regex = new RegExp(`(${escapedNames.join('|')})`, 'g')
    const parts = allAuthors.split(regex)
    
    return parts.map((part, index) => {
      if (swissNames.includes(part)) {
        return (
          <button
            key={index}
            className="swiss-author-link"
            onClick={() => onAuthorClick?.(part)}
          >
            {part}
          </button>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <article className="paper-card">
      <h3>
        <a href={paper.Link} target="_blank" rel="noopener noreferrer">
          {paper.Title}
        </a>
      </h3>
      <div className="paper-meta">
        <button 
          className="tag tag-type tag-clickable"
          onClick={() => onTypeClick?.(paper.Type)}
        >
          {paper.Type}
        </button>
        {institutes.map((inst) => (
          <button 
            key={inst} 
            className="tag tag-institute tag-clickable"
            onClick={() => onInstituteClick?.(inst)}
          >
            {inst}
          </button>
        ))}
        {award && (() => { const s = getAwardStyle(award); return (
          <button
            className={`tag tag-award tag-clickable ${s.className}`}
            onClick={() => onAwardClick?.(award)}
          >
            {s.icon} {award}
          </button>
        )})()}
      </div>
      <div className="paper-authors">
        {renderAuthors()}
      </div>
      {authorsMessage && (
        <>
          <button 
            className="expand-toggle"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▲ Hide Author's Message" : "▼ Author's Message"}
          </button>
          {expanded && (
            <div className="paper-expandable">
              <p>{authorsMessage}</p>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export default PaperCard
