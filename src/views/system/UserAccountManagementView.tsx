import { ReloadOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { AppResult } from '@/components/AppResult'
import { UserAccountEditorModal } from '@/views/system/UserAccountEditorModal'
import { UserAccountTableCard } from '@/views/system/UserAccountTableCard'
import { UserPasswordResetModal } from '@/views/system/UserPasswordResetModal'
import { UserRoleAssignmentModal } from '@/views/system/UserRoleAssignmentModal'
import { useUserAccountManagement } from '@/views/system/useUserAccountManagement'

export function UserAccountManagementView() {
  const { t } = useTranslation()
  const model = useUserAccountManagement()

  return (
    <AppProPage
      className="user-account-management-page"
      title={t('system.userAccount.title')}
      description={t('system.userAccount.description')}
    >
      <div className="page-stack settings-standard-page">
        {model.isError ? (
          <AppResult
            status="error"
            title={t('system.userAccount.loadFailed')}
            subTitle={t('result.error.subTitle')}
            extra={
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={model.isFetching}
                onClick={model.refresh}
              >
                {t('error.retry')}
              </Button>
            }
          />
        ) : (
          <UserAccountTableCard
            users={model.users}
            loading={model.isLoading}
            refreshing={model.isFetching}
            keywordInput={model.keywordInput}
            status={model.status}
            page={model.page}
            pageSize={model.pageSize}
            total={model.total}
            statusPending={model.statusPending}
            deletePending={model.deletePending}
            onKeywordInputChange={model.setKeywordInput}
            onKeywordSearch={model.applyKeyword}
            onStatusChange={model.setStatus}
            onPageChange={(nextPage, nextPageSize) => {
              if (nextPageSize !== model.pageSize) {
                model.setPageSize(nextPageSize)
              } else {
                model.setPage(nextPage)
              }
            }}
            onRefresh={model.refresh}
            onCreate={model.openCreate}
            onEdit={model.openEdit}
            onReset={model.openReset}
            onRoles={model.openRoles}
            onToggleStatus={model.toggleStatus}
            onDelete={model.handleDelete}
          />
        )}
        <UserAccountEditorModal
          open={model.editorOpen}
          user={model.editingUser}
          saving={model.savePending}
          onSave={model.saveUser}
          onClose={model.closeEditor}
        />
        <UserPasswordResetModal
          user={model.resetUser}
          saving={model.resetPasswordPending}
          onSubmit={model.resetPassword}
          onClose={model.closeReset}
        />
        <UserRoleAssignmentModal
          user={model.rolesUser}
          onSaved={model.refresh}
          onClose={model.closeRoles}
        />
      </div>
    </AppProPage>
  )
}
