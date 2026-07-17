import {
  AppstoreOutlined,
  BorderOutlined,
  CheckSquareOutlined,
  SafetyCertificateOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Radio,
  Space,
  Table,
  Typography,
} from 'antd'
import { useTranslation } from 'react-i18next'
import type { MenuNode, RoleRecord } from '@/api/role-actions'
import type { ModuleRecord } from '@/types/module-page'

type MatrixRow = ModuleRecord

interface Props {
  selectedRoleInfo?: RoleRecord
  viewMode: 'list' | 'matrix'
  menuTree: MenuNode[]
  matrixColumns: TableColumnsType<MatrixRow>
  matrixData: MatrixRow[]
  permissionActions: {
    editable: boolean
    saving: boolean
    blocked: boolean
  }
  onSelectAll: () => void
  onDeselectAll: () => void
  onViewModeChange: (value: 'list' | 'matrix') => void
  onSave: () => void
  isMenuChecked: (menuCode: string) => boolean
  isMenuPartiallyChecked: (menu: MenuNode) => boolean
  isActionSelected: (menuCode: string, action: string) => boolean
  onToggleAllMenuActions: (menu: MenuNode) => void
  onToggleAction: (menuCode: string, action: string) => void
  isActionEditable: (menuCode: string, action: string) => boolean
  actionLabels: Record<string, string>
}

export function RoleActionPermissionCard({
  selectedRoleInfo,
  viewMode,
  menuTree,
  matrixColumns,
  matrixData,
  permissionActions,
  onSelectAll,
  onDeselectAll,
  onViewModeChange,
  onSave,
  isMenuChecked,
  isMenuPartiallyChecked,
  isActionSelected,
  onToggleAllMenuActions,
  onToggleAction,
  isActionEditable,
  actionLabels,
}: Props) {
  const { t } = useTranslation()
  return (
    <Card
      size="small"
      className="h-full flex flex-col"
      styles={{ body: { flex: 1, overflow: 'auto' } }}
      title={
        <Space wrap>
          <SafetyCertificateOutlined />
          <span>
            {selectedRoleInfo
              ? `${selectedRoleInfo.roleName} - ${t('system.rolePermission.permConfig')}`
              : t('system.rolePermission.selectRole')}
          </span>
        </Space>
      }
      extra={
        selectedRoleInfo && (
          <Space size="small" wrap>
            {permissionActions.editable && (
              <Button
                size="small"
                icon={<CheckSquareOutlined />}
                onClick={onSelectAll}
              >
                {t('system.rolePermission.selectAll')}
              </Button>
            )}
            {permissionActions.editable && (
              <Button
                size="small"
                icon={<BorderOutlined />}
                onClick={onDeselectAll}
              >
                {t('system.rolePermission.deselectAll')}
              </Button>
            )}
            {permissionActions.editable && (
              <span className="inline-block border-l border-l-[var(--theme-card-border)] h-5" />
            )}
            <Radio.Group
              size="small"
              value={viewMode}
              onChange={(event) => onViewModeChange(event.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="list">
                <UnorderedListOutlined /> {t('system.rolePermission.listView')}
              </Radio.Button>
              <Radio.Button value="matrix">
                <AppstoreOutlined /> {t('system.rolePermission.matrixView')}
              </Radio.Button>
            </Radio.Group>
            <span className="inline-block border-l border-l-[var(--theme-card-border)] h-5" />
            {permissionActions.editable && (
              <Button
                type="primary"
                size="small"
                loading={permissionActions.saving}
                onClick={onSave}
              >
                {t('system.rolePermission.savePerm')}
              </Button>
            )}
          </Space>
        )
      }
    >
      {selectedRoleInfo ? (
        <div>
          {permissionActions.blocked && (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              title={t('system.rolePermissions.noEditPermission')}
            />
          )}
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title={t('system.rolePermission.attachmentPermTitle')}
            description={t('system.rolePermission.attachmentPermDesc')}
          />
          {viewMode === 'list' ? (
            <div>
              {menuTree.map((group) => (
                <div key={group.menuCode} className="mb-4">
                  {group.children.length > 0 && (
                    <div className="mb-8 py-2 border-b border-b-[var(--theme-card-border)]">
                      <Typography.Text strong>{group.menuName}</Typography.Text>
                    </div>
                  )}
                  {(group.children.length > 0
                    ? group.children
                    : [group]
                  ).flatMap((child) =>
                    child.actions.length > 0
                      ? [
                          <div
                            key={child.menuCode}
                            className="flex items-center py-1.5 pl-4"
                          >
                            <div className="w-160 flex-shrink-0">
                              <Checkbox
                                checked={isMenuChecked(child.menuCode)}
                                indeterminate={isMenuPartiallyChecked(child)}
                                disabled={
                                  !child.actions.some((action) =>
                                    isActionEditable(child.menuCode, action),
                                  )
                                }
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
                                  checked={isActionSelected(
                                    child.menuCode,
                                    action,
                                  )}
                                  disabled={
                                    !isActionEditable(child.menuCode, action)
                                  }
                                  onChange={() =>
                                    onToggleAction(child.menuCode, action)
                                  }
                                >
                                  {actionLabels[action] || action}
                                </Checkbox>
                              ))}
                            </Space>
                          </div>,
                        ]
                      : [],
                  )}
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
          description={t('system.rolePermission.selectRoleHint')}
          className="mt-120"
        />
      )}
    </Card>
  )
}
