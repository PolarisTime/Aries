import { describe, expect, it, vi } from 'vitest'

vi.mock('@/module-system/core/module-option-resolvers', () => ({
  findProjectOption: vi.fn(),
}))
vi.mock('@/queries/master/carrier-options', () => ({
  findCarrierOption: vi.fn(),
}))
vi.mock('@/queries/master/customer-options', () => ({
  findCustomerOption: vi.fn(),
}))
vi.mock('@/queries/master/supplier-options', () => ({
  findSupplierOption: vi.fn(),
}))
vi.mock('@/queries/system/company-settings', () => ({
  getSettlementCompanyOptions: vi.fn(() => []),
}))

import type { CustomerOption } from '@/api/master/customer-options'
import type { ProjectOption } from '@/api/master/project-options'
import { contributeEditorBehaviors } from '@/module-system/behavior/module-behavior-editor'
import { assembleModuleBehaviors } from '@/module-system/behavior/module-behavior-registry-core'
import type { ModuleKey } from '@/module-system/core/module-key'
import { findProjectOption } from '@/module-system/core/module-option-resolvers'
import { findCustomerOption } from '@/queries/master/customer-options'
import type { ModuleRecordInput } from '@/types/module-record'

/**
 * 结算主体口径回归：客户资料已移除默认结算主体，唯一入口是项目资料。
 *
 * <p>客户下拉选项的 mock 故意保留已下线的 `defaultSettlementCompany*` 旧字段：
 * 这样才能区分「项目主体」与「客户默认主体」两个口径——若实现偷偷回退到客户默认值，
 * 断言会看到 2001/客户默认主体而不是空值。</p>
 */

const behaviors = assembleModuleBehaviors(contributeEditorBehaviors)

const customerOption = {
  id: '1001',
  value: '1001',
  label: '客户甲',
  customerCode: 'KH001',
  customerName: '客户甲',
  defaultSettlementCompanyId: '2001',
  defaultSettlementCompanyName: '客户默认主体',
} as unknown as CustomerOption

function projectOption(overrides: Partial<ProjectOption> = {}): ProjectOption {
  return {
    id: '3001',
    value: '3001',
    label: '项目甲',
    customerId: '1001',
    projectCode: 'XM001',
    projectName: '项目甲',
    allowedBrands: [],
    allowedMaterials: [],
    ...overrides,
  }
}

function syncEditorForm(
  moduleKey: ModuleKey,
  editorForm: ModuleRecordInput,
  changedKeys: string[],
): ModuleRecordInput {
  const behavior = behaviors.get(moduleKey)
  if (!behavior?.syncEditorForm) {
    throw new Error(`${moduleKey} 缺少 syncEditorForm 行为`)
  }
  behavior.syncEditorForm(editorForm, {
    changedKeys: new Set(changedKeys),
  })
  return editorForm
}

describe('项目资料是单据结算主体的唯一来源', () => {
  it('销售订单选择项目时写入项目结算主体快照', () => {
    vi.mocked(findProjectOption).mockReturnValue(
      projectOption({
        settlementCompanyId: '2002',
        settlementCompanyName: '项目主体乙',
      }),
    )

    const editorForm = syncEditorForm(
      'sales-order',
      { customerId: '1001', projectId: '3001' },
      ['projectId'],
    )

    expect(editorForm.projectId).toBe('3001')
    expect(editorForm.projectName).toBe('项目甲')
    expect(editorForm.settlementCompanyId).toBe('2002')
    expect(editorForm.settlementCompanyName).toBe('项目主体乙')
  })

  it('项目未维护结算主体时清空，不回退客户默认主体', () => {
    vi.mocked(findCustomerOption).mockReturnValue(customerOption)
    vi.mocked(findProjectOption).mockReturnValue(projectOption())

    const editorForm = syncEditorForm(
      'sales-order',
      {
        customerId: '1001',
        projectId: '3001',
        settlementCompanyId: '2001',
        settlementCompanyName: '客户默认主体',
      },
      ['projectId'],
    )

    expect(editorForm.settlementCompanyId).toBe('')
    expect(editorForm.settlementCompanyName).toBe('')
  })

  it('销售订单切换客户后清空项目与项目带出的结算主体', () => {
    vi.mocked(findCustomerOption).mockReturnValue(customerOption)

    const editorForm = syncEditorForm(
      'sales-order',
      {
        customerId: '1001',
        projectId: '3001',
        projectName: '项目甲',
        settlementCompanyId: '2002',
        settlementCompanyName: '项目主体乙',
      },
      ['customerId'],
    )

    expect(editorForm.customerCode).toBe('KH001')
    expect(editorForm.projectId).toBe('')
    expect(editorForm.projectName).toBe('')
    expect(editorForm.settlementCompanyId).toBe('')
    expect(editorForm.settlementCompanyName).toBe('')
  })
})

describe('项目资料表单选择客户不带出结算主体', () => {
  it('选择客户只同步客户快照，保留手选的结算主体', () => {
    vi.mocked(findCustomerOption).mockReturnValue(customerOption)

    const editorForm = syncEditorForm(
      'project',
      {
        customerId: '1001',
        settlementCompanyId: '2003',
        settlementCompanyName: '手选主体丙',
      },
      ['customerId'],
    )

    expect(editorForm.customerCode).toBe('KH001')
    // 客户资料不再带默认主体：手选值必须原样保留
    expect(editorForm.settlementCompanyId).toBe('2003')
    expect(editorForm.settlementCompanyName).toBe('手选主体丙')
  })

  it('清空客户时清掉结算主体（项目上下文已失效）', () => {
    const editorForm = syncEditorForm(
      'project',
      {
        customerId: '',
        settlementCompanyId: '2003',
        settlementCompanyName: '手选主体丙',
      },
      ['customerId'],
    )

    expect(editorForm.customerId).toBe('')
    expect(editorForm.customerCode).toBe('')
    expect(editorForm.settlementCompanyId).toBe('')
    expect(editorForm.settlementCompanyName).toBe('')
  })
})

describe('收款单客户分支不再按客户默认主体回填', () => {
  it('切换客户时保留手选结算主体', () => {
    vi.mocked(findCustomerOption).mockReturnValue(customerOption)

    const editorForm = syncEditorForm(
      'receipt',
      {
        counterpartyType: '客户',
        counterpartyId: '1001',
        settlementCompanyId: '2003',
        settlementCompanyName: '手选主体丙',
      },
      ['counterpartyId'],
    )

    expect(editorForm.customerId).toBe('1001')
    expect(editorForm.customerCode).toBe('KH001')
    expect(editorForm.settlementCompanyId).toBe('2003')
    expect(editorForm.settlementCompanyName).toBe('手选主体丙')
  })

  it('清空客户时清掉结算主体', () => {
    const editorForm = syncEditorForm(
      'receipt',
      {
        counterpartyType: '客户',
        counterpartyId: '',
        settlementCompanyId: '2003',
        settlementCompanyName: '手选主体丙',
      },
      ['counterpartyId'],
    )

    expect(editorForm.customerId).toBe('')
    expect(editorForm.settlementCompanyId).toBe('')
    expect(editorForm.settlementCompanyName).toBe('')
  })
})
