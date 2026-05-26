import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import type { DatabaseExportTask } from '@/api/database-admin'
import { formatTaskTime } from '@/views/system/database-backup-view-utils'

interface Props {
  tasks: DatabaseExportTask[]
  loading: boolean
  onRefresh: () => void
  onDownload: (taskId: string) => void
}

export function DatabaseExportTasksCard({ tasks, loading, onRefresh, onDownload }: Props) {
  const columns: TableColumnsType<DatabaseExportTask> = [
    { title: '任务编号', dataIndex: 'taskNo', width: 180 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => <Tag color={v === 'COMPLETED' ? 'green' : v === 'FAILED' ? 'red' : 'processing'}>{v}</Tag>,
    },
    { title: '文件名', dataIndex: 'fileName', width: 200, ellipsis: true },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => formatTaskTime(v),
    },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, record: DatabaseExportTask) =>
        record.status === 'COMPLETED' && record.downloadUrl ? (
          <Button size="small" icon={<DownloadOutlined />} onClick={() => onDownload(record.id)}>
            下载
          </Button>
        ) : null,
    },
  ]

  return (
    <Card
      title="导出任务"
      extra={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>刷新</Button>}
      className="mb-16"
    >
      <Table rowKey="id" columns={columns} dataSource={tasks} size="small" pagination={false} />
    </Card>
  )
}
