import { fmt } from '../utils/mortgage'
import './GlobalControls.css'

export default function GlobalControls({ dCashBudget, setDCashBudget, aCashBudget, setACashBudget, dDown, setDDown, aDown, setADown, aMonthlyAdj, setAMonthlyAdj, equalizeYears, setEqualizeYears, saleYear, setSaleYear, appreciationPct, setAppreciationPct, taxIncreasePct, setTaxIncreasePct, hoaIncreasePct, setHoaIncreasePct, insuranceIncreasePct, setInsuranceIncreasePct, refiYear, setRefiYear, refiRate, setRefiRate, refiTermYears, setRefiTermYears, dBudget, setDBudget, aBudget, setABudget, aBudgetIncrease, setABudgetIncrease, dIncome, setDIncome, aIncome, setAIncome, investRate, setInvestRate, hysaRate, setHysaRate, retireMode, setRetireMode, rent1BR, setRent1BR, rent2BR, setRent2BR, rentUpgradeTo2BR, setRentUpgradeTo2BR, rentIncreaseRate, setRentIncreaseRate, rentMoveEvery, setRentMoveEvery, rentMarketGrowth, setRentMarketGrowth, rentParking, setRentParking, utilities, setUtilities, rentUtilities, setRentUtilities, utilIncreaseRate, setUtilIncreaseRate, retireYear, setRetireYear, retireMaxAge, setRetireMaxAge, withdrawalTaxPct, setWithdrawalTaxPct, accumBoostPct, setAccumBoostPct, d401kContrib, setD401kContrib, a401kContrib, setA401kContrib, overseasWithdrawalTaxPct, setOverseasWithdrawalTaxPct, relocateWithdrawalTaxPct, setRelocateWithdrawalTaxPct, rentvestWithdrawalTaxPct, setRentvestWithdrawalTaxPct, capitalGainsTaxPct, setCapitalGainsTaxPct, primaryResidenceExclusion, setPrimaryResidenceExclusion, rentalIncomeTaxPct, setRentalIncomeTaxPct, dSS, setDSS, aSS, setASS, ssClaimAge, setSsClaimAge, careStartAge, setCareStartAge, careMonthlyStay, setCareMonthlyStay, careMonthlyRelocateUS, setCareMonthlyRelocateUS, careMonthlyOverseas, setCareMonthlyOverseas, jobLossMonths, setJobLossMonths, jobLossYear, setJobLossYear, jobLossPerson, setJobLossPerson, inflationRate, setInflationRate, spendInflationRate, setSpendInflationRate, currentAge, setCurrentAge, spendingCap, setSpendingCap, aSpendingCap, setASpendingCap, overseasCost, setOverseasCost, overseasSpendingCap, setOverseasSpendingCap, overseasRentIncrease, setOverseasRentIncrease, usRentalIncrease, setUsRentalIncrease, colRatio, setColRatio, maintenancePct, setMaintenancePct, closingCostPct, relocateMonthlyCost, setRelocateMonthlyCost, relocateBuyPrice, setRelocateBuyPrice, relocateBuyDownPct, setRelocateBuyDownPct, relocateMortgageRate, setRelocateMortgageRate, rentvestPrice, setRentvestPrice, rentvestDown, setRentvestDown, rentvestMortgageRate, setRentvestMortgageRate, rentvestRent, setRentvestRent, rentvestRentGrowth, setRentvestRentGrowth, rentvestMgmtFee, setRentvestMgmtFee, dRothMonthly, setDRothMonthly, dRothBackdoor, setDRothBackdoor, dTradMonthly, setDTradMonthly, aRothMonthly, setARothMonthly, aRothBackdoor, setARothBackdoor, aTradMonthly, setATradMonthly }) {
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
              <input type="number" min={0} step={100} value={dIncome || ''}
                placeholder="e.g. 12000"
                onChange={e => setDIncome(Number(e.target.value) || 0)}
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
              <input type="number" min={0} step={100} value={aIncome || ''}
                placeholder="e.g. 4000"
                onChange={e => setAIncome(Number(e.target.value) || 0)}
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
              <input type="number" min={0} step={50} value={dBudget}
                onChange={e => setDBudget(Number(e.target.value) || 0)}
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
              <input type="number" min={0} step={50} value={aBudget}
                onChange={e => setABudget(Number(e.target.value) || 0)}
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

          {/* ── Bucket split preview ── */}
          <div className="sc-label-sm" style={{ marginTop: 14 }}>🪣 Investment bucket split</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 6 }}>After housing costs, monthly leftover goes: Roth IRA first (up to $583/mo IRS max), rest to Brokerage. At retirement, withdrawal tax is blended from the actual Roth vs Brokerage ratio — Roth withdraws tax-free, Brokerage at cap gains rate.</div>

          <div className="sc-label-sm" style={{ marginTop: 10 }}>Investment annual return</div>
          <div className="year-picker">
            {[5, 6, 7, 8, 9].map(p => (
              <button key={p}
                className={`year-btn ${investRate === p ? 'active' : ''}`}
                onClick={() => setInvestRate(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>💰 HYSA annual return</div>
          <div className="year-picker">
            {[2, 3, 4, 5].map(p => (
              <button key={p}
                className={`year-btn ${hysaRate === p ? 'active' : ''}`}
                onClick={() => setHysaRate(p)}
              >{p}%</button>
            ))}
          </div>
        </div>

        <div className="sc-section">
          <div className="sc-section-title">⚠️ Job Loss Buffer</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 8 }}>Models a period of no income. That person's budget contribution drops to $0 for the specified months, reducing portfolio accumulation.</div>
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
          <div className="sc-label-sm" style={{ marginBottom: 2 }}>At year</div>
          <div className="year-picker" style={{ marginBottom: 10 }}>
            {[0, 1, 2, 3, 4, 5].map(y => (
              <button key={y}
                className={`year-btn ${jobLossYear === y ? 'active' : ''}`}
                onClick={() => setJobLossYear(y)}
              >{y === 0 ? 'Off' : `Yr ${y}`}</button>
            ))}
          </div>
          <div className={jobLossYear === 0 ? 'sc-section-dimmed' : ''}>
            <div className="sc-label-sm" style={{ marginBottom: 2 }}>Duration (months)</div>
            <div className="year-picker">
              {[3, 6, 9, 12, 18, 24].map(m => (
                <button key={m}
                  className={`year-btn ${jobLossMonths === m ? 'active' : ''}`}
                  onClick={() => setJobLossMonths(m)}
                >{m}mo</button>
              ))}
            </div>
            {jobLossYear > 0 && (
              <div className="sc-label-sm" style={{ color: '#f59e0b', marginTop: 8 }}>
                {jobLossPerson === 'D' ? 'D' : jobLossPerson === 'A' ? 'A' : 'D & A'} contributes $0 for {jobLossMonths} months at Yr {jobLossYear} — pool takes a ~{fmt(
                  jobLossMonths * (jobLossPerson === 'D' ? dBudget : jobLossPerson === 'A' ? aBudget : dBudget + aBudget)
                )} hit
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Group 3: Owning Costs ── */}
      <div className="sc-group sc-group--orange">
        <div className="sc-group-title">🏠 Owning Costs</div>

        <div className="sc-section">
          <div className="sc-section-title" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>Utilities (monthly)</div>
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
          <div className="sc-label-sm" style={{ marginTop: 8 }}>Upgrade to 2BR at year</div>
          <div className="year-picker">
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
              <input type="number" min={0} step={10} value={rentParking}
                onChange={e => setRentParking(Number(e.target.value) || 0)}
                className="sc-number-input" />
            </div>
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Utilities while renting (monthly)</div>
          <div className="util-grid" style={{ marginTop: 4 }}>
            <div className="util-col">
              <span className="util-col-label">💧 Water</span>
              <input type="number" min={0} step={5} value={rentUtilities.water}
                onChange={e => setRentUtilities(u => ({ ...u, water: Number(e.target.value) || 0 }))}
                className="util-input" />
            </div>
            <div className="util-col">
              <span className="util-col-label">🚿 Sewer</span>
              <input type="number" min={0} step={5} value={rentUtilities.sewer ?? 90}
                onChange={e => setRentUtilities(u => ({ ...u, sewer: Number(e.target.value) || 0 }))}
                className="util-input" />
            </div>
            <div className="util-col">
              <span className="util-col-label">🗑 Trash</span>
              <input type="number" min={0} step={5} value={rentUtilities.trash}
                onChange={e => setRentUtilities(u => ({ ...u, trash: Number(e.target.value) || 0 }))}
                className="util-input" />
            </div>
            <div className="util-col">
              <span className="util-col-label">⚡ Electric</span>
              <input type="number" min={0} step={10} value={rentUtilities.electricity}
                onChange={e => setRentUtilities(u => ({ ...u, electricity: Number(e.target.value) || 0 }))}
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
          <div className="sc-section-title" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>Retirement</div>
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
          <div className="sc-label-sm" style={{ marginTop: 10 }}>💰 Monthly spending cap (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Excess reinvested into pool (0 = no cap)</div>
          <div className="sc-row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div className="sc-block" style={{ flex: 1 }}>
              <div className="sc-label-row"><span className="sc-label d-color">D</span><span className="sc-value d-color">{fmt(spendingCap)}</span></div>
              <input type="number" min={0} step={500} value={spendingCap}
                onChange={e => setSpendingCap(Number(e.target.value) || 0)}
                className="sc-number-input" />
            </div>
            <div className="sc-block" style={{ flex: 1 }}>
              <div className="sc-label-row"><span className="sc-label a-color">A</span><span className="sc-value a-color">{fmt(aSpendingCap)}</span></div>
              <input type="number" min={0} step={500} value={aSpendingCap}
                onChange={e => setASpendingCap(Number(e.target.value) || 0)}
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
          <div className="sc-label-sm" style={{ marginTop: 14 }}>💰 Withdrawal tax</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 6 }}>Withdrawal tax is automatically blended from your bucket split above — Roth withdraws tax-free, Traditional 401k is taxed at the location rate, Brokerage at the cap gains rate.</div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>🏛 Social Security (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 6 }}>SS offsets pool withdrawals — grows with inflation (COLA). Use ssa.gov to estimate your benefit.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 4 }}>
            <div>
              <div className="sc-label-sm" style={{ marginBottom: 2 }}>D benefit/mo</div>
              <input type="number" min={0} max={5000} step={100} value={dSS || 0}
                onChange={e => setDSS(Number(e.target.value) || 0)}
                className="sc-number-input" style={{ width: 90 }} />
            </div>
            <div>
              <div className="sc-label-sm" style={{ marginBottom: 2 }}>A benefit/mo</div>
              <input type="number" min={0} max={5000} step={100} value={aSS || 0}
                onChange={e => setASS(Number(e.target.value) || 0)}
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
          <div className="sc-label-sm" style={{ marginTop: 10 }}>🏠 House appreciation / yr</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Controls sale price in Options 5–7 (and early sale)</div>
          <div className="year-picker">
            {[0, 1, 2, 3, 4, 5].map(p => (
              <button key={p}
                className={`year-btn ${appreciationPct === p ? 'active' : ''}`}
                onClick={() => setAppreciationPct(p)}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Inflation (general + spend default)</div>
          <div className="year-picker">
            {[2, 2.5, 3].map(p => (
              <button key={p}
                className={`year-btn ${inflationRate === p ? 'active' : ''}`}
                onClick={() => { setInflationRate(p); setSpendInflationRate(p) }}
              >{p}%</button>
            ))}
          </div>
          <div className="sc-label-sm" style={{ marginTop: 10 }}>💸 Spending inflation override <span style={{ color: '#9ca3af', fontWeight: 400 }}>(if different from above)</span></div>
          <div className="year-picker">
            {[2, 2.5, 3, 3.5, 4].map(p => (
              <button key={p}
                className={`year-btn ${spendInflationRate === p ? 'active' : ''}`}
                onClick={() => setSpendInflationRate(p)}
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
          <input type="number" min={75} max={95} step={1} value={careStartAge}
            onChange={e => setCareStartAge(Number(e.target.value) || 82)}
            className="sc-number-input" style={{ width: 80 }} />
          <div className="sc-ticks" style={{ marginTop: 2 }}><span style={{ color: '#6b7280', fontSize: '0.65rem' }}>range: 75–95 · runs until age 95</span></div>
          <div className="sc-label-sm" style={{ marginTop: 12 }}>Stay in CA care/mo</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Opt 1 — staying in CA home. CA avg ~$6,000–$8,000/mo.</div>
          <input type="number" min={0} max={15000} step={250} value={careMonthlyStay}
            onChange={e => setCareMonthlyStay(Number(e.target.value) || 0)}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Relocated US care/mo</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Opts 3–5 — moved to cheaper US state. TX/AZ avg ~$3,500–$5,000/mo.</div>
          <input type="number" min={0} max={10000} step={250} value={careMonthlyRelocateUS}
            onChange={e => setCareMonthlyRelocateUS(Number(e.target.value) || 0)}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 10 }}>Overseas care/mo</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Opts 2, 6–7 — all-inclusive (replaces rent). India ~$500–$1,500 · Portugal ~$2,000–$3,000 · Thailand ~$800.</div>
          <input type="number" min={0} max={5000} step={100} value={careMonthlyOverseas}
            onChange={e => setCareMonthlyOverseas(Number(e.target.value) || 0)}
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
          <input type="number" min={0} max={50} step={0.1} value={capitalGainsTaxPct}
            onChange={e => setCapitalGainsTaxPct(Number(e.target.value))}
            className="sc-number-input" style={{ width: 80 }} />
          <div className="sc-label-sm" style={{ marginTop: 12 }}>Primary residence exclusion ($)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Married filing jointly: $500,000. Reduces taxable gain on primary home sale.</div>
          <input type="number" min={0} max={1000000} step={50000} value={primaryResidenceExclusion}
            onChange={e => setPrimaryResidenceExclusion(Number(e.target.value))}
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
          <input type="number" min={0} max={60} step={1} value={rentalIncomeTaxPct}
            onChange={e => setRentalIncomeTaxPct(Number(e.target.value))}
            className="sc-number-input" style={{ width: 80 }} />
        </div>

        <div className="sc-section">
          <div className="sc-section-title">🌏 Overseas</div>
          <div className="sc-label-sm">🏠 Overseas rent/mo (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Rent abroad — compare vs. staying in US</div>
          <input type="number" min={0} step={100} value={overseasCost}
            onChange={e => setOverseasCost(Number(e.target.value) || 0)}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 10 }}>💸 Overseas monthly spend (today's $)</div>
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
          <input type="number" min={0} step={100} value={relocateMonthlyCost}
            onChange={e => setRelocateMonthlyCost(Number(e.target.value) || 0)}
            className="sc-number-input" />
          <div className="sc-label-sm" style={{ marginTop: 10 }}>🏠 Sell &amp; Buy — new home price (today's $)</div>
          <div className="sc-label-sm" style={{ color: '#9ca3af', marginBottom: 4 }}>Purchase price at new location (grows with inflation by retirement)</div>
          <input type="number" min={0} step={10000} value={relocateBuyPrice}
            onChange={e => setRelocateBuyPrice(Number(e.target.value) || 0)}
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
          <input type="number" min={0} step={10000} value={rentvestPrice}
            onChange={e => setRentvestPrice(Number(e.target.value) || 0)}
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
          <input type="number" min={0} step={100} value={rentvestRent}
            onChange={e => setRentvestRent(Number(e.target.value) || 0)}
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
