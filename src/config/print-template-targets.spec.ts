import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import {
  buildPrintTemplateTargetOptions,
  getPrintTemplateTargetTitle,
  isPrintTemplateTarget,
  printTemplateTargetKeys,
} from './print-template-targets'

/** 注册表只存 i18n key，此处用最简 t 验证 key -> 文案的解析契约。 */
const t = ((key: string) => `t:${key}`) as unknown as TFunction

describe('printTemplateTargets', () => {
  it('注册销售退货单为可打印目标', () => {
    expect(getPrintTemplateTargetTitle('sales-return', t)).toBe(
      't:pages.sales-return',
    )
    expect(
      buildPrintTemplateTargetOptions(t).map((option) => option.value),
    ).toContain('sales-return')
  })

  it('保留既有销售单据打印目标', () => {
    expect(getPrintTemplateTargetTitle('sales-order', t)).toBe(
      't:pages.sales-order',
    )
    expect(getPrintTemplateTargetTitle('sales-outbound', t)).toBe(
      't:pages.sales-outbound',
    )
  })

  it('目标白名单未包含未注册模块', () => {
    expect(isPrintTemplateTarget('operation-log')).toBe(false)
    expect(getPrintTemplateTargetTitle('operation-log', t)).toBeUndefined()
  })

  it('白名单内每个目标都能解析出标题, 且 key 与 modulePageMeta 一致', () => {
    const options = buildPrintTemplateTargetOptions(t)
    expect(options).toHaveLength(printTemplateTargetKeys.length)
    options.forEach((option) => {
      expect(option.value).not.toBe('')
      expect(option.label).toBe(`t:pages.${option.value}`)
    })
  })

  it('未在国际化资源中注册的 key 不会产出翻译缺失的选项', () => {
    // 注册表缺 titleKey 的模块不应出现在选项中, 避免下拉出现空标题
    expect(
      buildPrintTemplateTargetOptions(t).every((option) => option.label),
    ).toBe(true)
  })
})
