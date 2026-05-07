import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import TableRowActions from '@/views/modules/components/TableRowActions.vue'
import { useModuleGridRowRenderers } from '../use-module-grid-row-renderers'

describe('useModuleGridRowRenderers', () => {
  it('passes audit capabilities and labels to row actions', () => {
    const { rowActionsRenderer } = useModuleGridRowRenderers({
      isReadOnly: ref(false),
      canViewRecords: ref(true),
      canEditRecord: () => false,
      canManageAttachments: ref(true),
      visibleActionKeys: ref(['attachment']),
      canAuditRecord: () => true,
      canReverseAuditRecord: () => false,
      auditActionLabel: ref('确认'),
      reverseAuditActionLabel: ref('反确认'),
      canDeleteRecord: () => true,
      itemColumns: ref(undefined),
      isExpandedDetailLoading: () => false,
      getExpandedDetailItems: () => [],
      detailTableColumns: ref([]),
      detailTableScroll: ref({ x: 0 }),
      formatCellValue: () => '',
      getStatusMeta: () => ({ text: '待确认', color: 'warning' }),
      handleView: vi.fn(),
      handleEdit: vi.fn(),
      handleAuditRecord: vi.fn(),
      handleReverseAuditRecord: vi.fn(),
      handleDelete: vi.fn(),
      openAttachmentDialog: vi.fn(),
    })

    const vnode = rowActionsRenderer({ id: 'row-1', status: '待确认' }) as {
      type: unknown
      props: Record<string, unknown>
    }

    expect(vnode.type).toBe(TableRowActions)
    expect(vnode.props.canAudit).toBe(true)
    expect(vnode.props.canReverseAudit).toBe(false)
    expect(vnode.props.canEdit).toBe(false)
    expect(vnode.props.auditLabel).toBe('确认')
    expect(vnode.props.reverseAuditLabel).toBe('反确认')
    expect(vnode.props.visibleActionKeys).toEqual(['attachment'])
  })
})
