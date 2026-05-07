import { describe, it, expect } from 'vitest'
import {
  resolveModuleActionKind,
  resolveModuleActionPermissionCodes,
  buildEditorAuditTarget,
  buildReverseAuditTarget,
  resolveStatusChangeActionLabel,
} from '../module-adapter-actions'

describe('resolveModuleActionKind', () => {
  it('returns mapped action from registry for registered modules', () => {
    expect(resolveModuleActionKind({
      moduleKey: 'supplier-statements', actionLabel: '生成对账单', hasFormFields: false, isMaterialModule: false,
    })).toBe('openSupplierStatementGenerator')

    expect(resolveModuleActionKind({
      moduleKey: 'freight-bills', actionLabel: '生成提货清单', hasFormFields: false, isMaterialModule: false,
    })).toBe('openFreightPickupList')

    expect(resolveModuleActionKind({
      moduleKey: 'freight-bills', actionLabel: '标记送达', hasFormFields: false, isMaterialModule: false,
    })).toBe('markSelectedFreightDelivered')
  })

  it('falls back to openCreateEditor for add/generate labels with form fields', () => {
    expect(resolveModuleActionKind({
      moduleKey: 'materials', actionLabel: '新增', hasFormFields: true, isMaterialModule: false,
    })).toBe('openCreateEditor')

    expect(resolveModuleActionKind({
      moduleKey: 'purchase-orders', actionLabel: '生成', hasFormFields: true, isMaterialModule: false,
    })).toBe('openCreateEditor')
  })

  it('falls back to export for labels containing 导出', () => {
    expect(resolveModuleActionKind({
      moduleKey: 'materials', actionLabel: '导出', hasFormFields: false, isMaterialModule: true,
    })).toBe('exportMaterialRows')

    expect(resolveModuleActionKind({
      moduleKey: 'purchase-orders', actionLabel: '导出', hasFormFields: false, isMaterialModule: false,
    })).toBe('exportRows')
  })

  it('returns none for unrecognized labels', () => {
    expect(resolveModuleActionKind({
      moduleKey: 'materials', actionLabel: '未知操作', hasFormFields: false, isMaterialModule: false,
    })).toBe('none')
  })

  it('returns none for add label without form fields', () => {
    expect(resolveModuleActionKind({
      moduleKey: 'materials', actionLabel: '新增', hasFormFields: false, isMaterialModule: false,
    })).toBe('none')
  })
})

describe('resolveModuleActionPermissionCodes', () => {
  it('manage_permissions for 配置权限', () => {
    expect(resolveModuleActionPermissionCodes('配置权限')).toEqual(['manage_permissions'])
  })
  it('update for 页面上传命名规则', () => {
    expect(resolveModuleActionPermissionCodes('页面上传命名规则')).toEqual(['update'])
  })
  it('audit for 标记送达', () => {
    expect(resolveModuleActionPermissionCodes('标记送达')).toEqual(['audit'])
  })
  it('export for 生成提货清单', () => {
    expect(resolveModuleActionPermissionCodes('生成提货清单')).toEqual(['export'])
  })
  it('export for 模板下载', () => {
    expect(resolveModuleActionPermissionCodes('模板下载')).toEqual(['export'])
  })
  it('export for labels containing 导出', () => {
    expect(resolveModuleActionPermissionCodes('导出Excel')).toEqual(['export'])
  })
  it('print for labels containing 打印', () => {
    expect(resolveModuleActionPermissionCodes('打印')).toEqual(['print'])
    expect(resolveModuleActionPermissionCodes('批量打印')).toEqual(['print'])
  })
  it('delete for labels containing 删除', () => {
    expect(resolveModuleActionPermissionCodes('删除')).toEqual(['delete'])
    expect(resolveModuleActionPermissionCodes('批量删除')).toEqual(['delete'])
  })
  it('audit for labels containing 审核', () => {
    expect(resolveModuleActionPermissionCodes('审核')).toEqual(['audit'])
    expect(resolveModuleActionPermissionCodes('反审核')).toEqual(['audit'])
  })
  it('audit for confirm labels', () => {
    expect(resolveModuleActionPermissionCodes('确认')).toEqual(['audit'])
    expect(resolveModuleActionPermissionCodes('反确认')).toEqual(['audit'])
  })
  it('update for labels containing 编辑 or 附件', () => {
    expect(resolveModuleActionPermissionCodes('编辑')).toEqual(['update'])
    expect(resolveModuleActionPermissionCodes('附件')).toEqual(['update'])
  })
  it('create+update for labels containing 导入', () => {
    expect(resolveModuleActionPermissionCodes('导入')).toEqual(['create', 'update'])
    expect(resolveModuleActionPermissionCodes('导入采购订单明细')).toEqual(['create', 'update'])
  })
  it('create for labels containing 新增 or 生成', () => {
    expect(resolveModuleActionPermissionCodes('新增')).toEqual(['create'])
    expect(resolveModuleActionPermissionCodes('生成对账单')).toEqual(['create'])
  })
  it('read for labels containing 查看', () => {
    expect(resolveModuleActionPermissionCodes('查看')).toEqual(['read'])
  })
  it('read as default fallback', () => {
    expect(resolveModuleActionPermissionCodes('')).toEqual(['read'])
    expect(resolveModuleActionPermissionCodes('其他')) .toEqual(['read'])
  })
})

