import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildEditorAuditTarget,
  buildListAuditTargets,
  buildReverseAuditTarget,
  canAuditFromStatus,
  canReverseAuditFromStatus,
  resolveModuleActionKind,
  resolveModuleActionPermissionCodes,
  resolveReverseAuditTargetForStatus,
  resolveStatusChangeActionLabel,
  resolveStatusOptions,
} from './module-adapter-actions'
import { moduleBehaviorRegistry } from './module-behavior-registry-core'

beforeEach(() => {
  moduleBehaviorRegistry.clear()
})

function register(key: string, config: Record<string, any>) {
  moduleBehaviorRegistry.set(key, config as any)
}

describe('resolveModuleActionKind', () => {
  it('resolves by actionKey when mapped', () => {
    register('test', { actionKindsByKey: { generate: 'openCreateEditor' } })
    expect(
      resolveModuleActionKind({
        moduleKey: 'test',
        actionKey: 'generate',
        actionLabel: '生成',
        hasFormFields: false,
        isMaterialModule: false,
      }),
    ).toBe('openCreateEditor')
  })

  it('falls back to actionLabel mapping when actionKey mapping is missing', () => {
    register('test', {
      actionKindsByKey: { other: 'exportRows' },
      actionKindsByLabel: { 生成对账单: 'openCreateEditor' },
    })
    expect(
      resolveModuleActionKind({
        moduleKey: 'test',
        actionKey: 'generate',
        actionLabel: '生成对账单',
        hasFormFields: false,
        isMaterialModule: false,
      }),
    ).toBe('openCreateEditor')
  })

  it('resolves by actionLabel when mapped', () => {
    register('test', { actionKindsByLabel: { 生成对账单: 'openCreateEditor' } })
    expect(
      resolveModuleActionKind({
        moduleKey: 'test',
        actionLabel: '生成对账单',
        hasFormFields: false,
        isMaterialModule: false,
      }),
    ).toBe('openCreateEditor')
  })

  it('returns openCreateEditor for 新增 with form fields', () => {
    expect(
      resolveModuleActionKind({
        moduleKey: 'test',
        actionLabel: '新增',
        hasFormFields: true,
        isMaterialModule: false,
      }),
    ).toBe('openCreateEditor')
  })

  it('returns openCreateEditor for 生成 with form fields', () => {
    expect(
      resolveModuleActionKind({
        moduleKey: 'test',
        actionLabel: '生成',
        hasFormFields: true,
        isMaterialModule: false,
      }),
    ).toBe('openCreateEditor')
  })

  it('returns none for 新增 without form fields', () => {
    expect(
      resolveModuleActionKind({
        moduleKey: 'test',
        actionLabel: '新增',
        hasFormFields: false,
        isMaterialModule: false,
      }),
    ).toBe('none')
  })

  it('returns exportMaterialRows for 导出 on material module', () => {
    expect(
      resolveModuleActionKind({
        moduleKey: 'material',
        actionLabel: '导出',
        hasFormFields: false,
        isMaterialModule: true,
      }),
    ).toBe('exportMaterialRows')
  })

  it('returns exportRows for 导出 on non-material module', () => {
    expect(
      resolveModuleActionKind({
        moduleKey: 'test',
        actionLabel: '导出',
        hasFormFields: false,
        isMaterialModule: false,
      }),
    ).toBe('exportRows')
  })

  it('returns none for unrecognized actions', () => {
    expect(
      resolveModuleActionKind({
        moduleKey: 'test',
        actionLabel: '未知操作',
        hasFormFields: false,
        isMaterialModule: false,
      }),
    ).toBe('none')
  })
})

