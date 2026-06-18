import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { api } from '../lib/api'

function getBase() {
  return import.meta.env.VITE_BASE_URL || window.location.origin
}

function truncate(str, n = 42) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

function fmt(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Icons ───────────────────────────────────────────────────────────────
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── QR Form Modal ─────────────────────────────────────────────────────────
function QRFormModal({ title, initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [dest, setDest] = useState(initial?.destination || '')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setSaving(true)
    try {
      await onSave(name, dest)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label>
          Name
          <input
            type="text"
            placeholder="e.g. Business Card"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Destination URL
          <input
            type="url"
            placeholder="https://example.com"
            value={dest}
            onChange={e => setDest(e.target.value)}
            required
          />
        </label>
        {err && <p className="form-error">{err}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create QR Code'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── QR Card ───────────────────────────────────────────────────────────────
function QRCard({ code, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrUrl = `${getBase()}/r/${code.id}`
  const canvasId = `qr-${code.id}`

  function download() {
    const canvas = document.getElementById(canvasId)
    const link = document.createElement('a')
    link.download = `${code.name.replace(/\s+/g, '-')}-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function copyUrl() {
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="qr-card">
      <div className="qr-code-wrap">
        <QRCodeCanvas id={canvasId} value={qrUrl} size={512} />
      </div>
      <div className="qr-card-body">
        <h3 className="qr-name">{code.name}</h3>
        <div className="qr-dest" title={code.destination}>
          <span className="dest-arrow">→</span>
          <span className="dest-text">{truncate(code.destination)}</span>
        </div>
        <div className="qr-stats">
          <span className="stat-badge">{code.scans} scan{code.scans !== 1 ? 's' : ''}</span>
          <span className="stat-dot">·</span>
          <span className="stat-date">Last: {fmt(code.lastScanned)}</span>
        </div>
      </div>
      <div className="qr-card-footer">
        <div className="footer-left">
          <button className="btn-icon btn-edit" onClick={() => onEdit(code)} title="Edit URL">
            <PencilIcon />
          </button>
          <button className="btn-icon btn-download" onClick={download} title="Download PNG">
            <DownloadIcon />
          </button>
          <button className={`btn-icon btn-copy${copied ? ' btn-copied' : ''}`} onClick={copyUrl} title="Copy redirect URL">
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <div className="footer-right">
          {confirmDelete ? (
            <div className="confirm-del">
              <span>Delete?</span>
              <button className="btn-text btn-yes" onClick={() => onDelete(code.id)}>Yes</button>
              <button className="btn-text btn-no" onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          ) : (
            <button className="btn-icon btn-delete" onClick={() => setConfirmDelete(true)} title="Delete">
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setCodes(await api.list())
    } catch { /* auth guard handles 401 */ }
    finally { setLoading(false) }
  }

  function logout() {
    localStorage.removeItem('qr_token')
    navigate('/login', { replace: true })
  }

  async function handleCreate(name, destination) {
    const code = await api.create(name, destination)
    setCodes(prev => [code, ...prev])
    setShowCreate(false)
  }

  async function handleUpdate(id, data) {
    const updated = await api.update(id, data)
    setCodes(prev => prev.map(c => c.id === id ? updated : c))
    setEditing(null)
  }

  async function handleDelete(id) {
    await api.remove(id)
    setCodes(prev => prev.filter(c => c.id !== id))
  }

  const totalScans = codes.reduce((s, c) => s + (c.scans || 0), 0)

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="header-brand">
          <svg className="brand-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="17" width="3" height="3" />
            <rect x="19" y="14" width="2" height="2" />
            <rect x="14" y="14" width="2" height="2" />
            <rect x="19" y="19" width="2" height="2" />
          </svg>
          <span>QR Manager</span>
        </div>
        <button className="btn-ghost btn-logout" onClick={logout}>Logout</button>
      </header>

      <main className="dash-main">
        <div className="dash-top">
          <div>
            <h1 className="page-title">Your QR Codes</h1>
            <div className="stats-row">
              <span className="stat-pill">{codes.length} QR{codes.length !== 1 ? 's' : ''}</span>
              <span className="stat-pill">{totalScans} total scan{totalScans !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + New QR Code
          </button>
        </div>

        {loading ? (
          <div className="state-center">
            <div className="spinner" />
          </div>
        ) : codes.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="17" width="3" height="3" />
              <rect x="19" y="14" width="2" height="2" />
              <rect x="14" y="14" width="2" height="2" />
              <rect x="19" y="19" width="2" height="2" />
            </svg>
            <h2>No QR codes yet</h2>
            <p>Create your first one — the code stays the same, you just update the link whenever you want.</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Create First QR Code</button>
          </div>
        ) : (
          <div className="qr-grid">
            {codes.map(code => (
              <QRCard
                key={code.id}
                code={code}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <QRFormModal
          title="New QR Code"
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editing && (
        <QRFormModal
          title="Edit QR Code"
          initial={editing}
          onSave={(name, dest) => handleUpdate(editing.id, { name, destination: dest })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
