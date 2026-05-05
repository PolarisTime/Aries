import { useState } from 'react'
import { Card, Button, Table, Tag, message, Space } from 'antd'
import { CloudUploadOutlined, CloudDownloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/api/client'
import { PermButton } from '@/components/PermButton'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

interface ExportTask {
  id: string
  fileName: string
  status: string
  createdAt: string
  fileSize: number
}

export function DatabaseBackupView() {
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['database-export-tasks'],
    queryFn: async () => {
      const res = await http.get<ApiResponse<{ rows: ExportTask[] }>>(ENDPOINTS.DATABASE_EXPORT_TASKS)
      return res.data?.rows || []
    },
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await http.post(ENDPOINTS.DATABASE_EXPORT_TASKS, {})
      message.success('导出任务已创建')
      queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    { dataIndex: 'fileName', title: '文件名' },
    { dataIndex: 'createdAt', title: '创建时间' },
    {
      dataIndex: 'fileSize', title: '大小',
      render: (v: number) => v ? `${(v / 1024 / 1024).toFixed(2)} MB` : '--',
    },
    {
      dataIndex: 'status', title: '状态',
      render: (v: string) => (
        <Tag color={v === 'completed' ? 'green' : v === 'running' ? 'processing' : 'default'}>
          {v === 'completed' ? '已完成' : v === 'running' ? '进行中' : v}
        </Tag>
      ),
    },
  ]

  return (
    <div className="page-stack">
      <Card
        title="数据库管理"
        extra={
          <Space>
            <Button icon={<CloudDownloadOutlined />} onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.sql,.gz,.zip'
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                try {
                  const formData = new FormData()
                  formData.append('file', file)
                  await http.post(ENDPOINTS.DATABASE_IMPORT, formData)
                  message.success('导入成功')
                  queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })
                } catch (err) { message.error(err instanceof Error ? err.message : '导入失败') }
              }
              input.click()
            }}>导入</Button>
            <PermButton resource="database" action="export" type="primary" icon={<CloudUploadOutlined />} loading={exporting} onClick={handleExport}>导出</PermButton>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={tasks} loading={isLoading} size="small" />
      </Card>
    </div>
  )
}
