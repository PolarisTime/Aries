<script setup lang="ts">
import type { Dayjs } from 'dayjs'
import { MenuOutlined, SearchOutlined } from '@ant-design/icons-vue'
import type {
  ModuleColumnDefinition,
  ModuleFormFieldDefinition,
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import type { StatusMeta } from '@/composables/use-module-display-support'
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

function asModuleLineItem(record: Record<string, unknown>): ModuleLineItem {
  return record as unknown as ModuleLineItem
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

function getItemColumnMeta(column: unknown) {
  const key = getTableColumnKey(column)
  return key ? props.itemColumns?.find((item) => item.dataIndex === key) : undefined
}

function getEditorSummaryCellValue(column: unknown) {
  const key = getTableColumnKey(column)
  if (key === 'editorAction') {
    return '合计'
  }
  if (key === 'quantity') {
    return props.editorItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toFixed(0)
  }
  if (key === 'weightTon') {
    return props.formatWeight(props.editorItemWeightTotal)
  }
  if (key === 'amount' && props.shouldShowItemAmountSummary) {
    return props.formatAmount(props.editorItemAmountTotal)
  }
  return ''
}
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
          <a-row :gutter="16">
            <a-col
              v-for="field in visibleFormFields"
              :key="field.key"
              :xs="24"
              :sm="12"
              :lg="field.type === 'textarea' ? 24 : 6"
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
            <a-col
              v-if="parentImportConfig && canManageEditorItems && !itemColumns?.length"
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
                :show-amount="shouldShowItemAmountSummary"
              />
            </div>
            <EditorItemsSummary
              class="editor-items-summary-mobile"
              :item-count="editorItems.length"
              :weight="formatWeight(editorItemWeightTotal)"
              :amount="formatAmount(editorItemAmountTotal)"
              :show-amount="shouldShowItemAmountSummary"
            />
          </div>
          <div v-if="parentImportConfig" class="parent-import-note">
            {{ parentImportConfig.enforceUniqueRelation ? '当前单据链按上级单据唯一占用控制；重复导入同单号会更新，选择不同单号会追加明细' : '重复导入同单号会更新，选择不同单号会追加明细' }}
          </div>
          <div v-if="lockedLineItemsNotice" class="parent-import-note">
            {{ lockedLineItemsNotice }}
          </div>
          <a-table
            size="small"
            bordered
            row-key="id"
            :columns="editorDetailTableColumns"
            :data-source="editorItems"
            :pagination="false"
            :scroll="editorDetailTableScroll"
            :custom-row="getEditorItemRowProps"
            :row-class-name="getEditorItemRowClassName"
            :row-selection="canManageEditorItems ? { selectedRowKeys: selectedItemIds, onChange: (keys) => emit('update:selectedItemIds', keys as string[]) } : undefined"
            class="module-detail-table"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === '_index'">
                <span
                  v-if="canManageEditorItems"
                  class="editor-row-drag-handle"
                  draggable="true"
                  title="拖动排序"
                  @dragstart="emit('editor-item-drag-start', String(record.id), $event)"
                  @dragend="emit('editor-item-drag-end')"
                >
                  <MenuOutlined style="margin-right: 4px; cursor: grab; font-size: 12px; opacity: 0.45" />
                </span>
                {{ index + 1 }}
              </template>
              <template
                v-else-if="isEditorItemColumnEditable(String(column.key), asModuleLineItem(record)) && column.key === 'materialCode'"
              >
                <div class="editor-material-selector">
                  <a-select
                    :value="record.materialCode"
                    show-search
                    allow-clear
                    class="editor-item-field"
                    style="width: 100%"
                    placeholder="选择商品编码"
                    :filter-option="filterMaterialOption"
                    @change="emit('editor-item-material-select', asModuleLineItem(record), $event)"
                  >
                    <a-select-option
                      v-for="material in materialRows"
                      :key="String(material.materialCode)"
                      :value="String(material.materialCode)"
                      :label="`${material.materialCode} ${material.brand || ''} ${material.spec || ''}`"
                    >
                      {{ material.materialCode }} / {{ material.brand }} / {{ material.spec }}
                    </a-select-option>
                  </a-select>
                  <a-button
                    type="text"
                    class="editor-material-selector-button"
                    title="弹窗选择商品"
                    @mousedown.prevent
                    @click.stop="emit('open-material-selector', asModuleLineItem(record))"
                  >
                    <template #icon>
                      <SearchOutlined />
                    </template>
                  </a-button>
                </div>
              </template>
              <template
                v-else-if="isEditorItemColumnEditable(String(column.key), asModuleLineItem(record)) && column.key === 'warehouseName'"
              >
                <a-select
                  :value="record.warehouseName"
                  show-search
                  allow-clear
                  class="editor-item-field"
                  placeholder="选择码头"
                  :filter-option="filterMaterialOption"
                  @change="emit('editor-item-value-change', asModuleLineItem(record), 'warehouseName', $event)"
                >
                  <a-select-option
                    v-for="warehouse in warehouseRows"
                    :key="String(warehouse.warehouseName)"
                    :value="String(warehouse.warehouseName)"
                    :label="String(warehouse.warehouseName || '')"
                  >
                    {{ warehouse.warehouseName }}
                  </a-select-option>
                </a-select>
              </template>
              <template
                v-else-if="isEditorItemColumnEditable(String(column.key), asModuleLineItem(record)) && column.key === 'settlementMode'"
              >
                <a-select
                  :value="record.settlementMode"
                  class="editor-item-field"
                  placeholder="选择结算方式"
                  @change="emit('editor-item-value-change', asModuleLineItem(record), 'settlementMode', $event)"
                >
                  <a-select-option
                    v-for="mode in settlementModeOptions"
                    :key="mode"
                    :value="mode"
                    :label="mode"
                  >
                    {{ mode }}
                  </a-select-option>
                </a-select>
              </template>
              <template
                v-else-if="isEditorItemColumnEditable(String(column.key), asModuleLineItem(record)) && isNumberEditorColumn(String(column.key))"
              >
                <a-input-number
                  :value="Number(getRecordCellValue(record, column) || 0)"
                  class="editor-item-field"
                  style="width: 100%"
                  :min="getEditorItemMin(String(column.key))"
                  :precision="getEditorItemPrecision(String(column.key))"
                  @change="emit('editor-item-number-change', asModuleLineItem(record), String(column.key), $event)"
                />
              </template>
              <template v-else-if="isEditorItemColumnEditable(String(column.key), asModuleLineItem(record))">
                <a-input
                  :value="String(getRecordCellValue(record, column) || '')"
                  class="editor-item-field"
                  @change="emit('editor-item-input-change', asModuleLineItem(record), String(column.key), $event)"
                />
              </template>
              <template
                v-else-if="getItemColumnMeta(column)?.type === 'status'"
              >
                <a-tag :color="getStatusMeta(getRecordCellValue(record, column)).color">
                  {{ getStatusMeta(getRecordCellValue(record, column)).text }}
                </a-tag>
              </template>
              <template v-else>
                {{
                  formatCellValue(
                    getItemColumnMeta(column),
                    getRecordCellValue(record, column),
                  )
                }}
              </template>
            </template>

            <template #emptyText>
              <a-empty :description="parentImportConfig ? (canAddManualEditorItems ? '当前没有明细，可手动新增或从上级单据导入' : '当前没有明细，请从上级单据导入') : '当前没有明细，可手动新增'" />
            </template>

            <template #summary>
              <a-table-summary-row>
                <a-table-summary-cell
                  v-for="(column, index) in editorDetailTableColumns"
                  :key="getTableColumnKey(column)"
                  :index="index"
                  :align="column.align"
                >
                  {{ getEditorSummaryCellValue(column) }}
                </a-table-summary-cell>
              </a-table-summary-row>
            </template>
          </a-table>
        </template>
      </div>
    </section>
  </div>
</template>
