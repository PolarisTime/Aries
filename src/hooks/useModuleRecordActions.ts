import { useCallback } from 'react'
import { deleteBusinessModule } from '@/api/business'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import type { ActionItem } from '@/components/TableActions'
import { message } from '@/utils/antd-app'

interface Props {
  moduleKey: string
  resourceKey?: string
  onEdit: (record: ModuleRecord) => void
  onDetail: (record: ModuleRecord) => void
  onRefresh: () => Promise<void>
}

export function useModuleRecordActions({ moduleKey, resourceKey, onEdit, onDetail, onRefresh }: Props) {
  const can = usePermissionStore((s) => s.can)
  const resource = resourceKey || moduleKey

  const buildActions = useCallback(
    (record: ModuleRecord): ActionItem[] => {
      const items: ActionItem[] = []
      if (can(resource, 'read')) {
        items.push({ key: 'detail', label: '详情', onClick: () => onDetail(record) })
      }
      if (can(resource, 'update')) {
        items.push({ key: 'edit', label: '编辑', onClick: () => onEdit(record) })
      }
      if (can(resource, 'delete')) {
        items.push({
          key: 'delete', label: '删除', danger: true,
          confirm: '确认删除该记录？',
          onClick: async () => {
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
    [can, resource, moduleKey, onEdit, onDetail, onRefresh],
  )

  return { buildActions }
}
