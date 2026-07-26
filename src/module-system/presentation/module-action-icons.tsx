import {
  AuditOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  InboxOutlined,
  PaperClipOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  PrinterOutlined,
  RedoOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

export function resolveModuleActionIcon(label: string): ReactNode | undefined {
  if (
    label.includes('撤回执行') ||
    label.includes('反签') ||
    label.includes('Revert Execution') ||
    label.includes('Reopen Signature')
  ) {
    return <RollbackOutlined />
  }
  if (label.includes('开始执行') || label.includes('Start Execution')) {
    return <PlayCircleOutlined />
  }
  if (label.includes('签署合同') || label.includes('Sign Contract')) {
    return <FileDoneOutlined />
  }
  if (label.includes('归档') || label.includes('Archive')) {
    return <InboxOutlined />
  }
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
  if (
    label.includes('审核') ||
    label.includes('确认') ||
    label.includes('核准') ||
    label.includes('核定') ||
    label.includes('Audit') ||
    label.includes('Confirm') ||
    label.includes('Appro') ||
    label.includes('Verification')
  ) {
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
