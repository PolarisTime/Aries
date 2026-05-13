import { useCallback } from 'react'
import { deleteBusinessModule } from '@/api/business'
import type { ActionItem } from '@/components/TableActions'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import {
  isDeleteBlockedByStatus,
  isEditBlockedByStatus,
} from '@/views/modules/module-behavior-registry'

type Props = {
  moduleKey: string
  resourceKey?: string
  onEdit: (record: ModuleRecord) => void
  onAttach: (record: ModuleRecord) => void
  onRefresh: () => Promise<void>
}

export function useModuleRecordActions({
  moduleKey,
  resourceKey,
  onEdit,
  onAttach,
  onRefresh,
}: Props) {
  const can = usePermissionStore((s) => s.can)
  const resource = resourceKey || moduleKey

  const buildActions = useCallback(
    (record: ModuleRecord): ActionItem[] => {
      const items: ActionItem[] = []
      const editBlocked = isEditBlockedByStatus(record.status)
      const deleteBlocked = isDeleteBlockedByStatus(record.status)
      if (can(resource, 'update')) {
        items.push({
          key: 'edit',
          label: '编辑',
          disabled: editBlocked,
          onClick: () => onEdit(record),
        })
      }
      if (can(resource, 'read') || can(resource, 'update')) {
        items.push({
          key: 'attach',
          label: '附件',
          onClick: () => onAttach(record),
        })
      }
      if (can(resource, 'delete')) {
        items.push({
          key: 'delete',
          label: '删除',
          danger: true,
          disabled: deleteBlocked,
          confirm: '确认删除该记录？',
          onClick: () => {
            try {
              await deleteBusinessModule(moduleKey, String(record.id))
              message.success('删除成功')
              await onRefresh()
            } catch (err) {
              message.error(err instanceof Error ? err.message : '删除失败')
            }
          },
        })
      }
      return items
    },
    [can, resource, moduleKey, onEdit, onAttach, onRefresh],
  )

  return { buildActions }
}
