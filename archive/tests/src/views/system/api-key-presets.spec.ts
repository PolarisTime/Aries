import { describe, expect, it } from 'vitest'
import {
  buildApiKeyPresets,
  groupApiKeyResources,
} from '@/views/system/api-key-presets'

const t = (key: string) => key

describe('api-key-presets', () => {
  const resourceOptions = [
    { code: 'purchase-order', title: '采购订单', group: '采购' },
    { code: 'purchase-inbound', title: '采购入库', group: '采购' },
    { code: 'sales-order', title: '销售订单', group: '销售' },
    { code: 'sales-outbound', title: '销售出库', group: '销售' },
    { code: 'freight-bill', title: '物流单', group: '物流' },
    { code: 'department', title: '部门', group: '主数据' },
    { code: 'operation-log', title: '操作日志', group: '系统' },
    { code: 'database', title: '数据库管理', group: '系统' },
    { code: 'session', title: '会话管理', group: '系统' },
    { code: 'api-key', title: 'API Key 管理', group: '系统' },
  ]
  const actionOptions = [
    { code: 'read', title: '读取' },
    { code: 'create', title: '新增' },
    { code: 'update', title: '编辑' },
    { code: 'delete', title: '删除' },
    { code: 'audit', title: '审核' },
  ]

  it('builds presets from available resources and actions', () => {
    const presets = buildApiKeyPresets(
      t as never,
      resourceOptions,
      actionOptions,
    )
    const businessWrite = presets.find((item) => item.key === 'businessWrite')

    expect(businessWrite).toMatchObject({
      label: 'system.apiKeyPresets.businessWrite',
      usageScope: '业务接口',
      resourceCodes: [
        'purchase-order',
        'purchase-inbound',
        'sales-order',
        'sales-outbound',
        'freight-bill',
      ],
      actionCodes: ['read', 'create', 'update', 'audit', 'delete'],
    })
  })

  it('keeps business presets limited to business resources', () => {
    const presets = buildApiKeyPresets(
      t as never,
      resourceOptions,
      actionOptions,
    )
    const businessRead = presets.find((item) => item.key === 'businessRead')

    expect(businessRead?.resourceCodes).not.toContain('department')
  })

  it('drops presets without available resources or actions', () => {
    const presets = buildApiKeyPresets(
      t as never,
      [{ code: 'unknown', title: '未知', group: '其他' }],
      [{ code: 'unknown', title: '未知' }],
    )

    expect(presets).toEqual([])
  })

  it('groups resources by group name', () => {
    expect(groupApiKeyResources(resourceOptions.slice(0, 3))).toEqual([
      {
        group: '采购',
        resources: resourceOptions.slice(0, 2),
      },
      {
        group: '销售',
        resources: [resourceOptions[2]],
      },
    ])
  })

  it('groups resources with missing group under empty key', () => {
    expect(
      groupApiKeyResources([{ code: 'custom', title: '自定义' } as never]),
    ).toEqual([
      {
        group: '',
        resources: [{ code: 'custom', title: '自定义' }],
      },
    ])
  })
})
