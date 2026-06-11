import { EditOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Statistic from 'antd/es/statistic'
import Switch from 'antd/es/switch'
import type { TableProps } from 'antd/es/table'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { STATUS } from '@/constants/status-constants'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
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
  const { t } = useTranslation()
  const basicSettingColumns: TableProps<ModuleRecord>['columns'] = [
    {
      title: t('system.generalSettingsTable.colOperation'),
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
          {t('system.generalSettingsTable.edit')}
        </Button>
      ),
    },
    {
      dataIndex: 'settingName',
      title: t('system.generalSettingsTable.colParamName'),
      width: 240,
    },
    {
      title: t('system.generalSettingsTable.colCurrentValue'),
      key: 'value',
      width: 140,
      align: 'right',
      render: (_value, record) => formatSettingValue(record),
    },
    {
      dataIndex: 'remark',
      title: t('system.generalSettingsTable.colRemark'),
      width: 420,
    },
  ]
  const switchColumns: TableProps<ModuleRecord>['columns'] = [
    {
      dataIndex: 'settingName',
      title: t('system.generalSettingsTable.colSwitchName'),
      width: 240,
    },
    {
      title: t('system.generalSettingsTable.colStatusAction'),
      key: 'state',
      width: 160,
      align: 'center',
      render: (_value, record) => {
        const enabled = asString(record.status) === STATUS.NORMAL
        return (
          <Space>
            <Switch
              checked={enabled}
              loading={toggling}
              disabled={!canEdit}
              checkedChildren={t('system.generalSettingsTable.switchEnabled')}
              unCheckedChildren={t(
                'system.generalSettingsTable.switchDisabled',
              )}
              onChange={() => onToggle(record)}
            />
            <span
              className={`text-xs ${enabled ? 'text-[var(--theme-success)]' : 'text-[var(--theme-disabled)]'}`}
            >
              {enabled
                ? t('system.generalSettingsTable.enabled')
                : t('system.generalSettingsTable.disabled')}
            </span>
          </Space>
        )
      },
    },
    {
      dataIndex: 'remark',
      title: t('system.generalSettingsTable.colRemark'),
      width: 420,
    },
  ]
  return (
    <Card
      title={t('system.generalSettingsTable.title')}
      extra={
        <SystemTableToolbar
          keyword={keyword}
          keywordPlaceholder={t(
            'system.generalSettingsTable.searchPlaceholder',
          )}
          keywordWidth={280}
          onKeywordChange={onKeywordChange}
          onRefresh={onRefresh}
        >
          <Select
            allowClear
            placeholder={t('system.generalSettingsTable.allStatus')}
            className="w-140"
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={GENERAL_SETTING_STATUS_OPTIONS}
          />
        </SystemTableToolbar>
      }
    >
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.generalSettingsTable.basicParams')}
            value={basicSettingRows.length}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.generalSettingsTable.systemSwitches')}
            value={switchRows.length}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title={t('system.generalSettingsTable.currentEnabled')}
            value={
              filteredRows.filter(
                (row) => asString(row.status) === STATUS.NORMAL,
              ).length
            }
          />
        </Col>
      </Row>
      <Typography.Title level={5}>
        {t('system.generalSettingsTable.basicParamsTitle')}
      </Typography.Title>
      <Table
        rowKey="id"
        columns={basicSettingColumns}
        dataSource={basicSettingRows}
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ x: 890 }}
        className="mb-6"
      />
      <Typography.Title level={5}>
        {t('system.generalSettingsTable.systemSwitchesTitle')}
      </Typography.Title>
      <Table
        rowKey="id"
        columns={switchColumns}
        dataSource={switchRows}
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ x: 820 }}
      />
    </Card>
  )
}
