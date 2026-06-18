const API_BASE = import.meta.env.VITE_API_URL || ''

function token() {
  return localStorage.getItem('qr_token') || ''
}

async function request(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...opts.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('qr_token')
    window.location.href = '/login'
    return
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  login: (password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  list: () => request('/api/qr-codes'),
  create: (name, destination) =>
    request('/api/qr-codes', { method: 'POST', body: JSON.stringify({ name, destination }) }),
  update: (id, data) =>
    request(`/api/qr-codes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/qr-codes/${id}`, { method: 'DELETE' }),
}
