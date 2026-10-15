import i18next from 'i18next'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { statementPageConfigs } from '@/config/business-pages/finance/statement-pages'
import { freightOperationsPageConfigs } from '@/config/business-pages/operations/freight-operations'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import type { StatusChangeActionKind } from '@/module-system/adapter/module-adapter-actions'
import {
  resolveSaveResultActions,
  resolveSaveResultSubtitle,
  resolveSaveResultTitle,
} from '@/views/modules/components/save-result-overlay-utils'
import type { SubmissionAction } from '@/views/modules/module-editor-workspace-support'

/**
 * 保存回执按「从哪来 + 单据变成什么状态」区分的回归。
 *
 * <p>背景：草稿保存、保存并审核、核定并完成销售三种动作在回执里标题与按钮完全一样
 * （都是「{{title}}保存成功」+ 同一组按钮），用户无法判断自己刚才只是存了草稿还是提交了审核；
 * 草稿回执还会出现「创建下一模块」——下游单据无法关联一张尚未生效的草稿。</p>
 *
 * <p>红验证：① 把 resolveSaveResultTitle 退回「成功一律 pageSuccess」；② 把「保存并审核」的
 * 动作词退回硬编码「提交审核」（客户对账单用例）；③ 把 resolveSaveResultActions 退回
 * 「成功一律给全量按钮」——三者任一都会让本文件变红。</p>
 */

const config = salesOrdersPageConfig
const customerStatementConfig = statementPageConfigs['customer-statement']

const title = (
  action: SubmissionAction | undefined,
  options: {
    auditActionKind?: StatusChangeActionKind
    config?: typeof config
    documentNo?: string
  } = {},
) =>
  String(
    resolveSaveResultTitle({
      config: options.config ?? config,
      isConflict: false,
      isSuccess: true,
      t: i18next.t,
      action,
      auditActionKind: options.auditActionKind,
      documentNo: options.documentNo ?? 'SO20261014001',
    }),
  )

describe('保存回执标题按动作与结果状态区分', () => {
  it('草稿保存：标题写明「已保存为草稿」并带单号', () => {
    const text = title('save')
    expect(text).toContain('已保存为草稿')
    expect(text).toContain('SO20261014001')
    expect(text).not.toContain('提交审核')
  })

  it('保存并审核：标题写明「已保存并审核」', () => {
    const text = title('save-and-audit')
    expect(text).toContain('已保存并审核')
    expect(text).toContain('SO20261014001')
    expect(text).not.toContain('已保存为草稿')
  })

  it('核定并完成销售：标题写明「已核定并完成销售」（不是「提交审核」）', () => {
    const text = title('save-and-complete')
    expect(text).toContain('已核定并完成销售')
    expect(text).not.toContain('提交审核')
    expect(text).not.toContain('已保存并审核')
  })

  it('客户对账单（按钮是「保存并确认」）：标题写「已保存并确认」，不得写「提交审核」', () => {
    const text = title('save-and-audit', {
      auditActionKind: 'confirm',
      config: customerStatementConfig,
      documentNo: 'DZ20261014001',
    })

    expect(text).toContain('已保存并确认')
    expect(text).toContain('DZ20261014001')
    // 动作词必须与按钮同源：客户对账单主按钮是「保存并确认」，回执不能自称「提交审核」。
    expect(text).not.toContain('提交审核')
    expect(text).not.toContain('已保存并审核')
  })

  it('已核准类动作（approve）同样跟随动作词，不写死审核', () => {
    expect(title('save-and-audit', { auditActionKind: 'approve' })).toContain(
      '已保存并核准',
    )
  })

  it('四种回执标题两两不同（不能是同一句通用成功文案）', () => {
    const titles = [
      title('save'),
      title('save-and-audit'),
      title('save-and-audit', { auditActionKind: 'confirm' }),
      title('save-and-complete'),
    ]
    expect(new Set(titles).size).toBe(4)
  })

  it('缺单号时不留下多余分隔（文案仍可读）', () => {
    expect(title('save', { documentNo: '' })).toContain('已保存为草稿')
  })

  it('来源不明时退回通用成功文案（兼容旧调用）', () => {
    expect(title(undefined)).toContain('保存成功')
  })

  it('失败与并发冲突文案不变', () => {
    expect(
      resolveSaveResultTitle({
        config,
        isConflict: false,
        isSuccess: false,
        t: i18next.t,
        action: 'save',
      }),
    ).toBe(i18next.t('modules.saveResult.error'))
    expect(
      resolveSaveResultTitle({
        config,
        isConflict: true,
        isSuccess: false,
        t: i18next.t,
        action: 'save',
      }),
    ).toBe(i18next.t('modules.saveResult.conflict'))
  })
})

