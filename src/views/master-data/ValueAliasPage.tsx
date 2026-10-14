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
  createValueAlias,
  deleteValueAlias,
  listValueAliases,
  parseValueAliasDimension,
  updateValueAlias,
  type ValueAliasDimension,
  type ValueAliasInput,
  type ValueAliasRecord,
} from '@/api/master/value-aliases'
import { AppProPage } from '@/components/AppProPage'
import { ModuleTableUtilities } from '@/components/ModuleTableUtilities'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { ValueAliasEditorDialog } from './ValueAliasEditorDialog'
import { ValueAliasTable } from './ValueAliasTable'
import {
  buildValueAliasDimensionOptions,
  type ValueAliasFormValues,
} from './value-alias-form-model'

interface ValueAliasFilters {
  dimension?: ValueAliasDimension
  keyword?: string
}

/**
 * 值映射/别名维护页。
 *
 * <p>把「同一含义多种写法」归一（品牌「万泰」→「浙江万泰」、类别「直条」→「螺纹钢」），
 * 让业务人员自己维护规则，而不是改代码。列表支持按维度筛选与关键字搜索，
 * 新增/编辑走弹窗，删除有二次确认。</p>
 */
export function ValueAliasPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<ValueAliasFormValues>()
  const defaultPageSize = useDefaultPageSize()

  const [page, setPage] = useState(1)
  // 用户显式改过每页条数才记 override：运行配置晚到不会覆盖用户选择，
  // 也因此不需要「effect 里 setState」——那种写法会多渲染一次。
  const [pageSizeOverride, setPageSizeOverride] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [dimension, setDimension] = useState<ValueAliasDimension | undefined>()
  const [submittedFilters, setSubmittedFilters] = useState<ValueAliasFilters>(
    {},
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ValueAliasRecord | null>(
    null,
  )

  const pageSize = pageSizeOverride ?? defaultPageSize
  const dimensionOptions = buildValueAliasDimensionOptions(t)

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.valueAliases({
      dimension: submittedFilters.dimension,
      keyword: submittedFilters.keyword,
      // 1 基 UI 页码 → 0 基后端 page 参数。
      page: page - 1,
      size: pageSize,
    }),
    queryFn: ({ signal }) =>
      listValueAliases(
        {
          dimension: submittedFilters.dimension,
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
    queryClient.invalidateQueries({ queryKey: ['value-aliases'] })

  const openEditor = (record: ValueAliasRecord | null) => {
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
      payload: ValueAliasInput
    }) => (id ? updateValueAlias(id, payload) : createValueAlias(payload)),
    onSuccess: async (_record, variables) => {
      closeEditor()
      message.success(
        variables.id
          ? t('valueAlias.updateSuccess')
          : t('valueAlias.createSuccess'),
      )
      await refreshList()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteValueAlias(id),
    onSuccess: async () => {
      message.success(t('valueAlias.deleteSuccess'))
      // 删掉当前页最后一条时退回上一页，避免停在空白页。
      if (records.length === 1 && page > 1) {
        setPage(page - 1)
      }
      await refreshList()
    },
  })

  const applyFilters = (next: ValueAliasFilters) => {
    setPage(1)
    setSubmittedFilters(next)
  }

  const handleSearch = () => {
    applyFilters({ dimension, keyword: keyword.trim() || undefined })
  }

  const handleResetFilters = () => {
    setKeyword('')
    setDimension(undefined)
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
      className="value-alias-page"
      title={t('pages.value-alias')}
      description={t('valueAlias.description')}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <div className="module-grid-filter-region">
            <Space wrap>
              <Input
                aria-label={t('valueAlias.keywordLabel')}
                allowClear
                placeholder={t('valueAlias.keywordPlaceholder')}
                style={{ width: 260 }}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onPressEnter={handleSearch}
              />
              <Select
                aria-label={t('valueAlias.dimension')}
                allowClear
                placeholder={t('valueAlias.dimensionFilter')}
                style={{ width: 160 }}
                value={dimension}
                onChange={(value) =>
                  setDimension(parseValueAliasDimension(value) ?? undefined)
                }
                options={dimensionOptions}
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

          {/* 业务口径说明：只做同义归一，不做跨语义合并。 */}
          <Alert
            type="info"
            showIcon
            className="module-grid-warning"
            title={t('valueAlias.ruleNotice')}
          />

          <ValueAliasTable
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

        <ValueAliasEditorDialog
          open={editorOpen}
          editing={editingRecord}
          form={form}
          // 即时提示「同维度源写法重复」用的是当前页已加载记录，跨页冲突由后端 422 兜底。
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
