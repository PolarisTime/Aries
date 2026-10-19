import { useQuery } from '@tanstack/react-query'
import { Modal, Skeleton } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listPermissions } from '@/api/system/permissions'
import { getRole } from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { RoleResponse } from '@/shared/schemas'
import { RolePermissionMatrixEditor } from '@/views/system/RolePermissionMatrixEditor'
import {
  hasWildcardPermission,
  isWildcardPermission,
} from '@/views/system/role-permission-utils'

interface Props {
  role: RoleResponse | null
  saving: boolean
  onSave: (payload: { id: string; permissions: string[] }) => void
  onClose: () => void
}

export function RolePermissionMatrixModal({
  role,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const roleId = role?.id ?? ''
  /** 用户改动后的完整选择；null 表示还没动过，沿用来源角色的权限。 */
  const [edited, setEdited] = useState<string[] | null>(null)

  const catalogQuery = useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: ({ signal }) => listPermissions(signal),
    enabled: Boolean(roleId),
  })

  const roleQuery = useQuery({
    queryKey: QUERY_KEYS.role(roleId),
    queryFn: ({ signal }) => getRole(roleId, signal),
    enabled: Boolean(roleId),
  })
  const wildcard = hasWildcardPermission(roleQuery.data?.permissions ?? [])

  const effectiveSelected = edited ?? roleQuery.data?.permissions ?? []

  const handleSave = () => {
    if (!roleId) return
    const effective = effectiveSelected
    onSave({
      id: roleId,
      permissions: effective.filter((code) => !isWildcardPermission(code)),
    })
  }
  return (
    <Modal
      open={Boolean(role)}
      title={t('system.role.permissionMatrixTitle', { name: role?.name ?? '' })}
      width={1280}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      okButtonProps={{ disabled: wildcard }}
      onOk={handleSave}
      onCancel={onClose}
      destroyOnHidden
    >
      {/* 与新建/编辑向导共用同一个矩阵编辑器：两处看到的结构、分组、动作列必须一致，
          否则「查看权限」与「配置权限」会对同一份数据给出不同印象。 */}
      {roleQuery.data ? (
        <RolePermissionMatrixEditor
          permissions={catalogQuery.data ?? []}
          selected={effectiveSelected}
          onChange={setEdited}
          loading={catalogQuery.isLoading}
          wildcard={wildcard}
        />
      ) : (
        <Skeleton active paragraph={{ rows: 8 }} />
      )}
    </Modal>
  )
}
