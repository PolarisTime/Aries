import { describe, expect, it } from 'vitest'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import {
  DOCUMENT_STATUS_REGISTRY,
  getStatusColor,
  isKnownStatus,
} from '@/constants/document-status'
import { DOCUMENT_STATUS } from '@/constants/status-constants'

describe('DOCUMENT_STATUS_REGISTRY 状态注册表', () => {
  it('覆盖所有关键业务状态且标签与后端常量一致', () => {
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

    for (const label of required) {
      expect(isKnownStatus(label)).toBe(true)
      expect(DOCUMENT_STATUS_REGISTRY[label].label).toBe(label)
    }
  })

  it('每一项的 label 等于键名，且 i18nKey 位于 modules.status 命名空间', () => {
    for (const [status, meta] of Object.entries(DOCUMENT_STATUS_REGISTRY)) {
      expect(meta.label).toBe(status)
      expect(meta.i18nKey).toMatch(/^modules\.status\./)
    }
  })

  it('statusMap 由注册表派生，键与颜色保持一致', () => {
    expect(Object.keys(statusMap).sort()).toEqual(
      Object.keys(DOCUMENT_STATUS_REGISTRY).sort(),
    )

    for (const [status, meta] of Object.entries(DOCUMENT_STATUS_REGISTRY)) {
      expect(statusMap[status]?.color).toBe(meta.color)
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