describe('resolveModuleActionPermissionCodes', () => {
  it('resolves by actionKey when mapped', () => {
    register('test', { permissionCodesByActionKey: { edit: ['update'] } })
    expect(
      resolveModuleActionPermissionCodes({
        moduleKey: 'test',
        actionKey: 'edit',
        actionLabel: '编辑',
      }),
    ).toEqual(['update'])
  })

  it('falls back when actionKey mapping is empty', () => {
    register('test', { permissionCodesByActionKey: { edit: [] } })
    expect(
      resolveModuleActionPermissionCodes({
        moduleKey: 'test',
        actionKey: 'edit',
        actionLabel: '编辑',
      }),
    ).toEqual(['update'])
  })

  it('returns manage_permissions for 配置权限', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '配置权限',
      }),
    ).toEqual(['manage_permissions'])
  })

  it('returns update for 页面上传命名规则', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '页面上传命名规则',
      }),
    ).toEqual(['update'])
  })

  it('returns export for 生成提货清单', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '生成提货清单',
      }),
    ).toEqual(['export'])
  })

  it('returns export for 模板下载', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '模板下载',
      }),
    ).toEqual(['export'])
  })

  it.each([
    '确认',
    '反确认',
  ])('returns audit for exact %s action', (actionLabel) => {
    expect(resolveModuleActionPermissionCodes({ actionLabel })).toEqual([
      'audit',
    ])
  })

  it.each([
    '核准',
    '反核准',
  ])('returns audit for exact %s action', (actionLabel) => {
    expect(resolveModuleActionPermissionCodes({ actionLabel })).toEqual([
      'audit',
    ])
  })

  it('returns export for labels containing 导出', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '导出数据',
      }),
    ).toEqual(['export'])
  })

  it('returns print for labels containing 打印', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '打印单据',
      }),
    ).toEqual(['print'])
  })

  it('returns delete for labels containing 删除', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '删除记录',
      }),
    ).toEqual(['delete'])
  })

  it('returns audit for labels containing 审核', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '审核订单',
      }),
    ).toEqual(['audit'])
  })

  it('returns update for labels containing 编辑', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '编辑资料',
      }),
    ).toEqual(['update'])
  })

  it('returns update for labels containing 附件', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '附件管理',
      }),
    ).toEqual(['update'])
  })

  it('returns create+update for labels containing 导入', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '导入数据',
      }),
    ).toEqual(['create', 'update'])
  })

  it('returns create for labels containing 新增', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '新增用户',
      }),
    ).toEqual(['create'])
  })

  it('returns create for labels containing 生成', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '生成对账单',
      }),
    ).toEqual(['create'])
  })

  it('returns read for labels containing 查看', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '查看详情',
      }),
    ).toEqual(['read'])
  })

  it('returns read as default fallback', () => {
    expect(
      resolveModuleActionPermissionCodes({
        actionLabel: '未知操作',
      }),
    ).toEqual(['read'])
  })
})

describe('resolveStatusChangeActionLabel', () => {
  it.each([
    ['已确认', false, '确认'],
    ['待确认', true, '反确认'],
    [' 已核准 ', false, '核准'],
    ['未核准', true, '反核准'],
    ['已审核', false, '审核'],
    [undefined, true, '反审核'],
  ] as const)('returns %s status action label with reverse=%s', (targetValue, reverse, expected) => {
    expect(resolveStatusChangeActionLabel(targetValue, reverse)).toBe(expected)
  })
})

describe('buildEditorAuditTarget', () => {
  it('uses registered auditStatus if defined as string', () => {
    register('test', { auditStatus: '已收货' })
    expect(buildEditorAuditTarget('test', ['草稿', '已收货'], '草稿')).toEqual({
      key: 'status',
      value: '已收货',
    })
  })

  it('returns null when currentStatus equals auditStatus', () => {
    register('test', { auditStatus: '已审核' })
    expect(
      buildEditorAuditTarget('test', ['草稿', '已审核'], '已审核'),
    ).toBeNull()
  })

  it('does not use sales completion as an audit target when line items are locked', () => {
    expect(
      buildEditorAuditTarget(
        'sales-order',
        ['草稿', '已审核', '完成销售'],
        '已审核',
      ),
    ).toBeNull()
  })

  it('returns 已审核 when statusOptions includes it and auditStatus is not set', () => {
    expect(buildEditorAuditTarget('test', ['草稿', '已审核'], '草稿')).toEqual({
      key: 'status',
      value: '已审核',
    })
  })

  it('returns 已核准 when statusOptions includes it and 已审核 is not available', () => {
    expect(buildEditorAuditTarget('test', ['草稿', '已核准'], '草稿')).toEqual({
      key: 'status',
      value: '已核准',
    })
  })

  it('returns null when current status is already 已核准', () => {
    expect(
      buildEditorAuditTarget('test', ['草稿', '已核准'], '已核准'),
    ).toBeNull()
  })

  it('returns null when no matching audit status found', () => {
    expect(
      buildEditorAuditTarget('test', ['草稿', '已完成'], '草稿'),
    ).toBeNull()
  })

  it('returns null when current status is already 已审核', () => {
    expect(
      buildEditorAuditTarget('test', ['草稿', '已审核'], '已审核'),
    ).toBeNull()
  })
})

