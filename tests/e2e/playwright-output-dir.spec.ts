import fs from 'node:fs/promises'
import path from 'node:path'
import { expect } from '@playwright/test'
import {
  DEFAULT_OUTPUT_ROOT,
  RESOLVED_OUTPUT_DIR_ENV,
  RUN_DIR_NAME_PATTERN,
  resolveRunOutputDir,
  writeRunFixture,
} from './support/run-output'
import { test } from './support/test'

/**
 * config 级用例：锁定 `playwright.config.ts` 的 outputDir 按 run 派生。
 *
 * <p>失效模式：outputDir 退回常量（默认 `test-results`）时，Playwright 每轮 run 启动即
 * 清空该目录，同一 checkout 的并发 run 会互删对方夹具/截图（运行中报 ENOENT）。因此本用例断言
 * 生效目录里含 `run-<pid>-<时间戳>` 段；把 config 改回常量它会立刻变红。</p>
 *
 * <p>默认不启动浏览器（不申请 page fixture），所以在主套件里代价极低；需要复现「并发 run 互删」
 * 时，设置 `E2E_OUTPUT_ISOLATION_WATCH_MS` 让夹具在窗口期内被复查。</p>
 */

test('outputDir 按 run 派生，夹具落在本轮 run 目录内且读回无 ENOENT', async () => {
  const testInfo = test.info()
  // 1) 生效目录必须带 run 标识。testInfo.outputDir 是 Playwright 实际使用的落盘目录，
  //    改回常量 outputDir 时这里找不到 run-<pid>-<ts> 段 → 红。
  const segments = testInfo.outputDir.split(path.sep)
  const runIndex = segments.findIndex((segment) =>
    RUN_DIR_NAME_PATTERN.test(segment),
  )
  expect(
    runIndex,
    `outputDir 未按 run 派生：${testInfo.outputDir}`,
  ).toBeGreaterThan(-1)
  const runDir = segments.slice(0, runIndex + 1).join(path.sep)
  expect(path.basename(runDir)).not.toBe(DEFAULT_OUTPUT_ROOT)
  // worker 与 runner 必须解析到同一目录（config 通过 E2E_RUN_OUTPUT_DIR 透传）
  expect(process.env[RESOLVED_OUTPUT_DIR_ENV]).toBe(runDir)
  await expect(fs.stat(runDir)).resolves.toBeTruthy()

  // 2) 夹具写进本轮 run 目录，并能立刻读回
  const fixtureName = 'run-output-isolation.txt'
  const fixturePath = await writeRunFixture(
    testInfo,
    fixtureName,
    `run=${path.basename(runDir)}`,
  )
  expect(fixturePath.startsWith(`${runDir}${path.sep}`)).toBe(true)
  await expect(fs.readFile(fixturePath, 'utf8')).resolves.toBe(
    `run=${path.basename(runDir)}`,
  )

  // 3) 并发窗口：另一轮 run 若与本轮共用 outputDir，会在此期间把它整目录清掉，
  //    这里的复读就会报 ENOENT。
  const watchMs = Number(process.env.E2E_OUTPUT_ISOLATION_WATCH_MS || 0)
  if (watchMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, watchMs))
    await expect(fs.readFile(fixturePath, 'utf8')).resolves.toBe(
      `run=${path.basename(runDir)}`,
    )
    await expect(fs.stat(runDir)).resolves.toBeTruthy()
  }

  // 便于并发自检脚本从日志里取出两轮 run 的实际目录
  console.log(`[run-output] outputDir=${runDir}`)
})

test('E2E_OUTPUT_DIR 作为根目录，且不同 run 身份派生不同目录', () => {
  const identity = { pid: 4242, startedAt: 1_700_000_000_000 }

  // E2E_OUTPUT_DIR 只换根目录，run 子目录仍在（并发隔离不依赖调用方自律）
  expect(
    resolveRunOutputDir({ E2E_OUTPUT_DIR: 'e2e-artifacts' }, identity),
  ).toBe(path.join('e2e-artifacts', 'run-4242-1700000000000'))

  // 不同 pid / 时间戳 → 不同目录
  expect(resolveRunOutputDir({}, identity)).not.toBe(
    resolveRunOutputDir({}, { pid: 4243, startedAt: 1_700_000_000_001 }),
  )

  // config 透传值优先，保证 worker 复用 runner 的目录
  expect(
    resolveRunOutputDir(
      { [RESOLVED_OUTPUT_DIR_ENV]: '/tmp/e2e-run-1-2' },
      identity,
    ),
  ).toBe('/tmp/e2e-run-1-2')
})
