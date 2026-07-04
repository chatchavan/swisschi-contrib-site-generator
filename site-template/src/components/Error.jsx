import './Error.css'

function Error({ message }) {
  return (
    <div className="error-container">
      <div className="error-card">
        <h2>Error loading data</h2>
        <p className="error-message">{message}</p>
        <div className="error-instructions">
          <p>Make sure to:</p>
          <ol>
            <li>Publish your Google Sheet (File → Share → Publish to web)</li>
            <li>Select CSV format</li>
            <li>Update <code>SHEET_CSV_URL</code> in <code>src/App.jsx</code></li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default Error
