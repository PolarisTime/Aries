import { reactive, ref } from 'vue'
import type { Table } from '@tanstack/vue-table'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { useModuleGridPanelBindings } from '../use-module-grid-panel-bindings'

function createConfig(): ModulePageConfig {
  return {
    key: 'sales-orders',
    title: '销售订单',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  }
}

describe('useModuleGridPanelBindings', () => {
  it('applies and searches immediately when a list select filter changes', () => {
    const handleFilterValueChange = vi.fn()
    const handleSearch = vi.fn()
    const pagination = reactive({ currentPage: 2, pageSize: 20 })

    const { gridPanelEvents } = useModuleGridPanelBindings({
      moduleKey: ref('sales-orders'),
      config: ref(createConfig()),
      isReadOnly: ref(false),
      readOnlyAlertActionLink: ref(null),
      filters: reactive({}),
      visibleFilters: ref([]),
      quickFilters: ref([]),
      activeQuickFilterKey: ref(''),
      hasAdvancedFilters: ref(false),
      searchExpanded: ref(false),
      tableErrorMessage: ref(''),
      masterTableSummary: ref(''),
      visibleToolbarActions: ref([]),
      exportMenuItems: ref([]),
      exportLoading: ref(false),
      isMaterialModule: ref(false),
      canExportRecords: ref(false),
      canImportMaterials: ref(false),
      columnSettingItems: ref([]),
      getColumnSettingItemClass: vi.fn(() => ''),
      handleColumnSettingDragStart: vi.fn(),
      handleColumnSettingDragOver: vi.fn(),
      handleColumnSettingDrop: vi.fn(),
      resetListColumnSettingDragState: vi.fn(),
      handleColumnVisibleChange: vi.fn(),
      resetColumnSettings: vi.fn(),
      mainTable: {} as Table<ModuleRecord>,
      tableLoading: ref(false),
      getRowClassName: vi.fn(() => ''),
      rowProps: vi.fn(() => ({ onDblclick: vi.fn() })),
      hasExpandableRows: ref(false),
      rowActionsRenderer: vi.fn(() => null),
      expandedRowRenderer: vi.fn(() => null),
      pagination,
      paginationTotal: ref(0),
      navigateTo: vi.fn(),
      applyQuickFilter: vi.fn(),
      setFilterValue: vi.fn(),
      handleFilterValueChange,
      handleSearch,
      handleReset: vi.fn(),
      clearTableError: vi.fn(),
      handleAction: vi.fn(),
      handleExportMenuClick: vi.fn(),
      handleMaterialTemplateDownload: vi.fn(),
      handleMaterialImportClick: vi.fn(),
    })

    gridPanelEvents.filterChange()

    expect(handleFilterValueChange).toHaveBeenCalledTimes(1)
    expect(handleSearch).toHaveBeenCalledTimes(1)
    expect(handleFilterValueChange.mock.invocationCallOrder[0])
      .toBeLessThan(handleSearch.mock.invocationCallOrder[0])
  })

  it('uses camelCase event keys for v-on object listeners', () => {
    const setFilterValue = vi.fn()
    const pagination = reactive({ currentPage: 2, pageSize: 20 })

    const { gridPanelEvents } = useModuleGridPanelBindings({
      moduleKey: ref('sales-orders'),
      config: ref(createConfig()),
      isReadOnly: ref(false),
      readOnlyAlertActionLink: ref(null),
      filters: reactive({}),
      visibleFilters: ref([]),
      quickFilters: ref([]),
      activeQuickFilterKey: ref(''),
      hasAdvancedFilters: ref(false),
      searchExpanded: ref(false),
      tableErrorMessage: ref(''),
      masterTableSummary: ref(''),
      visibleToolbarActions: ref([]),
      exportMenuItems: ref([]),
      exportLoading: ref(false),
      isMaterialModule: ref(false),
      canExportRecords: ref(false),
      canImportMaterials: ref(false),
      columnSettingItems: ref([]),
      getColumnSettingItemClass: vi.fn(() => ''),
      handleColumnSettingDragStart: vi.fn(),
      handleColumnSettingDragOver: vi.fn(),
      handleColumnSettingDrop: vi.fn(),
      resetListColumnSettingDragState: vi.fn(),
      handleColumnVisibleChange: vi.fn(),
      resetColumnSettings: vi.fn(),
      mainTable: {} as Table<ModuleRecord>,
      tableLoading: ref(false),
      getRowClassName: vi.fn(() => ''),
      rowProps: vi.fn(() => ({ onDblclick: vi.fn() })),
      hasExpandableRows: ref(false),
      rowActionsRenderer: vi.fn(() => null),
      expandedRowRenderer: vi.fn(() => null),
      pagination,
      paginationTotal: ref(0),
      navigateTo: vi.fn(),
      applyQuickFilter: vi.fn(),
      setFilterValue,
      handleFilterValueChange: vi.fn(),
      handleSearch: vi.fn(),
      handleReset: vi.fn(),
      clearTableError: vi.fn(),
      handleAction: vi.fn(),
      handleExportMenuClick: vi.fn(),
      handleMaterialTemplateDownload: vi.fn(),
      handleMaterialImportClick: vi.fn(),
    })

    gridPanelEvents.updateFilter('status', '已审核')

    expect(setFilterValue).toHaveBeenCalledWith('status', '已审核')
    expect('update-filter' in gridPanelEvents).toBe(false)
  })

  it('passes row props through to the grid panel', () => {
    const rowProps = vi.fn((record: ModuleRecord) => ({ title: String(record.id || '') }))
    const pagination = reactive({ currentPage: 1, pageSize: 20 })

    const { gridPanelProps } = useModuleGridPanelBindings({
      moduleKey: ref('sales-outbounds'),
      config: ref(createConfig()),
      isReadOnly: ref(false),
      readOnlyAlertActionLink: ref(null),
      filters: reactive({}),
      visibleFilters: ref([]),
      quickFilters: ref([]),
      activeQuickFilterKey: ref(''),
      hasAdvancedFilters: ref(false),
      searchExpanded: ref(false),
      tableErrorMessage: ref(''),
      masterTableSummary: ref(''),
      visibleToolbarActions: ref([]),
      exportMenuItems: ref([]),
      exportLoading: ref(false),
      isMaterialModule: ref(false),
      canExportRecords: ref(false),
      canImportMaterials: ref(false),
      columnSettingItems: ref([]),
      getColumnSettingItemClass: vi.fn(() => ''),
      handleColumnSettingDragStart: vi.fn(),
      handleColumnSettingDragOver: vi.fn(),
      handleColumnSettingDrop: vi.fn(),
      resetListColumnSettingDragState: vi.fn(),
      handleColumnVisibleChange: vi.fn(),
      resetColumnSettings: vi.fn(),
      mainTable: {} as Table<ModuleRecord>,
      tableLoading: ref(false),
      getRowClassName: vi.fn(() => ''),
      rowProps,
      hasExpandableRows: ref(false),
      rowActionsRenderer: vi.fn(() => null),
      expandedRowRenderer: vi.fn(() => null),
      pagination,
      paginationTotal: ref(0),
      navigateTo: vi.fn(),
      applyQuickFilter: vi.fn(),
      setFilterValue: vi.fn(),
      handleFilterValueChange: vi.fn(),
      handleSearch: vi.fn(),
      handleReset: vi.fn(),
      clearTableError: vi.fn(),
      handleAction: vi.fn(),
      handleExportMenuClick: vi.fn(),
      handleMaterialTemplateDownload: vi.fn(),
      handleMaterialImportClick: vi.fn(),
    })

    expect(gridPanelProps.value.rowProps).toBe(rowProps)
  })
})
