import {
  AppstoreOutlined,
  BorderOutlined,
  CheckSquareOutlined,
  SafetyCertificateOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Checkbox from 'antd/es/checkbox'
import Empty from 'antd/es/empty'
import Radio from 'antd/es/radio'
import Space from 'antd/es/space'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import type { MenuNode, RoleRecord } from '@/api/role-actions'
import type { ModuleRecord } from '@/types/module-page'

type MatrixRow = ModuleRecord

interface Props {
  selectedRoleInfo?: RoleRecord
  canEditPermissions: boolean
  viewMode: 'list' | 'matrix'
  menuTree: MenuNode[]
  matrixColumns: TableColumnsType<MatrixRow>
  matrixData: MatrixRow[]
  saveLoading: boolean
  onSelectAll: () => void
  onDeselectAll: () => void
  onViewModeChange: (value: 'list' | 'matrix') => void
  onSave: () => void
  isMenuChecked: (menuCode: string) => boolean
  isMenuPartiallyChecked: (menu: MenuNode) => boolean
  isActionSelected: (menuCode: string, action: string) => boolean
  onToggleAllMenuActions: (menu: MenuNode) => void
  onToggleAction: (menuCode: string, action: string) => void
  actionLabels: Record<string, string>
}

export function RoleActionPermissionCard({
  selectedRoleInfo,
  canEditPermissions,
  viewMode,
  menuTree,
  matrixColumns,
  matrixData,
  saveLoading,
  onSelectAll,
  onDeselectAll,
  onViewModeChange,
  onSave,
  isMenuChecked,
  isMenuPartiallyChecked,
  isActionSelected,
  onToggleAllMenuActions,
  onToggleAction,
  actionLabels,
}: Props) {
  return (
    <Card
      size="small"
      className="h-full flex flex-col"
      styles={{ body: { flex: 1, overflow: 'auto' } }}
      title={
        <Space>
          <SafetyCertificateOutlined />
          <span>
            {selectedRoleInfo
              ? `${selectedRoleInfo.roleName} - 权限配置`
              : '请选择角色'}
          </span>
        </Space>
      }
      extra={
        selectedRoleInfo && (
          <Space size="small">
            {canEditPermissions && (
              <Button
                size="small"
                icon={<CheckSquareOutlined />}
                onClick={onSelectAll}
              >
                全选
              </Button>
            )}
            {canEditPermissions && (
              <Button
                size="small"
                icon={<BorderOutlined />}
                onClick={onDeselectAll}
              >
                全不选
              </Button>
            )}
            {canEditPermissions && (
              <span className="inline-block" style={{ borderLeft: '1px solid var(--theme-card-border)', height: 20 }} />
            )}
            <Radio.Group
              size="small"
              value={viewMode}
              onChange={(event) => onViewModeChange(event.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="list">
                <UnorderedListOutlined /> 列表
              </Radio.Button>
              <Radio.Button value="matrix">
                <AppstoreOutlined /> 矩阵
              </Radio.Button>
            </Radio.Group>
            <span className="inline-block" style={{ borderLeft: '1px solid var(--theme-card-border)', height: 20 }} />
            {canEditPermissions && (
              <Button
                type="primary"
                size="small"
                loading={saveLoading}
                onClick={onSave}
              >
                保存权限
              </Button>
            )}
          </Space>
        )
      }
    >
      {selectedRoleInfo ? (
        <div>
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message="附件权限说明"
            description="附件不单独配置权限，默认跟随对应模块权限：有查看权限可查看和下载附件，有编辑权限可上传附件，有删除权限可删除附件。"
          />
          {viewMode === 'list' ? (
            <div>
              {menuTree.map((group) => (
                <div key={group.menuCode} className="mb-4">
                  {group.children.length > 0 && (
                    <div
                      className="mb-8"
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid var(--theme-card-border)',
                      }}
                    >
                      <Typography.Text strong>{group.menuName}</Typography.Text>
                    </div>
                  )}
                  {(group.children.length > 0 ? group.children : [group])
                    .filter((menu) => menu.actions.length > 0)
                    .map((child) => (
                      <div
                        key={child.menuCode}
                        className="flex items-center"
                        style={{ padding: '6px 0 6px 16px' }}
                      >
                        <div className="w-160 flex-shrink-0">
                          <Checkbox
                            checked={isMenuChecked(child.menuCode)}
                            indeterminate={isMenuPartiallyChecked(child)}
                            disabled={!canEditPermissions}
                            onChange={() => onToggleAllMenuActions(child)}
                          >
                            <Typography.Text strong>
                              {child.menuName}
                            </Typography.Text>
                          </Checkbox>
                        </div>
                        <Space size={16} wrap>
                          {child.actions.map((action) => (
                            <Checkbox
                              key={action}
                              checked={isActionSelected(child.menuCode, action)}
                              disabled={!canEditPermissions}
                              onChange={() =>
                                onToggleAction(child.menuCode, action)
                              }
                            >
                              {actionLabels[action] || action}
                            </Checkbox>
                          ))}
                        </Space>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <Table
              rowKey="key"
              columns={matrixColumns}
              dataSource={matrixData}
              size="small"
              bordered
              pagination={false}
              scroll={{ x: 800 }}
            />
          )}
        </div>
      ) : (
        <Empty
          description="请从左侧选择一个角色来配置权限"
          className="mt-120"
        />
      )}
    </Card>
  )
}
