import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Space, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { ProjectOpeningBalanceEditorOverlay } from './ProjectOpeningBalanceEditorOverlay'
import { ProjectOpeningBalanceTable } from './ProjectOpeningBalanceTable'
import { ProjectOpeningBalanceToolbar } from './ProjectOpeningBalanceToolbar'
import { useProjectOpeningBalancePage } from './use-project-opening-balance-page'

export function ProjectOpeningBalanceView() {
  const { t } = useTranslation()
  const state = useProjectOpeningBalancePage()

  return (
    <AppProPage
      className="finance-overview-pro-page"
      title={t('openingBalance.title')}
      description={t('openingBalance.description')}
      extra={
        <Space size={8}>
          {state.capabilities.canCreate ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => state.openEditor(null)}
            >
              {t('openingBalance.createButton')}
            </Button>
          ) : null}
          <Tooltip title={t('common.refresh')}>
            <Button
              aria-label={t('common.refresh')}
              icon={<ReloadOutlined />}
              loading={
                state.listQuery.isFetching || state.summaryQuery.isFetching
              }
              onClick={() => {
                void state.listQuery.refetch()
                void state.summaryQuery.refetch()
              }}
            />
          </Tooltip>
        </Space>
      }
    >
      <div className="module-page-stack finance-overview-page">
        <div className="module-grid-workspace">
          <ProjectOpeningBalanceToolbar
            projectSelectOptions={state.projectSelectOptions}
            customerSelectOptions={state.customerSelectOptions}
            settlementCompanies={state.settlementCompanies}
            projectsLoading={state.projectQuery.isLoading}
            customersLoading={state.customerQuery.isLoading}
            companiesLoading={state.companiesLoading}
            filterProjectId={state.filterProjectId}
            filterCustomerId={state.filterCustomerId}
            filterCompanyId={state.filterCompanyId}
            filterBalanceType={state.filterBalanceType}
            filterStatus={state.filterStatus}
            cutoffRange={state.cutoffRange}
            keyword={state.keyword}
            summary={state.summary}
            onProjectChange={state.setFilterProjectId}
            onCustomerChange={state.setFilterCustomerId}
            onCompanyChange={state.setFilterCompanyId}
            onBalanceTypeChange={state.setFilterBalanceType}
            onStatusChange={state.setFilterStatus}
            onCutoffRangeChange={state.setCutoffRange}
            onKeywordChange={state.setKeyword}
            onSearch={state.handleSearch}
            onReset={state.handleReset}
          />

          <ProjectOpeningBalanceTable
            records={state.records}
            total={state.total}
            page={state.page}
            pageSize={state.pageSize}
            loading={state.listQuery.isFetching}
            hasError={state.listQuery.isError}
            errorMessage={
              state.listQuery.error instanceof Error
                ? state.listQuery.error.message
                : t('common.loadFailed')
            }
            mutatingId={state.mutatingId}
            capabilities={state.capabilities}
            onPageChange={state.handlePageChange}
            onRetry={() => void state.listQuery.refetch()}
            onEdit={(record) => state.openEditor(record)}
            onConfirm={(record) =>
              void state.handleStatusChange(record, 'CONFIRMED')
            }
            onUnlock={(record) =>
              void state.handleStatusChange(record, 'DRAFT')
            }
            onDelete={(record) => void state.handleDelete(record)}
          />
        </div>

        <ProjectOpeningBalanceEditorOverlay
          open={state.editorOpen}
          editingRecord={state.editingRecord}
          form={state.form}
          projectOptions={state.projectOptions}
          customerNameById={state.customerNameById}
          projectsLoading={state.projectQuery.isLoading}
          canConfirm={state.capabilities.canConfirm}
          onClose={() => state.setEditorOpen(false)}
          onSaved={state.invalidateAll}
        />
      </div>
    </AppProPage>
  )
}
