export const loadModuleAttachmentModal = () =>
  import('@/views/modules/components/ModuleAttachmentModal').then((module) => ({
    default: module.ModuleAttachmentModal,
  }))

export const loadModuleEditorWorkspace = () =>
  import('@/views/modules/components/ModuleEditorWorkspace').then((module) => ({
    default: module.ModuleEditorWorkspace,
  }))

export const loadModuleFreightPickupListOverlay = () =>
  import('@/views/modules/components/ModuleFreightPickupListOverlay').then(
    (module) => ({
      default: module.ModuleFreightPickupListOverlay,
    }),
  )

export const loadModuleRecordDetailOverlay = () =>
  import('@/views/modules/components/ModuleRecordDetailOverlay').then(
    (module) => ({
      default: module.ModuleRecordDetailOverlay,
    }),
  )

export const loadModuleStatementGenerator = () =>
  import('@/views/modules/components/ModuleStatementGenerator').then(
    (module) => ({
      default: module.ModuleStatementGenerator,
    }),
  )
