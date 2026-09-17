import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Input, Select, Space, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import type { CustomerOption } from '@/api/master/customer-options'
import type { ProjectOption } from '@/api/master/project-options'
import type {
  SalesContractResponse,
  SalesContractStatus,
} from '@/api/sales/sales-contracts'
import {
  SALES_CONTRACT_STATUS_OPTIONS,
  type SalesContractCapabilities,
} from './sales-contract-model'

interface SalesContractFilterToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  filterCustomerId: string | undefined
  onFilterCustomerIdChange: (value: string | undefined) => void
  customerOptions: CustomerOption[]
  filterProjectId: string | undefined
  onFilterProjectIdChange: (value: string | undefined) => void
  filterProjectOptions: ProjectOption[]
  filterProjectsLoading: boolean
  filterStatus: SalesContractStatus | undefined
  onFilterStatusChange: (value: SalesContractStatus | undefined) => void
  onSearch: () => void
  onResetFilters: () => void
  onCreate: () => void
  selectedRowKeysCount: number
  selectedRows: SalesContractResponse[]
  selectedRecord: SalesContractResponse | undefined
  capabilities: SalesContractCapabilities
  onViewDetailSelected: () => void
  onEditSelected: () => void
  onDeleteSelected: () => void
  onAuditSelected: () => void
  onIssueSelected: () => void
  onArchiveSelected: () => void
  onVoidSelected: () => void
  onClearSelection: () => void
  isFetching: boolean
  onRefresh: () => void
}

export function SalesContractFilterToolbar({
  keyword,
  onKeywordChange,
  filterCustomerId,
  onFilterCustomerIdChange,
  customerOptions,
  filterProjectId,
  onFilterProjectIdChange,
  filterProjectOptions,
  filterProjectsLoading,
  filterStatus,
  onFilterStatusChange,
  onSearch,
  onResetFilters,
  onCreate,
  selectedRowKeysCount,
  selectedRows,
  selectedRecord,
  capabilities,
  onViewDetailSelected,
  onEditSelected,
  onDeleteSelected,
  onAuditSelected,
  onIssueSelected,
  onArchiveSelected,
  onVoidSelected,
  onClearSelection,
  isFetching,
  onRefresh,
}: SalesContractFilterToolbarProps) {
  const { t } = useTranslation()
  const { canEdit, canDelete, canAudit, canIssue, canArchive, canVoid } =
    capabilities

  return (
    <>
      <div className="module-grid-filter-region">
        <Space wrap>
          <Input
            aria-label={t('modules.filter.keyword')}
            allowClear
            placeholder={t('modules.pages.salesContract.placeholderKeyword')}
            style={{ width: 220 }}
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onPressEnter={onSearch}
          />
          <Select
            aria-label={t('modules.salesContract.customer')}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t('modules.salesContract.customer')}
            style={{ width: 200 }}
            value={filterCustomerId}
            onChange={onFilterCustomerIdChange}
            options={customerOptions.map((option) => ({
              label: option.customerName || option.label,
              value: option.id,
            }))}
          />
          <Select
            aria-label={t('modules.salesContract.project')}
            allowClear
            showSearch
            optionFilterProp="label"
            loading={filterProjectsLoading}
            placeholder={t('modules.salesContract.project')}
            style={{ width: 200 }}
            value={filterProjectId}
            onChange={onFilterProjectIdChange}
            options={filterProjectOptions.map((option) => ({
              label: option.projectName || option.label,
              value: option.id,
            }))}
          />
          <Select
            aria-label={t('modules.filter.status')}
            allowClear
            placeholder={t('modules.filter.status')}
            style={{ width: 140 }}
            value={filterStatus}
            onChange={onFilterStatusChange}
            options={[...SALES_CONTRACT_STATUS_OPTIONS]}
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
            {selectedRecord ? (
              <Button icon={<EyeOutlined />} onClick={onViewDetailSelected}>
                {t('hooks.gridColumns.detail')}
              </Button>
            ) : null}
            {selectedRecord && canEdit ? (
              <Button onClick={onEditSelected}>
                {t('hooks.recordActions.edit')}
              </Button>
            ) : null}
            {selectedRecord && canAudit ? (
              <Button onClick={onAuditSelected}>
                {t('modules.statusActions.audit')}
              </Button>
            ) : null}
            {selectedRecord && canIssue ? (
              <Button onClick={onIssueSelected}>
                {t('modules.salesContract.issue')}
              </Button>
            ) : null}
            {selectedRecord && canArchive ? (
              <Button onClick={onArchiveSelected}>
                {t('modules.salesContract.archive')}
              </Button>
            ) : null}
            {selectedRecord && canVoid ? (
              <Button danger onClick={onVoidSelected}>
                {t('modules.salesContract.void')}
              </Button>
            ) : null}
            {selectedRows.length && canDelete ? (
              <Button danger onClick={onDeleteSelected}>
                {t('hooks.toolbarActions.delete')}
              </Button>
            ) : null}
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