describe('buildEditorAuditTarget', () => {
  it('returns lockedAuditStatus when lineItems are locked', () => {
    const result = buildEditorAuditTarget('sales-orders', ['草稿', '已审核', '待完善', '完成销售'], true)
    expect(result).toEqual({ key: 'status', value: '完成销售' })
  })

  it('returns auditStatus when lineItems are NOT locked', () => {
    const result = buildEditorAuditTarget('purchase-orders', ['草稿', '已审核'], false)
    expect(result).toEqual({ key: 'status', value: '已审核' })
  })

  it('falls back to 已审核 when no registry config', () => {
    const result = buildEditorAuditTarget('materials', ['草稿', '已审核'], false)
    expect(result).toEqual({ key: 'status', value: '已审核' })
  })

  it('falls back to 已核准 when 已审核 not in options', () => {
    const result = buildEditorAuditTarget('materials', ['草稿', '已核准'], false)
    expect(result).toEqual({ key: 'status', value: '已核准' })
  })

  it('returns null when no matching status found', () => {
    const result = buildEditorAuditTarget('materials', ['草稿', '待审批'], false)
    expect(result).toBeNull()
  })

  it('supports confirmed audit target for customer statements', () => {
    const result = buildEditorAuditTarget('customer-statements', ['待确认', '已确认'], false)
    expect(result).toEqual({ key: 'status', value: '已确认' })
  })
})

describe('buildReverseAuditTarget', () => {
  it('uses preferred status when available', () => {
    const result = buildReverseAuditTarget('freight-statements', ['待审核', '已审核'], '待审核')
    expect(result).toEqual({ key: 'status', value: '待审核' })
  })

  it('uses module default status when preferred status is unavailable', () => {
    const result = buildReverseAuditTarget('freight-bills', ['未审核', '已审核'])
    expect(result).toEqual({ key: 'status', value: '未审核' })
  })

  it('falls back to draft-like statuses', () => {
    const result = buildReverseAuditTarget('custom-module', ['待确认', '已审核'])
    expect(result).toEqual({ key: 'status', value: '待确认' })
  })

  it('returns null when no reverse status is available', () => {
    const result = buildReverseAuditTarget('custom-module', ['正常', '已审核'])
    expect(result).toBeNull()
  })
})

describe('resolveStatusChangeActionLabel', () => {
  it('uses confirm labels for statement confirmation statuses', () => {
    expect(resolveStatusChangeActionLabel('已确认')).toBe('确认')
    expect(resolveStatusChangeActionLabel('待确认', true)).toBe('反确认')
  })

  it('falls back to audit labels for regular workflow statuses', () => {
    expect(resolveStatusChangeActionLabel('已审核')).toBe('审核')
    expect(resolveStatusChangeActionLabel('草稿', true)).toBe('反审核')
  })
})
