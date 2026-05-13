import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import type { DatabaseExportTask } from '@/api/database-admin'
import {
  formatDatabaseDateTime,
  formatDatabaseMemory,
  formatDatabaseTaskStatusColor,
} from '@/views/system/database-backup-view-utils'

type Props = {
  tasks: DatabaseExportTask[]
  loading: boolean
  onRefresh: () => void
  onGenerateDownloadLink: (taskId: string) => void
}

export function DatabaseExportTasksCard({
  tasks,
  loading,
  onRefresh,
  onGenerateDownloadLink,
}: Props) {
  const columns: TableColumnsType<DatabaseExportTask> = [
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'left',
      render: (_, record) =>
        record.status === '已完成' ? (
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => onGenerateDownloadLink(record.id)}
          >
            生成链接
          </Button>
        ) : null,
    },
    { dataIndex: 'taskNo', title: '任务编号', width: 220 },
    {
      dataIndex: 'status',
      title: '状态',
      width: 110,
      align: 'center',
      render: (value: string) => (
        <Tag color={formatDatabaseTaskStatusColor(value)}>{value}</Tag>
      ),
    },
    {
      dataIndex: 'fileName',
      title: '备份文件',
      width: 220,
      render: (value: string) => value || '--',
    },
    {
      dataIndex: 'fileSize',
      title: '大小',
      width: 120,
      align: 'right',
      render: (value: number) => (value ? formatDatabaseMemory(value) : '--'),
    },
    {
      dataIndex: 'createdAt',
      title: '提交时间',
      width: 180,
      render: (value: string) => formatDatabaseDateTime(value),
    },
    {
      dataIndex: 'expiresAt',
      title: '文件保留至',
      width: 180,
      render: (value: string) => formatDatabaseDateTime(value),
    },
    {
      dataIndex: 'failureReason',
      title: '结果说明',
      width: 260,
      render: (value: string, record) =>
        value || (record.status === '已完成' ? '导出完成，可下载' : '--'),
    },
  ]

  return (
    <Card
      title="导出任务"
      extra={
        <Button
          size="small"
          loading={loading}
          icon={<ReloadOutlined />}
          onClick={onRefresh}
        >
          刷新任务
        </Button>
      }
    >
      <Typography.Paragraph type="secondary">
        最近 20 条后台导出记录，成功后可在有效期内直接下载。
      </Typography.Paragraph>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={tasks}
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        pagination={false}
      />
    </Card>
  )
}
