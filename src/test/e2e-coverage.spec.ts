import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  convertV8CoverageEntry,
  createUnloadedSourceCoverage,
  createZeroCoverageForSourceFile,
  filePathFromCoverageUrl,
  findProductionSourceFiles,
  isProductionSourceFile,
  normalizeCoverageMapData,
} from '../../tests/e2e/support/e2e-coverage'

const tempRoots: string[] = []

async function createTempSourceRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aries-e2e-coverage-'))
  tempRoots.push(root)
  return root
}

describe('e2e coverage helpers', () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots
        .splice(0)
        .map((root) => fs.rm(root, { force: true, recursive: true })),
    )
  })

  it('keeps production source files in the E2E coverage denominator', () => {
    expect(isProductionSourceFile('/repo/src/views/DashboardView.tsx')).toBe(
      true,
    )
    expect(isProductionSourceFile('/repo/src/api/client.ts')).toBe(true)
  })

  it('excludes tests, declarations, and generated API schema from E2E coverage', () => {
    expect(
      isProductionSourceFile('/repo/src/views/DashboardView.spec.tsx'),
    ).toBe(false)
    expect(isProductionSourceFile('/repo/src/types/api-schema.ts')).toBe(false)
    expect(
      isProductionSourceFile('/repo/src/views/auth/InitialSetupView.tsx'),
    ).toBe(false)
    expect(
      isProductionSourceFile('/repo/src/views/auth/useInitialSetupState.ts'),
    ).toBe(false)
    expect(isProductionSourceFile('/repo/src/vite-env.d.ts')).toBe(false)
    expect(isProductionSourceFile('/repo/src/views/__tests__/view.ts')).toBe(
      false,
    )
    expect(isProductionSourceFile('/repo/src/test/probe.tsx')).toBe(false)
    expect(isProductionSourceFile('/repo/src/views/style.css')).toBe(false)
  })

  it('maps Vite-served source URLs back to local source files', () => {
    expect(
      filePathFromCoverageUrl(
        'http://127.0.0.1:3100/src/views/DashboardView.tsx?t=123',
        '/repo',
      ),
    ).toBe('/repo/src/views/DashboardView.tsx')
  })

  it('maps file, absolute, and @fs coverage URLs', () => {
    expect(
      filePathFromCoverageUrl(
        'file:///repo/src/views/%E4%BB%AA%E8%A1%A8.tsx',
        '/repo',
      ),
    ).toBe('/repo/src/views/仪表.tsx')
    expect(
      filePathFromCoverageUrl('/src/views/DashboardView.tsx', '/repo'),
    ).toBe('/src/views/DashboardView.tsx')
    expect(
      filePathFromCoverageUrl(
        'http://127.0.0.1:3100/@fs/repo/src/views/DashboardView.tsx',
        '/repo',
      ),
    ).toBe('/repo/src/views/DashboardView.tsx')
    expect(
      filePathFromCoverageUrl('http://127.0.0.1:3100/assets/index.js', '/repo'),
    ).toBeNull()
    expect(filePathFromCoverageUrl('not a url', '/repo')).toBeNull()
  })

  it('normalizes coverage paths and filters non-production files', () => {
    const productionFile = 'src/views/DashboardView.tsx'
    const specFile = 'src/views/DashboardView.spec.tsx'
    const coverage = normalizeCoverageMapData(
      {
        [productionFile]: {
          path: productionFile,
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
        [specFile]: {
          path: specFile,
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      },
      '/repo',
    )

    expect(Object.keys(coverage)).toEqual(['/repo/src/views/DashboardView.tsx'])
    expect(coverage['/repo/src/views/DashboardView.tsx']?.path).toBe(
      '/repo/src/views/DashboardView.tsx',
    )
  })

  it('returns null for V8 coverage entries that cannot map to production source', async () => {
    await expect(
      convertV8CoverageEntry(
        {
          url: 'not a url',
          scriptId: '1',
          source: 'export const value = 1\n',
          functions: [],
        },
        '/repo',
      ),
    ).resolves.toBeNull()
    await expect(
      convertV8CoverageEntry(
        {
          url: 'http://127.0.0.1:3100/src/views/DashboardView.tsx',
          scriptId: '2',
          functions: [],
        },
        '/repo',
      ),
    ).resolves.toBeNull()
    await expect(
      convertV8CoverageEntry(
        {
          url: 'http://127.0.0.1:3100/src/views/DashboardView.spec.tsx',
          scriptId: '3',
          source: 'export const value = 1\n',
          functions: [],
        },
        '/repo',
      ),
    ).resolves.toBeNull()
  })

  it('converts V8 coverage entries for production source files', async () => {
    const source = 'export const value = 1\n'
    const coverage = await convertV8CoverageEntry(
      {
        url: 'http://127.0.0.1:3100/src/views/DashboardView.tsx',
        scriptId: '4',
        source,
        functions: [
          {
            functionName: '',
            isBlockCoverage: true,
            ranges: [{ startOffset: 0, endOffset: source.length, count: 1 }],
          },
        ],
      },
      '/repo',
    )

    expect(coverage).not.toBeNull()
    expect(Object.keys(coverage ?? {})).toEqual([
      '/repo/src/views/DashboardView.tsx',
    ])
  })

  it('creates zero-hit Istanbul coverage for source files not loaded by E2E', async () => {
    const sourceRoot = await createTempSourceRoot()
    const sourceFile = path.join(sourceRoot, 'unloaded.tsx')
    await fs.writeFile(
      sourceFile,
      [
        'type Props = { enabled: boolean }',
        'export function Unloaded(props: Props) {',
        "  return props.enabled ? 'on' : 'off'",
        '}',
        '',
      ].join('\n'),
    )

    const coverage = await createZeroCoverageForSourceFile(sourceFile)
    const fileCoverage = coverage[sourceFile]

    expect(fileCoverage).toBeDefined()
    expect(fileCoverage?.path).toBe(sourceFile)
    expect(Object.keys(fileCoverage?.statementMap ?? {})).not.toHaveLength(0)
    expect(Object.values(fileCoverage?.s ?? {})).toEqual(
      expect.arrayContaining([0]),
    )
    expect(Object.values(fileCoverage?.s ?? {}).every((hit) => hit === 0)).toBe(
      true,
    )
    expect(Object.values(fileCoverage?.f ?? {}).every((hit) => hit === 0)).toBe(
      true,
    )
    expect(
      Object.values(fileCoverage?.b ?? {})
        .flat()
        .every((hit) => hit === 0),
    ).toBe(true)
  })

  it('zeros statement, function, and branch hits for complex source files', async () => {
    const sourceRoot = await createTempSourceRoot()
    const sourceFile = path.join(sourceRoot, 'complex.ts')
    await fs.writeFile(
      sourceFile,
      [
        'export function pickLabel(enabled: boolean) {',
        "  return enabled ? 'enabled' : 'disabled'",
        '}',
        'export function addOne(value: number) {',
        '  return value + 1',
        '}',
        '',
      ].join('\n'),
    )

    const coverage = await createZeroCoverageForSourceFile(sourceFile)
    const fileCoverage = coverage[sourceFile]

    expect(fileCoverage).toBeDefined()
    expect(Object.values(fileCoverage?.s ?? {}).every((hit) => hit === 0)).toBe(
      true,
    )
    expect(Object.values(fileCoverage?.f ?? {}).every((hit) => hit === 0)).toBe(
      true,
    )
    expect(
      Object.values(fileCoverage?.b ?? {})
        .flat()
        .every((hit) => hit === 0),
    ).toBe(true)
  })

  it('zeros converter function and branch counters when they are present', async () => {
    vi.resetModules()
    vi.doMock('typescript', () => ({
      default: {
        JsxEmit: { ReactJSX: 'react-jsx' },
        ModuleKind: { ESNext: 'esnext' },
        ScriptTarget: { ES2023: 'es2023' },
        transpileModule: vi.fn(() => ({
          outputText: 'export const value = 1\n',
        })),
      },
    }))

    const require = createRequire(import.meta.url)
    const modulePath = require.resolve('v8-to-istanbul')
    const originalModule = require.cache[modulePath]
    const sourceRoot = await createTempSourceRoot()
    const sourceFile = path.join(sourceRoot, 'with-counters.ts')
    const location = {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 22 },
    }
    const converter = {
      load: vi.fn().mockResolvedValue(undefined),
      toIstanbul: vi.fn(() => ({
        [sourceFile]: {
          path: sourceFile,
          statementMap: { 0: location },
          fnMap: { 0: { name: 'value', decl: location, loc: location } },
          branchMap: {
            0: {
              loc: location,
              type: 'cond-expr',
              locations: [location, location],
            },
          },
          s: { 0: 9 },
          f: { 0: 7 },
          b: { 0: [5, 3] },
        },
      })),
    }
    const v8ToIstanbul = vi.fn(() => converter)

    require.cache[modulePath] = {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      exports: v8ToIstanbul,
      children: [],
      paths: [],
    } as NodeJS.Module

    try {
      await fs.writeFile(sourceFile, 'export const value = 1\n')

      const { createZeroCoverageForSourceFile: createZeroCoverage } =
        await import('../../tests/e2e/support/e2e-coverage')
      const coverage = await createZeroCoverage(sourceFile)
      const fileCoverage = coverage[sourceFile]

      expect(v8ToIstanbul).toHaveBeenCalledWith(
        sourceFile,
        0,
        expect.objectContaining({
          sourceMap: { sourcemap: {} },
        }),
      )
      expect(fileCoverage?.s).toEqual({ 0: 0 })
      expect(fileCoverage?.f).toEqual({ 0: 0 })
      expect(fileCoverage?.b).toEqual({ 0: [0, 0] })
    } finally {
      vi.doUnmock('typescript')
      vi.resetModules()
      if (originalModule) {
        require.cache[modulePath] = originalModule
      } else {
        delete require.cache[modulePath]
      }
    }
  })

  it('does not count comment-only type modules in the E2E coverage denominator', async () => {
    const sourceRoot = await createTempSourceRoot()
    const sourceFile = path.join(sourceRoot, 'types-only.ts')
    await fs.writeFile(
      sourceFile,
      [
        '/** Shared API contract types. */',
        'export type ApiRecord = {',
        '  id?: string | number',
        '  [key: string]: unknown',
        '}',
        '',
      ].join('\n'),
    )

    await expect(createZeroCoverageForSourceFile(sourceFile)).resolves.toEqual(
      {},
    )
  })

  it('finds production source files recursively and skips excluded files', async () => {
    const sourceRoot = await createTempSourceRoot()
    const viewDir = path.join(sourceRoot, 'views')
    const testDir = path.join(viewDir, '__tests__')
    await fs.mkdir(testDir, { recursive: true })
    const viewFile = path.join(viewDir, 'DashboardView.tsx')
    const helperFile = path.join(sourceRoot, 'helper.ts')
    await fs.writeFile(viewFile, 'export const view = 1\n')
    await fs.writeFile(helperFile, 'export const helper = 1\n')
    await fs.writeFile(path.join(testDir, 'DashboardView.tsx'), 'export {}\n')
    await fs.writeFile(path.join(sourceRoot, 'style.css'), '.x {}\n')

    await expect(findProductionSourceFiles(sourceRoot)).resolves.toEqual([
      helperFile,
      viewFile,
    ])
  })

  it('creates zero coverage only for unloaded production source files', async () => {
    const sourceRoot = await createTempSourceRoot()
    const loadedFile = path.join(sourceRoot, 'loaded.ts')
    const unloadedFile = path.join(sourceRoot, 'unloaded.ts')
    await fs.writeFile(loadedFile, 'export const loaded = 1\n')
    await fs.writeFile(unloadedFile, 'export const unloaded = 2\n')

    const coverageMaps = await createUnloadedSourceCoverage(
      sourceRoot,
      new Set([loadedFile]),
    )

    expect(coverageMaps).toHaveLength(1)
    expect(Object.keys(coverageMaps[0] ?? {})).toEqual([unloadedFile])
  })
})
