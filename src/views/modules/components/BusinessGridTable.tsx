import { Empty, Table } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
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

const MIN_TABLE_BODY_SCROLL_Y = 120
const ROW_SINGLE_CLICK_DELAY_MS = 220
const SEQUENCE_COLUMN_WIDTH = 64
const ROW_INTERACTION_EXCLUSION_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]'

interface Props {
  moduleKey: string
  columns: ColumnsType<ModuleRecord>
  components?: TableProps<ModuleRecord>['components']
  dataSource: ModuleRecord[]
  loading: boolean
  currentPage: number
  pageSize: number
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  hasNextPage?: boolean
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
}

function shouldIgnoreRowInteraction(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(ROW_INTERACTION_EXCLUSION_SELECTOR))
  )
}

export function BusinessGridTable({
  moduleKey,
  columns,
  components,
  dataSource,
  loading,
  currentPage,
  pageSize,
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
  const sequenceStart = (currentPage - 1) * pageSize
  const tableColumns = useMemo<ColumnsType<ModuleRecord>>(() => {
    const sequenceColumn: ColumnsType<ModuleRecord>[number] = {
      key: 'sequence',
      title: t('modules.table.sequence'),
      width: SEQUENCE_COLUMN_WIDTH,
      align: 'center',
      render: (_value, _record, index) => sequenceStart + index + 1,
    }
    return rowSelection
      ? [sequenceColumn, Table.SELECTION_COLUMN, ...visibleColumns]
      : [sequenceColumn, ...visibleColumns]
  }, [rowSelection, sequenceStart, t, visibleColumns])

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === 'undefined') return

    let frameId = 0
    const measure = () => {
      const availableHeight = computeTableAvailableHeight(shell.clientHeight)
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
    measure()
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [])

  const isVirtual = dataSource.length > 100

  const scrollX = computeTableScrollX({
    columnWidths: [
      SEQUENCE_COLUMN_WIDTH,
      ...visibleColumns.map((col) => col.width),
    ],
    containerWidth: shellWidth,
    selectionColumnWidth: rowSelection ? 32 : 0,
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
  const rowClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedRowKeys = rowSelection?.selectedRowKeys?.map((key) =>
    String(key),
  )
  const resolveRowClassName = (record: ModuleRecord) => {
    const classes = [rowClassName(record)]
    if (selectedRowKeys?.includes(String(record.id))) {
      classes.push('module-table-row-selected-border-beam')
    }
    return classes.filter(Boolean).join(' ')
  }

  useEffect(
    () => () => {
      if (rowClickTimerRef.current) {
        clearTimeout(rowClickTimerRef.current)
      }
    },
    [],
  )

  const clearPendingRowClick = () => {
    if (!rowClickTimerRef.current) return
    clearTimeout(rowClickTimerRef.current)
    rowClickTimerRef.current = null
  }

  const onRow = (record: ModuleRecord) => ({
    tabIndex: 0,
    'aria-keyshortcuts': rowSelection ? 'Enter Space' : 'Enter',
    ...(selectedRowKeys
      ? { 'aria-selected': selectedRowKeys.includes(String(record.id)) }
      : {}),
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (shouldIgnoreRowInteraction(event.target)) return
      clearPendingRowClick()
      rowClickTimerRef.current = setTimeout(() => {
        rowClickTimerRef.current = null
        onRowClick(record)
      }, ROW_SINGLE_CLICK_DELAY_MS)
    },
    onDoubleClick: (event: MouseEvent<HTMLElement>) => {
      if (shouldIgnoreRowInteraction(event.target)) return
      clearPendingRowClick()
      const now = Date.now()
      if (now - doubleClickCooldownRef.current < 500) return
      doubleClickCooldownRef.current = now
      onRowDoubleClick(record)
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (shouldIgnoreRowInteraction(event.target)) return
      if (event.key === 'Enter') {
        event.preventDefault()
        clearPendingRowClick()
        onRowDoubleClick(record)
        return
      }
      if (event.key === ' ' && rowSelection) {
        event.preventDefault()
        clearPendingRowClick()
        onRowClick(record)
      }
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
        size="small"
        loading={loading}
        columns={tableColumns}
        components={components}
        dataSource={dataSource}
        rowSelection={rowSelection}
        virtual={isVirtual}
        tableLayout="fixed"
        pagination={false}
        scroll={scroll}
        rowClassName={resolveRowClassName}
        onRow={onRow}
        locale={locale}
      />
    </div>
  )
}
