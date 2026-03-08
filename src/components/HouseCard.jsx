import { useState } from 'react'
import { calcTotalMonthly, calcSaleProceeds, calcAMonthlyFromOwnership, calcRemainingBalance, calcMonthlyPI, fmt } from '../utils/mortgage'
import './HouseCard.css'

// FV of variable annual monthly contributions, each grown to end of investYears
// yearlyPmts[i] = monthly contribution during year i+1
function fvVariableAnnuity(yearlyPmts, annualRatePct) {
  const r = annualRatePct / 100 / 12
  const n = yearlyPmts.length
  let fv = 0
  for (let y = 0; y < n; y++) {
    const pmt = yearlyPmts[y]  // negative = pool draw/withdrawal
    if (pmt === 0) continue
    // FV of 12 monthly payments made during year y+1, grown to end of period
    const fvYear = r > 0 ? pmt * (Math.pow(1 + r, 12) - 1) / r : pmt * 12
    const remainingMonths = (n - y - 1) * 12
    fv += fvYear * (r > 0 ? Math.pow(1 + r, remainingMonths) : 1)
  }
  return fv
}

export default function HouseCard({ house, dCashBudget, aCashBudget, dDown, aDown, closingCostPct, aMonthlyAdj, equalizeYears, saleYear, appreciationPct, taxIncreasePct, hoaIncreasePct, insuranceIncreasePct, refiYear, refiRate, refiTermYears, dBudget, aBudget, aBudgetIncrease, dIncome, aIncome, investRate, hysaRate, retireMode, rentYield, rent1BR, rent2BR, rentUpgradeTo2BR, rentIncreaseRate, rentMoveEvery, rentMarketGrowth, rentParking, utilities, rentUtilities, utilIncreaseRate, retireYear, retireMaxAge, capitalGainsTaxPct, primaryResidenceExclusion, rentalIncomeTaxPct, dSS, aSS, ssClaimAge, careStartAge, careMonthlyStay, careMonthlyRelocateUS, careMonthlyOverseas, jobLossMonths, jobLossYear, jobLossPerson, inflationRate, spendInflationRate, currentAge, spendingCap, aSpendingCap, overseasCost, overseasSpendingCap, overseasRentIncrease, usRentalIncrease, colRatio, maintenancePct, relocateMonthlyCost, relocateBuyPrice, relocateBuyDownPct, relocateMortgageRate, rentvestPrice, rentvestDown, rentvestMortgageRate, rentvestRent, rentvestRentGrowth, rentvestMgmtFee, snapshotsExpanded, onToggleSnapshots, onEdit, onDelete, onStatusChange, onUpdateField }) {
  const [dOwnTarget, setDOwnTarget] = useState(50)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [renoEditing, setRenoEditing] = useState(false)
  const [renoInput, setRenoInput] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesInput, setNotesInput] = useState(house.notes || '')
  const [rentOverrideInput, setRentOverrideInput] = useState(String(house.monthlyRent || ''))
  const [sellPriceInput, setSellPriceInput] = useState(String(house.expectedSalePrice || ''))

  // Townhomes include water & trash in HOA — override the global utility flags per-card
  const effectiveUtilities = utilities

  async function handleDelete() {
    setDeleting(true)
    try { await onDelete() } finally { setDeleting(false) }
  }

  const baseAMonthly = calcAMonthlyFromOwnership(house, dDown, aDown, closingCostPct, dOwnTarget, effectiveUtilities)
  const effectiveAMonthly = Math.max(0, baseAMonthly + aMonthlyAdj)

  const {
    pi, tax, hoa, insurance, utilsTotal, total,
    totalCash, closingCosts, actualDownPmt, loanAmount, actualDownPct,
    aMonthly, dMonthly, equalMonthly, aOverpaid,
    dDuringRepay, dAfterRepay, aNetDuring, aNetAfter,
    aOwn, dOwn,
  } = calcTotalMonthly(house, dDown, aDown, closingCostPct, effectiveAMonthly, equalizeYears, effectiveUtilities)

  const appreciatedPrice = house.price * Math.pow(1 + (appreciationPct || 0) / 100, saleYear)
  const sale = calcSaleProceeds(house, dDown, aDown, closingCostPct, effectiveAMonthly, equalizeYears, saleYear, appreciatedPrice, effectiveUtilities)

  // Maintenance applies only when HOA = 0 (single-family / no HOA homes)
  const baseMaintenanceMonthly = house.hoaMonthly === 0
    ? (house.price * (maintenancePct || 0)) / 100 / 12
    : 0
  // Inflate maintenance at the same rate as general inflation
  const maintAtYear = y => baseMaintenanceMonthly * Math.pow(1 + (inflationRate || 3) / 100, y)

  // Traditional 401k tax savings boost: pre-tax contributions reduce current taxes,

  // Refinance helpers — must be defined before any per-year loops
  const hasRefi = (refiYear || 0) > 0
  const renoLoanAdder = house.renovationBudget || 0
  const originalLoanAmount = Math.max(0, house.price - Math.max(0, (dDown + aDown) - house.price * (closingCostPct / 100)) + renoLoanAdder)
  const refiLoanAmount = hasRefi
    ? calcRemainingBalance(originalLoanAmount, house.interestRate, house.loanTermYears, (refiYear || 0) * 12)
    : 0
  // refiTermYears === 0 means "remaining term" = original loan term minus refi year
  const resolvedRefiTerm = (refiTermYears === 0)
    ? Math.max(1, house.loanTermYears - (refiYear || 0))
    : (refiTermYears || 30)
  const effectivePaidOffYear = hasRefi
    ? (refiYear || 0) + resolvedRefiTerm
    : house.loanTermYears
  function applyRefi(ph, y) {
    if (!hasRefi || y < (refiYear || 0)) return ph
    const actualDownPmt = Math.max(0, (dDown + aDown) - house.price * (closingCostPct / 100))
    return {
      ...ph,
      price: refiLoanAmount + actualDownPmt,
      interestRate: refiRate || 5,
      loanTermYears: resolvedRefiTerm,
    }
  }

  // Investment savings: year-by-year leftover with compounding HOA/tax, invested at investRate%
  const iYrs = retireYear || 30
  const dYearlyLeftover = []
  const aYearlyLeftover = []
  // 3-bucket sub-arrays: Roth, Traditional 401k, Taxable Brokerage
  const dYearlyRoth = []
  const dYearlyTrad = []
  const dYearlyBrokerage = []
  const aYearlyRoth = []
  const aYearlyTrad = []
  const aYearlyBrokerage = []
  // Roth contribution caps — IRS max $583/mo per person (no backdoor by default)
  const dRothCap = 583
  const aRothCap = 583
  // Trad 401k allocation: $0 — all leftover after Roth goes to brokerage (accessible, taxed on gains)
  const dTradFixed = 0
  const aTradFixed = 0
  // Running balances for overage coverage
  let dRothContribBalance = 0   // contributions only (penalty-free withdrawal amount)
  let dRothTotalBalance = 0     // contributions + earnings (actual account value)
  let dBrokerageBalance = 0
  let dBrokerageBasis = 0       // cost basis (principal put in, tax-free to withdraw)
  let aRothContribBalance = 0
  let aRothTotalBalance = 0
  let aBrokerageBalance = 0
  let aBrokerageBasis = 0
  // HYSA bucket: funded by full income surplus (income - budget - spendingCap), liquid savings
  let dHYSABalance = 0
  let aHYSABalance = 0
  // Uninvested cash (leftover after down payment) — grows at investRate, tracked year-by-year
  const dLumpInit = Math.max(0, (dCashBudget || 0) - (dDown || 0))
  const aLumpInit = Math.max(0, (aCashBudget || 0) - (aDown || 0))
  let dLumpBalance = dLumpInit
  let aLumpBalance = aLumpInit
  let dLumpBasis   = dLumpInit   // cost basis stays fixed (original principal)
  let aLumpBasis   = aLumpInit
  let lockedDrawRequired = false
  let lockedDrawFirstYear = null
  // Per-year bucket balance snapshots (after any overage draws)
  const dBucketSnapshots = []
  const aBucketSnapshots = []

  for (let y = 1; y <= iYrs; y++) {
    const utilFactor = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const projUtils = {
      water: (effectiveUtilities.water || 0) * utilFactor,
      trash: (effectiveUtilities.trash || 0) * utilFactor,
      electricity: (effectiveUtilities.electricity || 0) * utilFactor,
      waterInHoa: effectiveUtilities.waterInHoa,
      trashInHoa: effectiveUtilities.trashInHoa,
    }
    const phBase = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly:        house.hoaMonthly * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y) + maintAtYear(y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
    }
    const ph = y > effectivePaidOffYear ? phBase : applyRefi(phBase, y)
    const pBase = calcAMonthlyFromOwnership(ph, dDown, aDown, closingCostPct, dOwnTarget, projUtils)
    const pEff  = Math.max(0, pBase + aMonthlyAdj)
    const p     = calcTotalMonthly(ph, dDown, aDown, closingCostPct, pEff, equalizeYears, projUtils)
    const inRepay = y <= equalizeYears
    const dCost = y > effectivePaidOffYear
      ? (p.tax + p.hoa + p.insurance + p.utilsTotal) * (dOwnTarget / 100)
      : (inRepay ? p.dDuringRepay : p.dAfterRepay)
    const aCost = y > effectivePaidOffYear
      ? (p.tax + p.hoa + p.insurance + p.utilsTotal) * (1 - dOwnTarget / 100)
      : (inRepay ? p.aNetDuring   : p.aNetAfter)
    const dLeftover = (dBudget || 0) - dCost
    const aLeftover = (aBudget || 0) - aCost
    dYearlyLeftover.push(dLeftover)
    aYearlyLeftover.push(aLeftover)

    // Split into buckets — allocate Roth first (IRS max), rest to brokerage
    const dRothAlloc     = Math.min(dRothCap, Math.max(0, dLeftover))
    const dTradAlloc     = Math.min(dTradFixed, Math.max(0, dLeftover - dRothAlloc))
    const dBrokerageAlloc = Math.max(0, dLeftover - dRothAlloc - dTradAlloc)
    const aRothAlloc     = Math.min(aRothCap, Math.max(0, aLeftover))
    const aTradAlloc     = Math.min(aTradFixed, Math.max(0, aLeftover - aRothAlloc))
    const aBrokerageAlloc = Math.max(0, aLeftover - aRothAlloc - aTradAlloc)
    dYearlyRoth.push(dRothAlloc)
    dYearlyTrad.push(dTradAlloc)
    dYearlyBrokerage.push(dBrokerageAlloc)
    aYearlyRoth.push(aRothAlloc)
    aYearlyTrad.push(aTradAlloc)
    aYearlyBrokerage.push(aBrokerageAlloc)

    // Track Roth contribution balances (contributions only, not earnings)
    dRothContribBalance += dRothAlloc * 12
    aRothContribBalance += aRothAlloc * 12
    // Compound Roth total balances (contributions + earnings)
    const gr = (investRate || 0) / 100
    dRothTotalBalance = dRothTotalBalance * (1 + gr) + dRothAlloc * 12
    aRothTotalBalance = aRothTotalBalance * (1 + gr) + aRothAlloc * 12
    // Compound brokerage balances (basis grows by contributions only, not gains)
    dBrokerageBalance = dBrokerageBalance * (1 + gr) + dBrokerageAlloc * 12
    dBrokerageBasis += dBrokerageAlloc * 12
    aBrokerageBalance = aBrokerageBalance * (1 + gr) + aBrokerageAlloc * 12
    aBrokerageBasis += aBrokerageAlloc * 12
    // Compound HYSA balances — contribution is what's truly left after budget AND inflation-grown spend
    const hysaGr = (hysaRate || 3) / 100
    const dSpendInflFactor = Math.pow(1 + (spendInflationRate || 3) / 100, y)
    const dSpendNominal = (spendingCap || 0) * dSpendInflFactor
    const aSpendInflFactor = Math.pow(1 + (spendInflationRate || 3) / 100, y)
    const aSpendNominal = (aSpendingCap || 0) * aSpendInflFactor
    // Income after budget and after inflation-grown spend = true HYSA surplus
    const dHYSAMonthly = Math.max(0, (dIncome || 0) - (dBudget || 0) - dSpendNominal)
    const aHYSAMonthly = Math.max(0, (aIncome || 0) - (aBudget || 0) - aSpendNominal)
    dHYSABalance = dHYSABalance * (1 + hysaGr) + dHYSAMonthly * 12
    aHYSABalance = aHYSABalance * (1 + hysaGr) + aHYSAMonthly * 12
    // Compound uninvested cash at investRate
    dLumpBalance = dLumpBalance * (1 + gr)
    aLumpBalance = aLumpBalance * (1 + gr)

    // Handle housing overages: draw from liquid buckets in priority order
    // If A runs out, spillover comes from D's buckets (shared household)
    const ageAtY = (currentAge || 33) + y
    const rothGainsUnlocked = ageAtY >= 59.5
    const dGap = dLeftover < 0 ? Math.abs(dLeftover) * 12 : 0
    const aGap = aLeftover < 0 ? Math.abs(aLeftover) * 12 : 0
    // Capture pre-housing-draw balances for display clarity
    const dRothContribPreHousing = dRothContribBalance
    const dRothGainsPreHousing   = Math.max(0, dRothTotalBalance - dRothContribBalance)
    const dBrkGainsPreHousing    = Math.max(0, dBrokerageBalance - dBrokerageBasis)
    const dBrkPrincipalPreHousing = dBrokerageBasis
    let dDrawFromRoth = 0, dDrawFromBrokerage = 0, dDrawTax = 0, dBrkPrincipalDraw = 0, dBrkGainsDraw = 0
    let dDrawFromRothGains = 0, dDrawFromLump = 0
    let aDrawFromRoth = 0, aDrawFromBrokerage = 0, aDrawTax = 0, aBrkPrincipalDraw = 0, aBrkGainsDraw = 0
    let aSpillFromDRoth = 0, aSpillFromDBrokerage = 0, aSpillDTax = 0
    let aSpillFromDLump = 0, aSpillFromDRothGains = 0
    let dSpillCashOffset = 0  // D's cash leftover applied toward A's gap before touching D's buckets
    let dRothReductionForSpill = 0, dBrkReductionForSpill = 0

    const drawFromBuckets = (gap, isD) => {
      // Returns { fromRoth, fromRothGains, fromBrokerage, brkPrincipalDraw, brkGainsDraw, fromLump, tax, remaining }
      let remaining = gap
      let fromRoth = 0, fromRothGains = 0, fromBrokerage = 0, brkPrincipalDraw = 0, brkGainsDraw = 0, fromLump = 0, tax = 0

      // 1st: Roth contributions (tax-free, no penalty at any age)
      const rothContribBal = isD ? dRothContribBalance : aRothContribBalance
      fromRoth = Math.min(rothContribBal, remaining)
      remaining -= fromRoth
      if (isD) { dRothContribBalance -= fromRoth; dRothTotalBalance -= fromRoth }
      else     { aRothContribBalance -= fromRoth; aRothTotalBalance -= fromRoth }

      // 2nd: Brokerage — principal first (no tax), then gains (cap gains tax)
      const brkBal   = isD ? dBrokerageBalance : aBrokerageBalance
      const brkBasis = isD ? dBrokerageBasis   : aBrokerageBasis
      if (remaining > 0 && brkBal > 0) {
        const actualDraw = Math.min(brkBal, remaining)
        brkPrincipalDraw = Math.min(brkBasis, actualDraw)
        brkGainsDraw     = actualDraw - brkPrincipalDraw
        tax += brkGainsDraw * (capitalGainsTaxPct || 0) / 100
        fromBrokerage = actualDraw
        remaining = Math.max(0, remaining - actualDraw)
        if (isD) {
          dBrokerageBalance = Math.max(0, dBrokerageBalance - actualDraw)
          dBrokerageBasis   = Math.max(0, dBrokerageBasis   - brkPrincipalDraw)
        } else {
          aBrokerageBalance = Math.max(0, aBrokerageBalance - actualDraw)
          aBrokerageBasis   = Math.max(0, aBrokerageBasis   - brkPrincipalDraw)
        }
      }

      // 3rd: Roth gains — only if age >= 59½ (tax-free)
      if (remaining > 0 && rothGainsUnlocked) {
        const rothTotalBal  = isD ? dRothTotalBalance : aRothTotalBalance
        const rothContrib2  = isD ? dRothContribBalance : aRothContribBalance
        const availGains    = Math.max(0, rothTotalBal - rothContrib2)
        fromRothGains = Math.min(availGains, remaining)
        remaining -= fromRothGains
        if (isD) { dRothTotalBalance = Math.max(0, dRothTotalBalance - fromRothGains) }
        else     { aRothTotalBalance = Math.max(0, aRothTotalBalance - fromRothGains) }
      }

      // 4th: Uninvested lump cash — principal tax-free, gains at cap gains
      if (remaining > 0 && isD && dLumpBalance > 0) {
        const lumpActual = Math.min(dLumpBalance, remaining)
        const lumpPrincipal = Math.min(dLumpBasis, lumpActual)
        const lumpGainsDraw = lumpActual - lumpPrincipal
        tax += lumpGainsDraw * (capitalGainsTaxPct || 0) / 100
        fromLump = lumpActual
        remaining = Math.max(0, remaining - lumpActual)
        dLumpBalance = Math.max(0, dLumpBalance - lumpActual)
        dLumpBasis   = Math.max(0, dLumpBasis   - lumpPrincipal)
      }

      return { fromRoth, fromRothGains, fromBrokerage, brkPrincipalDraw, brkGainsDraw, fromLump, tax, remaining }
    }

    // Handle D's gap first
    if (dGap > 0) {
      const r = drawFromBuckets(dGap, true)
      dDrawFromRoth = r.fromRoth
      dDrawFromRothGains = r.fromRothGains
      dDrawFromBrokerage = r.fromBrokerage
      dBrkPrincipalDraw = r.brkPrincipalDraw
      dBrkGainsDraw = r.brkGainsDraw
      dDrawFromLump = r.fromLump
      dDrawTax = r.tax
      if (r.remaining > 0 && !lockedDrawRequired) { lockedDrawRequired = true; lockedDrawFirstYear = y }
    }

    // Handle A's gap — try A's buckets first, then spill to D's
    if (aGap > 0) {
      const rA = drawFromBuckets(aGap, false)
      aDrawFromRoth = rA.fromRoth
      aDrawFromBrokerage = rA.fromBrokerage
      aBrkPrincipalDraw = rA.brkPrincipalDraw
      aBrkGainsDraw = rA.brkGainsDraw
      aDrawTax = rA.tax
      if (rA.remaining > 0) {
        // A is fully depleted — D covers the rest.
        // First apply D's own cash leftover (already being invested) to offset the gap.
        // Only the amount beyond D's cash goes to D's buckets.
        const dCashOffset = Math.min(dLeftover > 0 ? dLeftover * 12 : 0, rA.remaining)
        dSpillCashOffset = dCashOffset

        // Recompute D's net investable after giving cash to A
        const dNetInvestable = Math.max(0, dLeftover - dCashOffset / 12)
        const dRothAllocNet     = Math.min(dRothCap, dNetInvestable)
        const dTradAllocNet     = Math.min(dTradFixed, Math.max(0, dNetInvestable - dRothAllocNet))
        const dBrokerageAllocNet = Math.max(0, dNetInvestable - dRothAllocNet - dTradAllocNet)

        // Undo the over-allocation that was added at the top of the loop
        const dRothReduction = (dRothAlloc - dRothAllocNet) * 12
        const dBrkReduction  = (dBrokerageAlloc - dBrokerageAllocNet) * 12
        dRothReductionForSpill = dRothReduction
        dBrkReductionForSpill  = dBrkReduction
        dRothContribBalance   -= dRothReduction
        dRothTotalBalance     -= dRothReduction
        dBrokerageBalance     -= dBrkReduction
        dBrokerageBasis       -= dBrkReduction
        // Also fix the yearly arrays (used for retirement FV calculations)
        dYearlyRoth[dYearlyRoth.length - 1]           = dRothAllocNet
        dYearlyBrokerage[dYearlyBrokerage.length - 1] = dBrokerageAllocNet
        const spillAfterCash = rA.remaining - dCashOffset
        if (spillAfterCash > 0) {
          const rD = drawFromBuckets(spillAfterCash, true)
          aSpillFromDRoth = rD.fromRoth
          aSpillFromDBrokerage = rD.fromBrokerage
          aSpillFromDLump = rD.fromLump
          aSpillFromDRothGains = rD.fromRothGains
          aSpillDTax = rD.tax
          // Add spill to D's draw totals so D's snapshot reflects it
          dDrawFromRoth += rD.fromRoth
          dDrawFromRothGains += rD.fromRothGains
          dDrawFromBrokerage += rD.fromBrokerage
          dBrkPrincipalDraw += rD.brkPrincipalDraw
          dBrkGainsDraw += rD.brkGainsDraw
          dDrawFromLump += rD.fromLump
          dDrawTax += rD.tax
          if (rD.remaining > 0 && !lockedDrawRequired) { lockedDrawRequired = true; lockedDrawFirstYear = y }
        }
      }
    }
    // Now run spend inflation cascade AFTER housing draws — sees real remaining balances
    // Spend cascade: HYSA covers shortfall first, then investment buckets
    // Order: HYSA → Roth contrib → Brokerage principal → Brokerage gains → Roth gains (if 59½+) → Lump
    const dRothContribPreSpend   = dRothContribBalance
    const dRothGainsPreSpend     = Math.max(0, dRothTotalBalance - dRothContribBalance)
    const dBrkGainsPreSpend      = Math.max(0, dBrokerageBalance - dBrokerageBasis)
    const dBrkPrincipalPreSpend  = dBrokerageBasis
    const dLumpPreSpend          = dLumpBalance
    const dSpendDraw = Math.max(0, (dSpendNominal - Math.max(0, (dIncome || 0) - (dBudget || 0))) * 12)
    const dActualHYSADraw = Math.min(dSpendDraw, dHYSABalance)
    const dHYSAPreDraw = dHYSABalance
    dHYSABalance = Math.max(0, dHYSABalance - dActualHYSADraw)
    let dSpendRemaining = dSpendDraw - dActualHYSADraw

    // 1) Roth contributions (tax-free, no penalty at any age)
    let dSpendRothDraw = 0
    if (dSpendRemaining > 0) {
      dSpendRothDraw = Math.min(dRothContribBalance, dSpendRemaining)
      dSpendRemaining -= dSpendRothDraw
      dRothContribBalance = Math.max(0, dRothContribBalance - dSpendRothDraw)
      dRothTotalBalance   = Math.max(0, dRothTotalBalance   - dSpendRothDraw)
    }

    // 3) Brokerage principal (tax-free basis), then gains (cap gains tax)
    let dSpendBrkPrincipalDraw = 0, dSpendBrkGainsDraw = 0, dSpendBrkTax = 0
    if (dSpendRemaining > 0) {
      dSpendBrkPrincipalDraw = Math.min(dBrokerageBasis, dSpendRemaining)
      dSpendRemaining -= dSpendBrkPrincipalDraw
      dSpendBrkGainsDraw = Math.min(Math.max(0, dBrokerageBalance - dBrokerageBasis), dSpendRemaining)
      dSpendRemaining -= dSpendBrkGainsDraw
      dSpendBrkTax = dSpendBrkGainsDraw * (capitalGainsTaxPct || 0) / 100
      const totalBrkDraw = dSpendBrkPrincipalDraw + dSpendBrkGainsDraw
      dBrokerageBalance = Math.max(0, dBrokerageBalance - totalBrkDraw)
      dBrokerageBasis   = Math.max(0, dBrokerageBasis   - dSpendBrkPrincipalDraw)
    }

    // 4) Roth gains — only accessible at age 59½+
    let dSpendRothGainsDraw = 0
    if (dSpendRemaining > 0 && ageAtY >= 59.5) {
      const availableRothGains = Math.max(0, dRothTotalBalance - dRothContribBalance)
      dSpendRothGainsDraw = Math.min(availableRothGains, dSpendRemaining)
      dSpendRemaining -= dSpendRothGainsDraw
      dRothTotalBalance = Math.max(0, dRothTotalBalance - dSpendRothGainsDraw)
    }

    // 6) Uninvested cash (principal tax-free, gains at cap gains rate)
    let dSpendLumpPrincipalDraw = 0, dSpendLumpGainsDraw = 0, dSpendLumpTax = 0
    if (dSpendRemaining > 0) {
      const lumpGains = Math.max(0, dLumpBalance - dLumpBasis)
      dSpendLumpPrincipalDraw = Math.min(dLumpBasis, dSpendRemaining)
      dSpendRemaining -= dSpendLumpPrincipalDraw
      dSpendLumpGainsDraw = Math.min(lumpGains, dSpendRemaining)
      dSpendRemaining -= dSpendLumpGainsDraw
      dSpendLumpTax = dSpendLumpGainsDraw * (capitalGainsTaxPct || 0) / 100
      const totalLumpDraw = dSpendLumpPrincipalDraw + dSpendLumpGainsDraw
      dLumpBalance = Math.max(0, dLumpBalance - totalLumpDraw)
      dLumpBasis   = Math.max(0, dLumpBasis   - dSpendLumpPrincipalDraw)
    }
    // 7) Anything still remaining = truly uncovered deficit
    const dSpendDeficit = dSpendRemaining
    const dSpendBrkDraw = dSpendBrkPrincipalDraw + dSpendBrkGainsDraw

    // ── A's spend cascade (same priority order as D) ──
    const aRothContribPreSpend   = aRothContribBalance
    const aRothGainsPreSpend     = Math.max(0, aRothTotalBalance - aRothContribBalance)
    const aBrkGainsPreSpend      = Math.max(0, aBrokerageBalance - aBrokerageBasis)
    const aBrkPrincipalPreSpend  = aBrokerageBasis
    const aSpendDraw = Math.max(0, (aSpendNominal - Math.max(0, (aIncome || 0) - (aBudget || 0))) * 12)
    const aActualHYSADraw = Math.min(aSpendDraw, aHYSABalance)
    const aHYSAPreDraw = aHYSABalance
    aHYSABalance = Math.max(0, aHYSABalance - aActualHYSADraw)
    let aSpendRemaining = aSpendDraw - aActualHYSADraw

    let aSpendRothDraw = 0
    if (aSpendRemaining > 0) {
      aSpendRothDraw = Math.min(aRothContribBalance, aSpendRemaining)
      aSpendRemaining -= aSpendRothDraw
      aRothContribBalance = Math.max(0, aRothContribBalance - aSpendRothDraw)
      aRothTotalBalance   = Math.max(0, aRothTotalBalance   - aSpendRothDraw)
    }

    let aSpendBrkPrincipalDraw = 0, aSpendBrkGainsDraw = 0, aSpendBrkTax = 0
    if (aSpendRemaining > 0) {
      aSpendBrkPrincipalDraw = Math.min(aBrokerageBasis, aSpendRemaining)
      aSpendRemaining -= aSpendBrkPrincipalDraw
      aSpendBrkGainsDraw = Math.min(Math.max(0, aBrokerageBalance - aBrokerageBasis), aSpendRemaining)
      aSpendRemaining -= aSpendBrkGainsDraw
      aSpendBrkTax = aSpendBrkGainsDraw * (capitalGainsTaxPct || 0) / 100
      const totalBrkDraw = aSpendBrkPrincipalDraw + aSpendBrkGainsDraw
      aBrokerageBalance = Math.max(0, aBrokerageBalance - totalBrkDraw)
      aBrokerageBasis   = Math.max(0, aBrokerageBasis   - aSpendBrkPrincipalDraw)
    }

    let aSpendRothGainsDraw = 0
    if (aSpendRemaining > 0 && ageAtY >= 59.5) {
      const availableRothGains = Math.max(0, aRothTotalBalance - aRothContribBalance)
      aSpendRothGainsDraw = Math.min(availableRothGains, aSpendRemaining)
      aSpendRemaining -= aSpendRothGainsDraw
      aRothTotalBalance = Math.max(0, aRothTotalBalance - aSpendRothGainsDraw)
    }

    let aSpendLumpPrincipalDraw = 0, aSpendLumpGainsDraw = 0, aSpendLumpTax = 0
    if (aSpendRemaining > 0 && aLumpBalance > 0) {
      const lumpGains = Math.max(0, aLumpBalance - aLumpBasis)
      aSpendLumpPrincipalDraw = Math.min(aLumpBasis, aSpendRemaining)
      aSpendRemaining -= aSpendLumpPrincipalDraw
      aSpendLumpGainsDraw = Math.min(lumpGains, aSpendRemaining)
      aSpendRemaining -= aSpendLumpGainsDraw
      aSpendLumpTax = aSpendLumpGainsDraw * (capitalGainsTaxPct || 0) / 100
      const totalLumpDraw = aSpendLumpPrincipalDraw + aSpendLumpGainsDraw
      aLumpBalance = Math.max(0, aLumpBalance - totalLumpDraw)
      aLumpBasis   = Math.max(0, aLumpBasis   - aSpendLumpPrincipalDraw)
    }

    const aSpendBrkDraw = aSpendBrkPrincipalDraw + aSpendBrkGainsDraw
    const aLumpPreSpend = aLumpBalance + (aSpendLumpPrincipalDraw + aSpendLumpGainsDraw)

    // ── D covers A's spending deficit (A's buckets fully depleted) ──
    let dSpendForA_hysa = 0, dSpendForA_roth = 0, dSpendForA_brkPrincipal = 0, dSpendForA_brkGains = 0
    let dSpendForA_brkTax = 0, dSpendForA_rothGains = 0, dSpendForA_lumpPrincipal = 0, dSpendForA_lumpGains = 0, dSpendForA_lumpTax = 0
    let dSpendForA_total = 0
    if (aSpendRemaining > 0) {
      let rem = aSpendRemaining
      // HYSA
      dSpendForA_hysa = Math.min(dHYSABalance, rem)
      dHYSABalance = Math.max(0, dHYSABalance - dSpendForA_hysa)
      rem -= dSpendForA_hysa
      // Roth contributions
      if (rem > 0) {
        dSpendForA_roth = Math.min(dRothContribBalance, rem)
        rem -= dSpendForA_roth
        dRothContribBalance = Math.max(0, dRothContribBalance - dSpendForA_roth)
        dRothTotalBalance   = Math.max(0, dRothTotalBalance   - dSpendForA_roth)
      }
      // Brokerage principal then gains
      if (rem > 0 && dBrokerageBalance > 0) {
        dSpendForA_brkPrincipal = Math.min(dBrokerageBasis, rem)
        rem -= dSpendForA_brkPrincipal
        dSpendForA_brkGains = Math.min(Math.max(0, dBrokerageBalance - dBrokerageBasis), rem)
        rem -= dSpendForA_brkGains
        dSpendForA_brkTax = dSpendForA_brkGains * (capitalGainsTaxPct || 0) / 100
        dBrokerageBalance = Math.max(0, dBrokerageBalance - dSpendForA_brkPrincipal - dSpendForA_brkGains)
        dBrokerageBasis   = Math.max(0, dBrokerageBasis   - dSpendForA_brkPrincipal)
      }
      // Roth gains (if 59½+)
      if (rem > 0 && ageAtY >= 59.5) {
        const availGains = Math.max(0, dRothTotalBalance - dRothContribBalance)
        dSpendForA_rothGains = Math.min(availGains, rem)
        rem -= dSpendForA_rothGains
        dRothTotalBalance = Math.max(0, dRothTotalBalance - dSpendForA_rothGains)
      }
      // Lump (principal then gains)
      if (rem > 0 && dLumpBalance > 0) {
        const lumpGains = Math.max(0, dLumpBalance - dLumpBasis)
        dSpendForA_lumpPrincipal = Math.min(dLumpBasis, rem)
        rem -= dSpendForA_lumpPrincipal
        dSpendForA_lumpGains = Math.min(lumpGains, rem)
        rem -= dSpendForA_lumpGains
        dSpendForA_lumpTax = dSpendForA_lumpGains * (capitalGainsTaxPct || 0) / 100
        dLumpBalance = Math.max(0, dLumpBalance - dSpendForA_lumpPrincipal - dSpendForA_lumpGains)
        dLumpBasis   = Math.max(0, dLumpBasis   - dSpendForA_lumpPrincipal)
      }
      dSpendForA_total = dSpendForA_hysa + dSpendForA_roth + dSpendForA_brkPrincipal + dSpendForA_brkGains + dSpendForA_rothGains + dSpendForA_lumpPrincipal + dSpendForA_lumpGains
      aSpendRemaining = rem
    }
    const aSpendDeficit = aSpendRemaining

    // Save end-of-year bucket snapshots
    // During accumulation, accessible portfolio = Roth contributions (can withdraw penalty-free) + Brokerage
    // Roth earnings are locked until retirement — shown separately
    const dRothEarnings = Math.max(0, dRothTotalBalance - dRothContribBalance)
    const aRothEarnings = Math.max(0, aRothTotalBalance - aRothContribBalance)
    dBucketSnapshots.push({
      roth: dRothContribBalance, rothTotal: dRothTotalBalance, rothEarnings: dRothEarnings,
      brokerage: dBrokerageBalance, brokerageBasis: dBrokerageBasis,
      hysa: dHYSABalance, hysaMonthly: dHYSAMonthly, hysaSpendDraw: dActualHYSADraw, hysaPreDraw: dHYSAPreDraw,
      brkGainsPreHousing: dBrkGainsPreHousing, brkPrincipalPreHousing: dBrkPrincipalPreHousing,
      rothContribPreHousing: dRothContribPreHousing, rothGainsPreHousing: dRothGainsPreHousing,
      brkGainsPreSpend: dBrkGainsPreSpend, brkPrincipalPreSpend: dBrkPrincipalPreSpend,
      rothContribPreSpend: dRothContribPreSpend, rothGainsPreSpend: dRothGainsPreSpend,
      lumpPreSpend: dLumpPreSpend,
      spendBrkDraw: dSpendBrkDraw, spendBrkPrincipal: dSpendBrkPrincipalDraw, spendBrkGains: dSpendBrkGainsDraw, spendBrkTax: dSpendBrkTax,
      spendRothDraw: dSpendRothDraw, spendRothGainsDraw: dSpendRothGainsDraw, spendDeficit: dSpendDeficit,
      lump: dLumpBalance, lumpBasis: dLumpBasis,
      spendLumpPrincipal: dSpendLumpPrincipalDraw, spendLumpGains: dSpendLumpGainsDraw, spendLumpTax: dSpendLumpTax,
      portfolio: dRothContribBalance + dBrokerageBalance,
      drawFromRoth: dDrawFromRoth, drawFromRothGains: dDrawFromRothGains, drawFromBrokerage: dDrawFromBrokerage, drawTax: dDrawTax,
      brkPrincipalDraw: dBrkPrincipalDraw, brkGainsDraw: dBrkGainsDraw, drawFromLump: dDrawFromLump,
      rothAlloc: Math.max(0, dRothAlloc - dRothReductionForSpill / 12),
      brokerageAlloc: Math.max(0, dBrokerageAlloc - dBrkReductionForSpill / 12),
      spillCashOffset: dSpillCashOffset,
      spendForA: dSpendForA_total,
      spendForA_hysa: dSpendForA_hysa, spendForA_roth: dSpendForA_roth,
      spendForA_brkPrincipal: dSpendForA_brkPrincipal, spendForA_brkGains: dSpendForA_brkGains, spendForA_brkTax: dSpendForA_brkTax,
      spendForA_rothGains: dSpendForA_rothGains,
      spendForA_lumpPrincipal: dSpendForA_lumpPrincipal, spendForA_lumpGains: dSpendForA_lumpGains, spendForA_lumpTax: dSpendForA_lumpTax,
    })
    aBucketSnapshots.push({
      roth: aRothContribBalance, rothTotal: aRothTotalBalance, rothEarnings: aRothEarnings,
      brokerage: aBrokerageBalance, brokerageBasis: aBrokerageBasis,
      hysa: aHYSABalance, hysaMonthly: aHYSAMonthly, hysaSpendDraw: aActualHYSADraw, hysaPreDraw: aHYSAPreDraw,
      brkGainsPreSpend: aBrkGainsPreSpend, brkPrincipalPreSpend: aBrkPrincipalPreSpend,
      rothContribPreSpend: aRothContribPreSpend, rothGainsPreSpend: aRothGainsPreSpend,
      spendBrkDraw: aSpendBrkDraw, spendBrkPrincipal: aSpendBrkPrincipalDraw, spendBrkGains: aSpendBrkGainsDraw, spendBrkTax: aSpendBrkTax,
      spendRothDraw: aSpendRothDraw, spendRothGainsDraw: aSpendRothGainsDraw, spendDeficit: aSpendDeficit,
      spendCoveredByD: dSpendForA_total,
      lump: aLumpBalance, lumpBasis: aLumpBasis, lumpPreSpend: aLumpPreSpend,
      spendLumpPrincipal: aSpendLumpPrincipalDraw, spendLumpGains: aSpendLumpGainsDraw, spendLumpTax: aSpendLumpTax,
      portfolio: aRothContribBalance + aBrokerageBalance,
      rothAlloc: aRothAlloc, brokerageAlloc: aBrokerageAlloc,
      drawFromRoth: aDrawFromRoth, drawFromBrokerage: aDrawFromBrokerage, drawTax: aDrawTax,
      brkPrincipalDraw: aBrkPrincipalDraw, brkGainsDraw: aBrkGainsDraw,
      spillFromDRoth: aSpillFromDRoth, spillFromDBrokerage: aSpillFromDBrokerage, spillDTax: aSpillDTax,
      spillFromDLump: aSpillFromDLump, spillFromDRothGains: aSpillFromDRothGains,
      spillCashOffset: dSpillCashOffset,
    })

  }
  // Apply job loss: reduce affected person's monthly savings for jobLossMonths months starting at jobLossYear
  if ((jobLossYear || 0) > 0 && (jobLossMonths || 0) > 0) {
    let monthsLeft = jobLossMonths || 0
    for (let y = (jobLossYear - 1); y < iYrs && monthsLeft > 0; y++) {
      const monthsThisYear = Math.min(12, monthsLeft)
      const fraction = monthsThisYear / 12
      if (jobLossPerson === 'D' || jobLossPerson === 'both') {
        dYearlyLeftover[y] = (dYearlyLeftover[y] || 0) - (dBudget || 0) * fraction
      }
      if (jobLossPerson === 'A' || jobLossPerson === 'both') {
        aYearlyLeftover[y] = (aYearlyLeftover[y] || 0) - (aBudget || 0) * fraction
      }
      monthsLeft -= monthsThisYear
    }
  }
  const dInvestOnly = (dBucketSnapshots[iYrs - 1] || {}).rothTotal + (dBucketSnapshots[iYrs - 1] || {}).brokerage || 0
  const aInvestOnly = (aBucketSnapshots[iYrs - 1] || {}).rothTotal + (aBucketSnapshots[iYrs - 1] || {}).brokerage || 0

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
  // Start in 1BR, upgrade to 2BR at rentUpgradeTo2BR year
  const upgradeYear = rentUpgradeTo2BR || 3
  // A pays up to her inflation-adjusted budget; D covers the rest
  function aRentBudgetAtYear(y) {
    return (aBudget || 0) * Math.pow(1 + (aBudgetIncrease || 0) / 100, y)
  }
  // Utilities for the rent path (separate from owning effectiveUtilities)
  const ru = rentUtilities || {}
  const utilsTotal2 = (ru.water || 0) + (ru.trash || 0) + (ru.sewer || 0) + (ru.electricity || 0)

  // calcRentAtYear: starts at 1BR, upgrades to 2BR at upgradeYear
  // if rentMoveEvery > 0, reset to market rate on each move
  function calcRentAtYear(y) {
    const base1BR = rent1BR || 0
    const base2BR = rent2BR || 0
    // Base at year 0 is 1BR; at upgradeYear it jumps to 2BR market rate at that time
    const rateInc = (rentIncreaseRate || 0) / 100
    const rateMarket = (rentMarketGrowth || 0) / 100
    if (y < upgradeYear) {
      // Still in 1BR phase
      if (!rentMoveEvery) return base1BR * Math.pow(1 + rateInc, y)
      const lease = Math.floor((y - 1) / rentMoveEvery)
      const yearInLease = ((y - 1) % rentMoveEvery) + 1
      const market = base1BR * Math.pow(1 + (rentMoveEvery ? rateMarket : rateInc), lease * rentMoveEvery)
      return market * Math.pow(1 + rateInc, yearInLease)
    } else {
      // 2BR phase: base is 2BR market rate at upgradeYear, then grows from there
      const base2BRAtUpgrade = base2BR * Math.pow(1 + (rentMoveEvery ? rateMarket : rateInc), upgradeYear)
      const yFrom2BR = y - upgradeYear  // years since upgrade
      if (!rentMoveEvery) return base2BRAtUpgrade * Math.pow(1 + rateInc, yFrom2BR)
      const lease = Math.floor(yFrom2BR / rentMoveEvery)
      const yearInLease = (yFrom2BR % rentMoveEvery) + 1
      const market = base2BRAtUpgrade * Math.pow(1 + rateMarket, lease * rentMoveEvery)
      return market * Math.pow(1 + rateInc, yearInLease)
    }
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

  // ── Rent path: bucket-by-bucket simulation (mirrors buy path) ──
  const dRentYearlyInvest = []
  const aRentYearlyInvest = []
  let rD_rothContrib = 0, rD_rothTotal = 0, rD_brokerage = 0, rD_brkBasis = 0
  let rA_rothContrib = 0, rA_rothTotal = 0, rA_brokerage = 0, rA_brkBasis = 0
  let rD_hysa = 0, rA_hysa = 0
  let rD_lump = dLumpRent, rA_lump = aLumpRent
  let rD_lumpBasis = dLumpRent, rA_lumpBasis = aLumpRent
  const dRentBucketSnapshots = []
  const aRentBucketSnapshots = []

  for (let y = 1; y <= iYrs; y++) {
    const rentAtY = calcRentAtYear(y)
    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const totalRentCost = rentAtY + utilsTotal2 * uf + (rentParking || 0) * uf
    const aRentPays = Math.min(aRentBudgetAtYear(y), totalRentCost)
    const dRentPays = totalRentCost - aRentPays
    dRentYearlyInvest.push((dBudget || 0) - dRentPays)
    aRentYearlyInvest.push(Math.max(0, (aBudget || 0) - aRentPays))

    const rD_leftover = (dBudget || 0) - dRentPays
    const rA_leftover = (aBudget || 0) - aRentPays

    const rD_rothAlloc = Math.min(dRothCap, Math.max(0, rD_leftover))
    const rD_brkAlloc  = Math.max(0, rD_leftover - rD_rothAlloc)
    const rA_rothAlloc = Math.min(aRothCap, Math.max(0, rA_leftover))
    const rA_brkAlloc  = Math.max(0, rA_leftover - rA_rothAlloc)

    const rGr = (investRate || 0) / 100
    rD_rothContrib += rD_rothAlloc * 12
    rD_rothTotal = rD_rothTotal * (1 + rGr) + rD_rothAlloc * 12
    rD_brokerage = rD_brokerage * (1 + rGr) + rD_brkAlloc * 12
    rD_brkBasis += rD_brkAlloc * 12
    rA_rothContrib += rA_rothAlloc * 12
    rA_rothTotal = rA_rothTotal * (1 + rGr) + rA_rothAlloc * 12
    rA_brokerage = rA_brokerage * (1 + rGr) + rA_brkAlloc * 12
    rA_brkBasis += rA_brkAlloc * 12

    const rHysaGr = (hysaRate || 3) / 100
    const rD_spendInflFactor = Math.pow(1 + (spendInflationRate || 3) / 100, y)
    const rD_spendNominal = (spendingCap || 0) * rD_spendInflFactor
    const rA_spendNominal = (aSpendingCap || 0) * rD_spendInflFactor
    const rD_hysaMonthly = Math.max(0, (dIncome || 0) - (dBudget || 0) - rD_spendNominal)
    const rA_hysaMonthly = Math.max(0, (aIncome || 0) - (aBudget || 0) - rA_spendNominal)
    rD_hysa = rD_hysa * (1 + rHysaGr) + rD_hysaMonthly * 12
    rA_hysa = rA_hysa * (1 + rHysaGr) + rA_hysaMonthly * 12
    rD_lump = rD_lump * (1 + rGr)
    rA_lump = rA_lump * (1 + rGr)

    const rAgeAtY = (currentAge || 33) + y
    const rRothGainsUnlocked = rAgeAtY >= 59.5

    // Housing overage cascade (same priority as buy path)
    const rDrawFromBuckets = (gap, isD) => {
      let remaining = gap
      let fromRoth = 0, fromRothGains = 0, fromBrokerage = 0, brkPrincipalDraw = 0, brkGainsDraw = 0, fromLump = 0, tax = 0

      const rothCBal = isD ? rD_rothContrib : rA_rothContrib
      fromRoth = Math.min(rothCBal, remaining)
      remaining -= fromRoth
      if (isD) { rD_rothContrib -= fromRoth; rD_rothTotal -= fromRoth }
      else     { rA_rothContrib -= fromRoth; rA_rothTotal -= fromRoth }

      const brkBal = isD ? rD_brokerage : rA_brokerage
      const brkBas = isD ? rD_brkBasis : rA_brkBasis
      if (remaining > 0 && brkBal > 0) {
        const actualDraw = Math.min(brkBal, remaining)
        brkPrincipalDraw = Math.min(brkBas, actualDraw)
        brkGainsDraw = actualDraw - brkPrincipalDraw
        tax += brkGainsDraw * (capitalGainsTaxPct || 0) / 100
        fromBrokerage = actualDraw
        remaining = Math.max(0, remaining - actualDraw)
        if (isD) { rD_brokerage = Math.max(0, rD_brokerage - actualDraw); rD_brkBasis = Math.max(0, rD_brkBasis - brkPrincipalDraw) }
        else     { rA_brokerage = Math.max(0, rA_brokerage - actualDraw); rA_brkBasis = Math.max(0, rA_brkBasis - brkPrincipalDraw) }
      }

      if (remaining > 0 && rRothGainsUnlocked) {
        const rothTBal = isD ? rD_rothTotal : rA_rothTotal
        const rothC2   = isD ? rD_rothContrib : rA_rothContrib
        const availGains = Math.max(0, rothTBal - rothC2)
        fromRothGains = Math.min(availGains, remaining)
        remaining -= fromRothGains
        if (isD) { rD_rothTotal = Math.max(0, rD_rothTotal - fromRothGains) }
        else     { rA_rothTotal = Math.max(0, rA_rothTotal - fromRothGains) }
      }

      if (remaining > 0) {
        const lb = isD ? rD_lump : rA_lump
        const lbBas = isD ? rD_lumpBasis : rA_lumpBasis
        if (lb > 0) {
          const lumpActual = Math.min(lb, remaining)
          const lumpP = Math.min(lbBas, lumpActual)
          tax += (lumpActual - lumpP) * (capitalGainsTaxPct || 0) / 100
          fromLump = lumpActual
          remaining = Math.max(0, remaining - lumpActual)
          if (isD) { rD_lump = Math.max(0, rD_lump - lumpActual); rD_lumpBasis = Math.max(0, rD_lumpBasis - lumpP) }
          else     { rA_lump = Math.max(0, rA_lump - lumpActual); rA_lumpBasis = Math.max(0, rA_lumpBasis - lumpP) }
        }
      }

      return { fromRoth, fromRothGains, fromBrokerage, brkPrincipalDraw, brkGainsDraw, fromLump, tax, remaining }
    }

    const rD_gap = rD_leftover < 0 ? Math.abs(rD_leftover) * 12 : 0
    const rA_gap = rA_leftover < 0 ? Math.abs(rA_leftover) * 12 : 0
    const rD_rothContribPreHousing = rD_rothContrib
    const rD_rothGainsPreHousing   = Math.max(0, rD_rothTotal - rD_rothContrib)
    const rD_brkGainsPreHousing    = Math.max(0, rD_brokerage - rD_brkBasis)
    const rD_brkPrincipalPreHousing = rD_brkBasis
    let rD_drawFromRoth = 0, rD_drawFromRothGains = 0, rD_drawFromBrk = 0, rD_drawTax = 0
    let rD_brkPDraw = 0, rD_brkGDraw = 0, rD_drawFromLump = 0
    let rA_drawFromRoth = 0, rA_drawFromBrk = 0, rA_drawTax = 0, rA_brkPDraw = 0, rA_brkGDraw = 0
    let rA_spillFromDRoth = 0, rA_spillFromDBrk = 0, rA_spillDTax = 0
    let rA_spillFromDLump = 0, rA_spillFromDRothGains = 0
    let rD_spillCashOffset = 0, rD_rothRedForSpill = 0, rD_brkRedForSpill = 0

    if (rD_gap > 0) {
      const r = rDrawFromBuckets(rD_gap, true)
      rD_drawFromRoth = r.fromRoth; rD_drawFromRothGains = r.fromRothGains
      rD_drawFromBrk = r.fromBrokerage; rD_brkPDraw = r.brkPrincipalDraw
      rD_brkGDraw = r.brkGainsDraw; rD_drawFromLump = r.fromLump; rD_drawTax = r.tax
    }

    if (rA_gap > 0) {
      const rA = rDrawFromBuckets(rA_gap, false)
      rA_drawFromRoth = rA.fromRoth; rA_drawFromBrk = rA.fromBrokerage
      rA_brkPDraw = rA.brkPrincipalDraw; rA_brkGDraw = rA.brkGainsDraw; rA_drawTax = rA.tax
      if (rA.remaining > 0) {
        const dCashOff = Math.min(rD_leftover > 0 ? rD_leftover * 12 : 0, rA.remaining)
        rD_spillCashOffset = dCashOff
        const dNetInv = Math.max(0, rD_leftover - dCashOff / 12)
        const dRothNet = Math.min(dRothCap, dNetInv)
        const dBrkNet  = Math.max(0, dNetInv - dRothNet)
        const dRothRed = (rD_rothAlloc - dRothNet) * 12
        const dBrkRed  = (rD_brkAlloc - dBrkNet) * 12
        rD_rothRedForSpill = dRothRed; rD_brkRedForSpill = dBrkRed
        rD_rothContrib -= dRothRed; rD_rothTotal -= dRothRed
        rD_brokerage -= dBrkRed; rD_brkBasis -= dBrkRed
        const spillAfterCash = rA.remaining - dCashOff
        if (spillAfterCash > 0) {
          const rD2 = rDrawFromBuckets(spillAfterCash, true)
          rA_spillFromDRoth = rD2.fromRoth; rA_spillFromDBrk = rD2.fromBrokerage
          rA_spillFromDLump = rD2.fromLump; rA_spillFromDRothGains = rD2.fromRothGains
          rA_spillDTax = rD2.tax
          rD_drawFromRoth += rD2.fromRoth; rD_drawFromRothGains += rD2.fromRothGains
          rD_drawFromBrk += rD2.fromBrokerage; rD_brkPDraw += rD2.brkPrincipalDraw
          rD_brkGDraw += rD2.brkGainsDraw; rD_drawFromLump += rD2.fromLump; rD_drawTax += rD2.tax
        }
      }
    }

    // D's spend cascade
    const rD_rothContribPreSpend = rD_rothContrib
    const rD_rothGainsPreSpend   = Math.max(0, rD_rothTotal - rD_rothContrib)
    const rD_brkGainsPreSpend    = Math.max(0, rD_brokerage - rD_brkBasis)
    const rD_brkPrincipalPreSpend = rD_brkBasis
    const rD_lumpPreSpend = rD_lump
    const rD_spendDraw = Math.max(0, (rD_spendNominal - Math.max(0, (dIncome || 0) - (dBudget || 0))) * 12)
    const rD_hysaPreDraw = rD_hysa
    const rD_actualHYSADraw = Math.min(rD_spendDraw, rD_hysa)
    rD_hysa = Math.max(0, rD_hysa - rD_actualHYSADraw)
    let rD_spendRem = rD_spendDraw - rD_actualHYSADraw

    let rD_spendRothDraw = 0
    if (rD_spendRem > 0) { rD_spendRothDraw = Math.min(rD_rothContrib, rD_spendRem); rD_spendRem -= rD_spendRothDraw; rD_rothContrib = Math.max(0, rD_rothContrib - rD_spendRothDraw); rD_rothTotal = Math.max(0, rD_rothTotal - rD_spendRothDraw) }

    let rD_spendBrkP = 0, rD_spendBrkG = 0, rD_spendBrkTax = 0
    if (rD_spendRem > 0) {
      rD_spendBrkP = Math.min(rD_brkBasis, rD_spendRem); rD_spendRem -= rD_spendBrkP
      rD_spendBrkG = Math.min(Math.max(0, rD_brokerage - rD_brkBasis), rD_spendRem); rD_spendRem -= rD_spendBrkG
      rD_spendBrkTax = rD_spendBrkG * (capitalGainsTaxPct || 0) / 100
      rD_brokerage = Math.max(0, rD_brokerage - rD_spendBrkP - rD_spendBrkG)
      rD_brkBasis  = Math.max(0, rD_brkBasis - rD_spendBrkP)
    }

    let rD_spendRothGainsDraw = 0
    if (rD_spendRem > 0 && rAgeAtY >= 59.5) { const avail = Math.max(0, rD_rothTotal - rD_rothContrib); rD_spendRothGainsDraw = Math.min(avail, rD_spendRem); rD_spendRem -= rD_spendRothGainsDraw; rD_rothTotal = Math.max(0, rD_rothTotal - rD_spendRothGainsDraw) }

    let rD_spendLumpP = 0, rD_spendLumpG = 0, rD_spendLumpTax = 0
    if (rD_spendRem > 0 && rD_lump > 0) {
      const g = Math.max(0, rD_lump - rD_lumpBasis)
      rD_spendLumpP = Math.min(rD_lumpBasis, rD_spendRem); rD_spendRem -= rD_spendLumpP
      rD_spendLumpG = Math.min(g, rD_spendRem); rD_spendRem -= rD_spendLumpG
      rD_spendLumpTax = rD_spendLumpG * (capitalGainsTaxPct || 0) / 100
      rD_lump = Math.max(0, rD_lump - rD_spendLumpP - rD_spendLumpG)
      rD_lumpBasis = Math.max(0, rD_lumpBasis - rD_spendLumpP)
    }
    const rD_spendDeficit = rD_spendRem

    // A's spend cascade
    const rA_rothContribPreSpend = rA_rothContrib
    const rA_rothGainsPreSpend   = Math.max(0, rA_rothTotal - rA_rothContrib)
    const rA_brkGainsPreSpend    = Math.max(0, rA_brokerage - rA_brkBasis)
    const rA_brkPrincipalPreSpend = rA_brkBasis
    const rA_lumpPreSpend = rA_lump
    const rA_spendDraw = Math.max(0, (rA_spendNominal - Math.max(0, (aIncome || 0) - (aBudget || 0))) * 12)
    const rA_hysaPreDraw = rA_hysa
    const rA_actualHYSADraw = Math.min(rA_spendDraw, rA_hysa)
    rA_hysa = Math.max(0, rA_hysa - rA_actualHYSADraw)
    let rA_spendRem = rA_spendDraw - rA_actualHYSADraw

    let rA_spendRothDraw = 0
    if (rA_spendRem > 0) { rA_spendRothDraw = Math.min(rA_rothContrib, rA_spendRem); rA_spendRem -= rA_spendRothDraw; rA_rothContrib = Math.max(0, rA_rothContrib - rA_spendRothDraw); rA_rothTotal = Math.max(0, rA_rothTotal - rA_spendRothDraw) }

    let rA_spendBrkP = 0, rA_spendBrkG = 0, rA_spendBrkTax = 0
    if (rA_spendRem > 0) {
      rA_spendBrkP = Math.min(rA_brkBasis, rA_spendRem); rA_spendRem -= rA_spendBrkP
      rA_spendBrkG = Math.min(Math.max(0, rA_brokerage - rA_brkBasis), rA_spendRem); rA_spendRem -= rA_spendBrkG
      rA_spendBrkTax = rA_spendBrkG * (capitalGainsTaxPct || 0) / 100
      rA_brokerage = Math.max(0, rA_brokerage - rA_spendBrkP - rA_spendBrkG)
      rA_brkBasis  = Math.max(0, rA_brkBasis - rA_spendBrkP)
    }

    let rA_spendRothGainsDraw = 0
    if (rA_spendRem > 0 && rAgeAtY >= 59.5) { const avail = Math.max(0, rA_rothTotal - rA_rothContrib); rA_spendRothGainsDraw = Math.min(avail, rA_spendRem); rA_spendRem -= rA_spendRothGainsDraw; rA_rothTotal = Math.max(0, rA_rothTotal - rA_spendRothGainsDraw) }

    let rA_spendLumpP = 0, rA_spendLumpG = 0, rA_spendLumpTax = 0
    if (rA_spendRem > 0 && rA_lump > 0) {
      const g = Math.max(0, rA_lump - rA_lumpBasis)
      rA_spendLumpP = Math.min(rA_lumpBasis, rA_spendRem); rA_spendRem -= rA_spendLumpP
      rA_spendLumpG = Math.min(g, rA_spendRem); rA_spendRem -= rA_spendLumpG
      rA_spendLumpTax = rA_spendLumpG * (capitalGainsTaxPct || 0) / 100
      rA_lump = Math.max(0, rA_lump - rA_spendLumpP - rA_spendLumpG)
      rA_lumpBasis = Math.max(0, rA_lumpBasis - rA_spendLumpP)
    }

    // D covers A's spend deficit
    let rD_spendForA_hysa = 0, rD_spendForA_roth = 0, rD_spendForA_brkP = 0, rD_spendForA_brkG = 0
    let rD_spendForA_brkTax = 0, rD_spendForA_rothGains = 0, rD_spendForA_lumpP = 0, rD_spendForA_lumpG = 0, rD_spendForA_lumpTax = 0
    let rD_spendForA_total = 0
    if (rA_spendRem > 0) {
      let rem = rA_spendRem
      rD_spendForA_hysa = Math.min(rD_hysa, rem); rD_hysa = Math.max(0, rD_hysa - rD_spendForA_hysa); rem -= rD_spendForA_hysa
      if (rem > 0) { rD_spendForA_roth = Math.min(rD_rothContrib, rem); rem -= rD_spendForA_roth; rD_rothContrib = Math.max(0, rD_rothContrib - rD_spendForA_roth); rD_rothTotal = Math.max(0, rD_rothTotal - rD_spendForA_roth) }
      if (rem > 0 && rD_brokerage > 0) {
        rD_spendForA_brkP = Math.min(rD_brkBasis, rem); rem -= rD_spendForA_brkP
        rD_spendForA_brkG = Math.min(Math.max(0, rD_brokerage - rD_brkBasis), rem); rem -= rD_spendForA_brkG
        rD_spendForA_brkTax = rD_spendForA_brkG * (capitalGainsTaxPct || 0) / 100
        rD_brokerage = Math.max(0, rD_brokerage - rD_spendForA_brkP - rD_spendForA_brkG)
        rD_brkBasis  = Math.max(0, rD_brkBasis - rD_spendForA_brkP)
      }
      if (rem > 0 && rAgeAtY >= 59.5) { const avail = Math.max(0, rD_rothTotal - rD_rothContrib); rD_spendForA_rothGains = Math.min(avail, rem); rem -= rD_spendForA_rothGains; rD_rothTotal = Math.max(0, rD_rothTotal - rD_spendForA_rothGains) }
      if (rem > 0 && rD_lump > 0) {
        const g = Math.max(0, rD_lump - rD_lumpBasis)
        rD_spendForA_lumpP = Math.min(rD_lumpBasis, rem); rem -= rD_spendForA_lumpP
        rD_spendForA_lumpG = Math.min(g, rem); rem -= rD_spendForA_lumpG
        rD_spendForA_lumpTax = rD_spendForA_lumpG * (capitalGainsTaxPct || 0) / 100
        rD_lump = Math.max(0, rD_lump - rD_spendForA_lumpP - rD_spendForA_lumpG)
        rD_lumpBasis = Math.max(0, rD_lumpBasis - rD_spendForA_lumpP)
      }
      rD_spendForA_total = rD_spendForA_hysa + rD_spendForA_roth + rD_spendForA_brkP + rD_spendForA_brkG + rD_spendForA_rothGains + rD_spendForA_lumpP + rD_spendForA_lumpG
      rA_spendRem = rem
    }
    const rA_spendDeficit = rA_spendRem

    // ── A covers D's spending + housing deficit (D's buckets depleted) ──
    let rA_spendForD_hysa = 0, rA_spendForD_roth = 0, rA_spendForD_brkP = 0, rA_spendForD_brkG = 0
    let rA_spendForD_brkTax = 0, rA_spendForD_rothGains = 0, rA_spendForD_lumpP = 0, rA_spendForD_lumpG = 0, rA_spendForD_lumpTax = 0
    let rA_spendForD_total = 0
    if (rD_spendRem > 0) {
      let rem = rD_spendRem
      rA_spendForD_hysa = Math.min(rA_hysa, rem); rA_hysa = Math.max(0, rA_hysa - rA_spendForD_hysa); rem -= rA_spendForD_hysa
      if (rem > 0) { rA_spendForD_roth = Math.min(rA_rothContrib, rem); rem -= rA_spendForD_roth; rA_rothContrib = Math.max(0, rA_rothContrib - rA_spendForD_roth); rA_rothTotal = Math.max(0, rA_rothTotal - rA_spendForD_roth) }
      if (rem > 0 && rA_brokerage > 0) {
        rA_spendForD_brkP = Math.min(rA_brkBasis, rem); rem -= rA_spendForD_brkP
        rA_spendForD_brkG = Math.min(Math.max(0, rA_brokerage - rA_brkBasis), rem); rem -= rA_spendForD_brkG
        rA_spendForD_brkTax = rA_spendForD_brkG * (capitalGainsTaxPct || 0) / 100
        rA_brokerage = Math.max(0, rA_brokerage - rA_spendForD_brkP - rA_spendForD_brkG)
        rA_brkBasis  = Math.max(0, rA_brkBasis - rA_spendForD_brkP)
      }
      if (rem > 0 && rRothGainsUnlocked) { const avail = Math.max(0, rA_rothTotal - rA_rothContrib); rA_spendForD_rothGains = Math.min(avail, rem); rem -= rA_spendForD_rothGains; rA_rothTotal = Math.max(0, rA_rothTotal - rA_spendForD_rothGains) }
      if (rem > 0 && rA_lump > 0) {
        const g = Math.max(0, rA_lump - rA_lumpBasis)
        rA_spendForD_lumpP = Math.min(rA_lumpBasis, rem); rem -= rA_spendForD_lumpP
        rA_spendForD_lumpG = Math.min(g, rem); rem -= rA_spendForD_lumpG
        rA_spendForD_lumpTax = rA_spendForD_lumpG * (capitalGainsTaxPct || 0) / 100
        rA_lump = Math.max(0, rA_lump - rA_spendForD_lumpP - rA_spendForD_lumpG)
        rA_lumpBasis = Math.max(0, rA_lumpBasis - rA_spendForD_lumpP)
      }
      rA_spendForD_total = rA_spendForD_hysa + rA_spendForD_roth + rA_spendForD_brkP + rA_spendForD_brkG + rA_spendForD_rothGains + rA_spendForD_lumpP + rA_spendForD_lumpG
      rD_spendRem = rem
    }
    const rD_finalSpendDeficit = rD_spendRem

    const rD_rothEarnings = Math.max(0, rD_rothTotal - rD_rothContrib)
    const rA_rothEarnings = Math.max(0, rA_rothTotal - rA_rothContrib)
    dRentBucketSnapshots.push({
      roth: rD_rothContrib, rothTotal: rD_rothTotal, rothEarnings: rD_rothEarnings,
      brokerage: rD_brokerage, brokerageBasis: rD_brkBasis,
      hysa: rD_hysa, hysaMonthly: rD_hysaMonthly, hysaSpendDraw: rD_actualHYSADraw, hysaPreDraw: rD_hysaPreDraw,
      brkGainsPreHousing: rD_brkGainsPreHousing, brkPrincipalPreHousing: rD_brkPrincipalPreHousing,
      rothContribPreHousing: rD_rothContribPreHousing, rothGainsPreHousing: rD_rothGainsPreHousing,
      brkGainsPreSpend: rD_brkGainsPreSpend, brkPrincipalPreSpend: rD_brkPrincipalPreSpend,
      rothContribPreSpend: rD_rothContribPreSpend, rothGainsPreSpend: rD_rothGainsPreSpend,
      lumpPreSpend: rD_lumpPreSpend,
      spendBrkDraw: rD_spendBrkP + rD_spendBrkG, spendBrkPrincipal: rD_spendBrkP, spendBrkGains: rD_spendBrkG, spendBrkTax: rD_spendBrkTax,
      spendRothDraw: rD_spendRothDraw, spendRothGainsDraw: rD_spendRothGainsDraw, spendDeficit: rD_finalSpendDeficit,
      spendCoveredByA: rA_spendForD_total,
      lump: rD_lump, lumpBasis: rD_lumpBasis,
      spendLumpPrincipal: rD_spendLumpP, spendLumpGains: rD_spendLumpG, spendLumpTax: rD_spendLumpTax,
      portfolio: rD_rothContrib + rD_brokerage,
      drawFromRoth: rD_drawFromRoth, drawFromRothGains: rD_drawFromRothGains, drawFromBrokerage: rD_drawFromBrk, drawTax: rD_drawTax,
      brkPrincipalDraw: rD_brkPDraw, brkGainsDraw: rD_brkGDraw, drawFromLump: rD_drawFromLump,
      rothAlloc: Math.max(0, rD_rothAlloc - rD_rothRedForSpill / 12),
      brokerageAlloc: Math.max(0, rD_brkAlloc - rD_brkRedForSpill / 12),
      spillCashOffset: rD_spillCashOffset,
      spendForA: rD_spendForA_total,
      spendForA_hysa: rD_spendForA_hysa, spendForA_roth: rD_spendForA_roth,
      spendForA_brkPrincipal: rD_spendForA_brkP, spendForA_brkGains: rD_spendForA_brkG, spendForA_brkTax: rD_spendForA_brkTax,
      spendForA_rothGains: rD_spendForA_rothGains,
      spendForA_lumpPrincipal: rD_spendForA_lumpP, spendForA_lumpGains: rD_spendForA_lumpG, spendForA_lumpTax: rD_spendForA_lumpTax,
    })
    aRentBucketSnapshots.push({
      roth: rA_rothContrib, rothTotal: rA_rothTotal, rothEarnings: rA_rothEarnings,
      brokerage: rA_brokerage, brokerageBasis: rA_brkBasis,
      hysa: rA_hysa, hysaMonthly: rA_hysaMonthly, hysaSpendDraw: rA_actualHYSADraw, hysaPreDraw: rA_hysaPreDraw,
      brkGainsPreSpend: rA_brkGainsPreSpend, brkPrincipalPreSpend: rA_brkPrincipalPreSpend,
      rothContribPreSpend: rA_rothContribPreSpend, rothGainsPreSpend: rA_rothGainsPreSpend,
      spendBrkDraw: rA_spendBrkP + rA_spendBrkG, spendBrkPrincipal: rA_spendBrkP, spendBrkGains: rA_spendBrkG, spendBrkTax: rA_spendBrkTax,
      spendRothDraw: rA_spendRothDraw, spendRothGainsDraw: rA_spendRothGainsDraw, spendDeficit: rA_spendDeficit,
      spendCoveredByD: rD_spendForA_total,
      spendForD: rA_spendForD_total,
      spendForD_hysa: rA_spendForD_hysa, spendForD_roth: rA_spendForD_roth,
      spendForD_brkPrincipal: rA_spendForD_brkP, spendForD_brkGains: rA_spendForD_brkG, spendForD_brkTax: rA_spendForD_brkTax,
      spendForD_rothGains: rA_spendForD_rothGains,
      spendForD_lumpPrincipal: rA_spendForD_lumpP, spendForD_lumpGains: rA_spendForD_lumpG, spendForD_lumpTax: rA_spendForD_lumpTax,
      lump: rA_lump, lumpBasis: rA_lumpBasis, lumpPreSpend: rA_lumpPreSpend,
      spendLumpPrincipal: rA_spendLumpP, spendLumpGains: rA_spendLumpG, spendLumpTax: rA_spendLumpTax,
      portfolio: rA_rothContrib + rA_brokerage,
      rothAlloc: rA_rothAlloc, brokerageAlloc: rA_brkAlloc,
      drawFromRoth: rA_drawFromRoth, drawFromBrokerage: rA_drawFromBrk, drawTax: rA_drawTax,
      brkPrincipalDraw: rA_brkPDraw, brkGainsDraw: rA_brkGDraw,
      spillFromDRoth: rA_spillFromDRoth, spillFromDBrokerage: rA_spillFromDBrk, spillDTax: rA_spillDTax,
      spillFromDLump: rA_spillFromDLump, spillFromDRothGains: rA_spillFromDRothGains,
      spillCashOffset: rD_spillCashOffset,
    })
  }

  // Rent path FVs — use tracked bucket totals (includes spend draws, overages, etc.)
  const rD_lastSnap = dRentBucketSnapshots[iYrs - 1] || {}
  const rA_lastSnap = aRentBucketSnapshots[iYrs - 1] || {}
  const dRentInvestFV = (rD_lastSnap.rothTotal || 0) + (rD_lastSnap.brokerage || 0) + (rD_lastSnap.hysa || 0) + (rD_lastSnap.lump || 0)
  const aRentInvestFV = (rA_lastSnap.rothTotal || 0) + (rA_lastSnap.brokerage || 0) + (rA_lastSnap.hysa || 0) + (rA_lastSnap.lump || 0)

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
      water:       (effectiveUtilities.water       || 0) * utilFactor,
      trash:       (effectiveUtilities.trash       || 0) * utilFactor,
      electricity: (effectiveUtilities.electricity || 0) * utilFactor,
      waterInHoa:  effectiveUtilities.waterInHoa,
      trashInHoa:  effectiveUtilities.trashInHoa,
    }
    const phBase = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly:        house.hoaMonthly * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y) + maintAtYear(y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
    }
    const ph = applyRefi(phBase, y)
    if (y > effectivePaidOffYear) {
      // Loan paid off — only recurring non-PI costs remain
      const utilsOnlyCost = (projUtils.waterInHoa ? 0 : (projUtils.water || 0))
                          + (projUtils.trashInHoa ? 0 : (projUtils.trash || 0))
                          + (projUtils.electricity || 0)
      const nonPiMonthly = ph.propertyTaxAnnual / 12 + ph.hoaMonthly
                         + (ph.insuranceMonthly || 0) + utilsOnlyCost
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
  // Total portfolio at rY — use bucket-tracked balances for accuracy
  // If rY == iYrs, use the exact bucket final values; if rY > iYrs, extend with fvVariableAnnuity for extra years
  const dLumpAtRetire = rY <= iYrs
    ? ((dBucketSnapshots[rY - 1] || {}).lump ?? dLumpBuyFV_rY)
    : dLumpBuyFV_rY
  const aLumpAtRetire = rY <= iYrs
    ? ((aBucketSnapshots[rY - 1] || {}).lump ?? aLumpBuyFV_rY)
    : aLumpBuyFV_rY
  const dPortRetire = rY <= iYrs
    ? (((dBucketSnapshots[rY - 1] || {}).rothTotal || 0) + ((dBucketSnapshots[rY - 1] || {}).brokerage || 0) + ((dBucketSnapshots[rY - 1] || {}).hysa || 0)) + dLumpAtRetire + retireSaleBonus_d
    : fvVariableAnnuity(retireLeftoverD.slice(0, rY), investRate || 0) + dLumpAtRetire + retireSaleBonus_d
  const aPortRetire = rY <= iYrs
    ? (((aBucketSnapshots[rY - 1] || {}).rothTotal || 0) + ((aBucketSnapshots[rY - 1] || {}).brokerage || 0) + ((aBucketSnapshots[rY - 1] || {}).hysa || 0)) + aLumpAtRetire + retireSaleBonus_a
    : fvVariableAnnuity(retireLeftoverA.slice(0, rY), investRate || 0) + aLumpAtRetire + retireSaleBonus_a
  // Monthly withdrawal income
  const dWithdrawal = 0  // no longer used — spending driven by spendingCap
  const aWithdrawal = 0
  // Helper: net monthly rental income for "Rent & move" mode at year y
  // = gross rent received − ownership costs (HOA + tax + insurance + mortgage if still active)
  // forceRent=true bypasses the rentOut/saleYear guard (used by overseas scenario)
  function calcNetRentalAtYear(y, forceRent = false) {
    return calcRentalBreakdownAtYear(y, forceRent).net
  }

  function calcRentalBreakdownAtYear(y, forceRent = false) {
    const zero = { grossRent: 0, pi: 0, tax: 0, hoa: 0, insurance: 0, utils: 0, ownershipCost: 0, net: 0, mortgagePaidOff: false }
    if (!forceRent && (!rentOut || y < saleYear)) return zero
    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const pu = { water: (effectiveUtilities.water||0)*uf, trash: (effectiveUtilities.trash||0)*uf, electricity: (effectiveUtilities.electricity||0)*uf, waterInHoa: effectiveUtilities.waterInHoa, trashInHoa: effectiveUtilities.trashInHoa }
    const phBase = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct||0)/100, y),
      hoaMonthly:        house.hoaMonthly * Math.pow(1 + (hoaIncreasePct ||0)/100, y) + maintAtYear(y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
    }
    const ph = applyRefi(phBase, y)
    // Gross rent: use per-card value if set, otherwise estimate from bed count + market rents
    const baseRentEstimate = (house.monthlyRent || 0) > 0
      ? house.monthlyRent
      : house.beds <= 1
        ? (rent1BR || 2100)
        : house.beds <= 2
          ? (rent2BR || 2600)
          : (rent2BR || 2600) * (1 + (house.beds - 2) * 0.2)
    const grossRent = baseRentEstimate * Math.pow(1 + (usRentalIncrease || 0) / 100, y)
    const mortgagePaidOff = y > effectivePaidOffYear
    let pi = 0, tax = 0, hoa = 0, insurance = 0, utils = 0
    if (mortgagePaidOff) {
      utils = (pu.waterInHoa?0:(pu.water||0)) + (pu.trashInHoa?0:(pu.trash||0)) + (pu.electricity||0)
      tax = ph.propertyTaxAnnual / 12
      hoa = ph.hoaMonthly
      insurance = ph.insuranceMonthly || 0
    } else {
      const pBase = calcAMonthlyFromOwnership(ph, dDown, aDown, closingCostPct, dOwnTarget, pu)
      const p = calcTotalMonthly(ph, dDown, aDown, closingCostPct, Math.max(0, pBase+aMonthlyAdj), equalizeYears, pu)
      pi = p.pi; tax = p.tax; hoa = p.hoa; insurance = p.insurance; utils = p.utilsTotal
    }
    const ownershipCost = pi + tax + hoa + insurance + utils
    const netPreTax = grossRent - ownershipCost
    const net = netPreTax > 0 ? netPreTax * (1 - (rentalIncomeTaxPct || 0) / 100) : netPreTax
    return { grossRent, pi, tax, hoa, insurance, utils, ownershipCost, net, netPreTax, mortgagePaidOff }
  }

  // Helper: combined housing cost at an arbitrary year y
  function calcCombinedHousingAtYear(y) {
    return calcHousingBreakdownAtYear(y).total
  }

  function calcHousingBreakdownAtYear(y) {
    const zero = { pi: 0, tax: 0, hoa: 0, insurance: 0, utils: 0, total: 0, mortgagePaidOff: false }
    if (sellAndMove && y >= saleYear) return zero
    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const pu = {
      water: (effectiveUtilities.water || 0) * uf, trash: (effectiveUtilities.trash || 0) * uf,
      electricity: (effectiveUtilities.electricity || 0) * uf,
      waterInHoa: effectiveUtilities.waterInHoa, trashInHoa: effectiveUtilities.trashInHoa,
    }
    const phBase = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly:        house.hoaMonthly * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y) + maintAtYear(y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
    }
    const ph = applyRefi(phBase, y)
    const mortgagePaidOff = y > effectivePaidOffYear
    if (mortgagePaidOff) {
      const utils = (pu.waterInHoa ? 0 : (pu.water || 0))
                  + (pu.trashInHoa ? 0 : (pu.trash || 0))
                  + (pu.electricity || 0)
      const tax = ph.propertyTaxAnnual / 12
      const hoa = ph.hoaMonthly
      const insurance = ph.insuranceMonthly || 0
      const total = tax + hoa + insurance + utils
      return { pi: 0, tax, hoa, insurance, utils, total, mortgagePaidOff }
    }
    const pBase = calcAMonthlyFromOwnership(ph, dDown, aDown, closingCostPct, dOwnTarget, pu)
    const pEff  = Math.max(0, pBase + aMonthlyAdj)
    const p     = calcTotalMonthly(ph, dDown, aDown, closingCostPct, pEff, equalizeYears, pu)
    const inRepay = y <= equalizeYears
    const total = (inRepay ? p.dDuringRepay : p.dAfterRepay) + (inRepay ? p.aNetDuring : p.aNetAfter)
    const renoPi = renoLoanAdder > 0 ? Math.round(calcMonthlyPI(renoLoanAdder, house.interestRate, house.loanTermYears)) : 0
    return { pi: p.pi, tax: p.tax, hoa: p.hoa, insurance: p.insurance, utils: p.utilsTotal, total, mortgagePaidOff, renoPi }
  }

  const combinedHousingAtRY = calcCombinedHousingAtYear(rY)
  const dHousingAtRY = combinedHousingAtRY * (dOwnTarget / 100)
  const aHousingAtRY = combinedHousingAtRY * (1 - dOwnTarget / 100)
  const dAfterHousing = dWithdrawal - dHousingAtRY
  const aAfterHousing = aWithdrawal - aHousingAtRY

  // Housing + pool balance snapshots: year-by-year simulation from rY to age 80
  const combinedPortRetire = dPortRetire + aPortRetire
  const gr = (investRate || 0) / 100

  // Bucket FV at retirement — used for blended withdrawal tax
  const dRothFV      = fvVariableAnnuity(dYearlyRoth.slice(0, rY), investRate || 0)
  const dTradFV      = fvVariableAnnuity(dYearlyTrad.slice(0, rY), investRate || 0)
  const dBrokerageFV = fvVariableAnnuity(dYearlyBrokerage.slice(0, rY), investRate || 0)
  const aRothFV      = fvVariableAnnuity(aYearlyRoth.slice(0, rY), investRate || 0)
  const aTradFV      = fvVariableAnnuity(aYearlyTrad.slice(0, rY), investRate || 0)
  const aBrokerageFV = fvVariableAnnuity(aYearlyBrokerage.slice(0, rY), investRate || 0)
  const totalBucketFV = dRothFV + dTradFV + dBrokerageFV + aRothFV + aTradFV + aBrokerageFV
  // Fractions of retirement pool by bucket type
  const tradFraction      = totalBucketFV > 0 ? (dTradFV + aTradFV) / totalBucketFV : 0.5
  const brokerageFraction = totalBucketFV > 0 ? (dBrokerageFV + aBrokerageFV) / totalBucketFV : 0.1
  // rothFraction = 1 - tradFraction - brokerageFraction

  // Blended grossUp: Roth fraction = 0% tax, Trad fraction = location tax, Brokerage fraction = cap gains tax
  // grossUp(locationTaxPct) → blends based on actual bucket ratios
  const blendedTaxRate = (locationTaxPct) =>
    tradFraction * (locationTaxPct / 100) + brokerageFraction * (capitalGainsTaxPct || 0) / 100
  const grossUp = (locationTaxPct) => {
    const effective = blendedTaxRate(locationTaxPct)
    return effective === 0 ? 1 : 1 / Math.max(0.01, 1 - effective)
  }
  const retireAge = (currentAge || 33) + rY
  const inflFactorRY = Math.pow(1 + (inflationRate || 3) / 100, rY)
  const maxOffset = Math.max(0, (retireMaxAge || 100) - retireAge)
  const snapOffsets = []
  for (let o = 0; o <= maxOffset; o += 3) snapOffsets.push(o)
  // Per-option tax gross-up using blended bucket rates
  // Location rates feed only the Traditional 401k fraction; Roth = 0%, Brokerage = capitalGainsTaxPct
  const taxGrossUp          = grossUp(28)   // Option 1: stay in CA (~28% fed+CA)
  const overseasTaxGrossUp  = grossUp(15)   // Options 2 & 3: overseas (fed only ~15%)
  const relocateTaxGrossUp  = grossUp(20)   // Options 4–7: US relocation (~20% fed+lower state)
  const rentvestTaxGrossUp  = grossUp(20)   // Option 8: rentvest property location
  // Social Security offset: SS benefit (today's $) grows with inflation (COLA), kicks in at ssClaimAge
  // Reduces the amount that must be pulled from the pool each year
  const ssClaimYr = (ssClaimAge || 67) - (currentAge || 33)  // year index when SS starts
  const combinedSS = (dSS || 0) + (aSS || 0)  // combined monthly benefit in today's $
  const ssOffsetAtYear = yr => {
    if (yr < ssClaimYr) return 0
    const inflFactor = Math.pow(1 + (inflationRate || 3) / 100, yr)
    return combinedSS * inflFactor * 12  // annual SS income in future dollars
  }
  // Late life care cost: added to pool withdrawals from careStartAge until age 95
  // 'stay' = Opt 1 (CA home), 'relocate' = Opts 4-7 (cheaper US), 'overseas' = Opts 2-3, 8
  const careStartYr = (careStartAge || 82) - (currentAge || 33)
  const careAtYear = (yr, type = 'stay') => {
    if (yr < careStartYr) return 0
    const inflFactor = Math.pow(1 + (inflationRate || 3) / 100, yr)
    const base = type === 'overseas' ? (careMonthlyOverseas || 0)
               : type === 'relocate' ? (careMonthlyRelocateUS || 0)
               : (careMonthlyStay || 0)
    return base * inflFactor * 12  // annual care cost in future dollars
  }
  // Pool simulation: each year withdraw exactly (spendingCap + housing) inflation-adjusted,
  // offset by any rental income. Same target for all houses — fair comparison.
  // "Stay in house" simulation — live in owned home, pay housing + spending, no rental income
  const combinedSpendCap = (spendingCap || 0) + (aSpendingCap || 0)
  const simPoolByOffset = [combinedPortRetire]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const inflFactorYr = Math.pow(1 + (inflationRate || 3) / 100, yr)
    const spendInflFactorYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const housingYr = calcCombinedHousingAtYear(yr)
    const grossWithdrawal = (combinedSpendCap * taxGrossUp * spendInflFactorYr + housingYr) * 12
    const netFromPool = Math.max(0, grossWithdrawal + careAtYear(yr, 'stay') - ssOffsetAtYear(yr))
    simPoolByOffset.push(simPoolByOffset[n - 1] * (1 + gr) - netFromPool)
  }
  // Overseas pool simulation — always assumes: keep US house, rent it out
  const simPoolOverseas = [combinedPortRetire]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const spendInflYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const overseasRentFactor = Math.pow(1 + (overseasRentIncrease || 0) / 100, yr)
    const overseasHousingNominal = (overseasCost || 0) * overseasRentFactor * 12
    const netRentalYr = calcNetRentalAtYear(yr, true)
    const care = careAtYear(yr, 'overseas')
    const housingOrCare = care > 0 ? care : overseasHousingNominal
    const targetAnnual = (overseasSpendingCap || 0) * overseasTaxGrossUp * spendInflYr * 12 + housingOrCare
    const grossFromPool = Math.max(0, targetAnnual - Math.max(0, netRentalYr * 12))
    const netFromPool = Math.max(0, grossFromPool - ssOffsetAtYear(yr))
    simPoolOverseas.push(simPoolOverseas[n - 1] * (1 + gr) - netFromPool)
  }

  // Overseas pool simulation — rent path (no US house, no rental income)
  const rentCombinedPoolAtRetire = dRentInvestFV + aRentInvestFV
  const simPoolRentOverseas = [rentCombinedPoolAtRetire]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const spendInflYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const overseasRentFactor = Math.pow(1 + (overseasRentIncrease || 0) / 100, yr)
    const overseasHousingNominal = (overseasCost || 0) * overseasRentFactor * 12
    const care = careAtYear(yr, 'overseas')
    const housingOrCare = care > 0 ? care : overseasHousingNominal
    const targetAnnual = (overseasSpendingCap || 0) * overseasTaxGrossUp * spendInflYr * 12 + housingOrCare
    simPoolRentOverseas.push(simPoolRentOverseas[n - 1] * (1 + gr) - Math.max(0, targetAnnual - ssOffsetAtYear(yr)))
  }

  // Keep renting in US — rent path, stay in US (no owned house)
  const simPoolRentUS = [rentCombinedPoolAtRetire]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const spendInflYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, yr)
    const rentUSHousingYr = (calcRentAtYear(yr) + utilsTotal2 * uf + (rentParking || 0) * uf) * 12
    const targetAnnual = combinedSpendCap * relocateTaxGrossUp * spendInflYr * 12 + rentUSHousingYr
    simPoolRentUS.push(simPoolRentUS[n - 1] * (1 + gr) - Math.max(0, targetAnnual + careAtYear(yr, 'relocate') - ssOffsetAtYear(yr)))
  }

  // Sell & Relocate — sell house at retirement, add proceeds to combined pool
  // New location housing cost grows with inflation; spending cap inflated too
  const retireAppreciatedPrice = (house.expectedSalePrice || 0) > 0
    ? (house.expectedSalePrice || 0)
    : (house.price || 0) * Math.pow(1 + (appreciationPct || 0) / 100, rY)
  const sellingCosts = retireAppreciatedPrice * 0.06
  const retireSellRemainingLoan = rY >= effectivePaidOffYear
    ? 0
    : hasRefi && rY >= (refiYear || 0)
      ? calcRemainingBalance(refiLoanAmount, refiRate, resolvedRefiTerm, (rY - (refiYear || 0)) * 12)
      : calcRemainingBalance(loanAmount, house.interestRate, house.loanTermYears, rY * 12)
  const sellProceeds = retireAppreciatedPrice - sellingCosts - retireSellRemainingLoan
  // Capital gains tax on sale
  const costBasis = house.price || 0
  const capitalGain = Math.max(0, sellProceeds - costBasis - (primaryResidenceExclusion || 0))
  const capitalGainsTax = capitalGain * (capitalGainsTaxPct || 0) / 100
  const sellProceedsAfterTax = sellProceeds - capitalGainsTax
  const sellRelocateStartPool = combinedPortRetire + sellProceedsAfterTax

  // Overseas sell path — sell US house, add proceeds to pool, no rental income
  const overseasSellStartPool = combinedPortRetire + sellProceedsAfterTax
  const simPoolOverseasSell = [overseasSellStartPool]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const spendInflYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const overseasRentFactor = Math.pow(1 + (overseasRentIncrease || 0) / 100, yr)
    const overseasHousingNominal = (overseasCost || 0) * overseasRentFactor * 12
    const care = careAtYear(yr, 'overseas')
    const housingOrCare = care > 0 ? care : overseasHousingNominal
    const targetAnnual = (overseasSpendingCap || 0) * overseasTaxGrossUp * spendInflYr * 12 + housingOrCare
    const netFromPool = Math.max(0, targetAnnual - ssOffsetAtYear(yr))
    simPoolOverseasSell.push(simPoolOverseasSell[n - 1] * (1 + gr) - netFromPool)
  }
  const simPoolSellRelocate = [sellRelocateStartPool]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const inflFactorYr = Math.pow(1 + (inflationRate || 3) / 100, yr)
    const spendInflYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const relocateHousingYr = (relocateMonthlyCost || 0) * inflFactorYr * 12
    const targetAnnual = combinedSpendCap * relocateTaxGrossUp * spendInflYr * 12 + relocateHousingYr
    simPoolSellRelocate.push(simPoolSellRelocate[n - 1] * (1 + gr) - Math.max(0, targetAnnual + careAtYear(yr, 'relocate') - ssOffsetAtYear(yr)))
  }

  // Sell & Buy — sell current house, buy new home at new location with proceeds as down payment
  // New home price nominal = today's price inflated to retirement year
  const newHomePriceNominal = (relocateBuyPrice || 0) * inflFactorRY
  const newHomeDownAmt = newHomePriceNominal * ((relocateBuyDownPct || 20) / 100)
  const newHomeLoan = newHomePriceNominal - newHomeDownAmt
  const newHomePI = calcMonthlyPI(newHomeLoan, relocateMortgageRate || 7, 30)
  // Base monthly costs at retirement year (tax at 1.25% of value, maintenance at maintenancePct)
  const newHomeTaxBase = newHomePriceNominal * 0.0125 / 12
  const newHomeMainBase = newHomePriceNominal * ((maintenancePct || 1) / 100) / 12
  // Pool after purchase: proceeds go toward down payment first, then leftover + remaining pool
  const sellBuyNetProceeds = sellProceedsAfterTax - newHomeDownAmt
  const sellBuyStartPool = combinedPortRetire + sellBuyNetProceeds
  const simPoolSellBuy = [sellBuyStartPool]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const inflFactorYr = Math.pow(1 + (inflationRate || 3) / 100, yr)
    const spendInflYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const yearsInNewHome = n
    const paidOffNewHome = yearsInNewHome >= 30
    const newHomeMortgageYr = paidOffNewHome ? 0 : newHomePI
    const newHomeTaxYr = newHomeTaxBase * Math.pow(1 + (taxIncreasePct || 0) / 100, yearsInNewHome)
    const newHomeMainYr = newHomeMainBase * Math.pow(1 + (inflationRate || 3) / 100, yearsInNewHome)
    const housingYr = (newHomeMortgageYr + newHomeTaxYr + newHomeMainYr) * 12
    const targetAnnual = combinedSpendCap * relocateTaxGrossUp * spendInflYr * 12 + housingYr
    simPoolSellBuy.push(simPoolSellBuy[n - 1] * (1 + gr) - Math.max(0, targetAnnual + careAtYear(yr, 'relocate') - ssOffsetAtYear(yr)))
  }

  // Sell & Buy All Cash — pay full price, no mortgage, lower monthly costs but smaller pool
  const sellBuyCashStartPool = combinedPortRetire + sellProceedsAfterTax - newHomePriceNominal
  const simPoolSellBuyCash = [sellBuyCashStartPool]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const inflFactorYr = Math.pow(1 + (inflationRate || 3) / 100, yr)
    const spendInflYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const yearsInNewHome = n
    const newHomeTaxYr = newHomeTaxBase * Math.pow(1 + (taxIncreasePct || 0) / 100, yearsInNewHome)
    const newHomeMainYr = newHomeMainBase * Math.pow(1 + (inflationRate || 3) / 100, yearsInNewHome)
    const housingYr = (newHomeTaxYr + newHomeMainYr) * 12  // no mortgage
    const targetAnnual = combinedSpendCap * relocateTaxGrossUp * spendInflYr * 12 + housingYr
    simPoolSellBuyCash.push(simPoolSellBuyCash[n - 1] * (1 + gr) - Math.max(0, targetAnnual + careAtYear(yr, 'relocate') - ssOffsetAtYear(yr)))
  }

  // ── Option 8: Rentvest ──────────────────────────────────────────────────
  // Buy cheap property now, rent it out, rent Bay Area, move in at retirement
  const rentvestDownAmt = (rentvestPrice || 0) * ((rentvestDown || 20) / 100)
  const rentvestLoanAmt = (rentvestPrice || 0) - rentvestDownAmt
  const rentvestPI = rentvestLoanAmt > 0 ? calcMonthlyPI(rentvestLoanAmt, rentvestMortgageRate || 7.5, 30) : 0
  const rentvestTaxBase = (rentvestPrice || 0) * 0.0125 / 12  // 1.25% annual property tax
  const rentvestMainBase = (rentvestPrice || 0) * ((maintenancePct || 1) / 100) / 12

  // Net monthly cash flow from rental property at year y (positive = profit, negative = you subsidize)
  function rentvestNetCF(y) {
    const income = (rentvestRent || 0) * Math.pow(1 + (rentvestRentGrowth || 3) / 100, y)
    const netIncome = income * (1 - (rentvestMgmtFee || 0) / 100)
    const isPaidOff = y >= 30
    const pi = isPaidOff ? 0 : rentvestPI
    const tax = rentvestTaxBase * Math.pow(1 + (taxIncreasePct || 0) / 100, y)
    const maint = rentvestMainBase * Math.pow(1 + (inflationRate || 3) / 100, y)
    return netIncome - pi - tax - maint
  }

  // Pre-retirement pool: combined cash minus down payment, then invest year by year
  // Bay Area rent costs from existing dRentYearlyInvest/aRentYearlyInvest (rent path)
  // + rental property net cash flow added to investable amount
  const rentvestStartCash = (dCashBudget || 0) + (aCashBudget || 0) - rentvestDownAmt
  const rentvestLumpFV = rentvestStartCash * Math.pow(1 + (investRate || 0) / 100, iYrs)
  const rentvestYearlyContrib = []
  for (let y = 1; y <= iYrs; y++) {
    const dContrib = dRentYearlyInvest[y - 1] ?? 0
    const aContrib = aRentYearlyInvest[y - 1] ?? 0
    rentvestYearlyContrib.push(dContrib + aContrib + rentvestNetCF(y))
  }
  const rentvestPoolAtRetire = rentvestLumpFV + fvVariableAnnuity(rentvestYearlyContrib, investRate || 0)

  // At retirement: move in, only pay tax + maintenance (no rent, no Bay Area mortgage)
  const simPoolRentvest = [rentvestPoolAtRetire]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const spendInflYr = Math.pow(1 + (spendInflationRate || 3) / 100, yr)
    const yearsOwned = yr
    const rvTax = rentvestTaxBase * Math.pow(1 + (taxIncreasePct || 0) / 100, yearsOwned)
    const rvMaint = rentvestMainBase * Math.pow(1 + (inflationRate || 3) / 100, yearsOwned)
    const targetAnnual = combinedSpendCap * rentvestTaxGrossUp * spendInflYr * 12 + (rvTax + rvMaint) * 12
    simPoolRentvest.push(simPoolRentvest[n - 1] * (1 + gr) - Math.max(0, targetAnnual + careAtYear(yr, 'relocate') - ssOffsetAtYear(yr)))
  }

  // Depletion summary — computed for all 3 care scenarios for card header display
  const calcDepletion = (poolArr) => {
    for (let n = 1; n < poolArr.length; n++) {
      if (poolArr[n] <= 0) {
        const depleteAge = retireAge + n
        const prevPool = poolArr[n - 1]
        const inflFactor = Math.pow(1 + (inflationRate || 3) / 100, rY + n - 1)
        return { depleted: true, age: depleteAge, prevPool: Math.round(prevPool), prevPoolReal: Math.round(prevPool / inflFactor), prevAge: depleteAge - 1 }
      }
    }
    const endOffset = Math.min(95 - retireAge, maxOffset)
    const endPool = poolArr[endOffset] ?? poolArr[poolArr.length - 1]
    const endAge = retireAge + endOffset
    const inflFactor = Math.pow(1 + (inflationRate || 3) / 100, rY + endOffset)
    return { depleted: false, age: endAge, pool: Math.round(endPool), poolReal: Math.round(endPool / inflFactor) }
  }
  const depletionInfo = calcDepletion(simPoolByOffset)
  const depletionInfoRelocate = calcDepletion(simPoolSellRelocate)
  const depletionInfoOverseas = calcDepletion(simPoolOverseas)
  const depletionInfoOverseasSell = calcDepletion(simPoolOverseasSell)
  const rentvestGrossRentToday = (rentvestRent || 0) * (1 - (rentvestMgmtFee || 0) / 100)
  const rentvestNetCFToday = rentvestNetCF(0)
  const rentvestCFAtRetire = rentvestNetCF(rY)

  const retireHousingSnaps = snapOffsets.map(offset => {
    const y = rY + offset
    const housingBreakdown = calcHousingBreakdownAtYear(y)
    const housing = housingBreakdown.total
    const netRental = calcNetRentalAtYear(y)
    const poolRemaining = simPoolByOffset[offset] ?? 0
    const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
    const spendInflFactorY = Math.pow(1 + (spendInflationRate || 3) / 100, y)
    const afterHousing = combinedSpendCap * spendInflFactorY
    const ssIncome = ssOffsetAtYear(y) / 12  // monthly SS income at this year
    const careUS = careAtYear(y, 'stay') / 12        // monthly stay-in-home care cost
    const careRelocate = careAtYear(y, 'relocate') / 12  // monthly US relocate care cost
    const careOverseas = careAtYear(y, 'overseas') / 12  // monthly overseas care cost

    // Overseas scenario
    const overseasRentFactor = Math.pow(1 + (overseasRentIncrease || 0) / 100, y)
    const overseasRentNominal = (overseasCost || 0) * overseasRentFactor
    // Care is all-inclusive — replaces housing during care years
    const overseasHousingNominal = careOverseas > 0 ? careOverseas : overseasRentNominal
    const rentalBreakdown = calcRentalBreakdownAtYear(y, true)
    const overseasNetRental = rentalBreakdown.net
    const overseasAfterHousing = (overseasSpendingCap || 0) * spendInflFactorY
    const overseasAfterToday = overseasAfterHousing / inflFactorY
    const overseasUSEquiv = overseasAfterToday / ((colRatio || 40) / 100)
    const overseasPoolRemaining = simPoolOverseas[offset] ?? 0
    const overseasPoolReal = overseasPoolRemaining / inflFactorY

    // Rent-path overseas scenario (no rental income)
    const rentOverseasPoolRemaining = simPoolRentOverseas[offset] ?? 0
    const rentOverseasPoolReal = rentOverseasPoolRemaining / inflFactorY

    // Sell house + move overseas scenario
    const overseasSellHousingMonthly = careOverseas > 0 ? careOverseas : (overseasCost || 0) * Math.pow(1 + (overseasRentIncrease || 0) / 100, y)
    const overseasSellAfterHousing = (overseasSpendingCap || 0) * spendInflFactorY
    const overseasSellPoolRemaining = simPoolOverseasSell[offset] ?? 0
    const overseasSellPoolReal = overseasSellPoolRemaining / inflFactorY

    // Keep renting in US scenario
    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const rentUSHousingMonthly = calcRentAtYear(y) + utilsTotal2 * uf + (rentParking || 0) * uf
    const rentUSAfterHousing = combinedSpendCap * spendInflFactorY
    const rentUSPoolRemaining = simPoolRentUS[offset] ?? 0
    const rentUSPoolReal = rentUSPoolRemaining / inflFactorY

    // Sell & Relocate scenario
    const sellRelocateHousingMonthly = (relocateMonthlyCost || 0) * inflFactorY
    const sellRelocateAfterHousing = combinedSpendCap * spendInflFactorY
    const sellRelocatePoolRemaining = simPoolSellRelocate[offset] ?? 0
    const sellRelocatePoolReal = sellRelocatePoolRemaining / inflFactorY

    // Sell & Buy scenario
    const yearsInNewHome = offset
    const paidOffNewHome = yearsInNewHome >= 30
    const sellBuyMortgageMonthly = paidOffNewHome ? 0 : newHomePI
    const sellBuyTaxMonthly = newHomeTaxBase * Math.pow(1 + (taxIncreasePct || 0) / 100, yearsInNewHome)
    const sellBuyMainMonthly = newHomeMainBase * Math.pow(1 + (inflationRate || 3) / 100, yearsInNewHome)
    const sellBuyHousingMonthly = sellBuyMortgageMonthly + sellBuyTaxMonthly + sellBuyMainMonthly
    const sellBuyAfterHousing = combinedSpendCap * spendInflFactorY
    const sellBuyPoolRemaining = simPoolSellBuy[offset] ?? 0
    const sellBuyPoolReal = sellBuyPoolRemaining / inflFactorY

    // Sell & Buy All Cash scenario
    const sellBuyCashTaxMonthly = newHomeTaxBase * Math.pow(1 + (taxIncreasePct || 0) / 100, yearsInNewHome)
    const sellBuyCashMainMonthly = newHomeMainBase * Math.pow(1 + (inflationRate || 3) / 100, yearsInNewHome)
    const sellBuyCashHousingMonthly = sellBuyCashTaxMonthly + sellBuyCashMainMonthly
    const sellBuyCashAfterHousing = combinedSpendCap * spendInflFactorY
    const sellBuyCashPoolRemaining = simPoolSellBuyCash[offset] ?? 0
    const sellBuyCashPoolReal = sellBuyCashPoolRemaining / inflFactorY

    return { y, housing, housingBreakdown, netRental, poolRemaining, afterHousing, ssIncome, careUS, careRelocate, careOverseas,
      overseasHousingNominal, overseasNetRental, overseasAfterHousing, overseasAfterToday,
      overseasUSEquiv, overseasPoolRemaining, overseasPoolReal, rentalBreakdown,
      rentOverseasPoolRemaining, rentOverseasPoolReal,
      rentUSHousingMonthly, rentUSAfterHousing, rentUSPoolRemaining, rentUSPoolReal,
      overseasSellHousingMonthly, overseasSellAfterHousing, overseasSellPoolRemaining, overseasSellPoolReal,
      sellRelocateHousingMonthly, sellRelocateAfterHousing, sellRelocatePoolRemaining, sellRelocatePoolReal,
      sellBuyMortgageMonthly, sellBuyTaxMonthly, sellBuyMainMonthly, sellBuyHousingMonthly,
      sellBuyAfterHousing, sellBuyPoolRemaining, sellBuyPoolReal,
      sellBuyCashHousingMonthly, sellBuyCashAfterHousing, sellBuyCashPoolRemaining, sellBuyCashPoolReal,
      // Rentvest scenario
      rentvestHousingMonthly: rentvestTaxBase * Math.pow(1 + (taxIncreasePct || 0) / 100, y)
                            + rentvestMainBase * Math.pow(1 + (inflationRate || 3) / 100, y),
      rentvestAfterHousing: combinedSpendCap * spendInflFactorY,
      rentvestPoolRemaining: simPoolRentvest[offset] ?? 0,
      rentvestPoolReal: (simPoolRentvest[offset] ?? 0) / inflFactorY }
  })
  const rentBaseRentYr1 = calcRentAtYear(1)
  const rentBaseRentFinal = calcRentAtYear(iYrs)

  // Cumulative investment-only value at each 3-year snapshot (no house sale — that's shown separately)
  const investSnapshots = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30].filter(y => y <= iYrs).map(snapY => ({
    y: snapY,
    dFV: (dBucketSnapshots[snapY - 1] || {}).portfolio || 0,
    aFV: (aBucketSnapshots[snapY - 1] || {}).portfolio || 0,
    isSaleYear: sellAndMove && snapY >= saleYear && (snapY - saleYear) < 3,
    housingBreakdown: calcHousingBreakdownAtYear(snapY),
  }))

  // Projected monthly costs every 3 years (compounded tax & HOA)
  const costIncreaseVisible = taxIncreasePct > 0 || hoaIncreasePct > 0
  const projYears = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30].filter(y => y <= Math.min(saleYear, house.loanTermYears))
  const projRows = costIncreaseVisible ? projYears.map(y => {
    const utilFactor = Math.pow(1 + (utilIncreaseRate || 0) / 100, y)
    const projUtils = {
      water: (effectiveUtilities.water || 0) * utilFactor,
      trash: (effectiveUtilities.trash || 0) * utilFactor,
      electricity: (effectiveUtilities.electricity || 0) * utilFactor,
      waterInHoa: effectiveUtilities.waterInHoa,
      trashInHoa: effectiveUtilities.trashInHoa,
    }
    const phBase = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly:        house.hoaMonthly * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y) + maintAtYear(y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
    }
    const ph = applyRefi(phBase, y)
    const pBase = calcAMonthlyFromOwnership(ph, dDown, aDown, closingCostPct, dOwnTarget, projUtils)
    const pEff = Math.max(0, pBase + aMonthlyAdj)
    const p = calcTotalMonthly(ph, dDown, aDown, closingCostPct, pEff, equalizeYears, projUtils)
    const inRepay = y <= equalizeYears
    return { y, dNet: inRepay ? p.dDuringRepay : p.dAfterRepay, aNet: inRepay ? p.aNetDuring : p.aNetAfter, total: p.total }
  }) : []

  // Post-refi monthly cost snapshot (at refiYear, with compounded tax/HOA/ins)
  const refiMonthly = (() => {
    if (!hasRefi) return null
    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, refiYear)
    const refiUtils = {
      water: (effectiveUtilities.water || 0) * uf, trash: (effectiveUtilities.trash || 0) * uf,
      electricity: (effectiveUtilities.electricity || 0) * uf,
      waterInHoa: effectiveUtilities.waterInHoa, trashInHoa: effectiveUtilities.trashInHoa,
    }
    const refiPhBase = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, refiYear),
      hoaMonthly:        house.hoaMonthly * Math.pow(1 + (hoaIncreasePct  || 0) / 100, refiYear) + maintAtYear(refiYear),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, refiYear),
    }
    const refiPh = applyRefi(refiPhBase, refiYear)
    const pBase = calcAMonthlyFromOwnership(refiPh, dDown, aDown, closingCostPct, dOwnTarget, refiUtils)
    const p = calcTotalMonthly(refiPh, dDown, aDown, closingCostPct, Math.max(0, pBase + aMonthlyAdj), equalizeYears, refiUtils)
    return p
  })()

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
        {/* Renovation badge on image */}
        {renoEditing ? (
          <div className="reno-img-editor" onClick={e => e.stopPropagation()}>
            <span>🔨 $</span>
            <input
              type="number" min={0} step={1000}
              value={renoInput}
              autoFocus
              className="reno-img-input"
              onChange={e => setRenoInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onUpdateField({ renovationBudget: Number(renoInput) || 0 })
                  setRenoEditing(false)
                } else if (e.key === 'Escape') {
                  setRenoEditing(false)
                }
              }}
            />
            <button className="reno-img-save" onClick={() => { onUpdateField({ renovationBudget: Number(renoInput) || 0 }); setRenoEditing(false) }}>✓</button>
            <button className="reno-img-cancel" onClick={() => setRenoEditing(false)}>✕</button>
          </div>
        ) : (
          <button
            className="reno-img-badge"
            title="Set renovation budget (rolled into loan)"
            onClick={() => { setRenoInput(String(house.renovationBudget || 0)); setRenoEditing(true) }}
          >
            🔨 {(house.renovationBudget || 0) > 0 ? fmt(house.renovationBudget) : 'Reno?'}
          </button>
        )}
      </div>

      <div className="card-body">
        <p className="card-address">{house.address}</p>
        <div className="card-meta-row">
          <div className="card-meta">
            {house.beds  && <span>{house.beds} bd</span>}
            {house.baths && <span>{house.baths} ba</span>}
            {house.sqft  && <span>{house.sqft.toLocaleString()} sqft</span>}
            {house.isTownhome && <span style={{ color: '#10b981', fontWeight: 600 }}>🏘 Townhome</span>}
          </div>
          {house.link && (
            <a className="card-link" href={house.link} target="_blank" rel="noopener noreferrer">View ↗</a>
          )}
        </div>


        {/* Notes — editable, shown above depletion summary */}
        <div className="card-notes-section">
          {notesEditing ? (
            <div className="card-notes-edit">
              <textarea
                className="card-notes-textarea"
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                placeholder="Add notes about this house…"
                autoFocus
                rows={3}
              />
              <div className="card-notes-edit-actions">
                <button className="card-notes-save" onClick={() => { onUpdateField({ notes: notesInput }); setNotesEditing(false) }}>Save</button>
                <button className="card-notes-cancel" onClick={() => { setNotesInput(house.notes || ''); setNotesEditing(false) }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="card-notes-display" onClick={() => { setNotesInput(house.notes || ''); setNotesEditing(true) }}>
              {house.notes
                ? <span className="card-notes-text">📝 {house.notes}</span>
                : <span className="card-notes-placeholder">+ add notes</span>
              }
            </div>
          )}
        </div>

        {/* Depletion summary — shown above Total Monthly when retire mode is on */}
        {retireMode && (() => {
          const baseRentToday = (house.monthlyRent || 0) > 0
            ? house.monthlyRent
            : house.beds <= 1 ? (rent1BR || 2100)
            : house.beds <= 2 ? (rent2BR || 2600)
            : (rent2BR || 2600) * (1 + (house.beds - 2) * 0.2)
          return (
          <div className="card-depletion-banner">
            {[
              { label: 'Stay in CA care', info: depletionInfo, sub: null },
              { label: 'US relocate care · sell house', info: depletionInfoRelocate, subEl: (
                <span className="card-depletion-rent-row">
                  sell for
                  <input
                    type="number"
                    className="card-depletion-rent-input"
                    value={sellPriceInput}
                    placeholder={String(Math.round(retireAppreciatedPrice))}
                    onChange={e => {
                      setSellPriceInput(e.target.value)
                      onUpdateField({ expectedSalePrice: Number(e.target.value) || 0 })
                    }}
                  />
                  <span style={{ color: '#9ca3af' }}>→ net {fmt(Math.round(sellProceedsAfterTax))}{retireSellRemainingLoan > 0 ? ` (−${fmt(Math.round(sellingCosts))} costs · −${fmt(Math.round(retireSellRemainingLoan))} loan` : ` (−${fmt(Math.round(sellingCosts))} costs`}{capitalGainsTax > 0 ? ` · −${fmt(Math.round(capitalGainsTax))} tax)` : ')'}</span>
                </span>
              )},
              { label: 'Overseas care · rent house out', info: depletionInfoOverseas, subEl: (
                <span className="card-depletion-rent-row">
                  rent out for
                  <input
                    type="number"
                    className="card-depletion-rent-input"
                    value={rentOverrideInput}
                    placeholder={String(Math.round(baseRentToday))}
                    onChange={e => {
                      setRentOverrideInput(e.target.value)
                      onUpdateField({ monthlyRent: Number(e.target.value) || 0 })
                    }}
                  />
                  /mo today
                </span>
              )},
              { label: 'Overseas care · sell house', info: depletionInfoOverseasSell, subEl: (
                <span className="card-depletion-rent-row">
                  sell for
                  <input
                    type="number"
                    className="card-depletion-rent-input"
                    value={sellPriceInput}
                    placeholder={String(Math.round(retireAppreciatedPrice))}
                    onChange={e => {
                      setSellPriceInput(e.target.value)
                      onUpdateField({ expectedSalePrice: Number(e.target.value) || 0 })
                    }}
                  />
                  <span style={{ color: '#9ca3af' }}>→ net {fmt(Math.round(sellProceedsAfterTax))}{retireSellRemainingLoan > 0 ? ` (−${fmt(Math.round(sellingCosts))} costs · −${fmt(Math.round(retireSellRemainingLoan))} loan` : ` (−${fmt(Math.round(sellingCosts))} costs`}{capitalGainsTax > 0 ? ` · −${fmt(Math.round(capitalGainsTax))} tax)` : ')'}</span>
                </span>
              )},
            ].map(({ label, info, sub, subEl }) => (
              <div key={label} className="card-depletion-row">
                <span className="card-depletion-scenario">{label}</span>
                {subEl || (sub && <span className="card-depletion-note">{sub}</span>)}
                {info.depleted ? (
                  <>
                    <span className="card-depletion-bad">⚠ pool depletes at age {info.age}</span>
                    <span className="card-depletion-bad-sub">{fmt(info.prevPool)} · {fmt(info.prevPoolReal)} today at age {info.prevAge}</span>
                  </>
                ) : (
                  <>
                    <span className="card-depletion-good">✓ lasts past age {info.age}</span>
                    <span className="card-depletion-val">{fmt(info.pool)} · {fmt(info.poolReal)} today</span>
                  </>
                )}
              </div>
            ))}
          </div>
          )
        })()}

        {/* Total */}
        <div className="card-total">
          <div className="total-label">Total Monthly</div>
          <div className="total-amount">{fmt(total)}</div>
          <div className="total-sub">/month</div>
          {(house.renovationBudget || 0) > 0 && (() => {
            const renoPiAmt = Math.round(calcMonthlyPI(renoLoanAdder, house.interestRate, house.loanTermYears))
            return (
              <div className="total-reno-note">
                {fmt(total - renoPiAmt)} base + <span className="reno-pi-note">{fmt(renoPiAmt)} reno</span>
              </div>
            )
          })()}
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

        {/* After refi */}
        {hasRefi && refiMonthly && <>
        <div className="split-phase-label" style={{ background: '#eff6ff', borderColor: '#93c5fd' }}>
          🔄 After refi <span className="phase-tag" style={{ background: '#3b82f6' }}>Yr {refiYear}+ · {refiRate}%</span>
          <span style={{ fontSize: '0.65rem', color: '#6b7280', marginLeft: 6 }}>
            new P&I {fmt(refiMonthly.pi)}/mo · saves {fmt(pi - refiMonthly.pi)}/mo
          </span>
        </div>
        <div className="split-section">
          <div className="split-card d-card-after">
            <div className="split-avatar d-avatar">D</div>
            <div className="split-info">
              <div className="split-name">Net Monthly</div>
              <div className="split-amount after-amount">{fmt(refiYear <= equalizeYears ? refiMonthly.dDuringRepay : refiMonthly.dAfterRepay)}</div>
              <div className="split-sub">at Yr {refiYear} with compounded costs</div>
            </div>
          </div>
          <div className="split-card a-card-after">
            <div className="split-avatar a-avatar">A</div>
            <div className="split-info">
              <div className="split-name">Net Monthly</div>
              <div className="split-amount after-amount">{fmt(refiYear <= equalizeYears ? refiMonthly.aNetDuring : refiMonthly.aNetAfter)}</div>
              <div className="split-sub">at Yr {refiYear} with compounded costs</div>
            </div>
          </div>
        </div>
        </>}

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

        {/* Locked draw warning — only show if housing gap exceeds ALL available funds including Roth gains */}
        {lockedDrawRequired && (() => {
          // Check if Roth gains at retirement are enough to cover — if so, no need to warn
          const lastDSnap = dBucketSnapshots[dBucketSnapshots.length - 1] || {}
          const lastASnap = aBucketSnapshots[aBucketSnapshots.length - 1] || {}
          const totalRothGains = Math.max(0, (lastDSnap.rothTotal || 0) - (lastDSnap.roth || 0)) +
                                 Math.max(0, (lastASnap.rothTotal || 0) - (lastASnap.roth || 0))
          if (totalRothGains > 0) return null
          return (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 8, padding: '8px 12px', marginBottom: 8,
              fontSize: '0.75rem', color: '#fca5a5', lineHeight: 1.5
            }}>
              ⚠ Housing costs exceed all liquid savings starting Yr {lockedDrawFirstYear} — even Roth gains depleted. Consider more brokerage allocation or a lower-cost home.
            </div>
          )
        })()}

        {/* Cost progression every 3 years */}
        {costIncreaseVisible && (
          <div className="cost-projection">
            <div className="cost-proj-title">Monthly net (with {taxIncreasePct}% tax / {hoaIncreasePct}% HOA annual increase)</div>
            <div className="cost-proj-header cost-proj-header-4">
              <span>Year</span><span className="d-color">D</span><span className="a-color">A</span><span>Total</span>
            </div>
            {projRows.map(r => {
              const dPoolDraw = Math.max(0, r.dNet - (dBudget || 0))
              const aPoolDraw = Math.max(0, r.aNet - (aBudget || 0))
              const anyOver = dPoolDraw > 0 || aPoolDraw > 0
              return (
                <div key={r.y} className={`cost-proj-row cost-proj-row-4${anyOver ? ' rent-over-budget' : ''}`}>
                  <span>Yr {r.y}</span>
                  <span className="d-color cost-proj-cell">
                    <span>{fmt(r.dNet)}</span>
                    {dPoolDraw > 0 && <span className="pool-draw-tag">−{fmt(Math.round(dPoolDraw))} pool</span>}
                  </span>
                  <span className="a-color cost-proj-cell">
                    <span>{fmt(r.aNet)}</span>
                    {aPoolDraw > 0 && <span className="pool-draw-tag">−{fmt(Math.round(aPoolDraw))} pool</span>}
                  </span>
                  <span style={{ color: anyOver ? '#ef4444' : '#374151', fontWeight: 600 }}>{fmt(r.dNet + r.aNet)}</span>
                </div>
              )
            })}
            {projRows.some(r => r.dNet > (dBudget || 0) || r.aNet > (aBudget || 0)) && (
              <div className="rent-over-note">⚠ Budget exceeded in some years — shortfall drawn from investment pool</div>
            )}
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

        {/* Sale calculator — hidden (no sell plan) */}
        {false && <div className="sale-section">
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
              🏠 Stay &amp; invest — Yr {iYrs} ({investRate}% return)
            </div>
            <div className="invest-sub">
              Leftover invested monthly
            </div>
            <div className="invest-snapshots">
              <button className="snap-toggle-btn" onClick={onToggleSnapshots}>
                {snapshotsExpanded ? '▾ Hide' : '▸ Show'} year-by-year
              </button>
              {snapshotsExpanded && investSnapshots.map(s => {
                const dSavesAt = dYearlyLeftover[s.y - 1] || 0
                const aSavesAt = aYearlyLeftover[s.y - 1] || 0
                const hb = s.housingBreakdown
                const dSnap = dBucketSnapshots[s.y - 1] || {}
                const aSnap = aBucketSnapshots[s.y - 1] || {}
                const hasDraws = dSnap.drawFromRoth > 0 || dSnap.drawFromBrokerage > 0 ||
                                 aSnap.drawFromRoth > 0 || aSnap.drawFromBrokerage > 0 ||
                                 aSnap.spillFromDRoth > 0 || aSnap.spillFromDBrokerage > 0
                const dSpendToday = spendingCap || 0
                const aSpendToday = aSpendingCap || 0
                const targetSpendToday = dSpendToday + aSpendToday
                return (
                  <div key={s.y} className={`yr-snap${s.isSaleYear ? ' yr-snap--sale' : ''}`}>
                    {/* Year header + housing cost */}
                    <div className="yr-snap-header">
                      <span className="yr-snap-yr">Yr {s.y} · Age {(currentAge || 33) + s.y}{s.isSaleYear ? ' 🏷' : ''}</span>
                      <span className="yr-snap-housing">
                        {hb.pi > 0 ? `${fmt(hb.pi)} P&I · ` : ''}
                        {hb.tax > 0 ? `${fmt(hb.tax)} tax · ` : ''}
                        {hb.hoa > 0 ? `${fmt(hb.hoa)} ${baseMaintenanceMonthly > 0 ? 'repairs' : 'HOA'} · ` : ''}
                        {hb.insurance > 0 ? `${fmt(hb.insurance)} ins · ` : ''}
                        {hb.utils > 0 ? `${fmt(hb.utils)} utils · ` : ''}
                        <strong>= {fmt(hb.total)}/mo</strong>
                        {hb.mortgagePaidOff && <span className="invest-snap-paidoff"> ✓ paid off</span>}
                      </span>
                    </div>
                    {/* Spending power summary — removed, shown per-person below */}

                    {/* Person rows */}
                    {[
                      { who: 'D', savesAt: dSavesAt, fv: s.dFV, snap: dSnap, colorClass: 'd-color', housing: Math.round((dBudget || 0) - dSavesAt), spillPaidForA: Math.round(((aSnap.spillFromDRoth || 0) + (aSnap.spillFromDBrokerage || 0) + (aSnap.spillFromDLump || 0) + (aSnap.spillFromDRothGains || 0) + (aSnap.spillCashOffset || 0)) / 12), personSpend: dSpendToday },
                      { who: 'A', savesAt: aSavesAt, fv: s.aFV, snap: aSnap, colorClass: 'a-color', housing: Math.round((aBudget || 0) - aSavesAt), spillPaidForA: 0, personSpend: aSpendToday },
                    ].map(({ who, savesAt, fv, snap, colorClass, housing, spillPaidForA, personSpend }) => {
                      const inflFactor = Math.pow(1 + (spendInflationRate || inflationRate || 3) / 100, s.y)
                      const spendNominal = Math.round(personSpend * inflFactor)
                      const spendExtra = spendNominal - personSpend
                      const spendExtraToday = Math.round(spendExtra / inflFactor)
                      const inDeficit = (savesAt - spillPaidForA) < 0  // true when housing draws from savings
                      return (
                        <div key={who} className="yr-snap-person">
                          {/* Header */}
                          <div className="ysp-header">
                            <span className={`ysp-who ${colorClass}`}>{who}</span>
                            {(() => {
                              const budget      = who === 'D' ? dBudget : aBudget
                              const leftover    = savesAt
                              const rothMo      = Math.round(snap.rothAlloc || 0)
                              const brkMo       = Math.round(snap.brokerageAlloc || (who === 'D' ? (dYearlyBrokerage[s.y - 1] || 0) : (aYearlyBrokerage[s.y - 1] || 0)))
                              // For housing draws: use spill-specific fields so numbers match spillPaidForA
                              const spillRoth       = Math.round((aSnap.spillFromDRoth || 0) / 12)
                              const spillBrk        = Math.round((aSnap.spillFromDBrokerage || 0) / 12)
                              const spillLump       = Math.round((aSnap.spillFromDLump || 0) / 12)
                              const spillRothGains  = Math.round((aSnap.spillFromDRothGains || 0) / 12)
                              // Also show D's own housing gap draws (when D's own budget < housing)
                              const ownRoth     = Math.round((snap.drawFromRoth || 0) / 12) - spillRoth
                              const ownBrk      = Math.round((snap.drawFromBrokerage || 0) / 12) - spillBrk
                              const dBrkPrincipal = Math.round((snap.brkPrincipalDraw || 0) / 12)
                              const dBrkGains   = Math.round((snap.brkGainsDraw || 0) / 12)
                              const ownRothGains = Math.round((snap.drawFromRothGains || 0) / 12) - spillRothGains
                              const ownLump      = Math.round((snap.drawFromLump || 0) / 12) - spillLump
                              const netInvest   = leftover - spillPaidForA
                              return (
                                <div className="ysp-rows">
                                  <div className="ysp-row">
                                    <span className="ysp-row-lbl">Budget</span>
                                    <span className="ysp-row-val">{fmt(budget)}</span>
                                  </div>
                                  <div className="ysp-row">
                                    <span className="ysp-row-lbl">Housing</span>
                                    <span className="ysp-row-val ysp-row-neg">−{fmt(housing)}</span>
                                  </div>
                                  <div className="ysp-row ysp-row-total">
                                    <span className="ysp-row-lbl">Leftover</span>
                                    <span className={`ysp-row-val ${leftover >= 0 ? 'ysp-row-pos' : 'ysp-row-neg'}`}>
                                      {leftover >= 0 ? '+' : '−'}{fmt(Math.abs(leftover))}/mo
                                    </span>
                                  </div>
                                  {spillPaidForA > 0 && (
                                    <div className="ysp-row">
                                      <span className="ysp-row-lbl">Covers A</span>
                                      <span className="ysp-row-val ysp-row-blue">−{fmt(spillPaidForA)}</span>
                                    </div>
                                  )}
                                  {spillPaidForA > 0 && (
                                    <div className="ysp-row ysp-row-total">
                                      <span className="ysp-row-lbl">{netInvest >= 0 ? 'Invests' : 'Deficit'}</span>
                                      <span className={`ysp-row-val ${netInvest >= 0 ? 'ysp-row-pos' : 'ysp-row-neg'}`}>
                                        {netInvest >= 0 ? '+' : '−'}{fmt(Math.abs(netInvest))}/mo
                                      </span>
                                    </div>
                                  )}
                                  {/* Bucket investment breakdown (when investing) */}
                                  {netInvest > 0 && (rothMo > 0 || brkMo > 0) && (
                                    <div className="ysp-row ysp-row-buckets">
                                      <span className="ysp-row-lbl"></span>
                                      <span className="ysp-row-val">
                                        {rothMo > 0 && <span className="ysp-alloc-chip ysp-alloc-roth">Roth +{fmt(rothMo)}/mo</span>}
                                        {brkMo  > 0 && <span className="ysp-alloc-chip ysp-alloc-brk">Brk +{fmt(brkMo)}/mo</span>}
                                      </span>
                                    </div>
                                  )}
                                  {/* Housing draw from savings (when in deficit) */}
                                  {netInvest < 0 && (spillRoth > 0 || spillBrk > 0 || ownRoth > 0 || ownBrk > 0 || ownRothGains > 0 || ownLump > 0) && (() => {
                                    const rothDrained = (snap.roth || 0) === 0
                                    const rothDrainedByBrk = rothDrained && (spillBrk + ownBrk) > 0
                                    return (
                                      <div className="ysp-row ysp-row-buckets">
                                        <span className="ysp-row-lbl" style={{color:'#fb923c'}}>🏠 from</span>
                                        <span className="ysp-row-val">
                                          {(spillRoth + ownRoth) > 0 && (
                                            <span className="ysp-alloc-chip" style={{background:'rgba(251,146,60,0.15)',color:'#fb923c'}}>
                                              Roth −{fmt(spillRoth + ownRoth)}/mo
                                              {rothDrainedByBrk && <span style={{fontWeight:400, color:'#ef4444'}}> · drained</span>}
                                            </span>
                                          )}
                                          {(spillBrk + ownBrk) > 0 && (
                                            <span className="ysp-alloc-chip" style={{background:'rgba(251,146,60,0.15)',color:'#fb923c'}}>
                                              Brk −{fmt(spillBrk + ownBrk)}/mo
                                              {dBrkPrincipal > 0 && <span style={{fontWeight:400}}> · {fmt(dBrkPrincipal)} principal</span>}
                                              {dBrkGains     > 0 && <span style={{fontWeight:400}}> · {fmt(dBrkGains)} gains</span>}
                                            </span>
                                          )}
                                          {ownRothGains > 0 && (
                                            <span className="ysp-alloc-chip" style={{background:'rgba(251,146,60,0.15)',color:'#fb923c'}}>
                                              Roth gains −{fmt(ownRothGains)}/mo
                                            </span>
                                          )}
                                          {ownLump > 0 && (
                                            <span className="ysp-alloc-chip" style={{background:'rgba(251,146,60,0.15)',color:'#fb923c'}}>
                                              Cash −{fmt(ownLump)}/mo
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )
                                  })()}
                                  {spillPaidForA > 0 && (spillRoth > 0 || spillBrk > 0) && (
                                    // A from detail hidden — uncomment to re-enable
                                    // <div className="ysp-row ysp-row-buckets">
                                    //   <span className="ysp-row-lbl" style={{color:'#60a5fa'}}>A from</span>
                                    //   <span className="ysp-row-val">
                                    //     {dRothDraw > 0 && <span className="ysp-alloc-chip ysp-alloc-spill">Roth −{fmt(dRothDraw)}/mo</span>}
                                    //     {dBrkDraw  > 0 && <span className="ysp-alloc-chip ysp-alloc-spill">Brk −{fmt(dBrkDraw)}/mo</span>}
                                    //   </span>
                                    // </div>
                                    null
                                  )}
                                  {who === 'A' && savesAt < 0 && (
                                    <div className="ysp-row" style={{color:'#f87171',fontSize:'0.62rem'}}>
                                      <span>gap covered by D</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                          {/* ── Spending section ── */}
                          {(() => {
                            const income   = who === 'D' ? (dIncome || 0) : (aIncome || 0)
                            const budget   = who === 'D' ? dBudget : aBudget
                            if (!income && !spendNominal) return null
                            // How much of spend comes from savings vs income surplus
                            const incomeAfterBudget = Math.max(0, income - budget)
                            const spendFromSavings  = Math.max(0, spendNominal - incomeAfterBudget)
                            const spendSurplus      = Math.max(0, incomeAfterBudget - spendNominal)
                            const hasSpend = spendNominal > 0 || income > 0
                            if (!hasSpend) return null
                            return (
                              <div className="ysp-spend-section">
                                {income > 0 && (
                                  <div className="ysp-spend-row">
                                    <span className="ysp-spend-lbl">Income</span>
                                    <span className="ysp-spend-val">{fmt(income)}</span>
                                  </div>
                                )}
                                {income > 0 && (
                                  <div className="ysp-spend-row">
                                    <span className="ysp-spend-lbl">Budget</span>
                                    <span className="ysp-spend-val ysp-spend-neg">−{fmt(budget)}</span>
                                  </div>
                                )}
                                {spendNominal > 0 && (
                                  <div className="ysp-spend-row">
                                    <span className="ysp-spend-lbl">Spend</span>
                                    <span className="ysp-spend-val ysp-spend-neg">−{fmt(spendNominal)}</span>
                                  </div>
                                )}
                                <div className="ysp-spend-row ysp-spend-total">
                                  <span className="ysp-spend-lbl">&nbsp;</span>
                                  {spendFromSavings > 0
                                    ? <span className="ysp-spend-drawn">−{fmt(spendFromSavings)}/mo drawn</span>
                                    : <span className="ysp-spend-surplus">+{fmt(spendSurplus)}/mo surplus</span>
                                  }
                                </div>
                              </div>
                            )
                          })()}
                          {/* Per-person spending target */}
                          {personSpend > 0 && (
                            <div className="ysp-spend-bar">
                              <span className="ysp-spend-label">💸 {fmt(personSpend)}/mo today = {fmt(spendNominal)} at Yr {s.y} · +{fmt(spendExtra)} more needed</span>
                              <span className="ysp-spend-short">= −{fmt(spendExtraToday)} in today's $</span>
                            </div>
                          )}
                          {/* Balance table */}
                          <table className="ysp-table">
                            <tbody>
                              <tr className="ysp-tr-total">
                                <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--total" /></td>
                                <td className="ysp-td-name">Total portfolio</td>
                                <td className={`ysp-td-val ${colorClass}`}>{fmt(fv)}</td>
                              </tr>
                              {/* ── HYSA ── */}
                              {(snap.hysa || 0) > 0 || (snap.hysaMonthly || 0) > 0 || (snap.hysaSpendDraw || 0) > 0 || (snap.spendForA_hysa || 0) > 0 ? (
                                <tr>
                                  <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--hysa" /></td>
                                  <td className="ysp-td-name">
                                    {(snap.hysa || 0) === 0
                                      ? <span>HYSA <span className="ysp-sub">(depleted)</span>
                                          {(snap.hysaSpendDraw || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.hysaSpendDraw||0)/12))}/mo · drained</span>}
                                          {who === 'D' && (snap.spendForA_hysa || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_hysa)/12))}/mo</span>}
                                        </span>
                                      : <span>HYSA
                                          {(snap.hysaMonthly || 0) > 0 && <span className="ysp-alloc-chip ysp-alloc-hysa">+{fmt(Math.round(snap.hysaMonthly))}/mo</span>}
                                          {(snap.hysaSpendDraw || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.hysaSpendDraw||0)/12))}/mo</span>}
                                          {who === 'D' && (snap.spendForA_hysa || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_hysa)/12))}/mo</span>}
                                          {(() => {
                                            const addMo = Math.round(snap.hysaMonthly || 0)
                                            const drawMo = Math.round(((snap.hysaSpendDraw || 0) + (snap.spendForA_hysa || 0)) / 12)
                                            const sources = (addMo > 0 ? 1 : 0) + ((snap.hysaSpendDraw || 0) > 0 ? 1 : 0) + ((snap.spendForA_hysa || 0) > 0 ? 1 : 0)
                                            if (sources < 2) return null
                                            const net = addMo - drawMo
                                            return <span className="ysp-sub" style={{color: net > 0 ? '#10b981' : net < 0 ? '#f87171' : '#9ca3af', display:'block', fontWeight:600}}>→ net {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}/mo</span>
                                          })()}
                                        </span>
                                    }
                                  </td>
                                  <td className="ysp-td-val ysp-hysa">
                                    {(() => {
                                      const bal = Math.round(snap.hysa || 0)
                                      const drawn = (snap.hysaSpendDraw || 0) + (snap.spendForA_hysa || 0)
                                      const pre = Math.round(snap.hysaPreDraw || 0)
                                      if (bal === 0 && drawn > 0 && pre > 0)
                                        return <span><span style={{color:'#6b7280',textDecoration:'line-through',fontSize:'0.7em'}}>{fmt(pre)}</span> $0</span>
                                      if (bal > 0 && drawn > 0 && pre > bal)
                                        return <span><span style={{color:'#6b7280',fontSize:'0.7em'}}>{fmt(pre)} →</span> {fmt(bal)} <span style={{color:'#9ca3af',fontSize:'0.65em'}}>remaining</span></span>
                                      return fmt(bal)
                                    })()}
                                  </td>
                                </tr>
                              ) : null}
                              {/* ── Roth contributions ── */}
                              <tr>
                                <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--roth" /></td>
                                <td className="ysp-td-name">Roth contrib <span className="ysp-sub">(tax-free)</span>
                                  {(snap.rothAlloc || 0) > 0 && <span className="ysp-alloc-chip ysp-alloc-roth">+{fmt(Math.round(snap.rothAlloc))}/mo</span>}
                                  {(snap.drawFromRoth || 0) > 0 && inDeficit && <span className="ysp-sub" style={{color:'#fb923c', display:'block'}}>🏠 housing −{fmt(Math.round((snap.drawFromRoth||0)/12))}/mo{(snap.roth||0)===0 ? ' · drained' : ''}</span>}
                                  {(snap.drawFromRoth || 0) > 0 && !inDeficit && null /* 🏠 covers A label hidden */}
                                  {(snap.spendRothDraw || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendRothDraw||0)/12))}/mo{(snap.roth||0)===0 ? ' · drained' : ''}</span>}
                                  {who === 'D' && (snap.spendForA_roth || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_roth)/12))}/mo</span>}
                                  {(() => {
                                    const addMo = Math.round(snap.rothAlloc || 0)
                                    const drawMo = Math.round(((snap.spendRothDraw || 0) + (snap.spendForA_roth || 0) + (inDeficit ? (snap.drawFromRoth || 0) : 0)) / 12)
                                    const sources = (addMo > 0 ? 1 : 0) + ((snap.spendRothDraw || 0) > 0 ? 1 : 0) + ((snap.spendForA_roth || 0) > 0 ? 1 : 0) + (inDeficit && (snap.drawFromRoth || 0) > 0 ? 1 : 0)
                                    if (sources < 2) return null
                                    const net = addMo - drawMo
                                    return <span className="ysp-sub" style={{color: net > 0 ? '#10b981' : net < 0 ? '#f87171' : '#9ca3af', display:'block', fontWeight:600}}>→ net {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}/mo</span>
                                  })()}
                                </td>
                                <td className="ysp-td-val ysp-roth">
                                  {(() => {
                                    const bal = Math.round(snap.roth || 0)
                                    const drawn = (snap.drawFromRoth || 0) + (snap.spendRothDraw || 0) + (snap.spendForA_roth || 0)
                                    const pre   = Math.round(snap.rothContribPreHousing || 0)
                                    if (bal === 0 && drawn > 0 && pre > 0)
                                      return <span><span style={{color:'#6b7280',textDecoration:'line-through',fontSize:'0.7em'}}>{fmt(pre)}</span> $0</span>
                                    if (bal > 0 && drawn > 0 && pre > bal)
                                      return <span><span style={{color:'#6b7280',fontSize:'0.7em'}}>{fmt(pre)} →</span> {fmt(bal)} <span style={{color:'#9ca3af',fontSize:'0.65em'}}>remaining</span></span>
                                    return fmt(bal)
                                  })()}
                                </td>
                              </tr>
                              {/* ── Roth gains ── */}
                              {((snap.rothEarnings || 0) > 0 || (snap.drawFromRothGains || 0) > 0 || (snap.spendRothGainsDraw || 0) > 0) && (
                                <tr className="ysp-tr-sub">
                                  <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--locked" /></td>
                                  <td className="ysp-td-name ysp-locked">Roth gains <span className="ysp-sub">(tax-free after 59½)</span>
                                    {(snap.drawFromRothGains || 0) > 0 && inDeficit && <span className="ysp-sub" style={{color:'#fb923c', display:'block'}}>🏠 housing −{fmt(Math.round((snap.drawFromRothGains||0)/12))}/mo{(snap.rothEarnings||0)===0 ? ' · drained' : ''}</span>}
                                    {(snap.spendRothGainsDraw || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendRothGainsDraw||0)/12))}/mo{(snap.rothEarnings||0)===0 ? ' · drained' : ''}</span>}
                                    {who === 'D' && (snap.spendForA_rothGains || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_rothGains)/12))}/mo</span>}
                                    {(() => {
                                      const totalDraw = Math.round(((inDeficit ? (snap.drawFromRothGains || 0) : 0) + (snap.spendRothGainsDraw || 0) + (snap.spendForA_rothGains || 0)) / 12)
                                      const sources = (inDeficit && (snap.drawFromRothGains || 0) > 0 ? 1 : 0) + ((snap.spendRothGainsDraw || 0) > 0 ? 1 : 0) + ((snap.spendForA_rothGains || 0) > 0 ? 1 : 0)
                                      if (sources < 2) return null
                                      return <span className="ysp-sub" style={{color:'#f87171', display:'block', fontWeight:600}}>→ total −{fmt(totalDraw)}/mo</span>
                                    })()}
                                  </td>
                                  <td className="ysp-td-val ysp-locked">
                                    {(() => {
                                      const bal = Math.round(snap.rothEarnings || 0)
                                      const drawn = (snap.drawFromRothGains || 0) + (snap.spendRothGainsDraw || 0) + (snap.spendForA_rothGains || 0)
                                      const pre   = Math.round(snap.rothGainsPreHousing || 0)
                                      if (bal === 0 && drawn > 0 && pre > 0)
                                        return <span><span style={{color:'#6b7280',textDecoration:'line-through',fontSize:'0.7em'}}>{fmt(pre)}</span> $0</span>
                                      if (bal > 0 && drawn > 0 && pre > bal)
                                        return <span><span style={{color:'#6b7280',fontSize:'0.7em'}}>{fmt(pre)} →</span> {fmt(bal)} <span style={{color:'#9ca3af',fontSize:'0.65em'}}>remaining</span></span>
                                      return fmt(bal)
                                    })()}
                                  </td>
                                </tr>
                              )}
                              {/* ── Brokerage principal ── */}
                              {(() => {
                                const basis = Math.round(Math.min(snap.brokerageBasis || 0, snap.brokerage || 0))
                                const gains = Math.round(Math.max(0, (snap.brokerage || 0) - basis))
                                const hsgPrincipal = snap.brkPrincipalDraw || 0
                                const hsgGains     = snap.brkGainsDraw || 0
                                const rothDrainedIntoHousing = (snap.drawFromRoth || 0) > 0 && (snap.roth || 0) === 0
                                const gainsPreHousing  = Math.round(snap.brkGainsPreHousing || 0)
                                const basisPreHousing  = Math.round(snap.brkPrincipalPreHousing || 0)
                                const gainsPreSpend    = Math.round(snap.brkGainsPreSpend || 0)
                                const basisPreSpend    = Math.round(snap.brkPrincipalPreSpend || 0)
                                return (<>
                                  <tr>
                                    <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--brk" /></td>
                                    <td className="ysp-td-name">Brk principal <span className="ysp-sub">(tax-free)</span>
                                      {(snap.brokerageAlloc || 0) > 0 && <span className="ysp-alloc-chip ysp-alloc-brk">+{fmt(Math.round(snap.brokerageAlloc))}/mo</span>}
                                      {hsgPrincipal > 0 && inDeficit && <span className="ysp-sub" style={{color:'#fb923c', display:'block'}}>🏠 housing −{fmt(Math.round(hsgPrincipal/12))}/mo{rothDrainedIntoHousing ? <span style={{color:'#ef4444'}}> (Roth exhausted)</span> : ''}{basis===0 ? ' · drained' : ''}</span>}
                                      {hsgPrincipal > 0 && !inDeficit && null /* 🏠 covers A label hidden */}
                                      {(snap.spendBrkPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendBrkPrincipal||0)/12))}/mo{basis===0 ? ' · drained' : ''}</span>}
                                      {who === 'D' && (snap.spendForA_brkPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_brkPrincipal)/12))}/mo</span>}
                                      {(() => {
                                        const addMo = Math.round(snap.brokerageAlloc || 0)
                                        const drawMo = Math.round(((snap.spendBrkPrincipal || 0) + (snap.spendForA_brkPrincipal || 0) + (inDeficit ? hsgPrincipal : 0)) / 12)
                                        const sources = (addMo > 0 ? 1 : 0) + ((snap.spendBrkPrincipal || 0) > 0 ? 1 : 0) + ((snap.spendForA_brkPrincipal || 0) > 0 ? 1 : 0) + (inDeficit && hsgPrincipal > 0 ? 1 : 0)
                                        if (sources < 2) return null
                                        const net = addMo - drawMo
                                        return <span className="ysp-sub" style={{color: net > 0 ? '#10b981' : net < 0 ? '#f87171' : '#9ca3af', display:'block', fontWeight:600}}>→ net {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}/mo</span>
                                      })()}
                                    </td>
                                    <td className="ysp-td-val ysp-brk">
                                      {(() => {
                                        const totalDrawn = hsgPrincipal + (snap.spendBrkPrincipal || 0) + (snap.spendForA_brkPrincipal || 0)
                                        if (basis === 0 && totalDrawn > 0 && basisPreHousing > 0)
                                          return <span><span style={{color:'#6b7280',textDecoration:'line-through',fontSize:'0.7em'}}>{fmt(basisPreHousing)}</span> $0</span>
                                        if (basis > 0 && totalDrawn > 0 && basisPreHousing > basis)
                                          return <span><span style={{color:'#6b7280',fontSize:'0.7em'}}>{fmt(basisPreHousing)} →</span> {fmt(basis)} <span style={{color:'#9ca3af',fontSize:'0.65em'}}>remaining</span></span>
                                        return fmt(basis)
                                      })()}
                                    </td>
                                  </tr>
                                  <tr className="ysp-tr-sub">
                                    <td className="ysp-td-dot" />
                                    <td className="ysp-td-name ysp-sub-indent">Brk gains <span className="ysp-sub">(cap gains tax on withdrawal)</span>
                                      {hsgGains > 0 && inDeficit && <span className="ysp-sub" style={{color:'#fb923c', display:'block'}}>🏠 housing −{fmt(Math.round(hsgGains/12))}/mo + {fmt(Math.round((snap.drawTax||0)/12))} tax{gains===0 ? ' · drained' : ''}</span>}
                                      {hsgGains > 0 && !inDeficit && null /* 🏠 covers A label hidden */}
                                      {(snap.spendBrkGains || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendBrkGains||0)/12))}/mo + {fmt(Math.round((snap.spendBrkTax||0)/12))} tax{gains===0 ? ' · drained' : ''}</span>}
                                      {who === 'D' && (snap.spendForA_brkGains || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_brkGains)/12))}/mo + {fmt(Math.round((snap.spendForA_brkTax || 0)/12))} tax</span>}
                                      {(() => {
                                        const totalDraw = Math.round(((inDeficit ? hsgGains : 0) + (snap.spendBrkGains || 0) + (snap.spendForA_brkGains || 0)) / 12)
                                        const totalTax  = Math.round(((inDeficit ? (snap.drawTax || 0) : 0) + (snap.spendBrkTax || 0) + (snap.spendForA_brkTax || 0)) / 12)
                                        const sources = (inDeficit && hsgGains > 0 ? 1 : 0) + ((snap.spendBrkGains || 0) > 0 ? 1 : 0) + ((snap.spendForA_brkGains || 0) > 0 ? 1 : 0)
                                        if (sources < 2) return null
                                        return <span className="ysp-sub" style={{color:'#f87171', display:'block', fontWeight:600}}>→ total −{fmt(totalDraw)}/mo + {fmt(totalTax)} tax</span>
                                      })()}
                                    </td>
                                    <td className="ysp-td-val ysp-sub-val ysp-locked">
                                      {(() => {
                                        const totalDrawn = hsgGains + (snap.spendBrkGains || 0) + (snap.spendForA_brkGains || 0)
                                        if (gains === 0 && totalDrawn > 0 && gainsPreHousing > 0)
                                          return <span><span style={{color:'#6b7280',textDecoration:'line-through',fontSize:'0.7em'}}>{fmt(gainsPreHousing)}</span> $0</span>
                                        if (gains > 0 && totalDrawn > 0 && gainsPreHousing > gains)
                                          return <span><span style={{color:'#6b7280',fontSize:'0.7em'}}>{fmt(gainsPreHousing)} →</span> {fmt(gains)} <span style={{color:'#9ca3af',fontSize:'0.65em'}}>remaining</span></span>
                                        return fmt(gains)
                                      })()}
                                    </td>
                                  </tr>
                                </>)
                              })()}
                              {/* ── Uninvested cash ── */}
                              {((who === 'D' && dLumpInit > 0) || (who === 'A' && aLumpInit > 0)) && (() => {
                                const lumpBal = Math.round(snap.lump || 0)
                                const lumpDrawTotal = (snap.spendLumpPrincipal || 0) + (snap.spendLumpGains || 0)
                                return (
                                  <tr>
                                    <td className="ysp-td-dot"><span className="ysp-dot" style={{background:'#6b7280'}} /></td>
                                    <td className="ysp-td-name">Uninvested cash <span className="ysp-sub">(principal tax-free · gains at cap gains)</span>
                                      {(snap.drawFromLump || 0) > 0 && inDeficit && <span className="ysp-sub" style={{color:'#fb923c', display:'block'}}>🏠 housing −{fmt(Math.round((snap.drawFromLump||0)/12))}/mo{lumpBal===0 ? ' · drained' : ''}</span>}
                                      {lumpDrawTotal > 0 && <>
                                        {(snap.spendLumpPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendLumpPrincipal||0)/12))}/mo principal (tax-free)</span>}
                                        {(snap.spendLumpGains || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendLumpGains||0)/12))}/mo gains + {fmt(Math.round((snap.spendLumpTax||0)/12))} tax</span>}
                                      </>}
                                      {who === 'D' && ((snap.spendForA_lumpPrincipal || 0) > 0 || (snap.spendForA_lumpGains || 0) > 0) && <>
                                        {(snap.spendForA_lumpPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_lumpPrincipal)/12))}/mo principal</span>}
                                        {(snap.spendForA_lumpGains || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_lumpGains)/12))}/mo gains + {fmt(Math.round((snap.spendForA_lumpTax || 0)/12))} tax</span>}
                                      </>}
                                      {lumpDrawTotal === 0 && (snap.drawFromLump || 0) === 0 && lumpBal > 0 && (snap.spendDeficit === 0) && (snap.spendForA || 0) === 0 && ((snap.spendRothDraw || 0) + (snap.spendBrkDraw || 0) + (snap.spendRothGainsDraw || 0) + (snap.hysaSpendDraw || 0)) > 0 && (
                                        <span className="ysp-sub" style={{color:'#6b7280'}}>not drawn — prior buckets covered spend</span>
                                      )}
                                    </td>
                                    <td className="ysp-td-val" style={{color: lumpBal === 0 ? '#ef4444' : '#9ca3af'}}>
                                      {(() => {
                                        const drawn = (snap.drawFromLump || 0) + (snap.spendLumpPrincipal || 0) + (snap.spendLumpGains || 0) + (snap.spendForA_lumpPrincipal || 0) + (snap.spendForA_lumpGains || 0)
                                        const pre   = Math.round(snap.lumpPreSpend || 0)
                                        const preHousing = pre + (snap.drawFromLump || 0)
                                        if (lumpBal === 0 && drawn > 0 && preHousing > 0)
                                          return <span><span style={{color:'#6b7280',textDecoration:'line-through',fontSize:'0.7em'}}>{fmt(Math.round(preHousing))}</span> $0</span>
                                        if (lumpBal > 0 && drawn > 0 && preHousing > lumpBal)
                                          return <span><span style={{color:'#6b7280',fontSize:'0.7em'}}>{fmt(Math.round(preHousing))} →</span> {fmt(lumpBal)} <span style={{color:'#9ca3af',fontSize:'0.65em'}}>remaining</span></span>
                                        return fmt(lumpBal)
                                      })()}
                                    </td>
                                  </tr>
                                )
                              })()}
                              {/* ── Spend covered by D ── */}
                              {who === 'A' && (snap.spendCoveredByD || 0) > 0 && (
                                <tr><td colSpan={3}>
                                  <div style={{fontSize:'0.65rem', color:'#60a5fa', fontWeight:600, padding:'4px 0', background:'rgba(96,165,250,0.08)', borderRadius:4, padding:'6px 8px', margin:'4px 0'}}>
                                    🤝 D covers A's spend: {fmt(Math.round((snap.spendCoveredByD)/12))}/mo from D's accounts
                                  </div>
                                </td></tr>
                              )}
                              {/* ── Deficit warning ── */}
                              {(snap.spendDeficit || 0) > 0 && (
                                <tr><td colSpan={3}>
                                  <div style={{fontSize:'0.65rem', color:'#ef4444', fontWeight:600, padding:'4px 0'}}>
                                    ⚠ All buckets depleted · −{fmt(Math.round((snap.spendDeficit||0)/12))}/mo spend inflation gap uncovered
                                  </div>
                                </td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            <div className="invest-pool-breakdown">
              {(() => {
                // All numbers at retirement year (rY), using tracked bucket balances
                const retireIdx  = Math.min(rY, iYrs) - 1
                const dSnap      = dBucketSnapshots[retireIdx] || {}
                const aSnap      = aBucketSnapshots[retireIdx] || {}
                const dRoth      = Math.round(dSnap.rothTotal  || 0)
                const dBrk       = Math.round(dSnap.brokerage  || 0)
                const dBrkBasis  = Math.round(Math.min(dSnap.brokerageBasis || 0, dBrk))
                const dBrkGains  = Math.max(0, dBrk - dBrkBasis)
                const dRothContr = Math.round(dSnap.roth       || 0)
                const dRothGains = Math.max(0, dRoth - dRothContr)
                const aRoth      = Math.round(aSnap.rothTotal  || 0)
                const aBrk       = Math.round(aSnap.brokerage  || 0)
                const aBrkBasis  = Math.round(Math.min(aSnap.brokerageBasis || 0, aBrk))
                const aBrkGains  = Math.max(0, aBrk - aBrkBasis)
                const aRothContr = Math.round(aSnap.roth       || 0)
                const aRothGains = Math.max(0, aRoth - aRothContr)
                // Lump balance at retirement — use actual simulated balance (after all draws) not naive FV
                const dLumpGrown   = Math.round(dSnap.lump ?? dLumpBuyFV_rY)
                const dLumpBasis   = Math.round(dSnap.lumpBasis ?? dLumpBuy)
                const dSaleGrown   = Math.round(retireSaleBonus_d)
                const dExtra       = dLumpGrown + dSaleGrown

                const aLumpGrown   = Math.round(aLumpAtRetire)
                const aLumpBasis   = Math.round(aLumpBuy)
                const aSaleGrown   = Math.round(retireSaleBonus_a)
                const aExtra       = aLumpGrown + aSaleGrown

                const dHYSARetire = Math.round(dSnap.hysa || 0)
                const aHYSARetire = Math.round(aSnap.hysa || 0)

                const dTotal     = dRoth + dBrk + dExtra + dHYSARetire
                const aTotal     = aRoth + aBrk + aExtra + aHYSARetire
                const combined   = dTotal + aTotal
                const combinedToday = Math.round(combined / inflFactorRY)
                return (
                  <div className="retire-summary">
                    <div className="rs-title">💼 At retirement (Yr {rY})</div>
                    <div className="rs-grid">
                      {/* header */}
                      <div className="rs-hdr" />
                      <div className="rs-hdr rs-hdr-d d-color">D</div>
                      <div className="rs-hdr rs-hdr-a a-color">A</div>
                      {/* Roth */}
                      <div className="rs-label">🟢 Roth IRA</div>
                      <div className="rs-val d-color">{fmt(dRoth)}</div>
                      <div className="rs-val a-color">{fmt(aRoth)}</div>
                      {dRothContr > 0 || aRothContr > 0 ? (
                        <>
                          <div className="rs-sub">contributions (tax-free)</div>
                          <div className="rs-sub-val">{dRothContr > 0 ? fmt(dRothContr) : '—'}</div>
                          <div className="rs-sub-val">{aRothContr > 0 ? fmt(aRothContr) : '—'}</div>
                        </>
                      ) : null}
                      {dRothGains > 0 || aRothGains > 0 ? (
                        <>
                          <div className="rs-sub">gains (all tax-free)</div>
                          <div className="rs-sub-val">{dRothGains > 0 ? fmt(dRothGains) : '—'}</div>
                          <div className="rs-sub-val">{aRothGains > 0 ? fmt(aRothGains) : '—'}</div>
                        </>
                      ) : null}
                      {/* Brokerage */}
                      <div className="rs-label">📈 Brokerage</div>
                      <div className="rs-val d-color">{fmt(dBrk)}</div>
                      <div className="rs-val a-color">{fmt(aBrk)}</div>
                      {dBrkBasis > 0 || aBrkBasis > 0 ? (
                        <>
                          <div className="rs-sub">principal (tax-free)</div>
                          <div className="rs-sub-val">{dBrkBasis > 0 ? fmt(dBrkBasis) : '—'}</div>
                          <div className="rs-sub-val">{aBrkBasis > 0 ? fmt(aBrkBasis) : '—'}</div>
                        </>
                      ) : null}
                      {dBrkGains > 0 || aBrkGains > 0 ? (
                        <>
                          <div className="rs-sub">gains ({capitalGainsTaxPct||20}% cap gains tax)</div>
                          <div className="rs-sub-val rs-gains">{dBrkGains > 0 ? fmt(dBrkGains) : '—'}</div>
                          <div className="rs-sub-val rs-gains">{aBrkGains > 0 ? fmt(aBrkGains) : '—'}</div>
                        </>
                      ) : null}
                      {/* Extra cash (lump / sale) */}
                      {(dExtra > 0 || aExtra > 0) && (<>
                        <div className="rs-label">💵 Savings cash{sellAndMove ? ' + sale' : ''}</div>
                        <div className="rs-val d-color">{dExtra > 0 ? fmt(dExtra) : '—'}</div>
                        <div className="rs-val a-color">{aExtra > 0 ? fmt(aExtra) : '—'}</div>
                        {(dLumpBasis > 0 || aLumpBasis > 0) && <>
                          <div className="rs-sub">principal (tax-free)</div>
                          <div className="rs-sub-val">{dLumpBasis > 0 ? fmt(dLumpBasis) : '—'}</div>
                          <div className="rs-sub-val">{aLumpBasis > 0 ? fmt(aLumpBasis) : '—'}</div>
                        </>}
                      </>)}
                      {/* HYSA */}
                      {(dHYSARetire > 0 || aHYSARetire > 0) && (<>
                        <div className="rs-label">💰 HYSA</div>
                        <div className="rs-val d-color">{dHYSARetire > 0 ? fmt(dHYSARetire) : '—'}</div>
                        <div className="rs-val a-color">{aHYSARetire > 0 ? fmt(aHYSARetire) : '—'}</div>
                        <>
                          <div className="rs-sub">tax-free for medical expenses</div>
                          <div className="rs-sub-val" />
                          <div className="rs-sub-val" />
                        </>
                      </>)}
                      {/* Total */}
                      <div className="rs-total-label">Total</div>
                      <div className="rs-total-val d-color">{fmt(dTotal)}</div>
                      <div className="rs-total-val a-color">{fmt(aTotal)}</div>
                    </div>
                    <div className="rs-combined">
                      Combined <strong>{fmt(combined)}</strong>
                      <span className="rs-today"> · {fmt(combinedToday)} in today's dollars</span>
                    </div>
                    {rentOut && (
                      <div className="rs-equity-note">
                        + House still owned (move-out Yr {rentMoveOutYear}) — est. value {fmt(houseValueAtEnd)} · D {fmt(dHouseEquity)} · A {fmt(aHouseEquity)} — not included above
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="rent-vs-buy">
              <div className="rent-vs-eyebrow">🏘 What if you rented instead of buying?</div>
              <div className="rent-vs-title">
                vs. Rent &amp; Invest (1BR→2BR Yr {upgradeYear}, {fmt(rentBaseRentYr1 + (rentParking||0) + utilsTotal2)}→{fmt(rentBaseRentFinal + (rentParking||0) + utilsTotal2)}/mo{rentMoveEvery ? `, move every ${rentMoveEvery} yr` : ''})
              </div>
              <div style={{ marginBottom: 8 }}>
                <div className="own-row-label">A pays budget · {aBudgetIncrease > 0 ? `+${aBudgetIncrease}%/yr` : 'flat'} · D covers rest</div>
                <div className="cost-projection" style={{ marginTop: 8 }}>
                  <div className="cost-proj-title">Monthly rent cost ({rentIncreaseRate}% lease / {utilIncreaseRate}% util increase)</div>
                  <div className="cost-proj-header cost-proj-header-4">
                    <span>Year</span><span className="d-color">D</span><span className="a-color">A</span><span>Total</span>
                  </div>
                  {[3,6,9,12,15,18,21,24,27,30].filter(y => y <= iYrs).map(snapY => {
                    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, snapY)
                    const ru = rentUtilities || {}
                    const utilsSnap = (ru.water||0)*uf + (ru.sewer||0)*uf + (ru.trash||0)*uf + (ru.electricity||0)*uf
                    const parkSnap  = (rentParking||0) * uf
                    const total = calcRentAtYear(snapY) + utilsSnap + parkSnap
                    const aOwes = Math.min(aRentBudgetAtYear(snapY), total)
                    const dOwesTotal = total - aOwes
                    const dFromPool = Math.max(0, dOwesTotal - (dBudget || 0))
                    const overBudget = dFromPool > 0
                    return (
                      <div key={snapY} className={`cost-proj-row cost-proj-row-4${overBudget ? ' rent-over-budget' : ''}`}>
                        <span>Yr {snapY}</span>
                        <span className="d-color cost-proj-cell">
                          <span>{fmt(Math.round(dOwesTotal))}</span>
                          {overBudget && <span className="pool-draw-tag">−{fmt(Math.round(dFromPool))} pool</span>}
                        </span>
                        <span className="a-color">{fmt(Math.round(aOwes))}</span>
                        <span style={{ color: overBudget ? '#ef4444' : '#374151', fontWeight: 600 }}>{fmt(Math.round(total))}</span>
                      </div>
                    )
                  })}
                  {[3,6,9,12,15,18,21,24,27,30].filter(y => y <= iYrs).some(snapY => {
                    const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, snapY)
                    const ru = rentUtilities || {}
                    const t = calcRentAtYear(snapY) + (ru.water||0)*uf + (ru.sewer||0)*uf + (ru.trash||0)*uf + (ru.electricity||0)*uf + (rentParking||0)*uf
                    return t - Math.min(aRentBudgetAtYear(snapY), t) > (dBudget || 0)
                  }) && (
                    <div className="rent-over-note">⚠ D's budget ({fmt(dBudget)}/mo) exceeded in some years — shortfall drawn from D's portfolio</div>
                  )}
                </div>
              </div>
              <button className="snap-toggle-btn" onClick={onToggleSnapshots}>
                {snapshotsExpanded ? '▾ Hide' : '▸ Show'} year-by-year
              </button>
              <div className="invest-snapshots">
                {snapshotsExpanded && [3,6,9,12,15,18,21,24,27,30].filter(y => y <= iYrs).map(snapY => {
                  const rentAtSnap = calcRentAtYear(snapY)
                  const uf = Math.pow(1 + (utilIncreaseRate || 0) / 100, snapY)
                  const ru = rentUtilities || {}
                  const waterAtSnap   = Math.round((ru.water  || 0) * uf)
                  const sewerAtSnap   = Math.round((ru.sewer  || 0) * uf)
                  const trashAtSnap   = Math.round((ru.trash  || 0) * uf)
                  const elecAtSnap    = Math.round((ru.electricity || 0) * uf)
                  const parkingAtSnap = Math.round((rentParking || 0) * uf)
                  const utilsAtSnap   = waterAtSnap + sewerAtSnap + trashAtSnap + elecAtSnap
                  const totalAtSnap   = rentAtSnap + utilsAtSnap + parkingAtSnap
                  const dSnap = dRentBucketSnapshots[snapY - 1] || {}
                  const aSnap = aRentBucketSnapshots[snapY - 1] || {}
                  const dSavesAt = dRentYearlyInvest[snapY - 1] || 0
                  const aSavesAt = aRentYearlyInvest[snapY - 1] || 0
                  const dTotalPort = (dSnap.rothTotal || 0) + (dSnap.brokerage || 0) + (dSnap.hysa || 0) + (dSnap.lump || 0)
                  const aTotalPort = (aSnap.rothTotal || 0) + (aSnap.brokerage || 0) + (aSnap.hysa || 0) + (aSnap.lump || 0)
                  const dSpendToday = spendingCap || 0
                  const aSpendToday = aSpendingCap || 0
                  return (
                    <div key={snapY} className="yr-snap">
                      <div className="yr-snap-header">
                        <span className="yr-snap-yr">Yr {snapY} · Age {(currentAge || 33) + snapY}</span>
                        <span className="yr-snap-housing">
                          {fmt(rentAtSnap)} rent
                          {waterAtSnap > 0 ? ` · ${fmt(waterAtSnap)} water` : ''}
                          {sewerAtSnap > 0 ? ` · ${fmt(sewerAtSnap)} sewer` : ''}
                          {trashAtSnap > 0 ? ` · ${fmt(trashAtSnap)} trash` : ''}
                          {elecAtSnap  > 0 ? ` · ${fmt(elecAtSnap)} electric` : ''}
                          {parkingAtSnap > 0 ? ` · ${fmt(parkingAtSnap)} park` : ''}
                          {' '}<strong>= {fmt(totalAtSnap)}/mo</strong>
                        </span>
                      </div>
                      {[
                        { who: 'D', savesAt: dSavesAt, fv: dTotalPort, snap: dSnap, colorClass: 'd-color',
                          housing: Math.round((dBudget || 0) - dSavesAt),
                          spillPaidForA: Math.round(((aSnap.spillFromDRoth || 0) + (aSnap.spillFromDBrokerage || 0) + (aSnap.spillFromDLump || 0) + (aSnap.spillFromDRothGains || 0) + (aSnap.spillCashOffset || 0)) / 12),
                          personSpend: dSpendToday },
                        { who: 'A', savesAt: aSavesAt, fv: aTotalPort, snap: aSnap, colorClass: 'a-color',
                          housing: Math.round((aBudget || 0) - aSavesAt),
                          spillPaidForA: 0, personSpend: aSpendToday },
                      ].map(({ who, savesAt, fv, snap, colorClass, housing, spillPaidForA, personSpend }) => {
                        const inflFactor = Math.pow(1 + (spendInflationRate || inflationRate || 3) / 100, snapY)
                        const spendNominal = Math.round(personSpend * inflFactor)
                        const spendExtra = spendNominal - personSpend
                        const spendExtraToday = Math.round(spendExtra / inflFactor)
                        const inDeficit = (savesAt - spillPaidForA) < 0
                        return (
                          <div key={who} className="yr-snap-person">
                            <div className="ysp-header">
                              <span className={`ysp-who ${colorClass}`}>{who}</span>
                              {(() => {
                                const budget = who === 'D' ? dBudget : aBudget
                                const leftover = savesAt
                                const rothMo = Math.round(snap.rothAlloc || 0)
                                const brkMo  = Math.round(snap.brokerageAlloc || 0)
                                const spillRoth      = Math.round((aSnap.spillFromDRoth || 0) / 12)
                                const spillBrk       = Math.round((aSnap.spillFromDBrokerage || 0) / 12)
                                const spillLump      = Math.round((aSnap.spillFromDLump || 0) / 12)
                                const spillRothGains = Math.round((aSnap.spillFromDRothGains || 0) / 12)
                                const ownRoth       = Math.round((snap.drawFromRoth || 0) / 12) - spillRoth
                                const ownBrk        = Math.round((snap.drawFromBrokerage || 0) / 12) - spillBrk
                                const dBrkPrincipal = Math.round((snap.brkPrincipalDraw || 0) / 12)
                                const dBrkGains     = Math.round((snap.brkGainsDraw || 0) / 12)
                                const ownRothGains  = Math.round((snap.drawFromRothGains || 0) / 12) - spillRothGains
                                const ownLump       = Math.round((snap.drawFromLump || 0) / 12) - spillLump
                                const netInvest = leftover - spillPaidForA
                                return (
                                  <div className="ysp-rows">
                                    <div className="ysp-row">
                                      <span className="ysp-row-lbl">Budget</span>
                                      <span className="ysp-row-val">{fmt(budget)}</span>
                                    </div>
                                    <div className="ysp-row">
                                      <span className="ysp-row-lbl">Housing</span>
                                      <span className="ysp-row-val ysp-row-neg">−{fmt(housing)}</span>
                                    </div>
                                    <div className="ysp-row ysp-row-total">
                                      <span className="ysp-row-lbl">Leftover</span>
                                      <span className={`ysp-row-val ${leftover >= 0 ? 'ysp-row-pos' : 'ysp-row-neg'}`}>
                                        {leftover >= 0 ? '+' : '−'}{fmt(Math.abs(leftover))}/mo
                                      </span>
                                    </div>
                                    {spillPaidForA > 0 && (
                                      <div className="ysp-row">
                                        <span className="ysp-row-lbl">Covers A</span>
                                        <span className="ysp-row-val ysp-row-blue">−{fmt(spillPaidForA)}</span>
                                      </div>
                                    )}
                                    {spillPaidForA > 0 && (
                                      <div className="ysp-row ysp-row-total">
                                        <span className="ysp-row-lbl">{netInvest >= 0 ? 'Invests' : 'Deficit'}</span>
                                        <span className={`ysp-row-val ${netInvest >= 0 ? 'ysp-row-pos' : 'ysp-row-neg'}`}>
                                          {netInvest >= 0 ? '+' : '−'}{fmt(Math.abs(netInvest))}/mo
                                        </span>
                                      </div>
                                    )}
                                    {netInvest > 0 && (rothMo > 0 || brkMo > 0) && (
                                      <div className="ysp-row ysp-row-buckets">
                                        <span className="ysp-row-lbl"></span>
                                        <span className="ysp-row-val">
                                          {rothMo > 0 && <span className="ysp-alloc-chip ysp-alloc-roth">Roth +{fmt(rothMo)}/mo</span>}
                                          {brkMo  > 0 && <span className="ysp-alloc-chip ysp-alloc-brk">Brk +{fmt(brkMo)}/mo</span>}
                                        </span>
                                      </div>
                                    )}
                                    {netInvest < 0 && (ownRoth > 0 || ownBrk > 0 || ownRothGains > 0 || ownLump > 0) && (() => {
                                      const rothDrained = (snap.roth || 0) === 0
                                      const rothDrainedByBrk = rothDrained && ownBrk > 0
                                      return (
                                        <div className="ysp-row ysp-row-buckets">
                                          <span className="ysp-row-lbl" style={{color:'#fb923c'}}>🏠 from</span>
                                          <span className="ysp-row-val">
                                            {ownRoth > 0 && <span className="ysp-alloc-chip" style={{background:'rgba(251,146,60,0.15)',color:'#fb923c'}}>Roth −{fmt(ownRoth)}/mo{rothDrainedByBrk && <span style={{fontWeight:400,color:'#ef4444'}}> · drained</span>}</span>}
                                            {ownBrk > 0 && <span className="ysp-alloc-chip" style={{background:'rgba(251,146,60,0.15)',color:'#fb923c'}}>Brk −{fmt(ownBrk)}/mo{dBrkPrincipal > 0 && <span style={{fontWeight:400}}> · {fmt(dBrkPrincipal)} principal</span>}</span>}
                                            {ownRothGains > 0 && <span className="ysp-alloc-chip" style={{background:'rgba(251,146,60,0.15)',color:'#fb923c'}}>Roth gains −{fmt(ownRothGains)}/mo</span>}
                                            {ownLump > 0 && <span className="ysp-alloc-chip" style={{background:'rgba(251,146,60,0.15)',color:'#fb923c'}}>Cash −{fmt(ownLump)}/mo</span>}
                                          </span>
                                        </div>
                                      )
                                    })()}
                                    {who === 'A' && savesAt < 0 && (
                                      <div className="ysp-row" style={{color:'#f87171',fontSize:'0.62rem'}}>
                                        <span>gap covered by D</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                            {/* Spending section */}
                            {(() => {
                              const income = who === 'D' ? (dIncome || 0) : (aIncome || 0)
                              const budget = who === 'D' ? dBudget : aBudget
                              if (!income && !spendNominal) return null
                              const incomeAfterBudget = Math.max(0, income - budget)
                              const spendFromSavings  = Math.max(0, spendNominal - incomeAfterBudget)
                              const spendSurplus      = Math.max(0, incomeAfterBudget - spendNominal)
                              if (!spendNominal && !income) return null
                              return (
                                <div className="ysp-spend-section">
                                  {income > 0 && <div className="ysp-spend-row"><span className="ysp-spend-lbl">Income</span><span className="ysp-spend-val">{fmt(income)}</span></div>}
                                  {income > 0 && <div className="ysp-spend-row"><span className="ysp-spend-lbl">Budget</span><span className="ysp-spend-val ysp-spend-neg">−{fmt(budget)}</span></div>}
                                  {spendNominal > 0 && <div className="ysp-spend-row"><span className="ysp-spend-lbl">Spend</span><span className="ysp-spend-val ysp-spend-neg">−{fmt(spendNominal)}</span></div>}
                                  <div className="ysp-spend-row ysp-spend-total">
                                    <span className="ysp-spend-lbl">&nbsp;</span>
                                    {spendFromSavings > 0
                                      ? <span className="ysp-spend-drawn">−{fmt(spendFromSavings)}/mo drawn</span>
                                      : <span className="ysp-spend-surplus">+{fmt(spendSurplus)}/mo surplus</span>}
                                  </div>
                                </div>
                              )
                            })()}
                            {personSpend > 0 && (
                              <div className="ysp-spend-bar">
                                <span className="ysp-spend-label">💸 {fmt(personSpend)}/mo today = {fmt(spendNominal)} at Yr {snapY} · +{fmt(spendExtra)} more needed</span>
                                <span className="ysp-spend-short">= −{fmt(spendExtraToday)} in today's $</span>
                              </div>
                            )}
                            {/* Balance table — same structure as buy path */}
                            <table className="ysp-table">
                              <tbody>
                                <tr className="ysp-tr-total">
                                  <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--total" /></td>
                                  <td className="ysp-td-name">Total portfolio</td>
                                  <td className={`ysp-td-val ${colorClass}`}>{fmt(Math.round(fv))}</td>
                                </tr>
                                {(snap.hysa || 0) > 0 || (snap.hysaMonthly || 0) > 0 || (snap.hysaSpendDraw || 0) > 0 || (snap.spendForA_hysa || 0) > 0 ? (
                                  <tr>
                                    <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--hysa" /></td>
                                    <td className="ysp-td-name">
                                      {(snap.hysa || 0) === 0
                                        ? <span>HYSA <span className="ysp-sub">(depleted)</span>
                                            {(snap.hysaSpendDraw || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.hysaSpendDraw||0)/12))}/mo · drained</span>}
                                          </span>
                                        : <span>HYSA
                                            {(snap.hysaMonthly || 0) > 0 && <span className="ysp-alloc-chip ysp-alloc-hysa">+{fmt(Math.round(snap.hysaMonthly))}/mo</span>}
                                            {(snap.hysaSpendDraw || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.hysaSpendDraw||0)/12))}/mo</span>}
                                            {who === 'D' && (snap.spendForA_hysa || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_hysa)/12))}/mo</span>}
                                            {who === 'A' && (snap.spendForD_hysa || 0) > 0 && <span className="ysp-sub" style={{color:'#a78bfa', display:'block', fontWeight:600}}>🤝 D's spend −{fmt(Math.round((snap.spendForD_hysa)/12))}/mo</span>}
                                          </span>}
                                    </td>
                                    <td className="ysp-td-val ysp-hysa">{fmt(Math.round(snap.hysa || 0))}</td>
                                  </tr>
                                ) : null}
                                <tr>
                                  <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--roth" /></td>
                                  <td className="ysp-td-name">Roth contrib <span className="ysp-sub">(tax-free)</span>
                                    {(snap.rothAlloc || 0) > 0 && <span className="ysp-alloc-chip ysp-alloc-roth">+{fmt(Math.round(snap.rothAlloc))}/mo</span>}
                                    {(snap.drawFromRoth || 0) > 0 && inDeficit && <span className="ysp-sub" style={{color:'#fb923c', display:'block'}}>🏠 housing −{fmt(Math.round((snap.drawFromRoth||0)/12))}/mo{(snap.roth||0)===0 ? ' · drained' : ''}</span>}
                                    {(snap.spendRothDraw || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendRothDraw||0)/12))}/mo{(snap.roth||0)===0 ? ' · drained' : ''}</span>}
                                    {who === 'D' && (snap.spendForA_roth || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_roth)/12))}/mo</span>}
                                    {who === 'A' && (snap.spendForD_roth || 0) > 0 && <span className="ysp-sub" style={{color:'#a78bfa', display:'block', fontWeight:600}}>🤝 D's spend −{fmt(Math.round((snap.spendForD_roth)/12))}/mo</span>}
                                  </td>
                                  <td className="ysp-td-val ysp-roth">{fmt(Math.round(snap.roth || 0))}</td>
                                </tr>
                                {((snap.rothEarnings || 0) > 0 || (snap.spendRothGainsDraw || 0) > 0 || (who === 'A' && (snap.spendForD_rothGains || 0) > 0) || (who === 'D' && (snap.spendForA_rothGains || 0) > 0)) && (
                                  <tr className="ysp-tr-sub">
                                    <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--locked" /></td>
                                    <td className="ysp-td-name ysp-locked">Roth gains <span className="ysp-sub">(tax-free after 59½)</span>
                                      {(snap.spendRothGainsDraw || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendRothGainsDraw||0)/12))}/mo</span>}
                                      {who === 'D' && (snap.spendForA_rothGains || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_rothGains)/12))}/mo</span>}
                                      {who === 'A' && (snap.spendForD_rothGains || 0) > 0 && <span className="ysp-sub" style={{color:'#a78bfa', display:'block', fontWeight:600}}>🤝 D's spend −{fmt(Math.round((snap.spendForD_rothGains)/12))}/mo</span>}
                                    </td>
                                    <td className="ysp-td-val ysp-locked">{fmt(Math.round(snap.rothEarnings || 0))}</td>
                                  </tr>
                                )}
                                {(() => {
                                  const basis = Math.round(Math.min(snap.brokerageBasis || 0, snap.brokerage || 0))
                                  const gains = Math.round(Math.max(0, (snap.brokerage || 0) - basis))
                                  if (basis === 0 && gains === 0 && (snap.brokerageAlloc || 0) === 0) return null
                                  return (<>
                                    <tr>
                                      <td className="ysp-td-dot"><span className="ysp-dot ysp-dot--brk" /></td>
                                      <td className="ysp-td-name">Brk principal <span className="ysp-sub">(tax-free)</span>
                                        {(snap.brokerageAlloc || 0) > 0 && <span className="ysp-alloc-chip ysp-alloc-brk">+{fmt(Math.round(snap.brokerageAlloc))}/mo</span>}
                                        {(snap.spendBrkPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendBrkPrincipal||0)/12))}/mo</span>}
                                        {who === 'D' && (snap.spendForA_brkPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_brkPrincipal)/12))}/mo</span>}
                                        {who === 'A' && (snap.spendForD_brkPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#a78bfa', display:'block', fontWeight:600}}>🤝 D's spend −{fmt(Math.round((snap.spendForD_brkPrincipal)/12))}/mo</span>}
                                      </td>
                                      <td className="ysp-td-val ysp-brk">{fmt(basis)}</td>
                                    </tr>
                                    {gains > 0 && (
                                      <tr className="ysp-tr-sub">
                                        <td className="ysp-td-dot" />
                                        <td className="ysp-td-name ysp-sub-indent">Brk gains <span className="ysp-sub">(cap gains tax on withdrawal)</span>
                                          {(snap.spendBrkGains || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendBrkGains||0)/12))}/mo + {fmt(Math.round((snap.spendBrkTax||0)/12))} tax</span>}
                                          {who === 'D' && (snap.spendForA_brkGains || 0) > 0 && <span className="ysp-sub" style={{color:'#60a5fa', display:'block', fontWeight:600}}>🤝 A's spend −{fmt(Math.round((snap.spendForA_brkGains)/12))}/mo</span>}
                                          {who === 'A' && (snap.spendForD_brkGains || 0) > 0 && <span className="ysp-sub" style={{color:'#a78bfa', display:'block', fontWeight:600}}>🤝 D's spend −{fmt(Math.round((snap.spendForD_brkGains)/12))}/mo</span>}
                                        </td>
                                        <td className="ysp-td-val ysp-sub-val ysp-locked">{fmt(gains)}</td>
                                      </tr>
                                    )}
                                  </>)
                                })()}
                                {((who === 'D' && dLumpRent > 0) || (who === 'A' && aLumpRent > 0)) && ((snap.lump || 0) > 0 || (who === 'A' && (snap.spendForD_lumpPrincipal || 0) > 0)) && (
                                  <tr>
                                    <td className="ysp-td-dot"><span className="ysp-dot" style={{background:'#6b7280'}} /></td>
                                    <td className="ysp-td-name">Uninvested cash <span className="ysp-sub">(principal tax-free · gains at cap gains)</span>
                                      {(snap.spendLumpPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendLumpPrincipal||0)/12))}/mo principal</span>}
                                      {(snap.spendLumpGains || 0) > 0 && <span className="ysp-sub" style={{color:'#f87171', display:'block'}}>💸 spend −{fmt(Math.round((snap.spendLumpGains||0)/12))}/mo gains + {fmt(Math.round((snap.spendLumpTax||0)/12))} tax</span>}
                                      {who === 'A' && (snap.spendForD_lumpPrincipal || 0) > 0 && <span className="ysp-sub" style={{color:'#a78bfa', display:'block', fontWeight:600}}>🤝 D's spend −{fmt(Math.round((snap.spendForD_lumpPrincipal)/12))}/mo principal</span>}
                                      {who === 'A' && (snap.spendForD_lumpGains || 0) > 0 && <span className="ysp-sub" style={{color:'#a78bfa', display:'block', fontWeight:600}}>🤝 D's spend −{fmt(Math.round((snap.spendForD_lumpGains)/12))}/mo gains + {fmt(Math.round((snap.spendForD_lumpTax||0)/12))} tax</span>}
                                    </td>
                                    <td className="ysp-td-val" style={{color:'#9ca3af'}}>{fmt(Math.round(snap.lump || 0))}</td>
                                  </tr>
                                )}
                                {who === 'A' && (snap.spendCoveredByD || 0) > 0 && (
                                  <tr><td colSpan={3}>
                                    <div style={{fontSize:'0.65rem', color:'#60a5fa', fontWeight:600, padding:'4px 0', background:'rgba(96,165,250,0.08)', borderRadius:4, padding:'6px 8px', margin:'4px 0'}}>
                                      🤝 D covers A's spend: {fmt(Math.round((snap.spendCoveredByD)/12))}/mo from D's accounts
                                    </div>
                                  </td></tr>
                                )}
                                {who === 'D' && (snap.spendCoveredByA || 0) > 0 && (
                                  <tr><td colSpan={3}>
                                    <div style={{fontSize:'0.65rem', color:'#a78bfa', fontWeight:600, background:'rgba(167,139,250,0.08)', borderRadius:4, padding:'6px 8px', margin:'4px 0'}}>
                                      🤝 A covers D's spend: {fmt(Math.round((snap.spendCoveredByA)/12))}/mo from A's accounts
                                    </div>
                                  </td></tr>
                                )}
                                {(snap.spendDeficit || 0) > 0 && (
                                  <tr><td colSpan={3}>
                                    <div style={{fontSize:'0.65rem', color:'#ef4444', fontWeight:600, padding:'4px 0'}}>
                                      ⚠ All buckets depleted · −{fmt(Math.round((snap.spendDeficit||0)/12))}/mo spend inflation gap uncovered
                                    </div>
                                  </td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )
                      })}
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
                <span className="invest-combined-today"> · {fmt(Math.round((dRentInvestFV + aRentInvestFV) / inflFactorRY))} today</span>
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
              <span className="retire-params">{inflationRate}% inflation · {investRate}% returns</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Combined portfolio</span>
              <span className="retire-val">{fmt(combinedPortRetire)}</span>
            </div>
            {totalBucketFV > 0 && (
              <div className="retire-combined-row" style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                <span className="retire-label">Bucket split at retirement</span>
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#34d399' }}>Roth {Math.round((1 - tradFraction - brokerageFraction) * 100)}%</span>
                  <span style={{ color: '#60a5fa' }}>Trad {Math.round(tradFraction * 100)}%</span>
                  <span style={{ color: '#f59e0b' }}>Brokerage {Math.round(brokerageFraction * 100)}%</span>
                </span>
              </div>
            )}
            <div className="retire-combined-row">
              <span className="retire-label">Spending target (D + A)</span>
              <span className="retire-val">{fmt(combinedSpendCap)}/mo today</span>
            </div>
            <div className="retire-tax-banner">
              <span className="retire-tax-strategy">
                💰 Withdrawal taxes by location · blended from bucket split
              </span>
              <div className="retire-tax-grid">
                <span>Opt 1 (stay CA):</span><span className="retire-tax-tag-inline">{Math.round(blendedTaxRate(28) * 100)}% blended</span>
                <span>Opt 2–3 (overseas):</span><span className="retire-tax-tag-inline">{Math.round(blendedTaxRate(15) * 100)}% blended</span>
                <span>Opt 4–7 (relocate US):</span><span className="retire-tax-tag-inline">{Math.round(blendedTaxRate(20) * 100)}% blended</span>
                <span>Opt 8 (rentvest):</span><span className="retire-tax-tag-inline">{Math.round(blendedTaxRate(20) * 100)}% blended</span>
              </div>
              {combinedSS > 0 && (
                <span className="retire-tax-gross" style={{ color: '#60a5fa' }}>
                  🏛 SS {fmt(combinedSS)}/mo (D {fmt(dSS||0)} + A {fmt(aSS||0)}) · starts age {ssClaimAge || 67} · offsets pool withdrawals
                </span>
              )}
            </div>
            {/* Sell & Move Overseas — sell house at retirement, move overseas with overseas costs */}
            <div className="retire-snap-header" style={{ borderTop: 'none', marginTop: 8, paddingTop: 0 }}>
              Option 1 · 🌏 Sell &amp; Move Overseas · {fmt(overseasCost || 0)}/mo housing today <span className="retire-tax-tag">{Math.round(blendedTaxRate(20) * 100)}% blended tax</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Buy path pool at Yr {rY}</span>
              <span className="retire-val">{fmt(combinedPortRetire)}</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">+ Sale proceeds ({fmt(Math.round(retireAppreciatedPrice))} − 6% costs{retireSellRemainingLoan > 0 ? ` − ${fmt(Math.round(retireSellRemainingLoan))} loan` : ''})</span>
              <span className="retire-val" style={{ color: '#22c55e' }}>+{fmt(Math.round(sellProceedsAfterTax))}</span>
            </div>
            {capitalGainsTax > 0 && (
              <div className="retire-combined-row">
                <span className="retire-label" style={{ color: '#f87171' }}>− Cap gains tax ({capitalGainsTaxPct}% on {fmt(Math.round(capitalGain))} gain)</span>
                <span className="retire-val" style={{ color: '#f87171' }}>-{fmt(Math.round(capitalGainsTax))}</span>
              </div>
            )}
            <div className="retire-combined-row" style={{ borderTop: '1px solid #334155', paddingTop: 4, marginTop: 2 }}>
              <span className="retire-label">Total starting pool</span>
              <span className="retire-val">{fmt(Math.round(overseasSellStartPool))}</span>
            </div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>Spending · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, overseasSellHousingMonthly, overseasSellAfterHousing, overseasSellPoolRemaining, overseasSellPoolReal, ssIncome, careOverseas }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const overseasSellHousingToday = overseasSellHousingMonthly / inflFactorY
                const overseasSellAfterToday = overseasSellAfterHousing / inflFactorY
                const displayHousing = careOverseas > 0 ? careOverseas : overseasSellHousingMonthly
                const displayHousingToday = displayHousing / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(displayHousing))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(displayHousingToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(overseasSellAfterHousing))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(overseasSellAfterToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {overseasSellPoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(Math.round(overseasSellPoolRemaining))}</span>
                            <span className="retire-pool-real">{fmt(Math.round(overseasSellPoolReal))} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {ssIncome > 0 && <div className="ss-income-line">🏛 SS {fmt(Math.round(ssIncome))}/mo offsets pool withdrawals</div>}
                    {careOverseas > 0 && <div className="care-cost-line">🏥 overseas care (all-inclusive, replaces housing)</div>}
                  </div>
                )
              })}
            </div>
            <div className="retire-note">Sell at retirement · move overseas · overseas care pricing · no US housing costs</div>

            <div className="retire-option-divider" />
            <div className="retire-snap-header">Option 2 · 🏠 Stay in US <span className="retire-tax-tag">{Math.round(blendedTaxRate(28) * 100)}% blended withdrawal tax</span></div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>After housing</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, housing, housingBreakdown, netRental, poolRemaining, afterHousing, ssIncome, careUS }) => {                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const poolReal = poolRemaining / inflFactorY
                const afterHousingReal = afterHousing / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(housing)}/mo</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(afterHousing)}/mo</span>
                        <span className="retire-pool-real">-{fmt(afterHousingReal)} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {poolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(poolRemaining)}</span>
                            <span className="retire-pool-real">{fmt(poolReal)} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    <div className="rvd-cost-line" style={{ marginTop: 2 }}>
                      {[
                        housingBreakdown.pi > 0 ? `${fmt(housingBreakdown.pi)} P&I` : '',
                        housingBreakdown.tax > 0 ? `${fmt(housingBreakdown.tax)} tax` : '',
                        housingBreakdown.hoa > 0 ? `${fmt(housingBreakdown.hoa)} ${baseMaintenanceMonthly > 0 ? 'repairs' : 'HOA'}` : '',
                        housingBreakdown.insurance > 0 ? `${fmt(housingBreakdown.insurance)} ins` : '',
                        housingBreakdown.utils > 0 ? `${fmt(housingBreakdown.utils)} utils` : '',
                      ].filter(Boolean).join(' · ')}
                      {housingBreakdown.mortgagePaidOff && <span style={{color:'#10b981'}}> · ✓ paid off</span>}
                    </div>
                    {ssIncome > 0 && (
                      <div className="ss-income-line">
                        🏛 SS covers {fmt(Math.round(ssIncome))}/mo · net from pool: {fmt(Math.max(0, Math.round(afterHousing + housing - ssIncome)))}/mo
                      </div>
                    )}
                    {careUS > 0 && (
                      <div className="care-cost-line">
                        🏥 +{fmt(Math.round(careUS))}/mo care facility
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="retire-option-divider" />
            <div className="retire-snap-header retire-overseas-header">
              <span>Option 3 · 🌏 Overseas · {fmt(overseasSpendingCap || 0)}/mo spend today <span className="retire-tax-tag">{Math.round(blendedTaxRate(15) * 100)}% blended tax</span></span>
              <label className="retire-rent-input-label">
                🏠 rent out $
                <input
                  type="number" min={0} step={100}
                  value={house.monthlyRent || ''}
                  placeholder={fmt(Math.round(
                    house.beds <= 1
                      ? (rent1BR || 2100)
                      : house.beds <= 2
                        ? (rent2BR || 2600)
                        : (rent2BR || 2600) * (1 + (house.beds - 2) * 0.2)
                  ))}
                  className="retire-rent-input"
                  onChange={e => onStatusChange({ monthlyRent: Number(e.target.value) || 0 })}
                />
                /mo
              </label>
            </div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>From pool · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y,
                overseasHousingNominal, overseasNetRental, overseasAfterHousing,
                overseasPoolRemaining, overseasPoolReal, rentalBreakdown, ssIncome, careOverseas }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const overseasHousingToday = overseasHousingNominal / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    {/* Main row */}
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(overseasHousingNominal)}/mo</span>
                        <span className="retire-pool-real">-{fmt(overseasHousingToday)} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(overseasAfterHousing)}/mo</span>
                        <span className="retire-pool-real">-{fmt(overseasSpendingCap || 0)} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {overseasPoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(overseasPoolRemaining)}</span>
                            <span className="retire-pool-real">{fmt(overseasPoolReal)} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {/* Sub-row: US rental breakdown */}
                    <div className="retire-rental-subrow">                      <span className="retire-rental-label">🏠 US rental</span>
                      <span className="retire-surplus">rent {fmt(rentalBreakdown.grossRent)}/mo</span>
                      <span className={`retire-rental-net ${overseasNetRental >= 0 ? 'retire-surplus' : 'retire-pool-empty'}`}>
                        = {overseasNetRental >= 0 ? `+${fmt(overseasNetRental)}` : fmt(overseasNetRental)} net
                      </span>
                    </div>
                    <div className="retire-rental-breakdown">
                      {rentalBreakdown.pi > 0 && <span>−{fmt(rentalBreakdown.pi)} P&amp;I</span>}
                      <span>−{fmt(rentalBreakdown.tax)} tax</span>
                      {rentalBreakdown.hoa > 0 && <span>−{fmt(rentalBreakdown.hoa)} {baseMaintenanceMonthly > 0 ? 'repairs' : 'HOA'}</span>}
                      {rentalBreakdown.insurance > 0 && <span>−{fmt(rentalBreakdown.insurance)} ins</span>}
                      {rentalBreakdown.utils > 0 && <span>−{fmt(rentalBreakdown.utils)} utils</span>}
                      {rentalIncomeTaxPct > 0 && rentalBreakdown.netPreTax > 0 && (
                        <span style={{ color: '#f87171' }}>−{fmt(Math.round(rentalBreakdown.netPreTax - rentalBreakdown.net))} income tax ({rentalIncomeTaxPct}%)</span>
                      )}
                    </div>
                    {ssIncome > 0 && (
                      <div className="ss-income-line">
                        🏛 SS {fmt(Math.round(ssIncome))}/mo offsets pool withdrawals
                      </div>
                    )}
                    {careOverseas > 0 && (
                      <div className="care-cost-line">🏥 {fmt(Math.round(careOverseas))}/mo overseas care (all-incl · replaces rent)</div>
                    )}
                  </div>
                )
              })}
            </div>
            {(sellAndMove && rY >= saleYear)
              ? <div className="retire-note">House sold at Yr {saleYear} — no housing cost, sale proceeds in portfolio</div>
              : rY > effectivePaidOffYear
                ? <div className="retire-note">Mortgage paid off at Yr {effectivePaidOffYear} — no P&I, only HOA + tax + utils</div>
                : hasRefi
                  ? <div className="retire-note">🔄 Refi at Yr {refiYear} → {refiRate}% · {resolvedRefiTerm} yr{refiTermYears === 0 ? ' (remaining)' : ''} (paid off Yr {effectivePaidOffYear})</div>
                  : null
            }
            <div className="retire-note">🌏 Overseas (buy path) assumes US house rented out</div>

            {/* Sell & Relocate — buy path sells the house and moves */}
            <div className="retire-option-divider" />
            <div className="retire-snap-header">
              Option 4 · 🏡 Sell &amp; Relocate US · {fmt(relocateMonthlyCost || 0)}/mo housing today <span className="retire-tax-tag">{Math.round(blendedTaxRate(20) * 100)}% blended tax</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Buy path pool at Yr {rY}</span>
              <span className="retire-val">{fmt(combinedPortRetire)}</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">+ Sale proceeds ({fmt(Math.round(retireAppreciatedPrice))} − 6% costs{retireSellRemainingLoan > 0 ? ` − ${fmt(Math.round(retireSellRemainingLoan))} loan` : ''})</span>
              <span className="retire-val" style={{ color: '#22c55e' }}>+{fmt(Math.round(sellProceedsAfterTax))}</span>
            </div>
            {capitalGainsTax > 0 && (
            <div className="retire-combined-row">
              <span className="retire-label" style={{ color: '#f87171' }}>− Cap gains tax ({capitalGainsTaxPct}% on {fmt(Math.round(capitalGain))} gain)</span>
              <span className="retire-val" style={{ color: '#f87171' }}>-{fmt(Math.round(capitalGainsTax))}</span>
            </div>
            )}
            <div className="retire-combined-row" style={{ borderTop: '1px solid #334155', paddingTop: 4, marginTop: 2 }}>
              <span className="retire-label">Total starting pool</span>
              <span className="retire-val">{fmt(Math.round(sellRelocateStartPool))}</span>
            </div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>From pool · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, sellRelocateHousingMonthly, sellRelocateAfterHousing, sellRelocatePoolRemaining, sellRelocatePoolReal, ssIncome, careRelocate }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const sellRelocateHousingToday = sellRelocateHousingMonthly / inflFactorY
                const sellRelocateAfterToday = sellRelocateAfterHousing / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(sellRelocateHousingMonthly))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(sellRelocateHousingToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(sellRelocateAfterHousing))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(sellRelocateAfterToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {sellRelocatePoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(Math.round(sellRelocatePoolRemaining))}</span>
                            <span className="retire-pool-real">{fmt(Math.round(sellRelocatePoolReal))} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {ssIncome > 0 && <div className="ss-income-line">🏛 SS {fmt(Math.round(ssIncome))}/mo offsets pool withdrawals</div>}
                    {careRelocate > 0 && <div className="care-cost-line">🏥 +{fmt(Math.round(careRelocate))}/mo care facility</div>}
                  </div>
                )
              })}
            </div>
            <div className="retire-note">Sell at retirement · add proceeds to pool · housing cost = {fmt(relocateMonthlyCost || 0)}/mo US relocation today</div>

            {/* Sell & Buy — sell current house, buy new home at new location */}
            <div className="retire-option-divider" />
            <div className="retire-snap-header">
              Option 5 · 🏠 Sell &amp; Buy · {fmt(Math.round(newHomePriceNominal))} new home · {relocateBuyDownPct}% down <span className="retire-tax-tag">{Math.round(blendedTaxRate(20) * 100)}% blended tax</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Buy path pool at Yr {rY}</span>
              <span className="retire-val">{fmt(combinedPortRetire)}</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">+ Sale proceeds ({fmt(Math.round(retireAppreciatedPrice))} − 6% costs{retireSellRemainingLoan > 0 ? ` − ${fmt(Math.round(retireSellRemainingLoan))} loan` : ''})</span>
              <span className="retire-val" style={{ color: '#22c55e' }}>+{fmt(Math.round(sellProceedsAfterTax))}</span>
            </div>
            {capitalGainsTax > 0 && (
            <div className="retire-combined-row">
              <span className="retire-label" style={{ color: '#f87171' }}>− Cap gains tax ({capitalGainsTaxPct}% on {fmt(Math.round(capitalGain))} gain)</span>
              <span className="retire-val" style={{ color: '#f87171' }}>-{fmt(Math.round(capitalGainsTax))}</span>
            </div>
            )}
            <div className="retire-combined-row">
              <span className="retire-label">− New home down ({relocateBuyDownPct}% of {fmt(Math.round(newHomePriceNominal))})</span>
              <span className="retire-val" style={{ color: '#f87171' }}>-{fmt(Math.round(newHomeDownAmt))}</span>
            </div>
            <div className="retire-combined-row" style={{ borderTop: '1px solid #334155', paddingTop: 4, marginTop: 2 }}>
              <span className="retire-label">Net pool after purchase</span>
              <span className="retire-val" style={{ color: sellBuyStartPool < 0 ? '#f87171' : undefined }}>
                {sellBuyStartPool < 0 ? `-${fmt(Math.round(Math.abs(sellBuyStartPool)))}` : fmt(Math.round(sellBuyStartPool))}
              </span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Monthly P&amp;I ({fmt(Math.round(newHomePI))}) · tax · maint</span>
              <span className="retire-val">-{fmt(Math.round(newHomePI + newHomeTaxBase + newHomeMainBase))}/mo</span>
            </div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>From pool · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, sellBuyHousingMonthly, sellBuyAfterHousing, sellBuyPoolRemaining, sellBuyPoolReal, ssIncome, careRelocate }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const sellBuyHousingToday = sellBuyHousingMonthly / inflFactorY
                const sellBuyAfterToday = sellBuyAfterHousing / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(sellBuyHousingMonthly))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(sellBuyHousingToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(sellBuyAfterHousing))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(sellBuyAfterToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {sellBuyPoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(Math.round(sellBuyPoolRemaining))}</span>
                            <span className="retire-pool-real">{fmt(Math.round(sellBuyPoolReal))} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {ssIncome > 0 && <div className="ss-income-line">🏛 SS {fmt(Math.round(ssIncome))}/mo offsets pool withdrawals</div>}
                    {careRelocate > 0 && <div className="care-cost-line">🏥 +{fmt(Math.round(careRelocate))}/mo care facility</div>}
                  </div>
                )
              })}
            </div>
            <div className="retire-note">30-yr mortgage at {relocateMortgageRate}% · tax + maint grow over time · mortgage paid off at age {(currentAge || 33) + rY + 30}</div>

            {/* Sell & Buy All Cash */}
            <div className="retire-option-divider" />
            <div className="retire-snap-header">
              Option 6 · 💰 Sell &amp; Buy All Cash · {fmt(Math.round(newHomePriceNominal))} new home <span className="retire-tax-tag">{Math.round(blendedTaxRate(20) * 100)}% blended tax</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Buy path pool at Yr {rY}</span>
              <span className="retire-val">{fmt(combinedPortRetire)}</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">+ Sale proceeds ({fmt(Math.round(retireAppreciatedPrice))} − 6% costs{retireSellRemainingLoan > 0 ? ` − ${fmt(Math.round(retireSellRemainingLoan))} loan` : ''})</span>
              <span className="retire-val" style={{ color: '#22c55e' }}>+{fmt(Math.round(sellProceedsAfterTax))}</span>
            </div>
            {capitalGainsTax > 0 && (
            <div className="retire-combined-row">
              <span className="retire-label" style={{ color: '#f87171' }}>− Cap gains tax ({capitalGainsTaxPct}% on {fmt(Math.round(capitalGain))} gain)</span>
              <span className="retire-val" style={{ color: '#f87171' }}>-{fmt(Math.round(capitalGainsTax))}</span>
            </div>
            )}
            <div className="retire-combined-row">
              <span className="retire-label">− Full purchase price (all cash)</span>
              <span className="retire-val" style={{ color: '#f87171' }}>-{fmt(Math.round(newHomePriceNominal))}</span>
            </div>
            <div className="retire-combined-row" style={{ borderTop: '1px solid #334155', paddingTop: 4, marginTop: 2 }}>
              <span className="retire-label">Net pool after purchase</span>
              <span className="retire-val" style={{ color: sellBuyCashStartPool < 0 ? '#f87171' : undefined }}>
                {sellBuyCashStartPool < 0 ? `-${fmt(Math.round(Math.abs(sellBuyCashStartPool)))}` : fmt(Math.round(sellBuyCashStartPool))}
              </span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Monthly housing: tax + maint only (no mortgage)</span>
              <span className="retire-val">-{fmt(Math.round(newHomeTaxBase + newHomeMainBase))}/mo</span>
            </div>
            {sellBuyCashStartPool < combinedPortRetire + sellBuyNetProceeds && (
              <div className="retire-note" style={{ color: '#22c55e' }}>
                vs Option 5: pool is {fmt(Math.round(Math.abs(sellBuyCashStartPool - sellBuyStartPool)))} smaller but saves {fmt(Math.round(newHomePI))}/mo on mortgage
              </div>
            )}
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>From pool · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, sellBuyCashHousingMonthly, sellBuyCashAfterHousing, sellBuyCashPoolRemaining, sellBuyCashPoolReal, ssIncome, careRelocate }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const sellBuyCashHousingToday = sellBuyCashHousingMonthly / inflFactorY
                const sellBuyCashAfterToday = sellBuyCashAfterHousing / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(sellBuyCashHousingMonthly))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(sellBuyCashHousingToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(sellBuyCashAfterHousing))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(sellBuyCashAfterToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {sellBuyCashPoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(Math.round(sellBuyCashPoolRemaining))}</span>
                            <span className="retire-pool-real">{fmt(Math.round(sellBuyCashPoolReal))} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {ssIncome > 0 && <div className="ss-income-line">🏛 SS {fmt(Math.round(ssIncome))}/mo offsets pool withdrawals</div>}
                    {careRelocate > 0 && <div className="care-cost-line">🏥 +{fmt(Math.round(careRelocate))}/mo care facility</div>}
                  </div>
                )
              })}
            </div>
            <div className="retire-note">No mortgage · only tax + maintenance · full purchase price paid at retirement</div>

            {/* Option 8: Rentvest */}
            <div className="retire-option-divider" />
            <div className="retire-snap-header">
              Option 7 · 🏘 Rentvest · Buy {fmt(rentvestPrice || 0)} now · rent out · retire in <span className="retire-tax-tag">{Math.round(blendedTaxRate(20) * 100)}% blended tax</span>
            </div>

            {/* Pre-retirement summary */}
            <div className="retire-combined-row">
              <span className="retire-label">Rental property</span>
              <span className="retire-val">{fmt(rentvestPrice || 0)} · {rentvestDown}% down · {rentvestMortgageRate}% rate</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Down payment from savings</span>
              <span className="retire-val" style={{ color: '#f87171' }}>-{fmt(Math.round(rentvestDownAmt))}</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Your mortgage P&I</span>
              <span className="retire-val">-{fmt(Math.round(rentvestPI))}/mo</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Rent income (net of {rentvestMgmtFee}% mgmt)</span>
              <span className="retire-val" style={{ color: '#22c55e' }}>+{fmt(Math.round(rentvestGrossRentToday))}/mo today</span>
            </div>
            <div className="retire-combined-row" style={{ borderTop: '1px solid #334155', paddingTop: 4, marginTop: 2 }}>
              <span className="retire-label">Net cash flow today</span>
              <span className="retire-val" style={{ color: rentvestNetCFToday >= 0 ? '#22c55e' : '#f87171', fontWeight: 700 }}>
                {rentvestNetCFToday >= 0 ? '+' : ''}{fmt(Math.round(rentvestNetCFToday))}/mo
                {rentvestNetCFToday < 0 && <span style={{ fontWeight: 400, fontSize: '0.7rem', color: '#9ca3af' }}> · you subsidize</span>}
              </span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Net cash flow at retirement (Yr {rY})</span>
              <span className="retire-val" style={{ color: rentvestCFAtRetire >= 0 ? '#22c55e' : '#f87171' }}>
                {rentvestCFAtRetire >= 0 ? '+' : ''}{fmt(Math.round(rentvestCFAtRetire))}/mo
              </span>
            </div>
            <div className="retire-combined-row" style={{ borderTop: '1px solid #334155', paddingTop: 4, marginTop: 2 }}>
              <span className="retire-label">Rentvest pool at retirement (Yr {rY})</span>
              <span className="retire-val" style={{ color: rentvestPoolAtRetire < 0 ? '#f87171' : undefined }}>
                {fmt(Math.round(rentvestPoolAtRetire))}
              </span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Move in · monthly housing (tax + maint only)</span>
              <span className="retire-val">-{fmt(Math.round(rentvestTaxBase + rentvestMainBase))}/mo today</span>
            </div>

            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>From pool · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, rentvestHousingMonthly, rentvestAfterHousing, rentvestPoolRemaining, rentvestPoolReal, ssIncome, careRelocate }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const rentvestHousingToday = rentvestHousingMonthly / inflFactorY
                const rentvestAfterToday = rentvestAfterHousing / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(rentvestHousingMonthly))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(rentvestHousingToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(rentvestAfterHousing))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(rentvestAfterToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {rentvestPoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(Math.round(rentvestPoolRemaining))}</span>
                            <span className="retire-pool-real">{fmt(Math.round(rentvestPoolReal))} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {ssIncome > 0 && <div className="ss-income-line">🏛 SS {fmt(Math.round(ssIncome))}/mo offsets pool withdrawals</div>}
                    {careRelocate > 0 && <div className="care-cost-line">🏥 +{fmt(Math.round(careRelocate))}/mo care facility</div>}
                  </div>                )
              })}
            </div>
            <div className="retire-note">Renting Bay Area until retirement · rental income offsets mortgage · move in at Yr {rY} · no rent ever again</div>

            {/* Rent-path overseas section */}
            <div className="retire-option-divider" />
            <div className="retire-snap-header">
              Option 8 · 🌏 Overseas · rent path · {fmt(overseasSpendingCap || 0)}/mo spend today <span className="retire-tax-tag">{Math.round(blendedTaxRate(15) * 100)}% blended tax</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Rent path pool at Yr {rY}</span>
              <span className="retire-val">{fmt(rentCombinedPoolAtRetire)}</span>
            </div>
            <div className="retire-rent-path-note">⚠️ Assumes you never bought this house — renting the whole time instead</div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>From pool · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, overseasHousingNominal, overseasAfterHousing,
                rentOverseasPoolRemaining, rentOverseasPoolReal, ssIncome, careOverseas }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const overseasHousingToday = overseasHousingNominal / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(overseasHousingNominal)}/mo</span>
                        <span className="retire-pool-real">-{fmt(overseasHousingToday)} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(overseasAfterHousing)}/mo</span>
                        <span className="retire-pool-real">-{fmt(overseasSpendingCap || 0)} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {rentOverseasPoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(rentOverseasPoolRemaining)}</span>
                            <span className="retire-pool-real">{fmt(rentOverseasPoolReal)} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {ssIncome > 0 && <div className="ss-income-line">🏛 SS {fmt(Math.round(ssIncome))}/mo offsets pool withdrawals</div>}
                    {careOverseas > 0 && <div className="care-cost-line">🏥 +{fmt(Math.round(careOverseas))}/mo overseas care</div>}
                  </div>
                )
              })}
            </div>
            <div className="retire-note">No rental income — renting in US, moving overseas</div>

            {/* Keep renting in US — rent path */}
            <div className="retire-option-divider" />
            <div className="retire-snap-header">
              Option 9 · 🏘 Keep Renting in US · {fmt(combinedSpendCap)}/mo spend today <span className="retire-tax-tag">{Math.round(blendedTaxRate(20) * 100)}% blended tax</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Rent path pool at Yr {rY}</span>
              <span className="retire-val">{fmt(rentCombinedPoolAtRetire)}</span>
            </div>
            <div className="retire-rent-path-note">⚠️ Assumes you never bought this house — renting the whole time instead</div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Rent</span>
                <span>From pool · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, rentUSHousingMonthly, rentUSAfterHousing, rentUSPoolRemaining, rentUSPoolReal, ssIncome, careRelocate }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                // Deflate by rent growth rate (not inflation) so "today" anchors to today's rent dollars
                const rentGrowthFactorY = Math.pow(1 + (rentIncreaseRate || 0) / 100, y)
                const rentUSHousingToday = rentUSHousingMonthly / rentGrowthFactorY
                const rentUSAfterToday = rentUSAfterHousing / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(rentUSHousingMonthly))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(rentUSHousingToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        <span className="retire-val">-{fmt(Math.round(rentUSAfterHousing))}/mo</span>
                        <span className="retire-pool-real">-{fmt(Math.round(rentUSAfterToday))} today</span>
                      </span>
                      <span className="retire-snap-cell">
                        {rentUSPoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(rentUSPoolRemaining)}</span>
                            <span className="retire-pool-real">{fmt(rentUSPoolReal)} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {ssIncome > 0 && <div className="ss-income-line">🏛 SS {fmt(Math.round(ssIncome))}/mo offsets pool withdrawals</div>}
                    {careRelocate > 0 && <div className="care-cost-line">🏥 +{fmt(Math.round(careRelocate))}/mo care facility</div>}
                  </div>
                )
              })}
            </div>
            <div className="retire-note">Rent continues to grow — no house equity, full portfolio invested</div>
          </div>
        )}

      </div>
    </div>
  )
}
