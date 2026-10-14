import { PlusOutlined } from '@ant-design/icons'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Alert, Button, Form, Input, Select, Space } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createQuoteRegion,
  deleteQuoteRegion,
  listQuoteRegions,
  parseQuoteRegionStatus,
  type QuoteRegionInput,
  type QuoteRegionRecord,
  type QuoteRegionStatus,
  updateQuoteRegion,
} from '@/api/master/quote-regions'
import { AppProPage } from '@/components/AppProPage'
import { ModuleTableUtilities } from '@/components/ModuleTableUtilities'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { QuoteRegionEditorDialog } from './QuoteRegionEditorDialog'
import { QuoteRegionTable } from './QuoteRegionTable'
import {
  buildQuoteRegionStatusOptions,
  type QuoteRegionFormValues,
} from './quote-region-form-model'

interface QuoteRegionFilters {
  status?: QuoteRegionStatus
  keyword?: string
}

/**
 * 取价地区维护页。
 *
 * <p>西本行情按地区（城市）报价，宿主名为 `{slug}.steelx2.com`。此前这份「城市 → 子域名」
 * 清单只写在 `application.yml`，新增城市必须改配置并重启；现在由业务自行维护，
 * 停用城市也不必删除记录。列表默认按排序号升序（后端已处理），支持按状态筛选与关键字搜索，
 * 新增/编辑走弹窗，删除有二次确认。</p>
 */
export function QuoteRegionPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<QuoteRegionFormValues>()
  const defaultPageSize = useDefaultPageSize()

  const [page, setPage] = useState(1)
  // 用户显式改过每页条数才记 override：运行配置晚到不会覆盖用户选择，
  // 也因此不需要「effect 里 setState」——那种写法会多渲染一次。
  const [pageSizeOverride, setPageSizeOverride] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<QuoteRegionStatus | undefined>()
  const [submittedFilters, setSubmittedFilters] = useState<QuoteRegionFilters>(
    {},
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<QuoteRegionRecord | null>(
    null,
  )

  const pageSize = pageSizeOverride ?? defaultPageSize
  const statusOptions = buildQuoteRegionStatusOptions(t)

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.quoteRegions({
      status: submittedFilters.status,
      keyword: submittedFilters.keyword,
      // 1 基 UI 页码 → 0 基后端 page 参数。
      page: page - 1,
      size: pageSize,
    }),
    queryFn: ({ signal }) =>
      listQuoteRegions(
        {
          status: submittedFilters.status,
          keyword: submittedFilters.keyword,
          page: page - 1,
          size: pageSize,
        },
        signal,
      ),
    staleTime: STALE_REALTIME,
    placeholderData: keepPreviousData,
  })

  const records = listQuery.data?.content ?? []
  const total = listQuery.data?.totalElements ?? 0
  const errorMessage =
    listQuery.error instanceof Error ? listQuery.error.message.trim() : ''

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: ['quote-regions'] })

  const openEditor = (record: QuoteRegionRecord | null) => {
    setEditingRecord(record)
    form.resetFields()
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingRecord(null)
    form.resetFields()
  }

  const saveMutation = useMutation({
    // 写操作失败由请求层统一提示（ProblemDetail 的 detail 文案），这里不再重复弹窗，
    // 弹层保持打开让用户改完重试。
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | null
      payload: QuoteRegionInput
    }) => (id ? updateQuoteRegion(id, payload) : createQuoteRegion(payload)),
    onSuccess: async (_record, variables) => {
      closeEditor()
      message.success(
        variables.id
          ? t('quoteRegion.updateSuccess')
          : t('quoteRegion.createSuccess'),
      )
      await refreshList()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuoteRegion(id),
    onSuccess: async () => {
      message.success(t('quoteRegion.deleteSuccess'))
      // 删掉当前页最后一条时退回上一页，避免停在空白页。
      if (records.length === 1 && page > 1) {
        setPage(page - 1)
      }
      await refreshList()
    },
  })

  const applyFilters = (next: QuoteRegionFilters) => {
    setPage(1)
    setSubmittedFilters(next)
  }

  const handleSearch = () => {
    applyFilters({ status, keyword: keyword.trim() || undefined })
  }

  const handleResetFilters = () => {
    setKeyword('')
    setStatus(undefined)
    applyFilters({})
  }

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== pageSize) {
      setPageSizeOverride(nextPageSize)
    }
    setPage(nextPage)
  }

  return (
    <AppProPage
      className="quote-region-page"
      title={t('pages.quote-region')}
      description={t('quoteRegion.description')}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <div className="module-grid-filter-region">
            <Space wrap>
              <Input
                aria-label={t('quoteRegion.keywordLabel')}
                allowClear
                placeholder={t('quoteRegion.keywordPlaceholder')}
                style={{ width: 260 }}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onPressEnter={handleSearch}
              />
              <Select
                aria-label={t('quoteRegion.status')}
                allowClear
                placeholder={t('quoteRegion.statusFilter')}
                style={{ width: 160 }}
                value={status}
                onChange={(value) =>
                  setStatus(parseQuoteRegionStatus(value) ?? undefined)
                }
                options={statusOptions}
              />
              <Button type="primary" onClick={handleSearch}>
                {t('common.search')}
              </Button>
              <Button onClick={handleResetFilters}>{t('common.reset')}</Button>
            </Space>
          </div>

          {/* 命令区与资料页共用同一排版：新增在左，刷新等工具在右。 */}
          <div className="module-grid-command-region">
            <div className="module-table-toolbar">
              <Space wrap className="module-table-actions">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openEditor(null)}
                >
                  {t('common.create')}
                </Button>
              </Space>
              <ModuleTableUtilities
                selectedCount={0}
                isFetching={listQuery.isFetching}
                onRefresh={() => void listQuery.refetch()}
              />
            </div>
          </div>

          {/* 业务口径说明：slug 直接拼进主机名，禁止按拼音「纠正」西本自身拼写。 */}
          <Alert
            type="info"
            showIcon
            className="module-grid-warning"
            title={t('quoteRegion.ruleNotice')}
          />

          <QuoteRegionTable
            records={records}
            total={total}
            page={page}
            pageSize={pageSize}
            isLoading={listQuery.isLoading}
            isFetching={listQuery.isFetching}
            hasError={listQuery.isError}
            errorMessage={errorMessage}
            deletingId={
              deleteMutation.isPending
                ? (deleteMutation.variables ?? null)
                : null
            }
            onPageChange={handlePageChange}
            onRetry={() => void listQuery.refetch()}
            onEdit={(record) => openEditor(record)}
            onDelete={(record) => {
              deleteMutation.mutate(asString(record.id))
            }}
          />
        </section>

        <QuoteRegionEditorDialog
          open={editorOpen}
          editing={editingRecord}
          form={form}
          // 即时提示「城市名/子域名重复」用的是当前页已加载记录，跨页冲突由后端 422 兜底。
          records={records}
          saving={saveMutation.isPending}
          onSubmit={(payload) =>
            saveMutation.mutate({ id: editingRecord?.id ?? null, payload })
          }
          onClose={closeEditor}
        />
      </div>
    </AppProPage>
  )
}
