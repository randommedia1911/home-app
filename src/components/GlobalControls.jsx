import { fmt } from '../utils/mortgage'
import './GlobalControls.css'

const MIN = 50000
const MAX = 150000
const STEP = 1000

export default function GlobalControls({ cashBudget, setCashBudget, closingCostPct }) {
  const pct = ((cashBudget - MIN) / (MAX - MIN)) * 100

  return (
    <div className="global-controls">
      <div className="gc-inner">
        <div className="gc-block">
          <div className="gc-label-row">
            <span className="gc-label">Total Cash Budget</span>
            <span className="gc-value">{fmt(cashBudget)}</span>
          </div>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={cashBudget}
            onChange={e => setCashBudget(Number(e.target.value))}
            className="gc-slider"
            style={{ '--pct': `${pct}%` }}
          />
          <div className="gc-ticks">
            <span>$50k</span><span>$75k</span><span>$100k</span><span>$125k</span><span>$150k</span>
          </div>
        </div>

        <div className="gc-divider" />

        <div className="gc-info-row">
          <div className="gc-pill teal">
            <span className="pill-label">Closing Costs ({closingCostPct}%)</span>
            <span className="pill-val">varies by home</span>
          </div>
          <div className="gc-arrow">→</div>
          <div className="gc-pill purple">
            <span className="pill-label">Loan Down Payment</span>
            <span className="pill-val">Budget − Closing Costs</span>
          </div>
        </div>
      </div>
    </div>
  )
}
