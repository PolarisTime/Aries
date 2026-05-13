interface PaginationParams {
  current: number
  pageSize: number
  total: number
  onChange: (page: number, pageSize: number) => void
  pageSizeOptions?: string[]
}

export function createPaginationConfig({
  current,
  pageSize,
  total,
  onChange,
  pageSizeOptions = ['10', '20', '50', '100'],
}: PaginationParams) {
  return {
    current,
    pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions,
    showTotal: (t: number) => `共 ${t} 条`,
    onChange,
  }
}
