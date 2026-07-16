import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'
import { useActivePageEnabled } from '@/hooks/useActivePageEnabled'
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
  const queryEnabled = useActivePageEnabled(active)
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
    handlePageChange,
    handleRevoke,
    isCurrentUserTotpDisabled,
    isLoading,
    keys,
    keyword,
    openGenerateModal,
    pageSize,
    refreshApiKeys,
    resetPage,
    resourceOptions,
    setFilterUserId,
    setGenerateModalOpen,
    setGeneratedKey,
    setKeyword,
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
          resetPage()
          refreshApiKeys()
        }}
        onFilterUserChange={(value) => {
          setFilterUserId(value)
          resetPage()
        }}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          resetPage()
        }}
        onUsageScopeFilterChange={(value) => {
          setUsageScopeFilter(value)
          resetPage()
        }}
        onRefresh={refreshApiKeys}
        onCreate={openGenerateModal}
        onRevoke={handleRevoke}
        onPageChange={handlePageChange}
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

  return (
    <AppProPage embedded={embedded} title={t('system.apiKey.title')}>
      {content}
    </AppProPage>
  )
}
