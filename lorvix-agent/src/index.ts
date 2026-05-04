import 'dotenv/config'
import express from 'express'
import cron from 'node-cron'
import { handleIncoming } from './agent'
import { runReminders } from './reminder'

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.use(express.json({ limit: '5mb' }))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: Math.floor(process.uptime()), ts: new Date().toISOString() })
})

// ─── Evolution API webhook ────────────────────────────────────────────────────
app.post('/webhook', (req, res) => {
  // Respond 200 immediately so Evolution doesn't retry
  res.sendStatus(200)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleIncoming(req.body as any).catch((err) => {
    console.error('[webhook] Unhandled error:', err)
  })
})

// ─── Reminders cron — every 30 minutes ───────────────────────────────────────
cron.schedule('*/30 * * * *', () => {
  runReminders().catch((err) => console.error('[reminder] Error:', err))
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[lorvix-agent] Listening on port ${PORT}`)
  console.log(`[lorvix-agent] Webhook endpoint: POST /webhook`)
  // Run reminders once on startup
  runReminders().catch(() => {})
})
