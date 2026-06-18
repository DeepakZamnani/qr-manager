import express from 'express'
import cors from 'cors'
import { kv } from '@vercel/kv'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, '../data/qr-codes.json')
const USE_KV = !!process.env.KV_REST_API_URL  // true on Vercel, false locally

const app = express()
const PASSWORD = process.env.DASHBOARD_PASSWORD || 'changeme'

app.use(cors({ origin: '*' }))
app.use(express.json())

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (token !== PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

async function readData() {
  if (USE_KV) return (await kv.get('qr-codes')) || []
  if (!existsSync(DATA_FILE)) return []
  return JSON.parse(readFileSync(DATA_FILE, 'utf8'))
}

async function saveData(data) {
  if (USE_KV) { await kv.set('qr-codes', data); return }
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// Public: QR redirect
app.get('/r/:id', async (req, res) => {
  const codes = await readData()
  const code = codes.find(c => c.id === req.params.id)
  if (!code) return res.status(404).send('<h2>QR code not found</h2>')
  code.scans = (code.scans || 0) + 1
  code.lastScanned = new Date().toISOString()
  await saveData(codes)
  res.setHeader('Location', code.destination)
  res.status(302).end()
})

// Auth
app.post('/api/auth/login', (req, res) => {
  if (req.body.password === PASSWORD) res.json({ token: PASSWORD })
  else res.status(401).json({ error: 'Wrong password' })
})

// CRUD
app.get('/api/qr-codes', auth, async (req, res) => res.json(await readData()))

app.post('/api/qr-codes', auth, async (req, res) => {
  const { name, destination } = req.body
  if (!name || !destination) return res.status(400).json({ error: 'name and destination required' })
  const codes = await readData()
  const entry = {
    id: randomBytes(4).toString('hex'),
    name, destination,
    scans: 0,
    createdAt: new Date().toISOString(),
    lastScanned: null,
  }
  codes.unshift(entry)
  await saveData(codes)
  res.status(201).json(entry)
})

app.put('/api/qr-codes/:id', auth, async (req, res) => {
  const codes = await readData()
  const i = codes.findIndex(c => c.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Not found' })
  const { name, destination } = req.body
  if (name !== undefined) codes[i].name = name
  if (destination !== undefined) codes[i].destination = destination
  codes[i].updatedAt = new Date().toISOString()
  await saveData(codes)
  res.json(codes[i])
})

app.delete('/api/qr-codes/:id', auth, async (req, res) => {
  await saveData((await readData()).filter(c => c.id !== req.params.id))
  res.json({ success: true })
})

export default app
