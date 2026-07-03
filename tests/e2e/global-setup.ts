import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE_URL =
  process.env.E2E_API_BASE_URL || 'http://127.0.0.1:11211/api'
const BACKEND_HEALTH_TIMEOUT_MS = Number(
  process.env.E2E_BACKEND_HEALTH_TIMEOUT_MS || 180_000,
)
const BACKEND_HEALTH_INTERVAL_MS = 1_000

function isRealBackendMode() {
  return process.env.E2E_BACKEND_MODE !== 'mock'
}

function backendHealthUrl() {
  return `${API_BASE_URL.replace(/\/+$/, '')}/health`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForRealBackend() {
  const url = backendHealthUrl()
  const startedAt = Date.now()
  let lastError = ''

  while (Date.now() - startedAt < BACKEND_HEALTH_TIMEOUT_MS) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2_000)

    try {
      const response = await fetch(url, { signal: controller.signal })
      if (response.ok) {
        return
      }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    } finally {
      clearTimeout(timeout)
    }

    await sleep(BACKEND_HEALTH_INTERVAL_MS)
  }

  throw new Error(`真实后端未就绪: ${url}${lastError ? ` (${lastError})` : ''}`)
}

export default async function globalSetup() {
  if (isRealBackendMode()) {
    await waitForRealBackend()
  }

  if (process.env.E2E_COVERAGE !== '1') {
    return
  }

  if (process.env.E2E_COVERAGE_PRESERVE_RAW === '1') {
    return
  }

  await fs.rm(path.resolve(process.cwd(), '.playwright/e2e-coverage'), {
    force: true,
    recursive: true,
  })
}
