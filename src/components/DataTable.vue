<script setup lang="ts" generic="TData">
import './data-table.css'
import { computed, onBeforeUnmount, useSlots } from 'vue'
import { FlexRender, type Table, type Row, type ColumnDef, type Cell } from '@tanstack/vue-table'

const props = withDefaults(defineProps<{
  table: Table<TData>
  loading?: boolean
  bordered?: boolean
  size?: 'small' | 'middle' | 'default'
  rowClass?: (row: TData) => string
  rowProps?: (row: TData) => Record<string, unknown>
  emptyText?: string
  scrollX?: string | number
  scrollY?: string | number
}>(), {
  loading: false,
  bordered: true,
  size: 'default',
  rowClass: undefined,
  rowProps: undefined,
  scrollX: undefined,
  scrollY: undefined,
  emptyText: '暂无数据',
})

const slots = useSlots()
const ROW_DOUBLE_CLICK_DELAY_MS = 220

type PendingRowClick = {
  rowId: string
  callback: () => void
  timerId: ReturnType<typeof setTimeout>
}

let pendingRowClick: PendingRowClick | null = null

function getCellSlot(columnId: string): ((props: { row: TData; cell: Cell<TData, unknown> }) => unknown) | undefined {
  const slot = slots[`cell-${columnId}`]
  if (!slot) return undefined
  return ((scope: { row: TData; cell: Cell<TData, unknown> }) => slot(scope)) as unknown as (props: { row: TData; cell: Cell<TData, unknown> }) => unknown
}

const wrapperClass = computed(() => ({
  'leo-data-table-wrapper': true,
  'leo-data-table-bordered': props.bordered,
  'leo-data-table-small': props.size === 'small',
  'leo-data-table-middle': props.size === 'middle',
}))

const scrollStyle = computed(() => ({
  ...(props.scrollX ? { overflowX: 'auto' as const } : {}),
  ...(props.scrollY ? { maxHeight: typeof props.scrollY === 'number' ? `${props.scrollY}px` : props.scrollY, overflowY: 'auto' as const } : {}),
}))

function thClass(header: ReturnType<Table<TData>['getFlatHeaders']>[number]) {
  const col = header.column
  const meta = getColumnMeta(col.columnDef)
  return {
    'leo-data-table-th': true,
    'leo-data-table-sticky-left': meta.fixed === 'left',
    'leo-data-table-sortable': col.getCanSort(),
    [`leo-data-table-align-${meta.align || 'left'}`]: true,
    'leo-data-table-sorted-asc': col.getIsSorted() === 'asc',
    'leo-data-table-sorted-desc': col.getIsSorted() === 'desc',
  }
}

function tdClass(cell: ReturnType<Row<TData>['getVisibleCells']>[number]) {
  const meta = getColumnMeta(cell.column.columnDef)
  return {
    'leo-data-table-td': true,
    'leo-data-table-sticky-left': meta.fixed === 'left',
    [`leo-data-table-align-${meta.align || 'left'}`]: true,
    'leo-data-table-cell-ellipsis': meta.ellipsis === true,
  }
}

function getRowClasses(row: Row<TData>) {
  const canSelect = row.getCanSelect()
  const classes: Record<string, boolean> = {
    'leo-data-table-row': true,
    'leo-data-table-row-selectable': canSelect,
    'leo-data-table-row-selected': row.getIsSelected(),
  }
  if (props.rowClass) {
    const custom = props.rowClass(row.original)
    if (custom) classes[custom] = true
  }
  if (row.getIsExpanded()) {
    classes['leo-data-table-row-expanded'] = true
  }
  return classes
}

function getRowAttrs(row: Row<TData>) {
  const customProps = props.rowProps?.(row.original) || {}
  const customOnClick = customProps.onClick
  const customOnDblclick = customProps.onDblclick
  return {
    ...customProps,
    class: [getRowClasses(row), customProps.class],
    onClick: (e: MouseEvent) => {
      if (customOnDblclick) {
        handleRowClickWithDoubleClick(row, customOnClick, e)
        return
      }
      if (callRowClickHandler(customOnClick, e)) return
      if (isInteractiveClickTarget(e.target)) return
      onRowClick(row)
    },
    onDblclick: (e: MouseEvent) => {
      if (isInteractiveClickTarget(e.target)) return
      clearPendingRowClick()
      callRowClickHandler(customOnDblclick, e)
    },
  }
}

function clearPendingRowClick(execute = false) {
  if (!pendingRowClick) {
    return
  }
  clearTimeout(pendingRowClick.timerId)
  const callback = pendingRowClick.callback
  pendingRowClick = null
  if (execute) {
    callback()
  }
}

function buildRowClickCallback(row: Row<TData>, customOnClick: unknown, event: MouseEvent) {
  return () => {
    if (callRowClickHandler(customOnClick, event)) return
    if (isInteractiveClickTarget(event.target)) return
    onRowClick(row)
  }
}