describe('buildReverseAuditTarget', () => {
  it('uses preferredStatus when valid', () => {
    expect(buildReverseAuditTarget('test', ['草稿', '已审核'], '草稿')).toEqual(
      { key: 'status', value: '草稿' },
    )
  })

  it('ignores preferredStatus when not in statusOptions', () => {
    expect(
      buildReverseAuditTarget('test', ['待审核', '已审核'], '草稿'),
    ).not.toBeNull()
  })

  it('uses module default status even when status field options are unavailable', () => {
    register('test-module', { defaultStatus: '草稿' })
    expect(buildReverseAuditTarget('test-module', [])).toEqual({
      key: 'status',
      value: '草稿',
    })
  })

  it('rejects module default status when explicit options do not include it', () => {
    register('test-module', { defaultStatus: '草稿' })
    expect(
      buildReverseAuditTarget('test-module', ['待审核', '已审核']),
    ).toBeNull()
  })

  it('ignores blank module default status', () => {
    register('test-module', { defaultStatus: '   ' })
    expect(
      buildReverseAuditTarget('test-module', ['待确认', '已确认']),
    ).toEqual({ key: 'status', value: '待确认' })
  })

  it('returns null when defaultStatus is not a string and no fallback status matches', () => {
    register('test-module', { defaultStatus: 0 })
    expect(buildReverseAuditTarget('test-module', ['已完成'])).toBeNull()
  })

  it('falls back through common statuses', () => {
    expect(
      buildReverseAuditTarget('test', ['未审核', '已审核'], undefined),
    ).toEqual({ key: 'status', value: '未审核' })
  })

  it('returns null when no fallback status matches', () => {
    expect(
      buildReverseAuditTarget('test', ['已完成', '已关闭'], undefined),
    ).toBeNull()
  })
})

describe('resolveStatusOptions', () => {
  it('returns empty array when no status field', () => {
    expect(resolveStatusOptions({ fields: [{ key: 'name' } as any] })).toEqual(
      [],
    )
  })

  it('returns empty array when status field has no options', () => {
    expect(
      resolveStatusOptions({
        fields: [{ key: 'status', type: 'select' } as any],
      }),
    ).toEqual([])
  })

  it('extracts flat form field options for select type', () => {
    expect(
      resolveStatusOptions({
        fields: [
          {
            key: 'status',
            type: 'select',
            options: [
              { label: '草稿', value: '草稿' },
              { label: '已审核', value: '已审核' },
            ],
          } as any,
        ],
      }),
    ).toEqual(['草稿', '已审核'])
  })

  it('extracts grouped filter option values', () => {
    expect(
      resolveStatusOptions({
        fields: [
          {
            key: 'status',
            type: 'select',
            options: [
              {
                label: '状态',
                options: [{ value: '草稿' }, { value: '已审核' }],
              },
            ],
          } as any,
        ],
      }),
    ).toEqual(['草稿', '已审核'])
  })

  it('extracts mixed grouped and flat filter option values with normalization', () => {
    expect(
      resolveStatusOptions({
        fields: [
          {
            key: 'status',
            type: 'select',
            options: [
              { label: '草稿', value: ' 草稿 ' },
              {
                label: '状态',
                options: [
                  { value: '草稿' },
                  { value: undefined },
                  { value: '已审核' },
                ],
              },
              { label: '空值', value: '' },
            ],
          } as any,
        ],
      }),
    ).toEqual(['草稿', '已审核'])
  })

  it('returns empty array for non-select type', () => {
    expect(
      resolveStatusOptions({
        fields: [
          {
            key: 'status',
            type: 'text',
            options: [{ label: 'A', value: 'a' }],
          } as any,
        ],
      }),
    ).toEqual([])
  })
})

