import Empty from 'antd/es/empty'
import type { ColumnsType, TableProps } from 'antd/es/table'
import Table from 'antd/es/table'
import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useDeferredColumns } from '@/hooks/useDeferredColumns'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildTableScrollConfig,
  computeTableAvailableHeight,
  computeTableBodyScrollY,
  computeTableScrollX,
} from '@/views/modules/components/business-grid-table-utils'

const MIN_TABLE_BODY_SCROLL_Y = 240
const SELECTION_COLUMN_WIDTH = 40
const TABLE_BOTTOM_INSET = 16

interface Props {
  moduleKey: string
  columns: ColumnsType<ModuleRecord>
  dataSource: ModuleRecord[]
  loading: boolean
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  hasNextPage?: boolean
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
}

export function BusinessGridTable({
  moduleKey,
  columns,
  dataSource,
  loading,
  rowSelection,
  rowClassName,
  onRowClick,
  onRowDoubleClick,
  hasNextPage: _hasNextPage,
  fetchNextPage: _fetchNextPage,
  isFetchingNextPage: _isFetchingNextPage,
}: Props) {
  const { t } = useTranslation()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [scrollY, setScrollY] = useState<number>(MIN_TABLE_BODY_SCROLL_Y)
  const [shellWidth, setShellWidth] = useState(0)
  const visibleColumns = useDeferredColumns(columns)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === 'undefined') return

    let frameId = 0
    const measure = () => {
      const shellRect = shell.getBoundingClientRect()
      const availableHeight = computeTableAvailableHeight({
        containerHeight: shell.clientHeight,
        viewportHeight: window.innerHeight,
        containerTop: shellRect.top,
        bottomInset: TABLE_BOTTOM_INSET,
      })
      if (availableHeight <= 0) return
      const headerHeight =
        shell.querySelector('.ant-table-thead')?.getBoundingClientRect()
          .height || 0
      const nextScrollY = computeTableBodyScrollY(
        availableHeight,
        headerHeight,
        0,
      )
      setScrollY((prev) => (prev === nextScrollY ? prev : nextScrollY))
      const nextShellWidth = shell.clientWidth
      setShellWidth((prev) => (prev === nextShellWidth ? prev : nextShellWidth))
    }
    const scheduleMeasure = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(shell)
    scheduleMeasure()
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [])

  const selection = rowSelection
    ? { ...rowSelection, columnWidth: SELECTION_COLUMN_WIDTH }
    : undefined

  const isVirtual = dataSource.length > 100

  const scrollX = computeTableScrollX({
    columnWidths: visibleColumns.map((col) => col.width),
    containerWidth: shellWidth,
    selectionColumnWidth: rowSelection ? SELECTION_COLUMN_WIDTH : 0,
  })

  const scroll = buildTableScrollConfig({
    dataLength: dataSource.length,
    isVirtual,
    scrollX,
    scrollY,
    shellWidth,
  })
  const shellStyle = {
    '--module-table-body-height': `${scrollY}px`,
  } as CSSProperties

  const doubleClickCooldownRef = useRef(0)

  const onRow = (record: ModuleRecord) => ({
    onClick: (event: MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null
      if (
        target?.closest(
          'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
        )
      )
        return
      onRowClick(record)
    },
    onDoubleClick: (event: MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null
      if (
        target?.closest(
          'button, a, .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]',
        )
      )
        return
      const now = Date.now()
      if (now - doubleClickCooldownRef.current < 500) return
      doubleClickCooldownRef.current = now
      onRowDoubleClick(record)
    },
  })

  const emptyText = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={t('modules.table.noData')}
    />
  )
  const locale = { emptyText }

  return (
    <div ref={shellRef} className="module-table-shell" style={shellStyle}>
      <Table
        key={moduleKey}
        rowKey="id"
        bordered
        size="small"
        loading={loading}
        columns={visibleColumns}
        dataSource={dataSource}
        rowSelection={selection}
        virtual={isVirtual}
        tableLayout="fixed"
        pagination={false}
        scroll={scroll}
        rowClassName={rowClassName}
        onRow={onRow}
        locale={locale}
      />
    </div>
  )
}
