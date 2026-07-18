import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, getDocs } from 'firebase/firestore'
import NewEntry from './components/NewEntry'
import DatabaseView from './components/DatabaseView'
import Showroom from './components/Showroom'
import SettingsView from './components/SettingsView'
import SubmitFind from './components/SubmitFind'
import PendingSubmissions from './components/PendingSubmissions'
import Toast from './components/Toast'

const NAV = [
  { id: 'showroom', label: 'Collection', jp: 'コレクション' },
  { id: 'new',      label: 'New Entry',  jp: '新規登録' },
  { id: 'database', label: 'Registry',   jp: '記録簿' },
  { id: 'settings', label: 'Catalog',    jp: '型録' },
  { id: 'submit',   label: 'Submit',     jp: '投稿' },
  { id: 'pending',  label: 'Inbox',      jp: '受信箱' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('showroom')
  const [masterData, setMasterData] = useState([])
  const [entries, setEntries] = useState([])
  const [pendingSubmissions, setPendingSubmissions] = useState([])
  const [pendingToAccept, setPendingToAccept] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  const fetchData = async () => {
    console.log('Fetching data from Firebase...')
    try {
      const [masterSnap, entriesSnap] = await Promise.all([
        getDocs(collection(db, 'masterData')),
        getDocs(collection(db, 'entries')),
      ])

      const masterList = masterSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      masterList.sort((a, b) => {
        const makeA = String(a.make || ''), makeB = String(b.make || '')
        if (makeA !== makeB) return makeA.localeCompare(makeB)
        const modelA = String(a.model || ''), modelB = String(b.model || '')
        if (modelA !== modelB) return modelA.localeCompare(modelB)
        return String(a.variant || '').localeCompare(String(b.variant || ''))
      })
      setMasterData(masterList)

      const entriesList = entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      entriesList.sort((a, b) => {
        const makeA = String(a.make || ''), makeB = String(b.make || '')
        if (makeA !== makeB) return makeA.localeCompare(makeB)
        return String(a.model || '').localeCompare(String(b.model || ''))
      })
      setEntries(entriesList)

      console.log('✅ Loaded:', masterList.length, 'master,', entriesList.length, 'entries')
    } catch (err) {
      console.error('❌ Firebase fetch error:', err)
      showToast('Failed to load data: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }

    // Pending submissions fetched separately — a failure here must not block main data
    try {
      const pendingSnap = await getDocs(collection(db, 'pendingSubmissions'))
      const pendingList = pendingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      pendingList.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      setPendingSubmissions(pendingList)
      console.log('✅ Loaded:', pendingList.length, 'pending')
    } catch (err) {
      console.error('❌ Pending submissions fetch error:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleTabChange = (tabId) => {
    // Clear pending acceptance flow when navigating away from new entry tab
    if (activeTab === 'new' && tabId !== 'new' && pendingToAccept) {
      setPendingToAccept(null)
    }
    setActiveTab(tabId)
  }

  const handleAccept = (item) => {
    setPendingToAccept({ url: item.url, year: item.year, pendingId: item.id, notes: item.notes })
    setActiveTab('new')
  }

  const handlePendingComplete = (didSubmit = false) => {
    if (didSubmit) fetchData()
    setPendingToAccept(null)
    setActiveTab('pending')
  }

  const pageHead = {
    showroom: {
      title: 'The Collection', jp: 'コレクション',
      desc: 'Records, milestones, and finds worth revisiting.',
    },
    new: pendingToAccept
      ? { title: 'Review Submission', jp: '審査', desc: 'Assess a contributed find before it enters the registry.' }
      : { title: 'New Entry', jp: '新規登録', desc: 'Catalog a new find into the registry.' },
    database: {
      title: 'The Registry', jp: '記録簿',
      desc: 'Every documented sighting — indexed, searchable, exportable.',
    },
    settings: {
      title: 'The Catalog', jp: '型録',
      desc: 'The master reference of makes, models, and variants.',
    },
    submit: {
      title: 'Submit a Find', jp: '投稿',
      desc: 'Spotted something on Street View? Send it in for review.',
    },
    pending: {
      title: 'Inbox', jp: '受信箱',
      desc: 'Contributed finds awaiting review.',
    },
  }[activeTab]

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand" onClick={() => handleTabChange('showroom')}>
            <span className="brand-mark">JDMDB</span>
            <span className="brand-sub">Street View Archive</span>
          </div>
          <nav className="masthead-nav">
            {NAV.map(item => (
              <button
                key={item.id}
                className={`mnav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleTabChange(item.id)}
              >
                <span className="mnav-label">
                  {item.label}
                  {item.id === 'pending' && pendingSubmissions.length > 0 && (
                    <span className="mnav-dot">{pendingSubmissions.length}</span>
                  )}
                </span>
                <span className="mnav-jp">{item.jp}</span>
              </button>
            ))}
          </nav>
          <div className="masthead-meta">
            <strong>{entries.length}</strong>
            <span>records</span>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="page-inner">
          {pageHead && (
            <div className="page-head">
              <h1 className="page-title">
                {pageHead.title}
                <span className="jp">{pageHead.jp}</span>
              </h1>
              <p className="page-desc">{pageHead.desc}</p>
            </div>
          )}

          {loading ? (
            <div className="loading">
              <div className="loading-spinner" />
              Opening the archive…
            </div>
          ) : (
            <>
              {activeTab === 'showroom' && (
                <Showroom entries={entries} />
              )}
              {activeTab === 'new' && (
                <NewEntry
                  masterData={masterData}
                  onSuccess={() => {
                    fetchData()
                    showToast('Entry added to the registry')
                  }}
                  onRefresh={fetchData}
                  showToast={showToast}
                  prefillData={pendingToAccept}
                  onPendingComplete={handlePendingComplete}
                />
              )}
              {activeTab === 'database' && (
                <DatabaseView
                  entries={entries}
                  masterData={masterData}
                  onRefresh={fetchData}
                  showToast={showToast}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsView
                  masterData={masterData}
                  onRefresh={fetchData}
                  showToast={showToast}
                />
              )}
              {activeTab === 'submit' && (
                <SubmitFind showToast={showToast} />
              )}
              {activeTab === 'pending' && (
                <PendingSubmissions
                  pending={pendingSubmissions}
                  onAccept={handleAccept}
                  onRefresh={fetchData}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </div>
      </main>

      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </div>
  )
}
