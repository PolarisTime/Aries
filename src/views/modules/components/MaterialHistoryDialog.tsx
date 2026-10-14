import { ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  diffMaterialSnapshots,
  fetchMaterialHistories,
  type MaterialHistoryRecord,
} from '@/api/master/materials'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import { formatDateTime } from '@/utils/formatters'
import '@/styles/material-history.css'
import { MaterialBatchRollbackButton } from './MaterialBatchRollbackButton'
import { MaterialFieldChanges } from './MaterialFieldChanges'
import { ModuleTablePagination } from './ModuleTablePagination'
import { useTableBodyScrollY } from './use-table-body-scroll-y'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  materialId: string
  materialLabel?: string
  onClose: () => void
  onRolledBack?: () => Promise<void> | void
}

const HISTORY_PAGE_SIZE = 10

const SOURCE_TAG_COLOR: Record<string, string> = {
  MANUAL: 'blue',
  IMPORT: 'processing',
  ROLLBACK: 'warning',
}

const TYPE_TAG_COLOR: Record<string, string> = {
  CREATED: 'success',
  UPDATED: 'processing',
  DELETED: 'error',
  ROLLBACK: 'warning',
}

/**
 * 商品版本历史弹层：分页展示来源、类型、导入批次与字段差异，并支持批次回滚。
 *
 * <p>用 {@link WorkspaceOverlay} 的「主数据对话框」尺寸（宽 `min(1040px, 100% - 24px)`、
 * 高 `max-height: min(900px, 100% - 24px)`）而非右侧抽屉：抽屉宽度只有 880px，六列历史
 * 信息加上「字段差异」多行文本会被挤到必须横向滚动才能看全。对话框把列宽按 24 栅格收敛，
 * 并让「字段差异」承担剩余宽度、单元格内换行。</p>
 *
 * <p>滚动分工：整个弹层不滚，只有表格表体纵向滚动（`scroll.y` 由
 * {@link useTableBodyScrollY} 量取），分页固定在弹层底部；空态没有 `scroll.x`，因此不会
 * 出现「内容为空却挂着横向滚动条」。</p>
 */
export function MaterialHistoryDialog({
  open,
  materialId,
  materialLabel,
  onClose,
  onRolledBack,
}: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(HISTORY_PAGE_SIZE)

  const historyQuery = useQuery({
    queryKey: QUERY_KEYS.materialHistories(materialId, page, pageSize),
    queryFn: ({ signal }) =>
      fetchMaterialHistories(materialId, page, pageSize, signal),
    enabled: open && Boolean(materialId),
    staleTime: STALE_REALTIME,
  })

  const sourceLabel = (source: string) => {
    switch (source) {
      case 'MANUAL':
        return t('modules.pages.material.historySourceManual')
      case 'IMPORT':
        return t('modules.pages.material.historySourceImport')
      case 'ROLLBACK':
        return t('modules.pages.material.historySourceRollback')
      default:
        return source
    }
  }

  const typeLabel = (changeType: string) => {
    switch (changeType) {
      case 'CREATED':
        return t('modules.pages.material.historyTypeCreated')
      case 'UPDATED':
        return t('modules.pages.material.historyTypeUpdated')
      case 'DELETED':
        return t('modules.pages.material.historyTypeDeleted')
      case 'ROLLBACK':
        return t('modules.pages.material.historyTypeRollback')
      default:
        return changeType
    }
  }

  const handleRolledBack = async () => {
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.materialHistories(materialId, page, pageSize),
    })
    await onRolledBack?.()
  }

  const columns: ColumnsType<MaterialHistoryRecord> = [
    {
      title: t('modules.pages.material.versionHistoryColumnTime'),
      dataIndex: 'changedAt',
      width: 150,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: t('modules.pages.material.versionHistoryColumnSource'),
      dataIndex: 'changeSource',
      width: 76,
      render: (value: string) => (
        <Tag color={SOURCE_TAG_COLOR[value]}>{sourceLabel(value)}</Tag>
      ),
    },
    {
      title: t('modules.pages.material.versionHistoryColumnType'),
      dataIndex: 'changeType',
      width: 76,
      render: (value: string) => (
        <Tag color={TYPE_TAG_COLOR[value]}>{typeLabel(value)}</Tag>
      ),
    },
    {
      title: t('modules.pages.material.versionHistoryColumnBatch'),
      dataIndex: 'importBatchNo',
      width: 184,
      /*
       * 这一列只承载数据：批次号必须可见（可复制），回滚动作在独立「操作」列。
       * 旧实现把整列渲染成红色「回滚该批次」按钮，列名与内容语义不符 —— 用户看到
       * 「导入批次」列却读不到批次号，还会把危险操作当成该列的唯一内容。
       */
      render: (value: string | null) =>
        value ? (
          <Typography.Text
            className="material-history-batch-no"
            copyable={{ text: value }}
          >
            {value}
          </Typography.Text>
        ) : (
          '—'
        ),
    },
    {
      title: t('modules.pages.material.versionHistoryColumnRemark'),
      dataIndex: 'remark',
      width: 120,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: t('modules.pages.material.versionHistoryColumnDiff'),
      key: 'diff',
      render: (_: unknown, record: MaterialHistoryRecord) => (
        <MaterialFieldChanges
          changes={diffMaterialSnapshots(record.before, record.after)}
        />
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 112,
      render: (_: unknown, record: MaterialHistoryRecord) =>
        record.importBatchNo ? (
          <MaterialBatchRollbackButton
            importBatchNo={record.importBatchNo}
            onRolledBack={handleRolledBack}
          />
        ) : (
          '—'
        ),
    },
  ]

  const total = historyQuery.data?.totalElements ?? 0

  return (
    <WorkspaceOverlay
      open={open}
      title={
        materialLabel
          ? `${t('modules.pages.material.versionHistoryTitle')} · ${materialLabel}`
          : t('modules.pages.material.versionHistoryTitle')
      }
      className="workspace-overlay-panel--form-dialog workspace-overlay-panel--material-history"
      onClose={onClose}
      footer={<Button onClick={onClose}>{t('common.close')}</Button>}
    >
      <div className="material-history-dialog">
        {historyQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title={
              historyQuery.error instanceof Error
                ? historyQuery.error.message
                : t('modules.pages.material.versionHistoryLoadFailed')
            }
            action={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={historyQuery.isFetching}
                onClick={() => void historyQuery.refetch()}
              >
                {t('errorBoundary.retry')}
              </Button>
            }
          />
        ) : null}
        <div
          ref={shellRef}
          className="module-table-shell material-history-table"
          style={shellStyle}
        >
          <Table<MaterialHistoryRecord>
            rowKey={(record) => record.id}
            size="small"
            tableLayout="fixed"
            columns={columns}
            dataSource={historyQuery.data?.content ?? []}
            loading={historyQuery.isLoading || historyQuery.isFetching}
            pagination={false}
            locale={{
              emptyText: t('modules.pages.material.versionHistoryEmpty'),
            }}
            scroll={{ y: scrollY }}
          />
        </div>
        <ModuleTablePagination
          total={total}
          currentPage={page}
          pageSize={pageSize}
          currentItemCount={historyQuery.data?.content.length ?? 0}
          overviewItems={[]}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage)
            setPageSize(nextPageSize)
          }}
        />
      </div>
    </WorkspaceOverlay>
  )
}
