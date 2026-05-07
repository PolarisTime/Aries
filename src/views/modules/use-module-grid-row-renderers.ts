import { h, type Ref, type VNodeChild } from 'vue'
import { Spin } from 'ant-design-vue'
import type { StatusMeta } from '@/composables/use-module-display-support'
import type { ModuleColumnDefinition, ModuleLineItem, ModuleRecord } from '@/types/module-page'
import DetailItemsTable from './components/DetailItemsTable.vue'
import TableRowActions from './components/TableRowActions.vue'

type TableColumn = Record<string, unknown>

interface UseModuleGridRowRenderersOptions {
  isReadOnly: Ref<boolean>
  canViewRecords: Ref<boolean>
  canEditRecord: (record: ModuleRecord) => boolean
  canManageAttachments: Ref<boolean>
  visibleActionKeys?: Ref<string[] | undefined>
  canAuditRecord: (record: ModuleRecord) => boolean
  canReverseAuditRecord: (record: ModuleRecord) => boolean
  auditActionLabel: Ref<string>
  reverseAuditActionLabel: Ref<string>
  canDeleteRecord: (record: ModuleRecord) => boolean
  isCustomGridRow?: (record: ModuleRecord | null | undefined) => boolean
  customRowActionsRenderer?: (record: ModuleRecord) => VNodeChild
  customExpandedRowRenderer?: (record: ModuleRecord) => VNodeChild
  itemColumns: Ref<ModuleColumnDefinition[] | undefined>
  isExpandedDetailLoading: (record: ModuleRecord) => boolean
  getExpandedDetailItems: (record: ModuleRecord) => ModuleLineItem[]
  detailTableColumns: Ref<TableColumn[]>
  detailTableScroll: Ref<{ x: number }>
  formatCellValue: (column: ModuleColumnDefinition | undefined, value: unknown) => string
  getStatusMeta: (value: unknown) => StatusMeta
  handleView: (record: ModuleRecord) => void | Promise<void>
  handleEdit: (record: ModuleRecord) => void | Promise<void>
  handleAuditRecord: (record: ModuleRecord) => void | Promise<void>
  handleReverseAuditRecord: (record: ModuleRecord) => void | Promise<void>
  handleDelete: (record: ModuleRecord) => void
  openAttachmentDialog: (record: ModuleRecord) => void | Promise<void>
}

export function useModuleGridRowRenderers(options: UseModuleGridRowRenderersOptions) {
  function renderRecordActions(record: ModuleRecord) {
    if (options.isCustomGridRow?.(record)) {
      return options.customRowActionsRenderer?.(record) ?? null
    }

    return h(TableRowActions, {
      record,
      canView: options.canViewRecords.value,
      canEdit: options.canEditRecord(record),
      canAudit: options.canAuditRecord(record),
      canReverseAudit: options.canReverseAuditRecord(record),
      auditLabel: options.auditActionLabel.value,
      reverseAuditLabel: options.reverseAuditActionLabel.value,
      canDelete: options.canDeleteRecord(record),
      canAttach: !options.isReadOnly.value && options.canManageAttachments.value,
      isReadOnly: options.isReadOnly.value,
      visibleActionKeys: options.visibleActionKeys?.value,
      onView: (row: ModuleRecord) => {
        void options.handleView(row)
      },
      onEdit: (row: ModuleRecord) => {
        void options.handleEdit(row)
      },
      onAudit: (row: ModuleRecord) => {
        void options.handleAuditRecord(row)
      },
      onReverseAudit: (row: ModuleRecord) => {
        void options.handleReverseAuditRecord(row)
      },
      onDelete: options.handleDelete,
      onAttachment: (row: ModuleRecord) => {
        void options.openAttachmentDialog(row)
      },
    })
  }

  function renderDetailExpandedRow(record: ModuleRecord) {
    return h(Spin, { spinning: options.isExpandedDetailLoading(record) }, {
      default: () => h(DetailItemsTable, {
        items: options.getExpandedDetailItems(record),
        columns: options.detailTableColumns.value,
        itemColumnsMeta: options.itemColumns.value,
        scrollX: options.detailTableScroll.value.x,
        formatCellValue: options.formatCellValue,
        getStatusMeta: options.getStatusMeta,
      }),
    })
  }

  function renderExpandedRow(record: ModuleRecord): VNodeChild {
    if (options.isCustomGridRow?.(record)) {
      return options.customExpandedRowRenderer?.(record) ?? null
    }
    if (options.itemColumns.value?.length) {
      return renderDetailExpandedRow(record)
    }
    return null
  }

  return {
    expandedRowRenderer: renderExpandedRow,
    rowActionsRenderer: renderRecordActions,
  }
}
