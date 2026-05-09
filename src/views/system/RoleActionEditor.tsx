import { Col, Row } from 'antd'
import { usePermissionStore } from '@/stores/permissionStore'
import { RoleActionEditorModal } from '@/views/system/RoleActionEditorModal'
import { RoleActionPermissionCard } from '@/views/system/RoleActionPermissionCard'
import { RoleActionRoleListCard } from '@/views/system/RoleActionRoleListCard'
import { useRoleActionPermissions } from '@/views/system/useRoleActionPermissions'
import { useRoleEditor } from '@/views/system/useRoleEditor'
import { useRoleSettingsList } from '@/views/system/useRoleSettingsList'

export function RoleActionEditor() {
  const permissionStore = usePermissionStore()
  const canCreateRole = permissionStore.can('role', 'create')
  const canEditRole = permissionStore.can('role', 'update')
  const canEditPermissions = permissionStore.can('role', 'manage_permissions')

  const { roles } = useRoleSettingsList()
  const {
    selectedRoleId,
    selectedRoleInfo,
    viewMode,
    setViewMode,
    menuTree,
    matrixColumns,
    matrixData,
    savePending,
    selectRole,
    selectAll,
    deselectAll,
    saveRoleActions,
    isMenuChecked,
    isMenuPartiallyChecked,
    isActionSelected,
    toggleAllMenuActions,
    toggleAction,
    actionLabels,
  } = useRoleActionPermissions({
    roles,
    canEditPermissions,
  })

  const {
    roleModalOpen,
    editingRole,
    roleForm,
    savePending: roleSavePending,
    openRoleForm,
    handleSaveRole,
    closeRoleModal,
  } = useRoleEditor({
    canCreateRole,
    canEditRole,
    onCreatedRoleSelect: (role) => {
      void selectRole(role)
    },
  })

  return (
    <div className="page-stack">
      <Row gutter={16} style={{ height: 'calc(100vh - 160px)' }}>
        <Col span={6}>
          <RoleActionRoleListCard
            roles={roles}
            selectedRoleId={selectedRoleId}
            canCreateRole={canCreateRole}
            onCreate={() => openRoleForm('create')}
            onSelectRole={(role) => {
              void selectRole(role)
            }}
          />
        </Col>

        <Col span={18}>
          <RoleActionPermissionCard
            selectedRoleInfo={selectedRoleInfo}
            canEditPermissions={canEditPermissions}
            viewMode={viewMode}
            menuTree={menuTree}
            matrixColumns={matrixColumns}
            matrixData={matrixData}
            saveLoading={savePending}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onViewModeChange={setViewMode}
            onSave={saveRoleActions}
            isMenuChecked={isMenuChecked}
            isMenuPartiallyChecked={isMenuPartiallyChecked}
            isActionSelected={isActionSelected}
            onToggleAllMenuActions={toggleAllMenuActions}
            onToggleAction={toggleAction}
            actionLabels={actionLabels}
          />
        </Col>
      </Row>

      <RoleActionEditorModal
        open={roleModalOpen}
        editingRole={editingRole}
        form={roleForm}
        saving={roleSavePending}
        onSave={() => {
          void handleSaveRole()
        }}
        onClose={closeRoleModal}
      />
    </div>
  )
}
