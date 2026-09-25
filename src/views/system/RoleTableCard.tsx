import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Empty,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import { useTranslation } from 'react-i18next'
import { StatusTag } from '@/components/StatusTag'
import { STATUS } from '@/constants/status-constants'
import { useHasPermission } from '@/hooks/usePermission'
import type { RoleResponse } from '@/shared/schemas'
import { canDeleteRole } from '@/views/system/role-permission-utils'

interface Props {
  roles: RoleResponse[]
  loading: boolean
  refreshing: boolean
  keywordInput: string
  status?: string
  page: number
  pageSize: number
  total: number
  statusPending: boolean
  deletePending: boolean
  onKeywordInputChange: (value: string) => void
  onKeywordSearch: (value: string) => void
  onStatusChange: (value: string | undefined) => void
  onPageChange: (page: number, pageSize: number) => void
  onRefresh: () => void
  onCreate: () => void
  onEdit: (role: RoleResponse) => void
  onClone: (role: RoleResponse) => void
  onPermissions: (role: RoleResponse) => void
  onToggleStatus: (role: RoleResponse) => void
  onDelete: (role: RoleResponse) => void
}

export function RoleTableCard({
  roles,
  loading,
  refreshing,
  keywordInput,
  status,
  page,
  pageSize,
  total,
  statusPending,
  deletePending,
  onKeywordInputChange,
  onKeywordSearch,
  onStatusChange,
  onPageChange,
  onRefresh,
  onCreate,
  onEdit,
  onClone,
  onPermissions,
  onToggleStatus,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  const canWrite = useHasPermission('roles:write')

  const statusMap = {
    正常: { color: 'green', label: t('system.role.statusNormal') },
    禁用: { color: 'default', label: t('system.role.statusDisabled') },
  }

  const columns: TableColumnsType<RoleResponse> = [
    {
      title: t('system.role.code'),
      dataIndex: 'code',
      key: 'code',
      width: 180,
      render: (code: string, record) => (
        <Space size={4}>
          <span>{code}</span>
          {record.builtin ? (
            <Tag color="blue">{t('system.role.builtin')}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: t('system.role.name'),
      dataIndex: 'name',
      key: 'name',
      width: 160,
    },
    {
      title: t('system.role.descriptionLabel'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value: string | null | undefined) => value || '--',
    },
    {
      title: t('system.role.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: string) => (
        <StatusTag status={value} statusMap={statusMap} />
      ),
    },
    {
      title: t('system.role.permissionCount'),
      dataIndex: 'permissionCount',
      key: 'permissionCount',
      width: 100,
      align: 'right',
    },
    {
      title: t('system.role.userCount'),
      dataIndex: 'userCount',
      key: 'userCount',
      width: 100,
      align: 'right',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_value, record) => {
        if (!canWrite) {
          return '--'
        }
        return (
          <Space size={4}>
            <Tooltip title={t('common.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                aria-label={t('common.edit')}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
            <Tooltip title={t('system.role.cloneRole')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                aria-label={t('system.role.cloneRole')}
                onClick={() => onClone(record)}
              />
            </Tooltip>
            <Tooltip title={t('system.role.permissions')}>
              <Button
                type="text"
                size="small"
                icon={<SafetyOutlined />}
                aria-label={t('system.role.permissions')}
                onClick={() => onPermissions(record)}
              />
            </Tooltip>
            <Tooltip
              title={record.builtin ? t('system.role.builtinHint') : undefined}
            >
              <Button
                size="small"
                loading={statusPending}
                disabled={record.builtin}
                onClick={() => onToggleStatus(record)}
              >
                {record.status === STATUS.NORMAL
                  ? t('system.role.disable')
                  : t('system.role.enable')}
              </Button>
            </Tooltip>
            <Tooltip
              title={
                canDeleteRole(record) ? undefined : t('system.role.builtinHint')
              }
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('common.delete')}
                disabled={!canDeleteRole(record)}
                loading={deletePending}
                onClick={() => onDelete(record)}
              />
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  return (
    <Flex vertical gap={12}>
      <Flex align="center" justify="space-between" gap={16} wrap>
        <Space wrap>
          <Input.Search
            id="role-management-search"
            name="role-management-search"
            allowClear
            value={keywordInput}
            className="w-240"
            placeholder={t('system.role.searchPlaceholder')}
            onChange={(event) => {
              const value = event.target.value
              onKeywordInputChange(value)
              if (!value) {
                onKeywordSearch('')
              }
            }}
            onSearch={onKeywordSearch}
          />
          <Select
            aria-label={t('system.role.status')}
            value={status}
            allowClear
            className="w-160"
            placeholder={t('system.role.statusFilter')}
            options={[
              { value: STATUS.NORMAL, label: t('system.role.statusNormal') },
              {
                value: STATUS.DISABLED,
                label: t('system.role.statusDisabled'),
              },
            ]}
            onChange={(value) => onStatusChange(value)}
          />
        </Space>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={onRefresh}
          >
            {t('common.refresh')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWrite}
            onClick={onCreate}
          >
            {t('system.role.newRole')}
          </Button>
        </Space>
      </Flex>
      <Table<RoleResponse>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={roles}
        loading={loading}
        scroll={{ x: 1080 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('system.role.emptyList')}
            />
          ),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => t('common.total', { count }),
          onChange: onPageChange,
        }}
      />
    </Flex>
  )
}
