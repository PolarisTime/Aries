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
  createLengthPremium,
  deleteLengthPremium,
  type LengthPremiumInput,
  type LengthPremiumRecord,
  type LengthPremiumStatus,
  listLengthPremiums,
  parseLengthPremiumStatus,
  updateLengthPremium,
} from '@/api/master/length-premiums'
import { AppProPage } from '@/components/AppProPage'
import { ModuleTableUtilities } from '@/components/ModuleTableUtilities'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { LengthPremiumEditorDialog } from './LengthPremiumEditorDialog'
import { LengthPremiumTable } from './LengthPremiumTable'
import {
  buildLengthPremiumStatusOptions,
  type LengthPremiumFormValues,
} from './length-premium-form-model'

interface LengthPremiumFilters {
  status?: LengthPremiumStatus
  keyword?: string
}

/**
 * 定尺加价维护页。
 *
 * <p>行情匹配时按定尺对基准价加价（「12 米 +30 元/吨」）。此前规则同时写在
 * `application.yml` 与 Java 默认值里，调整加价必须改代码重启；现在由业务自行维护。
 * 列表默认按排序号升序（后端已处理），支持按状态筛选与关键字搜索，新增/编辑走弹窗，
 * 删除有二次确认。</p>
 */
export function LengthPremiumPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<LengthPremiumFormValues>()
  const defaultPageSize = useDefaultPageSize()

  const [page, setPage] = useState(1)
  // 用户显式改过每页条数才记 override：运行配置晚到不会覆盖用户选择，
  // 也因此不需要「effect 里 setState」——那种写法会多渲染一次。
  const [pageSizeOverride, setPageSizeOverride] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<LengthPremiumStatus | undefined>()
  const [submittedFilters, setSubmittedFilters] =
    useState<LengthPremiumFilters>({})
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] =
    useState<LengthPremiumRecord | null>(null)

  const pageSize = pageSizeOverride ?? defaultPageSize
  const statusOptions = buildLengthPremiumStatusOptions(t)

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.lengthPremiums({
      status: submittedFilters.status,
      keyword: submittedFilters.keyword,
      // 1 基 UI 页码 → 0 基后端 page 参数。
      page: page - 1,
      size: pageSize,
    }),
    queryFn: ({ signal }) =>
      listLengthPremiums(
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

  /**
   * 维护后刷新两处缓存：本页列表 + **选项缓存**。
   *
   * <p>选项缓存（`masterOptions.lengthPremiums`）被材料录入的长度下拉与比价页的加价/排序共用。
   * 只失效列表会让用户新建定尺后，下拉最长 5 分钟（staleTime）看不到新值，进而出现
   * 「主数据里明明有 10米，材料页却选不到」——所以写成功后两处一起失效。</p>
   */
  const refreshList = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['length-premiums'] }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.lengthPremiums,
      }),
    ])

  const openEditor = (record: LengthPremiumRecord | null) => {
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
      payload: LengthPremiumInput
    }) =>
      id ? updateLengthPremium(id, payload) : createLengthPremium(payload),
    onSuccess: async (_record, variables) => {
      closeEditor()
      message.success(
        variables.id
          ? t('lengthPremium.updateSuccess')
          : t('lengthPremium.createSuccess'),
      )
      await refreshList()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLengthPremium(id),
    onSuccess: async () => {
      message.success(t('lengthPremium.deleteSuccess'))
      // 删掉当前页最后一条时退回上一页，避免停在空白页。
      if (records.length === 1 && page > 1) {
        setPage(page - 1)
      }
      await refreshList()
    },
  })

  const applyFilters = (next: LengthPremiumFilters) => {
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
      className="length-premium-page"
      title={t('pages.length-premium')}
      description={t('lengthPremium.description')}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <div className="module-grid-filter-region">
            <Space wrap>
              <Input
                aria-label={t('lengthPremium.keywordLabel')}
                allowClear
                placeholder={t('lengthPremium.keywordPlaceholder')}
                style={{ width: 260 }}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onPressEnter={handleSearch}
              />
              <Select
                aria-label={t('lengthPremium.status')}
                allowClear
                placeholder={t('lengthPremium.statusFilter')}
                style={{ width: 160 }}
                value={status}
                onChange={(value) =>
                  setStatus(parseLengthPremiumStatus(value) ?? undefined)
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

          {/* 业务口径说明：加价按元/吨计入匹配价，负数表示优惠而非异常输入。 */}
          <Alert
            type="info"
            showIcon
            className="module-grid-warning"
            title={t('lengthPremium.ruleNotice')}
          />

          <LengthPremiumTable
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

        <LengthPremiumEditorDialog
          open={editorOpen}
          editing={editingRecord}
          form={form}
          // 即时提示「定尺名称重复」用的是当前页已加载记录，跨页冲突由后端 422 兜底。
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
