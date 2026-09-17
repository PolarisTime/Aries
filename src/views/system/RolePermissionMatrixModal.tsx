import { useQuery } from '@tanstack/react-query'
import { Modal, Skeleton } from 'antd'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getRole } from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { RoleResponse } from '@/shared/schemas'
import { RolePermissionPicker } from '@/views/system/RolePermissionPicker'
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
  const selectedRef = useRef<string[]>([])
  const touchedRef = useRef(false)

  const roleQuery = useQuery({
    queryKey: QUERY_KEYS.role(roleId),
    queryFn: ({ signal }) => getRole(roleId, signal),
    enabled: Boolean(roleId),
  })
  const wildcard = hasWildcardPermission(roleQuery.data?.permissions ?? [])

  const handleSave = () => {
    if (!roleId) return
    const effective = touchedRef.current
      ? selectedRef.current
      : (roleQuery.data?.permissions ?? [])
    onSave({
      id: roleId,
      permissions: effective.filter((code) => !isWildcardPermission(code)),
    })
  }
  return (
    <Modal
      open={Boolean(role)}
      title={t('system.role.permissionMatrixTitle', { name: role?.name ?? '' })}
      width={860}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      okButtonProps={{ disabled: wildcard }}
      onOk={handleSave}
      onCancel={onClose}
      destroyOnHidden
    >
      {roleQuery.data ? (
        <RolePermissionPicker
          key={roleId}
          initialSelected={roleQuery.data.permissions}
          onSelectedChange={(next) => {
            touchedRef.current = true
            selectedRef.current = next
          }}
          wildcard={wildcard}
        />
      ) : (
        <Skeleton active paragraph={{ rows: 8 }} />
      )}
    </Modal>
  )
}
