import { useState } from 'react'
import { calcTotalMonthly, fmt } from '../utils/mortgage'
import './AddHouseModal.css'

const defaults = {
  nickname: '',
  address: '',
  link: '',
  imageUrl: '',
  price: '',
  downPaymentPct: 20,
  interestRate: 6.875,
  loanTermYears: 30,
  propertyTaxAnnual: '',
  hoaMonthly: '',
  insuranceMonthly: 120,
  beds: '',
  baths: '',
  sqft: '',
  notes: '',
}

export default function AddHouseModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...defaults })

  const preview = form.price && form.interestRate && form.loanTermYears
    ? calcTotalMonthly({
        price: Number(form.price),
        downPaymentPct: Number(form.downPaymentPct) || 20,
        interestRate: Number(form.interestRate),
        loanTermYears: Number(form.loanTermYears),
        propertyTaxAnnual: Number(form.propertyTaxAnnual) || 0,
        hoaMonthly: Number(form.hoaMonthly) || 0,
        insuranceMonthly: Number(form.insuranceMonthly) || 0,
      })
    : null

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.price) return
    onSave({
      ...form,
      price: Number(form.price),
      downPaymentPct: Number(form.downPaymentPct),
      interestRate: Number(form.interestRate),
      loanTermYears: Number(form.loanTermYears),
      propertyTaxAnnual: Number(form.propertyTaxAnnual) || 0,
      hoaMonthly: Number(form.hoaMonthly) || 0,
      insuranceMonthly: Number(form.insuranceMonthly) || 0,
      beds: form.beds !== '' ? Number(form.beds) : '',
      baths: form.baths !== '' ? Number(form.baths) : '',
      sqft: form.sqft !== '' ? Number(form.sqft) : '',
    })
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{initial ? 'Edit Home' : 'Add a Home'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3>Property Info</h3>
            <div className="form-row">
              <label>
                Nickname
                <input placeholder="e.g. Oakland Condo" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Address
                <input placeholder="123 Main St, City, CA" value={form.address} onChange={e => set('address', e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Redfin Link
                <input type="url" placeholder="https://www.redfin.com/..." value={form.link} onChange={e => set('link', e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Photo URL <span className="field-hint">(right-click any Redfin photo → Copy image address)</span>
                <input type="url" placeholder="https://..." value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} />
              </label>
            </div>
            <div className="form-row three-col">
              <label>
                Beds
                <input type="number" min="0" placeholder="2" value={form.beds} onChange={e => set('beds', e.target.value)} />
              </label>
              <label>
                Baths
                <input type="number" min="0" step="0.5" placeholder="2" value={form.baths} onChange={e => set('baths', e.target.value)} />
              </label>
              <label>
                Sq Ft
                <input type="number" min="0" placeholder="1200" value={form.sqft} onChange={e => set('sqft', e.target.value)} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Mortgage</h3>
            <div className="form-row">
              <label>
                Home Price ($) <span className="required">*</span>
                <input type="number" required min="0" placeholder="650000" value={form.price} onChange={e => set('price', e.target.value)} />
              </label>
            </div>
            <div className="form-row two-col">
              <label>
                Down Payment (%)
                <input type="number" min="0" max="100" step="0.5" value={form.downPaymentPct} onChange={e => set('downPaymentPct', e.target.value)} />
              </label>
              <label>
                Down Payment ($)
                <input
                  type="number" readOnly
                  value={form.price ? Math.round(Number(form.price) * Number(form.downPaymentPct) / 100) : ''}
                  className="computed"
                />
              </label>
            </div>
            <div className="form-row two-col">
              <label>
                Interest Rate (%)
                <input type="number" min="0" max="30" step="0.001" value={form.interestRate} onChange={e => set('interestRate', e.target.value)} />
              </label>
              <label>
                Loan Term (years)
                <select value={form.loanTermYears} onChange={e => set('loanTermYears', Number(e.target.value))}>
                  <option value={30}>30 years</option>
                  <option value={20}>20 years</option>
                  <option value={15}>15 years</option>
                  <option value={10}>10 years</option>
                </select>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Monthly Costs</h3>
            <div className="form-row three-col">
              <label>
                Property Tax (annual $)
                <input type="number" min="0" placeholder="8000" value={form.propertyTaxAnnual} onChange={e => set('propertyTaxAnnual', e.target.value)} />
              </label>
              <label>
                HOA (monthly $)
                <input type="number" min="0" placeholder="0" value={form.hoaMonthly} onChange={e => set('hoaMonthly', e.target.value)} />
              </label>
              <label>
                Insurance (monthly $)
                <input type="number" min="0" placeholder="120" value={form.insuranceMonthly} onChange={e => set('insuranceMonthly', e.target.value)} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <label>
              Notes
              <textarea placeholder="Anything to remember about this home…" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </label>
          </div>

          {preview && (
            <div className="modal-preview">
              <div className="preview-label">Estimated Monthly Total</div>
              <div className="preview-total">{fmt(preview.total)}</div>
              <div className="preview-breakdown">
                <span>P&I {fmt(preview.pi)}</span>
                {preview.tax > 0 && <span>Tax {fmt(preview.tax)}</span>}
                {preview.hoa > 0 && <span>HOA {fmt(preview.hoa)}</span>}
                {preview.insurance > 0 && <span>Insurance {fmt(preview.insurance)}</span>}
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {initial ? 'Save Changes' : 'Add Home'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
