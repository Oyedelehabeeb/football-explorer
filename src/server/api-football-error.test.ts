import assert from 'node:assert/strict'
import test from 'node:test'

import { apiFootballPayloadError } from './api-football-error.ts'

test('accepts empty provider error containers', () => {
  assert.equal(apiFootballPayloadError(undefined), null)
  assert.equal(apiFootballPayloadError([]), null)
  assert.equal(apiFootballPayloadError({}), null)
})

test('classifies per-minute rate limits with a short cooldown', () => {
  const error = apiFootballPayloadError({ rateLimit: 'Too many requests. Your rate limit is 10 requests per minute.' })
  assert.ok(error)
  assert.equal(error.kind, 'rate-limit')
  assert.equal(error.retryAfterMs, 65_000)
})

test('classifies daily quota exhaustion separately', () => {
  const error = apiFootballPayloadError({ requests: 'Daily request quota reached.' })
  assert.ok(error)
  assert.equal(error.kind, 'rate-limit')
  assert.equal(error.retryAfterMs, 5 * 60_000)
})

test('preserves actionable suspended-account messaging', () => {
  const error = apiFootballPayloadError({ access: 'Your account is suspended, check on the dashboard.' })
  assert.ok(error)
  assert.equal(error.kind, 'provider')
  assert.match(error.message, /suspended/i)
})

test('classifies rejected credentials as configuration errors', () => {
  const error = apiFootballPayloadError({ access: 'Invalid API key.' })
  assert.ok(error)
  assert.equal(error.kind, 'configuration')
  assert.match(error.message, /server environment/i)
})

test('classifies plan restrictions without treating every request error as quota exhaustion', () => {
  assert.equal(apiFootballPayloadError({ plan: 'Free plans do not have access.' })?.kind, 'provider')
  assert.equal(apiFootballPayloadError({ request: 'Malformed request parameter.' })?.kind, 'provider')
})
