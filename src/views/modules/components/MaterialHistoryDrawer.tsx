import { ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Drawer, Table, Tag } from 'antd'
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
import { MaterialBatchRollbackButton } from './MaterialBatchRollbackButton'
import { MaterialFieldChanges } from './MaterialFieldChanges'
import { ModuleTablePagination } from './ModuleTablePagination'
import { useTableBodyScrollY } from './use-table-body-scroll-y'

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

/** 商品版本历史抽屉：分页展示来源、类型、导入批次与字段差异，并支持批次回滚。 */
export function MaterialHistoryDrawer({
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
      width: 170,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: t('modules.pages.material.versionHistoryColumnSource'),
      dataIndex: 'changeSource',
      width: 80,
      render: (value: string) => (
        <Tag color={SOURCE_TAG_COLOR[value]}>{sourceLabel(value)}</Tag>
      ),
    },
    {
      title: t('modules.pages.material.versionHistoryColumnType'),
      dataIndex: 'changeType',
      width: 80,
      render: (value: string) => (
        <Tag color={TYPE_TAG_COLOR[value]}>{typeLabel(value)}</Tag>
      ),
    },
    {
      title: t('modules.pages.material.versionHistoryColumnBatch'),
      dataIndex: 'importBatchNo',
      width: 220,
      render: (value: string | null) =>
        value ? (
          <MaterialBatchRollbackButton
            importBatchNo={value}
            onRolledBack={handleRolledBack}
          />
        ) : (
          '—'
        ),
    },
    {
      title: t('modules.pages.material.versionHistoryColumnRemark'),
      dataIndex: 'remark',
      width: 160,
      ellipsis: true,
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
  ]

  const total = historyQuery.data?.totalElements ?? 0

  return (
    <Drawer
      open={open}
      title={
        materialLabel
          ? `${t('modules.pages.material.versionHistoryTitle')} · ${materialLabel}`
          : t('modules.pages.material.versionHistoryTitle')
      }
      width={880}
      onClose={onClose}
      destroyOnHidden
    >
      <div className="flex flex-col gap-3">
        {historyQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message={
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
          className="module-table-shell"
          style={{ ...shellStyle, height: 460 }}
        >
          <Table<MaterialHistoryRecord>
            rowKey={(record) => record.id}
            size="small"
            columns={columns}
            dataSource={historyQuery.data?.content ?? []}
            loading={historyQuery.isLoading || historyQuery.isFetching}
            pagination={false}
            locale={{
              emptyText: t('modules.pages.material.versionHistoryEmpty'),
            }}
            scroll={{ x: 'max-content', y: scrollY }}
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
    </Drawer>
  )
}
