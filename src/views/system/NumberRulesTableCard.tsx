import { asString } from '@/utils/type-narrowing'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Statistic from 'antd/es/statistic'
import Table from 'antd/es/table'
import type { TableProps } from 'antd/es/table'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import type { ModuleRecord } from '@/types/module-page'
import {
  formatDateRuleLabel,
  formatNumberRuleStatusColor,
  formatNumberRuleStatusText,
  formatResetRuleLabel,
  NUMBER_RULE_STATUS_OPTIONS,
} from '@/views/system/number-rules-view-utils'

interface Props {
  keyword: string
  statusFilter?: string
  rows: ModuleRecord[]
  numberRuleRows: ModuleRecord[]
  uploadRuleRows: ModuleRecord[]
  loading: boolean
  canEdit: boolean
  onKeywordChange: (value: string) => void
  onStatusFilterChange: (value?: string) => void
  onRefresh: () => void
  onEditNumberRule: (record: ModuleRecord) => void
  onEditUploadRule: (record: ModuleRecord) => void
}

export function NumberRulesTableCard({
  keyword,
  statusFilter,
  rows,
  numberRuleRows,
  uploadRuleRows,
  loading,
  canEdit,
  onKeywordChange,
  onStatusFilterChange,
  onRefresh,
  onEditNumberRule,
  onEditUploadRule,
}: Props) {
  const numberRuleColumns: TableProps<ModuleRecord>['columns'] = [
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
          onClick={() => onEditNumberRule(record)}
        >
          编辑
        </Button>
      ),
    },
    { dataIndex: 'billName', title: '单据', width: 140 },
    { dataIndex: 'settingName', title: '规则名称', width: 180 },
    { dataIndex: 'prefix', title: '规则模板', width: 240 },
    {
      title: '日期规则',
      key: 'dateRule',
      width: 150,
      render: (_value, record) => formatDateRuleLabel(String(record.dateRule)),
    },
    {
      dataIndex: 'serialLength',
      title: '流水位数',
      width: 100,
      align: 'right',
    },
    {
      title: '重置规则',
      key: 'resetRule',
      width: 120,
      render: (_value, record) =>
        formatResetRuleLabel(String(record.resetRule)),
    },
    { dataIndex: 'sampleNo', title: '示例单号', width: 180 },
    {
      dataIndex: 'status',
      title: '状态',
      width: 100,
      align: 'center',
      render: (value: string) => (
        <Tag color={formatNumberRuleStatusColor(value)}>
          {formatNumberRuleStatusText(value)}
        </Tag>
      ),
    },
  ]

  const uploadRuleColumns: TableProps<ModuleRecord>['columns'] = [
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
          onClick={() => onEditUploadRule(record)}
        >
          编辑
        </Button>
      ),
    },
    { dataIndex: 'billName', title: '模块', width: 140 },
    { dataIndex: 'settingName', title: '规则名称', width: 180 },
    { dataIndex: 'prefix', title: '重命名模板', width: 240 },
    { dataIndex: 'sampleNo', title: '示例文件名', width: 200 },
    {
      dataIndex: 'status',
      title: '状态',
      width: 100,
      align: 'center',
      render: (value: string) => (
        <Tag color={formatNumberRuleStatusColor(value)}>
          {formatNumberRuleStatusText(value)}
        </Tag>
      ),
    },
  ]

  return (
    <Card
      title="编号规则"
      extra={
        <SystemTableToolbar
          keyword={keyword}
          keywordPlaceholder="搜索规则项"
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
            options={NUMBER_RULE_STATUS_OPTIONS}
          />
        </SystemTableToolbar>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic title="单号规则" value={numberRuleRows.length} />
        </Col>
        <Col span={8}>
          <Statistic title="上传规则" value={uploadRuleRows.length} />
        </Col>
        <Col span={8}>
          <Statistic
            title="禁用上传规则"
            value={
              rows.filter(
                (row) =>
                  asString(row.ruleType) === 'UPLOAD_RULE' &&
                  asString(row.status) === '禁用',
              ).length
            }
          />
        </Col>
      </Row>

      <Typography.Title level={5}>单号规则</Typography.Title>
      <Table
        rowKey="id"
        columns={numberRuleColumns}
        dataSource={numberRuleRows}
        loading={loading}
        size="small"
        pagination={false}
        style={{ marginBottom: 24 }}
      />

      <Typography.Title level={5}>上传规则</Typography.Title>
      <Table
        rowKey="id"
        columns={uploadRuleColumns}
        dataSource={uploadRuleRows}
        loading={loading}
        size="small"
        pagination={false}
      />
    </Card>
  )
}
