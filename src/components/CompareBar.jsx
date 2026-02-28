import { calcTotalMonthly, fmt } from '../utils/mortgage'
import './CompareBar.css'

export default function CompareBar({ houses, dDown, aDown, closingCostPct, equalizeYears }) {
  const costs = houses.map(h => ({
    ...h,
    ...calcTotalMonthly(h, dDown, aDown, closingCostPct, equalizeYears),
  }))
  const sorted = [...costs].sort((a, b) => a.total - b.total)
  const max = sorted[sorted.length - 1].total
  const min = sorted[0].total

  return (
    <div className="compare-bar">
      <h3 className="compare-title">Monthly Cost Comparison</h3>
      <div className="compare-list">
        {sorted.map((h, i) => (
          <div key={h.id} className="compare-item">
            <div className="compare-rank" style={i === 0 ? { background: '#6366f1', color: '#fff' } : {}}>{i + 1}</div>
            <div className="compare-info">
              <div className="compare-name-row">
                <span className="compare-name">{h.nickname || h.address || 'Unnamed'}</span>
                <span className="compare-splits">
                  <span className="d-badge">D {fmt(h.dMonthly)}</span>
                  <span className="a-badge">A {fmt(h.aMonthly)}</span>
                </span>
              </div>
              <div className="compare-track">
                <div className="compare-fill"
                  style={{ width: `${max > min ? ((h.total - min) / (max - min)) * 80 + 20 : 100}%` }} />
              </div>
            </div>
            <div className="compare-amount">{fmt(h.total)}<span>/mo</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
