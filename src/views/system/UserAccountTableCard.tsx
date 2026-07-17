import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import type { ProColumns } from '@ant-design/pro-components/es/table'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppProTable } from '@/components/AppProTable'
import { StatusTag } from '@/components/StatusTag'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { TableActions } from '@/components/TableActions'
import { enabledStatusOptions } from '@/constants/module-options'
import { createPaginationConfig } from '@/hooks/usePaginationConfig'
import type { UserAccountRecord } from '@/shared/schemas'
import { formatDateTime } from '@/utils/formatters'

interface Props {
  keyword: string
  statusFilter?: string
  currentPage: number
  pageSize: number
  totalElements: number
  users: UserAccountRecord[]
  loading: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  getStatusColor: (value: string) => string
  onKeywordChange: (value: string) => void
  onSearch: () => void
  onStatusFilterChange: (value?: string) => void
  onRefresh: () => void
  onCreate: () => void
  onView: (record: UserAccountRecord) => void
  onEdit: (record: UserAccountRecord) => void
  onDelete: (record: UserAccountRecord) => void
  onPageChange: (page: number, pageSize: number) => void
}
export function UserAccountTableCard({
  keyword,
  statusFilter,
  currentPage,
  pageSize,
  totalElements,
  users,
  loading,
  canCreate,
  canEdit,
  canDelete,
  getStatusColor,
  onKeywordChange,
  onSearch,
  onStatusFilterChange,
  onRefresh,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onPageChange,
}: Props) {
  const { t } = useTranslation()
  const columns: ProColumns<UserAccountRecord>[] = [
    {
      title: t('system.userAccountTable.colOperation'),
      key: 'action',
      width: 260,
      fixed: 'left' as const,
      render: (_: unknown, record: UserAccountRecord) => (
        <TableActions
          items={[
            {
              key: 'view',
              label: t('system.userAccountTable.view'),
              icon: <EyeOutlined />,
              onClick: () => onView(record),
            },
            {
              key: 'edit',
              label: t('system.userAccountTable.edit'),
              icon: <EditOutlined />,
              visible: canEdit,
              onClick: () => onEdit(record),
            },
            {
              key: 'delete',
              label: t('system.userAccountTable.delete'),
              icon: <DeleteOutlined />,
              danger: true,
              visible: canDelete,
              onClick: () => onDelete(record),
            },
          ]}
        />
      ),
    },
    {
      dataIndex: 'loginName',
      title: t('system.userAccountTable.colLoginName'),
      width: 140,
    },
    {
      dataIndex: 'userName',
      title: t('system.userAccountTable.colUserName'),
      width: 140,
    },
    {
      dataIndex: 'departmentName',
      title: t('system.userAccountTable.colDepartment'),
      width: 140,
      render: (_dom, record) => record.departmentName || '--',
    },
    {
      dataIndex: 'mobile',
      title: t('system.userAccountTable.colMobile'),
      width: 140,
      render: (_dom, record) => record.mobile || '--',
    },
    {
      dataIndex: 'roleNames',
      title: t('system.userAccountTable.colRoles'),
      width: 220,
      render: (_dom, record) =>
        Array.isArray(record.roleNames) ? record.roleNames.join('、') : '--',
    },
    {
      dataIndex: 'status',
      title: t('system.userAccountTable.colStatus'),
      width: 100,
      align: 'center' as const,
      render: (_dom, record) => (
        <StatusTag
          status={record.status}
          statusMap={{
            [record.status]: {
              color: getStatusColor(record.status),
              label: record.status,
            },
          }}
        />
      ),
    },
    {
      dataIndex: 'lastLoginDate',
      title: t('system.userAccountTable.colLastLogin'),
      width: 180,
      render: (_dom, record) => formatDateTime(record.lastLoginDate, '--'),
    },
  ]
  return (
    <AppProTable<UserAccountRecord>
      rowKey="id"
      columns={columns}
      dataSource={users}
      loading={loading}
      scroll={{ x: 1400 }}
      headerTitle={t('system.userAccountTable.title')}
      toolBarRender={() => [
        <SystemTableToolbar
          key="user-account-toolbar"
          keyword={keyword}
          keywordPlaceholder={t('system.userAccountTable.searchPlaceholder')}
          onKeywordChange={onKeywordChange}
          onSearch={onSearch}
          onRefresh={onRefresh}
          onCreate={canCreate ? onCreate : undefined}
        >
          <Select
            allowClear
            placeholder={t('system.userAccountTable.allStatus')}
            className="w-140"
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={enabledStatusOptions}
          />
        </SystemTableToolbar>,
      ]}
      pagination={createPaginationConfig({
        current: currentPage,
        pageSize,
        total: totalElements,
        onChange: onPageChange,
        t,
      })}
    />
  )
}
