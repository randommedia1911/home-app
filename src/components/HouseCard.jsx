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

export default function HouseCard({ house, dCashBudget, aCashBudget, dDown, aDown, closingCostPct, aMonthlyAdj, equalizeYears, saleYear, appreciationPct, taxIncreasePct, hoaIncreasePct, insuranceIncreasePct, dBudget, aBudget, investRate, retireMode, rentYield, rent1BR, rent2BR, rentUpgradeTo2BR, rentIncreaseRate, rentMoveEvery, rentMarketGrowth, rentParking, utilities, rentUtilities, utilIncreaseRate, retireYear, inflationRate, currentAge, spendingCap, overseasCost, overseasSpendingCap, overseasRentIncrease, usRentalIncrease, colRatio, snapshotsExpanded, onToggleSnapshots, onEdit, onDelete, onStatusChange }) {
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
  const iYrs = retireYear || 30
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
      hoaMonthly:        house.hoaMonthly        * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
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
  // Start in 1BR, upgrade to 2BR at rentUpgradeTo2BR year
  const upgradeYear = rentUpgradeTo2BR || 3
  const totalBudget = (dBudget || 0) + (aBudget || 0)
  const dBudgetFrac = totalBudget > 0 ? (dBudget || 0) / totalBudget : 0.5
  const aBudgetFrac = 1 - dBudgetFrac
  // Utilities for the rent path (separate from owning utilities)
  const ru = rentUtilities || {}
  const utilsTotal2 = (ru.water || 0) + (ru.trash || 0) + (ru.electricity || 0)

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

  const dRentYearlyInvest = []
  const aRentYearlyInvest = []
  for (let y = 1; y <= iYrs; y++) {
    const rentAtY = calcRentAtYear(y)
    const utilsAtY = utilsTotal2 * Math.pow(1 + (utilIncreaseRate || 0) / 100, y)  // rent utils grow same rate
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
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
    }
    if (y > house.loanTermYears) {
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
  // Total portfolio at rY
  const dPortRetire = fvVariableAnnuity(retireLeftoverD.slice(0, rY), investRate || 0)
                    + dLumpBuyFV_rY + retireSaleBonus_d
  const aPortRetire = fvVariableAnnuity(retireLeftoverA.slice(0, rY), investRate || 0)
                    + aLumpBuyFV_rY + retireSaleBonus_a
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
    const pu = { water: (utilities.water||0)*uf, trash: (utilities.trash||0)*uf, electricity: (utilities.electricity||0)*uf, waterInHoa: utilities.waterInHoa, trashInHoa: utilities.trashInHoa }
    const ph = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct||0)/100, y),
      hoaMonthly:        house.hoaMonthly        * Math.pow(1 + (hoaIncreasePct ||0)/100, y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
    }
    // Gross rent: use per-card value if set, otherwise estimate from bed count + market rents
    const baseRentEstimate = (house.monthlyRent || 0) > 0
      ? house.monthlyRent
      : house.beds <= 1
        ? (rent1BR || 2100)
        : house.beds <= 2
          ? (rent2BR || 2600)
          : (rent2BR || 2600) * (1 + (house.beds - 2) * 0.2)
    const grossRent = baseRentEstimate * Math.pow(1 + (usRentalIncrease || 0) / 100, y)
    const mortgagePaidOff = y > house.loanTermYears
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
    return { grossRent, pi, tax, hoa, insurance, utils, ownershipCost, net: grossRent - ownershipCost, mortgagePaidOff }
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
      water: (utilities.water || 0) * uf, trash: (utilities.trash || 0) * uf,
      electricity: (utilities.electricity || 0) * uf,
      waterInHoa: utilities.waterInHoa, trashInHoa: utilities.trashInHoa,
    }
    const ph = {
      ...house,
      propertyTaxAnnual: house.propertyTaxAnnual * Math.pow(1 + (taxIncreasePct || 0) / 100, y),
      hoaMonthly:        house.hoaMonthly        * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
    }
    const mortgagePaidOff = y > house.loanTermYears
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
    return { pi: p.pi, tax: p.tax, hoa: p.hoa, insurance: p.insurance, utils: p.utilsTotal, total, mortgagePaidOff }
  }

  const combinedHousingAtRY = calcCombinedHousingAtYear(rY)
  const dHousingAtRY = combinedHousingAtRY * (dOwnTarget / 100)
  const aHousingAtRY = combinedHousingAtRY * (1 - dOwnTarget / 100)
  const dAfterHousing = dWithdrawal - dHousingAtRY
  const aAfterHousing = aWithdrawal - aHousingAtRY

  // Housing + pool balance snapshots: year-by-year simulation from rY to age 80
  const combinedPortRetire = dPortRetire + aPortRetire
  const gr = (investRate || 0) / 100
  const retireAge = (currentAge || 33) + rY
  const maxOffset = Math.max(0, 80 - retireAge)
  const snapOffsets = []
  for (let o = 0; o <= maxOffset; o += 3) snapOffsets.push(o)
  // Pool simulation: each year withdraw exactly (spendingCap + housing) inflation-adjusted,
  // offset by any rental income. Same target for all houses — fair comparison.
  // "Stay in house" simulation — live in owned home, pay housing + spending, no rental income
  const simPoolByOffset = [combinedPortRetire]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const inflFactorYr = Math.pow(1 + (inflationRate || 3) / 100, yr)
    const housingYr = calcCombinedHousingAtYear(yr)
    const netFromPool = ((spendingCap || 0) * inflFactorYr + housingYr) * 12
    simPoolByOffset.push(simPoolByOffset[n - 1] * (1 + gr) - netFromPool)
  }
  // Overseas pool simulation — always assumes: keep US house, rent it out
  const simPoolOverseas = [combinedPortRetire]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const inflFactorYr = Math.pow(1 + (inflationRate || 3) / 100, yr)
    const overseasRentFactor = Math.pow(1 + (overseasRentIncrease || 0) / 100, yr)
    const overseasHousingNominal = (overseasCost || 0) * overseasRentFactor * 12
    const netRentalYr = calcNetRentalAtYear(yr, true)
    const targetAnnual = (overseasSpendingCap || 0) * inflFactorYr * 12 + overseasHousingNominal
    const netFromPool = Math.max(0, targetAnnual - Math.max(0, netRentalYr * 12))
    simPoolOverseas.push(simPoolOverseas[n - 1] * (1 + gr) - netFromPool)
  }

  // Overseas pool simulation — rent path (no US house, no rental income)
  const rentCombinedPoolAtRetire = dRentInvestFV + aRentInvestFV
  const simPoolRentOverseas = [rentCombinedPoolAtRetire]
  for (let n = 1; n <= maxOffset; n++) {
    const yr = rY + n
    const inflFactorYr = Math.pow(1 + (inflationRate || 3) / 100, yr)
    const overseasRentFactor = Math.pow(1 + (overseasRentIncrease || 0) / 100, yr)
    const overseasHousingNominal = (overseasCost || 0) * overseasRentFactor * 12
    const targetAnnual = (overseasSpendingCap || 0) * inflFactorYr * 12 + overseasHousingNominal
    simPoolRentOverseas.push(simPoolRentOverseas[n - 1] * (1 + gr) - targetAnnual)
  }

  const retireHousingSnaps = snapOffsets.map(offset => {
    const y = rY + offset
    const housingBreakdown = calcHousingBreakdownAtYear(y)
    const housing = housingBreakdown.total
    const netRental = calcNetRentalAtYear(y)
    const poolRemaining = simPoolByOffset[offset] ?? 0
    const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
    // afterHousing = spending cap inflated — this is what's left after housing is covered
    const afterHousing = (spendingCap || 0) * inflFactorY

    // Overseas scenario
    const overseasRentFactor = Math.pow(1 + (overseasRentIncrease || 0) / 100, y)
    const overseasHousingNominal = (overseasCost || 0) * overseasRentFactor
    const rentalBreakdown = calcRentalBreakdownAtYear(y, true)
    const overseasNetRental = rentalBreakdown.net
    const overseasAfterHousing = (overseasSpendingCap || 0) * inflFactorY
    const overseasAfterToday = overseasAfterHousing / inflFactorY
    const overseasUSEquiv = overseasAfterToday / ((colRatio || 40) / 100)
    const overseasPoolRemaining = simPoolOverseas[offset] ?? 0
    const overseasPoolReal = overseasPoolRemaining / inflFactorY

    // Rent-path overseas scenario (no rental income)
    const rentOverseasPoolRemaining = simPoolRentOverseas[offset] ?? 0
    const rentOverseasPoolReal = rentOverseasPoolRemaining / inflFactorY

    return { y, housing, housingBreakdown, netRental, poolRemaining, afterHousing,
      overseasHousingNominal, overseasNetRental, overseasAfterHousing, overseasAfterToday,
      overseasUSEquiv, overseasPoolRemaining, overseasPoolReal, rentalBreakdown,
      rentOverseasPoolRemaining, rentOverseasPoolReal }
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
      hoaMonthly:        house.hoaMonthly        * Math.pow(1 + (hoaIncreasePct  || 0) / 100, y),
      insuranceMonthly:  house.insuranceMonthly  * Math.pow(1 + (insuranceIncreasePct || 3) / 100, y),
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
        {true && <div className="sale-section">
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
                vs. Rent &amp; Invest (1BR→2BR Yr {upgradeYear}, {fmt(rentBaseRentYr1 + (rentParking||0) + utilsTotal2)}→{fmt(rentBaseRentFinal + (rentParking||0) + utilsTotal2)}/mo{rentMoveEvery ? `, move every ${rentMoveEvery} yr` : ''})
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
              <span className="retire-params">{inflationRate}% inflation · {investRate}% returns</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Combined portfolio</span>
              <span className="retire-val">{fmt(combinedPortRetire)}</span>
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Spending target</span>
              <span className="retire-val">{fmt(spendingCap || 0)}/mo today</span>
            </div>
            <div className="retire-snap-header">🏠 Stay in US</div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>After housing</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, housing, housingBreakdown, netRental, poolRemaining, afterHousing }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const poolReal = poolRemaining / inflFactorY
                const afterHousingReal = afterHousing / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-val">-{fmt(housing)}/mo</span>
                      <span className="retire-pool-stack">
                        <span className="retire-val">-{fmt(afterHousing)}/mo</span>
                        <span className="retire-pool-real">-{fmt(afterHousingReal)} today</span>
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
                    <div className="retire-rental-breakdown">
                      {housingBreakdown.pi > 0 && <span>−{fmt(housingBreakdown.pi)} P&amp;I</span>}
                      {housingBreakdown.tax > 0 && <span>−{fmt(housingBreakdown.tax)} tax</span>}
                      {housingBreakdown.hoa > 0 && <span>−{fmt(housingBreakdown.hoa)} HOA</span>}
                      {housingBreakdown.insurance > 0 && <span>−{fmt(housingBreakdown.insurance)} ins</span>}
                      {housingBreakdown.utils > 0 && <span>−{fmt(housingBreakdown.utils)} utils</span>}
                      {housingBreakdown.mortgagePaidOff && <span style={{color:'#10b981'}}>✓ paid off</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="retire-snap-header retire-overseas-header" style={{ marginTop: 8 }}>
              <span>🌏 Overseas · {fmt(overseasSpendingCap || 0)}/mo spend today</span>
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
                overseasPoolRemaining, overseasPoolReal, rentalBreakdown }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const overseasHousingToday = overseasHousingNominal / inflFactorY
                return (
                  <div key={y} className="retire-overseas-group">
                    {/* Main row */}
                    <div className="retire-housing-snap-row">
                      <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                      <span className="retire-pool-stack">
                        <span className="retire-val">-{fmt(overseasHousingNominal)}/mo</span>
                        <span className="retire-pool-real">-{fmt(overseasHousingToday)} today</span>
                      </span>
                      <span className="retire-pool-stack">
                        <span className="retire-val">-{fmt(overseasAfterHousing)}/mo</span>
                        <span className="retire-pool-real">-{fmt(overseasSpendingCap || 0)} today</span>
                      </span>
                      <span className="retire-pool-stack">
                        {overseasPoolRemaining >= 0 ? (
                          <>
                            <span className="retire-val">{fmt(overseasPoolRemaining)}</span>
                            <span className="retire-pool-real">{fmt(overseasPoolReal)} today</span>
                          </>
                        ) : <span className="retire-pool-empty">Depleted</span>}
                      </span>
                    </div>
                    {/* Sub-row: US rental breakdown */}
                    <div className="retire-rental-subrow">
                      <span className="retire-rental-label">🏠 US rental</span>
                      <span className="retire-surplus">rent {fmt(rentalBreakdown.grossRent)}/mo</span>
                      <span className={`retire-rental-net ${overseasNetRental >= 0 ? 'retire-surplus' : 'retire-pool-empty'}`}>
                        = {overseasNetRental >= 0 ? `+${fmt(overseasNetRental)}` : fmt(overseasNetRental)} net
                      </span>
                    </div>
                    <div className="retire-rental-breakdown">
                      {rentalBreakdown.pi > 0 && <span>−{fmt(rentalBreakdown.pi)} P&amp;I</span>}
                      <span>−{fmt(rentalBreakdown.tax)} tax</span>
                      {rentalBreakdown.hoa > 0 && <span>−{fmt(rentalBreakdown.hoa)} HOA</span>}
                      {rentalBreakdown.insurance > 0 && <span>−{fmt(rentalBreakdown.insurance)} ins</span>}
                      {rentalBreakdown.utils > 0 && <span>−{fmt(rentalBreakdown.utils)} utils</span>}
                    </div>
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
            <div className="retire-note">🌏 Overseas (buy path) assumes US house rented out</div>

            {/* Rent-path overseas section */}
            <div className="retire-snap-header" style={{ marginTop: 10 }}>
              🌏 Overseas · rent path · {fmt(overseasSpendingCap || 0)}/mo spend today
            </div>
            <div className="retire-combined-row">
              <span className="retire-label">Rent path pool at Yr {rY}</span>
              <span className="retire-val">{fmt(rentCombinedPoolAtRetire)}</span>
            </div>
            <div className="retire-housing-snaps">
              <div className="retire-snap-cols-header">
                <span />
                <span>Housing</span>
                <span>From pool · today</span>
                <span>Pool left</span>
              </div>
              {retireHousingSnaps.map(({ y, overseasHousingNominal, overseasAfterHousing,
                rentOverseasPoolRemaining, rentOverseasPoolReal }) => {
                const inflFactorY = Math.pow(1 + (inflationRate || 3) / 100, y)
                const overseasHousingToday = overseasHousingNominal / inflFactorY
                return (
                  <div key={y} className="retire-housing-snap-row">
                    <span className="retire-snap-yr">Age {(currentAge || 33) + y}</span>
                    <span className="retire-pool-stack">
                      <span className="retire-val">-{fmt(overseasHousingNominal)}/mo</span>
                      <span className="retire-pool-real">-{fmt(overseasHousingToday)} today</span>
                    </span>
                    <span className="retire-pool-stack">
                      <span className="retire-val">-{fmt(overseasAfterHousing)}/mo</span>
                      <span className="retire-pool-real">-{fmt(overseasSpendingCap || 0)} today</span>
                    </span>
                    <span className="retire-pool-stack">
                      {rentOverseasPoolRemaining >= 0 ? (
                        <>
                          <span className="retire-val">{fmt(rentOverseasPoolRemaining)}</span>
                          <span className="retire-pool-real">{fmt(rentOverseasPoolReal)} today</span>
                        </>
                      ) : <span className="retire-pool-empty">Depleted</span>}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="retire-note">No rental income — renting in US, moving overseas</div>
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
