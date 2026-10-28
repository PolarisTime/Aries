import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Flex, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchOperationLogSummary,
  fetchOperationLogs,
  type OperationLogFilters,
  type OperationLogRecord,
} from '@/api/system/operation-logs'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
import { OperationLogDetailDrawer } from './operation-log-detail-drawer'
import {
  OperationLogFilters as FilterBar,
  type QuickFilterKey,
} from './operation-log-filters'
import { OperationLogSummaryCards } from './operation-log-summary'
import {
  applyQuickFilter,
  buildCsv,
  categoryOf,
  failureSummary,
  formatDuration,
  isFailure,
  relativeTimeParts,
} from './operation-log-view-model'
import './operation-log-page.css'

const DEFAULT_PAGE_SIZE = 30

/**
 * 操作日志页（重做版）：筛选栏 → 概览指标与趋势 → 日志表 → 详情抽屉。
 *
 * <p>与原「模块通用表格」相比的关键变化：时间/结果不再被挤到屏幕外（时间左固定、结果右固定）、
 * 失败原因直接可见、点行可看请求体/错误/同单据时间线，并可按操作人/单据号/类别/耗时筛选。</p>
 */
export function OperationLogPage() {
  const { t } = useTranslation()
  const loginName = useAuthStore((state) => state.user?.loginName)
  const [filters, setFilters] = useState<OperationLogFilters>({})
  const [quick, setQuick] = useState<QuickFilterKey>('all')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE)
  const [detail, setDetail] = useState<OperationLogRecord | null>(null)
  const today = dayjs().format('YYYY-MM-DD')

  const logsQuery = useQuery({
    queryKey: ['operation-logs', 'page', filters, page, size],
    queryFn: ({ signal }) =>
      fetchOperationLogs(
        { ...filters, page, size, sortBy: 'operationTime', direction: 'desc' },
        signal,
      ),
    staleTime: 0,
  })

  const summaryQuery = useQuery({
    queryKey: ['operation-logs', 'summary', filters],
    queryFn: ({ signal }) => fetchOperationLogSummary(filters, signal),
    staleTime: 0,
  })

  const patchFilters = (patch: Partial<OperationLogFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(0)
  }

  const quickChange = (next: QuickFilterKey) => {
    setQuick(next)
    setFilters((current) =>
      applyQuickFilter(next, current, { today, loginName }),
    )
    setPage(0)
  }

  const reset = () => {
    setQuick('all')
    setFilters({})
    setPage(0)
  }

  const [exporting, setExporting] = useState(false)

  /** 导出「当前筛选」的全部结果（分页拉取，最多 2000 条，避免一次拉爆）。 */
  const exportCsv = async () => {
    setExporting(true)
    try {
      const rows: OperationLogRecord[] = []
      const pageSize = 200
      for (let nextPage = 0; nextPage < 10; nextPage += 1) {
        const result = await fetchOperationLogs({
          ...filters,
          page: nextPage,
          size: pageSize,
          sortBy: 'operationTime',
          direction: 'desc',
        })
        rows.push(...result.content)
        if (!result.hasMore) break
      }
      if (!rows.length) {
        message.info(t('modules.pages.operationLog.exportEmpty'))
        return
      }
      const blob = new Blob([buildCsv(rows)], {
        type: 'text/csv;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `operation-logs-${today}.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success(
        t('modules.pages.operationLog.exportDone', { count: rows.length }),
      )
    } finally {
      setExporting(false)
    }
  }

  /*
   * 「相对时间」需要一个"现在"的时间点。以 dataUpdatedAt 作为依赖是为了在每次重新取数后重算,
   * 但 Date.now() 本身变化不会被 useState/useMemo 感知 —— 因此把依赖真正读进来(取 max 无副作用:
   * dataUpdatedAt 永远 <= 当前时间), 既保持原意, 也满足 useExhaustiveDependencies。
   */
  const now = useMemo(
    () => new Date(Math.max(Date.now(), logsQuery.dataUpdatedAt || 0)),
    [logsQuery.dataUpdatedAt],
  )

  const columns: ColumnsType<OperationLogRecord> = [
    {
      title: t('modules.pages.operationLog.operationTime'),
      dataIndex: 'operationTime',
      width: 170,
      fixed: 'left',
      render: (_value, record) => {
        const relative = relativeTimeParts(record.operationTime, now)
        return (
          <Tooltip title={record.operationTime?.replace('T', ' ')}>
            <Flex vertical gap={0}>
              <Typography.Text>
                {relative
                  ? Math.abs(relative.value) < 5 && relative.unit === 'second'
                    ? t('common.relativeTime.justNow')
                    : t(`common.relativeTime.${relative.unit}`, {
                        count: Math.abs(relative.value),
                      })
                  : record.operationTime?.slice(0, 19).replace('T', ' ')}
              </Typography.Text>
              <Typography.Text type="secondary" className="oplog-time-abs">
                {record.operationTime?.slice(11, 19)}
              </Typography.Text>
            </Flex>
          </Tooltip>
        )
      },
    },
    {
      title: t('modules.pages.operationLog.operator'),
      dataIndex: 'operatorName',
      width: 140,
      fixed: 'left',
      render: (_value, record) => (
        <Flex vertical gap={0}>
          <Typography.Text>{record.operatorName || '—'}</Typography.Text>
          {record.loginName && record.loginName !== record.operatorName ? (
            <Typography.Text type="secondary" className="oplog-time-abs">
              {record.loginName}
            </Typography.Text>
          ) : null}
        </Flex>
      ),
    },
    {
      title: t('modules.pages.operationLog.module'),
      dataIndex: 'moduleName',
      width: 150,
      ellipsis: true,
      render: (_value, record) => (
        <Flex align="center" gap={4}>
          <Tag className="oplog-category-tag">
            {t(
              `modules.pages.operationLog.category${
                categoryOf(record) === 'SESSION'
                  ? 'Session'
                  : categoryOf(record) === 'SYSTEM'
                    ? 'System'
                    : 'Business'
              }`,
            )}
          </Tag>
          <Typography.Text ellipsis>{record.moduleName}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: t('modules.pages.operationLog.action'),
      dataIndex: 'actionType',
      width: 90,
    },
    {
      title: t('modules.pages.operationLog.businessNo'),
      dataIndex: 'businessNo',
      width: 160,
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: t('modules.pages.operationLog.result'),
      dataIndex: 'resultStatus',
      width: 150,
      fixed: 'right',
      render: (_value, record) => {
        const failed = isFailure(record)
        const duration = formatDuration(record.durationMs)
        return (
          <Flex align="center" gap={6}>
            <Tag color={failed ? 'error' : 'success'}>
              {record.resultStatus}
            </Tag>
            {duration ? (
              <Typography.Text type="secondary">{duration}</Typography.Text>
            ) : null}
          </Flex>
        )
      },
    },
    {
      title: t('modules.pages.operationLog.failureReason'),
      key: 'failureReason',
      width: 220,
      ellipsis: true,
      render: (_value, record) => {
        const summary = failureSummary(record)
        return summary ? (
          <Tooltip title={summary}>
            <Typography.Text type="danger" ellipsis>
              {summary}
            </Typography.Text>
          </Tooltip>
        ) : (
          '—'
        )
      },
    },
    {
      title: t('modules.pages.operationLog.clientIp'),
      dataIndex: 'clientIp',
      width: 130,
      render: (value?: string) => value || '—',
    },
    {
      title: t('modules.pages.operationLog.actions'),
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_value, record) => (
        <Button
          aria-label={t('modules.pages.operationLog.openDetailA11y', {
            logNo: record.logNo,
          })}
          size="small"
          type="link"
          onClick={(event) => {
            event.stopPropagation()
            setDetail(record)
          }}
        >
          {t('modules.pages.operationLog.openDetail')}
        </Button>
      ),
    },
  ]

  return (
    <Flex className="oplog-page" vertical gap={12}>
      <Flex align="center" gap={8} justify="space-between" wrap>
        <Flex vertical gap={2}>
          <Typography.Title className="oplog-title" level={4}>
            {t('modules.pages.operationLog.operationLog')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('modules.pages.operationLog.operationLogDesc')}
          </Typography.Text>
        </Flex>
        <Flex align="center" gap={8}>
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={() => void exportCsv()}
          >
            {t('modules.pages.operationLog.exportCsv')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={logsQuery.isFetching}
            onClick={() => void logsQuery.refetch()}
          >
            {t('common.refresh')}
          </Button>
        </Flex>
      </Flex>

      <FilterBar
        loading={logsQuery.isFetching}
        quick={quick}
        onChange={patchFilters}
        onQuickChange={quickChange}
        onReset={reset}
        onSearch={() => setPage(0)}
        value={filters}
      />

      <OperationLogSummaryCards
        loading={summaryQuery.isPending}
        onPickDay={(date) => patchFilters({ startTime: date, endTime: date })}
        summary={summaryQuery.data}
        today={today}
      />

      <Table<OperationLogRecord>
        className="oplog-table"
        columns={columns}
        dataSource={logsQuery.data?.content ?? []}
        loading={logsQuery.isPending}
        onRow={(record) => ({
          onClick: () => setDetail(record),
        })}
        pagination={{
          current: page + 1,
          pageSize: size,
          total: logsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [20, 30, 50, 100],
          showTotal: (total) =>
            t('modules.pages.operationLog.totalCount', { total }),
          onChange: (nextPage, nextSize) => {
            setPage(nextSize === size ? nextPage - 1 : 0)
            setSize(nextSize)
          },
        }}
        rowClassName={(record) =>
          isFailure(record) ? 'oplog-row oplog-row--failed' : 'oplog-row'
        }
        rowKey="id"
        scroll={{ x: 1400 }}
        size="small"
      />

      <OperationLogDetailDrawer
        onClose={() => setDetail(null)}
        open={detail !== null}
        record={detail}
      />
    </Flex>
  )
}