function handleRowClickWithDoubleClick(row: Row<TData>, customOnClick: unknown, event: MouseEvent) {
  if (isInteractiveClickTarget(event.target)) {
    return
  }

  const rowId = String(row.id || '')
  if (pendingRowClick && pendingRowClick.rowId !== rowId) {
    clearPendingRowClick(true)
  } else {
    clearPendingRowClick()
  }

  if (event.detail > 1) {
    return
  }

  const callback = buildRowClickCallback(row, customOnClick, event)
  pendingRowClick = {
    rowId,
    callback,
    timerId: setTimeout(() => {
      const nextCallback = pendingRowClick?.callback
      pendingRowClick = null
      nextCallback?.()
    }, ROW_DOUBLE_CLICK_DELAY_MS),
  }
}

function callRowClickHandler(handler: unknown, event: MouseEvent) {
  if (typeof handler !== 'function') {
    return false
  }
  const clickHandler = handler as (event: MouseEvent) => void
  clickHandler(event)
  return true
}

function isInteractiveClickTarget(target: MouseEvent['target']) {
  const element = target as HTMLElement | null
  if (!element || typeof element.closest !== 'function') {
    return false
  }
  return Boolean(element.closest([
    '.table-actions',
    '.ant-checkbox-wrapper',
    '.ant-checkbox',
    '.ant-radio-wrapper',
    '.ant-radio',
    '.ant-btn',
    '.leo-data-table-expanded-row',
    'button',
    'a',
    'input',
    'select',
    'textarea',
    '[role="button"]',
  ].join(',')))
}

function onRowClick(row: Row<TData>) {
  if (row.getCanSelect()) {
    row.toggleSelected()
  }
}

onBeforeUnmount(() => {
  clearPendingRowClick()
})

type ColumnMetaLike = { align?: 'left' | 'center' | 'right'; ellipsis?: boolean; fixed?: 'left' | 'right'; width?: number }

function getColumnMeta(column: ColumnDef<TData, unknown>): ColumnMetaLike {
  return (column.meta || {}) as ColumnMetaLike
}

function thStyle(header: ReturnType<Table<TData>['getFlatHeaders']>[number]) {
  const meta = getColumnMeta(header.column.columnDef)
  const style: Record<string, string> = {}
  if (meta.width) style.minWidth = `${meta.width}px`
  if (meta.fixed === 'left') {
    style.position = 'sticky'
    style.left = '0px'
    style.zIndex = '2'
  }
  return style
}

function tdStyle(cell: ReturnType<Row<TData>['getVisibleCells']>[number]) {
  const meta = getColumnMeta(cell.column.columnDef)
  const style: Record<string, string> = {}
  if (meta.width) style.minWidth = `${meta.width}px`
  if (meta.fixed === 'left') {
    style.position = 'sticky'
    style.left = '0px'
    style.zIndex = '1'
  }
  return style
}

const rows = computed(() => props.table.getRowModel().rows)
</script>

<template>
  <div :class="wrapperClass">
    <div class="leo-data-table" :style="scrollStyle">
      <table>
        <colgroup>
          <col
            v-for="header in table.getFlatHeaders()"
            :key="header.id"
            :style="getColumnMeta(header.column.columnDef).width ? { width: getColumnMeta(header.column.columnDef).width + 'px' } : undefined"
          />
        </colgroup>
        <thead class="leo-data-table-thead">
          <tr
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
          >
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              :class="thClass(header)"
              :style="thStyle(header)"
              :colspan="header.colSpan"
              @click="header.column.getToggleSortingHandler()?.({})"
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
              <template v-if="header.column.getCanSort()">
                <span
                  :class="{
                    'leo-data-table-sorter': true,
                    'leo-data-table-sorter-active': header.column.getIsSorted(),
                  }"
                >
                  <span class="leo-data-table-sorter-asc" />
                  <span class="leo-data-table-sorter-desc" />
                </span>
              </template>
            </th>
          </tr>
        </thead>
        <tbody class="leo-data-table-tbody">
          <template v-if="rows.length === 0 && !loading">
            <tr>
              <td :colspan="table.getVisibleFlatColumns().length" class="leo-data-table-td leo-data-table-empty">
                <slot name="empty">
                  {{ emptyText }}
                </slot>
              </td>
            </tr>
          </template>
          <template v-for="row in rows" :key="row.id">
            <tr v-bind="getRowAttrs(row)">
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                :class="tdClass(cell)"
                :style="tdStyle(cell)"
              >
                <slot
                  v-if="getCellSlot(cell.column.id)"
                  :name="`cell-${cell.column.id}`"
                  :row="row.original"
                  :cell="cell"
                />
                <FlexRender
                  v-else-if="cell.column.columnDef.cell"
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </td>
            </tr>
            <tr v-if="row.getIsExpanded()" class="leo-data-table-expanded-row">
              <td :colspan="row.getVisibleCells().length" class="leo-data-table-td">
                <slot name="expanded-row" :row="row" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div v-if="loading" class="leo-data-table-loading-overlay">
      <slot name="loading">
        <div class="leo-data-table-loading-spinner" />
      </slot>
    </div>
  </div>
</template>
