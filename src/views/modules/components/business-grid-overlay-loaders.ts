export const loadModuleAttachmentModal = () =>
  import('@/views/modules/components/ModuleAttachmentModal').then((module) => ({
    default: module.ModuleAttachmentModal,
  }))

export const loadModuleEditorWorkspace = () =>
  import('@/views/modules/components/ModuleEditorWorkspace').then((module) => ({
    default: module.ModuleEditorWorkspace,
  }))

export const loadModuleRecordDetailOverlay = () =>
  import('@/views/modules/components/ModuleRecordDetailOverlay').then(
    (module) => ({
      default: module.ModuleRecordDetailOverlay,
    }),
  )

export const loadPurchaseOrderPickupListOverlay = () =>
  import('@/views/modules/components/PurchaseOrderPickupListOverlay').then(
    (module) => ({
      default: module.PurchaseOrderPickupListOverlay,
    }),
  )
