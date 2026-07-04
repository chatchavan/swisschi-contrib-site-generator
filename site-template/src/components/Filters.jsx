import './Filters.css'
import { getAwardStyle } from '../utils/dataUtils'

function Filters({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  instituteFilter,
  setInstituteFilter,
  awardFilter,
  setAwardFilter
}) {
  const hasActiveFilters = search || typeFilter || instituteFilter || awardFilter

  if (!hasActiveFilters) return null

  return (
    <div className="active-filters">
      <span className="active-filters-label">Active filters:</span>
      {search && (
        <button 
          className="filter-chip"
          onClick={() => setSearch('')}
        >
          Search: "{search}"
          <span className="filter-chip-remove">×</span>
        </button>
      )}
      {typeFilter && (
        <button 
          className="filter-chip filter-chip-type"
          onClick={() => setTypeFilter('')}
        >
          {typeFilter}
          <span className="filter-chip-remove">×</span>
        </button>
      )}
      {instituteFilter && (
        <button 
          className="filter-chip filter-chip-institute"
          onClick={() => setInstituteFilter('')}
        >
          {instituteFilter}
          <span className="filter-chip-remove">×</span>
        </button>
      )}
      {awardFilter && (
        <button 
          className="filter-chip filter-chip-award"
          onClick={() => setAwardFilter('')}
        >
          {getAwardStyle(awardFilter).icon} {awardFilter}
          <span className="filter-chip-remove">×</span>
        </button>
      )}
      <button 
        className="clear-all-filters"
        onClick={() => {
          setSearch('')
          setTypeFilter('')
          setInstituteFilter('')
          setAwardFilter('')
        }}
      >
        Clear all
      </button>
    </div>
  )
}

export default Filters
