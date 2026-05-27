import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { deleteUserAccount } from '@/api/user-accounts'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { useRequestError } from '@/hooks/useRequestError'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePermissionStore } from '@/stores/permissionStore'
import type { UserAccountRecord } from '@/types/user-account'
import { message, modal } from '@/utils/antd-app'
import { UserAccountCreateResultModal } from '@/views/system/UserAccountCreateResultModal'
import { UserAccountDetailModal } from '@/views/system/UserAccountDetailModal'
import { UserAccountEditorModal } from '@/views/system/UserAccountEditorModal'
import { UserAccountTableCard } from '@/views/system/UserAccountTableCard'
import { UserAccountTwoFactorModal } from '@/views/system/UserAccountTwoFactorModal'
import {
  getUserAccountStatusColor,
  getUserAccountTotpColor,
} from '@/views/system/user-account-view-utils'
import { useUserAccountDetail } from '@/views/system/useUserAccountDetail'
import { useUserAccountEditor } from '@/views/system/useUserAccountEditor'
import { useUserAccountListState } from '@/views/system/useUserAccountListState'
import { useUserAccountTwoFactor } from '@/views/system/useUserAccountTwoFactor'

interface UserAccountManagementViewProps {
  active?: boolean
}

export function UserAccountManagementView({
  active = true,
}: UserAccountManagementViewProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canCreate = permissionStore.can('user-account', 'create')
  const canEdit = permissionStore.can('user-account', 'update')
  const canDelete = permissionStore.can('user-account', 'delete')
  const canViewRoleCatalog = permissionStore.can('role', 'read')
  const canViewDepartmentCatalog = permissionStore.can('department', 'read')
  const isPageVisible = usePageVisibility()
  const queryEnabled = active && isPageVisible

  const {
    keyword,
    statusFilter,
    currentPage,
    pageSize,
    users,
    totalElements,
    isLoading,
    setKeyword,
    handleSearch,
    handleStatusFilterChange,
    handlePageChange,
    refresh,
  } = useUserAccountListState(queryEnabled)

  const {
    form,
    editorOpen,
    editorMode,
    editorLoading,
    editingId,
    loginNameValidationMessage,
    loginNameChecking,
    departmentOptions,
    roleOptions,
    selectedRoleIds,
    selectedRoleDataScope,
    selectedRoleSummaries,
    createResultOpen,
    createResult,
    savePending,
    openCreateModal,
    openEditModal,
    runLoginNameCheck,
    handleSave,
    closeEditor,
    closeCreateResult,
  } = useUserAccountEditor({
    canViewRoleCatalog,
    canViewDepartmentCatalog,
    enabled: queryEnabled,
  })

  const {
    detailOpen,
    detailLoading,
    detailRecord,
    openDetailModal,
    closeDetailModal,
  } = useUserAccountDetail()

  const {
    twoFaOpen,
    twoFaLoading,
    twoFaRecord,
    twoFaSetup,
    twoFaCode,
    twoFaSetupLoading,
    twoFaEnableLoading,
    twoFaDisableLoading,
    setTwoFaCode,
    open2faModal,
    handleGenerate2fa,
    handleEnable2fa,
    handleDisable2fa,
    close2faModal,
  } = useUserAccountTwoFactor()

  const deleteMutation = useMutation({
    mutationFn: deleteUserAccount,
    onSuccess: () => {
      message.success(t('common.deleteSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userAccountBase })
    },
    onError: (error: Error) => showError(error, t('api.deleteFailed')),
  })

  const handleDelete = useCallback(
    (record: UserAccountRecord) => {
      modal.confirm({
        title: t('system.userAccount.deleteTitle'),
        content: t('system.userAccount.deleteContent', {
          loginName: record.loginName,
        }),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: () => deleteMutation.mutateAsync(record.id),
      })
    },
    [deleteMutation, t],
  )

  const copyText = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value)
        message.success(t('system.userAccount.copied', { label }))
      } catch {
        message.error(t('system.userAccount.copyFailed', { label }))
      }
    },
    [t],
  )

  return (
    <div className="page-stack">
      <UserAccountTableCard
        keyword={keyword}
        statusFilter={statusFilter}
        currentPage={currentPage}
        pageSize={pageSize}
        totalElements={totalElements}
        users={users}
        loading={isLoading}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        getStatusColor={getUserAccountStatusColor}
        getTotpColor={getUserAccountTotpColor}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        onStatusFilterChange={handleStatusFilterChange}
        onRefresh={refresh}
        onCreate={openCreateModal}
        onView={(record) => {
          void openDetailModal(record)
        }}
        onEdit={(record) => {
          void openEditModal(record)
        }}
        onManage2fa={(record) => {
          void open2faModal(record)
        }}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
      />

      {editorOpen ? (
        <UserAccountEditorModal
          open={editorOpen}
          mode={editorMode}
          loading={editorLoading}
          saving={savePending}
          form={form}
          editingId={editingId}
          loginNameValidationMessage={loginNameValidationMessage}
          loginNameChecking={loginNameChecking}
          departmentOptions={departmentOptions}
          roleOptions={roleOptions}
          selectedRoleIds={selectedRoleIds}
          selectedRoleDataScope={selectedRoleDataScope}
          selectedRoleSummaries={selectedRoleSummaries}
          onCheckLoginName={(loginName, excludeUserId) => {
            void runLoginNameCheck(loginName, excludeUserId)
          }}
          onSave={() => {
            void handleSave()
          }}
          onClose={closeEditor}
        />
      ) : null}

      {detailOpen ? (
        <UserAccountDetailModal
          open={detailOpen}
          loading={detailLoading}
          record={detailRecord}
          getStatusColor={getUserAccountStatusColor}
          getTotpColor={getUserAccountTotpColor}
          onClose={closeDetailModal}
        />
      ) : null}

      {createResultOpen ? (
        <UserAccountCreateResultModal
          open={createResultOpen}
          result={createResult}
          onCopy={(value, label) => {
            void copyText(value, label)
          }}
          onClose={closeCreateResult}
        />
      ) : null}

      {twoFaOpen ? (
        <UserAccountTwoFactorModal
          open={twoFaOpen}
          loading={twoFaLoading}
          record={twoFaRecord}
          setup={twoFaSetup}
          code={twoFaCode}
          setupLoading={twoFaSetupLoading}
          enableLoading={twoFaEnableLoading}
          disableLoading={twoFaDisableLoading}
          onCodeChange={setTwoFaCode}
          onGenerate={() => {
            void handleGenerate2fa()
          }}
          onEnable={() => {
            void handleEnable2fa()
          }}
          onDisable={handleDisable2fa}
          onClose={close2faModal}
        />
      ) : null}
    </div>
  )
}
