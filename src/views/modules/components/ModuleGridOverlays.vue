<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import type { UploadProps } from 'ant-design-vue'
import type { AttachmentItem } from '@/composables/use-attachment-support'
import type { StatusMeta } from '@/composables/use-module-display-support'
import type { MaterialImportResult } from '@/types/material'
import type {
  ModuleColumnDefinition,
  ModuleDetailField,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import ModuleAttachmentModal from './ModuleAttachmentModal.vue'
import ModuleFreightPickupListOverlay from './ModuleFreightPickupListOverlay.vue'
import ModuleMaterialImportDialogs from './ModuleMaterialImportDialogs.vue'
import ModuleParentSelectorOverlay from './ModuleParentSelectorOverlay.vue'
import ModuleRecordDetailOverlay from './ModuleRecordDetailOverlay.vue'
import ModuleSelectionOverlay from './ModuleSelectionOverlay.vue'
import ModuleStatementGenerator from './ModuleStatementGenerator.vue'

type SettingItem = { key: string; title: string; visible: boolean }
type TableColumn = Record<string, unknown>
type TableScroll = Record<string, unknown>
type RowSelection = {
  selectedRowKeys: (string | number)[]
  onChange: (keys: (string | number)[], rows: ModuleRecord[]) => void
}
type MaterialRowSelection = {
  selectedRowKeys: (string | number)[]
  onChange: (keys: (string | number)[]) => void
}
type StatementFormatCellValue = (column: { title: string; dataIndex: string; type?: string }, value: unknown) => string

defineProps<{
  detailVisible: boolean
  detailTitle: string
  detailFields: ModuleDetailField[]
  detailColumnCount?: number
  itemColumns?: ModuleColumnDefinition[] | undefined
  activeRecord: ModuleRecord | null
  canPrintRecords: boolean
  detailPrintLoading: boolean
  shouldShowItemWeightSummary: boolean
  shouldShowItemAmountSummary: boolean
  itemWeightSummaryKey: string
  itemAmountSummaryKey: string
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
  attachmentVisible: boolean
  attachmentTitle: string
  attachmentPasteEnabled: boolean
  canManageAttachments: boolean
  attachmentDraftName: string
  attachmentRows: AttachmentItem[]
  attachmentSaving: boolean
  handleAttachmentBeforeUpload: NonNullable<UploadProps['beforeUpload']>
  handleAddAttachment: () => unknown
  handlePreviewAttachment: (record: AttachmentItem) => unknown
  handleDownloadAttachment: (record: AttachmentItem) => unknown
  handleRemoveAttachment: (id: string) => unknown
  materialSelectorVisible: boolean
  filteredMaterialSelectorRows: ModuleRecord[]
  materialSelectorColumns: ColumnDef<ModuleRecord, unknown>[]
  materialSelectorLoading: boolean
  materialSelectorRowSelection: MaterialRowSelection
  materialSelectorKeyword: string
  getMaterialSelectorRowProps: (record: ModuleRecord) => Record<string, unknown>
  materialSelectorSelectedCode: string
  hasActiveMaterialSelectorItem: boolean
  supplierStatementGeneratorVisible: boolean
  supplierStatementCandidateRows: ModuleRecord[]
  supplierStatementGeneratorLoading: boolean
  supplierStatementRowSelection: RowSelection
  supplierStatementSelectedInbounds: ModuleRecord[]
  supplierStatementSelectedSupplierName: string
  customerStatementGeneratorVisible: boolean
  customerStatementCandidateRows: ModuleRecord[]
  customerStatementGeneratorLoading: boolean
  customerStatementRowSelection: RowSelection
  customerStatementSelectedOrders: ModuleRecord[]
  customerStatementSelectedCustomerName: string
  customerStatementSelectedProjectName: string
  freightStatementGeneratorVisible: boolean
  freightStatementCandidateRows: ModuleRecord[]
  freightStatementGeneratorLoading: boolean
  freightStatementRowSelection: RowSelection
  freightStatementSelectedBills: ModuleRecord[]
  freightStatementSelectedCarrierName: string
  freightSummaryVisible: boolean
  freightSummaryRows: ModuleRecord[]
  freightSummaryColumns: ColumnDef<ModuleRecord, unknown>[]
  freightSummaryLoading: boolean
  freightPickupListVisible: boolean
  freightPickupListRows: ModuleRecord[]
  freightPickupListLoading: boolean
  freightPickupListSelectedBills: ModuleRecord[]
  freightPickupListCarrierNames: string[]
  freightPickupListBillNos: string[]
  freightPickupListTotalWeight: number
  parentSelectorVisible: boolean
  parentImportConfig?: ModuleParentImportDefinition
  parentSelectorRows: ModuleRecord[]
  parentSelectorLoading: boolean
  parentSelectorRowSelection: RowSelection
  getParentSelectorRowProps: (record: ModuleRecord) => Record<string, unknown>
  parentSelectorKeyword: string
  canSaveCurrentEditor: boolean
  parentImportableQuantityVisible: boolean
  getParentImportableQuantity: (record: ModuleRecord) => number | undefined
  getParentRelationNo: (record: ModuleRecord) => string
  getParentOptionLabel: (record: ModuleRecord) => string
  materialImportVisible: boolean
  materialImportLoading: boolean
  materialImportFile: File | null
  materialImportResultVisible: boolean
  materialImportResult: MaterialImportResult | null
  handleMaterialImportBeforeUpload: NonNullable<UploadProps['beforeUpload']>
  formatWeight: (value: unknown) => string
  formatAmount: (value: unknown) => string
  formatCellValue: (column: ModuleColumnDefinition | undefined, value: unknown) => string
  getStatusMeta: (value: unknown) => StatusMeta
}>()

const emit = defineEmits<{
  closeDetail: []
  printDetail: [preview: boolean]
  closeAttachment: []
  updateAttachmentDraftName: [value: string]
  closeMaterialSelector: []
  confirmMaterialSelector: []
  updateMaterialSelectorKeyword: [value: string]
  closeSupplierStatementGenerator: []
  generateSupplierStatement: []
  closeCustomerStatementGenerator: []
  generateCustomerStatement: []
  closeFreightStatementGenerator: []
  generateFreightStatement: []
  closeFreightSummary: []
  closeFreightPickupList: []
  closeParentSelector: []
  confirmParentImport: []
  updateParentSelectorKeyword: [value: string]
  cancelMaterialImport: []
  submitMaterialImport: []
  closeMaterialImportResult: []
}>()

function sumRecordsBy(rows: ModuleRecord[], key: string) {
  return rows.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}
</script>

<template>
  <ModuleRecordDetailOverlay
    :visible="detailVisible"
    :title="detailTitle"
    :detail-fields="detailFields"
    :detail-column-count="detailColumnCount"
    :item-columns="itemColumns"
    :active-record="activeRecord"
    :can-print-records="canPrintRecords"
    :detail-print-loading="detailPrintLoading"
    :should-show-item-weight-summary="shouldShowItemWeightSummary"
    :should-show-item-amount-summary="shouldShowItemAmountSummary"
    :item-weight-summary-key="itemWeightSummaryKey"
    :item-amount-summary-key="itemAmountSummaryKey"
    :detail-table-columns="detailTableColumns"
    :detail-table-scroll="detailTableScroll"
    :can-edit-item-columns="canEditItemColumns"
    :editor-column-setting-items="editorColumnSettingItems"
    :get-editor-column-setting-item-class="getEditorColumnSettingItemClass"
    :handle-editor-column-setting-drag-start="handleEditorColumnSettingDragStart"
    :handle-editor-column-setting-drag-over="handleEditorColumnSettingDragOver"
    :handle-editor-column-setting-drop="handleEditorColumnSettingDrop"
    :reset-editor-column-setting-drag-state="resetEditorColumnSettingDragState"
    :handle-editor-column-visible-change="handleEditorColumnVisibleChange"
    :reset-editor-column-settings="resetEditorColumnSettings"
    :status-map="statusMap"
    @close="emit('closeDetail')"
    @print="emit('printDetail', $event)"
  />

  <ModuleAttachmentModal
    :visible="attachmentVisible"
    :title="attachmentTitle"
    :paste-enabled="attachmentPasteEnabled"
    :can-manage-attachments="canManageAttachments"
    :draft-name="attachmentDraftName"
    :rows="attachmentRows"
    :saving="attachmentSaving"
    :before-upload="handleAttachmentBeforeUpload"
    :add-attachment="handleAddAttachment"
    :preview-attachment="handlePreviewAttachment"
    :download-attachment="handleDownloadAttachment"
    :remove-attachment="handleRemoveAttachment"
    @cancel="emit('closeAttachment')"
    @update:draft-name="emit('updateAttachmentDraftName', $event)"
  />

  <ModuleSelectionOverlay
    :visible="materialSelectorVisible"
    title="选择商品"
    panel-title="商品列表"
    hint="可按商品编码、品牌、材质、规格搜索，双击行可直接确认。"
    :rows="filteredMaterialSelectorRows"
    :columns="materialSelectorColumns"
    :loading="materialSelectorLoading"
    :row-selection="materialSelectorRowSelection"
    :scroll="{ x: 900 }"
    :custom-row="getMaterialSelectorRowProps"
    empty-description="暂无可选商品"
    confirm-text="选择商品"
    :confirm-disabled="!materialSelectorSelectedCode || !hasActiveMaterialSelectorItem"
    row-key="materialCode"
    @cancel="emit('closeMaterialSelector')"
    @confirm="emit('confirmMaterialSelector')"
  >
    <template #meta>
      <div class="module-table-head-meta statement-generator-meta">
        <span class="module-table-head-title">商品列表</span>
        <a-input
          :value="materialSelectorKeyword"
          allow-clear
          class="parent-selector-search"
          placeholder="输入商品编码、品牌、材质、规格搜索"
          @update:value="emit('updateMaterialSelectorKeyword', $event)"
        />
        <span class="parent-selector-hint">双击行可直接确认</span>
      </div>
    </template>

    <template #summary>
      <span v-if="materialSelectorSelectedCode">已选 {{ materialSelectorSelectedCode }}</span>
    </template>
  </ModuleSelectionOverlay>

  <ModuleStatementGenerator
    :supplier-visible="supplierStatementGeneratorVisible"
    :supplier-rows="supplierStatementCandidateRows"
    :supplier-loading="supplierStatementGeneratorLoading"
    :supplier-row-selection="supplierStatementRowSelection"
    :supplier-summary="{
      count: supplierStatementSelectedInbounds.length,
      supplierName: supplierStatementSelectedSupplierName,
      amount: sumRecordsBy(supplierStatementSelectedInbounds, 'totalAmount'),
    }"
    :customer-visible="customerStatementGeneratorVisible"
    :customer-rows="customerStatementCandidateRows"
    :customer-loading="customerStatementGeneratorLoading"
    :customer-row-selection="customerStatementRowSelection"
    :customer-summary="{
      count: customerStatementSelectedOrders.length,
      customerName: customerStatementSelectedCustomerName,
      projectName: customerStatementSelectedProjectName,
      amount: sumRecordsBy(customerStatementSelectedOrders, 'totalAmount'),
    }"
    :freight-visible="freightStatementGeneratorVisible"
    :freight-rows="freightStatementCandidateRows"
    :freight-loading="freightStatementGeneratorLoading"
    :freight-row-selection="freightStatementRowSelection"
    :freight-summary="{
      count: freightStatementSelectedBills.length,
      carrierName: freightStatementSelectedCarrierName,
      weight: sumRecordsBy(freightStatementSelectedBills, 'totalWeight'),
      freight: sumRecordsBy(freightStatementSelectedBills, 'totalFreight'),
    }"
    :format-weight="formatWeight"
    :format-amount="formatAmount"
    :format-cell-value="formatCellValue as StatementFormatCellValue"
    :get-status-meta="getStatusMeta"
    @close-supplier="emit('closeSupplierStatementGenerator')"
    @generate-supplier="emit('generateSupplierStatement')"
    @close-customer="emit('closeCustomerStatementGenerator')"
    @generate-customer="emit('generateCustomerStatement')"
    @close-freight="emit('closeFreightStatementGenerator')"
    @generate-freight="emit('generateFreightStatement')"
  />

  <ModuleSelectionOverlay
    :visible="freightSummaryVisible"
    title="运费对账汇总"
    panel-title="物流商汇总"
    hint="按当前筛选条件汇总各物流商的对账单数、重量（吨）、应付与已付金额。"
    :rows="freightSummaryRows"
    :columns="freightSummaryColumns"
    :loading="freightSummaryLoading"
    :pagination="false"
    empty-description="暂无汇总数据"
    cancel-text="关闭"
    :confirm-visible="false"
    @cancel="emit('closeFreightSummary')"
  />

  <ModuleFreightPickupListOverlay
    :visible="freightPickupListVisible"
    :rows="freightPickupListRows"
    :loading="freightPickupListLoading"
    :selected-bill-count="freightPickupListSelectedBills.length"
    :carrier-names="freightPickupListCarrierNames"
    :bill-nos="freightPickupListBillNos"
    :total-weight="freightPickupListTotalWeight"
    @close="emit('closeFreightPickupList')"
  />

  <ModuleParentSelectorOverlay
    :visible="parentSelectorVisible"
    :title="parentImportConfig?.label ? `选择${parentImportConfig.label}` : '选择上级单据'"
    :rows="parentSelectorRows"
    :loading="parentSelectorLoading"
    :row-selection="parentSelectorRowSelection"
    :custom-row="getParentSelectorRowProps"
    :keyword="parentSelectorKeyword"
    :can-confirm="canSaveCurrentEditor"
    :show-parent-importable-quantity="parentImportableQuantityVisible"
    :get-parent-importable-quantity="getParentImportableQuantity"
    :get-parent-relation-no="getParentRelationNo"
    :get-parent-option-label="getParentOptionLabel"
    :get-status-meta="getStatusMeta"
    @cancel="emit('closeParentSelector')"
    @confirm="emit('confirmParentImport')"
    @update:keyword="emit('updateParentSelectorKeyword', $event)"
  />

  <ModuleMaterialImportDialogs
    :import-visible="materialImportVisible"
    :import-loading="materialImportLoading"
    :import-file="materialImportFile"
    :result-visible="materialImportResultVisible"
    :result="materialImportResult"
    :before-upload="handleMaterialImportBeforeUpload"
    @cancel-import="emit('cancelMaterialImport')"
    @submit-import="emit('submitMaterialImport')"
    @close-result="emit('closeMaterialImportResult')"
  />
</template>
