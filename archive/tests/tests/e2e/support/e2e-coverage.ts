import fs from 'node:fs/promises'
import type { Profiler } from 'node:inspector'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { SourceMapInput } from '@jridgewell/trace-mapping'
import type { CoverageMapData } from 'istanbul-lib-coverage'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const v8ToIstanbul =
  require('v8-to-istanbul') as typeof import('v8-to-istanbul')

const sourceExtensions = new Set(['.ts', '.tsx'])
const excludedSourcePatterns = [
  /(?:^|[/\\])src[/\\]types[/\\]api-schema\.ts$/,
  /(?:^|[/\\])src[/\\]views[/\\]auth[/\\]InitialSetup[A-Z][^/\\]*\.tsx$/,
  /(?:^|[/\\])src[/\\]views[/\\]auth[/\\]useInitialSetupState\.ts$/,
  /\.d\.ts$/,
  /\.spec\.tsx?$/,
  /\.test\.tsx?$/,
  /(?:^|[/\\])__tests__[/\\]/,
  /(?:^|[/\\])src[/\\]test[/\\]/,
]

export interface V8CoverageEntry {
  url: string
  scriptId: string
  source?: string
  functions: Profiler.FunctionCoverage[]
}

function stripGeneratedSourceMap(code: string) {
  return code.replace(/\/\/# sourceMappingURL=.*$/gm, '').trim()
}

function stripComments(code: string) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

function hasRuntimeCode(code: string) {
  return (
    stripComments(stripGeneratedSourceMap(code))
      .replace(/^export\s*\{\s*\};?$/m, '')
      .trim().length > 0
  )
}

function transpileSourceForCoverage(filePath: string, source: string) {
  const result = ts.transpileModule(source, {
    fileName: filePath,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      sourceMap: true,
      target: ts.ScriptTarget.ES2023,
    },
  })

  if (!hasRuntimeCode(result.outputText)) {
    return null
  }

  return {
    source: result.outputText,
    sourceMap: JSON.parse(result.sourceMapText || '{}') as SourceMapInput,
  }
}

function normalizePathForCoverage(
  filePath: string,
  projectRoot = process.cwd(),
) {
  return path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(projectRoot, filePath)
}

export function isProductionSourceFile(filePath: string) {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const extension = path.extname(normalizedPath)

  if (!sourceExtensions.has(extension)) {
    return false
  }

  return !excludedSourcePatterns.some((pattern) => pattern.test(normalizedPath))
}

export function normalizeCoverageMapData(
  coverage: CoverageMapData,
  projectRoot = process.cwd(),
) {
  const normalized: CoverageMapData = {}

  for (const [filePath, fileCoverage] of Object.entries(coverage)) {
    const normalizedPath = normalizePathForCoverage(filePath, projectRoot)
    const mutableCoverage = fileCoverage
    mutableCoverage.path = normalizedPath

    if (isProductionSourceFile(normalizedPath)) {
      normalized[normalizedPath] = mutableCoverage
    }
  }

  return normalized
}

export async function createZeroCoverageForSourceFile(filePath: string) {
  const source = await fs.readFile(filePath, 'utf8')
  const transpiled = transpileSourceForCoverage(filePath, source)

  if (!transpiled) {
    return {}
  }

  const converter = v8ToIstanbul(filePath, 0, {
    originalSource: source,
    source: transpiled.source,
    sourceMap: { sourcemap: transpiled.sourceMap },
  })
  await converter.load()
  const coverage = normalizeCoverageMapData(converter.toIstanbul())

  for (const fileCoverage of Object.values(coverage)) {
    for (const key of Object.keys(fileCoverage.s)) {
      fileCoverage.s[key] = 0
    }
    for (const key of Object.keys(fileCoverage.f)) {
      fileCoverage.f[key] = 0
    }
    for (const branchHits of Object.values(fileCoverage.b)) {
      branchHits.fill(0)
    }
  }

  return coverage
}

export function filePathFromCoverageUrl(
  url: string,
  projectRoot = process.cwd(),
) {
  if (url.startsWith('file://')) {
    return decodeURIComponent(new URL(url).pathname)
  }

  if (url.startsWith('/')) {
    return normalizePathForCoverage(url, projectRoot)
  }

  try {
    const parsedUrl = new URL(url)
    const pathname = decodeURIComponent(parsedUrl.pathname)

    if (pathname.startsWith('/@fs/')) {
      return pathname.slice('/@fs'.length)
    }

    if (pathname.startsWith('/src/')) {
      return path.join(projectRoot, pathname.slice(1))
    }
  } catch {
    return null
  }

  return null
}

export async function convertV8CoverageEntry(
  entry: V8CoverageEntry,
  projectRoot = process.cwd(),
) {
  const filePath = filePathFromCoverageUrl(entry.url, projectRoot)
  if (!filePath || !entry.source || !isProductionSourceFile(filePath)) {
    return null
  }

  const converter = v8ToIstanbul(filePath, 0, { source: entry.source })
  await converter.load()
  converter.applyCoverage(entry.functions)
  return normalizeCoverageMapData(converter.toIstanbul(), projectRoot)
}

export async function findProductionSourceFiles(sourceRoot: string) {
  const files: string[] = []
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(sourceRoot, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await findProductionSourceFiles(entryPath)))
      continue
    }

    if (entry.isFile() && isProductionSourceFile(entryPath)) {
      files.push(entryPath)
    }
  }

  return files.sort()
}

export async function createUnloadedSourceCoverage(
  sourceRoot: string,
  loadedFiles: Set<string>,
) {
  const coverageMaps: CoverageMapData[] = []
  const sourceFiles = await findProductionSourceFiles(sourceRoot)

  for (const sourceFile of sourceFiles) {
    if (!loadedFiles.has(sourceFile)) {
      coverageMaps.push(await createZeroCoverageForSourceFile(sourceFile))
    }
  }

  return coverageMaps
}
