import { calcTotalMonthly, fmt } from '../utils/mortgage'
import './CompareBar.css'

export default function CompareBar({ houses, cashBudget, closingCostPct }) {
  const costs = houses.map(h => ({
    ...h,
    total: calcTotalMonthly(h, cashBudget, closingCostPct).total,
  }))
  const sorted = [...costs].sort((a, b) => a.total - b.total)
  const min = sorted[0].total
  const max = sorted[sorted.length - 1].total

  return (
    <div className="compare-bar">
      <h3 className="compare-title">Monthly Cost Comparison</h3>
      <div className="compare-list">
        {sorted.map((h, i) => (
          <div key={h.id} className="compare-item">
            <div className="compare-rank">{i + 1}</div>
            <div className="compare-info">
              <div className="compare-name">{h.nickname || h.address || 'Unnamed'}</div>
              <div className="compare-track">
                <div
                  className="compare-fill"
                  style={{ width: `${max > min ? ((h.total - min) / (max - min)) * 80 + 20 : 100}%` }}
                />
              </div>
            </div>
            <div className="compare-amount">{fmt(h.total)}<span>/mo</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
