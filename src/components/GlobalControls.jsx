import { fmt } from '../utils/mortgage'
import './GlobalControls.css'

export default function GlobalControls({ dDown, setDDown, aDown, setADown, aMonthlyTarget, setAMonthlyTarget, equalizeYears, setEqualizeYears, saleYear, setSaleYear, utilities, setUtilities, closingCostPct }) {
  function setUtil(key, val) {
    setUtilities(u => ({ ...u, [key]: Number(val) || 0 }))
  }
  const dPct = (dDown / 60000) * 100
  const aPct = ((aDown - 60000) / (130000 - 60000)) * 100
  const mPct = ((aMonthlyTarget - 500) / (2500 - 500)) * 100
  const sPct = ((saleYear - 1) / 29) * 100

  return (
    <div className="sidebar-controls">

      <div className="sc-section">
        <div className="sc-section-title">Down Payments</div>

        <div className="sc-row">
          <div className="sc-person-label d-label">D</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Down Payment</span>
              <span className="sc-value d-color">{fmt(dDown)}</span>
            </div>
            <input type="range" min={0} max={60000} step={1000}
              value={dDown} onChange={e => setDDown(Number(e.target.value))}
              className="sc-slider d-slider" style={{ '--pct': `${dPct}%` }}
            />
            <div className="sc-ticks"><span>$0</span><span>$30k</span><span>$60k</span></div>
          </div>
        </div>

        <div className="sc-row">
          <div className="sc-person-label a-label">A</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Down Payment</span>
              <span className="sc-value a-color">{fmt(aDown)}</span>
            </div>
            <input type="range" min={60000} max={130000} step={1000}
              value={aDown} onChange={e => setADown(Number(e.target.value))}
              className="sc-slider a-slider" style={{ '--pct': `${aPct}%` }}
            />
            <div className="sc-ticks"><span>$60k</span><span>$95k</span><span>$130k</span></div>
          </div>
        </div>

        <div className="sc-summary-pill">
          Combined: <strong>{fmt(dDown + aDown)}</strong>
          <span className="sc-cc">− {closingCostPct}% closing costs</span>
        </div>
      </div>

      <div className="sc-divider" />

      <div className="sc-section">
        <div className="sc-section-title">A's Monthly Budget</div>
        <div className="sc-row">
          <div className="sc-person-label a-label">A</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Target/mo</span>
              <span className="sc-value a-color">{fmt(aMonthlyTarget)}</span>
            </div>
            <input type="range" min={500} max={2500} step={50}
              value={aMonthlyTarget} onChange={e => setAMonthlyTarget(Number(e.target.value))}
              className="sc-slider a-slider" style={{ '--pct': `${mPct}%` }}
            />
            <div className="sc-ticks"><span>$500</span><span>$1.5k</span><span>$2.5k</span></div>
          </div>
        </div>
      </div>

      <div className="sc-divider" />

      <div className="sc-section">
        <div className="sc-section-title">D Repays A</div>
        <div className="sc-label-sm">Interest-free, over how many years?</div>
        <div className="year-picker">
          {[5,7,10,12,15,20,25,30].map(y => (
            <button key={y}
              className={`year-btn ${equalizeYears === y ? 'active' : ''}`}
              onClick={() => setEqualizeYears(y)}
            >{y}yr</button>
          ))}
        </div>
      </div>

      <div className="sc-divider" />

      <div className="sc-section">
        <div className="sc-section-title">Utilities (monthly)</div>
        <div className="util-grid">
          <label className="util-label">
            💧 Water
            <input type="number" min={0} value={utilities.water} onChange={e => setUtil('water', e.target.value)} className="util-input" />
          </label>
          <label className="util-label">
            🗑 Trash
            <input type="number" min={0} value={utilities.trash} onChange={e => setUtil('trash', e.target.value)} className="util-input" />
          </label>
          <label className="util-label">
            ⚡ Electric
            <input type="number" min={0} value={utilities.electricity} onChange={e => setUtil('electricity', e.target.value)} className="util-input" />
          </label>
        </div>
        <div className="util-total">Total: {fmt(utilities.water + utilities.trash + utilities.electricity)}/mo</div>
      </div>

      <div className="sc-divider" />

      <div className="sc-section">
        <div className="sc-section-title">Sale Calculator</div>
        <div className="sc-row">
          <div className="sc-person-label sale-label">🏷</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Sell at</span>
              <span className="sc-value sale-color">
                {saleYear === 30 ? 'Full term' : `Year ${saleYear}`}
              </span>
            </div>
            <input type="range" min={1} max={30} step={1}
              value={saleYear} onChange={e => setSaleYear(Number(e.target.value))}
              className="sc-slider sale-slider" style={{ '--pct': `${sPct}%` }}
            />
            <div className="sc-ticks"><span>Yr 1</span><span>Yr 15</span><span>Yr 30</span></div>
          </div>
        </div>
      </div>

    </div>
  )
}
