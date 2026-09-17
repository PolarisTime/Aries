import { ReloadOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { AppResult } from '@/components/AppResult'
import { RolePermissionMatrixModal } from '@/views/system/RolePermissionMatrixModal'
import { RoleTableCard } from '@/views/system/RoleTableCard'
import { RoleWizardModal } from '@/views/system/RoleWizardModal'
import { useRoleManagement } from '@/views/system/useRoleManagement'

export function RoleManagementView() {
  const { t } = useTranslation()
  const model = useRoleManagement()

  return (
    <AppProPage
      className="role-management-page"
      title={t('system.role.title')}
      description={t('system.role.description')}
    >
      <div className="page-stack settings-standard-page">
        {model.isError ? (
          <AppResult
            status="error"
            title={t('system.role.loadFailed')}
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
          <RoleTableCard
            roles={model.roles}
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
            onClone={model.openClone}
            onPermissions={model.openPermissions}
            onToggleStatus={model.toggleStatus}
            onDelete={model.handleDelete}
          />
        )}
        <RoleWizardModal
          key={`${model.editorOpen}-${model.editingRole?.id ?? 'new'}-${model.cloneSource?.id ?? 'none'}`}
          open={model.editorOpen}
          role={model.editingRole}
          cloneFrom={model.cloneSource}
          saving={model.savePending}
          onSave={model.saveRole}
          onClose={model.closeEditor}
        />
        <RolePermissionMatrixModal
          role={model.permissionRole}
          saving={model.permissionPending}
          onSave={({ id, permissions }) => {
            model.savePermissions(id, permissions)
          }}
          onClose={model.closePermissions}
        />
      </div>
    </AppProPage>
  )
}
