import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Space, Upload } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  downloadMaterialImportTemplate,
  importMaterialFile,
  type MaterialImportPreviewResponse,
  type MaterialImportResponse,
  previewMaterialImportFile,
  rollbackMaterialImportBatch,
} from '@/api/master/materials'
import { QUERY_KEYS } from '@/constants/query-keys'
import { message } from '@/utils/antd-app'
import { MaterialImportPreviewModal } from '@/views/modules/components/MaterialImportPreviewModal'
import { MaterialImportResultModal } from '@/views/modules/components/MaterialImportResultModal'

interface Props {
  canDownloadTemplate?: boolean
  canImport?: boolean
  onImported: () => Promise<void>
}

export function MaterialImportActions({
  canDownloadTemplate = true,
  canImport = true,
  onImported,
}: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<MaterialImportPreviewResponse | null>(
    null,
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [importResult, setImportResult] =
    useState<MaterialImportResponse | null>(null)

  if (!canDownloadTemplate && !canImport) {
    return null
  }

  const refreshAfterImport = async () => {
    await Promise.all([
      onImported(),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.material,
      }),
    ])
  }

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      await downloadMaterialImportTemplate()
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.pages.material.templateDownloadFailed'),
      )
    } finally {
      setDownloading(false)
    }
  }

  /** 导入前先做 dry-run 预览，用户确认差异后再执行正式导入。 */
  const handleSelectFile = async (file: File) => {
    setPendingFile(file)
    setPreviewing(true)
    try {
      const previewResult = await previewMaterialImportFile(file)
      setPreview(previewResult)
      setPreviewOpen(true)
    } catch (error) {
      setPendingFile(null)
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.pages.material.importPreviewFailed'),
      )
    } finally {
      setPreviewing(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingFile) {
      return
    }
    setImporting(true)
    try {
      const result = await importMaterialFile(pendingFile)
      setPreviewOpen(false)
      setPreview(null)
      setPendingFile(null)
      setImportResult(result)
      await refreshAfterImport()
      if (result.failedCount > 0) {
        message.warning(
          t('modules.pages.material.importPartialFailure', {
            failedCount: result.failedCount,
          }),
        )
      } else {
        message.success(
          t('modules.pages.material.importSuccessSummary', {
            totalRows: result.totalRows,
            successCount: result.successCount,
            createdCount: result.createdCount,
            updatedCount: result.updatedCount,
            skippedCount: result.skippedCount,
            failedCount: result.failedCount,
          }),
        )
      }
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.pages.material.importFailed'),
      )
    } finally {
      setImporting(false)
    }
  }

  const handleClosePreview = () => {
    if (importing) {
      return
    }
    setPreviewOpen(false)
    setPreview(null)
    setPendingFile(null)
  }

  const handleRollback = async (importBatchNo: string) => {
    await rollbackMaterialImportBatch(importBatchNo)
    await refreshAfterImport()
  }

  return (
    <Space wrap>
      {canDownloadTemplate && (
        <Button
          icon={<DownloadOutlined />}
          loading={downloading}
          onClick={() => {
            void handleDownloadTemplate()
          }}
        >
          {t('modules.pages.material.downloadTemplate')}
        </Button>
      )}
      {canImport && (
        <Upload
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          beforeUpload={(file) => {
            void handleSelectFile(file)
            return false
          }}
          disabled={previewing || importing}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} loading={previewing}>
            {t('common.import')}
          </Button>
        </Upload>
      )}
      <MaterialImportPreviewModal
        open={previewOpen}
        preview={preview}
        fileName={pendingFile?.name}
        importing={importing}
        onCancel={handleClosePreview}
        onConfirm={() => void handleConfirmImport()}
      />
      <MaterialImportResultModal
        open={importResult !== null}
        result={importResult}
        importBatchNo={importResult?.importBatchNo ?? null}
        onRollback={handleRollback}
        onClose={() => setImportResult(null)}
      />
    </Space>
  )
}
