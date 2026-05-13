import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Statistic from 'antd/es/statistic'
import Switch from 'antd/es/switch'
import Table from 'antd/es/table'
import type { TableProps } from 'antd/es/table'
import Typography from 'antd/es/typography'
import type { ModuleRecord } from '@/types/module-page'
import {
  formatSettingValue,
  GENERAL_SETTING_STATUS_OPTIONS,
} from '@/views/system/general-settings-view-utils'

interface Props {
  keyword: string
  statusFilter?: string
  filteredRows: ModuleRecord[]
  basicSettingRows: ModuleRecord[]
  switchRows: ModuleRecord[]
  loading: boolean
  toggling: boolean
  canEdit: boolean
  onKeywordChange: (value: string) => void
  onStatusFilterChange: (value?: string) => void
  onRefresh: () => void
  onEdit: (record: ModuleRecord) => void
  onToggle: (record: ModuleRecord) => void
}

export function GeneralSettingsTableCard({
  keyword,
  statusFilter,
  filteredRows,
  basicSettingRows,
  switchRows,
  loading,
  toggling,
  canEdit,
  onKeywordChange,
  onStatusFilterChange,
  onRefresh,
  onEdit,
  onToggle,
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
    { dataIndex: 'settingName', title: '开关名称', width: 240 },
    {
      title: '当前状态 / 操作',
      key: 'state',
      width: 160,
      align: 'center',
      render: (_value, record) => {
        const enabled = String(record.status || '') === '正常'
        return (
          <Space>
            <Switch
              checked={enabled}
              loading={toggling}
              disabled={!canEdit}
              checkedChildren="启用"
              unCheckedChildren="关闭"
              onChange={() => onToggle(record)}
            />
            <span style={{ fontSize: 12, color: enabled ? '#22c55e' : '#94a3b8' }}>
              {enabled ? '已启用' : '已关闭'}
            </span>
          </Space>
        )
      },
    },
    { dataIndex: 'remark', title: '说明', width: 420 },
  ]

  return (
    <Card
      title="通用设置"
      extra={
        <SystemTableToolbar
          keyword={keyword}
          keywordPlaceholder="搜索设置项"
          keywordWidth={280}
          onKeywordChange={onKeywordChange}
          onRefresh={onRefresh}
        >
          <Select
            allowClear
            placeholder="全部状态"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={GENERAL_SETTING_STATUS_OPTIONS}
          />
        </SystemTableToolbar>
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
