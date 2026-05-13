import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import { enabledStatusOptions } from '@/constants/module-options'
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
  const columns = [
    {
      title: '操作',
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
            查看
          </Button>
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              编辑
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
              删除
            </Button>
          )}
        </Space>
      ),
    },
    { dataIndex: 'loginName', title: '登录账号', width: 140 },
    { dataIndex: 'userName', title: '用户姓名', width: 140 },
    {
      dataIndex: 'departmentName',
      title: '所属部门',
      width: 140,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'mobile',
      title: '手机号',
      width: 140,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'roleNames',
      title: '所属角色',
      width: 220,
      render: (names: string[]) =>
        Array.isArray(names) ? names.join('、') : '--',
    },
    {
      dataIndex: 'dataScope',
      title: '数据范围',
      width: 120,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'totpEnabled',
      title: '2FA 状态',
      width: 110,
      align: 'center' as const,
      render: (value: boolean) => (
        <Tag color={getTotpColor(!!value)}>{value ? '已启用' : '未启用'}</Tag>
      ),
    },
    {
      dataIndex: 'status',
      title: '状态',
      width: 100,
      align: 'center' as const,
      render: (value: string) => (
        <Tag color={getStatusColor(value)}>{value}</Tag>
      ),
    },
    {
      dataIndex: 'lastLoginDate',
      title: '最近登录',
      width: 180,
      render: (value: string) => value || '--',
    },
  ]

  return (
    <Card
      title="用户账户管理"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索登录账号 / 用户姓名 / 手机号"
            style={{ width: 320 }}
            allowClear
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onSearch={onSearch}
          />
          <Select
            allowClear
            placeholder="全部状态"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={enabledStatusOptions}
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
              新建
            </Button>
          )}
        </Space>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        size="middle"
        scroll={{ x: 1400 }}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalElements,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
      />
    </Card>
  )
}
