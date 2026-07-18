interface PaginationParams {
  current: number
  pageSize: number
  total: number
  onChange: (page: number, pageSize: number) => void
  pageSizeOptions?: string[]
  t: (key: string, options?: Record<string, unknown>) => string
}

export function createPaginationConfig({
  current,
  pageSize,
  total,
  onChange,
  pageSizeOptions = ['10', '20', '30', '50', '100'],
  t,
}: PaginationParams) {
  return {
    current,
    pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions,
    showTotal: (count: number) => t('hooks.pagination.total', { count }),
    onChange,
  }
}
