import { useState } from 'react'
import { calcMonthlyPI, fmt } from '../utils/mortgage'
import './AddHouseModal.css'

const defaults = {
  nickname: '',
  address: '',
  link: '',
  imageUrl: '',
  price: '',
  interestRate: 6,
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
  const [imgLoading, setImgLoading] = useState(false)

  // Simple preview — just show total monthly based on a rough 20% down
  const previewTotal = (() => {
    const p = Number(form.price)
    const r = Number(form.interestRate)
    const t = Number(form.loanTermYears)
    if (!p || !r || !t) return null
    const loan = p * 0.8
    const pi   = calcMonthlyPI(loan, r, t)
    const tax  = (Number(form.propertyTaxAnnual) || 0) / 12
    const hoa  = Number(form.hoaMonthly) || 0
    const ins  = Number(form.insuranceMonthly) || 0
    return { pi, tax, hoa, ins, total: pi + tax + hoa + ins }
  })()

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleImageFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setImgLoading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      set('imageUrl', ev.target.result)  // base64 data URL — persists in localStorage
      setImgLoading(false)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.price) return
    onSave({
      ...form,
      price: Number(form.price),
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

            {/* Photo — file upload (stored as base64) or URL */}
            <div className="form-row">
              <label>Photo</label>
              <div className="photo-input-group">
                <label className="photo-upload-btn">
                  {imgLoading ? 'Loading…' : '📁 Upload from computer'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
                </label>
                <span className="photo-or">or paste URL</span>
                <input
                  type="url" placeholder="https://..."
                  value={form.imageUrl?.startsWith('data:') ? '' : (form.imageUrl || '')}
                  onChange={e => set('imageUrl', e.target.value)}
                  className="photo-url-input"
                />
              </div>
              {form.imageUrl && (
                <div className="photo-preview-wrap">
                  <img src={form.imageUrl} alt="preview" className="photo-preview" />
                  <button type="button" className="photo-clear" onClick={() => set('imageUrl', '')}>✕ Remove</button>
                </div>
              )}
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
                <input type="number" required min="0" placeholder="400000" value={form.price} onChange={e => set('price', e.target.value)} />
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
                <input type="number" min="0" placeholder="5000" value={form.propertyTaxAnnual} onChange={e => set('propertyTaxAnnual', e.target.value)} />
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

          {previewTotal && (
            <div className="modal-preview">
              <div className="preview-label">Est. Monthly (20% down)</div>
              <div className="preview-total">{fmt(previewTotal.total)}</div>
              <div className="preview-breakdown">
                <span>P&I {fmt(previewTotal.pi)}</span>
                {previewTotal.tax > 0 && <span>Tax {fmt(previewTotal.tax)}</span>}
                {previewTotal.hoa > 0 && <span>HOA {fmt(previewTotal.hoa)}</span>}
                {previewTotal.ins > 0 && <span>Insurance {fmt(previewTotal.ins)}</span>}
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
