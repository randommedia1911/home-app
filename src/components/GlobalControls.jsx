import { useState, useEffect, useRef, startTransition, memo } from 'react'
import { fmt } from '../utils/mortgage'
import './GlobalControls.css'

function DebouncedInput({ value, onCommit, delay = 350, parse, ...props }) {
  const [local, setLocal] = useState(value)
  const timer = useRef(null)
  useEffect(() => { setLocal(value) }, [value])
  const handleChange = e => {
    const raw = e.target.value
    setLocal(props.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const v = parse ? parse(raw) : (Number(raw) || 0)
      startTransition(() => onCommit(v))
    }, delay)
  }
  return <input {...props} value={local} onChange={handleChange} />
}

export default function GlobalControls({ dCashBudget, setDCashBudget, aCashBudget, setACashBudget, dDown, setDDown, aDown, setADown, aMonthlyAdj, setAMonthlyAdj, equalizeYears, setEqualizeYears, saleYear, setSaleYear, appreciationPct, setAppreciationPct, taxIncreasePct, setTaxIncreasePct, hoaIncreasePct, setHoaIncreasePct, insuranceIncreasePct, setInsuranceIncreasePct, refiYear, setRefiYear, refiRate, setRefiRate, refiTermYears, setRefiTermYears, dBudget, setDBudget, aBudget, setABudget, aBudgetIncrease, setABudgetIncrease, dIncome, setDIncome, aIncome, setAIncome, investRate, setInvestRate, hysaRate, setHysaRate, brkTaxDrag, setBrkTaxDrag, mortgageRate, setMortgageRate, pmiRate, setPmiRate, retireMode, setRetireMode, jobLossEveryN, setJobLossEveryN, jobLossUI, setJobLossUI, rent1BR, setRent1BR, rent2BR, setRent2BR, rentUpgradeTo2BR, setRentUpgradeTo2BR, rentIncreaseRate, setRentIncreaseRate, rentMoveEvery, setRentMoveEvery, rentMarketGrowth, setRentMarketGrowth, rentParking, setRentParking, utilities, setUtilities, rentUtilities, setRentUtilities, utilIncreaseRate, setUtilIncreaseRate, retireYear, setRetireYear, retireMaxAge, setRetireMaxAge, withdrawalTaxPct, setWithdrawalTaxPct, accumBoostPct, setAccumBoostPct, d401kContrib, setD401kContrib, a401kContrib, setA401kContrib, overseasWithdrawalTaxPct, setOverseasWithdrawalTaxPct, relocateWithdrawalTaxPct, setRelocateWithdrawalTaxPct, rentvestWithdrawalTaxPct, setRentvestWithdrawalTaxPct, capitalGainsTaxPct, setCapitalGainsTaxPct, primaryResidenceExclusion, setPrimaryResidenceExclusion, rentalIncomeTaxPct, setRentalIncomeTaxPct, dSS, setDSS, aSS, setASS, ssClaimAge, setSsClaimAge, ssCutPct, setSsCutPct, careStartAge, setCareStartAge, careMonthlyStay, setCareMonthlyStay, careMonthlyRelocateUS, setCareMonthlyRelocateUS, careMonthlyOverseas, setCareMonthlyOverseas, jobLossMonths, setJobLossMonths, jobLossYear, setJobLossYear, jobLossPerson, setJobLossPerson, inflationRate, setInflationRate, spendInflationRate, setSpendInflationRate, currentAge, setCurrentAge, spendingCap, setSpendingCap, aSpendingCap, setASpendingCap, overseasCost, setOverseasCost, overseasSpendingCap, setOverseasSpendingCap, overseasRentIncrease, setOverseasRentIncrease, usRentalIncrease, setUsRentalIncrease, colRatio, setColRatio, maintenancePct, setMaintenancePct, closingCostPct, relocateMonthlyCost, setRelocateMonthlyCost, relocateBuyPrice, setRelocateBuyPrice, relocateBuyDownPct, setRelocateBuyDownPct, relocateMortgageRate, setRelocateMortgageRate, rentvestPrice, setRentvestPrice, rentvestDown, setRentvestDown, rentvestMortgageRate, setRentvestMortgageRate, rentvestRent, setRentvestRent, rentvestRentGrowth, setRentvestRentGrowth, rentvestMgmtFee, setRentvestMgmtFee, dRothMonthly, setDRothMonthly, dRothBackdoor, setDRothBackdoor, dTradMonthly, setDTradMonthly, aRothMonthly, setARothMonthly, aRothBackdoor, setARothBackdoor, aTradMonthly, setATradMonthly }) {
  function setUtil(key, val) {
    setUtilities(u => ({ ...u, [key]: Number(val) || 0 }))
  }

  const dPct = dCashBudget > 0 ? (dDown / dCashBudget) * 100 : 0
  const aPct = aCashBudget > 0 ? (aDown / aCashBudget) * 100 : 0
  const mPct = ((aMonthlyAdj + 1500) / 3000) * 100
  const sPct = ((saleYear - 1) / 29) * 100

  return (
    <div className="sidebar-controls">

      {/* ── Group 1: Contributions ── */}
      <div className="sc-group sc-group--green">
        <div className="sc-group-title">💰 Contributions</div>

        <div className="sc-section">
          <div className="sc-section-title">Down Payments</div>
          <div className="sc-label-sm">Total cash available (rest gets invested)</div>
          <div className="rent-inputs" style={{ marginBottom: 12 }}>
            <div className="rent-input-group">
              <label className="rent-input-label d-label">D cash</label>
              <DebouncedInput type="number" min={0} step={1000} value={dCashBudget}
                onCommit={v => { setDCashBudget(v); if (dDown > v) setDDown(v) }}
                className="sc-number-input" />
            </div>
            <div className="rent-input-group">
              <label className="rent-input-label a-label">A cash</label>
              <DebouncedInput type="number" min={0} step={1000} value={aCashBudget}
                onCommit={v => { setACashBudget(v); if (aDown > v) setADown(v) }}
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
      </div>

      {/* ── Group 2: Monthly Budgets ── */}
      <div className="sc-group sc-group--blue">
        <div className="sc-group-title">📊 Monthly Budgets</div>
        <div className="sc-section">
          <div className="sc-label-sm">💼 Monthly take-home income</div>
          <div className="sc-row" style={{ marginTop: 6 }}>
            <div className="sc-person-label d-label">D</div>
            <div className="sc-block">
              <div className="sc-label-row">
                <span className="sc-label">Take-home</span>
                <span className="sc-value d-color">{dIncome > 0 ? fmt(dIncome) : '—'}</span>
              </div>
              <DebouncedInput type="number" min={0} step={100} value={dIncome || ''}
                placeholder="e.g. 12000"
                onCommit={setDIncome}
                className="sc-number-input" />
            </div>
          </div>
          <div className="sc-row" style={{ marginTop: 6 }}>
            <div className="sc-person-label a-label">A</div>
            <div className="sc-block">
              <div className="sc-label-row">
                <span className="sc-label">Take-home</span>
                <span className="sc-value a-color">{aIncome > 0 ? fmt(aIncome) : '—'}</span>
              </div>
              <DebouncedInput type="number" min={0} step={100} value={aIncome || ''}
                placeholder="e.g. 4000"
                onCommit={setAIncome}
                className="sc-number-input" />
            </div>
          </div>
          {(dIncome > 0 || aIncome > 0) && (
            <div className="sc-label-sm" style={{ color: '#9ca3af', marginTop: 6 }}>
              HYSA surplus = income − budget − spending cap
              {dIncome > 0 && <> · D: <span style={{ color: '#3b82f6' }}>{fmt(Math.max(0, dIncome - dBudget - spendingCap))}/mo</span></>}
              {aIncome > 0 && <> · A: <span style={{ color: '#8b5cf6' }}>{fmt(Math.max(0, aIncome - aBudget - aSpendingCap))}/mo</span></>}
            </div>
          )}
        </div>
        <div className="sc-section">
          <div className="sc-label-sm">For housing + investing</div>
          <div className="sc-row" style={{ marginTop: 8 }}>
            <div className="sc-person-label d-label">D</div>
            <div className="sc-block">
              <div className="sc-label-row">
                <span className="sc-label">Monthly budget</span>
                <span className="sc-value d-color">{fmt(dBudget)}</span>
              </div>
              <DebouncedInput type="number" min={0} step={50} value={dBudget}
                onCommit={setDBudget}
                className="sc-number-input" />
            </div>
          </div>
          <div className="sc-row" style={{ marginTop: 8 }}>
            <div className="sc-person-label a-label">A</div>
            <div className="sc-block">
              <div className="sc-label-row">
                <span className="sc-label">Monthly budget</span>
                <span className="sc-value a-color">{fmt(aBudget)}</span>
              </div>
              <DebouncedInput type="number" min={0} step={50} value={aBudget}
                onCommit={setABudget}
                className="sc-number-input" />
            </div>
          </div>
          <div className="sc-label-sm" style={{ marginTop: 8 }}>A's budget annual increase (rent split)</div>
          <div className="year-picker">
            {[0, 1, 2, 3, 4].map(p => (
              <button key={p}
                className={`year-btn ${aBudgetIncrease === p ? 'active' : ''}`}
                onClick={() => setABudgetIncrease(p)}
              >{p}%</button>
            ))}
          </div>

          <div className="sc-label-sm" style={{ marginTop: 10 }}>💰 Monthly spending cap (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Excess reinvested into pool (0 = no cap)</div>
          <div className="sc-row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div className="sc-block" style={{ flex: 1 }}>
              <div className="sc-label-row"><span className="sc-label d-color">D</span><span className="sc-value d-color">{fmt(spendingCap)}</span></div>
              <DebouncedInput type="number" min={0} step={500} value={spendingCap}
                onCommit={setSpendingCap}
                className="sc-number-input" />
            </div>
            <div className="sc-block" style={{ flex: 1 }}>
              <div className="sc-label-row"><span className="sc-label a-color">A</span><span className="sc-value a-color">{fmt(aSpendingCap)}</span></div>
              <DebouncedInput type="number" min={0} step={500} value={aSpendingCap}
                onCommit={setASpendingCap}
                className="sc-number-input" />
            </div>
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Simulate until age</div>
          <div className="year-picker">
            {[85, 90, 95, 100, 105, 110].map(a => (
              <button key={a}
                className={`year-btn ${retireMaxAge === a ? 'active' : ''}`}
                onClick={() => setRetireMaxAge(a)}
              >{a}</button>
            ))}
          </div>

          {/* ── Bucket split preview ── */}
          <div className="sc-label-sm" style={{ marginTop: 14 }}>🪣 Investment bucket split</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 6 }}>After housing costs, monthly leftover goes: Roth IRA first (up to $583/mo IRS max), rest to Brokerage. At retirement, withdrawal tax is blended from the actual Roth vs Brokerage ratio — Roth withdraws tax-free, Brokerage at cap gains rate.</div>

          <div className="sc-label-sm" style={{ marginTop: 10 }}>Investment annual return (nominal)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>This is the raw market return before inflation. Real return ≈ nominal − spending inflation.</div>
          <div className="year-picker">
            {[5, 6, 7, 8, 8.5, 9, 10, 11].map(p => (
              <button key={p}
                className={`year-btn ${investRate === p ? 'active' : ''}`}
                onClick={() => setInvestRate(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Inflation (expense growth)</div>
          <div className="year-picker" style={{ flexWrap: 'wrap' }}>
            {[2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 4].map(p => (
              <button key={p}
                className={`year-btn ${inflationRate === p && spendInflationRate === p ? 'active' : ''}`}
                onClick={() => { setInflationRate(p); setSpendInflationRate(p) }}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ color: '#6b7280', marginTop: 4 }}>
            Real return ≈ {(investRate - (spendInflationRate || 3)).toFixed(1)}% (nominal {investRate}% − {spendInflationRate || 3}% inflation)
            {(investRate - (spendInflationRate || 3)) <= 4 ? ' · conservative' : (investRate - (spendInflationRate || 3)) <= 6 ? ' · moderate' : ' · aggressive'}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>💰 HYSA annual return</div>
          <div className="year-picker">
            {[2, 3, 3.5, 4, 4.5, 5].map(p => (
              <button key={p}
                className={`year-btn ${hysaRate === p ? 'active' : ''}`}
                onClick={() => setHysaRate(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>📉 Brokerage annual tax drag</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Dividends & cap-gains distributions taxed yearly. Effective brk rate = {(investRate - (brkTaxDrag || 0)).toFixed(1)}%</div>
          <div className="year-picker">
            {[0, 0.2, 0.3, 0.5, 0.7].map(p => (
              <button key={p}
                className={`year-btn ${brkTaxDrag === p ? 'active' : ''}`}
                onClick={() => setBrkTaxDrag(p)}
              >{p === 0 ? 'None' : `−${p}%`}</button>
            ))}
          </div>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">⚠️ Job Loss Buffer</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 8 }}>Models periods of no income. Budget contribution drops to $0 (+ EDD UI if set) for the specified months.</div>
          <div className="sc-label-sm" style={{ marginBottom: 4 }}>Who loses income?</div>
          <div className="year-picker" style={{ marginBottom: 10 }}>
            {[
              { label: 'D only', value: 'D' },
              { label: 'A only', value: 'A' },
              { label: 'Both', value: 'both' },
            ].map(({ label, value }) => (
              <button key={value}
                className={`year-btn ${jobLossPerson === value ? 'active' : ''}`}
                onClick={() => setJobLossPerson(value)}
              >{label}</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginBottom: 2 }}>First occurrence</div>
          <div className="year-picker" style={{ marginBottom: 10 }}>
            {[0, 1, 2, 3, 4, 5].map(y => (
              <button key={y}
                className={`year-btn ${jobLossYear === y ? 'active' : ''}`}
                onClick={() => setJobLossYear(y)}
              >{y === 0 ? 'Off' : `Yr ${y}`}</button>
            ))}
          </div>
          <div className={jobLossYear === 0 ? 'sc-section-dimmed' : ''}>
            <div className="sc-label-sm" style={{ marginBottom: 2 }}>Recurrence</div>
            <div className="year-picker" style={{ marginBottom: 10 }}>
              {[0, 3, 5, 7, 10].map(n => (
                <button key={n}
                  className={`year-btn ${jobLossEveryN === n ? 'active' : ''}`}
                  onClick={() => setJobLossEveryN(n)}
                >{n === 0 ? 'Once' : `Every ${n}yr`}</button>
              ))}
            </div>
            <div className="sc-label-sm" style={{ marginBottom: 2 }}>Duration (months)</div>
            <div className="year-picker" style={{ marginBottom: 10 }}>
              {[3, 6, 9, 12, 18, 24].map(m => (
                <button key={m}
                  className={`year-btn ${jobLossMonths === m ? 'active' : ''}`}
                  onClick={() => setJobLossMonths(m)}
                >{m}mo</button>
              ))}
            </div>
            <div className="sc-label-sm" style={{ marginBottom: 2 }}>CA EDD Unemployment Insurance (per person)</div>
            <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Partial income received during job loss. CA max ≈ $450/wk ($1,800/mo).</div>
            <div className="year-picker">
              {[0, 900, 1400, 1800, 2200].map(v => (
                <button key={v}
                  className={`year-btn ${jobLossUI === v ? 'active' : ''}`}
                  onClick={() => setJobLossUI(v)}
                >{v === 0 ? 'None' : `$${(v/1000).toFixed(1)}k`}</button>
              ))}
            </div>
            {jobLossYear > 0 && (
              <div className="sc-label-sm" style={{ color: '#f59e0b', marginTop: 8 }}>
                {jobLossPerson === 'D' ? 'D' : jobLossPerson === 'A' ? 'A' : 'D & A'} loses income for {jobLossMonths}mo
                {jobLossEveryN > 0 ? ` every ${jobLossEveryN}yr` : ' (once)'}
                {jobLossUI > 0 ? ` · EDD pays ${fmt(jobLossUI)}/mo` : ''}
                {' · net hit ~'}{fmt(
                  jobLossMonths * ((jobLossPerson === 'D' ? dBudget : jobLossPerson === 'A' ? aBudget : dBudget + aBudget) - (jobLossUI || 0) * (jobLossPerson === 'both' ? 2 : 1))
                )} per occurrence
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Group 3: Owning Costs ── */}
      <div className="sc-group sc-group--orange">
        <div className="sc-group-title">🏠 Owning Costs</div>

        <div className="sc-section">
          <div className="sc-label-sm" style={{ marginBottom: 4 }}>🏦 Mortgage interest rate</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <DebouncedInput
              type="number"
              step="0.125"
              min="0"
              max="15"
              value={mortgageRate}
              onCommit={v => setMortgageRate(v)}
              parse={raw => Math.round(Number(raw) * 1000) / 1000 || 0}
              style={{ width: 70, textAlign: 'right', fontSize: '0.8rem', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, MozAppearance: 'textfield' }}
            />
            <span className="sc-label-sm" style={{ margin: 0 }}>%</span>
          </div>
          <div className="sc-label-sm" style={{ marginBottom: 4 }}>🛡️ PMI rate (if down &lt; 20%)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Annual % of loan. Auto-drops when equity ≥ 20%.</div>
          <div className="year-picker" style={{ marginBottom: 4 }}>
            {[0, 0.3, 0.5, 0.75, 1, 1.5].map(p => (
              <button key={p}
                className={`year-btn ${pmiRate === p ? 'active' : ''}`}
                onClick={() => setPmiRate(p)}
              >{p === 0 ? 'None' : `${p}%`}</button>
            ))}
          </div>
        </div>

        <div className="sc-section">
          <div className="sc-section-title" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>Utilities (monthly)</div>
          <div className="util-grid">
            <div className="util-col">
              <span className="util-col-label">💧 Water</span>
              <DebouncedInput type="number" min={0} value={utilities.water}
                onCommit={v => setUtil('water', v)}
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
              <DebouncedInput type="number" min={0} value={utilities.trash}
                onCommit={v => setUtil('trash', v)}
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
              <DebouncedInput type="number" min={0} value={utilities.electricity}
                onCommit={v => setUtil('electricity', v)}
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
            {[0, 2, 3, 4, 5, 6, 7].map(p => (
              <button key={p}
                className={`year-btn ${hoaIncreasePct === p ? 'active' : ''}`}
                onClick={() => setHoaIncreasePct(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Insurance annual increase</div>
          <div className="year-picker">
            {[0, 2, 3, 4, 5].map(p => (
              <button key={p}
                className={`year-btn ${insuranceIncreasePct === p ? 'active' : ''}`}
                onClick={() => setInsuranceIncreasePct(p)}
              >{p}%</button>
            ))}
          </div>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">🔧 Repairs &amp; Maintenance</div>
          <div className="sc-label-sm">% of home value per year (no HOA homes)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>e.g. 1% on $500k = $417/mo</div>
          <div className="year-picker">
            {[0, 0.5, 1, 1.5, 2].map(p => (
              <button key={p}
                className={`year-btn ${maintenancePct === p ? 'active' : ''}`}
                onClick={() => setMaintenancePct(p)}
              >{p}%</button>
            ))}
          </div>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">🔄 Refinance</div>
          <div className="sc-label-sm">Refi at year (0 = never)</div>
          <div className="year-picker">
            {[0, 3, 5, 7, 10].map(p => (
              <button key={p}
                className={`year-btn ${refiYear === p ? 'active' : ''}`}
                onClick={() => setRefiYear(p)}
              >{p === 0 ? 'Never' : `Yr ${p}`}</button>
            ))}
          </div>
          <div className={refiYear === 0 ? 'sc-section-dimmed' : ''}>
            <div className="sc-label-sm" style={{ marginTop: 10 }}>New interest rate</div>
            <div className="year-picker">
              {[3, 3.5, 4, 4.5, 5, 5.5, 6].map(p => (
                <button key={p}
                  className={`year-btn ${refiRate === p ? 'active' : ''}`}
                  onClick={() => setRefiRate(p)}
                >{p}%</button>
              ))}
            </div>
            <div className="sc-label-sm" style={{ marginTop: 10 }}>New loan term</div>
            <div className="year-picker">
              <button
                className={`year-btn ${refiTermYears === 0 ? 'active' : ''}`}
                onClick={() => setRefiTermYears(0)}
              >Remaining</button>
              {[15, 20, 25, 30].map(p => (
                <button key={p}
                  className={`year-btn ${refiTermYears === p ? 'active' : ''}`}
                  onClick={() => setRefiTermYears(p)}
                >{p} yr</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Group 5: Rent & Invest ── */}
      <div className="sc-group sc-group--purple">
        <div className="sc-group-title">🏘 vs. Rent &amp; Invest</div>
        <div className="sc-section">
          <div className="sc-label-sm">Base rent (excl. utilities, grows annually)</div>
          <div className="rent-inputs">
            <div className="rent-input-group">
              <label className="rent-input-label">1 BR</label>
              <DebouncedInput type="number" min={0} step={50} value={rent1BR}
                onCommit={setRent1BR}
                className="sc-number-input" />
            </div>
            <div className="rent-input-group">
              <label className="rent-input-label">2+ BR</label>
              <DebouncedInput type="number" min={0} step={50} value={rent2BR}
                onCommit={setRent2BR}
                className="sc-number-input" />
            </div>
          </div>
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Upgrade to 2BR at year</div>
          <div className="year-picker">
            <button
              className={`year-btn ${rentUpgradeTo2BR === 0 ? 'active' : ''}`}
              onClick={() => setRentUpgradeTo2BR(0)}
            >Stay 1BR</button>
            {[1, 2, 3, 5, 7, 10].map(y => (
              <button key={y}
                className={`year-btn ${rentUpgradeTo2BR === y ? 'active' : ''}`}
                onClick={() => setRentUpgradeTo2BR(y)}
              >Yr {y}</button>
            ))}
          </div>
          <div className="rent-inputs" style={{ marginTop: 6 }}>
            <div className="rent-input-group">
              <label className="rent-input-label">Parking/mo</label>
              <DebouncedInput type="number" min={0} step={10} value={rentParking}
                onCommit={setRentParking}
                className="sc-number-input" />
            </div>
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Utilities while renting (monthly)</div>
          <div className="util-grid" style={{ marginTop: 4 }}>
            <div className="util-col">
              <span className="util-col-label">💧 Water</span>
              <DebouncedInput type="number" min={0} step={5} value={rentUtilities.water}
                onCommit={v => setRentUtilities(u => ({ ...u, water: v || 0 }))}
                className="util-input" />
            </div>
            <div className="util-col">
              <span className="util-col-label">🚿 Sewer</span>
              <DebouncedInput type="number" min={0} step={5} value={rentUtilities.sewer ?? 90}
                onCommit={v => setRentUtilities(u => ({ ...u, sewer: v || 0 }))}
                className="util-input" />
            </div>
            <div className="util-col">
              <span className="util-col-label">🗑 Trash</span>
              <DebouncedInput type="number" min={0} step={5} value={rentUtilities.trash}
                onCommit={v => setRentUtilities(u => ({ ...u, trash: v || 0 }))}
                className="util-input" />
            </div>
            <div className="util-col">
              <span className="util-col-label">⚡ Electric</span>
              <DebouncedInput type="number" min={0} step={10} value={rentUtilities.electricity}
                onCommit={v => setRentUtilities(u => ({ ...u, electricity: v || 0 }))}
                className="util-input" />
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
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Utility annual increase</div>
          <div className="year-picker">
            {[0, 1, 2, 3, 4, 5].map(p => (
              <button key={p}
                className={`year-btn ${utilIncreaseRate === p ? 'active' : ''}`}
                onClick={() => setUtilIncreaseRate(p)}
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
      </div>

      {/* ── Group 6: Retirement & Overseas ── */}
      <div className="sc-group sc-group--teal">
        <div className="sc-group-title">🏖 Retirement & Overseas</div>

        <div className="sc-section">
          <div className="sc-section-title" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>📊 Market Scenario</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 6 }}>One-click presets for investment returns, inflation, and growth rates. Spending &amp; income are not changed.</div>
          <div className="year-picker" style={{ gap: 4 }}>
            {[
              { label: '🐻 Pessimistic', inv: 8, hysa: 2, infl: 3.5, appr: 2, hoa: 5, tax: 3, ins: 4, ssCut: 20 },
              { label: '⚖️ Moderate',     inv: 10, hysa: 3.5, infl: 3, appr: 3, hoa: 3, tax: 2, ins: 3, ssCut: 15 },
              { label: '🐂 Optimistic',   inv: 11, hysa: 4.5, infl: 2.5, appr: 4, hoa: 2, tax: 1, ins: 2, ssCut: 0 },
            ].map(s => {
              const active = investRate === s.inv && inflationRate === s.infl && ssCutPct === s.ssCut
              return (
                <button key={s.label}
                  className={`year-btn ${active ? 'active' : ''}`}
                  style={{ fontSize: '0.65rem', padding: '5px 8px', flex: 1 }}
                  onClick={() => {
                    startTransition(() => {
                      setInvestRate(s.inv); setHysaRate(s.hysa)
                      setInflationRate(s.infl); setSpendInflationRate(s.infl)
                      setAppreciationPct(s.appr); setHoaIncreasePct(s.hoa)
                      setTaxIncreasePct(s.tax); setInsuranceIncreasePct(s.ins)
                      setSsCutPct(s.ssCut)
                    })
                  }}
                >{s.label}</button>
              )
            })}
          </div>
          <div className="sc-label-sm" style={{ color: '#6b7280', marginTop: 4 }}>
            Current: {investRate}% nominal return · {spendInflationRate || inflationRate}% inflation · ~{(investRate - (spendInflationRate || inflationRate)).toFixed(1)}% real
          </div>
        </div>

        <div className="sc-section">
          <div className="sc-section-title" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>Retirement</div>
          <div className="sc-label-sm">Your current age</div>
          <DebouncedInput type="number" min={18} max={80} step={1} value={currentAge}
            onCommit={v => setCurrentAge(v || 33)}
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
          <div className="sc-label-sm" style={{ marginTop: 14 }}>💰 Withdrawal tax</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 6 }}>Withdrawal tax is automatically blended from your bucket split above — Roth withdraws tax-free, Traditional 401k is taxed at the location rate, Brokerage at the cap gains rate.</div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>🏛 Social Security (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 6 }}>SS offsets pool withdrawals — grows with inflation (COLA). Use ssa.gov to estimate your benefit.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 4 }}>
            <div>
              <div className="sc-label-sm" style={{ marginBottom: 2 }}>D benefit/mo</div>
              <DebouncedInput type="number" min={0} max={5000} step={100} value={dSS || 0}
                onCommit={setDSS}
                className="sc-number-input" style={{ width: 90 }} />
            </div>
            <div>
              <div className="sc-label-sm" style={{ marginBottom: 2 }}>A benefit/mo</div>
              <DebouncedInput type="number" min={0} max={5000} step={100} value={aSS || 0}
                onCommit={setASS}
                className="sc-number-input" style={{ width: 90 }} />
            </div>
          </div>
          <div className="sc-label-sm" style={{ color: '#6b7280', marginBottom: 4 }}>Combined {fmt((dSS||0)+(aSS||0))}/mo · {fmt(((dSS||0)+(aSS||0))*12)}/yr</div>
          <div className="sc-label-sm" style={{ marginBottom: 4 }}>Claim age</div>
          <div className="year-picker">
            {[62, 65, 67, 70].map(a => (
              <button key={a}
                className={`year-btn ${ssClaimAge === a ? 'active' : ''}`}
                onClick={() => setSsClaimAge(a)}
              >Age {a}</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ color: '#6b7280', marginTop: 4 }}>
            {ssClaimAge === 62 ? '⚠️ Early — 70% of full benefit' : ssClaimAge === 65 ? '~85% of full benefit' : ssClaimAge === 67 ? '✓ Full retirement age' : '🏆 Max — 124% of full benefit (+32%)'}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Future benefit cut</div>
          <div className="year-picker">
            {[0, 10, 15, 20, 30].map(c => (
              <button key={c}
                className={`year-btn ${ssCutPct === c ? 'active' : ''}`}
                onClick={() => setSsCutPct(c)}
              >{c === 0 ? 'None' : `−${c}%`}</button>
            ))}
          </div>
          {ssCutPct > 0 && <div className="sc-label-sm" style={{ color: '#f87171', marginTop: 4 }}>⚠️ Benefits reduced {ssCutPct}% due to projected SS funding shortfall</div>}
          <div className="sc-label-sm" style={{ marginTop: 10 }}>🏠 House appreciation / yr</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Controls sale price in Options 5–7 (and early sale)</div>
          <div className="year-picker">
            {[0, 1, 1.5, 2, 3, 4, 5].map(p => (
              <button key={p}
                className={`year-btn ${appreciationPct === p ? 'active' : ''}`}
                onClick={() => setAppreciationPct(p)}
              >{p}%</button>
            ))}
          </div>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">🏥 Late Life Care
            <button
              onClick={() => { setCareStartAge(82); setCareMonthlyStay(6000); setCareMonthlyRelocateUS(4000); setCareMonthlyOverseas(800) }}
              style={{ float: 'right', fontSize: '0.6rem', background: 'rgba(107,114,128,0.2)', border: '1px solid rgba(107,114,128,0.3)', color: '#9ca3af', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
            >reset</button>
          </div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 8 }}>Assisted living / care facility costs added to pool withdrawals starting at a set age. All values in today's dollars — inflated in the model.</div>
          <div className="sc-label-sm" style={{ marginBottom: 2 }}>Care start age</div>
          <DebouncedInput type="number" min={75} max={95} step={1} value={careStartAge}
            onCommit={v => setCareStartAge(v || 82)}
            className="sc-number-input" style={{ width: 80 }} />
          <div className="sc-ticks" style={{ marginTop: 2 }}><span style={{ color: '#6b7280', fontSize: '0.65rem' }}>range: 75–95 · runs until age 95</span></div>
          <div className="sc-label-sm" style={{ marginTop: 12 }}>Stay in CA care/mo</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Opt 1 — staying in CA home. CA avg ~$6,000–$8,000/mo.</div>
          <DebouncedInput type="number" min={0} max={15000} step={250} value={careMonthlyStay}
            onCommit={setCareMonthlyStay}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Relocated US care/mo</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Opts 3–5 — moved to cheaper US state. TX/AZ avg ~$3,500–$5,000/mo.</div>
          <DebouncedInput type="number" min={0} max={10000} step={250} value={careMonthlyRelocateUS}
            onCommit={setCareMonthlyRelocateUS}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Overseas care/mo</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Opts 2, 6–7 — all-inclusive (replaces rent). India ~$500–$1,500 · Portugal ~$2,000–$3,000 · Thailand ~$800.</div>
          <DebouncedInput type="number" min={0} max={5000} step={100} value={careMonthlyOverseas}
            onCommit={setCareMonthlyOverseas}
            className="sc-number-input" />
        </div>

        <div className="sc-section">
          <div className="sc-section-title">💰 Sale &amp; Rental Tax</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 8 }}>Applied to house sale proceeds and rental income in all sell/rent-out scenarios.</div>
          <div className="sc-label-sm" style={{ marginBottom: 6 }}>Capital gains scenario</div>
          <div className="year-picker" style={{ marginBottom: 6 }}>
            {[
              { label: 'Retired · no salary', rate: 20, hint: 'Fed 15–20% + CA ~5% effective ≈ 20%' },
              { label: 'Still working in CA', rate: 33, hint: 'Fed 20% + 3.8% NIIT + CA 9.3% ≈ 33%' },
            ].map(({ label, rate, hint }) => (
              <button key={label}
                className={`year-btn ${capitalGainsTaxPct === rate ? 'active' : ''}`}
                onClick={() => setCapitalGainsTaxPct(rate)}
                title={hint}
              >{label}</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginBottom: 2 }}>Capital gains rate (%)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>
            {capitalGainsTaxPct === 20
              ? 'Retired with no salary: Fed 15–20% on gain above $94k + CA ~5% effective ≈ 20% combined.'
              : capitalGainsTaxPct === 33
              ? 'Still earning salary in CA: Fed 20% + 3.8% NIIT + CA 9.3% ≈ 33% combined.'
              : 'Custom rate. Use the buttons above as a starting point.'}
          </div>
          <DebouncedInput type="number" min={0} max={50} step={0.1} value={capitalGainsTaxPct}
            onCommit={setCapitalGainsTaxPct}
            className="sc-number-input" style={{ width: 80 }} />
          <div className="sc-label-sm" style={{ marginTop: 12 }}>Primary residence exclusion ($)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Married filing jointly: $500,000. Reduces taxable gain on primary home sale.</div>
          <DebouncedInput type="number" min={0} max={1000000} step={50000} value={primaryResidenceExclusion}
            onCommit={setPrimaryResidenceExclusion}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 12 }}>Rental income tax rate (%)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 6 }}>Applied to net rental profit only. Rental income stacks on top of your other income.</div>
          <div className="year-picker" style={{ marginBottom: 6 }}>
            {[
              { label: 'Retired · no salary', rate: 22, hint: 'Fed 12–22% + CA ~5% effective ≈ 22%' },
              { label: 'Still working in CA', rate: 32, hint: 'Fed 22% + CA 9.3–12.3% ≈ 32%' },
            ].map(({ label, rate, hint }) => (
              <button key={label}
                className={`year-btn ${rentalIncomeTaxPct === rate ? 'active' : ''}`}
                onClick={() => setRentalIncomeTaxPct(rate)}
                title={hint}
              >{label}</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginBottom: 2 }}>Rental income tax rate (%)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>
            {rentalIncomeTaxPct === 22
              ? 'Retired with no salary: rental profit taxed at lower brackets — Fed ~12% + CA ~5–10% effective ≈ 22%.'
              : rentalIncomeTaxPct === 32
              ? 'Still earning salary: rental profit hits higher brackets — Fed 22% + CA 9.3–12.3% ≈ 32%.'
              : 'Custom rate. Use the buttons above as a starting point.'}
          </div>
          <DebouncedInput type="number" min={0} max={60} step={1} value={rentalIncomeTaxPct}
            onCommit={setRentalIncomeTaxPct}
            className="sc-number-input" style={{ width: 80 }} />
        </div>

        <div className="sc-section">
          <div className="sc-section-title">🌏 Overseas</div>
          <div className="sc-label-sm">🏠 Overseas rent/mo (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Rent abroad — compare vs. staying in US</div>
          <DebouncedInput type="number" min={0} step={100} value={overseasCost}
            onCommit={setOverseasCost}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 10 }}>💸 Overseas monthly spend (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Personal spending excl. housing</div>
          <DebouncedInput type="number" min={0} step={100} value={overseasSpendingCap}
            onCommit={setOverseasSpendingCap}
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
          <div className="sc-label-sm" style={{ marginTop: 10 }}>US rental income annual increase</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>How much your rent-out income grows/yr</div>
          <div className="year-picker">
            {[0, 1, 2, 3, 4, 5].map(p => (
              <button key={p}
                className={`year-btn ${usRentalIncrease === p ? 'active' : ''}`}
                onClick={() => setUsRentalIncrease(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>🏡 Sell &amp; Relocate — rent at new location (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Monthly rent after selling (US city or overseas)</div>
          <DebouncedInput type="number" min={0} step={100} value={relocateMonthlyCost}
            onCommit={setRelocateMonthlyCost}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 10 }}>🏠 Sell &amp; Buy — new home price (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Purchase price at new location (grows with inflation by retirement)</div>
          <DebouncedInput type="number" min={0} step={10000} value={relocateBuyPrice}
            onCommit={setRelocateBuyPrice}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Down payment %</div>
          <div className="year-picker">
            {[10, 15, 20, 25, 30].map(p => (
              <button key={p}
                className={`year-btn ${relocateBuyDownPct === p ? 'active' : ''}`}
                onClick={() => setRelocateBuyDownPct(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Mortgage rate at new home</div>
          <div className="year-picker">
            {[5, 6, 6.5, 7, 7.5, 8].map(p => (
              <button key={p}
                className={`year-btn ${relocateMortgageRate === p ? 'active' : ''}`}
                onClick={() => setRelocateMortgageRate(p)}
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
        </div>
      </div>

      {/* ── Group 7: Rentvest ── */}
      <div className="sc-group sc-group--purple">
        <div className="sc-group-title">🏘 Option 8 · Rentvest</div>
        <div className="sc-label-sm" style={{ color: '#c4b5fd', marginBottom: 8, fontSize: '0.72rem' }}>
          Buy a cheap property now · rent it out · move in at retirement
        </div>

        <div className="sc-section">
          <div className="sc-section-title" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>Rental Property</div>
          <div className="sc-label-sm">Purchase price (today's $)</div>
          <DebouncedInput type="number" min={0} step={10000} value={rentvestPrice}
            onCommit={setRentvestPrice}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Down payment %</div>
          <div className="year-picker">
            {[15, 20, 25, 30].map(p => (
              <button key={p}
                className={`year-btn ${rentvestDown === p ? 'active' : ''}`}
                onClick={() => setRentvestDown(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Investment mortgage rate</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Typically +0.5–1% above primary rates</div>
          <div className="year-picker">
            {[6.5, 7, 7.5, 8, 8.5].map(p => (
              <button key={p}
                className={`year-btn ${rentvestMortgageRate === p ? 'active' : ''}`}
                onClick={() => setRentvestMortgageRate(p)}
              >{p}%</button>
            ))}
          </div>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">Rental Income</div>
          <div className="sc-label-sm">Monthly rent you charge (today's $)</div>
          <DebouncedInput type="number" min={0} step={100} value={rentvestRent}
            onCommit={setRentvestRent}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Rent annual growth</div>
          <div className="year-picker">
            {[0, 1, 2, 3, 4, 5].map(p => (
              <button key={p}
                className={`year-btn ${rentvestRentGrowth === p ? 'active' : ''}`}
                onClick={() => setRentvestRentGrowth(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Property management fee</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>% of rent (0 = self-managed)</div>
          <div className="year-picker">
            {[0, 5, 8, 10, 12].map(p => (
              <button key={p}
                className={`year-btn ${rentvestMgmtFee === p ? 'active' : ''}`}
                onClick={() => setRentvestMgmtFee(p)}
              >{p}%</button>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
