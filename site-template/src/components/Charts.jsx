import './Charts.css'

function Charts({ types, institutes }) {
  const maxType = types.length ? types[0][1] : 1
  const maxInst = institutes.length ? institutes[0][1] : 1

  return (
    <section className="section charts-section">
      <h2>Distribution</h2>
      <div className="chart-container">
        <div className="chart">
          <h3>By Type</h3>
          {types.map(([type, count]) => (
            <Bar 
              key={type} 
              label={type} 
              value={count} 
              max={maxType} 
            />
          ))}
        </div>
        <div className="chart">
          <h3>By Institution (Top 10)</h3>
          {institutes.slice(0, 10).map(([inst, count]) => (
            <Bar 
              key={inst} 
              label={inst} 
              value={count} 
              max={maxInst} 
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function Bar({ label, value, max }) {
  const percentage = (value / max) * 100

  return (
    <div className="bar">
      <span className="bar-label" title={label}>{label}</span>
      <div className="bar-track">
        <div 
          className="bar-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="bar-value">{value}</span>
    </div>
  )
}

export default Charts
