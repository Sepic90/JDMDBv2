import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Database, Plus, Settings, Trophy, Send, Inbox } from 'lucide-react'
import NewEntry from './components/NewEntry'
import DatabaseView from './components/DatabaseView'
import Showroom from './components/Showroom'
import SettingsView from './components/SettingsView'
import SubmitFind from './components/SubmitFind'
import PendingSubmissions from './components/PendingSubmissions'
import Toast from './components/Toast'

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

  const tabs = [
    { id: 'showroom', label: 'Showroom', icon: Trophy },
    { id: 'new', label: 'New Entry', icon: Plus },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'submit', label: 'Submit Find', icon: Send },
    { id: 'pending', label: 'Pending', icon: Inbox, badge: pendingSubmissions.length || null },
  ]

  const headerTitle = {
    showroom: 'Showroom',
    new: pendingToAccept ? 'Review Submission' : 'New Entry',
    database: 'Database',
    settings: 'Settings',
    submit: 'Submit a Find',
    pending: 'Pending Submissions'
  }[activeTab] || ''

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span>JDM</span>DB
          </div>
        </div>
        <nav className="sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
              {tab.badge ? <span className="nav-badge">{tab.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-stats">
            <strong>{entries.length}</strong> entries
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="main-header">
          <h1 className="main-title">{headerTitle}</h1>
        </header>

        <div className="main-content">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner" />
              Loading...
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
                    showToast('Entry added successfully')
                  }}
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
