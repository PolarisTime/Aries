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
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
              ? `${selectedRoleInfo.roleName} - ${t('system.rolePermission.permConfig')}`
              : t('system.rolePermission.selectRole')}
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
                {t('system.rolePermission.selectAll')}
              </Button>
            )}
            {canEditPermissions && (
              <Button
                size="small"
                icon={<BorderOutlined />}
                onClick={onDeselectAll}
              >
                {t('system.rolePermission.deselectAll')}
              </Button>
            )}
            {canEditPermissions && (
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
            {canEditPermissions && (
              <Button
                type="primary"
                size="small"
                loading={saveLoading}
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
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message={t('system.rolePermission.attachmentPermTitle')}
            description={t('system.rolePermission.attachmentPermDesc')}
          />
          {viewMode === 'list' ? (
            <div>
              {menuTree.map((group) => (
                <div key={group.menuCode} className="mb-4">
                  {group.children.length > 0 && (
                    <div
                      className="mb-8 py-2 border-b border-b-[var(--theme-card-border)]"
                    >
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
                                  checked={isActionSelected(
                                    child.menuCode,
                                    action,
                                  )}
                                  disabled={!canEditPermissions}
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
