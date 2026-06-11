import { EditOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Statistic from 'antd/es/statistic'
import type { TableProps } from 'antd/es/table'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { STATUS } from '@/constants/status-constants'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
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
  const { t } = useTranslation()
  const numberRuleColumns: TableProps<ModuleRecord>['columns'] = [
    {
      title: t('common.operation'),
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
          {t('common.edit')}
        </Button>
      ),
    },
    {
      dataIndex: 'billName',
      title: t('system.numberRules.billName'),
      width: 140,
    },
    {
      dataIndex: 'settingName',
      title: t('system.numberRules.settingName'),
      width: 180,
    },
    {
      dataIndex: 'prefix',
      title: t('system.numberRules.prefix'),
      width: 240,
    },
    {
      title: t('system.numberRules.dateRule'),
      key: 'dateRule',
      width: 150,
      render: (_value, record) => formatDateRuleLabel(String(record.dateRule)),
    },
    {
      dataIndex: 'serialLength',
      title: t('system.numberRules.serialLength'),
      width: 100,
      align: 'right',
    },
    {
      title: t('system.numberRules.resetRule'),
      key: 'resetRule',
      width: 120,
      render: (_value, record) =>
        formatResetRuleLabel(String(record.resetRule)),
    },
    {
      dataIndex: 'sampleNo',
      title: t('system.numberRules.sampleNo'),
      width: 180,
    },
    {
      dataIndex: 'status',
      title: t('common.status'),
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
      title: t('common.operation'),
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
          {t('common.edit')}
        </Button>
      ),
    },
    {
      dataIndex: 'billName',
      title: t('system.numberRules.moduleName'),
      width: 140,
    },
    {
      dataIndex: 'settingName',
      title: t('system.numberRules.settingName'),
      width: 180,
    },
    {
      dataIndex: 'prefix',
      title: t('system.numberRules.renamePattern'),
      width: 240,
    },
    {
      dataIndex: 'sampleNo',
      title: t('system.numberRules.sampleFileName'),
      width: 200,
    },
    {
      dataIndex: 'status',
      title: t('common.status'),
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
      title={t('system.numberRules.title')}
      extra={
        <SystemTableToolbar
          keyword={keyword}
          keywordPlaceholder={t('system.numberRules.searchPlaceholder')}
          keywordWidth={280}
          onKeywordChange={onKeywordChange}
          onRefresh={onRefresh}
        >
          <Select
            allowClear
            placeholder={t('system.numberRules.allStatus')}
            className="w-140"
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={NUMBER_RULE_STATUS_OPTIONS}
          />
        </SystemTableToolbar>
      }
    >
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.numberRules.documentRules')}
            value={numberRuleRows.length}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.numberRules.uploadRules')}
            value={uploadRuleRows.length}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.numberRules.disabledUploadRules')}
            value={
              rows.filter(
                (row) =>
                  asString(row.ruleType) === 'UPLOAD_RULE' &&
                  asString(row.status) === STATUS.DISABLED,
              ).length
            }
          />
        </Col>
      </Row>
      <Typography.Title level={5}>
        {t('system.numberRules.documentRules')}
      </Typography.Title>
      <Table
        rowKey="id"
        columns={numberRuleColumns}
        dataSource={numberRuleRows}
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ x: 1300 }}
        className="mb-6"
      />
      <Typography.Title level={5}>
        {t('system.numberRules.uploadRules')}
      </Typography.Title>
      <Table
        rowKey="id"
        columns={uploadRuleColumns}
        dataSource={uploadRuleRows}
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ x: 970 }}
      />
    </Card>
  )
}
