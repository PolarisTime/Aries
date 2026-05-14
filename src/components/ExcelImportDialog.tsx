import { DownloadOutlined, InboxOutlined } from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Flex from 'antd/es/flex'
import Modal from 'antd/es/modal'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import type { UploadFile } from 'antd/es/upload'
import Upload from 'antd/es/upload'
import { useState } from 'react'
import type { ImportError, ImportResult } from '@/api/common-export'
import { downloadImportTemplate, importModuleData } from '@/api/common-export'
import { message } from '@/utils/antd-app'

interface Props {
  open: boolean
  module: string
  title?: string
  onClose: () => void
  onSuccess: () => void
}

export function ExcelImportDialog({
  open,
  module,
  title,
  onClose,
  onSuccess,
}: Props) {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleImport = async (file: File) => {
    setUploading(true)
    try {
      const res = await importModuleData(module, file)
      setResult(res)
      if (res.failCount === 0) {
        message.success(`导入完成: 成功 ${res.successCount} 行`)
        onSuccess()
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导入失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  const handleDownloadTemplate = () => {
    void downloadImportTemplate(module)
  }

  const errorColumns = [
    { dataIndex: 'row', title: '行号', width: 80 },
    { dataIndex: 'field', title: '字段', width: 120 },
    { dataIndex: 'message', title: '错误信息' },
  ]

  return (
    <Modal
      title={title || '导入数据'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnHidden
    >
      {!result ? (
        <Flex vertical gap={16}>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载导入模板 (XLSX)
          </Button>
          <Upload.Dragger
            beforeUpload={(f) => {
              void handleImport(f)
              return false
            }}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
            accept=".xlsx,.xls,.csv"
            maxCount={1}
          >
            <InboxOutlined className="text-4xl text-primary" />
            <Typography.Paragraph className="mt-12 mb-0">
              点击或拖拽 XLSX / CSV 文件到此处
            </Typography.Paragraph>
          </Upload.Dragger>
          {uploading && <Alert title="导入中..." type="info" />}
        </Flex>
      ) : (
        <Flex vertical gap={12}>
          <Alert
            type={result.failCount > 0 ? 'warning' : 'success'}
            title={
              `导入完成: 总计 ${result.totalRows} 行，成功 ${result.successCount} 行` +
              `（新建 ${result.createdCount}，更新 ${result.updatedCount}），失败 ${result.failCount} 行`
            }
          />
          {result.errors.length > 0 && (
            <Table<ImportError>
              dataSource={result.errors}
              columns={errorColumns}
              rowKey="row"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          )}
          <Button
            onClick={() => {
              setResult(null)
              setFileList([])
            }}
          >
            继续导入
          </Button>
        </Flex>
      )}
    </Modal>
  )
}
