import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { ApiKeyCreateModal } from '@/views/system/ApiKeyCreateModal'
import { ApiKeyListCard } from '@/views/system/ApiKeyListCard'
import { ApiKeyUsageAlert } from '@/views/system/ApiKeyUsageAlert'
import { useApiKeyManagementState } from '@/views/system/useApiKeyManagementState'

interface ApiKeyManagementViewProps {
  active?: boolean
  embedded?: boolean
}

export function ApiKeyManagementView({
  active = true,
  embedded = false,
}: ApiKeyManagementViewProps) {
  const { t } = useTranslation()
  const isPageVisible = usePageVisibility()
  const queryEnabled = active && isPageVisible
  const {
    actionOptions,
    canCreate,
    canEdit,
    currentPage,
    filterUserId,
    form,
    generateModalOpen,
    generatedKey,
    handleGenerate,
    handleGenerateWithTotp,
    handleRevoke,
    isCurrentUserTotpDisabled,
    isLoading,
    keys,
    keyword,
    openGenerateModal,
    pageSize,
    refreshApiKeys,
    resourceOptions,
    setCurrentPage,
    setFilterUserId,
    setGenerateModalOpen,
    setGeneratedKey,
    setKeyword,
    setPageSize,
    setStatusFilter,
    setTotpModalOpen,
    setUsageScopeFilter,
    statusFilter,
    totpModalOpen,
    totalElements,
    usageScopeFilter,
    userOptions,
  } = useApiKeyManagementState(queryEnabled)

  const content = (
    <div className="page-stack">
      <ApiKeyUsageAlert />

      {isCurrentUserTotpDisabled && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title={t('system.apiKey.totpRequiredHint')}
        />
      )}

      <ApiKeyListCard
        title={embedded ? t('system.apiKeyList.title') : undefined}
        keyword={keyword}
        filterUserId={filterUserId}
        statusFilter={statusFilter}
        usageScopeFilter={usageScopeFilter}
        currentPage={currentPage}
        pageSize={pageSize}
        totalElements={totalElements}
        keys={keys}
        loading={isLoading}
        canCreate={canCreate}
        canEdit={canEdit}
        totpDisabled={isCurrentUserTotpDisabled}
        userOptions={userOptions}
        resourceOptions={resourceOptions}
        actionOptions={actionOptions}
        onKeywordChange={setKeyword}
        onSearch={() => {
          setCurrentPage(1)
          refreshApiKeys()
        }}
        onFilterUserChange={(value) => {
          setFilterUserId(value)
          setCurrentPage(1)
        }}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        onUsageScopeFilterChange={(value) => {
          setUsageScopeFilter(value)
          setCurrentPage(1)
        }}
        onRefresh={refreshApiKeys}
        onCreate={openGenerateModal}
        onRevoke={handleRevoke}
        onPageChange={(page, size) => {
          setCurrentPage(page)
          setPageSize(size)
        }}
      />

      {generateModalOpen ? (
        <ApiKeyCreateModal
          open={generateModalOpen}
          generatedKey={generatedKey}
          generating={false}
          totpDisabled={isCurrentUserTotpDisabled}
          form={form}
          userOptions={userOptions}
          resourceOptions={resourceOptions}
          actionOptions={actionOptions}
          onGenerate={() => {
            void handleGenerate()
          }}
          onClose={() => {
            setGenerateModalOpen(false)
            setGeneratedKey(null)
          }}
        />
      ) : null}

      {totpModalOpen ? (
        <TwoFactorConfirmModal
          open={totpModalOpen}
          onConfirm={handleGenerateWithTotp}
          onCancel={() => setTotpModalOpen(false)}
          title={t('system.apiKey.verifyTotpTitle')}
        />
      ) : null}
    </div>
  )

  if (embedded) {
    return content
  }

  return <AppProPage title={t('system.apiKey.title')}>{content}</AppProPage>
}