describe('buildListAuditTargets', () => {
  it('builds both audit and reverse audit targets', () => {
    const result = buildListAuditTargets({
      moduleKey: 'sales-order',
      statusOptions: ['草稿', '已审核'],
      preferredStatus: '草稿',
    })
    expect(result).toEqual({
      auditTarget: { key: 'status', value: '已审核' },
      reverseAuditTarget: { key: 'status', value: '草稿' },
    })
  })

  it('returns configured audit source statuses', () => {
    register('sales-outbound', { auditSourceStatuses: ['草稿', '预出库'] })

    const result = buildListAuditTargets({
      moduleKey: 'sales-outbound',
      statusOptions: ['草稿', '预出库', '已审核'],
      preferredStatus: '草稿',
    })

    expect(result.auditSourceStatuses).toEqual(['草稿', '预出库'])
  })
})

describe('canAuditFromStatus', () => {
  it('returns true when status matches reverseAuditTarget and differs from auditTarget', () => {
    expect(
      canAuditFromStatus('草稿', { value: '已审核' }, { value: '草稿' }),
    ).toBe(true)
  })

  it('returns false when status equals auditTarget', () => {
    expect(
      canAuditFromStatus('已审核', { value: '已审核' }, { value: '草稿' }),
    ).toBe(false)
  })

  it('returns false when status does not match reverseAuditTarget', () => {
    expect(
      canAuditFromStatus('已完成', { value: '已审核' }, { value: '草稿' }),
    ).toBe(false)
  })

  it('returns true when status is configured as an audit source status', () => {
    expect(
      canAuditFromStatus('预出库', { value: '已审核' }, { value: '草稿' }, [
        '草稿',
        '预出库',
      ]),
    ).toBe(true)
  })

  it('returns false when configured audit source status equals audit target', () => {
    expect(
      canAuditFromStatus('已审核', { value: '已审核' }, { value: '草稿' }, [
        '草稿',
        '预出库',
      ]),
    ).toBe(false)
  })

  it('returns false when auditTarget is null', () => {
    expect(canAuditFromStatus('草稿', null, { value: '草稿' })).toBe(false)
  })

  it('returns false when reverseAuditTarget is null', () => {
    expect(canAuditFromStatus('草稿', { value: '已审核' }, null)).toBe(false)
  })

  it('returns false when status is empty', () => {
    expect(canAuditFromStatus('', { value: '已审核' }, { value: '草稿' })).toBe(
      false,
    )
  })
})

describe('canReverseAuditFromStatus', () => {
  it('returns true when status equals auditTarget', () => {
    expect(
      canReverseAuditFromStatus(
        '已审核',
        { value: '已审核' },
        { value: '草稿' },
      ),
    ).toBe(true)
  })

  it('returns false when status does not equal auditTarget', () => {
    expect(
      canReverseAuditFromStatus('草稿', { value: '已审核' }, { value: '草稿' }),
    ).toBe(false)
  })

  it('returns false when auditTarget is null', () => {
    expect(canReverseAuditFromStatus('已审核', null, { value: '草稿' })).toBe(
      false,
    )
  })

  it('returns false when reverseAuditTarget is null', () => {
    expect(canReverseAuditFromStatus('已审核', { value: '已审核' }, null)).toBe(
      false,
    )
  })

  it('returns false when status is empty', () => {
    expect(
      canReverseAuditFromStatus('', { value: '已审核' }, { value: '草稿' }),
    ).toBe(false)
  })

  it('returns false when both targets are null', () => {
    expect(canReverseAuditFromStatus('已审核', null, null)).toBe(false)
  })
})

describe('resolveReverseAuditTargetForStatus', () => {
  it('reopens a completed purchase order to audited', () => {
    register('purchase-order', {
      reverseAuditTargetsByStatus: { 完成采购: '已审核' },
    })

    expect(
      resolveReverseAuditTargetForStatus(
        'purchase-order',
        '完成采购',
        { value: '已审核' },
        { value: '草稿' },
      ),
    ).toBe('已审核')
  })

  it('reverses a completed purchase inbound directly to draft', () => {
    register('purchase-inbound', {
      reverseAuditTargetsByStatus: { 完成入库: '草稿' },
    })

    expect(
      resolveReverseAuditTargetForStatus(
        'purchase-inbound',
        '完成入库',
        { value: '已审核' },
        { value: '草稿' },
      ),
    ).toBe('草稿')
  })
})
