<script setup lang="ts">
import { computed, h } from 'vue'
import type { Dayjs } from 'dayjs'
import { MenuOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { Input, InputNumber, Select, SelectOption } from 'ant-design-vue'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ASelect = Select as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AInput = Input as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AInputNumber = InputNumber as any
import { type ColumnDef } from '@tanstack/vue-table'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'
import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import type { StatusMeta } from '@/composables/use-module-display-support'
import { groupFieldsByRow } from '@/views/modules/module-field-layout'
import ColumnSettingsPopover from './ColumnSettingsPopover.vue'
import EditorFooterActions from './EditorFooterActions.vue'
import EditorItemsSummary from './EditorItemsSummary.vue'
import FormFieldRenderer from './FormFieldRenderer.vue'
import RbacHelperPanel from './RbacHelperPanel.vue'
import { hasBehavior } from '../module-behavior-registry'

interface SettingItem {
  key: string
  title: string
  visible: boolean
}

interface RoleTreeNode {
  title: string
  key: string
  children?: RoleTreeNode[]
}

type RoleTreeCheckedKeys =
  | Array<string | number>
  | { checked: Array<string | number>; halfChecked?: Array<string | number> }
type TableColumn = {
  key?: string | number
  dataIndex?: string | number
  align?: 'left' | 'center' | 'right'
  title?: string
  width?: number
  ellipsis?: boolean
  fixed?: 'left' | 'right' | boolean
}
type TableScroll = Record<string, unknown>
type FilterOption = { label?: unknown }

const settlementModeOptions = ['理算', '过磅']

const props = defineProps<{
  visible: boolean
  title: string
  moduleKey: string
  editorForm: Record<string, unknown>
  canEditFormFields: boolean
  itemColumns?: ModuleColumnDefinition[] | undefined
  visibleFormFields: ModuleFormFieldDefinition[]
  systemHelperVisible: boolean
  systemHelperTitle: string
  checkedRoleNames: string[]
  selectedRolePermissionLabels: string[]
  roleTreeData: RoleTreeNode[]
  canSaveCurrentEditor: boolean
  canSaveAndAuditCurrentEditor: boolean
  editorSaving: boolean
  formFieldSettingItems: SettingItem[]
  getFormFieldSettingItemClass: (key: string) => string
  handleFormFieldSettingDragStart: (key: string, event: DragEvent) => void
  handleFormFieldSettingDragOver: (key: string, event: DragEvent) => void
  handleFormFieldSettingDrop: (key: string) => void
  resetFormFieldSettingDragState: () => void
  handleFormFieldVisibleChange: (key: string, checked: boolean) => void
  resetFormFieldSettings: () => void
  isEditorFieldDisabled: (field: ModuleFormFieldDefinition) => boolean
  getEditorDateValue: (key: string) => Dayjs | undefined
  isRoleTreeField: (field: ModuleFormFieldDefinition) => boolean
  parentImportConfig?: ModuleParentImportDefinition | undefined
  canManageEditorItems: boolean
  canAddManualEditorItems: boolean
  canEditItemColumns: boolean
  editorColumnSettingItems: SettingItem[]
  getEditorColumnSettingItemClass: (key: string) => string
  handleEditorColumnSettingDragStart: (key: string, event: DragEvent) => void
  handleEditorColumnSettingDragOver: (key: string, event: DragEvent) => void
  handleEditorColumnSettingDrop: (key: string) => void
  resetEditorColumnSettingDragState: () => void
  handleEditorColumnVisibleChange: (key: string, checked: boolean) => void
  resetEditorColumnSettings: () => void
  editorItems: ModuleLineItem[]
  editorItemWeightTotal: number
  editorItemAmountTotal: number
  shouldShowItemWeightSummary: boolean
  shouldShowItemAmountSummary: boolean
  lockedLineItemsNotice: string
  editorDetailTableColumns: TableColumn[]
  editorDetailTableScroll: TableScroll
  getEditorItemRowProps: (record: ModuleLineItem) => Record<string, unknown>
  getEditorItemRowClassName: (record: ModuleLineItem) => string
  isEditorItemColumnEditable: (columnKey: string, record?: ModuleLineItem) => boolean
  isNumberEditorColumn: (columnKey: string) => boolean
  getEditorItemMin: (columnKey: string) => number | undefined
  getEditorItemPrecision: (columnKey: string) => number
  materialRows: ModuleRecord[]
  warehouseRows: ModuleRecord[]
  filterMaterialOption: (input: string, option: FilterOption | undefined) => boolean
  formatWeight: (value: unknown) => string
  formatAmount: (value: unknown) => string
  formatCellValue: (column: ModuleColumnDefinition | undefined, value: unknown) => string
  getStatusMeta: (value: unknown) => StatusMeta
  selectedItemIds?: string[]
}>()

const emit = defineEmits<{
  cancel: []
  save: [audit: boolean]
  'update-form-value': [key: string, value: unknown]
  'date-change': [key: string, value: unknown]
  'role-tree-check': [checkedKeys: RoleTreeCheckedKeys]
  'add-editor-item': []
  'open-parent-selector': []
  'editor-item-drag-start': [itemId: string, event: DragEvent]
  'editor-item-drag-end': []
  'update:selectedItemIds': [keys: string[]]
  'remove-editor-item': [itemId: string]
  'remove-selected-items': []
  'editor-item-material-select': [item: ModuleLineItem, value: unknown]
  'open-material-selector': [item: ModuleLineItem]
  'editor-item-value-change': [item: ModuleLineItem, key: string, value: unknown]
  'editor-item-number-change': [item: ModuleLineItem, key: string, value: unknown]
  'editor-item-input-change': [item: ModuleLineItem, key: string, event: Event]
}>()

function getEditorFieldId(fieldKey: string) {
  return `editor-field-${props.moduleKey}-${fieldKey}`
}

function asTableColumn(column: unknown): TableColumn {
  return column && typeof column === 'object' ? column as TableColumn : {}
}

function getTableColumnKey(column: unknown) {
  const target = asTableColumn(column)
  if (typeof target.key === 'string' || typeof target.key === 'number') {
    return String(target.key)
  }
  if (typeof target.dataIndex === 'string' || typeof target.dataIndex === 'number') {
    return String(target.dataIndex)
  }
  return ''
}

function getTableColumnDataIndex(column: unknown) {
  const target = asTableColumn(column)
  if (typeof target.dataIndex === 'string' || typeof target.dataIndex === 'number') {
    return String(target.dataIndex)
  }
  return ''
}

function getRecordCellValue(record: unknown, column: unknown) {
  const dataIndex = getTableColumnDataIndex(column)
  if (!dataIndex || !record || typeof record !== 'object') {
    return undefined
  }
  return (record as Record<string, unknown>)[dataIndex]
}

function getRecordNumberValue(record: unknown, column: unknown) {
  const value = getRecordCellValue(record, column)
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function getItemColumnMeta(column: unknown) {
  const key = getTableColumnKey(column)
  return key ? props.itemColumns?.find((item) => item.dataIndex === key) : undefined
}

function shouldHideNumberInputControls(columnKey: string) {
  return ['quantity', 'unitPrice', 'weightTon'].includes(columnKey)
}

function normalizeOptionValue(value: unknown) {
  return String(value ?? '').trim()
}

function getStatementOptions(record: ModuleLineItem) {
  return Array.isArray(record._statementOptions)
    ? (record._statementOptions as Array<{ value: unknown; label: string }>)
    : []
}

const editorTanstackColumns = computed<ColumnDef<ModuleLineItem, unknown>[]>(() =>
  props.editorDetailTableColumns.map((col: TableColumn) => {
    const key = String(col.key || col.dataIndex || '')
    const isIndex = key === '_index'
    const isMaterial = key === 'materialCode'
    const isWarehouse = key === 'warehouseName'
    const isSettlement = key === 'settlementMode'
    const isNumber = props.isNumberEditorColumn(key)
    const meta = getItemColumnMeta(col)
    const isStatus = meta?.type === 'status'
    const width = typeof col.width === 'number' ? col.width : undefined
    const align = (col.align as 'left' | 'center' | 'right' | undefined)

    if (isIndex) {
      return {
        id: '_index',
        header: () => '序号',
        cell: (info: { row: { index: number; original: ModuleLineItem } }) => [
          props.canManageEditorItems ? h('span', {
            class: 'editor-row-drag-handle',
            draggable: true,
            title: '拖动排序',
            onDragstart: (e: DragEvent) => emit('editor-item-drag-start', String(info.row.original.id), e),
            onDragend: () => emit('editor-item-drag-end'),
          }, [h(MenuOutlined, { style: { marginRight: '4px', cursor: 'grab', fontSize: '12px', opacity: 0.45 } })]) : null,
          String(info.row.index + 1),
        ],
        meta: { width: 56, align: 'center', fixed: 'left' },
      }
    }

    const editable = (record?: ModuleLineItem) => props.isEditorItemColumnEditable(key, record)

    return {
      id: key,
      accessorKey: key,
      header: () => String(col.title || ''),
      cell: (info: { getValue: () => unknown; row: { original: ModuleLineItem } }) => {
        const record = info.row.original
        if (!editable(record)) {
          if (key === 'sourceStatementId' && String(record.statementNo || '').trim()) {
            return String(record.statementNo || '')
          }
          if (isStatus) {
            const s = props.getStatusMeta(info.getValue())
            return h('span', { class: `ant-tag ant-tag-${s.color}` }, s.text)
          }
          return props.formatCellValue(meta, info.getValue())
        }
        if (isMaterial) return h('div', { class: 'editor-material-selector' }, [
          h(ASelect, {
            value: record.materialCode,
            showSearch: true,
            allowClear: true,
            class: 'editor-item-field',
            style: 'width: calc(100% - 32px)',
            placeholder: '选择商品编码',
            filterOption: props.filterMaterialOption,
            onChange: (val: unknown) => emit('editor-item-material-select', record, val),
          }, () => props.materialRows.map((m: ModuleRecord) => {
            const materialCode = normalizeOptionValue(m.materialCode)
            return h(SelectOption, {
              key: materialCode,
              value: materialCode,
              label: `${materialCode} ${m.brand || ''} ${m.spec || ''}`,
            }, () => `${materialCode} / ${m.brand} / ${m.spec}`)
          })),
          h('button', {
            type: 'button',
            class: 'ant-btn ant-btn-text editor-material-selector-button',
            onMousedown: (e: Event) => e.preventDefault(),
            onClick: (e: Event) => { e.stopPropagation(); emit('open-material-selector', record) },
          }, [h(SearchOutlined)]),
        ])
        if (isWarehouse) return h(ASelect, {
          value: record.warehouseName,
          showSearch: true,
          allowClear: true,
          class: 'editor-item-field',
          placeholder: '选择码头',
          filterOption: props.filterMaterialOption,
          onChange: (val: unknown) => emit('editor-item-value-change', record, 'warehouseName', val),
        }, () => props.warehouseRows.map((w: ModuleRecord) => h(SelectOption, {
          key: String(w.warehouseName),
          value: String(w.warehouseName),
          label: String(w.warehouseName || ''),
        }, () => String(w.warehouseName || ''))))
        if (key === 'sourceStatementId') return h(ASelect, {
          value: record.sourceStatementId,
          showSearch: true,
          allowClear: true,
          class: 'editor-item-field',
          placeholder: '选择对账单',
          disabled: getStatementOptions(record).length === 0,
          filterOption: props.filterMaterialOption,
          onChange: (val: unknown) => emit('editor-item-value-change', record, 'sourceStatementId', val),
        }, () => getStatementOptions(record).map((option) => h(SelectOption, {
          key: String(option.value),
          value: option.value,
          label: option.label,
        }, () => option.label)))
        if (isSettlement) return h(ASelect, {
          value: record.settlementMode,
          class: 'editor-item-field',
          placeholder: '选择结算方式',
          onChange: (val: unknown) => emit('editor-item-value-change', record, 'settlementMode', val),
        }, () => settlementModeOptions.map((mode: string) => h(SelectOption, { key: mode, value: mode, label: mode }, () => mode)))
        if (isNumber) return h(AInputNumber, {
          value: getRecordNumberValue(record, col),
          class: ['editor-item-field', { 'editor-item-field-centered': shouldHideNumberInputControls(key) }],
          style: 'width: 100%',
          min: props.getEditorItemMin(key),
          precision: props.getEditorItemPrecision(key),
          controls: !shouldHideNumberInputControls(key),
          onChange: (val: unknown) => emit('editor-item-number-change', record, key, val),
        })
        return h(AInput, {
          value: String(getRecordCellValue(record, col) || ''),
          class: 'editor-item-field',
          onChange: (e: Event) => emit('editor-item-input-change', record, key, e),
        })
      },
      meta: { width, align, ellipsis: col.ellipsis === true },
    }
  }),
)

const editorRowSelection = computed(() => {
  const result: Record<string, boolean> = {}
  for (const id of (props.selectedItemIds || [])) result[id] = true
  return result
})

const formFieldRows = computed(() => groupFieldsByRow(props.visibleFormFields))

function getFormFieldLgSpan(field: ModuleFormFieldDefinition) {
  return field.fullRow || field.type === 'textarea' ? 24 : 6
}

const { table: editorTable } = useDataTable({
  data: computed(() => props.editorItems),
  columns: editorTanstackColumns,
  getRowId: (row) => String(row.id ?? ''),
  manualPagination: false,
  enableSorting: false,
  enableRowSelection: computed(() => props.canManageEditorItems),
  rowSelection: editorRowSelection,
  onRowSelectionChange: (updater: unknown) => {
    const next = typeof updater === 'function'
      ? (updater as (s: Record<string, boolean>) => Record<string, boolean>)(editorRowSelection.value)
      : (updater as Record<string, boolean>)
    emit('update:selectedItemIds', Object.keys(next))
  },
})
</script>

<template>
  <div v-if="visible" class="workspace-overlay">
    <div class="workspace-overlay-mask"></div>
    <section class="workspace-overlay-panel">
      <header class="workspace-overlay-header">
        <span class="workspace-overlay-title">{{ title }}</span>
      </header>

      <div class="workspace-overlay-body bill-detail-body">
        <div v-if="canEditFormFields" class="editor-form-head">
          <div class="editor-form-title-block">
            <h3 class="detail-section-title">单据信息</h3>
          </div>
          <div class="editor-form-actions">
            <ColumnSettingsPopover
              label="表单字段设置"
              :items="formFieldSettingItems"
              :get-item-class="getFormFieldSettingItemClass"
              :on-drag-start="handleFormFieldSettingDragStart"
              :on-drag-over="handleFormFieldSettingDragOver"
              :on-drop="handleFormFieldSettingDrop"
              :on-drag-end="resetFormFieldSettingDragState"
              :on-visible-change="handleFormFieldVisibleChange"
              :on-reset="resetFormFieldSettings"
            />
            <EditorFooterActions
              v-if="!itemColumns?.length"
              :can-save="canSaveCurrentEditor"
              :can-audit="canSaveAndAuditCurrentEditor"
              :saving="editorSaving"
              @cancel="emit('cancel')"
              @save="(audit) => emit('save', audit)"
            />
          </div>
        </div>
        <a-form :model="editorForm" layout="vertical" class="editor-form-shell">
          <RbacHelperPanel
            v-if="systemHelperVisible"
            :title="systemHelperTitle"
            :role-count="checkedRoleNames.length"
            :permission-count="selectedRolePermissionLabels.length"
            :data-scope="String(editorForm.dataScope || '--')"
            :permission-summary="String(editorForm.permissionSummary || '--')"
            :show-role-link="hasBehavior(moduleKey, 'showRoleLink')"
          />
          <a-row
            v-for="(fieldRow, rowIndex) in formFieldRows"
            :key="`editor-form-row-${rowIndex + 1}`"
            class="editor-form-row"
            :gutter="16"
          >
            <a-col
              v-for="field in fieldRow"
              :key="field.key"
              :xs="24"
              :sm="12"
              :lg="getFormFieldLgSpan(field)"
            >
              <FormFieldRenderer
                :field="field"
                :field-id="getEditorFieldId(field.key)"
                :form="editorForm"
                :disabled="isEditorFieldDisabled(field)"
                :date-value="getEditorDateValue(field.key)"
                :role-tree-field="isRoleTreeField(field)"
                :checked-role-names="checkedRoleNames"
                :role-tree-data="roleTreeData"
                :selected-role-permission-labels="selectedRolePermissionLabels"
                @update-value="(key, value) => emit('update-form-value', key, value)"
                @date-change="(key, value) => emit('date-change', key, value)"
                @role-tree-check="(checkedKeys) => emit('role-tree-check', checkedKeys)"
              />
            </a-col>
          </a-row>
          <a-row
            v-if="parentImportConfig && canManageEditorItems && !itemColumns?.length"
            class="editor-form-row"
            :gutter="16"
          >
            <a-col
              :xs="24"
              :sm="12"
              :lg="6"
            >
              <a-form-item label=" ">
                <a-button
                  type="primary"
                  @click="emit('open-parent-selector')"
                >
                  {{ parentImportConfig.buttonText || '选择上级单据导入' }}
                </a-button>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>

        <template v-if="itemColumns?.length">
          <div class="editor-items-head">
            <div class="editor-items-title-block">
              <h3 class="detail-section-title">明细列表</h3>
            </div>
            <div class="editor-items-actions">
              <a-button
                v-if="canAddManualEditorItems"
                type="primary"
                class="overlay-action-button"
                @click="emit('add-editor-item')"
              >
                新增明细
              </a-button>
              <template v-if="parentImportConfig && canManageEditorItems">
                <a-button
                  type="primary"
                  class="overlay-action-button"
                  @click="emit('open-parent-selector')"
                >
                  {{ parentImportConfig.buttonText || '选择上级单据导入' }}
                </a-button>
              </template>
              <a-button
                v-if="canManageEditorItems && (selectedItemIds?.length || 0) > 0"
                danger
                class="overlay-action-button"
                @click="emit('remove-selected-items')"
              >
                删除选中 ({{ selectedItemIds?.length || 0 }})
              </a-button>
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
              <EditorFooterActions
                :can-save="canSaveCurrentEditor"
                :can-audit="canSaveAndAuditCurrentEditor"
                :saving="editorSaving"
                @cancel="emit('cancel')"
                @save="(audit) => emit('save', audit)"
              />
              <EditorItemsSummary
                class="editor-items-summary-inline"
                :item-count="editorItems.length"
                :weight="formatWeight(editorItemWeightTotal)"
                :amount="formatAmount(editorItemAmountTotal)"
                :show-weight="shouldShowItemWeightSummary"
                :show-amount="shouldShowItemAmountSummary"
              />
            </div>
            <EditorItemsSummary
              class="editor-items-summary-mobile"
              :item-count="editorItems.length"
              :weight="formatWeight(editorItemWeightTotal)"
              :amount="formatAmount(editorItemAmountTotal)"
              :show-weight="shouldShowItemWeightSummary"
              :show-amount="shouldShowItemAmountSummary"
            />
          </div>
          <div v-if="parentImportConfig" class="parent-import-note">
            {{ parentImportConfig.enforceUniqueRelation ? '当前单据链按上级单据唯一占用控制；重复导入同单号会更新，选择不同单号会追加明细' : '重复导入同单号会更新，选择不同单号会追加明细' }}
          </div>
          <div v-if="lockedLineItemsNotice" class="parent-import-note">
            {{ lockedLineItemsNotice }}
          </div>
          <DataTable
            :table="editorTable"
            size="small"
            class="module-detail-table"
            :row-class="getEditorItemRowClassName"
            :row-props="getEditorItemRowProps"
            :empty-text="parentImportConfig ? (canAddManualEditorItems ? '当前没有明细，可手动新增或从上级单据导入' : '当前没有明细，请从上级单据导入') : '当前没有明细，可手动新增'"
          />
        </template>
      </div>
    </section>
  </div>
</template>