describe('保存回执按钮集合按动作区分', () => {
  const actions = (
    action: SubmissionAction | undefined,
    overrides: Partial<Parameters<typeof resolveSaveResultActions>[0]> = {},
  ) =>
    resolveSaveResultActions({
      action,
      canCreateAnother: true,
      canUploadAttachment: true,
      hasNextModule: true,
      isSuccess: true,
      ...overrides,
    })

  it('草稿保存：不给「创建下一模块」（草稿尚未生效，下游无法关联）', () => {
    const kinds = actions('save')
    expect(kinds).not.toContain('next-module')
    expect(kinds).toEqual(['upload-attachment', 'create-another', 'close'])
  })

  it('保存并审核：给出「创建下一模块」（单据已生效）', () => {
    expect(actions('save-and-audit')).toEqual([
      'upload-attachment',
      'next-module',
      'create-another',
      'close',
    ])
  })

  it('核定并完成销售：同样给出「创建下一模块」', () => {
    expect(actions('save-and-complete')).toContain('next-module')
  })

  it('负向：草稿回执不含任何推进审核的动作，只有收尾动作', () => {
    const kinds = actions('save')
    expect(
      kinds.filter(
        (kind) =>
          !['upload-attachment', 'create-another', 'close'].includes(kind),
      ),
    ).toEqual([])
  })

  it('没有下一模块的模块不出现该按钮', () => {
    expect(actions('save-and-audit', { hasNextModule: false })).toEqual([
      'upload-attachment',
      'create-another',
      'close',
    ])
  })

  it('失败/冲突只给收尾动作', () => {
    expect(actions('save-and-audit', { isSuccess: false })).toEqual(['close'])
  })

  it('物流单模块也按同一规则派生（共享实现，不是销售订单特例）', () => {
    const freightConfig = freightOperationsPageConfigs['freight-bill']
    expect(freightConfig.key).toBe('freight-bill')
    // 物流单没有注册下一模块入口：即使已审核也不出现「创建下一模块」。
    expect(actions('save-and-audit', { hasNextModule: false })).not.toContain(
      'next-module',
    )
  })
})

describe('保存回执副标题按动作区分（不再三态共用「编辑成功」）', () => {
  const subtitle = (
    action: SubmissionAction | undefined,
    options: {
      auditActionKind?: StatusChangeActionKind
      isSuccess?: boolean
    } = {},
  ) =>
    resolveSaveResultSubtitle({
      action,
      auditActionKind: options.auditActionKind,
      fallback: '编辑成功',
      isSuccess: options.isSuccess ?? true,
      t: i18next.t,
    })

  it('草稿保存：副标题写明「尚未提交审核」', () => {
    expect(subtitle('save')).toContain('尚未提交审核')
  })

  it('保存并审核：副标题跟随动作词（客户对账单为「确认」）', () => {
    expect(subtitle('save-and-audit')).toContain('已保存并审核')
    expect(
      subtitle('save-and-audit', { auditActionKind: 'confirm' }),
    ).toContain('已保存并确认')
  })

  it('交付核定：副标题写明完成销售', () => {
    expect(subtitle('save-and-complete')).toContain('完成销售')
  })

  it('三态副标题两两不同，且都不等于通用「编辑成功」', () => {
    const subtitles = [
      subtitle('save'),
      subtitle('save-and-audit'),
      subtitle('save-and-complete'),
    ]
    expect(new Set(subtitles).size).toBe(3)
    for (const text of subtitles) {
      expect(text).not.toBe('编辑成功')
      expect(text.length).toBeGreaterThan(0)
    }
  })

  it('失败态仍用回退文案（不套用成功话术）', () => {
    expect(subtitle('save', { isSuccess: false })).toBe('编辑成功')
  })

  it('来源不明时仍用回退文案（兼容旧调用）', () => {
    expect(subtitle(undefined)).toBe('编辑成功')
  })
})
