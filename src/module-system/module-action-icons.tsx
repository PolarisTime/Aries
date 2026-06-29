import {
  AuditOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileSearchOutlined,
  PaperClipOutlined,
  PlusOutlined,
  PrinterOutlined,
  RedoOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

export function resolveModuleActionIcon(label: string): ReactNode | undefined {
  if (label.includes('查询')) {
    return <SearchOutlined />
  }
  if (label.includes('重置')) {
    return <RedoOutlined />
  }
  if (label.includes('关闭') || label.includes('取消')) {
    return <CloseOutlined />
  }
  if (label.includes('刷新')) {
    return <ReloadOutlined />
  }
  if (label.includes('新增') || label.includes('新建')) {
    return <PlusOutlined />
  }
  if (label.includes('导出') || label.includes('下载')) {
    return <DownloadOutlined />
  }
  if (label.includes('删除')) {
    return <DeleteOutlined />
  }
  if (label.includes('审核')) {
    return <AuditOutlined />
  }
  if (label.includes('打印')) {
    return <PrinterOutlined />
  }
  if (label.includes('附件')) {
    return <PaperClipOutlined />
  }
  if (label.includes('编辑')) {
    return <SaveOutlined />
  }
  if (label.includes('查看') || label.includes('流水')) {
    return <EyeOutlined />
  }
  if (label.includes('生成')) {
    return <FileSearchOutlined />
  }

  return undefined
}
