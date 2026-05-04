import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { useModuleFilters } from '../use-module-filters'

function createConfig(defaultVisibleFilterCount?: number): ModulePageConfig {
  return {
    key: 'sales-orders',
    title: '销售订单',
    kicker: '',
    description: '',
    filters: [
      { key: 'keyword', label: '订单编号', type: 'input' },
      { key: 'status', label: '状态', type: 'select' },
      { key: 'deliveryDate', label: '送货日期', type: 'dateRange' },
      { key: 'customerName', label: '客户', type: 'select', row: 2 },
      { key: 'projectName', label: '项目名称', type: 'select', row: 2 },
    ],
    defaultVisibleFilterCount,
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  }
}

describe('useModuleFilters', () => {
  it('uses the module configured default visible filter count', () => {
    const filters = useModuleFilters({
      config: ref(createConfig(5)),
      setCurrentPage: vi.fn(),
    })

    expect(filters.visibleFilters.value.map((filter) => filter.key)).toEqual([
      'keyword',
      'status',
      'deliveryDate',
      'customerName',
      'projectName',
    ])
    expect(filters.hasAdvancedFilters.value).toBe(false)
  })

  it('falls back to three visible filters when no module override is configured', () => {
    const filters = useModuleFilters({
      config: ref(createConfig()),
      setCurrentPage: vi.fn(),
    })

    expect(filters.visibleFilters.value.map((filter) => filter.key)).toEqual([
      'keyword',
      'status',
      'deliveryDate',
    ])
    expect(filters.hasAdvancedFilters.value).toBe(true)
  })

  it('keeps selected values when dynamic select options are not loaded yet', () => {
    const filters = useModuleFilters({
      config: ref({
        ...createConfig(),
        filters: [
          { key: 'customerName', label: '客户', type: 'select', options: () => [] },
        ],
      }),
      setCurrentPage: vi.fn(),
    })

    filters.setFilterValue('customerName', '客户甲')
    filters.handleFilterValueChange()

    expect(filters.filters.customerName).toBe('客户甲')
  })

  it('clears selected values that are not in loaded select options', () => {
    const filters = useModuleFilters({
      config: ref({
        ...createConfig(),
        filters: [
          {
            key: 'status',
            label: '状态',
            type: 'select',
            options: [{ label: '已审核', value: '已审核' }],
          },
        ],
      }),
      setCurrentPage: vi.fn(),
    })

    filters.setFilterValue('status', '草稿')
    filters.handleFilterValueChange()

    expect(filters.filters.status).toBe('')
  })
})
