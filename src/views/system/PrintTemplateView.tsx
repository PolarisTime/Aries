import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
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
    <div className="page-stack settings-standard-page print-template-page">
      <header className="settings-page-header">
        <Typography.Title level={3}>
          {t('system.printTemplate.title')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {t('system.printTemplate.description')}
        </Typography.Paragraph>
      </header>
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
