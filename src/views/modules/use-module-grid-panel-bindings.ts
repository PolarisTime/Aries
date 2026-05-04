import { computed, type Ref, type VNodeChild } from 'vue'
import type { Table } from '@tanstack/vue-table'
import type { MenuProps } from 'ant-design-vue'
import type {
  ModuleActionDefinition,
  ModuleFilterDefinition,
  ModulePageConfig,
  ModuleQuickFilterDefinition,
  ModuleRecord,
} from '@/types/module-page'

type ExportMenuItems = NonNullable<MenuProps['items']>
type SettingItem = { key: string; title: string; visible: boolean }
type PaginationState = {
  currentPage: number
  pageSize: number
}

interface UseModuleGridPanelBindingsOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  isReadOnly: Ref<boolean>
  readOnlyAlertActionLink: Ref<{ text: string; to: string } | null>
  filters: Record<string, unknown>
  visibleFilters: Ref<ModuleFilterDefinition[]>
  quickFilters: Ref<ModuleQuickFilterDefinition[]>
  activeQuickFilterKey: Ref<string>
  hasAdvancedFilters: Ref<boolean>
  searchExpanded: Ref<boolean>
  tableErrorMessage: Ref<string>
  masterTableSummary: Ref<string>
  visibleToolbarActions: Ref<ModuleActionDefinition[]>
  exportMenuItems: Ref<ExportMenuItems>
  exportLoading: Ref<boolean>
  isMaterialModule: Ref<boolean>
  canExportRecords: Ref<boolean>
  canImportMaterials: Ref<boolean>
  columnSettingItems: Ref<SettingItem[]>
  getColumnSettingItemClass: (key: string) => string
  handleColumnSettingDragStart: (key: string, event: DragEvent) => void
  handleColumnSettingDragOver: (key: string, event: DragEvent) => void
  handleColumnSettingDrop: (key: string) => void
  resetListColumnSettingDragState: () => void
  handleColumnVisibleChange: (key: string, checked: boolean) => void
  resetColumnSettings: () => void
  mainTable: Table<ModuleRecord>
  tableLoading: Ref<boolean>
  getRowClassName: (record: ModuleRecord) => string
  hasExpandableRows: Ref<boolean>
  rowActionsRenderer: (record: ModuleRecord) => VNodeChild
  expandedRowRenderer: (record: ModuleRecord) => VNodeChild
  pagination: PaginationState
  paginationTotal: Ref<number>
  navigateTo: (to: string) => unknown
  applyQuickFilter: (filterPreset: ModuleQuickFilterDefinition) => void
  setFilterValue: (key: string, value: unknown) => void
  handleFilterValueChange: () => void
  handleSearch: () => void
  handleReset: () => void
  clearTableError: () => void
  handleAction: (label: string) => void | Promise<void>
  handleExportMenuClick: (payload: { key: string }) => void | Promise<void>
  handleMaterialTemplateDownload: () => void | Promise<void>
  handleMaterialImportClick: () => void
}

export function useModuleGridPanelBindings(options: UseModuleGridPanelBindingsOptions) {
  const gridPanelProps = computed(() => ({
    moduleKey: options.moduleKey.value,
    isReadOnly: options.isReadOnly.value,
    readOnlyDescription: options.config.value.description,
    alertActionLink: options.readOnlyAlertActionLink.value,
    filters: options.filters,
    visibleFilters: options.visibleFilters.value,
    quickFilters: options.quickFilters.value,
    activeQuickFilterKey: options.activeQuickFilterKey.value,
    hasAdvancedFilters: options.hasAdvancedFilters.value,
    searchExpanded: options.searchExpanded.value,
    tableErrorMessage: options.tableErrorMessage.value,
    title: options.config.value.title,
    summary: options.masterTableSummary.value,
    actions: options.visibleToolbarActions.value,
    exportMenuItems: options.exportMenuItems.value,
    exportLoading: options.exportLoading.value,
    isMaterialModule: options.isMaterialModule.value,
    canExportRecords: options.canExportRecords.value,
    canImportMaterials: options.canImportMaterials.value,
    columnSettingItems: options.columnSettingItems.value,
    getColumnSettingItemClass: options.getColumnSettingItemClass,
    handleColumnSettingDragStart: options.handleColumnSettingDragStart,
    handleColumnSettingDragOver: options.handleColumnSettingDragOver,
    handleColumnSettingDrop: options.handleColumnSettingDrop,
    resetListColumnSettingDragState: options.resetListColumnSettingDragState,
    handleColumnVisibleChange: options.handleColumnVisibleChange,
    resetColumnSettings: options.resetColumnSettings,
    mainTable: options.mainTable,
    tableLoading: options.tableLoading.value,
    getRowClassName: options.getRowClassName,
    hasExpandableRows: options.hasExpandableRows.value,
    rowActionsRenderer: options.rowActionsRenderer,
    expandedRowRenderer: options.expandedRowRenderer,
    paginationCurrentPage: options.pagination.currentPage,
    paginationPageSize: options.pagination.pageSize,
    paginationTotal: options.paginationTotal.value,
  }))

  const gridPanelEvents = {
    alertAction: (to: string) => {
      void options.navigateTo(to)
    },
    applyQuickFilter: options.applyQuickFilter,
    updateFilter: options.setFilterValue,
    filterChange: () => {
      options.handleFilterValueChange()
      options.handleSearch()
    },
    updateSearchExpanded: (value: boolean) => {
      options.searchExpanded.value = value
    },
    search: options.handleSearch,
    reset: options.handleReset,
    clearTableError: options.clearTableError,
    action: options.handleAction,
    exportMenuClick: (key: string) => {
      void options.handleExportMenuClick({ key })
    },
    materialTemplateDownload: options.handleMaterialTemplateDownload,
    materialImportClick: options.handleMaterialImportClick,
    paginationChange: (page: number, size: number) => {
      options.pagination.currentPage = page
      options.pagination.pageSize = size
    },
  }

  return {
    gridPanelEvents,
    gridPanelProps,
  }
}
