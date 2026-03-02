import { fmt } from '../utils/mortgage'
import './GlobalControls.css'

export default function GlobalControls({ dCashBudget, setDCashBudget, aCashBudget, setACashBudget, dDown, setDDown, aDown, setADown, aMonthlyAdj, setAMonthlyAdj, equalizeYears, setEqualizeYears, saleYear, setSaleYear, appreciationPct, setAppreciationPct, taxIncreasePct, setTaxIncreasePct, hoaIncreasePct, setHoaIncreasePct, dBudget, setDBudget, aBudget, setABudget, investRate, setInvestRate, retireMode, setRetireMode, rent1BR, setRent1BR, rent2BR, setRent2BR, rentIncreaseRate, setRentIncreaseRate, rentMoveEvery, setRentMoveEvery, rentMarketGrowth, setRentMarketGrowth, rentParking, setRentParking, utilities, setUtilities, utilIncreaseRate, setUtilIncreaseRate, retireYear, setRetireYear, inflationRate, setInflationRate, currentAge, setCurrentAge, spendingCap, setSpendingCap, overseasCost, setOverseasCost, overseasSpendingCap, setOverseasSpendingCap, overseasRentIncrease, setOverseasRentIncrease, colRatio, setColRatio, closingCostPct }) {
  function setUtil(key, val) {
    setUtilities(u => ({ ...u, [key]: Number(val) || 0 }))
  }
  const dPct = dCashBudget > 0 ? (dDown / dCashBudget) * 100 : 0
  const aPct = aCashBudget > 0 ? (aDown / aCashBudget) * 100 : 0
  const mPct = ((aMonthlyAdj + 1500) / 3000) * 100
  const sPct = ((saleYear - 1) / 29) * 100

  return (
    <div className="sidebar-controls">

      <div className="sc-section">
        <div className="sc-section-title">Down Payments</div>
        <div className="sc-label-sm">Total cash available (rest gets invested)</div>
        <div className="rent-inputs" style={{ marginBottom: 12 }}>
          <div className="rent-input-group">
            <label className="rent-input-label d-label">D cash</label>
            <input type="number" min={0} step={1000} value={dCashBudget}
              onChange={e => { const v = Number(e.target.value) || 0; setDCashBudget(v); if (dDown > v) setDDown(v) }}
              className="sc-number-input" />
          </div>
          <div className="rent-input-group">
            <label className="rent-input-label a-label">A cash</label>
            <input type="number" min={0} step={1000} value={aCashBudget}
              onChange={e => { const v = Number(e.target.value) || 0; setACashBudget(v); if (aDown > v) setADown(v) }}
              className="sc-number-input" />
          </div>
        </div>

        <div className="sc-row">
          <div className="sc-person-label d-label">D</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Down payment</span>
              <span className="sc-value d-color">{fmt(dDown)}</span>
            </div>
            <input type="range" min={0} max={dCashBudget} step={1000}
              value={dDown} onChange={e => setDDown(Number(e.target.value))}
              className="sc-slider d-slider" style={{ '--pct': `${dPct}%` }}
            />
            <div className="sc-ticks"><span>$0</span><span style={{ color: '#10b981', fontSize: '0.7rem' }}>invests {fmt(dCashBudget - dDown)}</span><span>{fmt(dCashBudget)}</span></div>
          </div>
        </div>

        <div className="sc-row">
          <div className="sc-person-label a-label">A</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Down payment</span>
              <span className="sc-value a-color">{fmt(aDown)}</span>
            </div>
            <input type="range" min={0} max={aCashBudget} step={1000}
              value={aDown} onChange={e => setADown(Number(e.target.value))}
              className="sc-slider a-slider" style={{ '--pct': `${aPct}%` }}
            />
            <div className="sc-ticks"><span>$0</span><span style={{ color: '#10b981', fontSize: '0.7rem' }}>invests {fmt(aCashBudget - aDown)}</span><span>{fmt(aCashBudget)}</span></div>
          </div>
        </div>

        <div className="sc-summary-pill">
          Combined: <strong>{fmt(dDown + aDown)}</strong>
          <span className="sc-cc">− {closingCostPct}% closing costs</span>
        </div>
      </div>

      <div className="sc-divider" />

      <div className="sc-section">
        <div className="sc-section-title">A's Monthly Adjustment</div>
        <div className="sc-label-sm">Shifts A's contribution on all cards</div>
        <div className="sc-row">
          <div className="sc-person-label a-label">A</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Adjust/mo</span>
              <span className="sc-value a-color">
                {aMonthlyAdj === 0 ? '$0' : aMonthlyAdj > 0 ? `+${fmt(aMonthlyAdj)}` : `−${fmt(Math.abs(aMonthlyAdj))}`}
              </span>
            </div>
            <input type="range" min={-1500} max={1500} step={50}
              value={aMonthlyAdj} onChange={e => setAMonthlyAdj(Number(e.target.value))}
              className="sc-slider a-slider" style={{ '--pct': `${mPct}%` }}
            />
            <div className="sc-ticks"><span>−$1.5k</span><span>$0</span><span>+$1.5k</span></div>
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
          <div className="util-col">
            <span className="util-col-label">💧 Water</span>
            <input type="number" min={0} value={utilities.water}
              onChange={e => setUtil('water', e.target.value)}
              className={`util-input${utilities.waterInHoa ? ' util-input-hoa' : ''}`}
              disabled={utilities.waterInHoa} />
            <label className="hoa-check">
              <input type="checkbox" checked={!!utilities.waterInHoa}
                onChange={e => setUtilities(u => ({ ...u, waterInHoa: e.target.checked }))} />
              in HOA
            </label>
          </div>
          <div className="util-col">
            <span className="util-col-label">🗑 Trash</span>
            <input type="number" min={0} value={utilities.trash}
              onChange={e => setUtil('trash', e.target.value)}
              className={`util-input${utilities.trashInHoa ? ' util-input-hoa' : ''}`}
              disabled={utilities.trashInHoa} />
            <label className="hoa-check">
              <input type="checkbox" checked={!!utilities.trashInHoa}
                onChange={e => setUtilities(u => ({ ...u, trashInHoa: e.target.checked }))} />
              in HOA
            </label>
          </div>
          <div className="util-col">
            <span className="util-col-label">⚡ Electric</span>
            <input type="number" min={0} value={utilities.electricity}
              onChange={e => setUtil('electricity', e.target.value)}
              className="util-input" />
          </div>
        </div>
        <div className="util-total">Total: {fmt(
          (utilities.waterInHoa ? 0 : (utilities.water || 0)) +
          (utilities.trashInHoa ? 0 : (utilities.trash || 0)) +
          (utilities.electricity || 0)
        )}/mo</div>
        <div className="sc-label-sm" style={{ marginTop: 8 }}>Annual utility increase</div>
        <div className="year-picker">
          {[0, 1, 2, 3, 4, 5].map(p => (
            <button key={p}
              className={`year-btn ${utilIncreaseRate === p ? 'active' : ''}`}
              onClick={() => setUtilIncreaseRate(p)}
            >{p}%</button>
          ))}
        </div>
      </div>

      <div className="sc-divider" />

      <div className={`sc-section${retireMode !== 'elsewhere' ? ' sc-section-dimmed' : ''}`}>
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
        <div className="sc-label-sm" style={{ marginTop: 10 }}>Annual home appreciation</div>
        <div className="year-picker">
          {[0, 1, 2, 3, 4].map(p => (
            <button key={p}
              className={`year-btn ${appreciationPct === p ? 'active' : ''}`}
              onClick={() => setAppreciationPct(p)}
            >{p}%</button>
          ))}
        </div>
      </div>

      <div className="sc-divider" />

      <div className="sc-section">
        <div className="sc-section-title">Annual Cost Increases</div>
        <div className="sc-label-sm">Property tax annual increase</div>
        <div className="year-picker">
          {[0, 1, 2, 3].map(p => (
            <button key={p}
              className={`year-btn ${taxIncreasePct === p ? 'active' : ''}`}
              onClick={() => setTaxIncreasePct(p)}
            >{p}%</button>
          ))}
        </div>
        <div className="sc-label-sm" style={{ marginTop: 10 }}>HOA annual increase</div>
        <div className="year-picker">
          {[0, 2, 3, 4, 5].map(p => (
            <button key={p}
              className={`year-btn ${hoaIncreasePct === p ? 'active' : ''}`}
              onClick={() => setHoaIncreasePct(p)}
            >{p}%</button>
          ))}
        </div>
      </div>

      <div className="sc-divider" />

      <div className="sc-section">
        <div className="sc-section-title">Investment Comparison</div>
        <div className="retire-toggle">
          <button
            className={`retire-btn ${retireMode === 'elsewhere' ? 'active' : ''}`}
            onClick={() => setRetireMode('elsewhere')}
          >✈ Sell &amp; move</button>
          <button
            className={`retire-btn ${retireMode === 'rent' ? 'active' : ''}`}
            onClick={() => setRetireMode('rent')}
          >🏘 Rent &amp; move</button>
          <button
            className={`retire-btn ${retireMode === 'stay' ? 'active' : ''}`}
            onClick={() => setRetireMode('stay')}
          >🏠 Stay</button>
        </div>
        <div className="sc-label-sm">Monthly budget for housing + investing</div>
        <div className="sc-row" style={{ marginTop: 8 }}>
          <div className="sc-person-label d-label">D</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Monthly budget</span>
              <span className="sc-value d-color">{fmt(dBudget)}</span>
            </div>
            <input
              type="number" min={0} step={50}
              value={dBudget}
              onChange={e => setDBudget(Number(e.target.value) || 0)}
              className="sc-number-input"
            />
          </div>
        </div>
        <div className="sc-row" style={{ marginTop: 8 }}>
          <div className="sc-person-label a-label">A</div>
          <div className="sc-block">
            <div className="sc-label-row">
              <span className="sc-label">Monthly budget</span>
              <span className="sc-value a-color">{fmt(aBudget)}</span>
            </div>
            <input
              type="number" min={0} step={50}
              value={aBudget}
              onChange={e => setABudget(Number(e.target.value) || 0)}
              className="sc-number-input"
            />
          </div>
        </div>
        <div className="sc-label-sm" style={{ marginTop: 10 }}>Investment annual return</div>
        <div className="year-picker">
          {[5, 6, 7, 8, 9].map(p => (
            <button key={p}
              className={`year-btn ${investRate === p ? 'active' : ''}`}
              onClick={() => setInvestRate(p)}
            >{p}%</button>
          ))}
        </div>

        <div className="sc-divider" style={{ margin: '12px 0 8px' }} />
        <div className="sc-section-title" style={{ marginBottom: 8 }}>vs. Rent &amp; Invest</div>
        <div className="sc-label-sm">Base rent (excl. utilities, grows annually)</div>
        <div className="rent-inputs">
          <div className="rent-input-group">
            <label className="rent-input-label">1 BR</label>
            <input type="number" min={0} step={50} value={rent1BR}
              onChange={e => setRent1BR(Number(e.target.value) || 0)}
              className="sc-number-input" />
          </div>
          <div className="rent-input-group">
            <label className="rent-input-label">2+ BR</label>
            <input type="number" min={0} step={50} value={rent2BR}
              onChange={e => setRent2BR(Number(e.target.value) || 0)}
              className="sc-number-input" />
          </div>
        </div>
        <div className="rent-inputs" style={{ marginTop: 6 }}>
          <div className="rent-input-group">
            <label className="rent-input-label">Parking/mo</label>
            <input type="number" min={0} step={10} value={rentParking}
              onChange={e => setRentParking(Number(e.target.value) || 0)}
              className="sc-number-input" />
          </div>
        </div>
        <div className="sc-label-sm" style={{ marginTop: 8 }}>Lease annual increase (landlord raises)</div>
        <div className="year-picker">
          {[1, 2, 3, 4, 5].map(p => (
            <button key={p}
              className={`year-btn ${rentIncreaseRate === p ? 'active' : ''}`}
              onClick={() => setRentIncreaseRate(p)}
            >{p}%</button>
          ))}
        </div>
        <div className="sc-label-sm" style={{ marginTop: 8 }}>Move every (reset to market rate)</div>
        <div className="year-picker">
          {[{ v: 0, label: 'Never' }, { v: 3, label: '3 yr' }, { v: 5, label: '5 yr' }].map(({ v, label }) => (
            <button key={v}
              className={`year-btn ${rentMoveEvery === v ? 'active' : ''}`}
              onClick={() => setRentMoveEvery(v)}
            >{label}</button>
          ))}
        </div>
        {rentMoveEvery > 0 && (
          <>
            <div className="sc-label-sm" style={{ marginTop: 8 }}>Market rent growth (reset price)</div>
            <div className="year-picker">
              {[1, 2, 3, 4, 5].map(p => (
                <button key={p}
                  className={`year-btn ${rentMarketGrowth === p ? 'active' : ''}`}
                  onClick={() => setRentMarketGrowth(p)}
                >{p}%</button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="sc-section">
        <div className="sc-divider" style={{ margin: '0 0 12px' }} />
        <div className="sc-section-title">Retirement</div>

        <div className="sc-label-sm">Your current age</div>
        <input type="number" min={18} max={80} step={1} value={currentAge}
          onChange={e => setCurrentAge(Number(e.target.value) || 33)}
          className="sc-number-input" style={{ width: 70 }} />

        <div className="sc-label-sm" style={{ marginTop: 10 }}>Retire at year</div>
        <div className="sc-label-row" style={{ marginBottom: 4 }}>
          <span className="sc-label" />
          <span className="sc-value" style={{ color: '#d97706' }}>Yr {retireYear} · Age {currentAge + retireYear}</span>
        </div>
        <input
          type="range" min={5} max={40} step={1}
          value={retireYear}
          onChange={e => setRetireYear(Number(e.target.value))}
          className="sc-slider retire-slider"
          style={{ '--pct': `${((retireYear - 5) / 35) * 100}%` }}
        />
        <div className="sc-ticks"><span>Yr 5</span><span>Yr 40</span></div>

        <div className="sc-ticks"><span>2%</span><span>15%</span></div>

        <div className="sc-label-sm" style={{ marginTop: 10 }}>Monthly spending cap (today's $)</div>
        <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Excess reinvested into pool (0 = no cap)</div>
        <input type="number" min={0} step={500} value={spendingCap}
          onChange={e => setSpendingCap(Number(e.target.value) || 0)}
          className="sc-number-input" />

        <div className="sc-divider" style={{ margin: '12px 0 8px' }} />
        <div className="sc-label-sm" style={{ fontWeight: 700, color: '#374151' }}>Overseas comparison</div>
        <div className="sc-label-sm" style={{ marginTop: 6 }}>Overseas housing/mo (today's $)</div>
        <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Rent abroad — used to compare vs. staying in US</div>
        <input type="number" min={0} step={100} value={overseasCost}
          onChange={e => setOverseasCost(Number(e.target.value) || 0)}
          className="sc-number-input" />

        <div className="sc-label-sm" style={{ marginTop: 10 }}>Overseas monthly spend (today's $)</div>
        <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Personal spending excl. housing</div>
        <input type="number" min={0} step={100} value={overseasSpendingCap}
          onChange={e => setOverseasSpendingCap(Number(e.target.value) || 0)}
          className="sc-number-input" />

        <div className="sc-label-sm" style={{ marginTop: 10 }}>Overseas rent annual increase</div>
        <div className="year-picker">
          {[0, 1, 2, 3, 4, 5].map(p => (
            <button key={p}
              className={`year-btn ${overseasRentIncrease === p ? 'active' : ''}`}
              onClick={() => setOverseasRentIncrease(p)}
            >{p}%</button>
          ))}
        </div>

        <div className="sc-label-sm" style={{ marginTop: 10 }}>Cost of living vs US</div>
        <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>$1 overseas buys ${(1 / (colRatio / 100)).toFixed(1)} US equivalent</div>
        <div className="year-picker">
          {[25, 35, 40, 50, 60].map(p => (
            <button key={p}
              className={`year-btn ${colRatio === p ? 'active' : ''}`}
              onClick={() => setColRatio(p)}
            >{p}%</button>
          ))}
        </div>

        <div className="sc-label-sm" style={{ marginTop: 10 }}>Inflation (expense growth)</div>
        <div className="year-picker">
          {[2, 2.5, 3].map(p => (
            <button key={p}
              className={`year-btn ${inflationRate === p ? 'active' : ''}`}
              onClick={() => setInflationRate(p)}
            >{p}%</button>
          ))}
        </div>
      </div>

    </div>
  )
}
