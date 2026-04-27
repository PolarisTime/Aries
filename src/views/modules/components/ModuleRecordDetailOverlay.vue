<script setup lang="ts">
import { toRef, type Ref } from 'vue'
import type {
  ModuleColumnDefinition,
  ModuleDetailField,
  ModuleRecord,
} from '@/types/module-page'
import { useModuleDisplaySupport, type StatusMeta } from '@/composables/use-module-display-support'

type TableColumn = Record<string, unknown>
type TableScroll = Record<string, unknown>
type TableColumnLike = {
  key?: unknown
  dataIndex?: unknown
}

function getTableColumnKey(column: TableColumnLike) {
  return typeof column.key === 'string' || typeof column.key === 'number'
    ? String(column.key)
    : ''
}

function getTableColumnDataIndex(column: TableColumnLike) {
  if (typeof column.dataIndex === 'string' || typeof column.dataIndex === 'number') {
    return String(column.dataIndex)
  }
  return ''
}

function getTableCellValue(record: Record<string, unknown>, column: TableColumnLike) {
  const dataIndex = getTableColumnDataIndex(column)
  return dataIndex ? record[dataIndex] : undefined
}

function getItemColumnMeta(itemColumns: ModuleColumnDefinition[] | undefined, column: TableColumnLike) {
  const key = getTableColumnKey(column)
  return itemColumns?.find((item) => item.dataIndex === key)
}

function getDetailSummaryCellValue(column: TableColumnLike) {
  const key = getTableColumnKey(column)
  const firstColumnKey = getTableColumnKey(props.detailTableColumns[0] || {})
  const items = props.activeRecord?.items || []

  if (key === firstColumnKey) {
    return '合计'
  }
  if (key === 'quantity') {
    return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toFixed(0)
  }
  if (key === 'weightTon') {
    return display.formatWeight(items.reduce((sum, item) => sum + Number(item.weightTon || 0), 0))
  }
  if (key === 'amount' && props.shouldShowItemAmountSummary) {
    return display.formatAmount(items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
  }
  return ''
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
  statusMap: Record<string, StatusMeta>
}>()

const display = useModuleDisplaySupport(toRef(props, 'statusMap') as Ref<Record<string, StatusMeta>>)

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
                  吨位
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
                吨位
                {{ display.formatWeight((activeRecord?.items || []).reduce((sum, item) => sum + Number(item.weightTon || 0), 0)) }}
              </span>
              <span v-if="shouldShowItemAmountSummary">
                金额
                {{ display.formatAmount((activeRecord?.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)) }}
              </span>
            </div>
          </div>
          <a-table
            v-if="activeRecord?.items?.length"
            size="small"
            bordered
            row-key="id"
            :columns="detailTableColumns"
            :data-source="activeRecord.items || []"
            :pagination="false"
            :scroll="detailTableScroll"
            class="module-detail-table"
          >
            <template #bodyCell="{ column, record }">
              <template
                v-if="getItemColumnMeta(itemColumns, column)?.type === 'status'"
              >
                <a-tag :color="display.getStatusMeta(getTableCellValue(record, column)).color">
                  {{ display.getStatusMeta(getTableCellValue(record, column)).text }}
                </a-tag>
              </template>
              <template v-else>
                {{
                  display.formatCellValue(
                    getItemColumnMeta(itemColumns, column),
                    getTableCellValue(record, column),
                  )
                }}
              </template>
            </template>
            <template #summary>
              <a-table-summary-row>
                <a-table-summary-cell
                  v-for="(column, index) in detailTableColumns"
                  :key="getTableColumnKey(column)"
                  :index="index"
                  :align="column.align"
                >
                  {{ getDetailSummaryCellValue(column) }}
                </a-table-summary-cell>
              </a-table-summary-row>
            </template>
          </a-table>
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
