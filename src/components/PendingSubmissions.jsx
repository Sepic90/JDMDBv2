import { db } from '../firebase'
import { doc, deleteDoc } from 'firebase/firestore'
import { ExternalLink, Check, X, Clock, Inbox } from 'lucide-react'

export default function PendingSubmissions({ pending, onAccept, onRefresh, showToast }) {
  const handleDecline = async (id) => {
    try {
      await deleteDoc(doc(db, 'pendingSubmissions', id))
      onRefresh()
      showToast('Submission declined')
    } catch (err) {
      showToast('Failed to decline', 'error')
    }
  }

  if (pending.length === 0) {
    return (
      <div className="empty-state">
        <Inbox />
        <p>No pending submissions</p>
      </div>
    )
  }

  return (
    <div className="pending-list">
      {pending.map(item => {
        const date = new Date(item.submittedAt)
        const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

        return (
          <div key={item.id} className="pending-item">
            <div className="pending-item-header">
              <div className="pending-meta">
                <span className="pending-year">{item.year}</span>
                <span className="pending-date">
                  <Clock style={{ width: '11px', height: '11px' }} />
                  {dateStr} at {timeStr}
                </span>
              </div>
              <div className="pending-actions">
                <button className="btn btn-sm btn-danger" onClick={() => handleDecline(item.id)}>
                  <X style={{ width: '12px', height: '12px' }} />
                  Decline
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => onAccept(item)}>
                  <Check style={{ width: '12px', height: '12px' }} />
                  Accept
                </button>
              </div>
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="pending-url"
              title={item.url}
            >
              <ExternalLink style={{ width: '11px', height: '11px', flexShrink: 0 }} />
              {item.url}
            </a>

            {item.notes && (
              <div className="pending-notes">"{item.notes}"</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
