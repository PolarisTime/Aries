import { PlusOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Empty from 'antd/es/empty'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import type { RoleRecord } from '@/api/role-actions'
import { enabledStatusValues } from '@/constants/module-options'

type Props = {
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
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
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
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            marginBottom: 4,
            border:
              selectedRoleId === role.id
                ? '1px solid #91d5ff'
                : '1px solid transparent',
            background: selectedRoleId === role.id ? '#e6f7ff' : undefined,
          }}
          onClick={() => onSelectRole(role)}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Typography.Text strong>{role.roleName}</Typography.Text>
            <Tag
              color={role.status === enabledStatusValues[0] ? 'green' : 'red'}
              style={{ marginLeft: 8 }}
            >
              {role.status}
            </Tag>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              fontSize: 12,
              color: '#8c8c8c',
            }}
          >
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
