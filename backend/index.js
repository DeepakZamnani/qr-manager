import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const PASSWORD = process.env.DASHBOARD_PASSWORD || 'changeme'
const DATA_FILE = join(__dirname, 'data', 'qr-codes.json')

mkdirSync(join(__dirname, 'data'), { recursive: true })

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json())

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (token !== PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

function readData() {
  if (!existsSync(DATA_FILE)) { writeFileSync(DATA_FILE, '[]'); return [] }
  return JSON.parse(readFileSync(DATA_FILE, 'utf8'))
}

function save(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// Public: QR redirect
app.get('/r/:id', (req, res) => {
  const codes = readData()
  const code = codes.find(c => c.id === req.params.id)
  if (!code) return res.status(404).send('<h2>QR code not found</h2>')
  code.scans = (code.scans || 0) + 1
  code.lastScanned = new Date().toISOString()
  save(codes)
  res.redirect(302, code.destination)
})

// Auth
app.post('/api/auth/login', (req, res) => {
  if (req.body.password === PASSWORD) res.json({ token: PASSWORD })
  else res.status(401).json({ error: 'Wrong password' })
})

// CRUD (protected)
app.get('/api/qr-codes', auth, (req, res) => res.json(readData()))

app.post('/api/qr-codes', auth, (req, res) => {
  const { name, destination } = req.body
  if (!name || !destination) return res.status(400).json({ error: 'name and destination required' })
  const codes = readData()
  const entry = {
    id: randomBytes(4).toString('hex'),
    name,
    destination,
    scans: 0,
    createdAt: new Date().toISOString(),
    lastScanned: null,
  }
  codes.unshift(entry)
  save(codes)
  res.status(201).json(entry)
})

app.put('/api/qr-codes/:id', auth, (req, res) => {
  const codes = readData()
  const i = codes.findIndex(c => c.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Not found' })
  const { name, destination } = req.body
  if (name !== undefined) codes[i].name = name
  if (destination !== undefined) codes[i].destination = destination
  codes[i].updatedAt = new Date().toISOString()
  save(codes)
  res.json(codes[i])
})

app.delete('/api/qr-codes/:id', auth, (req, res) => {
  save(readData().filter(c => c.id !== req.params.id))
  res.json({ success: true })
})

app.listen(PORT, () => console.log(`Backend: http://localhost:${PORT}`))
