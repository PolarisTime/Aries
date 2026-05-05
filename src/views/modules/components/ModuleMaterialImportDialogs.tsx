import { useState } from 'react'
import { Modal, Upload, Button, Table, message, Alert } from 'antd'
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload'
import { http } from '@/api/client'
import type { ApiResponse } from '@/types/api'

interface ImportResult {
  totalRows: number
  successCount: number
  failCount: number
  errors: { row: number; message: string }[]
}

export function ModuleMaterialImportDialogs({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleImport = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await http.post<ApiResponse<ImportResult>>('/materials/import', formData)
      setResult(res.data || { totalRows: 0, successCount: 0, failCount: 0, errors: [] })
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导入失败')
    } finally { setUploading(false) }
    return false
  }

  const handleDownloadTemplate = () => {
    window.open('/materials/template', '_blank')
  }

  return (
    <Modal title="导入物料" open={open} onCancel={onClose} footer={null} width={640} destroyOnClose>
      {!result ? (
        <div className="flex flex-col gap-4">
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载导入模板 (XLSX)</Button>
          <Upload.Dragger
            beforeUpload={(f) => { handleImport(f); return false }}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
            accept=".xlsx,.xls,.csv"
            maxCount={1}
          >
            <p className="text-3xl text-[var(--theme-primary)]"><InboxOutlined /></p>
            <p>点击或拖拽 XLSX/CSV 文件到此处</p>
          </Upload.Dragger>
          {uploading && <Alert message="导入中..." type="info" />}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Alert
            type={result.failCount > 0 ? 'warning' : 'success'}
            message={`导入完成: 总计 ${result.totalRows} 行，成功 ${result.successCount} 行，失败 ${result.failCount} 行`}
          />
          {result.errors.length > 0 && (
            <Table
              dataSource={result.errors}
              columns={[
                { dataIndex: 'row', title: '行号', width: 80 },
                { dataIndex: 'message', title: '错误信息' },
              ]}
              rowKey="row"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          )}
          <Button onClick={() => { setResult(null); setFileList([]) }}>继续导入</Button>
        </div>
      )}
    </Modal>
  )
}
