import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Login() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const { token } = await api.login(pw)
      localStorage.setItem('qr_token', token)
      navigate('/', { replace: true })
    } catch {
      setErr('Wrong password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="17" width="3" height="3" />
            <rect x="19" y="14" width="2" height="2" />
            <rect x="14" y="14" width="2" height="2" />
            <rect x="19" y="19" width="2" height="2" />
          </svg>
        </div>
        <h1>QR Manager</h1>
        <p className="login-sub">Enter your password to manage your QR codes</p>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus
            required
          />
          {err && <p className="login-error">{err}</p>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Verifying…' : 'Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
