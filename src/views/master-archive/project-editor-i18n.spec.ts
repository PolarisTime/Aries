import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { enUS } from '@/locales/en-US'
import { zhCN } from '@/locales/zh-CN'

/**
 * 主数据弹层 i18n key 完整性回归。
 *
 * <p>背景：`ProjectEditorOverlay.tsx` 的必填校验直接用裸 key
 * `modules.pages.project.{projectNameRequired,customerRequired,settlementCompanyRequired}`，
 * 三个 key 在 `zh-CN`/`en-US` 里都不存在。i18n key 写错既不会在编译期报错，也不会在运行时抛异常，
 * 界面只是把 key 原文（`modules.pages.project.projectNameRequired`）当文案显示，
 * 用户看到必填提示是整串英文 key。</p>
 *
 * <p>因此这里不针对单个 key 断言，而是**遍历本目录全部源码里的 `t('...')` 字面量**，
 * 逐个校验中英文资源都存在；新增字段时漏补 key 会直接让本用例失败，而不是等上线后由用户发现。</p>
 */

const LOCALES: Record<string, unknown> = { 'zh-CN': zhCN, 'en-US': enUS }

function readByPath(root: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[segment]
    }
    return undefined
  }, root)
}

function sourceFiles(dir: string, collected: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      sourceFiles(path, collected)
      continue
    }
    if (/\.tsx?$/.test(entry) && !/\.(spec|test)\.tsx?$/.test(entry)) {
      collected.push(path)
    }
  }
  return collected
}

const MASTER_ARCHIVE_DIR = fileURLToPath(new URL('.', import.meta.url))

/** 本目录源码里出现的全部 `t('字面量 key')`。 */
function collectLiteralKeys(): Array<{ key: string; file: string }> {
  const found: Array<{ key: string; file: string }> = []
  for (const file of sourceFiles(MASTER_ARCHIVE_DIR)) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/\bt\(\s*'([^']+)'/g)) {
      found.push({ key: match[1], file })
    }
  }
  return found
}

describe('主数据弹层 i18n key 完整性', () => {
  it('目录内所有 t() 字面量 key 在中英文资源里都存在', () => {
    const missing = collectLiteralKeys().flatMap(({ key, file }) =>
      Object.keys(LOCALES)
        .filter((locale) => readByPath(LOCALES[locale], key) === undefined)
        .map((locale) => `${locale} 缺少 ${key}（${file}）`),
    )

    expect(missing).toEqual([])
  })

  it('项目弹层必填提示解析为中文/英文文案而非 key 原文', () => {
    const keys = [
      'modules.pages.project.projectNameRequired',
      'modules.pages.project.customerRequired',
      'modules.pages.project.settlementCompanyRequired',
    ]

    for (const key of keys) {
      const zh = readByPath(zhCN, key)
      const en = readByPath(enUS, key)

      expect(typeof zh, `${key} 中文资源缺失`).toBe('string')
      expect(typeof en, `${key} 英文资源缺失`).toBe('string')
      // 界面文案退化成 key 原文（或 key 尾段）正是本次事故的表现，必须钉死。
      expect(zh).not.toBe(key)
      expect(en).not.toBe(key)
      expect(zh).not.toContain('Required')
      expect(en).not.toContain('modules.pages')
      expect(zh).not.toBe(en)
      expect(String(zh).length).toBeGreaterThan(0)
      expect(String(en).length).toBeGreaterThan(0)
    }
  })

  it('扫描范围本身有效（否则用例会假绿）', () => {
    const keys = collectLiteralKeys()

    expect(keys.length).toBeGreaterThan(30)
    expect(keys.map((entry) => entry.key)).toContain(
      'modules.pages.project.projectNameRequired',
    )
  })
})
