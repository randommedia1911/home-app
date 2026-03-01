const API_URL = import.meta.env.VITE_SHEETS_API_URL

if (!API_URL) {
  console.warn('VITE_SHEETS_API_URL is not set — house data will not persist to Google Sheets.')
}

async function call(body) {
  // Use GET with ?data= to avoid Safari blocking cross-origin POST requests
  const url = API_URL + '?data=' + encodeURIComponent(JSON.stringify(body))
  const res = await fetch(url, { redirect: 'follow' })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Sheets API error')
  return json
}

export async function fetchHouses() {
  const res = await fetch(API_URL + '?t=' + Date.now(), { redirect: 'follow' })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Failed to load houses')
  return json.houses
}

export async function addHouse(house) {
  return call({ action: 'add', house })
}

export async function updateHouse(house) {
  return call({ action: 'update', house })
}

export async function removeHouse(id) {
  return call({ action: 'delete', id })
}
