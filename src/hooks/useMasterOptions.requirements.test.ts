import { describe, expect, it } from 'vitest'
import '@/i18n'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import { resolveMasterOptionRequirements } from '@/hooks/useMasterOptions'
import {
  readMasterOptionRequirements,
  tagMasterOptionRequirements,
} from '@/module-system/core/master-option-requirement-tag'
import {
  getCustomerOptions,
  getCustomerProjectOptions,
} from '@/module-system/core/module-option-resolvers'

/**
 * 主数据需求判定的回归测试。
 *
 * <p>背景：字段 `options` 与解析器的**函数引用相等**判定在打包产物里会失效——同一模块被拆进多个
 * chunk、或浏览器在发版窗口内混用新旧 chunk 时会产生两个函数对象，判定静默为 false，
 * 结果是「项目下拉永远为空，且前后端都不报错」。因此改为读取函数上的全局 Symbol 标记，
 * 引用相等仅作兜底。</p>
 */

const optionDefinition = (options: unknown) =>
  ({ key: 'projectId', label: '', type: 'select', options }) as never

describe('主数据需求判定（打包安全）', () => {
  it('销售订单表单判定为需要客户与项目主数据', () => {
    const requirements = resolveMasterOptionRequirements(
      salesOrdersPageConfig.formFields,
    )

    expect(requirements.customers).toBe(true)
    expect(requirements.projects).toBe(true)
  })

  it('解析器带打包安全标记', () => {
    expect(readMasterOptionRequirements(getCustomerProjectOptions)).toEqual([
      'customers',
      'projects',
    ])
    expect(readMasterOptionRequirements(getCustomerOptions)).toEqual([
      'customers',
    ])
  })

  it('解析器被复制成另一个函数对象时仍能判定需求（不再依赖引用相等）', () => {
    // 模拟打包分块复制：函数体不同、对象不同，只保留同一个全局 Symbol 标记。
    const duplicatedResolver = tagMasterOptionRequirements(
      function duplicatedCustomerProjectOptions() {
        return []
      },
      ['customers', 'projects'],
    )
    expect(duplicatedResolver).not.toBe(getCustomerProjectOptions)

    const requirements = resolveMasterOptionRequirements([
      optionDefinition(duplicatedResolver),
    ])

    expect(requirements.customers).toBe(true)
    expect(requirements.projects).toBe(true)
  })

  it('未打标记的普通解析器不会误判需求', () => {
    const requirements = resolveMasterOptionRequirements([
      optionDefinition(() => []),
    ])

    expect(requirements.customers).toBe(false)
    expect(requirements.projects).toBe(false)
  })

  it('字段上的显式声明仍生效（不依赖解析器标记）', () => {
    const requirements = resolveMasterOptionRequirements([
      {
        key: 'projectId',
        label: '',
        type: 'select',
        options: () => [],
        masterOptionRequirements: { customers: true, projects: true },
      } as never,
    ])

    expect(requirements.customers).toBe(true)
    expect(requirements.projects).toBe(true)
  })
})
