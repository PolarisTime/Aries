import fs from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'

/**
 * 每轮 Playwright 运行的产物目录解析与写入。
 *
 * <p>官方语义是「每次 run 启动即清空 outputDir（默认 `test-results`）」
 * （playwright/types/test.d.ts: testProject.outputDir — "This directory is cleaned
 * at the start."）。同一个 checkout 并发跑两次 e2e 时，后启动的 run 会把先启动那次的
 * 产物整目录删掉，表现为运行中读文件报 ENOENT（实测：material-versioning 的 xlsx 夹具、
 * material-import-preview-overflow 的 CSV 夹具都中招）。</p>
 *
 * <p>因此 outputDir 按 run 派生：默认 `test-results/run-<pid>-<启动时间戳>`；
 * 设置 `E2E_OUTPUT_DIR` 时以它为根目录，再追加同一个 run 子目录。这样两轮 run 各有独立
 * 目录，谁也不需要 `os.tmpdir()` 或 `preserveOutput` 去绕开/伪装清理。</p>
 */

/** 未设置 `E2E_OUTPUT_DIR` 时的输出根目录（Playwright 默认值）。 */
export const DEFAULT_OUTPUT_ROOT = 'test-results'

/** run 子目录前缀；config 级用例据此断言 outputDir 已按 run 派生。 */
export const RUN_DIR_PREFIX = 'run-'

/** 匹配 `run-<pid>-<启动时间戳>` 的目录名。 */
export const RUN_DIR_NAME_PATTERN = /^run-\d+-\d+$/

/**
 * config 已解析出的本轮输出目录（绝对路径）。Playwright 的 worker 进程会重新执行
 * config 文件，若每个进程各算一次 pid + 时间戳，runner 与 worker 就会指向不同目录；
 * config 在主进程算好后写入该变量，worker 继承后复用同一目录。属于内部变量，
 * 请勿手工设置（设置它等价于手工指定本轮目录，隔离责任随之转移给调用方）。
 */
export const RESOLVED_OUTPUT_DIR_ENV = 'E2E_RUN_OUTPUT_DIR'

export interface RunIdentity {
  pid: number
  startedAt: number
}

/** run 子目录名：`run-<pid>-<启动时间戳>`，并发 run 之间互不相同。 */
export function runDirName(identity: RunIdentity): string {
  return `${RUN_DIR_PREFIX}${identity.pid}-${identity.startedAt}`
}

/**
 * 解析本轮 run 的输出目录。
 *
 * @param env 默认 `process.env`
 * @param identity 默认取当前进程 pid 与当前时间戳
 */
export function resolveRunOutputDir(
  env: NodeJS.ProcessEnv = process.env,
  identity: RunIdentity = { pid: process.pid, startedAt: Date.now() },
): string {
  const resolved = env[RESOLVED_OUTPUT_DIR_ENV]?.trim()
  if (resolved) {
    return resolved
  }

  const root = env.E2E_OUTPUT_DIR?.trim() || DEFAULT_OUTPUT_ROOT
  return path.join(root, runDirName(identity))
}

/**
 * 本轮 run 目录内的夹具路径。`testInfo.outputPath()` 落在 outputDir 之下，而 outputDir
 * 已按 run 派生，所以并发 run 不会互相清理。
 */
export function runFixturePath(testInfo: TestInfo, fileName: string): string {
  return testInfo.outputPath('fixtures', fileName)
}

/** 写入本轮 run 目录内的夹具，返回其绝对路径。 */
export async function writeRunFixture(
  testInfo: TestInfo,
  fileName: string,
  content: string,
): Promise<string> {
  const filePath = runFixturePath(testInfo, fileName)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
  return filePath
}

/** 把截图存进本轮 run 目录（供并发 run 与失败重试时留存证据）。 */
export async function captureRunArtifact(
  page: Page,
  testInfo: TestInfo,
  fileName: string,
): Promise<string> {
  const filePath = testInfo.outputPath(fileName)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await page.screenshot({ path: filePath })
  return filePath
}
