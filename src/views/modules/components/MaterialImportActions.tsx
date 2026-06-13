import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Space from 'antd/es/space'
import Upload from 'antd/es/upload'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  downloadMaterialImportTemplate,
  importMaterialFile,
} from '@/api/materials'
import { QUERY_KEYS } from '@/constants/query-keys'
import { message } from '@/utils/antd-app'

interface Props {
  canDownloadTemplate: boolean
  canImport: boolean
  onImported: () => Promise<void>
}

export function MaterialImportActions({
  canDownloadTemplate,
  canImport,
  onImported,
}: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState(false)
  const [importing, setImporting] = useState(false)

  if (!canDownloadTemplate && !canImport) {
    return null
  }

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      await downloadMaterialImportTemplate()
      setDownloading(false)
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.pages.material.templateDownloadFailed'),
      )
      setDownloading(false)
    }
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    try {
      const result = await importMaterialFile(file)
      await Promise.all([
        onImported(),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.masterOptions.material,
        }),
      ])
      message.success(
        t('modules.pages.material.importSuccessSummary', {
          totalRows: result.totalRows,
          successCount: result.successCount,
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          failedCount: result.failCount,
        }),
      )
      setImporting(false)
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.pages.material.importFailed'),
      )
      setImporting(false)
    }
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
            void handleImport(file)
            return false
          }}
          disabled={importing}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} loading={importing}>
            {t('common.import')}
          </Button>
        </Upload>
      )}
    </Space>
  )
}
