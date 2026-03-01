export function calcMonthlyPI(loanAmount, annualRatePct, termYears) {
  const monthlyRate = annualRatePct / 100 / 12
  const n = termYears * 12
  if (monthlyRate === 0) return loanAmount / n
  return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
}

// Remaining loan balance after `monthsPaid` payments
export function calcRemainingBalance(loanAmount, annualRatePct, termYears, monthsPaid) {
  const monthlyRate = annualRatePct / 100 / 12
  const n = termYears * 12
  if (monthlyRate === 0) return loanAmount * (1 - monthsPaid / n)
  const pi = calcMonthlyPI(loanAmount, annualRatePct, termYears)
  return loanAmount * Math.pow(1 + monthlyRate, monthsPaid) - pi * ((Math.pow(1 + monthlyRate, monthsPaid) - 1) / monthlyRate)
}

export function calcTotalMonthly(house, dDown, aDown, closingCostPct, aMonthlyTarget, equalizeYears, utilities = {}) {
  const totalCash     = dDown + aDown
  const closingCosts  = house.price * (closingCostPct / 100)
  const actualDownPmt = Math.max(0, totalCash - closingCosts)
  const loanAmount    = house.price - actualDownPmt

  const pi          = calcMonthlyPI(loanAmount, house.interestRate, house.loanTermYears)
  const tax         = (house.propertyTaxAnnual || 0) / 12
  const hoa         = house.hoaMonthly || 0
  const insurance   = house.insuranceMonthly || 0
  const utilsTotal  = (utilities.waterInHoa ? 0 : (utilities.water || 0))
                    + (utilities.trashInHoa ? 0 : (utilities.trash || 0))
                    + (utilities.electricity || 0)
  const total       = pi + tax + hoa + insurance + utilsTotal

  const aMonthly = Math.min(aMonthlyTarget, total)
  const dMonthly = total - aMonthly

  // Ownership = share of monthly costs (fixed ratio, not contribution history)
  // D and A agree on ownership upfront; down payment imbalance is settled via equalization
  const aOwnRatio = total > 0 ? aMonthly / total : 0.5
  const aOwn      = aOwnRatio * 100
  const dOwn      = 100 - aOwn

  // Equalization: D repays A for whatever she fronted above her fair share of the down payment
  const fairShare    = aOwnRatio * totalCash          // A's ownership% of total cash
  const aOverpaid    = Math.max(0, aDown - fairShare)
  const equalMonthly = equalizeYears > 0 ? aOverpaid / (equalizeYears * 12) : 0

  const dDuringRepay = dMonthly + equalMonthly
  const dAfterRepay  = dMonthly
  const aNetDuring   = aMonthly - equalMonthly
  const aNetAfter    = aMonthly

  return {
    pi, tax, hoa, insurance, utilsTotal, total,
    totalCash, closingCosts, actualDownPmt, loanAmount,
    actualDownPct: (actualDownPmt / house.price) * 100,
    aMonthly, dMonthly,
    equalMonthly, aOverpaid,
    dDuringRepay, dAfterRepay,
    aNetDuring, aNetAfter,
    aOwn, dOwn,
  }
}

// What each person walks away with if the house is sold at `saleYear`
// Ownership at sale = proportional to actual contributions up to that point
// D's unpaid equalization stays unpaid — A just gets less, no lump sum
export function calcSaleProceeds(house, dDown, aDown, closingCostPct, aMonthlyTarget, equalizeYears, saleYear, assumedSalePrice, utilities = {}) {
  const totalCash     = dDown + aDown
  const closingCosts  = house.price * (closingCostPct / 100)
  const actualDownPmt = Math.max(0, totalCash - closingCosts)
  const loanAmount    = house.price - actualDownPmt

  const pi         = calcMonthlyPI(loanAmount, house.interestRate, house.loanTermYears)
  const utilsTotal = (utilities.water || 0) + (utilities.trash || 0) + (utilities.electricity || 0)
  const total      = pi + (house.propertyTaxAnnual || 0) / 12 + (house.hoaMonthly || 0) + (house.insuranceMonthly || 0) + utilsTotal
  const aMonthly   = Math.min(aMonthlyTarget, total)

  const monthsPaid    = saleYear * 12
  const remainingLoan = calcRemainingBalance(loanAmount, house.interestRate, house.loanTermYears, monthsPaid)
  const salePrice     = assumedSalePrice ?? house.price
  const sellingCosts  = salePrice * 0.06
  const netProceeds   = salePrice - remainingLoan - sellingCosts

  // Ownership is fixed = share of monthly costs (same model as calcTotalMonthly)
  const aOwnRatio  = total > 0 ? aMonthly / total : 0.5
  const aOwnAtSale = aOwnRatio * 100
  const dOwnAtSale = 100 - aOwnAtSale

  const aEquityProceeds = netProceeds * aOwnRatio
  const dEquityProceeds = netProceeds * (1 - aOwnRatio)

  // Equalization: D repays A for fronting more than her fair share of the down payment
  const fairShare   = aOwnRatio * totalCash
  const aOverpaid   = Math.max(0, aDown - fairShare)
  const equalPaid   = Math.min(aOverpaid, (aOverpaid / (equalizeYears * 12)) * monthsPaid)
  const equalUnpaid = aOverpaid - equalPaid

  const dProceeds = dEquityProceeds - equalUnpaid
  const aProceeds = aEquityProceeds + equalUnpaid

  return {
    netProceeds, remainingLoan, sellingCosts,
    aOwnAtSale, dOwnAtSale,
    aEquityProceeds, dEquityProceeds,
    aProceeds, dProceeds,
    equalUnpaid,
  }
}

// Calculate the aMonthly needed for a given D ownership %
// Ownership = share of monthly costs, so A simply pays her ownership% of total
export function calcAMonthlyFromOwnership(house, dDown, aDown, closingCostPct, desiredDOwnPct, utilities = {}) {
  const totalCash     = dDown + aDown
  const closingCosts  = house.price * (closingCostPct / 100)
  const actualDownPmt = Math.max(0, totalCash - closingCosts)
  const loanAmount    = house.price - actualDownPmt

  const pi         = calcMonthlyPI(loanAmount, house.interestRate, house.loanTermYears)
  const tax        = (house.propertyTaxAnnual || 0) / 12
  const hoa        = house.hoaMonthly || 0
  const insurance  = house.insuranceMonthly || 0
  const utilsTotal = (utilities.water || 0) + (utilities.trash || 0) + (utilities.electricity || 0)
  const total      = pi + tax + hoa + insurance + utilsTotal

  return (1 - desiredDOwnPct / 100) * total
}

export function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
