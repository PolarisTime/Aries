import { EditOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Select, Switch, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemTableToolbar } from '@/components/SystemTableToolbar'
import { STATUS } from '@/constants/status-constants'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  formatSettingValue,
  GENERAL_SETTING_STATUS_OPTIONS,
} from '@/views/system/general-settings-view-utils'

type BasicGroupKey = 'tax' | 'pagination' | 'session' | 'other'

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

interface BasicSettingGroup {
  key: BasicGroupKey
  title: string
  rows: ModuleRecord[]
}

const BASIC_GROUP_ORDER: BasicGroupKey[] = [
  'tax',
  'pagination',
  'session',
  'other',
]

function resolveBasicGroupKey(record: ModuleRecord): BasicGroupKey {
  const code = asString(record.settingCode).trim()
  const name = asString(record.settingName)
  if (code === 'SYS_DEFAULT_TAX_RATE') return 'tax'
  if (
    code === 'UI_DEFAULT_LIST_PAGE_SIZE' ||
    code === 'SYS_DEFAULT_LIST_PAGE_SIZE' ||
    name.includes('分页')
  ) {
    return 'pagination'
  }
  if (code === 'SYS_MAX_CONCURRENT_SESSIONS') return 'session'
  return 'other'
}

function SettingValue({ value }: { value: ReactNode }) {
  return <span className="general-settings-config-value">{value}</span>
}

export function GeneralSettingsTableCard({
  keyword,
  statusFilter,
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
  const switchEnabledCount = switchRows.filter(
    (row) => asString(row.status) === STATUS.NORMAL,
  ).length
  const groupTitles: Record<BasicGroupKey, string> = {
    tax: t('system.generalSettingsTable.groupTax'),
    pagination: t('system.generalSettingsTable.groupPagination'),
    session: t('system.generalSettingsTable.groupSession'),
    other: t('system.generalSettingsTable.groupOther'),
  }
  const basicGroups = BASIC_GROUP_ORDER.map((key) => ({
    key,
    title: groupTitles[key],
    rows: basicSettingRows.filter(
      (record) => resolveBasicGroupKey(record) === key,
    ),
  })).filter((group): group is BasicSettingGroup => group.rows.length > 0)

  return (
    <div className="general-settings-flow">
      <div className="general-settings-page-toolbar">
        <SystemTableToolbar
          keyword={keyword}
          keywordPlaceholder={t(
            'system.generalSettingsTable.searchPlaceholder',
          )}
          keywordWidth={280}
          searchId="general-settings-search"
          searchName="general-settings-search"
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
      </div>

      <Card
        className="system-list-card general-settings-config-card"
        title={t('system.generalSettingsTable.basicParamsTitle')}
      >
        {loading ? (
          <Typography.Text type="secondary">
            {t('common.loading')}
          </Typography.Text>
        ) : basicGroups.length > 0 ? (
          <div className="general-settings-group-list">
            {basicGroups.map((group) => (
              <section
                className="general-settings-config-group"
                key={group.key}
              >
                <Typography.Text className="general-settings-group-title">
                  {group.title}
                </Typography.Text>
                <div className="general-settings-config-list">
                  {group.rows.map((record) => {
                    const settingName = asString(record.settingName)
                    const remark = asString(record.remark)

                    return (
                      <div
                        className="general-settings-config-row"
                        key={String(record.id)}
                      >
                        <div className="general-settings-config-main">
                          <Typography.Text className="general-settings-config-name">
                            {settingName}
                          </Typography.Text>
                          {remark ? (
                            <Typography.Text className="general-settings-config-remark">
                              {remark}
                            </Typography.Text>
                          ) : null}
                        </div>
                        <div className="general-settings-config-side">
                          <Tooltip
                            title={t('system.generalSettingsTable.edit')}
                          >
                            <Button
                              type="text"
                              className="general-settings-value-button"
                              disabled={!canEdit}
                              aria-label={`${t('system.generalSettingsTable.edit')} ${settingName}`}
                              onClick={() => onEdit(record)}
                            >
                              <SettingValue
                                value={formatSettingValue(record)}
                              />
                              <EditOutlined aria-hidden />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('common.noData')}
          />
        )}
      </Card>

      <Card
        className="system-list-card general-settings-switch-card"
        title={t('system.generalSettingsTable.systemSwitchesTitle')}
        extra={
          <Typography.Text type="secondary">
            {switchEnabledCount}/{switchRows.length}
          </Typography.Text>
        }
      >
        {loading ? (
          <Typography.Text type="secondary">
            {t('common.loading')}
          </Typography.Text>
        ) : switchRows.length > 0 ? (
          <div className="general-settings-switch-list">
            {switchRows.map((record) => {
              const enabled = asString(record.status) === STATUS.NORMAL
              const settingName = asString(record.settingName)
              const remark = asString(record.remark)
              const stateText = enabled
                ? t('system.generalSettingsTable.enabled')
                : t('system.generalSettingsTable.disabled')

              return (
                <div
                  className="general-settings-switch-item"
                  key={String(record.id)}
                >
                  <Switch
                    checked={enabled}
                    loading={toggling}
                    disabled={!canEdit}
                    aria-label={`${settingName} ${stateText}`}
                    onChange={() => onToggle(record)}
                  />
                  <div className="general-settings-switch-main">
                    <Typography.Text className="general-settings-switch-name">
                      {settingName}
                    </Typography.Text>
                    {remark ? (
                      <Typography.Paragraph
                        className="general-settings-switch-remark"
                        ellipsis={{ rows: 2, tooltip: remark }}
                      >
                        {remark}
                      </Typography.Paragraph>
                    ) : null}
                  </div>
                  <Tooltip title={t('system.generalSettingsTable.edit')}>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      disabled={!canEdit}
                      aria-label={`${t('system.generalSettingsTable.edit')} ${settingName}`}
                      onClick={() => onEdit(record)}
                    />
                  </Tooltip>
                </div>
              )
            })}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('common.noData')}
          />
        )}
      </Card>
    </div>
  )
}
