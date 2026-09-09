import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Input, Select, Space, Tooltip } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deleteBusinessModule } from '@/api/business/business-crud'
import { exportModuleData } from '@/api/business/common-export'
import { enabledStatusOptions } from '@/constants/module-options'
import type { ModuleKey } from '@/module-system/core/module-key'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import type { SearchParams } from '@/types/api-raw'
import type { LegacyModuleRecord } from '@/types/module-record'
import { message, modal } from '@/utils/antd-app'
import type { CarrierColumnKey } from './carrier-page-columns'
import {
  buildCarrierColumnLabels,
  CARRIER_COLUMN_KEYS as COLUMN_KEYS,
} from './carrier-page-columns'

const MODULE_KEY: ModuleKey = 'carrier'

type CarrierListRow = LegacyModuleRecord

interface CarrierFilterToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  filterStatus: string | undefined
  onFilterStatusChange: (value: string | undefined) => void
  onSearch: () => void
  onResetFilters: () => void
  onCreate: () => void
  submittedFilters: SearchParams
  selectedRows: CarrierListRow[]
  onDeleteCompleted: () => Promise<void>
  selectedRecord: CarrierListRow | undefined
  selectedRecordCanEdit: boolean
  onEditSelected: () => void
  onAttachmentSelected: () => void
  hiddenColumnKeys: string[]
  onToggleColumn: (key: string) => void
  selectedRowKeysCount: number
  onClearSelection: () => void
  isFetching: boolean
  onRefresh: () => void
}

export function CarrierFilterToolbar({
  keyword,
  onKeywordChange,
  filterStatus,
  onFilterStatusChange,
  onSearch,
  onResetFilters,
  onCreate,
  submittedFilters,
  selectedRows,
  onDeleteCompleted,
  selectedRecord,
  selectedRecordCanEdit,
  onEditSelected,
  onAttachmentSelected,
  hiddenColumnKeys,
  onToggleColumn,
  selectedRowKeysCount,
  onClearSelection,
  isFetching,
  onRefresh,
}: CarrierFilterToolbarProps) {
  const { t } = useTranslation()
  const [exporting, setExporting] = useState(false)

  const columnLabels = useMemo<Record<CarrierColumnKey, string>>(
    () => buildCarrierColumnLabels(t),
    [t],
  )

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportModuleData(MODULE_KEY, submittedFilters)
      message.success(t('hooks.excelExport.exportSuccess'))
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('hooks.excelExport.exportFailed'),
      )
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteSelected = () => {
    if (!selectedRows.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    const eligible = selectedRows.filter(
      (record) => resolveModuleRecordCapabilities(record, MODULE_KEY).canDelete,
    )
    if (!eligible.length) {
      message.warning(t('hooks.batchActions.deleteNotSupported'))
      return
    }
    modal.confirm({
      title: t('hooks.batchActions.batchDelete'),
      content: t('hooks.batchActions.batchDeleteConfirm', {
        count: eligible.length,
        skippedPart: '',
      }),
      okButtonProps: { danger: true },
      onOk: async () => {
        const results = await Promise.allSettled(
          eligible.map((record) =>
            deleteBusinessModule(MODULE_KEY, String(record.id)),
          ),
        )
        const successCount = results.filter(
          (result) => result.status === 'fulfilled',
        ).length
        const failedCount = results.length - successCount
        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.actionCompletedWithFailures', {
              action: t('hooks.toolbarActions.delete'),
              successCount,
              failedCount,
              skippedPart: '',
              errorPart: '',
            }),
          )
        } else {
          message.success(
            t('hooks.batchActions.actionSuccess', {
              action: t('hooks.toolbarActions.delete'),
              successCount,
              skippedPart: '',
            }),
          )
        }
        await onDeleteCompleted()
      },
    })
  }

  return (
    <>
      <div className="module-grid-filter-region">
        <Space wrap>
          <Input
            aria-label={t('modules.filter.keyword')}
            allowClear
            placeholder={t('modules.pages.carrier.placeholderKeyword')}
            style={{ width: 240 }}
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onPressEnter={onSearch}
          />
          <Select
            aria-label={t('modules.filter.status')}
            allowClear
            placeholder={t('modules.filter.status')}
            style={{ width: 140 }}
            value={filterStatus}
            onChange={onFilterStatusChange}
            options={enabledStatusOptions}
          />
          <Button type="primary" onClick={onSearch}>
            {t('common.search')}
          </Button>
          <Button onClick={onResetFilters}>{t('common.reset')}</Button>
        </Space>
      </div>

      <div className="module-grid-command-region">
        <div className="module-table-toolbar">
          <Space wrap className="module-table-actions">
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
              {t('common.create')}
            </Button>
            {selectedRows.length ? (
              <Button danger onClick={handleDeleteSelected}>
                {t('hooks.toolbarActions.delete')}
              </Button>
            ) : null}
            {selectedRecord && selectedRecordCanEdit ? (
              <Button onClick={onEditSelected}>
                {t('hooks.recordActions.edit')}
              </Button>
            ) : null}
            {selectedRecord ? (
              <Button onClick={onAttachmentSelected}>
                {t('hooks.recordActions.attachment')}
              </Button>
            ) : null}
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={() => void handleExport()}
            >
              {t('common.export')}
            </Button>
            <Dropdown
              menu={{
                multiple: true,
                selectedKeys: COLUMN_KEYS.filter(
                  (key) => !hiddenColumnKeys.includes(key),
                ),
                onClick: ({ key }) => {
                  onToggleColumn(key)
                },
                items: COLUMN_KEYS.map((key) => ({
                  key,
                  label: columnLabels[key],
                })),
              }}
            >
              <Button>{t('common.columnSettings')}</Button>
            </Dropdown>
          </Space>
          <div className="module-table-utilities">
            {selectedRowKeysCount ? (
              <>
                <span
                  className="module-table-selected-count"
                  aria-live="polite"
                >
                  {t('common.selected', { count: selectedRowKeysCount })}
                </span>
                <Tooltip title={t('common.clearSelection')}>
                  <Button
                    size="small"
                    type="text"
                    className="module-table-clear-selection-button"
                    aria-label={t('common.clearSelection')}
                    onClick={onClearSelection}
                  >
                    ✕
                  </Button>
                </Tooltip>
              </>
            ) : null}
            <Tooltip title={t('common.refresh')}>
              <Button
                type="text"
                className="module-table-refresh-button"
                aria-label={t('common.refresh')}
                icon={<ReloadOutlined />}
                loading={isFetching}
                onClick={onRefresh}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  )
}
