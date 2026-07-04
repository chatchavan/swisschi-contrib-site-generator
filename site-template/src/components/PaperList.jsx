import PaperCard from './PaperCard'
import './PaperList.css'

function PaperList({ papers, onAuthorClick, onInstituteClick, onTypeClick, onAwardClick }) {
  return (
    <div className="paper-list">
      {papers.map((paper) => (
        <PaperCard 
          key={paper.ID} 
          paper={paper} 
          onAuthorClick={onAuthorClick}
          onInstituteClick={onInstituteClick}
          onTypeClick={onTypeClick}
          onAwardClick={onAwardClick}
        />
      ))}
    </div>
  )
}

export default PaperList
