import type { TableColumnsType, TableProps } from 'antd'
import { Empty, Table } from 'antd'
import type { FinanceBalance } from '@/api/finance/finance-overview'
import { useTableBodyScrollY } from '@/views/modules/components/use-table-body-scroll-y'

/** 往来余额表格：列渲染、分页与空态展示 */
export function FinanceOverviewTableSection({
  components,
  columns,
  loading,
  onPageChange,
  page,
  pageSize,
  queryEnabled,
  rows,
  scrollX,
  total,
}: {
  columns: TableColumnsType<FinanceBalance>
  components: TableProps<FinanceBalance>['components']
  loading: boolean
  onPageChange: (page: number, pageSize: number) => void
  page: number
  pageSize: number
  queryEnabled: boolean
  rows: FinanceBalance[]
  scrollX: number
  total: number
}) {
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()
  return (
    <section className="finance-overview-table">
      <div ref={shellRef} className="module-table-shell" style={shellStyle}>
        <Table
          rowKey="key"
          size="small"
          columns={columns}
          components={components}
          dataSource={rows}
          loading={loading}
          scroll={{ x: scrollX, y: scrollY }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={queryEnabled ? '暂无往来余额' : '请选择结算主体'}
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (count) => `共 ${count} 条`,
            onChange: onPageChange,
          }}
        />
      </div>
    </section>
  )
}
