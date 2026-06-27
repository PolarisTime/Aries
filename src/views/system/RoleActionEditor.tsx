import { Col, Row } from 'antd'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { usePermissionStore } from '@/stores/permissionStore'
import { RoleActionEditorModal } from '@/views/system/RoleActionEditorModal'
import { RoleActionPermissionCard } from '@/views/system/RoleActionPermissionCard'
import { RoleActionRoleListCard } from '@/views/system/RoleActionRoleListCard'
import { useRoleActionPermissions } from '@/views/system/useRoleActionPermissions'
import { useRoleEditor } from '@/views/system/useRoleEditor'
import { useRoleSettingsList } from '@/views/system/useRoleSettingsList'

interface RoleActionEditorProps {
  active?: boolean
}

export function RoleActionEditor({ active = true }: RoleActionEditorProps) {
  const permissionStore = usePermissionStore()
  const canCreateRole = permissionStore.can('role', 'create')
  const canEditRole = permissionStore.can('role', 'update')
  const canEditPermissions = permissionStore.can('role', 'manage_permissions')
  const isPageVisible = usePageVisibility()
  const queryEnabled = active && isPageVisible

  const { roles } = useRoleSettingsList(queryEnabled)
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
    enabled: queryEnabled,
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
      <Row gutter={[16, 16]} className="min-h-0 flex-1">
        <Col xs={24} lg={6} className="min-h-0">
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

        <Col xs={24} lg={18} className="min-h-0">
          <RoleActionPermissionCard
            selectedRoleInfo={selectedRoleInfo}
            viewMode={viewMode}
            menuTree={menuTree}
            matrixColumns={matrixColumns}
            matrixData={matrixData}
            permissionActions={{
              editable: canEditPermissions,
              saving: savePending,
            }}
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

      {roleModalOpen ? (
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
      ) : null}
    </div>
  )
}
