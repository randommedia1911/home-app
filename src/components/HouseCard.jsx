import { useState } from 'react'
import { calcTotalMonthly, calcSaleProceeds, calcAMonthlyFromOwnership, fmt } from '../utils/mortgage'
import './HouseCard.css'

// FV of variable annual monthly contributions, each grown to end of investYears
// yearlyPmts[i] = monthly contribution during year i+1
function fvVariableAnnuity(yearlyPmts, annualRatePct) {
  const r = annualRatePct / 100 / 12
  const n = yearlyPmts.length
  let fv = 0
  for (let y = 0; y < n; y++) {
    const pmt = Math.max(0, yearlyPmts[y])
    if (pmt <= 0) continue
    // FV of 12 monthly contributions made during year y+1, grown to end of period
    const fvYear = r > 0 ? pmt * (Math.pow(1 + r, 12) - 1) / r : pmt * 12
    const remainingMonths = (n - y - 1) * 12
    fv += fvYear * (r > 0 ? Math.pow(1 + r, remainingMonths) : 1)
  }
  return fv
}

export default function HouseCard({ house, dCashBudget, aCashBudget, dDown, aDown, closingCostPct, aMonthlyAdj, equalizeYears, saleYear, appreciationPct, taxIncreasePct, hoaIncreasePct, dBudget, aBudget, investRate, investYears, retireMode, rent1BR, rent2BR, rentIncreaseRate, rentMoveEvery, rentMarketGrowth, rentParking, utilities, utilIncreaseRate, retireYear, withdrawalRate, inflationRate, currentAge, snapshotsExpanded, onToggleSnapshots, onEdit, onDelete, onStatusChange }) {
  const [dOwnTarget, setDOwnTarget] = useState(50)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try { await onDelete() } finally { setDeleting(false) }
  }

  const baseAMonthly = calcAMonthlyFromOwnership(house, dDown, aDown, closingCostPct, dOwnTarget, utilities)
  const effectiveAMonthly = Math.max(0, baseAMonthly + aMonthlyAdj)

  const {
    pi, tax, hoa, insurance, utilsTotal, total,
    totalCash, closingCosts, actualDownPmt, loanAmount, actualDownPct,
    aMonthly, dMonthly, equalMonthly, aOverpaid,
    dDuringRepay, dAfterRepay, aNetDuring, aNetAfter,
    aOwn, dOwn,
  } = calcTotalMonthly(house, dDown, aDown, closingCostPct, effectiveAMonthly, equalizeYears, utilities)

  const appreciatedPrice = house.price * Math.pow(1 + (appreciationPct || 0) / 100, saleYear)
  const sale = calcSaleProceeds(house, dDown, aDown, closingCostPct, effectiveAMonthly, equalizeYears, saleYear, appreciatedPrice, utilities)

  // Investment savings: year-by-year leftover with compounding HOA/tax, invested at investRate%
  const iYrs = investYears || 30
  const dYearlyLeftover = []
  const aYearlyLeftover = []
  for (let y = 1; y <= iYrs; y++) {
    const utilFactor = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const projUtils = {
      water: (utilities.water || 0) * utilFactor,
      trash: (utilities.trash || 0) * utilFactor,
      electricity: (utilities.electricity || 0) * utilFactor,
    }
    const ph = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly: house.hoaMonthly * Math.pow(1 + (hoaIncreasePct || 0) / 100, y),
    }
    const pBase = calcAMonthlyFromOwnership(ph, dDown, aDown, closingCostPct, dOwnTarget, projUtils)
    const pEff  = Math.max(0, pBase + aMonthlyAdj)
    const p     = calcTotalMonthly(ph, dDown, aDown, closingCostPct, pEff, equalizeYears, projUtils)
    const inRepay = y <= equalizeYears
    const dCost = inRepay ? p.dDuringRepay : p.dAfterRepay
    const aCost = inRepay ? p.aNetDuring   : p.aNetAfter
    dYearlyLeftover.push(Math.max(0, (dBudget || 0) - dCost))
    aYearlyLeftover.push(Math.max(0, (aBudget || 0) - aCost))
  }
  const dInvestOnly = fvVariableAnnuity(dYearlyLeftover, investRate || 0)
  const aInvestOnly = fvVariableAnnuity(aYearlyLeftover, investRate || 0)

  const r = (investRate || 0) / 100 / 12
  const sellAndMove = retireMode === 'elsewhere' && saleYear <= iYrs
  const rentOut     = retireMode === 'rent' && saleYear <= iYrs

  // Sell & move: add sale proceeds grown from saleYear to iYrs
  const growthMonths = (iYrs - saleYear) * 12
  const growthFactor = r > 0 ? Math.pow(1 + r, growthMonths) : 1
  const dSaleBonus = sellAndMove ? sale.dProceeds * growthFactor : 0
  const aSaleBonus = sellAndMove ? sale.aProceeds * growthFactor : 0

  // Rent it out: net rental profit = rent income − mortgage P&I (until loan paid off)
  // Rent grows with home appreciation each year; P&I is fixed
  const dOwnFrac = sale.dOwnAtSale / 100
  const aOwnFrac = sale.aOwnAtSale / 100
  // Rent & move: move-out = saleYear
  const rentMoveOutYear = saleYear
  // House equity still owned at move-out year (appreciating the whole time)
  const houseValueAtEnd = rentOut ? house.price * Math.pow(1 + (appreciationPct || 0) / 100, rentMoveOutYear) : 0
  const dHouseEquity = rentOut ? houseValueAtEnd * dOwnFrac * 0.94 : 0
  const aHouseEquity = rentOut ? houseValueAtEnd * aOwnFrac * 0.94 : 0

  // Year 1 and final year leftovers for display label
  const dLeftoverYr1    = Math.max(0, dYearlyLeftover[0] || 0)
  const aLeftoverYr1    = Math.max(0, aYearlyLeftover[0] || 0)
  const dLeftoverFinal  = Math.max(0, dYearlyLeftover[iYrs - 1] || 0)
  const aLeftoverFinal  = Math.max(0, aYearlyLeftover[iYrs - 1] || 0)
  const showInvest = (dBudget > 0 || aBudget > 0)

  // Rent & invest comparison: if instead you rented an equivalent place and invested the difference
  const baseRent = (house.beds || 0) <= 1 ? (rent1BR || 0) : (rent2BR || 0)
  const totalBudget = (dBudget || 0) + (aBudget || 0)
  const dBudgetFrac = totalBudget > 0 ? (dBudget || 0) / totalBudget : 0.5
  const aBudgetFrac = 1 - dBudgetFrac
  const utilsTotal2 = (utilities.water || 0) + (utilities.trash || 0) + (utilities.electricity || 0)

  // calcRentAtYear: if rentMoveEvery > 0, reset to market rate every N years
  function calcRentAtYear(y) {
    if (!rentMoveEvery) return baseRent * Math.pow(1 + (rentIncreaseRate || 0) / 100, y)
    const lease = Math.floor((y - 1) / rentMoveEvery)          // which lease period (0-indexed)
    const yearInLease = ((y - 1) % rentMoveEvery) + 1          // year within current lease
    const marketAtLeaseStart = baseRent * Math.pow(1 + (rentMarketGrowth || 0) / 100, lease * rentMoveEvery)
    return marketAtLeaseStart * Math.pow(1 + (rentIncreaseRate || 0) / 100, yearInLease)
  }

  const dRentYearlyInvest = []
  const aRentYearlyInvest = []
  for (let y = 1; y <= iYrs; y++) {
    const rentAtY = calcRentAtYear(y)
    const utilsAtY = utilsTotal2 * Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const totalRentCost = rentAtY + utilsAtY + (rentParking || 0)
    dRentYearlyInvest.push(Math.max(0, (dBudget || 0) - totalRentCost * dBudgetFrac))
    aRentYearlyInvest.push(Math.max(0, (aBudget || 0) - totalRentCost * aBudgetFrac))
  }
  // Lump sum invested = cash not spent on down payment, compounded over iYrs
  const downR = (investRate || 0) / 100
  const dLumpBuy  = Math.max(0, (dCashBudget || 0) - (dDown || 0))  // buy: leftover cash
  const aLumpBuy  = Math.max(0, (aCashBudget || 0) - (aDown || 0))
  const dLumpRent = (dCashBudget || 0)                                // rent: full cash budget invested
  const aLumpRent = (aCashBudget || 0)
  const dLumpBuyFV  = dLumpBuy  * Math.pow(1 + downR, iYrs)
  const aLumpBuyFV  = aLumpBuy  * Math.pow(1 + downR, iYrs)
  const dLumpRentFV = dLumpRent * Math.pow(1 + downR, iYrs)
  const aLumpRentFV = aLumpRent * Math.pow(1 + downR, iYrs)
  const dRentInvestFV = fvVariableAnnuity(dRentYearlyInvest, investRate || 0) + dLumpRentFV
  const aRentInvestFV = fvVariableAnnuity(aRentYearlyInvest, investRate || 0) + aLumpRentFV

  const dInvestFV = dInvestOnly + dSaleBonus + dLumpBuyFV
  const aInvestFV = aInvestOnly + aSaleBonus + aLumpBuyFV

  // ── Retirement calculation ─────────────────────────────────────────────────
  const rY = retireYear || 30
  // Build leftover arrays extended to rY (beyond iYrs if needed)
  const retireLeftoverD = dYearlyLeftover.slice()
  const retireLeftoverA = aYearlyLeftover.slice()
  for (let y = iYrs + 1; y <= rY; y++) {
    const utilFactor = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const projUtils = {
      water:       (utilities.water       || 0) * utilFactor,
      trash:       (utilities.trash       || 0) * utilFactor,
      electricity: (utilities.electricity || 0) * utilFactor,
      waterInHoa:  utilities.waterInHoa,
      trashInHoa:  utilities.trashInHoa,
    }
    const ph = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly:        house.hoaMonthly        * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y),
    }
    if (y > house.loanTermYears) {
      // Loan paid off — only recurring non-PI costs remain
      const utilsOnlyCost = (projUtils.waterInHoa ? 0 : (projUtils.water || 0))
                          + (projUtils.trashInHoa ? 0 : (projUtils.trash || 0))
                          + (projUtils.electricity || 0)
      const nonPiMonthly = ph.propertyTaxAnnual / 12 + ph.hoaMonthly
                         + (house.insuranceMonthly || 0) + utilsOnlyCost
      retireLeftoverD.push(Math.max(0, (dBudget || 0) - nonPiMonthly * (dOwnTarget / 100)))
      retireLeftoverA.push(Math.max(0, (aBudget || 0) - nonPiMonthly * (1 - dOwnTarget / 100)))
    } else {
      const pBase = calcAMonthlyFromOwnership(ph, dDown, aDown, closingCostPct, dOwnTarget, projUtils)
      const pEff  = Math.max(0, pBase + aMonthlyAdj)
      const p     = calcTotalMonthly(ph, dDown, aDown, closingCostPct, pEff, equalizeYears, projUtils)
      retireLeftoverD.push(Math.max(0, (dBudget || 0) - p.dAfterRepay))
      retireLeftoverA.push(Math.max(0, (aBudget || 0) - p.aNetAfter))
    }
  }
  // Lump sum FV at rY
  const dLumpBuyFV_rY = dLumpBuy * Math.pow(1 + downR, rY)
  const aLumpBuyFV_rY = aLumpBuy * Math.pow(1 + downR, rY)
  // House sale proceeds grown to rY (if sell-and-move and sale happens before retirement)
  const retireSaleBonus_d = (sellAndMove && rY >= saleYear)
    ? sale.dProceeds * (r > 0 ? Math.pow(1 + r, (rY - saleYear) * 12) : 1)
    : 0
  const retireSaleBonus_a = (sellAndMove && rY >= saleYear)
    ? sale.aProceeds * (r > 0 ? Math.pow(1 + r, (rY - saleYear) * 12) : 1)
    : 0
  // Total portfolio at rY
  const dPortRetire = fvVariableAnnuity(retireLeftoverD.slice(0, rY), investRate || 0)
                    + dLumpBuyFV_rY + retireSaleBonus_d
  const aPortRetire = fvVariableAnnuity(retireLeftoverA.slice(0, rY), investRate || 0)
                    + aLumpBuyFV_rY + retireSaleBonus_a
  // Monthly withdrawal income
  const dWithdrawal = dPortRetire * ((withdrawalRate || 4) / 100) / 12
  const aWithdrawal = aPortRetire * ((withdrawalRate || 4) / 100) / 12
  // Helper: combined housing cost at an arbitrary year y
  function calcCombinedHousingAtYear(y) {
    if (sellAndMove && y >= saleYear) return 0
    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const pu = {
      water: (utilities.water || 0) * uf, trash: (utilities.trash || 0) * uf,
      electricity: (utilities.electricity || 0) * uf,
      waterInHoa: utilities.waterInHoa, trashInHoa: utilities.trashInHoa,
    }
    const ph = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly:        house.hoaMonthly        * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y),
    }
    if (y > house.loanTermYears) {
      const utilsOnly = (pu.waterInHoa ? 0 : (pu.water || 0))
                      + (pu.trashInHoa ? 0 : (pu.trash || 0))
                      + (pu.electricity || 0)
      return ph.propertyTaxAnnual / 12 + ph.hoaMonthly + (house.insuranceMonthly || 0) + utilsOnly
    }
    const pBase = calcAMonthlyFromOwnership(ph, dDown, aDown, closingCostPct, dOwnTarget, pu)
    const pEff  = Math.max(0, pBase + aMonthlyAdj)
    const p     = calcTotalMonthly(ph, dDown, aDown, closingCostPct, pEff, equalizeYears, pu)
    const inRepay = y <= equalizeYears
    return (inRepay ? p.dDuringRepay : p.dAfterRepay) + (inRepay ? p.aNetDuring : p.aNetAfter)
  }

  const combinedHousingAtRY = calcCombinedHousingAtYear(rY)
  const dHousingAtRY = combinedHousingAtRY * (dOwnTarget / 100)
  const aHousingAtRY = combinedHousingAtRY * (1 - dOwnTarget / 100)
  const dAfterHousing = dWithdrawal - dHousingAtRY
  const aAfterHousing = aWithdrawal - aHousingAtRY

  // Housing + pool balance snapshots: rY then +3, +6 years into retirement
  const combinedPortRetire = dPortRetire + aPortRetire
  const annualWithdrawal   = (dWithdrawal + aWithdrawal) * 12
  const retireAge = (currentAge || 33) + rY
  const maxOffset = Math.max(0, 80 - retireAge)
  const snapOffsets = []
  for (let o = 0; o <= maxOffset; o += 3) snapOffsets.push(o)
  const retireHousingSnaps = snapOffsets.map(offset => {
    const y = rY + offset
    const housing = calcCombinedHousingAtYear(y)
    // Portfolio balance after `offset` years of withdrawals, growing at investRate
    const gr = (investRate || 0) / 100
    const poolRemaining = gr > 0
      ? combinedPortRetire * Math.pow(1 + gr, offset) - annualWithdrawal * (Math.pow(1 + gr, offset) - 1) / gr
      : combinedPortRetire - annualWithdrawal * offset
    return { y, housing, poolRemaining }
  })
  const rentBaseRentYr1 = calcRentAtYear(1)
  const rentBaseRentFinal = calcRentAtYear(iYrs)

  // Cumulative investment-only value at each 3-year snapshot (no house sale — that's shown separately)
  const investSnapshots = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30].filter(y => y <= iYrs).map(snapY => ({
    y: snapY,
    dFV: fvVariableAnnuity(dYearlyLeftover.slice(0, snapY), investRate || 0),
    aFV: fvVariableAnnuity(aYearlyLeftover.slice(0, snapY), investRate || 0),
    isSaleYear: sellAndMove && snapY >= saleYear && (snapY - saleYear) < 3,
  }))

  // Projected monthly costs every 3 years (compounded tax & HOA)
  const costIncreaseVisible = taxIncreasePct > 0 || hoaIncreasePct > 0
  const projYears = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30].filter(y => y <= Math.min(saleYear, house.loanTermYears))
  const projRows = costIncreaseVisible ? projYears.map(y => {
    const utilFactor = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const projUtils = {
      water: (utilities.water || 0) * utilFactor,
      trash: (utilities.trash || 0) * utilFactor,
      electricity: (utilities.electricity || 0) * utilFactor,
    }
    const ph = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly: house.hoaMonthly * Math.pow(1 + (hoaIncreasePct || 0) / 100, y),
    }
    const pBase = calcAMonthlyFromOwnership(ph, dDown, aDown, closingCostPct, dOwnTarget, projUtils)
    const pEff = Math.max(0, pBase + aMonthlyAdj)
    const p = calcTotalMonthly(ph, dDown, aDown, closingCostPct, pEff, equalizeYears, projUtils)
    const inRepay = y <= equalizeYears
    return { y, dNet: inRepay ? p.dDuringRepay : p.dAfterRepay, aNet: inRepay ? p.aNetDuring : p.aNetAfter, total: p.total }
  }) : []

  const breakdownItems = [
    { label: 'Principal & Interest', value: pi,         color: '#6366f1' },
    { label: 'Property Tax',         value: tax,        color: '#f59e0b' },
    { label: 'HOA',                  value: hoa,        color: '#10b981' },
    { label: 'Insurance',            value: insurance,  color: '#3b82f6' },
    { label: 'Utilities',            value: utilsTotal, color: '#64748b' },
  ].filter(i => i.value > 0)

  const toured = !!house.toured
  const skip   = !!house.skip

  return (
    <div className={`house-card${skip ? ' card-skipped' : ''}`}>
      <div className="card-image-wrap">
        {house.imageUrl
          ? <img src={house.imageUrl} alt={house.nickname} className="card-image" />
          : <div className="card-image-placeholder"><span>🏠</span></div>
        }
        <div className="card-status-badges">
          {toured && <span className="card-status-badge toured">✅ Toured</span>}
          {skip   && <span className="card-status-badge skip">🚫 Skip</span>}
        </div>
        <div className="card-image-actions">
          <button className="icon-btn" onClick={onEdit} title="Edit">✏️</button>
          {confirmDelete ? (
            <>
              <button className="icon-btn danger" onClick={handleDelete} disabled={deleting} title="Confirm delete">
                {deleting ? <span className="card-spinner" /> : '✓'}
              </button>
              <button className="icon-btn" onClick={() => setConfirmDelete(false)} title="Cancel">✕</button>
            </>
          ) : (
            <button className="icon-btn danger" onClick={() => setConfirmDelete(true)} title="Delete">🗑️</button>
          )}
        </div>
        <div className="card-status-actions">
          <button
            className={`status-btn toured${toured ? ' active' : ''}`}
            onClick={() => onStatusChange({ toured: !toured, skip })}
          >✅ Toured</button>
          <button
            className={`status-btn skip${skip ? ' active' : ''}`}
            onClick={() => onStatusChange({ toured, skip: !skip })}
          >🚫 Skip</button>
        </div>
        <div className="card-price-badge">{fmt(house.price)}</div>
      </div>

      <div className="card-body">
        <p className="card-address">{house.address}</p>
        <div className="card-meta-row">
          <div className="card-meta">
            {house.beds  && <span>{house.beds} bd</span>}
            {house.baths && <span>{house.baths} ba</span>}
            {house.sqft  && <span>{house.sqft.toLocaleString()} sqft</span>}
          </div>
          {house.link && (
            <a className="card-link" href={house.link} target="_blank" rel="noopener noreferrer">View ↗</a>
          )}
        </div>

        {/* Total */}
        <div className="card-total">
          <div className="total-label">Total Monthly</div>
          <div className="total-amount">{fmt(total)}</div>
          <div className="total-sub">/month</div>
        </div>

        {/* During repayment */}
        <div className="split-phase-label">During repayment <span className="phase-tag">Yr 1–{equalizeYears}</span></div>
        <div className="split-section">
          <div className="split-card d-card">
            <div className="split-avatar d-avatar">D</div>
            <div className="split-info">
              <div className="split-name">Net Monthly</div>
              <div className="split-amount">{fmt(dDuringRepay)}</div>
              <div className="split-sub">incl. {fmt(equalMonthly)}/mo repayment to A</div>
            </div>
          </div>
          <div className="split-card a-card">
            <div className="split-avatar a-avatar">A</div>
            <div className="split-info">
              <div className="split-name">Net Monthly</div>
              <div className="split-amount">
                {aNetDuring >= 0 ? fmt(aNetDuring) : <span style={{ color: '#10b981' }}>+{fmt(-aNetDuring)}/mo net gain</span>}
              </div>
              <div className="split-sub">after {fmt(equalMonthly)}/mo received from D</div>
            </div>
          </div>
        </div>

        {/* After repayment — only shown if repayment ends before loan does AND before sale */}
        {equalizeYears < house.loanTermYears && saleYear > equalizeYears && <>
        <div className="split-phase-label after">After repayment <span className="phase-tag after-tag">Yr {equalizeYears + 1}+</span></div>
        <div className="split-section">
          <div className="split-card d-card-after">
            <div className="split-avatar d-avatar">D</div>
            <div className="split-info">
              <div className="split-name">Net Monthly</div>
              <div className="split-amount after-amount">{fmt(dAfterRepay)}</div>
              <div className="split-sub">no more repayment to A</div>
            </div>
          </div>
          <div className="split-card a-card-after">
            <div className="split-avatar a-avatar">A</div>
            <div className="split-info">
              <div className="split-name">Net Monthly</div>
              <div className="split-amount after-amount">{fmt(aNetAfter)}</div>
              <div className="split-sub">unchanged forever</div>
            </div>
          </div>
        </div>
        </>}

        {/* Cost progression every 3 years */}
        {costIncreaseVisible && (
          <div className="cost-projection">
            <div className="cost-proj-title">Monthly net (with {taxIncreasePct}% tax / {hoaIncreasePct}% HOA annual increase)</div>
            <div className="cost-proj-header">
              <span>Year</span><span className="d-color">D</span><span className="a-color">A</span>
            </div>
            {projRows.map(r => (
              <div key={r.y} className="cost-proj-row">
                <span>Yr {r.y}</span>
                <span className="d-color">{fmt(r.dNet)}</span>
                <span className="a-color">{fmt(r.aNet)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ownership */}
        <div className="ownership-section">
          <div className="own-row-label">
            Ongoing (full {house.loanTermYears} yr)
            <span className="own-drag-hint">drag to adjust</span>
          </div>
          <div className="ownership-label-row">
            <span className="own-label d-color-text">D {dOwn.toFixed(1)}%</span>
            <span className="own-label a-color-text">A {aOwn.toFixed(1)}%</span>
          </div>
          <div className="own-slider-wrap">
            <div className="ownership-bar">
              <div className="own-fill-d" style={{ width: `${dOwn}%` }} />
              <div className="own-fill-a" style={{ width: `${aOwn}%` }} />
            </div>
            <input
              type="range"
              className="own-slider"
              style={{ '--d-pct': `${dOwnTarget}%` }}
              min={0} max={100} step={0.5}
              value={dOwnTarget}
              onChange={e => {
                const raw = parseFloat(e.target.value)
                const snapped = Math.abs(raw - 50) <= 1.5 ? 50 : raw
                setDOwnTarget(snapped)
              }}
            />
          </div>

          <div className="own-row-label" style={{ marginTop: 10 }}>
            If sold at {saleYear === 30 ? 'yr 30' : `yr ${saleYear}`}
          </div>
          <div className="ownership-label-row">
            <span className="own-label d-color-text">D {sale.dOwnAtSale.toFixed(1)}%</span>
            <span className="own-label a-color-text">A {sale.aOwnAtSale.toFixed(1)}%</span>
          </div>
          <div className="ownership-bar">
            <div className="own-fill-d" style={{ width: `${sale.dOwnAtSale}%` }} />
            <div className="own-fill-a" style={{ width: `${sale.aOwnAtSale}%` }} />
          </div>
        </div>

        {/* Breakdown */}
        <div className="card-breakdown">
          {breakdownItems.map(item => (
            <div key={item.label} className="breakdown-row">
              <div className="breakdown-left">
                <span className="breakdown-dot" style={{ background: item.color }} />
                <span className="breakdown-label">{item.label}</span>
              </div>
              <span className="breakdown-value">{fmt(item.value)}</span>
            </div>
          ))}
        </div>

        <div className="card-divider" />

        {/* Down payment details */}
        <div className="card-loan-details">
          <div className="loan-row">
            <span>D puts in</span>
            <span className="d-color-text">{fmt(dDown)}</span>
          </div>
          <div className="loan-row">
            <span>A puts in</span>
            <span className="a-color-text">{fmt(aDown)}</span>
          </div>
          <div className="loan-row closing-row">
            <span>− Closing Costs ({closingCostPct}%)</span>
            <span className="closing-val">−{fmt(closingCosts)}</span>
          </div>
          <div className="loan-row highlight-row">
            <span>= Loan Down ({actualDownPct.toFixed(1)}%)</span>
            <span>{fmt(actualDownPmt)}</span>
          </div>
          <div className="loan-row">
            <span>Loan Amount</span>
            <span>{fmt(loanAmount)}</span>
          </div>
          <div className="loan-row">
            <span>D repays A over {equalizeYears} yr</span>
            <span>{fmt(aOverpaid)} total</span>
          </div>
          <div className="loan-row">
            <span>Rate / Term</span>
            <span>{house.interestRate}% · {house.loanTermYears} yr</span>
          </div>
        </div>

        <div className="card-divider" />

        {/* Sale calculator */}
        {retireMode === 'elsewhere' && <div className="sale-section">
          <div className="sale-title">
            {saleYear === 30 ? 'At end of loan' : `If sold at Year ${saleYear}`}
          </div>
          <div className="sale-row">
            <span>Sale Price {appreciationPct > 0 ? `(${appreciationPct}%/yr)` : '(no appreciation)'}</span>
            <span>{fmt(appreciatedPrice)}</span>
          </div>
          <div className="sale-row">
            <span>− Remaining Loan</span>
            <span className="neg">{fmt(sale.remainingLoan)}</span>
          </div>
          <div className="sale-row">
            <span>− Selling Costs (~6%)</span>
            <span className="neg">{fmt(sale.sellingCosts)}</span>
          </div>
          <div className="sale-row total-row">
            <span>Net Proceeds</span>
            <span>{fmt(sale.netProceeds)}</span>
          </div>
          <div className="sale-split">
            <div className="sale-person d-sale">
              <div className="sale-person-label">D — {sale.dOwnAtSale.toFixed(1)}% equity</div>
              <div className="sale-person-amt">{fmt(sale.dEquityProceeds)}</div>
              {sale.equalUnpaid > 0 && <>
                <div className="sale-person-sub">− unpaid repayment to A</div>
                <div className="sale-person-sub neg">{fmt(-sale.equalUnpaid)}</div>
                <div className="sale-person-total">{fmt(sale.dProceeds)}</div>
              </>}
            </div>
            <div className="sale-person a-sale">
              <div className="sale-person-label">A — {sale.aOwnAtSale.toFixed(1)}% equity</div>
              <div className="sale-person-amt">{fmt(sale.aEquityProceeds)}</div>
              {sale.equalUnpaid > 0 && <>
                <div className="sale-person-sub">+ D's unpaid repayment</div>
                <div className="sale-person-sub pos">{fmt(sale.equalUnpaid)}</div>
                <div className="sale-person-total">{fmt(sale.aProceeds)}</div>
              </>}
            </div>
          </div>
          {sale.equalUnpaid > 0 && (
            <div className="sale-note">
              D's unpaid repayment ({fmt(sale.equalUnpaid)}) deducted from his proceeds at closing — no lump sum, no ongoing payments
            </div>
          )}
        </div>}

        {/* Investment savings section */}
        {showInvest && (
          <div className="invest-section">
            <div className="invest-title">
              {retireMode === 'elsewhere' ? '✈ Sell & move' : retireMode === 'rent' ? '🏘 Rent & move' : '🏠 Stay'} — Yr {iYrs} ({investRate}% return)
            </div>
            <div className="invest-sub">
              Leftover invested monthly{sellAndMove ? ` + sale at Yr ${saleYear}` : rentOut ? ` · rent out from Yr ${rentMoveOutYear}` : ''}
            </div>
            <div className="invest-snapshots">
              <button className="snap-toggle-btn" onClick={onToggleSnapshots}>
                {snapshotsExpanded ? '▾ Hide' : '▸ Show'} year-by-year
              </button>
              {snapshotsExpanded && investSnapshots.map(s => {
                const dSavesAt = Math.max(0, dYearlyLeftover[s.y - 1] || 0)
                const aSavesAt = Math.max(0, aYearlyLeftover[s.y - 1] || 0)
                return (
                  <div key={s.y} className={`invest-snap-detail${s.isSaleYear ? ' sale-inject' : ''}`}>
                    <div className="rvd-header">
                      <span className="rvd-year">Yr {s.y}{s.isSaleYear ? ' 🏷' : ''}</span>
                      <span className="rvd-rent-tag">
                        {s.isSaleYear && sellAndMove ? 'House sold this year' : ''}
                      </span>
                    </div>
                    <div className="rvd-person-row">
                      <span className="d-color rvd-who">D</span>
                      <span className="rvd-item">saves <strong>{dSavesAt > 0 ? `${fmt(dSavesAt)}/mo` : '—'}</strong></span>
                      <span className="rvd-item">portfolio <strong className="d-color">{fmt(s.dFV)}</strong></span>
                    </div>
                    <div className="rvd-person-row">
                      <span className="a-color rvd-who">A</span>
                      <span className="rvd-item">saves <strong>{aSavesAt > 0 ? `${fmt(aSavesAt)}/mo` : '—'}</strong></span>
                      <span className="rvd-item">portfolio <strong className="a-color">{fmt(s.aFV)}</strong></span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="invest-pool-breakdown">
              <div className="invest-pool-row">
                <span>Monthly savings (Yr {iYrs})</span>
                <span className="d-color">{fmt(dInvestOnly)}</span>
                <span className="a-color">{fmt(aInvestOnly)}</span>
              </div>
              {(dLumpBuyFV > 0 || aLumpBuyFV > 0) && (
                <div className="invest-pool-row">
                  <span>+ Uninvested cash ({fmt(dLumpBuy)} / {fmt(aLumpBuy)})</span>
                  <span className="d-color">+{fmt(dLumpBuyFV)}</span>
                  <span className="a-color">+{fmt(aLumpBuyFV)}</span>
                </div>
              )}
              {sellAndMove && (
                <div className="invest-pool-row">
                  <span>+ Sale proceeds (Yr {saleYear}{iYrs > saleYear ? `→${iYrs}` : ''})</span>
                  <span className="d-color">+{fmt(dSaleBonus)}</span>
                  <span className="a-color">+{fmt(aSaleBonus)}</span>
                </div>
              )}
              <div className="invest-pool-row invest-pool-total">
                <span>= Total pool</span>
                <span className="d-color">{fmt(dInvestFV)}</span>
                <span className="a-color">{fmt(aInvestFV)}</span>
              </div>
              <div className="invest-combined">
                Combined {fmt(dInvestFV + aInvestFV)}
              </div>
              {rentOut && (
                <div className="invest-equity-note">
                  + House still owned (move-out Yr {rentMoveOutYear}) — est. value {fmt(houseValueAtEnd)} · D {fmt(dHouseEquity)} · A {fmt(aHouseEquity)} — not in pool
                </div>
              )}
            </div>

            <div className="rent-vs-buy">
              <div className="rent-vs-title">
                vs. Rent &amp; Invest ({house.beds <= 1 ? '1BR' : '2BR'}, {fmt(rentBaseRentYr1 + (rentParking||0) + utilsTotal2)}→{fmt(rentBaseRentFinal + (rentParking||0) + utilsTotal2)}/mo{rentMoveEvery ? `, move every ${rentMoveEvery} yr` : ''})
              </div>
              <button className="snap-toggle-btn" onClick={onToggleSnapshots}>
                {snapshotsExpanded ? '▾ Hide' : '▸ Show'} year-by-year
              </button>
              <div className="rent-vs-grid">
                {snapshotsExpanded && [3,6,9,12,15,18,21,24,27,30].filter(y => y <= iYrs).map(snapY => {
                  const rentAtSnap = calcRentAtYear(snapY)
                  const utilsAtSnap = utilsTotal2 * Math.pow(1 + (utilIncreaseRate || 0) / 100, snapY)
                  const totalAtSnap = rentAtSnap + utilsAtSnap + (rentParking || 0)
                  const dSavesAtSnap = dRentYearlyInvest[snapY - 1] || 0
                  const aSavesAtSnap = aRentYearlyInvest[snapY - 1] || 0
                  const dFVAtSnap = fvVariableAnnuity(dRentYearlyInvest.slice(0, snapY), investRate || 0)
                  const aFVAtSnap = fvVariableAnnuity(aRentYearlyInvest.slice(0, snapY), investRate || 0)
                  return (
                    <div key={snapY} className="rent-vs-detail">
                      <div className="rvd-header">
                        <span className="rvd-year">Yr {snapY}</span>
                      </div>
                      <div className="rvd-cost-line">
                        {fmt(rentAtSnap)} rent
                        {utilsAtSnap > 0 ? ` · ${fmt(utilsAtSnap)} utils` : ''}
                        {(rentParking || 0) > 0 ? ` · ${fmt(rentParking)} park` : ''}
                        {' = '}<strong>{fmt(totalAtSnap)}/mo</strong>
                      </div>
                      <div className="rvd-person-row">
                        <span className="d-color rvd-who">D</span>
                        <span className="rvd-item">saves <strong>{dSavesAtSnap > 0 ? `${fmt(dSavesAtSnap)}/mo` : '—'}</strong></span>
                        <span className="rvd-item">portfolio <strong className="d-color">{fmt(dFVAtSnap)}</strong></span>
                      </div>
                      <div className="rvd-person-row">
                        <span className="a-color rvd-who">A</span>
                        <span className="rvd-item">saves <strong>{aSavesAtSnap > 0 ? `${fmt(aSavesAtSnap)}/mo` : '—'}</strong></span>
                        <span className="rvd-item">portfolio <strong className="a-color">{fmt(aFVAtSnap)}</strong></span>
                      </div>
                    </div>
                  )
                })}
                <div className="rent-vs-total">
                  <span>Total Yr {iYrs}</span>
                  <span className="d-color">D {fmt(dRentInvestFV)}</span>
                  <span className="a-color">A {fmt(aRentInvestFV)}</span>
                </div>
              </div>
              <div className="rent-vs-verdict">
                Combined pool {fmt(dRentInvestFV + aRentInvestFV)}
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginTop: 2 }}>
                  incl. full cash invested (D {fmt(dLumpRentFV)} · A {fmt(aLumpRentFV)})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Retirement snapshot */}
        {showInvest && (
          <div className="retire-section">
            <div className="retire-title">
              🏖 Retire at Yr {rY} · Age {retireAge}
              <span className="retire-params">{withdrawalRate}% withdrawal · {inflationRate}% inflation</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Combined portfolio</span>
              <span className="retire-val">{fmt(dPortRetire + aPortRetire)}</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Withdraws ({withdrawalRate}%/yr)</span>
              <span className="retire-val">{fmt(dWithdrawal + aWithdrawal)}/mo</span>
            </div>
            <div className="retire-snap-header">Housing over time</div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>After housing</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, housing, poolRemaining }) => {
                const monthlyWithdrawal = dWithdrawal + aWithdrawal
                const afterHousing = monthlyWithdrawal - housing
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const poolReal = poolRemaining / inflFactorY
                const afterHousingReal = afterHousing / inflFactorY
                return (
                  <div key={y} className="retire-housing-snap-row">
                    <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                    <span className="retire-val">{fmt(housing)}/mo</span>
                    <span className={`retire-pool-stack ${afterHousing < 0 ? 'retire-pool-empty' : ''}`}>
                      <span className={`retire-val ${afterHousing < 0 ? 'retire-pool-empty' : 'retire-surplus'}`}>
                        {afterHousing >= 0 ? `+${fmt(afterHousing)}/mo` : `${fmt(afterHousing)}/mo`}
                      </span>
                      <span className="retire-pool-real">
                        {afterHousingReal >= 0 ? `+${fmt(afterHousingReal)}` : fmt(afterHousingReal)} today
                      </span>
                    </span>
                    <span className="retire-pool-stack">
                      {poolRemaining >= 0 ? (
                        <>
                          <span className="retire-val">{fmt(poolRemaining)}</span>
                          <span className="retire-pool-real">{fmt(poolReal)} today</span>
                        </>
                      ) : <span className="retire-pool-empty">Depleted</span>}
                    </span>
                  </div>
                )
              })}
            </div>
            {(sellAndMove && rY >= saleYear)
              ? <div className="retire-note">House sold at Yr {saleYear} — no housing cost, sale proceeds in portfolio</div>
              : rY > house.loanTermYears
                ? <div className="retire-note">Mortgage paid off at Yr {house.loanTermYears} — no P&I, only HOA + tax + utils</div>
                : null
            }
          </div>
        )}

        {house.notes && (
          <>
            <div className="card-divider" />
            <p className="card-notes">{house.notes}</p>
          </>
        )}
      </div>
    </div>
  )
}
