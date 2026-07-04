import './StatsGrid.css'

function StatsGrid({ papers, posters, institutions }) {
  return (
    <div className="stats-grid">
      <StatCard number={papers} label="Full Papers" />
      <StatCard number={posters} label="Posters" />
      <StatCard number={institutions} label="Swiss Institutions" />
    </div>
  )
}

function StatCard({ number, label }) {
  return (
    <div className="stat-card">
      <div className="stat-number">{number}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default StatsGrid
