import { Col, Row } from 'antd'
import { useActivePageEnabled } from '@/hooks/useActivePageEnabled'
import { useResourcePermissions } from '@/hooks/useResourcePermissions'
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
  const {
    canCreate: canCreateRole,
    canUpdate: canEditRole,
    canDelete: canDeleteRole,
    can,
  } = useResourcePermissions('role')
  const canEditPermissions = can('manage_permissions')
  const queryEnabled = useActivePageEnabled(active)

  const { roles } = useRoleSettingsList(queryEnabled)
  const {
    selectedRoleId,
    selectedRoleInfo,
    canEditSelectedRolePermissions,
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
    isActionEditable,
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
    deletingRoleId,
    openRoleForm,
    requestDeleteRole,
    handleSaveRole,
    closeRoleModal,
  } = useRoleEditor({
    canCreateRole,
    canEditRole,
    canDeleteRole,
    canManagePermissions: canEditPermissions,
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
            canEditRole={canEditRole}
            canDeleteRole={canDeleteRole}
            deletingRoleId={deletingRoleId}
            onCreate={() => openRoleForm('create')}
            onEdit={(role) => openRoleForm('edit', role)}
            onDelete={requestDeleteRole}
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
              editable: canEditSelectedRolePermissions,
              saving: savePending,
              blocked: canEditPermissions && !canEditSelectedRolePermissions,
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
            isActionEditable={isActionEditable}
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
