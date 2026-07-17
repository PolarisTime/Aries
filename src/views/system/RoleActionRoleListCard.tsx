import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { RoleRecord } from '@/api/role-actions'
import { StatusTag } from '@/components/StatusTag'
import { enabledStatusValues } from '@/constants/module-options'

interface Props {
  roles: RoleRecord[]
  selectedRoleId: string | null
  canCreateRole: boolean
  canEditRole: boolean
  canDeleteRole: boolean
  deletingRoleId: string | null
  onCreate: () => void
  onEdit: (role: RoleRecord) => void
  onDelete: (role: RoleRecord) => void
  onSelectRole: (role: RoleRecord) => void
}

export function RoleActionRoleListCard({
  roles,
  selectedRoleId,
  canCreateRole,
  canEditRole,
  canDeleteRole,
  deletingRoleId,
  onCreate,
  onEdit,
  onDelete,
  onSelectRole,
}: Props) {
  const { t } = useTranslation()
  return (
    <Card
      title={t('system.roleList.title')}
      size="small"
      className="h-full flex flex-col"
      styles={{ body: { flex: 1, overflow: 'auto', padding: 8 } }}
      extra={
        canCreateRole && (
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            {t('system.roleList.create')}
          </Button>
        )
      }
    >
      {roles.map((role) => (
        <div
          key={role.id}
          className={`flex w-full rounded mb-4 border ${
            selectedRoleId === role.id
              ? 'border-[var(--theme-highlight-border)] bg-[var(--theme-highlight-bg)]'
              : 'border-transparent'
          }`}
        >
          <button
            type="button"
            className="min-w-0 flex-1 cursor-pointer bg-transparent py-3 px-4 text-left"
            onClick={() => onSelectRole(role)}
          >
            <div className="flex justify-between mb-4">
              <Typography.Text strong>{role.roleName}</Typography.Text>
              <StatusTag
                status={role.status}
                statusMap={{
                  [role.status]: {
                    color:
                      role.status === enabledStatusValues[0] ? 'green' : 'red',
                    label: role.status,
                  },
                }}
                className="ml-8"
              />
            </div>
            <div className="flex gap-8 text-xs text-secondary">
              <span>{role.roleCode}</span>
              <span>{role.roleType}</span>
              <span>
                {role.userCount} {t('system.roleList.userCount')}
              </span>
            </div>
          </button>
          {(canEditRole || canDeleteRole) && (
            <Space size={0} className="pr-2">
              {canEditRole &&
                (role.roleCode.trim().toUpperCase() !== 'ADMIN' ||
                  role.assignable === true) && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    aria-label={t('common.edit')}
                    title={t('common.edit')}
                    onClick={() => onEdit(role)}
                  />
                )}
              {canDeleteRole &&
                role.roleCode.trim().toUpperCase() !== 'ADMIN' && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={t('common.delete')}
                    title={t('common.delete')}
                    loading={deletingRoleId === role.id}
                    onClick={() => onDelete(role)}
                  />
                )}
            </Space>
          )}
        </div>
      ))}
      {roles.length === 0 && (
        <Empty description={t('system.roleList.noRoles')} />
      )}
    </Card>
  )
}
