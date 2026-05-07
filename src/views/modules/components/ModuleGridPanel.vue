<script setup lang="ts">
import { computed, defineComponent, type PropType, type VNodeChild } from 'vue'
import type { Table } from '@tanstack/vue-table'
import type { MenuProps } from 'ant-design-vue'
import DataTable from '@/components/DataTable.vue'
import type {
  ModuleActionDefinition,
  ModuleFilterDefinition,
  ModuleQuickFilterDefinition,
  ModuleRecord,
} from '@/types/module-page'
import ModuleFilterToolbar from './ModuleFilterToolbar.vue'
import ModuleTableToolbar from './ModuleTableToolbar.vue'

type ExportMenuItems = NonNullable<MenuProps['items']>
type SettingItem = { key: string; title: string; visible: boolean }
type AlertActionLink = { text: string; to: string }

const RenderNode = defineComponent({
  name: 'RenderNode',
  props: {
    render: {
      type: Function as PropType<() => VNodeChild>,
      required: true,
    },
  },
  setup(props) {
    return () => props.render()
  },
})

const props = defineProps<{
  moduleKey: string
  isReadOnly: boolean
  readOnlyDescription?: string
  alertActionLink?: AlertActionLink | null
  filters: Record<string, unknown>
  visibleFilters: ModuleFilterDefinition[]
  quickFilters: ModuleQuickFilterDefinition[]
  activeQuickFilterKey: string
  hasAdvancedFilters: boolean
  searchExpanded: boolean
  tableErrorMessage: string
  title: string
  summary: string
  actions: ModuleActionDefinition[]
  exportMenuItems: ExportMenuItems
  exportLoading: boolean
  isMaterialModule: boolean
  canExportRecords: boolean
  canImportMaterials: boolean
  columnSettingItems: SettingItem[]
  getColumnSettingItemClass: (key: string) => string
  handleColumnSettingDragStart: (key: string, event: DragEvent) => void
  handleColumnSettingDragOver: (key: string, event: DragEvent) => void
  handleColumnSettingDrop: (key: string) => void
  resetListColumnSettingDragState: () => void
  handleColumnVisibleChange: (key: string, checked: boolean) => void
  resetColumnSettings: () => void
  mainTable: Table<ModuleRecord>
  tableLoading: boolean
  getRowClassName: (record: ModuleRecord) => string
  rowProps?: (record: ModuleRecord) => Record<string, unknown>
  hasExpandableRows: boolean
  rowActionsRenderer: (record: ModuleRecord) => VNodeChild
  expandedRowRenderer: (record: ModuleRecord) => VNodeChild
  paginationCurrentPage: number
  paginationPageSize: number
  paginationTotal: number
}>()

const emit = defineEmits<{
  alertAction: [to: string]
  applyQuickFilter: [filterPreset: ModuleQuickFilterDefinition]
  updateFilter: [key: string, value: unknown]
  filterChange: []
  updateSearchExpanded: [value: boolean]
  search: []
  reset: []
  clearTableError: []
  action: [label: string]
  exportMenuClick: [key: string]
  materialTemplateDownload: []
  materialImportClick: []
  paginationChange: [page: number, size: number]
}>()

const paginationPageSizeOptions = computed(() => {
  const baseOptions = [10, 20, 50, 100]
  const currentPageSize = Number(props.paginationPageSize || 20)
  const merged = new Set(baseOptions)
  if (Number.isFinite(currentPageSize) && currentPageSize > 0) {
    merged.add(currentPageSize)
  }
  return [...merged]
    .sort((left, right) => left - right)
    .map(String)
})
</script>

<template>
  <a-card :bordered="false" class="module-panel-card">
    <a-alert
      v-if="isReadOnly && readOnlyDescription"
      type="info"
      show-icon
      :message="readOnlyDescription"
      style="margin-bottom: 16px"
    >
      <template v-if="alertActionLink" #message>
        {{ readOnlyDescription }}
        <span
          class="table-action-btn"
          style="margin-left: 8px"
          @click="emit('alertAction', alertActionLink.to)"
        >
          {{ alertActionLink.text }}
        </span>
      </template>
    </a-alert>

    <ModuleFilterToolbar
      :module-key="moduleKey"
      :filters="filters"
      :visible-filters="visibleFilters"
      :quick-filters="quickFilters"
      :active-quick-filter-key="activeQuickFilterKey"
      :has-advanced-filters="hasAdvancedFilters"
      :expanded="searchExpanded"
      @apply-quick-filter="emit('applyQuickFilter', $event)"
      @update-filter="(key: string, value: unknown) => emit('updateFilter', key, value)"
      @filter-change="emit('filterChange')"
      @update:expanded="emit('updateSearchExpanded', $event)"
      @search="emit('search')"
      @reset="emit('reset')"
    />

    <a-alert
      v-if="tableErrorMessage"
      type="warning"
      show-icon
      closable
      :message="tableErrorMessage"
      style="margin-bottom: 12px"
      @close="emit('clearTableError')"
    />

    <div class="module-table-shell">
      <ModuleTableToolbar
        :title="title"
        :summary="summary"
        :actions="actions"
        :export-menu-items="exportMenuItems"
        :export-loading="exportLoading"
        :is-material-module="isMaterialModule"
        :can-export="canExportRecords"
        :can-import="canImportMaterials"
        :column-setting-items="columnSettingItems"
        :get-column-setting-item-class="getColumnSettingItemClass"
        :handle-column-setting-drag-start="handleColumnSettingDragStart"
        :handle-column-setting-drag-over="handleColumnSettingDragOver"
        :handle-column-setting-drop="handleColumnSettingDrop"
        :reset-list-column-setting-drag-state="resetListColumnSettingDragState"
        :handle-column-visible-change="handleColumnVisibleChange"
        :reset-column-settings="resetColumnSettings"
        @action="emit('action', $event)"
        @export-menu-click="emit('exportMenuClick', $event)"
        @material-template-download="emit('materialTemplateDownload')"
        @material-import-click="emit('materialImportClick')"
      />

      <DataTable
        :table="mainTable"
        size="middle"
        :loading="tableLoading"
        :row-class="getRowClassName"
        :row-props="rowProps"
        empty-text="当前筛选条件下暂无数据"
      >
        <template #cell-action="{ row }">
          <RenderNode :render="() => rowActionsRenderer(row)" />
        </template>

        <template v-if="hasExpandableRows" #expanded-row="{ row: r }">
          <RenderNode :render="() => expandedRowRenderer(r.original)" />
        </template>
      </DataTable>

      <div style="display: flex; justify-content: flex-end; margin-top: 16px">
        <a-pagination
          :current="paginationCurrentPage"
          :page-size="paginationPageSize"
          :total="paginationTotal"
          show-size-changer
          :page-size-options="paginationPageSizeOptions"
          :show-total="(total: number) => `共 ${total} 条`"
          @change="(page: number, size: number) => emit('paginationChange', page, size)"
        />
      </div>
    </div>
  </a-card>
</template>

<style scoped>
</style>
