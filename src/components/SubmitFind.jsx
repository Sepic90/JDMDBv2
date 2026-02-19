import { useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc } from 'firebase/firestore'
import { Send } from 'lucide-react'

const YEARS = Array.from({ length: 21 }, (_, i) => 2025 - i)

export default function SubmitFind({ showToast }) {
  const [form, setForm] = useState({ url: '', year: '2025', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!form.url.trim()) {
      showToast('Please paste the Street View URL', 'error')
      return
    }

    setSubmitting(true)
    try {
      await addDoc(collection(db, 'pendingSubmissions'), {
        url: form.url.trim(),
        year: form.year,
        notes: form.notes.trim(),
        submittedAt: new Date().toISOString()
      })
      setForm({ url: '', year: '2025', notes: '' })
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
    } catch (err) {
      showToast('Something went wrong, try again!', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="submit-find">
      <p className="submit-find-desc">
        Found something cool on Street View? Drop the link below and I'll check it out and score it!
      </p>

      {submitted && (
        <div className="submit-success">
          Submitted! I'll check it out soon ✓
        </div>
      )}

      <div className="submit-find-form">
        <div className="form-group">
          <label className="form-label">Street View URL</label>
          <input
            type="text"
            className="form-input"
            placeholder="Paste the Google Street View link here..."
            value={form.url}
            onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
          />
        </div>

        <div className="form-group" style={{ width: '160px' }}>
          <label className="form-label">Photo Year</label>
          <select
            className="form-select"
            value={form.year}
            onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            placeholder="What made this one stand out?"
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={3}
            style={{ minHeight: '72px' }}
          />
        </div>

        <div>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Send style={{ width: '14px', height: '14px' }} />
            {submitting ? 'Submitting...' : 'Submit Find'}
          </button>
        </div>
      </div>
    </div>
  )
}
