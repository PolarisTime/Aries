import { AppProPage } from '@/components/AppProPage'
import { SalesContractDetailOverlay } from './SalesContractDetailOverlay'
import { SalesContractEditorOverlay } from './SalesContractEditorOverlay'
import { SalesContractFilterToolbar } from './SalesContractFilterToolbar'
import { SalesContractTable } from './SalesContractTable'
import { useSalesContractPage } from './use-sales-contract-page'

export function SalesContractPage() {
  const {
    t,
    form,
    page,
    pageSize,
    keyword,
    setKeyword,
    filterCustomerId,
    filterProjectId,
    setFilterProjectId,
    filterStatus,
    setFilterStatus,
    customerOptions,
    filterProjectOptions,
    filterProjectsLoading,
    records,
    total,
    listQuery,
    hasListError,
    listErrorMessage,
    selectedRowKeys,
    selectedRows,
    selectedRecord,
    setSelectedRowKeys,
    capabilities,
    editorOpen,
    editorBaseRecord,
    editorProjectOptions,
    editorProjectsLoading,
    detailContractId,
    setDetailContractId,
    setEditorCustomerId,
    handleFilterCustomerChange,
    handleSearch,
    handleResetFilters,
    handlePageChange,
    handleRefresh,
    openEditor,
    closeEditor,
    handleEditorSaved,
    handleToggleRecordSelected,
    handleRecordDoubleClick,
    handleDeleteSelected,
    handleViewDetailSelected,
    performStatusChange,
    clearSelection,
  } = useSalesContractPage()

  return (
    <AppProPage
      className="business-grid-pro-page"
      title={t('modules.pages.salesContract.title')}
      description={t('modules.pages.salesContract.description')}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <SalesContractFilterToolbar
            keyword={keyword}
            onKeywordChange={setKeyword}
            filterCustomerId={filterCustomerId}
            onFilterCustomerIdChange={handleFilterCustomerChange}
            customerOptions={customerOptions}
            filterProjectId={filterProjectId}
            onFilterProjectIdChange={(value) =>
              setFilterProjectId(value || undefined)
            }
            filterProjectOptions={filterProjectOptions}
            filterProjectsLoading={filterProjectsLoading}
            filterStatus={filterStatus}
            onFilterStatusChange={(value) => setFilterStatus(value)}
            onSearch={handleSearch}
            onResetFilters={handleResetFilters}
            onCreate={() => openEditor(null)}
            selectedRowKeysCount={selectedRowKeys.length}
            selectedRows={selectedRows}
            selectedRecord={selectedRecord}
            capabilities={capabilities}
            onViewDetailSelected={handleViewDetailSelected}
            onEditSelected={() => openEditor(selectedRecord ?? null)}
            onDeleteSelected={handleDeleteSelected}
            onAuditSelected={() => performStatusChange('audit')}
            onIssueSelected={() => performStatusChange('issue')}
            onArchiveSelected={() => performStatusChange('archive')}
            onVoidSelected={() => performStatusChange('void')}
            onClearSelection={clearSelection}
            isFetching={listQuery.isFetching}
            onRefresh={handleRefresh}
          />

          <SalesContractTable
            records={records}
            selectedRows={selectedRows}
            total={total}
            page={page}
            pageSize={pageSize}
            selectedRowKeys={selectedRowKeys}
            isLoading={listQuery.isLoading}
            isFetching={listQuery.isFetching}
            hasListError={hasListError}
            errorMessage={listErrorMessage}
            onSelectionChange={(keys) => setSelectedRowKeys(keys.map(String))}
            onToggleRecordSelected={handleToggleRecordSelected}
            onRecordDoubleClick={handleRecordDoubleClick}
            onPageChange={handlePageChange}
            onRetry={() => void listQuery.refetch()}
          />
        </section>

        <SalesContractEditorOverlay
          open={editorOpen}
          editorBaseRecord={editorBaseRecord}
          form={form}
          customerOptions={customerOptions}
          projectOptions={editorProjectOptions}
          projectsLoading={editorProjectsLoading}
          onCustomerChange={setEditorCustomerId}
          onClose={closeEditor}
          onSaved={handleEditorSaved}
        />

        {detailContractId ? (
          <SalesContractDetailOverlay
            contractId={detailContractId}
            onClose={() => setDetailContractId('')}
          />
        ) : null}
      </div>
    </AppProPage>
  )
}
