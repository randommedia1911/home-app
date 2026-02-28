export function calcMonthlyPI(loanAmount, annualRatePct, termYears) {
  const monthlyRate = annualRatePct / 100 / 12
  const n = termYears * 12
  if (monthlyRate === 0) return loanAmount / n
  return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
}

// totalCashBudget = dollar amount the buyer has available
// closingCostPct  = closing costs as % of price (deducted from budget)
// actual loan down payment = totalCashBudget - closingCosts
export function calcTotalMonthly(house, totalCashBudget, closingCostPct) {
  const closingCosts  = house.price * (closingCostPct / 100)
  const actualDownPmt = Math.max(0, totalCashBudget - closingCosts)
  const loanAmount    = house.price - actualDownPmt

  const pi        = calcMonthlyPI(loanAmount, house.interestRate, house.loanTermYears)
  const tax       = (house.propertyTaxAnnual || 0) / 12
  const hoa       = house.hoaMonthly || 0
  const insurance = house.insuranceMonthly || 0

  return {
    pi,
    tax,
    hoa,
    insurance,
    total: pi + tax + hoa + insurance,
    totalCash: totalCashBudget,
    closingCosts,
    actualDownPmt,
    loanAmount,
    actualDownPct: (actualDownPmt / house.price) * 100,
  }
}

export function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
