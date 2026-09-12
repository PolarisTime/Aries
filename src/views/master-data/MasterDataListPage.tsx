import { AppProPage } from '@/components/AppProPage'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import { MasterDataEditor } from './MasterDataEditor'
import { MasterDataTable } from './MasterDataTable'
import { MasterDataToolbar } from './MasterDataToolbar'
import type { MasterDataPageSpec } from './master-data-types'
import { useMasterDataPage } from './use-master-data-page'

export function MasterDataListPage({ spec }: { spec: MasterDataPageSpec }) {
  const page = useMasterDataPage(spec)
  return (
    <AppProPage
      className="business-grid-pro-page"
      title={spec.title}
      description={spec.description}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <MasterDataToolbar
            keyword={page.keyword}
            onKeywordChange={page.setKeyword}
            filters={spec.filters}
            filterValues={page.filterValues}
            onFilterChange={page.handleFilterChange}
            onSearch={page.handleSearch}
            onReset={page.handleResetFilters}
            keywordPlaceholder={spec.keywordPlaceholder}
            onCreate={() => page.openEditor(null)}
            selectedCount={page.selectedRows.length}
            onDeleteSelected={page.handleDeleteSelected}
            canEdit={Boolean(page.singleSelected && page.singleCanEdit)}
            onEdit={() => page.openEditor(page.singleSelected ?? null)}
            canAttach={Boolean(page.singleSelected)}
            onAttachment={page.handleAttachment}
            exporting={page.exporting}
            onExport={() => void page.handleExport()}
            columns={spec.columns}
            hiddenColumnKeySet={page.hiddenKeySet}
            onToggleColumn={(key) =>
              page.setHiddenColumnKeys((previous) =>
                previous.includes(key)
                  ? previous.filter((item) => item !== key)
                  : [...previous, key],
              )
            }
            selectedRowKeysCount={page.selectedRowKeys.length}
            onClearSelection={page.clearSelection}
            isFetching={page.listQuery.isFetching}
            onRefresh={page.handleRefresh}
            toolbarExtra={spec.renderToolbarExtra?.({
              refresh: page.handleRefresh,
            })}
          />
          <MasterDataTable
            spec={spec}
            records={page.records}
            selectedRows={page.selectedRows}
            total={page.total}
            page={page.page}
            pageSize={page.effectivePageSize}
            hiddenColumnKeySet={page.hiddenKeySet}
            selectedRowKeys={page.selectedRowKeys}
            expandedRowKeys={page.expandedRowKeys}
            isLoading={page.listQuery.isLoading}
            isFetching={page.listQuery.isFetching}
            hasListError={page.hasListError}
            errorMessage={page.listErrorMessage}
            onSelectionChange={page.setSelectedRowKeys}
            onExpandedRowKeysChange={page.setExpandedRowKeys}
            onToggleRecordSelected={page.handleToggleRecordSelected}
            onRecordDoubleClick={page.handleRecordDoubleClick}
            onPageChange={page.handlePageChange}
            onRetry={() => void page.listQuery.refetch()}
          />
        </section>

        <MasterDataEditor
          open={page.editorOpen}
          title={page.t('modules.editor.title', {
            mode: page.editorBaseRecord
              ? page.t('modules.editor.edit')
              : page.t('modules.editor.create'),
            title: spec.title,
          })}
          form={page.form}
          formFields={spec.formFields}
          formValues={page.formValues}
          saving={page.saving}
          onValuesChange={page.setFormValues}
          onClose={page.closeEditor}
          onSave={() => void page.handleEditorSave()}
        />

        <ModuleAttachmentModal
          open={Boolean(page.attachmentRecordId)}
          moduleKey={page.moduleKey}
          recordId={page.attachmentRecordId}
          onClose={() => page.setAttachmentRecordId('')}
        />
      </div>
    </AppProPage>
  )
}
