import { PlusOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Empty from 'antd/es/empty'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import type { RoleRecord } from '@/api/role-actions'
import { StatusTag } from '@/components/StatusTag'
import { enabledStatusValues } from '@/constants/module-options'

interface Props {
  roles: RoleRecord[]
  selectedRoleId: string | null
  canCreateRole: boolean
  onCreate: () => void
  onSelectRole: (role: RoleRecord) => void
}

export function RoleActionRoleListCard({
  roles,
  selectedRoleId,
  canCreateRole,
  onCreate,
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
        <button
          type="button"
          key={role.id}
          className={`block w-full text-left bg-transparent rounded cursor-pointer mb-4 py-3 px-4 border ${
            selectedRoleId === role.id
              ? 'border-[var(--theme-highlight-border)] bg-[var(--theme-highlight-bg)]'
              : 'border-transparent'
          }`}
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
      ))}
      {roles.length === 0 && (
        <Empty description={t('system.roleList.noRoles')} />
      )}
    </Card>
  )
}
