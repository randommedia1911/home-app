import { useState, useEffect } from 'react'
import HouseCard from './components/HouseCard'
import AddHouseModal from './components/AddHouseModal'
import CompareBar from './components/CompareBar'
import GlobalControls from './components/GlobalControls'
import './App.css'

const STORAGE_KEY = 'house-comparison-v12'
const CLOSING_COST_PCT = 4

const defaultHouses = [
  {
    id: '1',
    nickname: 'Fairmount Ave Condo',
    address: '77 Fairmount Ave #220, Oakland, CA 94611',
    link: 'https://www.redfin.com/CA/Oakland/77-Fairmount-Ave-94611/unit-220/home/2113365',
    imageUrl: '/fairmount.png',
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
    imageUrl: '/macarthur.png',
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
    imageUrl: '/franklin.png',
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
    id: '4',
    nickname: 'Thrush Ave Condo',
    address: '1410 Thrush Ave #3, Ashland, CA 94578',
    link: 'https://www.redfin.com/CA/Ashland/1410-Thrush-Ave-94578/unit-3/home/1977797',
    imageUrl: '/thrush.png',
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

function loadHouses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : defaultHouses
  } catch {
    return defaultHouses
  }
}

export default function App() {
  const [houses, setHouses] = useState(loadHouses)
  const [showModal, setShowModal] = useState(false)
  const [editingHouse, setEditingHouse] = useState(null)
  const [dDown, setDDown] = useState(0)
  const [aDown, setADown] = useState(100000)
  const [aMonthlyTarget, setAMonthlyTarget] = useState(1100)
  const [equalizeYears, setEqualizeYears] = useState(30)
  const [saleYear, setSaleYear] = useState(30)
  const [utilities, setUtilities] = useState({ water: 60, trash: 40, electricity: 300 })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(houses))
  }, [houses])

  function addHouse(house) {
    if (editingHouse) {
      setHouses(h => h.map(x => x.id === editingHouse.id ? { ...house, id: editingHouse.id } : x))
    } else {
      setHouses(h => [...h, { ...house, id: Date.now().toString() }])
    }
    setShowModal(false)
    setEditingHouse(null)
  }

  function deleteHouse(id) {
    setHouses(h => h.filter(x => x.id !== id))
  }

  function openEdit(house) {
    setEditingHouse(house)
    setShowModal(true)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div>
            <h1>Home Comparison</h1>
            <p className="subtitle">Compare monthly costs across homes you're considering</p>
          </div>
          <button className="btn-primary" onClick={() => { setEditingHouse(null); setShowModal(true) }}>
            + Add Home
          </button>
        </div>
      </header>

      <div className="app-body">
      <aside className="sidebar">
        <GlobalControls
          dDown={dDown} setDDown={setDDown}
          aDown={aDown} setADown={setADown}
          aMonthlyTarget={aMonthlyTarget} setAMonthlyTarget={setAMonthlyTarget}
          equalizeYears={equalizeYears} setEqualizeYears={setEqualizeYears}
          saleYear={saleYear} setSaleYear={setSaleYear}
          utilities={utilities} setUtilities={setUtilities}
          closingCostPct={CLOSING_COST_PCT}
        />
      </aside>

      <main className="main">
        {houses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <h2>No homes yet</h2>
            <p>Add your first home to start comparing monthly costs.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Add a Home</button>
          </div>
        ) : (
          <>

            <div className="cards-grid">
              {houses.map(house => (
                <HouseCard
                  key={house.id}
                  house={house}
                  dDown={dDown} aDown={aDown}
                  closingCostPct={CLOSING_COST_PCT}
                  aMonthlyTarget={aMonthlyTarget}
                  equalizeYears={equalizeYears}
                  saleYear={saleYear}
                  utilities={utilities}
                  onEdit={() => openEdit(house)}
                  onDelete={() => deleteHouse(house.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
      </div>

      {showModal && (
        <AddHouseModal
          initial={editingHouse}
          onSave={addHouse}
          onClose={() => { setShowModal(false); setEditingHouse(null) }}
        />
      )}
    </div>
  )
}
