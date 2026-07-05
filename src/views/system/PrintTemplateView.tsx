import { PrintTemplateEditorModal } from '@/views/system/PrintTemplateEditorModal'
import { PrintTemplatePreviewModal } from '@/views/system/PrintTemplatePreviewModal'
import { PrintTemplateTableCard } from '@/views/system/PrintTemplateTableCard'
import { usePrintTemplateView } from '@/views/system/usePrintTemplateView'

export function PrintTemplateView() {
  const view = usePrintTemplateView()

  if (view.editorOpen) {
    return (
      <PrintTemplateEditorModal
        open={view.editorOpen}
        editing={Boolean(view.activeTemplateId)}
        form={view.form}
        templateHtml={view.templateHtml}
        settlementCompanyOptions={view.settlementCompanyOptions}
        saving={view.savePending}
        onTemplateHtmlChange={view.setTemplateHtml}
        onSave={() => {
          void view.handleSave()
        }}
        onClose={() => view.setEditorOpen(false)}
      />
    )
  }

  return (
    <div className="page-stack">
      <PrintTemplateTableCard
        selectedBillType={view.selectedBillType}
        activeTemplateId={view.activeTemplateId}
        templates={view.templates}
        loading={view.isLoading}
        canCreate={view.canCreate}
        canEdit={view.canEdit}
        canDelete={view.canDelete}
        uploadPending={view.uploadPending}
        onBillTypeChange={view.setSelectedBillType}
        onRefresh={view.refresh}
        onCreate={view.openCreate}
        onPreview={view.openPreview}
        onEdit={view.openEdit}
        onCopy={view.handleCopy}
        onUploadJson={view.handleUploadJson}
        onDelete={view.handleDelete}
        onActiveChange={view.setActiveTemplateId}
      />
      {view.previewOpen ? (
        <PrintTemplatePreviewModal
          open={view.previewOpen}
          template={view.previewTemplate}
          onClose={() => view.setPreviewOpen(false)}
        />
      ) : null}
    </div>
  )
}
