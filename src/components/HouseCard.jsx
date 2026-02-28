import { calcTotalMonthly, calcSaleProceeds, fmt } from '../utils/mortgage'
import './HouseCard.css'

export default function HouseCard({ house, dDown, aDown, closingCostPct, aMonthlyTarget, equalizeYears, saleYear, utilities, onEdit, onDelete }) {
  const {
    pi, tax, hoa, insurance, utilsTotal, total,
    totalCash, closingCosts, actualDownPmt, loanAmount, actualDownPct,
    aMonthly, dMonthly, equalMonthly, aOverpaid,
    dDuringRepay, dAfterRepay, aNetDuring, aNetAfter,
    aOwn, dOwn,
  } = calcTotalMonthly(house, dDown, aDown, closingCostPct, aMonthlyTarget, equalizeYears, utilities)

  const sale = calcSaleProceeds(house, dDown, aDown, closingCostPct, aMonthlyTarget, equalizeYears, saleYear, null, utilities)

  const breakdownItems = [
    { label: 'Principal & Interest', value: pi,         color: '#6366f1' },
    { label: 'Property Tax',         value: tax,        color: '#f59e0b' },
    { label: 'HOA',                  value: hoa,        color: '#10b981' },
    { label: 'Insurance',            value: insurance,  color: '#3b82f6' },
    { label: 'Utilities',            value: utilsTotal, color: '#64748b' },
  ].filter(i => i.value > 0)

  return (
    <div className="house-card">
      <div className="card-image-wrap">
        {house.imageUrl
          ? <img src={house.imageUrl} alt={house.nickname} className="card-image" />
          : <div className="card-image-placeholder"><span>🏠</span></div>
        }
        <div className="card-image-actions">
          <button className="icon-btn" onClick={onEdit} title="Edit">✏️</button>
          <button className="icon-btn danger" onClick={onDelete} title="Delete">🗑️</button>
        </div>
        <div className="card-price-badge">{fmt(house.price)}</div>
      </div>

      <div className="card-body">
        <h2 className="card-nickname">{house.nickname || 'Unnamed Home'}</h2>
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
              <div className="split-amount">{fmt(aNetDuring)}</div>
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

        {/* Ownership */}
        <div className="ownership-section">
          <div className="own-row-label">Ongoing (full {house.loanTermYears} yr)</div>
          <div className="ownership-label-row">
            <span className="own-label d-color-text">D {dOwn.toFixed(1)}%</span>
            <span className="own-label a-color-text">A {aOwn.toFixed(1)}%</span>
          </div>
          <div className="ownership-bar">
            <div className="own-fill-d" style={{ width: `${dOwn}%` }} />
            <div className="own-fill-a" style={{ width: `${aOwn}%` }} />
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
        <div className="sale-section">
          <div className="sale-title">
            {saleYear === 30 ? 'At end of loan' : `If sold at Year ${saleYear}`}
          </div>
          <div className="sale-row">
            <span>Sale Price (assumed)</span>
            <span>{fmt(house.price)}</span>
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
          {sale.equalUnpaid > 0 && (
            <div className="sale-row">
              <span>D settles remaining repayment</span>
              <span className="neg">−{fmt(sale.equalUnpaid)}</span>
            </div>
          )}
          <div className="sale-split">
            <div className="sale-person d-sale">
              <div className="sale-person-label">D ({sale.dOwnAtSale.toFixed(1)}% equity{sale.equalUnpaid > 0 ? ' − settlement' : ''})</div>
              <div className="sale-person-amt">{fmt(sale.dProceeds)}</div>
            </div>
            <div className="sale-person a-sale">
              <div className="sale-person-label">A ({sale.aOwnAtSale.toFixed(1)}% equity{sale.equalUnpaid > 0 ? ' + settlement' : ''})</div>
              <div className="sale-person-amt">{fmt(sale.aProceeds)}</div>
            </div>
          </div>
          {sale.equalUnpaid > 0 && (
            <div className="sale-note">
              D's unpaid repayment ({fmt(sale.equalUnpaid)}) deducted from his proceeds at closing — no lump sum, no ongoing payments
            </div>
          )}
        </div>

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
