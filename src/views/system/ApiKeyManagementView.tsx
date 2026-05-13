import Alert from 'antd/es/alert'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { ApiKeyCreateModal } from '@/views/system/ApiKeyCreateModal'
import { ApiKeyListCard } from '@/views/system/ApiKeyListCard'
import { ApiKeyUsageAlert } from '@/views/system/ApiKeyUsageAlert'
import { useApiKeyManagementState } from '@/views/system/useApiKeyManagementState'

interface ApiKeyManagementViewProps {
  active?: boolean
}

export function ApiKeyManagementView({
  active = true,
}: ApiKeyManagementViewProps) {
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

  return (
    <div className="page-stack">
      <ApiKeyUsageAlert />

      {isCurrentUserTotpDisabled && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="当前账号未启用 2FA，禁止生成 API Key。请先在用户管理中完成 2FA 绑定。"
        />
      )}

      <ApiKeyListCard
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
          title="验证 2FA 后生成 API Key"
        />
      ) : null}
    </div>
  )
}
