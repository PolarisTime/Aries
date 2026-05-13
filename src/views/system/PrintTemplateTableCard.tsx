import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Table from 'antd/es/table'
import type { TableProps } from 'antd/es/table'
import Tag from 'antd/es/tag'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import type { PrintTemplateRecord } from '@/types/print-template'
import { getPrintTemplateBillTypeLabel } from '@/views/system/print-template-view-utils'

interface Props {
  selectedBillType: string
  activeTemplateId?: string
  templates: PrintTemplateRecord[]
  loading: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  onBillTypeChange: (value: string) => void
  onRefresh: () => void
  onCreate: () => void
  onPreview: (record: PrintTemplateRecord) => void
  onEdit: (record: PrintTemplateRecord) => void
  onCopy: (record: PrintTemplateRecord) => void
  onDelete: (record: PrintTemplateRecord) => void
  onActiveChange: (id: string) => void
}

export function PrintTemplateTableCard({
  selectedBillType,
  activeTemplateId,
  templates,
  loading,
  canCreate,
  canEdit,
  canDelete,
  onBillTypeChange,
  onRefresh,
  onCreate,
  onPreview,
  onEdit,
  onCopy,
  onDelete,
  onActiveChange,
}: Props) {
  const columns: TableProps<PrintTemplateRecord>['columns'] = [
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'left',
      render: (_value, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onPreview(record)}
          >
            预览
          </Button>
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
          )}
          {canCreate && (
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => onCopy(record)}
            >
              复制
            </Button>
          )}
          {canDelete && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
    { dataIndex: 'templateName', title: '模板名称', width: 200 },
    {
      dataIndex: 'billType',
      title: '单据类型',
      width: 150,
      render: (value: string) => getPrintTemplateBillTypeLabel(value),
    },
    {
      dataIndex: 'isDefault',
      title: '默认',
      width: 80,
      align: 'center',
      render: (value: boolean) =>
        value ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
    {
      dataIndex: 'updateTime',
      title: '更新时间',
      width: 180,
      render: (value: string) => value || '--',
    },
  ]

  return (
    <Card
      title="打印模板"
      extra={
        <Space>
          <Select
            value={selectedBillType}
            onChange={onBillTypeChange}
            style={{ width: 200 }}
            options={printTemplateTargetOptions}
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
              新建模板
            </Button>
          )}
        </Space>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={templates}
        loading={loading}
        size="small"
        scroll={{ x: 900 }}
        onRow={(record) => ({
          onClick: () => onActiveChange(record.id),
          style: {
            cursor: 'pointer',
            background: activeTemplateId === record.id ? '#e6f7ff' : undefined,
          },
        })}
      />
    </Card>
  )
}
