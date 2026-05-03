<script setup lang="ts">
import { computed, h, toRef, type Ref } from 'vue'
import { type ColumnDef } from '@tanstack/vue-table'
import type {
  ModuleColumnDefinition,
  ModuleDetailField,
  ModuleLineItem,
  ModuleRecord,
} from '@/types/module-page'
import { useModuleDisplaySupport, type StatusMeta } from '@/composables/use-module-display-support'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'
import ColumnSettingsPopover from './ColumnSettingsPopover.vue'

type TableColumn = Record<string, unknown>
type TableScroll = Record<string, unknown>
type TableColumnLike = {
  key?: unknown
  dataIndex?: unknown
}
interface SettingItem {
  key: string
  title: string
  visible: boolean
}

function getTableColumnKey(column: TableColumnLike) {
  return typeof column.key === 'string' || typeof column.key === 'number'
    ? String(column.key)
    : ''
}

function getItemColumnMeta(itemColumns: ModuleColumnDefinition[] | undefined, column: TableColumnLike) {
  const key = getTableColumnKey(column)
  return itemColumns?.find((item) => item.dataIndex === key)
}

const props = defineProps<{
  visible: boolean
  title: string
  detailFields: ModuleDetailField[]
  itemColumns?: ModuleColumnDefinition[] | undefined
  activeRecord: ModuleRecord | null
  canPrintRecords: boolean
  detailPrintLoading: boolean
  shouldShowItemAmountSummary: boolean
  detailTableColumns: TableColumn[]
  detailTableScroll: TableScroll
  canEditItemColumns: boolean
  editorColumnSettingItems: SettingItem[]
  getEditorColumnSettingItemClass: (key: string) => string
  handleEditorColumnSettingDragStart: (key: string, event: DragEvent) => void
  handleEditorColumnSettingDragOver: (key: string, event: DragEvent) => void
  handleEditorColumnSettingDrop: (key: string) => void
  resetEditorColumnSettingDragState: () => void
  handleEditorColumnVisibleChange: (key: string, checked: boolean) => void
  resetEditorColumnSettings: () => void
  statusMap: Record<string, StatusMeta>
}>()

const display = useModuleDisplaySupport(toRef(props, 'statusMap') as Ref<Record<string, StatusMeta>>)

function toColumnDef(col: Record<string, unknown>): ColumnDef<ModuleLineItem, unknown> {
  const key = String(col.dataIndex || col.key || '')
  const meta = getItemColumnMeta(props.itemColumns, col as TableColumnLike)
  const isStatus = meta?.type === 'status'
  const width = typeof col.width === 'number' ? col.width : undefined
  const align = (col.align as 'left' | 'center' | 'right' | undefined)

  return {
    id: key,
    accessorKey: key,
    header: () => String(col.title || ''),
    cell: isStatus
      ? (info) => {
          const s = display.getStatusMeta(info.getValue())
          return h('span', { class: `ant-tag ant-tag-${s.color}` }, s.text)
        }
      : (info) => display.formatCellValue(meta, info.getValue()),
    meta: { width, align },
  }
}

const detailColumns = computed<ColumnDef<ModuleLineItem, unknown>[]>(() =>
  props.detailTableColumns.map(toColumnDef),
)

const { table: detailTable } = useDataTable({
  data: computed(() => (props.activeRecord?.items || []) as ModuleLineItem[]),
  columns: detailColumns,
  getRowId: (row) => String(row.id ?? ''),
  manualPagination: false,
  enableSorting: false,
})

defineEmits<{
  close: []
  print: [preview: boolean]
}>()
</script>

<template>
  <div v-if="visible" class="workspace-overlay">
    <div class="workspace-overlay-mask"></div>
    <section class="workspace-overlay-panel">
      <header class="workspace-overlay-header">
        <span class="workspace-overlay-title">{{ title }}</span>
      </header>

      <div class="workspace-overlay-body bill-detail-body">
        <a-row class="bill-detail-row" :gutter="16">
          <a-col
            v-for="field in detailFields"
            :key="field.key"
            :xs="24"
            :sm="12"
            :lg="8"
            class="bill-detail-col"
          >
            <div class="bill-detail-item">
              <span class="bill-detail-label">{{ field.label }}</span>
              <span class="bill-detail-value">{{ display.formatDetailValue(field, activeRecord) }}</span>
            </div>
          </a-col>
        </a-row>

        <template v-if="itemColumns">
          <div class="editor-items-head">
            <div class="editor-items-title-block">
              <h3 class="detail-section-title">明细列表</h3>
            </div>
            <div class="editor-items-actions">
              <a-button class="overlay-action-button" @click="$emit('close')">关闭</a-button>
              <ColumnSettingsPopover
                v-if="canEditItemColumns"
                label="明细列设置"
                :items="editorColumnSettingItems"
                :get-item-class="getEditorColumnSettingItemClass"
                :on-drag-start="handleEditorColumnSettingDragStart"
                :on-drag-over="handleEditorColumnSettingDragOver"
                :on-drop="handleEditorColumnSettingDrop"
                :on-drag-end="resetEditorColumnSettingDragState"
                :on-visible-change="handleEditorColumnVisibleChange"
                :on-reset="resetEditorColumnSettings"
              />
              <a-button
                v-if="canPrintRecords"
                class="overlay-action-button"
                :loading="detailPrintLoading"
                @click="$emit('print', true)"
              >
                打印预览
              </a-button>
              <a-button
                v-if="canPrintRecords"
                type="primary"
                class="overlay-action-button"
                :loading="detailPrintLoading"
                @click="$emit('print', false)"
              >
                直接打印
              </a-button>
              <div class="editor-items-summary editor-items-summary-inline">
                <span>明细数 {{ activeRecord?.items?.length || 0 }}</span>
                <span>
                  总重量（吨）
                  {{ display.formatWeight((activeRecord?.items || []).reduce((sum, item) => sum + Number(item.weightTon || 0), 0)) }}
                </span>
                <span v-if="shouldShowItemAmountSummary">
                  金额
                  {{ display.formatAmount((activeRecord?.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)) }}
                </span>
              </div>
            </div>
            <div class="editor-items-summary editor-items-summary-mobile">
              <span>明细数 {{ activeRecord?.items?.length || 0 }}</span>
              <span>
                总重量（吨）
                {{ display.formatWeight((activeRecord?.items || []).reduce((sum, item) => sum + Number(item.weightTon || 0), 0)) }}
              </span>
              <span v-if="shouldShowItemAmountSummary">
                金额
                {{ display.formatAmount((activeRecord?.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)) }}
              </span>
            </div>
          </div>
          <DataTable
            v-if="activeRecord?.items?.length"
            :table="detailTable"
            size="small"
          />
          <a-empty v-else description="暂无明细数据" />
        </template>
        <div v-else class="editor-items-head editor-items-head-standalone">
          <div class="editor-items-title-block">
            <h3 class="detail-section-title">操作</h3>
          </div>
          <div class="editor-items-actions">
            <a-button class="overlay-action-button" @click="$emit('close')">关闭</a-button>
            <a-button
              v-if="canPrintRecords"
              class="overlay-action-button"
              :loading="detailPrintLoading"
              @click="$emit('print', true)"
            >
              打印预览
            </a-button>
            <a-button
              v-if="canPrintRecords"
              type="primary"
              class="overlay-action-button"
              :loading="detailPrintLoading"
              @click="$emit('print', false)"
            >
              直接打印
            </a-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
