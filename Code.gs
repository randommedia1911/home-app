// ─── Home Comparison App — Google Apps Script backend ───────────────────────
// Setup:
//   1. Open your Google Sheet → Extensions → Apps Script
//   2. Paste this entire file, replacing any existing code
//   3. Click Deploy → New deployment → Web app
//      Execute as: Me  |  Who has access: Anyone
//   4. Copy the Web app URL into your .env.local as VITE_SHEETS_API_URL

const SHEET_NAME = 'Houses'

const COLUMNS = [
  'id', 'nickname', 'address', 'link', 'imageUrl',
  'price', 'interestRate', 'loanTermYears',
  'propertyTaxAnnual', 'hoaMonthly', 'insuranceMonthly',
  'beds', 'baths', 'sqft', 'notes',
  'toured', 'skip',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow(COLUMNS)
    sheet.setFrozenRows(1)
    return sheet
  }
  // Migrate: ensure all COLUMNS exist in the header row (case-insensitive check)
  const lastCol = Math.max(sheet.getLastColumn(), 1)
  const headerRange = sheet.getRange(1, 1, 1, lastCol)
  const existingRaw = headerRange.getValues()[0]
  const existingLower = existingRaw.map(v => String(v).toLowerCase())
  // Fix any wrong-case headers in-place
  let needsFlush = false
  COLUMNS.forEach((col, ci) => {
    const idx = existingLower.indexOf(col.toLowerCase())
    if (idx !== -1 && existingRaw[idx] !== col) {
      sheet.getRange(1, idx + 1).setValue(col)
      needsFlush = true
    }
  })
  // Add any truly missing columns at the end
  const missing = COLUMNS.filter(c => !existingLower.includes(c.toLowerCase()))
  if (missing.length > 0) {
    missing.forEach((col, i) => {
      sheet.getRange(1, lastCol + i + 1).setValue(col)
    })
    needsFlush = true
  }
  if (needsFlush) SpreadsheetApp.flush()
  return sheet
}

function getHeaders(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1)
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String)
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues()
  if (data.length <= 1) return []           // header only
  const headers = data[0]
  return data.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => {
      const v = row[i]
      obj[h] = v === '' ? null : v
    })
    return obj
  })
}

function findRowById(sheet, id) {
  const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues()
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2   // 1-indexed, skip header
  }
  return -1
}

function houseToRow(house, headers) {
  return (headers || COLUMNS).map(col => {
    const v = house[col]
    if (v === undefined || v === null || v === '') return ''
    if (v === true  || v === 'true')  return true
    if (v === false || v === 'false') return false
    return v
  })
}

function cors(output) {
  // Apps Script ContentService doesn't support custom headers,
  // but deployed with "Anyone" access it handles CORS automatically.
  return output
}

// ── GET — return all houses, or handle write action via ?data= param ──────────

function doGet(e) {
  try {
    const sheet = getOrCreateSheet()

    // Write action encoded as ?data=<json> (avoids Safari cross-origin POST block)
    if (e && e.parameter && e.parameter.data) {
      const body = JSON.parse(e.parameter.data)
      return handleAction(sheet, body)
    }

    // Plain GET — return all houses
    const houses = sheetToObjects(sheet)
    return cors(
      ContentService.createTextOutput(JSON.stringify({ ok: true, houses }))
        .setMimeType(ContentService.MimeType.JSON)
    )
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

// ── Shared action handler (called by both doGet ?data= and doPost) ────────────

function handleAction(sheet, body) {
  const { action, house, id } = body
  const headers = getHeaders(sheet)

  if (action === 'add') {
    sheet.appendRow(houseToRow(house, headers))

  } else if (action === 'update') {
    const row = findRowById(sheet, house.id)
    if (row === -1) throw new Error('House not found: ' + house.id)
    sheet.getRange(row, 1, 1, headers.length).setValues([houseToRow(house, headers)])

  } else if (action === 'delete') {
    const row = findRowById(sheet, id)
    if (row === -1) throw new Error('House not found: ' + id)
    sheet.deleteRow(row)

  } else {
    throw new Error('Unknown action: ' + action)
  }

  return cors(
    ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  )
}

// ── POST — kept for backward compatibility ────────────────────────────────────

function doPost(e) {
  try {
    const sheet = getOrCreateSheet()
    return handleAction(sheet, JSON.parse(e.postData.contents))
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}
