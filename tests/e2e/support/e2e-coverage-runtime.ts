import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import type { V8CoverageEntry } from './e2e-coverage'

const rawCoverageDir = path.resolve(
  process.cwd(),
  '.playwright/e2e-coverage/raw',
)

function isE2eCoverageEnabled() {
  return process.env.E2E_COVERAGE === '1'
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '')
}

function coverageFileName(testInfo: TestInfo) {
  const titlePath = testInfo.titlePath.join('-')
  const readableName = sanitizeFileName(titlePath).slice(0, 180) || 'e2e'
  const titleHash = createHash('sha1')
    .update(titlePath)
    .digest('hex')
    .slice(0, 10)

  return `${testInfo.workerIndex}-${testInfo.retry}-${readableName}-${titleHash}.json`
}

export async function startE2eCoverage(page: Page) {
  if (!isE2eCoverageEnabled()) {
    return false
  }

  await page.coverage.startJSCoverage({ resetOnNavigation: false })
  return true
}

export async function stopE2eCoverage(
  page: Page,
  testInfo: TestInfo,
  started: boolean,
) {
  if (!started) {
    return
  }

  const entries = (await page.coverage.stopJSCoverage()) as V8CoverageEntry[]
  await fs.mkdir(rawCoverageDir, { recursive: true })

  await fs.writeFile(
    path.join(rawCoverageDir, coverageFileName(testInfo)),
    JSON.stringify(entries, null, 2),
  )
}
