import { calcTotalMonthly, fmt } from '../utils/mortgage'
import './HouseCard.css'

export default function HouseCard({ house, cashBudget, closingCostPct, onEdit, onDelete }) {
  const { pi, tax, hoa, insurance, total, totalCash, closingCosts, actualDownPmt, loanAmount, actualDownPct }
    = calcTotalMonthly(house, cashBudget, closingCostPct)

  const breakdownItems = [
    { label: 'Principal & Interest', value: pi, color: '#6366f1' },
    { label: 'Property Tax', value: tax, color: '#f59e0b' },
    { label: 'HOA', value: hoa, color: '#10b981' },
    { label: 'Insurance', value: insurance, color: '#3b82f6' },
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
        <div className="card-title-row">
          <h2 className="card-nickname">{house.nickname || 'Unnamed Home'}</h2>
        </div>
        <p className="card-address">{house.address}</p>
        <div className="card-meta-row">
          <div className="card-meta">
            {house.beds && <span>{house.beds} bd</span>}
            {house.baths && <span>{house.baths} ba</span>}
            {house.sqft && <span>{house.sqft.toLocaleString()} sqft</span>}
          </div>
          {house.link && (
            <a className="card-link" href={house.link} target="_blank" rel="noopener noreferrer">
              View ↗
            </a>
          )}
        </div>

        <div className="card-total">
          <div className="total-label">Est. Monthly Payment</div>
          <div className="total-amount">{fmt(total)}</div>
          <div className="total-sub">/month</div>
        </div>

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

        <div className="card-loan-details">
          <div className="loan-row">
            <span>Total Cash Budget</span>
            <span>{fmt(totalCash)}</span>
          </div>
          <div className="loan-row closing-row">
            <span>− Closing Costs ({closingCostPct}%)</span>
            <span className="closing-val">−{fmt(closingCosts)}</span>
          </div>
          <div className="loan-row highlight-row">
            <span>= Loan Down Payment ({actualDownPct.toFixed(1)}%)</span>
            <span>{fmt(actualDownPmt)}</span>
          </div>
          <div className="loan-row">
            <span>Loan Amount</span>
            <span>{fmt(loanAmount)}</span>
          </div>
          <div className="loan-row">
            <span>Rate / Term</span>
            <span>{house.interestRate}% · {house.loanTermYears} yr</span>
          </div>
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
