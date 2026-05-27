import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import { useTranslation } from 'react-i18next'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { enabledStatusOptions } from '@/constants/module-options'
import { createPaginationConfig } from '@/hooks/usePaginationConfig'
import type { UserAccountRecord } from '@/types/user-account'

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
  getTotpColor: (enabled: boolean) => string
  onKeywordChange: (value: string) => void
  onSearch: () => void
  onStatusFilterChange: (value?: string) => void
  onRefresh: () => void
  onCreate: () => void
  onView: (record: UserAccountRecord) => void
  onEdit: (record: UserAccountRecord) => void
  onManage2fa: (record: UserAccountRecord) => void
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
  getTotpColor,
  onKeywordChange,
  onSearch,
  onStatusFilterChange,
  onRefresh,
  onCreate,
  onView,
  onEdit,
  onManage2fa,
  onDelete,
  onPageChange,
}: Props) {
  const { t } = useTranslation()
  const columns = [
    {
      title: t('system.userAccountTable.colOperation'),
      key: 'action',
      width: 260,
      fixed: 'left' as const,
      render: (_: unknown, record: UserAccountRecord) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            {t('system.userAccountTable.view')}
          </Button>
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              {t('system.userAccountTable.edit')}
            </Button>
          )}
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => onManage2fa(record)}
            >
              2FA
            </Button>
          )}
          {canDelete && record.loginName !== 'admin' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record)}
            >
              {t('system.userAccountTable.delete')}
            </Button>
          )}
        </Space>
      ),
    },
    { dataIndex: 'loginName', title: t('system.userAccountTable.colLoginName'), width: 140 },
    { dataIndex: 'userName', title: t('system.userAccountTable.colUserName'), width: 140 },
    {
      dataIndex: 'departmentName',
      title: t('system.userAccountTable.colDepartment'),
      width: 140,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'mobile',
      title: t('system.userAccountTable.colMobile'),
      width: 140,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'roleNames',
      title: t('system.userAccountTable.colRoles'),
      width: 220,
      render: (names: string[]) =>
        Array.isArray(names) ? names.join('、') : '--',
    },
    {
      dataIndex: 'dataScope',
      title: t('system.userAccountTable.colDataScope'),
      width: 120,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'totpEnabled',
      title: t('system.userAccountTable.colTotpStatus'),
      width: 110,
      align: 'center' as const,
      render: (value: boolean) => (
        <Tag color={getTotpColor(!!value)}>{value ? t('system.userAccountTable.totpEnabled') : t('system.userAccountTable.totpDisabled')}</Tag>
      ),
    },
    {
      dataIndex: 'status',
      title: t('system.userAccountTable.colStatus'),
      width: 100,
      align: 'center' as const,
      render: (value: string) => (
        <Tag color={getStatusColor(value)}>{value}</Tag>
      ),
    },
    {
      dataIndex: 'lastLoginDate',
      title: t('system.userAccountTable.colLastLogin'),
      width: 180,
      render: (value: string) => value || '--',
    },
  ]
  return (
    <Card
      title={t('system.userAccountTable.title')}
      extra={
        <SystemTableToolbar
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
        </SystemTableToolbar>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        size="middle"
        scroll={{ x: 1400 }}
        pagination={createPaginationConfig({
          current: currentPage,
          pageSize,
          total: totalElements,
          onChange: onPageChange,
          t,
        })}
      />
    </Card>
  )
}
