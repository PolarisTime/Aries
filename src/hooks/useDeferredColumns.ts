import type { ColumnsType } from 'antd/es/table'

/**
 * 同步返回完整列集合，避免表格在首帧后改变结构和横向滚动范围。
 */
export function useDeferredColumns<T>(columns: ColumnsType<T>): ColumnsType<T> {
  return columns
}
