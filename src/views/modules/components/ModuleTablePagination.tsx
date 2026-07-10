import { Pagination } from 'antd'
import { useTranslation } from 'react-i18next'

interface Props {
  total: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number, pageSize: number) => void
}

export function ModuleTablePagination({
  total,
  currentPage,
  pageSize,
  onPageChange,
}: Props) {
  const { t } = useTranslation()

  return (
    <nav
      className="module-table-pagination"
      aria-label={t('modules.workspace.pagination')}
    >
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={total}
        size="small"
        responsive
        showLessItems
        showSizeChanger
        pageSizeOptions={['10', '20', '50', '100']}
        showTotal={(count, range) =>
          t('modules.workspace.paginationRange', {
            start: range[0],
            end: range[1],
            total: count,
          })
        }
        onChange={onPageChange}
      />
    </nav>
  )
}
