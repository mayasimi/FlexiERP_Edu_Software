import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import { after, before, test } from 'node:test'

const port = 3210
const baseUrl = `http://127.0.0.1:${port}`
let server

async function waitForServer() {
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/chats`)
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error('Next server did not become ready in time.')
}

before(async () => {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm'
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run start -- -p ${port}`]
    : ['run', 'start', '--', '-p', String(port)]

  server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'pipe',
  })

  await waitForServer()
})

after(() => {
  if (!server?.pid) return

  if (process.platform === 'win32') {
    execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: 'ignore' })
    return
  }

  server.kill('SIGTERM')
})

test('chat messages can be listed and sent', async () => {
  const chatsResponse = await fetch(`${baseUrl}/api/chats`)
  assert.equal(chatsResponse.status, 200)

  const chatsPayload = await chatsResponse.json()
  const chatId = chatsPayload.data[0].id

  const sendResponse = await fetch(`${baseUrl}/api/chats/${chatId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: 'Contract test support request' }),
  })
  assert.equal(sendResponse.status, 201)

  const historyResponse = await fetch(`${baseUrl}/api/chats/${chatId}/messages?markRead=true`)
  const historyPayload = await historyResponse.json()
  assert.ok(historyPayload.data.some((message) => message.body === 'Contract test support request'))
})

test('payroll payment can be initiated and verified', async () => {
  const initiateResponse = await fetch(`${baseUrl}/api/payroll/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 125000, staff_ids: ['staff-001'] }),
  })
  assert.equal(initiateResponse.status, 201)

  const initiatePayload = await initiateResponse.json()
  const verifyResponse = await fetch(`${baseUrl}/api/payroll/verify/${initiatePayload.data.reference}`)
  const verifyPayload = await verifyResponse.json()

  assert.equal(verifyResponse.status, 200)
  assert.equal(verifyPayload.data.status, 'successful')
  assert.equal(verifyPayload.data.amount, 125000)
})

test('FIRS tax calculation returns a persisted PAYE-style breakdown', async () => {
  const response = await fetch(`${baseUrl}/api/payroll/calculate-tax`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: 'staff-001', gross_pay: 620000, pension: 45000 }),
  })

  const payload = await response.json()
  assert.equal(response.status, 201)
  assert.ok(payload.data.tax_amount > 0)
  assert.ok(payload.data.taxable_income > 0)
  assert.ok(payload.data.firs_reference.startsWith('FIRS-'))
  assert.ok(payload.data.breakdown.length > 0)
})
