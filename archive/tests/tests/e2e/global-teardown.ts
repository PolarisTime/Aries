import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import type {
  CoverageMap,
  CoverageMapData,
  CoverageSummaryData,
} from 'istanbul-lib-coverage'
import type libReportType from 'istanbul-lib-report'
import type reportsType from 'istanbul-reports'
import {
  convertV8CoverageEntry,
  createZeroCoverageForSourceFile,
  findProductionSourceFiles,
  type V8CoverageEntry,
} from './support/e2e-coverage'

const require = createRequire(import.meta.url)
const { createCoverageMap } =
  require('istanbul-lib-coverage') as typeof import('istanbul-lib-coverage')
const libReport = require('istanbul-lib-report') as typeof libReportType
const reports = require('istanbul-reports') as typeof reportsType

const projectRoot = process.cwd()
const coverageRoot = path.resolve(projectRoot, '.playwright/e2e-coverage')
const rawCoverageDir = path.join(coverageRoot, 'raw')
const reportDir = path.resolve(projectRoot, 'coverage-e2e')
const coverageMetrics = [
  'statements',
  'branches',
  'functions',
  'lines',
] as const

type CoverageMetric = (typeof coverageMetrics)[number]
type CoverageThresholds = Partial<Record<CoverageMetric, number>>

async function readRawCoverageFiles() {
  let files: string[]
  try {
    files = await fs.readdir(rawCoverageDir)
  } catch {
    return []
  }

  return files
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => path.join(rawCoverageDir, file))
}

function mergeCoverage(
  coverageMap: CoverageMap,
  coverage: CoverageMapData,
  loadedFiles?: Set<string>,
) {
  coverageMap.merge(coverage)

  if (!loadedFiles) {
    return
  }

  for (const filePath of Object.keys(coverage)) {
    loadedFiles.add(filePath)
  }
}

async function mergeRawCoverage(
  coverageMap: CoverageMap,
  loadedFiles: Set<string>,
) {
  for (const file of await readRawCoverageFiles()) {
    const raw = await fs.readFile(file, 'utf8')
    const entries = JSON.parse(raw) as V8CoverageEntry[]

    for (const entry of entries) {
      const coverage = await convertV8CoverageEntry(entry, projectRoot)
      if (coverage) {
        mergeCoverage(coverageMap, coverage, loadedFiles)
      }
    }
  }
}

async function mergeUnloadedSourceCoverage(
  coverageMap: CoverageMap,
  loadedFiles: Set<string>,
) {
  const sourceFiles = await findProductionSourceFiles(
    path.resolve(projectRoot, 'src'),
  )

  for (const sourceFile of sourceFiles) {
    if (!loadedFiles.has(sourceFile)) {
      mergeCoverage(
        coverageMap,
        await createZeroCoverageForSourceFile(sourceFile),
      )
    }
  }
}

function writeReports(coverageMap: CoverageMap) {
  const context = libReport.createContext({
    coverageMap,
    dir: reportDir,
    defaultSummarizer: 'pkg',
  })

  for (const reportName of [
    'text',
    'html',
    'lcovonly',
    'json-summary',
  ] as const) {
    reports.create(reportName, { projectRoot }).execute(context)
  }
}

function printSummary(coverageMap: CoverageMap) {
  const summary = coverageMap.getCoverageSummary().toJSON()

  console.log('\nE2E V8/Istanbul coverage summary:')
  console.log(
    `  Statements: ${summary.statements.pct}% (${summary.statements.covered}/${summary.statements.total})`,
  )
  console.log(
    `  Branches:   ${summary.branches.pct}% (${summary.branches.covered}/${summary.branches.total})`,
  )
  console.log(
    `  Functions:  ${summary.functions.pct}% (${summary.functions.covered}/${summary.functions.total})`,
  )
  console.log(
    `  Lines:      ${summary.lines.pct}% (${summary.lines.covered}/${summary.lines.total})`,
  )
  console.log(
    `  HTML:       ${path.relative(projectRoot, reportDir)}/index.html`,
  )
}

function parseCoverageThreshold(value: string | undefined, name: string) {
  if (value == null || value.trim() === '') {
    return undefined
  }

  const threshold = Number(value)
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error(`${name} 必须是 0 到 100 之间的覆盖率百分比`)
  }

  return threshold
}

function resolveCoverageThresholds() {
  const sharedThreshold = parseCoverageThreshold(
    process.env.E2E_COVERAGE_MIN,
    'E2E_COVERAGE_MIN',
  )
  const thresholds: CoverageThresholds = {}

  for (const metric of coverageMetrics) {
    const envName = `E2E_COVERAGE_MIN_${metric.toUpperCase()}`
    const metricThreshold = parseCoverageThreshold(
      process.env[envName],
      envName,
    )
    const threshold = metricThreshold ?? sharedThreshold
    if (threshold !== undefined) {
      thresholds[metric] = threshold
    }
  }

  return thresholds
}

function assertCoverageThresholds(summary: CoverageSummaryData) {
  const thresholds = resolveCoverageThresholds()
  const configuredMetrics = coverageMetrics.filter(
    (metric) => thresholds[metric] !== undefined,
  )

  if (configuredMetrics.length === 0) {
    return
  }

  console.log('\nE2E V8/Istanbul coverage thresholds:')
  const failures: string[] = []

  for (const metric of configuredMetrics) {
    const threshold = thresholds[metric]
    if (threshold === undefined) {
      continue
    }

    const actual = summary[metric].pct
    console.log(`  ${metric}: ${actual}% / ${threshold}%`)
    if (actual < threshold) {
      failures.push(`${metric} ${actual}% < ${threshold}%`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`E2E 覆盖率未达到门禁: ${failures.join(', ')}`)
  }
}

export default async function globalTeardown() {
  if (process.env.E2E_COVERAGE !== '1') {
    return
  }

  const coverageMap = createCoverageMap()
  const loadedFiles = new Set<string>()

  await mergeRawCoverage(coverageMap, loadedFiles)
  await mergeUnloadedSourceCoverage(coverageMap, loadedFiles)

  await fs.rm(reportDir, { force: true, recursive: true })
  await fs.mkdir(reportDir, { recursive: true })
  await fs.writeFile(
    path.join(reportDir, 'coverage-final.json'),
    JSON.stringify(coverageMap.toJSON()),
  )

  writeReports(coverageMap)
  printSummary(coverageMap)
  assertCoverageThresholds(coverageMap.getCoverageSummary().toJSON())
}
