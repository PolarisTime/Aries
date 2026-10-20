#!/usr/bin/env node
/**
 * 增量测试包装器（本地开发用，CI 仍跑全量 `pnpm test`）。
 *
 * 只做两件事，都是 vitest 5.0.1 自身不做、但会让「增量」变成「假全绿」的地方：
 *
 * 1. 0 个测试文件一律以非 0 退出。vitest 在 `--changed` 下会强制
 *    `passWithNoTests ??= true`（vitest/dist/chunks/index.DzobfTyw.js），
 *    于是「没有受影响测试」会打印 "No test files found, exiting with code 0"
 *    并退出 0 —— 在 `pnpm test:changed && git commit` 这类链式命令里与全绿无法区分。
 *    这里显式传 `--no-passWithNoTests`，并再扫一遍输出做兜底：只要出现
 *    "No test files found"，即使子进程退出 0 也改为非 0，并打印原因。
 *
 * 2. 把实际执行的 vitest 命令、比较基准和「结果不代表全量」的提醒打到日志里，
 *    避免把增量绿误读成全部用例通过。
 *
 * 用法（由 package.json scripts 调用）：
 *   node scripts/test/incremental.mjs changed              # 未提交改动（含 untracked）
 *   node scripts/test/incremental.mjs changed origin/main  # 与某个 git ref 比较（含未提交）
 *   node scripts/test/incremental.mjs related <file...>    # 指定文件的导入方（related）
 *
 * 额外参数原样透传给 vitest（例如 `pnpm test:related src/a.tsx --reporter=dot`）。
 *
 * `vitest related` 需要至少一个文件参数：缺省时直接报用法并以 2 退出，
 * 不做「无参数 = 全量/空跑」的隐式行为。
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)

const NO_TEST_FILES_MARKER = 'No test files found'

/** 打印一行带统一前缀的提示（stderr，避免污染 vitest 的 stdout 报告）。 */
function note(message) {
  process.stderr.write(`[test:incremental] ${message}\n`)
}

function fail(message) {
  note(message)
  process.exit(2)
}

function parseChangedArgs(args) {
  let since
  const passthrough = []
  for (const arg of args) {
    if (since === undefined && !arg.startsWith('-')) {
      since = arg
      continue
    }
    passthrough.push(arg)
  }
  return { since, passthrough }
}

function buildInvocation(mode, args) {
  if (mode === 'changed') {
    const { since, passthrough } = parseChangedArgs(args)
    const changedArgs = ['run', '--changed']
    if (since) {
      changedArgs.push(since)
    }
    changedArgs.push('--no-passWithNoTests', ...passthrough)
    return {
      vitestArgs: changedArgs,
      summary:
        `受影响测试（相对 ${since ?? '未提交改动，含 untracked'}）` +
        '——只覆盖 import 依赖图命中的文件，不等于全量通过',
    }
  }

  if (mode === 'related') {
    const hasFileFilter = args.some((arg) => !arg.startsWith('-'))
    if (!hasFileFilter) {
      fail(
        '用法: pnpm test:related <文件路径...> [vitest 参数]，至少需要一个文件参数。',
      )
    }
    return {
      vitestArgs: ['related', '--run', '--no-passWithNoTests', ...args],
      summary: 'related 测试——只覆盖直接/间接 import 了指定文件的测试',
    }
  }

  return fail(`未知模式: ${mode ?? '(空)'}，可选 changed | related`)
}

const mode = process.argv[2]
const invocation = buildInvocation(mode, process.argv.slice(3))

note(`模式: ${mode}；${invocation.summary}`)
note(
  `执行: pnpm exec vitest ${invocation.vitestArgs.join(' ')}` +
    `（cwd: ${repoRoot}）`,
)

const child = spawn('pnpm', ['exec', 'vitest', ...invocation.vitestArgs], {
  cwd: repoRoot,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
})

// 只保留输出尾巴用于识别 "No test files found"，不缓存整份报告。
const TAIL_LIMIT = 64 * 1024
let outputTail = ''

function relay(chunk, stream) {
  outputTail = (outputTail + chunk.toString()).slice(-TAIL_LIMIT)
  stream.write(chunk)
}

child.stdout.on('data', (chunk) => relay(chunk, process.stdout))
child.stderr.on('data', (chunk) => relay(chunk, process.stderr))

child.on('error', (error) => {
  note(`无法启动 vitest: ${error.message}`)
  process.exit(1)
})

child.on('close', (code, signal) => {
  if (signal) {
    note(`vitest 被信号终止: ${signal}`)
    process.exit(code ?? 1)
  }

  const zeroSelected = outputTail.includes(NO_TEST_FILES_MARKER)
  if (zeroSelected) {
    note('⚠ 本次没有选中任何测试文件（0 个）。')
    note(
      '⚠ 这不等于通过：增量命令没跑到任何用例，改动可能与测试无关，' +
        '也可能漏掉了动态 import/全局 setup 这类依赖图看不到的关系。',
    )
    note(
      '⚠ 需要合入判断时请跑全量 `pnpm test`；' +
        '确实想以 0 测试通过时用 `pnpm exec vitest run --changed --passWithNoTests`。',
    )
  }

  process.exit(code === 0 && zeroSelected ? 1 : (code ?? 1))
})
