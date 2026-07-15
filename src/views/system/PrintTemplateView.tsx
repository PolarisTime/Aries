import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { PrintTemplateEditorModal } from '@/views/system/PrintTemplateEditorModal'
import { PrintTemplatePreviewModal } from '@/views/system/PrintTemplatePreviewModal'
import { PrintTemplateTableCard } from '@/views/system/PrintTemplateTableCard'
import { usePrintTemplateView } from '@/views/system/usePrintTemplateView'

export function PrintTemplateView() {
  const { t } = useTranslation()
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
    <AppProPage
      className="print-template-page"
      title={t('system.printTemplate.title')}
      description={t('system.printTemplate.description')}
    >
      <div className="page-stack settings-standard-page">
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
    </AppProPage>
  )
}
