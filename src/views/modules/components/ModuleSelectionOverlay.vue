<script setup lang="ts">
import { computed, h } from 'vue'
import { type ColumnDef, type RowSelectionState, type Updater } from '@tanstack/vue-table'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any
type SelectionMode = 'checkbox' | 'radio'
type RowSelectionConfig = {
  type?: SelectionMode
  selectedRowKeys: (string | number)[]
  onChange: (keys: (string | number)[], rows: AnyRow[]) => void
  getCheckboxProps?: (record: AnyRow) => { disabled?: boolean }
}
type PaginationState = {
  current: number
  pageSize: number
  total: number
  showSizeChanger?: boolean
}

const props = withDefaults(defineProps<{
  visible: boolean
  title: string
  panelTitle: string
  hint?: string
  rows: AnyRow[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<any, any>[]
  loading?: boolean
  rowSelection?: RowSelectionConfig
  pagination?: { pageSize: number; showSizeChanger: boolean; position: string[] } | false
  paginationState?: PaginationState
  scroll?: Record<string, unknown>
  emptyDescription: string
  hideCancel?: boolean
  cancelText?: string
  confirmText?: string
  confirmVisible?: boolean
  confirmDisabled?: boolean
  rowKey?: string
  customRow?: ((record: AnyRow) => Record<string, unknown>) | undefined
}>(), {
  hideCancel: false,
  hint: '',
  loading: false,
  rowSelection: undefined,
  pagination: () => ({ pageSize: 12, showSizeChanger: false, position: ['bottomRight'] }),
  scroll: undefined,
  cancelText: '取消',
  confirmText: '确认',
  confirmVisible: true,
  confirmDisabled: false,
  rowKey: 'id',
  customRow: undefined,
})

const emit = defineEmits<{
  cancel: []
  confirm: []
  'update:paginationCurrent': [value: number]
  'update:paginationPageSize': [value: number]
}>()

const rowKeyFn = (row: AnyRow) => {
  if (!row || typeof row !== 'object') return ''
  return String(row[props.rowKey] ?? '').trim()
}

const selectedKeySet = computed(() =>
  new Set((props.rowSelection?.selectedRowKeys || []).map((key) => String(key))),
)
const selectionMode = computed<SelectionMode>(() => props.rowSelection?.type === 'radio' ? 'radio' : 'checkbox')
const rowSelectionState = computed<RowSelectionState>(() => {
  const result: RowSelectionState = {}
  for (const key of selectedKeySet.value) {
    result[key] = true
  }
  return result
})

function getSelectionProps(record: AnyRow) {
  return props.rowSelection?.getCheckboxProps?.(record) || {}
}

function isSelectionDisabled(record: AnyRow) {
  return Boolean(getSelectionProps(record).disabled)
}

function getSelectedRows(keys: string[]) {
  const keySet = new Set(keys)
  return props.rows.filter((row) => keySet.has(rowKeyFn(row)))
}

function emitSelection(keys: string[]) {
  props.rowSelection?.onChange(keys, getSelectedRows(keys))
}

function toggleRowSelection(record: AnyRow, checked?: boolean) {
  if (!props.rowSelection || isSelectionDisabled(record)) {
    return
  }

  const rowKey = rowKeyFn(record)
  if (!rowKey) {
    return
  }

  if (selectionMode.value === 'radio') {
    emitSelection(checked === false ? [] : [rowKey])
    return
  }

  const nextKeys = new Set((props.rowSelection.selectedRowKeys || []).map((key) => String(key)))
  const shouldSelect = checked ?? !nextKeys.has(rowKey)
  if (shouldSelect) {
    nextKeys.add(rowKey)
  }
  else {
    nextKeys.delete(rowKey)
  }
  emitSelection([...nextKeys])
}

const selectableRowKeys = computed(() =>
  props.rows
    .filter((row) => !isSelectionDisabled(row))
    .map((row) => rowKeyFn(row))
    .filter(Boolean),
)
const allVisibleSelected = computed(() =>
  selectableRowKeys.value.length > 0
  && selectableRowKeys.value.every((key) => selectedKeySet.value.has(key)),
)

function toggleAllVisibleSelections(checked: boolean) {
  if (!props.rowSelection) {
    return
  }

  const nextKeys = new Set((props.rowSelection.selectedRowKeys || []).map((key) => String(key)))
  for (const key of selectableRowKeys.value) {
    if (checked) {
      nextKeys.add(key)
    }
    else {
      nextKeys.delete(key)
    }
  }
  emitSelection([...nextKeys])
}

function stopRowEvent(event: Event) {
  event.stopPropagation()
}

function handleTableRowSelectionChange(updater: Updater<RowSelectionState>) {
  const nextState = typeof updater === 'function' ? updater(rowSelectionState.value) : updater
  emitSelection(Object.keys(nextState).filter((key) => nextState[key]))
}

const selectionColumn = computed<ColumnDef<AnyRow, unknown>>(() => ({
  id: '__selection__',
  header: () => selectionMode.value === 'radio'
    ? ''
    : h('input', {
        type: 'checkbox',
        class: 'leo-data-table-selection-input',
        checked: allVisibleSelected.value,
        disabled: selectableRowKeys.value.length === 0,
        onClick: stopRowEvent,
        onChange: (event: Event) =>
          toggleAllVisibleSelections(Boolean((event.target as HTMLInputElement | null)?.checked)),
      }),
  cell: (info) => {
    const record = info.row.original
    return h('input', {
      type: selectionMode.value,
      class: 'leo-data-table-selection-input',
      checked: selectedKeySet.value.has(rowKeyFn(record)),
      disabled: isSelectionDisabled(record),
      onClick: stopRowEvent,
      onChange: (event: Event) =>
        toggleRowSelection(record, Boolean((event.target as HTMLInputElement | null)?.checked)),
    })
  },
  meta: { width: 48, align: 'center' },
}))

const resolvedColumns = computed<ColumnDef<AnyRow, unknown>[]>(() => {
  const baseColumns = props.columns as ColumnDef<AnyRow, unknown>[]
  return props.rowSelection ? [selectionColumn.value, ...baseColumns] : baseColumns
})

function callRowHandler(handler: unknown, event: MouseEvent) {
  if (typeof handler === 'function') {
    (handler as (event: MouseEvent) => void)(event)
  }
}

function getRowProps(record: AnyRow) {
  const customProps = props.customRow?.(record) || {}
  const onClick = customProps.onClick
  const onDblclick = customProps.onDblclick
  return {
    ...customProps,
    class: [
      props.rowSelection ? 'module-selection-row' : '',
      isSelectionDisabled(record) ? 'module-selection-row-disabled' : '',
      customProps.class,
    ],
    onClick: (event: MouseEvent) => {
      toggleRowSelection(record)
      callRowHandler(onClick, event)
    },
    onDblclick: (event: MouseEvent) => {
      callRowHandler(onDblclick, event)
    },
  }
}

function toScrollSize(value: unknown): string | number | undefined {
  return typeof value === 'number' || typeof value === 'string' ? value : undefined
}

function handlePaginationChange(page: number, pageSize: number) {
  if (pageSize !== props.paginationState?.pageSize) {
    emit('update:paginationPageSize', pageSize)
  }
  if (page !== props.paginationState?.current) {
    emit('update:paginationCurrent', page)
  }
}

function handlePaginationSizeChange(page: number, pageSize: number) {
  emit('update:paginationPageSize', pageSize)
  emit('update:paginationCurrent', page)
}

const tableScrollX = computed(() => toScrollSize(props.scroll?.x))
const tableScrollY = computed(() => toScrollSize(props.scroll?.y) ?? 'var(--app-selection-scroll-y)')
const paginationPageSizeOptions = computed(() => {
  const baseOptions = [10, 20, 50, 100]
  const currentPageSize = Number(props.paginationState?.pageSize || 20)
  const merged = new Set(baseOptions)
  if (Number.isFinite(currentPageSize) && currentPageSize > 0) {
    merged.add(currentPageSize)
  }
  return [...merged]
    .sort((left, right) => left - right)
    .map(String)
})

const { table } = useDataTable({
  data: computed(() => props.rows),
  columns: resolvedColumns,
  getRowId: rowKeyFn,
  manualPagination: props.pagination !== false,
  initialPageSize: props.pagination !== false ? props.pagination.pageSize : 9999,
  enableSorting: false,
  enableRowSelection: (row) => props.rowSelection != null && !isSelectionDisabled(row.original),
  rowSelection: rowSelectionState,
  onRowSelectionChange: handleTableRowSelectionChange,
})
</script>

<template>
  <div v-if="visible" class="workspace-overlay">
    <div class="workspace-overlay-mask"></div>
    <section class="workspace-overlay-panel module-selection-overlay-panel">
      <header class="workspace-overlay-header">
        <span class="workspace-overlay-title">{{ title }}</span>
        <div class="workspace-overlay-header-actions">
          <slot name="header-actions"></slot>
          <a-button v-if="!hideCancel" class="overlay-action-button" @click="$emit('cancel')">{{ cancelText }}</a-button>
          <a-button
            v-if="confirmVisible"
            type="primary"
            class="overlay-action-button"
            :disabled="confirmDisabled"
            @click="$emit('confirm')"
          >
            {{ confirmText }}
          </a-button>
        </div>
      </header>

      <div class="workspace-overlay-body statement-generator-body module-selection-overlay-body">
        <div class="module-table-head">
          <div class="module-table-head-meta statement-generator-meta">
            <slot name="meta">
              <span class="module-table-head-title">{{ panelTitle }}</span>
              <slot name="title-suffix"></slot>
              <span v-if="hint" class="parent-selector-hint">{{ hint }}</span>
            </slot>
          </div>
          <div class="module-table-head-summary statement-generator-summary">
            <slot name="summary"></slot>
          </div>
        </div>

        <div class="module-table-shell statement-generator-table-shell module-selection-table-shell">
          <DataTable
            :table="table"
            size="small"
            :loading="loading"
            :scroll-x="tableScrollX"
            :scroll-y="tableScrollY"
            :empty-text="emptyDescription"
            :row-props="getRowProps"
          />
        </div>

        <div v-if="paginationState && paginationState.total > 0" class="module-selection-pagination">
          <a-pagination
            size="small"
            :current="paginationState.current"
            :page-size="paginationState.pageSize"
            :total="paginationState.total"
            :show-size-changer="paginationState.showSizeChanger ?? false"
            :page-size-options="paginationPageSizeOptions"
            :show-total="(total) => `共 ${total} 条`"
            @change="handlePaginationChange"
            @show-size-change="handlePaginationSizeChange"
          />
        </div>
      </div>

      <footer v-if="!confirmVisible && !hideCancel" class="workspace-overlay-footer">
        <a-button class="overlay-action-button" @click="$emit('cancel')">{{ cancelText }}</a-button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.module-selection-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
