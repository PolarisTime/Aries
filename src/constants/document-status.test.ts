import i18next from 'i18next'
import { describe, expect, it } from 'vitest'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import {
  DOCUMENT_STATUS_REGISTRY,
  getStatusColor,
  getStatusText,
  isKnownStatus,
} from '@/constants/document-status'
import { DOCUMENT_STATUS, STATUS_LABELS } from '@/constants/status-constants'

describe('DOCUMENT_STATUS_REGISTRY 状态注册表', () => {
  it('覆盖所有关键业务状态，且 label 取自 STATUS_LABELS', () => {
    const required = [
      DOCUMENT_STATUS.DRAFT,
      DOCUMENT_STATUS.AUDITED,
      DOCUMENT_STATUS.DELIVERY_VERIFICATION,
      DOCUMENT_STATUS.SALES_COMPLETED,
      DOCUMENT_STATUS.PURCHASE_COMPLETED,
      DOCUMENT_STATUS.INBOUND_COMPLETED,
      DOCUMENT_STATUS.PENDING_CONFIRM,
      DOCUMENT_STATUS.CONFIRMED,
      DOCUMENT_STATUS.PENDING_AUDIT,
      DOCUMENT_STATUS.COMPLETED,
      DOCUMENT_STATUS.SIGNED,
      DOCUMENT_STATUS.UNSIGNED,
      DOCUMENT_STATUS.EXECUTING,
      DOCUMENT_STATUS.ARCHIVED,
      DOCUMENT_STATUS.NORMAL,
      DOCUMENT_STATUS.DISABLED,
    ]

    for (const code of required) {
      expect(isKnownStatus(code)).toBe(true)
      expect(DOCUMENT_STATUS_REGISTRY[code].label).toBe(
        STATUS_LABELS[code as keyof typeof STATUS_LABELS],
      )
    }
  })

  it('每一项的键是英文 code，label 是中文，i18nKey 位于 modules.status 命名空间', () => {
    for (const [code, meta] of Object.entries(DOCUMENT_STATUS_REGISTRY)) {
      // 键是 code：不能是中文，否则查不到后端返回值
      expect(code).toMatch(/^[A-Z_]+$/)
      // 中文只在 STATUS_LABELS 登记一份，注册表只引用不复制
      expect(meta.label).toMatch(/[\u4e00-\u9fa5]/)
      expect(meta.i18nKey).toMatch(/^modules\.status\./)
    }
  })

  it('statusMap 由注册表派生，键与颜色保持一致', () => {
    expect(Object.keys(statusMap).sort()).toEqual(
      Object.keys(DOCUMENT_STATUS_REGISTRY).sort(),
    )

    for (const [code, meta] of Object.entries(DOCUMENT_STATUS_REGISTRY)) {
      expect(statusMap[code]?.color).toBe(meta.color)
    }
  })
})

describe('getStatusColor 颜色兜底', () => {
  it('已知状态返回注册表颜色', () => {
    expect(getStatusColor(DOCUMENT_STATUS.AUDITED)).toBe('success')
    expect(getStatusColor(DOCUMENT_STATUS.DRAFT)).toBe('warning')
    expect(getStatusColor(DOCUMENT_STATUS.COMPLETED)).toBe('cyan')
  })

  it('未知状态返回 default 且不抛错', () => {
    expect(isKnownStatus('不存在的状态')).toBe(false)
    expect(getStatusColor('不存在的状态')).toBe('default')
    expect(getStatusColor('')).toBe('default')
  })
})

describe('getStatusText 展示文案', () => {
  const t = (key: string) => i18next.t(key)

  it('已登记 code 走 i18n 文案（与列表 Tag / 筛选下拉同一份）', () => {
    expect(getStatusText(DOCUMENT_STATUS.AUDITED, t)).toBe('已审核')
    // i18n 措辞可以更口语（disabled → 已禁用），只要不是 code
    expect(getStatusText(DOCUMENT_STATUS.DISABLED, t)).toBe('已禁用')
  })

  it('未登记 code 回退中文表，仍未知才回退原值 —— 绝不渲染成空白', () => {
    // QUOTING 只登记在 STATUS_LABELS（销售合同/报价页用自己的 i18n），不在注册表里
    expect(getStatusText('QUOTING', t)).toBe('报价')
    expect(getStatusText('SOMETHING_NEW', t)).toBe('SOMETHING_NEW')
    expect(getStatusText('', t)).toBe('')
    expect(getStatusText(undefined, t)).toBe('')
  })
})
