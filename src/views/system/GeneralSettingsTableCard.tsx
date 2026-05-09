import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  type TableProps,
  Tag,
  Typography,
} from 'antd'
import type { ModuleRecord } from '@/types/module-page'
import {
  formatSettingValue,
  formatSwitchState,
  GENERAL_SETTING_STATUS_OPTIONS,
} from '@/views/system/general-settings-view-utils'

interface Props {
  keyword: string
  statusFilter?: string
  filteredRows: ModuleRecord[]
  basicSettingRows: ModuleRecord[]
  switchRows: ModuleRecord[]
  loading: boolean
  canEdit: boolean
  onKeywordChange: (value: string) => void
  onStatusFilterChange: (value?: string) => void
  onRefresh: () => void
  onEdit: (record: ModuleRecord) => void
}

export function GeneralSettingsTableCard({
  keyword,
  statusFilter,
  filteredRows,
  basicSettingRows,
  switchRows,
  loading,
  canEdit,
  onKeywordChange,
  onStatusFilterChange,
  onRefresh,
  onEdit,
}: Props) {
  const basicSettingColumns: TableProps<ModuleRecord>['columns'] = [
    {
      title: '操作',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_value, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          disabled={!canEdit}
          onClick={() => onEdit(record)}
        >
          编辑
        </Button>
      ),
    },
    { dataIndex: 'billName', title: '适用范围', width: 160 },
    { dataIndex: 'settingName', title: '参数名称', width: 240 },
    {
      title: '当前值',
      key: 'value',
      width: 140,
      align: 'right',
      render: (_value, record) => formatSettingValue(record),
    },
    { dataIndex: 'remark', title: '说明', width: 420 },
  ]

  const switchColumns: TableProps<ModuleRecord>['columns'] = [
    {
      title: '操作',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_value, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          disabled={!canEdit}
          onClick={() => onEdit(record)}
        >
          编辑
        </Button>
      ),
    },
    { dataIndex: 'billName', title: '适用范围', width: 160 },
    { dataIndex: 'settingName', title: '开关名称', width: 240 },
    {
      title: '当前状态',
      key: 'state',
      width: 120,
      align: 'center',
      render: (_value, record) => (
        <Tag
          color={
            String(record.status || '') === '正常' ? 'processing' : 'default'
          }
        >
          {formatSwitchState(record)}
        </Tag>
      ),
    },
    { dataIndex: 'remark', title: '说明', width: 420 },
  ]

  return (
    <Card
      title="通用设置"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索设置项"
            style={{ width: 280 }}
            allowClear
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
          <Select
            allowClear
            placeholder="全部状态"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={GENERAL_SETTING_STATUS_OPTIONS}
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </Space>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic title="基础参数" value={basicSettingRows.length} />
        </Col>
        <Col span={8}>
          <Statistic title="系统开关" value={switchRows.length} />
        </Col>
        <Col span={8}>
          <Statistic
            title="当前启用"
            value={
              filteredRows.filter((row) => String(row.status || '') === '正常')
                .length
            }
          />
        </Col>
      </Row>

      <Typography.Title level={5}>基础参数</Typography.Title>
      <Table
        rowKey="id"
        columns={basicSettingColumns}
        dataSource={basicSettingRows}
        loading={loading}
        size="small"
        pagination={false}
        style={{ marginBottom: 24 }}
      />

      <Typography.Title level={5}>系统开关</Typography.Title>
      <Table
        rowKey="id"
        columns={switchColumns}
        dataSource={switchRows}
        loading={loading}
        size="small"
        pagination={false}
      />
    </Card>
  )
}
