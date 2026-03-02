import { useState, useEffect, useRef } from 'react'
import HouseCard from './components/HouseCard'
import AddHouseModal from './components/AddHouseModal'
import BookmarkletModal from './components/BookmarkletModal'
import CompareBar from './components/CompareBar'
import GlobalControls from './components/GlobalControls'
import { calcTotalMonthly, calcAMonthlyFromOwnership } from './utils/mortgage'
import { fetchHouses, addHouse as apiAdd, updateHouse as apiUpdate, removeHouse as apiRemove } from './api/sheets'
import './App.css'

const PREFS_KEY = 'house-comparison-prefs'
const CLOSING_COST_PCT = 4

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {} } catch { return {} }
}
function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

const BASE = import.meta.env.BASE_URL

const defaultHouses = [
  {
    id: '1',
    nickname: 'Fairmount Ave Condo',
    address: '77 Fairmount Ave #220, Oakland, CA 94611',
    link: 'https://www.redfin.com/CA/Oakland/77-Fairmount-Ave-94611/unit-220/home/2113365',
    imageUrl: `${BASE}fairmount.png`,
    price: 399000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 4992,
    hoaMonthly: 846,
    insuranceMonthly: 80,
    beds: 2,
    baths: 2,
    sqft: 1165,
    notes: '',
  },
  {
    id: '2',
    nickname: 'W Macarthur Blvd Condo',
    address: '485 W Macarthur Blvd #407, Oakland, CA 94609',
    link: '',
    imageUrl: `${BASE}macarthur.png`,
    price: 415000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 5184,
    hoaMonthly: 686,
    insuranceMonthly: 83,
    beds: 2,
    baths: 1,
    sqft: 1033,
    notes: '',
  },
  {
    id: '3',
    nickname: 'Franklin St Condo',
    address: '801 Franklin St #205, Oakland, CA 94607',
    link: 'https://www.redfin.com/CA/Oakland/801-Franklin-St-94607/unit-205/home/1156035',
    imageUrl: `${BASE}franklin.png`,
    price: 390000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 4872,
    hoaMonthly: 816,
    insuranceMonthly: 78,
    beds: 2,
    baths: 1.5,
    sqft: 1140,
    notes: '',
  },
  {
    id: '10',
    nickname: 'Chanslor Ave Condo',
    address: '1532 Chanslor Ave Apt T, Richmond, CA 94801',
    link: 'https://www.redfin.com/CA/Richmond/1532-Chanslor-Ave-94801/unit-T/home/1309571',
    imageUrl: '',
    price: 218000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 2724,
    hoaMonthly: 395,
    insuranceMonthly: 47,
    beds: 2,
    baths: 1,
    sqft: 816,
    notes: '',
  },
  {
    id: '9',
    nickname: 'Edy Ln Townhouse',
    address: '931 Edy Ln, Oakland, CA 94607',
    link: 'https://www.redfin.com/CA/Oakland/931-Edy-Ln-94607/home/167188581',
    imageUrl: `${BASE}edy.png`,
    price: 619000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 7740,
    hoaMonthly: 198,
    insuranceMonthly: 124,
    beds: 2,
    baths: 2.5,
    sqft: 1214,
    notes: '',
  },
  {
    id: '8',
    nickname: 'E 14th St Condo',
    address: '16006 E 14th St #101, Ashland, CA 94578',
    link: 'https://www.redfin.com/CA/Ashland/16006-E-14th-St-94578/unit-101/home/12115949',
    imageUrl: `${BASE}e14th.png`,
    price: 325000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 4068,
    hoaMonthly: 593,
    insuranceMonthly: 65,
    beds: 2,
    baths: 1,
    sqft: 824,
    notes: '',
  },
  {
    id: '7',
    nickname: 'Webster St Condo',
    address: '410 Webster St #1, Oakland, CA 94607',
    link: 'https://www.redfin.com/CA/Oakland/410-Webster-St-94607/unit-1/home/175925018',
    imageUrl: `${BASE}webster.png`,
    price: 349000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 4368,
    hoaMonthly: 572,
    insuranceMonthly: 70,
    beds: 1,
    baths: 1,
    sqft: 630,
    notes: '',
  },
  {
    id: '6',
    nickname: 'Hays St Condo',
    address: '1599 Hays St #306, San Leandro, CA 94577',
    link: 'https://www.redfin.com/CA/San-Leandro/1599-Hays-St-94577/unit-306/home/196685797',
    imageUrl: `${BASE}hays.png`,
    price: 325000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 4068,
    hoaMonthly: 688,
    insuranceMonthly: 65,
    beds: 2,
    baths: 2,
    sqft: 899,
    notes: '',
  },
  {
    id: '5',
    nickname: 'Harrison St Condo',
    address: '3751 Harrison St #102, Oakland, CA 94611',
    link: 'https://www.redfin.com/CA/Oakland/3751-Harrison-St-94611/unit-102/home/187969446',
    imageUrl: `${BASE}harrison.png`,
    price: 299000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 3732,
    hoaMonthly: 653,
    insuranceMonthly: 60,
    beds: 1,
    baths: 1,
    sqft: 644,
    notes: '',
  },
  {
    id: '4',
    nickname: 'Thrush Ave Condo',
    address: '1410 Thrush Ave #3, Ashland, CA 94578',
    link: 'https://www.redfin.com/CA/Ashland/1410-Thrush-Ave-94578/unit-3/home/1977797',
    imageUrl: `${BASE}thrush.png`,
    price: 365000,
    interestRate: 6,
    loanTermYears: 30,
    propertyTaxAnnual: 4560,
    hoaMonthly: 598,
    insuranceMonthly: 73,
    beds: 2,
    baths: 2,
    sqft: 820,
    notes: '',
  },
]

