import { PlusOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Empty from 'antd/es/empty'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import type { RoleRecord } from '@/api/role-actions'
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
  return (
    <Card
      title="角色列表"
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
            新增
          </Button>
        )
      }
    >
      {roles.map((role) => (
        <div
          key={role.id}
          className="rounded cursor-pointer mb-4"
          style={{
            padding: '12px 16px',
            border:
              selectedRoleId === role.id
                ? '1px solid var(--theme-highlight-border)'
                : '1px solid transparent',
            background:
              selectedRoleId === role.id
                ? 'var(--theme-highlight-bg)'
                : undefined,
          }}
          onClick={() => onSelectRole(role)}
        >
          <div className="flex justify-between mb-4">
            <Typography.Text strong>{role.roleName}</Typography.Text>
            <Tag
              color={role.status === enabledStatusValues[0] ? 'green' : 'red'}
              className="ml-8"
            >
              {role.status}
            </Tag>
          </div>
          <div className="flex gap-8 text-xs text-secondary">
            <span>{role.roleCode}</span>
            <span>{role.roleType}</span>
            <span>{role.userCount} 用户</span>
          </div>
        </div>
      ))}
      {roles.length === 0 && <Empty description="暂无角色" />}
    </Card>
  )
}
