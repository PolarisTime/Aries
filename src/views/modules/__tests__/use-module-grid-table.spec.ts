import { computed, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleColumnDefinition, ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { useModuleGridTable } from '../use-module-grid-table'

function createConfig(columns: ModuleColumnDefinition[]): ModulePageConfig {
  return {
    key: 'freight-bills',
    title: '物流单',
    kicker: '',
    description: '',
    filters: [],
    columns,
    detailFields: [],
    itemColumns: [],
    data: [],
    buildOverview: () => [],
  }
}

describe('useModuleGridTable', () => {
  it('stores selected current-page records when rows are selected', async () => {
    const columns = [{ title: '物流单号', dataIndex: 'billNo', width: 140 }]
    const rows = ref<ModuleRecord[]>([
      { id: 'fb-1', billNo: 'FB-001', carrierName: '顺丰物流' },
      { id: 'fb-2', billNo: 'FB-002', carrierName: '顺丰物流' },
    ])
    const grid = useModuleGridTable({
      moduleKey: ref('freight-bills'),
      config: ref(createConfig(columns)),
      listRows: rows,
      canViewRecords: ref(true),
      canEditItemColumns: ref(false),
      isReadOnly: ref(false),
      visibleConfigColumns: computed(() => columns),
      columnMetaMap: computed(() => ({
        billNo: columns[0],
      })),
      editorColumnSettingItems: ref([]),
      formatCellValue: (_column, value) => String(value ?? ''),
      getStatusMeta: (value) => ({ text: String(value ?? ''), color: 'default' }),
      isSuccessCode: (code) => code === 0,
      showRequestError: vi.fn(),
    })

    grid.mainTable.getRowModel().rows[0]?.toggleSelected(true)
    await nextTick()

    expect(grid.selectedRowKeys.value).toEqual(['fb-1'])
    expect(grid.selectedRowMap.value['fb-1']).toBe(rows.value[0])
  })
})