export default function App() {
  const prefs = loadPrefs()
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const seeded = useRef(false)
  const [showModal, setShowModal] = useState(false)
  const [editingHouse, setEditingHouse] = useState(null)
  const [showBookmarklet, setShowBookmarklet] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [dCashBudget, setDCashBudget] = useState(prefs.dCashBudget ?? 35000)
  const [aCashBudget, setACashBudget] = useState(prefs.aCashBudget ?? 100000)
  const [dDown, setDDown] = useState(prefs.dDown ?? 0)
  const [aDown, setADown] = useState(prefs.aDown ?? 100000)
  const [aMonthlyAdj, setAMonthlyAdj] = useState(prefs.aMonthlyAdj ?? 0)
  const [equalizeYears, setEqualizeYears] = useState(prefs.equalizeYears ?? 30)
  const [saleYear, setSaleYear] = useState(prefs.saleYear ?? 30)
  const [appreciationPct, setAppreciationPct] = useState(prefs.appreciationPct ?? 3)
  const [taxIncreasePct, setTaxIncreasePct] = useState(prefs.taxIncreasePct ?? 2)
  const [hoaIncreasePct, setHoaIncreasePct] = useState(prefs.hoaIncreasePct ?? 3)
  const [insuranceIncreasePct, setInsuranceIncreasePct] = useState(prefs.insuranceIncreasePct ?? 3)
  const [refiYear, setRefiYear] = useState(prefs.refiYear ?? 0)
  const [refiRate, setRefiRate] = useState(prefs.refiRate ?? 5)
  const [refiTermYears, setRefiTermYears] = useState(prefs.refiTermYears ?? 30)
  const [dBudget, setDBudget] = useState(prefs.dBudget ?? 3750)
  const [aBudget, setABudget] = useState(prefs.aBudget ?? 1500)
  const [investRate, setInvestRate] = useState(prefs.investRate ?? 7)
  const [retireMode, setRetireMode] = useState(prefs.retireMode ?? 'elsewhere')
  const [rentYield, setRentYield] = useState(prefs.rentYield ?? 2)
  const [rentProfitMinYear, setRentProfitMinYear] = useState(prefs.rentProfitMinYear ?? 20)
  const [rent1BR, setRent1BR] = useState(prefs.rent1BR ?? 2100)
  const [rent2BR, setRent2BR] = useState(prefs.rent2BR ?? 2600)
  const [rentUpgradeTo2BR, setRentUpgradeTo2BR] = useState(prefs.rentUpgradeTo2BR ?? 3)
  const [rentIncreaseRate, setRentIncreaseRate] = useState(prefs.rentIncreaseRate ?? 3)
  const [rentMoveEvery, setRentMoveEvery] = useState(prefs.rentMoveEvery ?? 0)
  const [rentMarketGrowth, setRentMarketGrowth] = useState(prefs.rentMarketGrowth ?? 3)
  const [rentParking, setRentParking] = useState(prefs.rentParking ?? 100)
  const [utilities, setUtilities] = useState({
    water:       prefs.utilities?.water       ?? 60,
    trash:       prefs.utilities?.trash       ?? 40,
    electricity: prefs.utilities?.electricity ?? 300,
    waterInHoa:  prefs.utilities?.waterInHoa  ?? true,
    trashInHoa:  prefs.utilities?.trashInHoa  ?? true,
  })
  const [rentUtilities, setRentUtilities] = useState({
    water:       prefs.rentUtilities?.water       ?? 60,
    trash:       prefs.rentUtilities?.trash       ?? 30,
    sewer:       prefs.rentUtilities?.sewer       ?? 90,
    electricity: prefs.rentUtilities?.electricity ?? 300,
  })
  const [utilIncreaseRate, setUtilIncreaseRate] = useState(prefs.utilIncreaseRate ?? 3)
  const [retireYear, setRetireYear] = useState(prefs.retireYear ?? 30)
  const [inflationRate, setInflationRate] = useState(prefs.inflationRate ?? 3)
  const [currentAge, setCurrentAge] = useState(prefs.currentAge ?? 33)
  const [spendingCap, setSpendingCap] = useState(prefs.spendingCap ?? 8000)
  const [overseasCost, setOverseasCost] = useState(prefs.overseasCost ?? 2500)
  const [overseasSpendingCap, setOverseasSpendingCap] = useState(prefs.overseasSpendingCap ?? 5000)
  const [overseasRentIncrease, setOverseasRentIncrease] = useState(prefs.overseasRentIncrease ?? 2)
  const [usRentalIncrease, setUsRentalIncrease] = useState(prefs.usRentalIncrease ?? 3)
  const [colRatio, setColRatio] = useState(prefs.colRatio ?? 40)

  // Persist UI prefs to localStorage
  useEffect(() => {
    savePrefs({ dCashBudget, aCashBudget, dDown, aDown, aMonthlyAdj, equalizeYears, saleYear, appreciationPct, taxIncreasePct, hoaIncreasePct, insuranceIncreasePct, refiYear, refiRate, refiTermYears, dBudget, aBudget, investRate, retireMode, rentYield, rentProfitMinYear, rent1BR, rent2BR, rentUpgradeTo2BR, rentIncreaseRate, rentMoveEvery, rentMarketGrowth, rentParking, utilities, rentUtilities, utilIncreaseRate, retireYear, inflationRate, currentAge, spendingCap, overseasCost, overseasSpendingCap, overseasRentIncrease, usRentalIncrease, colRatio })
  }, [dCashBudget, aCashBudget, dDown, aDown, aMonthlyAdj, equalizeYears, saleYear, appreciationPct, taxIncreasePct, hoaIncreasePct, insuranceIncreasePct, refiYear, refiRate, refiTermYears, dBudget, aBudget, investRate, retireMode, rentYield, rentProfitMinYear, rent1BR, rent2BR, rentUpgradeTo2BR, rentIncreaseRate, rentMoveEvery, rentMarketGrowth, rentParking, utilities, rentUtilities, utilIncreaseRate, retireYear, inflationRate, currentAge, spendingCap, overseasCost, overseasSpendingCap, overseasRentIncrease, usRentalIncrease, colRatio])

  // Load houses from Google Sheets on mount; seed defaults if sheet is empty
  useEffect(() => {
    fetchHouses()
      .then(async rows => {
        if (rows.length === 0 && !seeded.current) {
          seeded.current = true
          await Promise.all(defaultHouses.map(h => apiAdd(h)))
          setHouses(defaultHouses)
        } else {
          setHouses(rows.map(h => ({
            ...h,
            price: Number(h.price) || 0,
            interestRate: Number(h.interestRate) || 6,
            loanTermYears: Number(h.loanTermYears) || 30,
            propertyTaxAnnual: Number(h.propertyTaxAnnual) || 0,
            hoaMonthly: Number(h.hoaMonthly) || 0,
            insuranceMonthly: Number(h.insuranceMonthly) || 0,
            beds: Number(h.beds) || 0,
            baths: Number(h.baths) || 0,
            sqft: Number(h.sqft) || 0,
            toured: !!h.toured,
            skip:   !!h.skip,
          })))
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Handle ?import= from bookmarklet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('import')
    if (raw) {
      try {
        const data = JSON.parse(decodeURIComponent(raw))
        setEditingHouse({ ...data, id: null })
        setShowModal(true)
        window.history.replaceState({}, '', window.location.pathname)
      } catch { /* ignore malformed */ }
    }
  }, [])

  async function saveHouse(house) {
    const normalise = s => (s || '').trim().toLowerCase()
    const duplicate = houses.find(h =>
      normalise(h.address) === normalise(house.address) &&
      h.id !== editingHouse?.id
    )
    if (duplicate) throw new Error(`A home with this address already exists: "${duplicate.address}"`)

    if (editingHouse?.id) {
      const updated = { ...house, id: editingHouse.id }
      await apiUpdate(updated)
      setHouses(h => h.map(x => x.id === editingHouse.id ? updated : x))
    } else {
      const newHouse = { ...house, id: Date.now().toString() }
      await apiAdd(newHouse)
      setHouses(h => [...h, newHouse])
    }
    setShowModal(false)
    setEditingHouse(null)
  }

  async function deleteHouse(id) {
    await apiRemove(id)
    setHouses(h => h.filter(x => x.id !== id))
  }

  async function setHouseStatus(id, flags) {
    const original = houses.find(h => h.id === id)
    if (!original) return
    const next = { ...original, ...flags, toured: !!flags.toured, skip: !!flags.skip }
    setHouses(h => h.map(x => x.id === id ? next : x))
    setSaveError(null)
    try {
      await apiUpdate(next)
    } catch (err) {
      setSaveError(`Sheets save failed: ${err.message}`)
    }
  }

  function openEdit(house) {
    setEditingHouse(house)
    setShowModal(true)
  }

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [snapshotsExpanded, setSnapshotsExpanded] = useState(true)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="burger-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle settings">
              <span /><span /><span />
            </button>
            <div>
              <h1>Home Comparison</h1>
              <p className="subtitle">Compare monthly costs across homes you're considering</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setShowBookmarklet(true)}>
              📎 Redfin Bookmarklet
            </button>
            <button className="btn-primary" onClick={() => { setEditingHouse(null); setShowModal(true) }}>
              + Add Home
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close settings">✕</button>
        <GlobalControls
          dCashBudget={dCashBudget} setDCashBudget={setDCashBudget}
          aCashBudget={aCashBudget} setACashBudget={setACashBudget}
          dDown={dDown} setDDown={setDDown}
          aDown={aDown} setADown={setADown}
          aMonthlyAdj={aMonthlyAdj} setAMonthlyAdj={setAMonthlyAdj}
          equalizeYears={equalizeYears} setEqualizeYears={setEqualizeYears}
          saleYear={saleYear} setSaleYear={setSaleYear}
          appreciationPct={appreciationPct} setAppreciationPct={setAppreciationPct}
          taxIncreasePct={taxIncreasePct} setTaxIncreasePct={setTaxIncreasePct}
          hoaIncreasePct={hoaIncreasePct} setHoaIncreasePct={setHoaIncreasePct}
          insuranceIncreasePct={insuranceIncreasePct} setInsuranceIncreasePct={setInsuranceIncreasePct}
          refiYear={refiYear} setRefiYear={setRefiYear}
          refiRate={refiRate} setRefiRate={setRefiRate}
          refiTermYears={refiTermYears} setRefiTermYears={setRefiTermYears}
          dBudget={dBudget} setDBudget={setDBudget}
          aBudget={aBudget} setABudget={setABudget}
          investRate={investRate} setInvestRate={setInvestRate}
          retireMode={retireMode} setRetireMode={setRetireMode}
          rentYield={rentYield} setRentYield={setRentYield}
          rentProfitMinYear={rentProfitMinYear} setRentProfitMinYear={setRentProfitMinYear}
          rent1BR={rent1BR} setRent1BR={setRent1BR}
          rent2BR={rent2BR} setRent2BR={setRent2BR}
          rentUpgradeTo2BR={rentUpgradeTo2BR} setRentUpgradeTo2BR={setRentUpgradeTo2BR}
          rentIncreaseRate={rentIncreaseRate} setRentIncreaseRate={setRentIncreaseRate}
          rentMoveEvery={rentMoveEvery} setRentMoveEvery={setRentMoveEvery}
          rentMarketGrowth={rentMarketGrowth} setRentMarketGrowth={setRentMarketGrowth}
          rentParking={rentParking} setRentParking={setRentParking}
          utilities={utilities} setUtilities={setUtilities}
          rentUtilities={rentUtilities} setRentUtilities={setRentUtilities}
          utilIncreaseRate={utilIncreaseRate} setUtilIncreaseRate={setUtilIncreaseRate}
          retireYear={retireYear} setRetireYear={setRetireYear}
          inflationRate={inflationRate} setInflationRate={setInflationRate}
          currentAge={currentAge} setCurrentAge={setCurrentAge}
          spendingCap={spendingCap} setSpendingCap={setSpendingCap}
          overseasCost={overseasCost} setOverseasCost={setOverseasCost}
          overseasSpendingCap={overseasSpendingCap} setOverseasSpendingCap={setOverseasSpendingCap}
          overseasRentIncrease={overseasRentIncrease} setOverseasRentIncrease={setOverseasRentIncrease}
          usRentalIncrease={usRentalIncrease} setUsRentalIncrease={setUsRentalIncrease}
          colRatio={colRatio} setColRatio={setColRatio}
          closingCostPct={CLOSING_COST_PCT}
        />
      </aside>

      <main className="main">
        {saveError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#b91c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            ⚠️ {saveError}
            <button onClick={() => setSaveError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '1rem', padding: 0 }}>✕</button>
          </div>
        )}
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <p style={{ color: '#6b7280', marginTop: 12 }}>Loading houses from Google Sheets…</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h2>Could not load houses</h2>
            <p style={{ color: '#ef4444' }}>{error}</p>
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Check that <code>VITE_SHEETS_API_URL</code> is set correctly.</p>
          </div>
        ) : houses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <h2>No homes yet</h2>
            <p>Add your first home to start comparing monthly costs.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Add a Home</button>
          </div>
        ) : (
          <>

            <div className="cards-grid">
              {[...houses].sort((a, b) => {
                const aMonthly = h => Math.max(0,
                  calcAMonthlyFromOwnership(h, dDown, aDown, CLOSING_COST_PCT, 50, utilities) + aMonthlyAdj
                )
                const aNet = h => calcTotalMonthly(h, dDown, aDown, CLOSING_COST_PCT, aMonthly(h), equalizeYears, utilities).aNetDuring
                return aNet(a) - aNet(b)
              }).map(house => (
                <HouseCard
                  key={house.id}
                  house={house}
                  dCashBudget={dCashBudget} aCashBudget={aCashBudget}
                  dDown={dDown} aDown={aDown}
                  closingCostPct={CLOSING_COST_PCT}
                  aMonthlyAdj={aMonthlyAdj}
                  equalizeYears={equalizeYears}
                  saleYear={saleYear}
                  appreciationPct={appreciationPct}
                  taxIncreasePct={taxIncreasePct}
                  hoaIncreasePct={hoaIncreasePct}
                  insuranceIncreasePct={insuranceIncreasePct}
                  refiYear={refiYear}
                  refiRate={refiRate}
                  refiTermYears={refiTermYears}
                  dBudget={dBudget}
                  aBudget={aBudget}
                  investRate={investRate}
                  retireMode={retireMode}
                  rentYield={rentYield}
                  rentProfitMinYear={rentProfitMinYear}
                  rent1BR={rent1BR}
                  rent2BR={rent2BR}
                  rentUpgradeTo2BR={rentUpgradeTo2BR}
                  rentIncreaseRate={rentIncreaseRate}
                  rentMoveEvery={rentMoveEvery}
                  rentMarketGrowth={rentMarketGrowth}
                  rentParking={rentParking}
                  utilities={utilities}
                  rentUtilities={rentUtilities}
                  utilIncreaseRate={utilIncreaseRate}
                  retireYear={retireYear}
                  inflationRate={inflationRate}
                  currentAge={currentAge}
                  spendingCap={spendingCap}
                  overseasCost={overseasCost}
                  overseasSpendingCap={overseasSpendingCap}
                  overseasRentIncrease={overseasRentIncrease}
                  usRentalIncrease={usRentalIncrease}
                  colRatio={colRatio}
                  snapshotsExpanded={snapshotsExpanded}
                  onToggleSnapshots={() => setSnapshotsExpanded(v => !v)}
                  onEdit={() => openEdit(house)}
                  onDelete={() => deleteHouse(house.id)}
                  onStatusChange={(flags) => setHouseStatus(house.id, flags)}
                />
              ))}
            </div>
          </>
        )}
      </main>
      </div>

      {showBookmarklet && <BookmarkletModal onClose={() => setShowBookmarklet(false)} />}

      {showModal && (
        <AddHouseModal
          initial={editingHouse}
          onSave={saveHouse}
          onClose={() => { setShowModal(false); setEditingHouse(null) }}
        />
      )}
    </div>
  )
}
