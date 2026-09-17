import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Empty, Flex, Input, Select, Space, Table, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { StatusTag } from '@/components/StatusTag'
import { useHasPermission } from '@/hooks/usePermission'
import type { UserAccountResponse } from '@/shared/schemas'

interface Props {
  users: UserAccountResponse[]
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
  onEdit: (user: UserAccountResponse) => void
  onReset: (user: UserAccountResponse) => void
  onRoles: (user: UserAccountResponse) => void
  onToggleStatus: (user: UserAccountResponse) => void
  onDelete: (user: UserAccountResponse) => void
}

function formatLastLogin(value: string | null | undefined): string {
  if (!value) return '--'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : '--'
}

export function UserAccountTableCard({
  users,
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
  onReset,
  onRoles,
  onToggleStatus,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  const canWrite = useHasPermission('user-accounts:write')
  const canAssignRoles = useHasPermission('user-accounts:update')

  const statusMap = {
    NORMAL: { color: 'green', label: t('system.userAccount.statusNormal') },
    DISABLED: {
      color: 'default',
      label: t('system.userAccount.statusDisabled'),
    },
  }

  const columns: TableColumnsType<UserAccountResponse> = [
    {
      title: t('system.userAccount.loginName'),
      dataIndex: 'loginName',
      key: 'loginName',
      width: 160,
    },
    {
      title: t('system.userAccount.userName'),
      dataIndex: 'userName',
      key: 'userName',
      width: 160,
    },
    {
      title: t('system.userAccount.mobile'),
      dataIndex: 'mobile',
      key: 'mobile',
      width: 140,
      render: (value: string | null | undefined) => value || '--',
    },
    {
      title: t('system.userAccount.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: string) => (
        <StatusTag status={value} statusMap={statusMap} />
      ),
    },
    {
      title: t('system.userAccount.lastLoginDate'),
      dataIndex: 'lastLoginDate',
      key: 'lastLoginDate',
      width: 170,
      render: (value: string | null | undefined) => formatLastLogin(value),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_value, record) => {
        if (!canWrite && !canAssignRoles) {
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
                disabled={!canWrite}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
            <Tooltip title={t('system.userAccount.assignRoles')}>
              <Button
                type="text"
                size="small"
                icon={<SafetyOutlined />}
                aria-label={t('system.userAccount.assignRoles')}
                disabled={!canAssignRoles}
                onClick={() => onRoles(record)}
              />
            </Tooltip>
            <Tooltip title={t('system.userAccount.resetPassword')}>
              <Button
                type="text"
                size="small"
                icon={<KeyOutlined />}
                aria-label={t('system.userAccount.resetPassword')}
                disabled={!canWrite}
                onClick={() => onReset(record)}
              />
            </Tooltip>
            <Button
              size="small"
              loading={statusPending}
              disabled={!canWrite}
              onClick={() => onToggleStatus(record)}
            >
              {record.status === 'NORMAL'
                ? t('system.userAccount.disable')
                : t('system.userAccount.enable')}
            </Button>
            <Tooltip title={t('system.userAccount.deleteUser')}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('common.delete')}
                disabled={!canWrite}
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
            id="user-account-search"
            name="user-account-search"
            allowClear
            value={keywordInput}
            className="w-240"
            placeholder={t('system.userAccount.searchPlaceholder')}
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
            aria-label={t('system.userAccount.status')}
            value={status}
            allowClear
            className="w-160"
            placeholder={t('system.userAccount.statusFilter')}
            options={[
              { value: 'NORMAL', label: t('system.userAccount.statusNormal') },
              {
                value: 'DISABLED',
                label: t('system.userAccount.statusDisabled'),
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
            {t('system.userAccount.newUser')}
          </Button>
        </Space>
      </Flex>
      <Table<UserAccountResponse>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={users}
        loading={loading}
        scroll={{ x: 980 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('system.userAccount.emptyList')}
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
