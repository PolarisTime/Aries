import { PlusOutlined, ReloadOutlined, TableOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Empty,
  Form,
  Modal,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
} from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplierOption } from '@/api/master/supplier-options'
import { fetchSupplierOptions } from '@/api/master/supplier-options'
import { fetchAllSupplierPriceLists } from '@/api/master/supplier-price-lists'
import { AppProPage } from '@/components/AppProPage'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  STALE_MASTER_OPTIONS,
  STALE_REALTIME,
} from '@/constants/query-policies'
import type { EntityId } from '@/types/entity-id'
import { SupplierPriceListMatrixEditor } from './SupplierPriceListMatrixEditor'
import { SupplierPriceListMatrixOverlay } from './SupplierPriceListMatrixOverlay'
import './supplier-price-list.css'

const EMPTY_SUPPLIERS: SupplierOption[] = []

interface AddSupplierFormValues {
  supplierId?: EntityId
}

/**
 * 供应商品牌价格表维护页（R2 形态 = 报单比价的矩阵）。
 *
 * <p>顶部是**供应商标签页**（已维护价格表的供应商 + 「新增供应商价格表」入口），
 * 标签页下方是矩阵编辑器：左侧固定只读列 `类别/材质/规格(直径)/长度`（来自
 * `GET /supplier-price-lists/spec-catalog`），右侧每个品牌一列，列内只填「单价」。
 * **没有版本**：一个（供应商 + 品牌）只有一张表，用更新时间展示。</p>
 *
 * <p>固定标识见设计契约 4.1：权限资源与菜单 code = `supplier-price-lists`，
 * 路由 `/master-data/supplier-price-lists`。</p>
 */
export function SupplierPriceListPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<AddSupplierFormValues>()
  const [activeSupplierId, setActiveSupplierId] = useState<EntityId | null>(
    null,
  )
  const [addOpen, setAddOpen] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(false)

  const supplierOptionsQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,
    queryFn: fetchSupplierOptions,
    staleTime: STALE_MASTER_OPTIONS,
  })
  const supplierOptions = supplierOptionsQuery.data ?? EMPTY_SUPPLIERS

  const listsQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceLists({
      supplierId: activeSupplierId ?? undefined,
      page: 1,
      size: 200,
    }),
    queryFn: ({ signal }) =>
      fetchAllSupplierPriceLists(
        activeSupplierId ? { supplierId: activeSupplierId } : {},
        signal,
      ),
    staleTime: STALE_REALTIME,
  })

  const lists = useMemo(() => listsQuery.data ?? [], [listsQuery.data])

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['supplier-price-lists'] })
  }, [queryClient])

  /** 标签页 = 已有价格表的供应商（按供应商名排序）。 */
  const tabs = useMemo(() => {
    const supplierNameById = new Map(
      supplierOptions.map((option) => [option.id, option.label] as const),
    )
    const brandCountById = new Map<EntityId, number>()
    for (const list of lists) {
      brandCountById.set(
        list.supplierId,
        (brandCountById.get(list.supplierId) ?? 0) + 1,
      )
    }
    return [...brandCountById.entries()]
      .map(([supplierId, brandCount]) => ({
        supplierId,
        label: supplierNameById.get(supplierId) ?? `#${supplierId}`,
        brandCount,
      }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, 'zh-Hans-CN'),
      )
  }, [lists, supplierOptions])

  const activeSupplier = useMemo(
    () => supplierOptions.find((option) => option.id === activeSupplierId),
    [supplierOptions, activeSupplierId],
  )

  const activeSupplierName =
    activeSupplier?.label ??
    tabs.find((tab) => tab.supplierId === activeSupplierId)?.label ??
    // 供应商选项尚未加载完时先显示 ID，避免标题闪烁
    (activeSupplierId ? `#${activeSupplierId}` : '')

  const handleAddSupplier = async () => {
    let values: AddSupplierFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (!values.supplierId) {
      return
    }
    // 选中即成为当前供应商；矩阵里按需添加品牌列（首个报价落在哪一列，就为哪个品牌建表）
    setActiveSupplierId(values.supplierId)
    setAddOpen(false)
    form.resetFields()
  }

  return (
    <AppProPage
      className="business-grid-pro-page"
      title={t('pages.supplier-price-lists')}
      description={t('supplierPriceList.pageDescription')}
    >
      <div className="page-stack module-page-stack supplier-price-list-page">
        <section className="module-grid-workspace">
          <div className="supplier-price-list-tabs">
            {tabs.length ? (
              <Tabs
                activeKey={activeSupplierId ?? tabs[0]?.supplierId}
                aria-label={t('supplierPriceList.tabs.label')}
                onChange={(key) => setActiveSupplierId(key)}
                items={tabs.map((tab) => ({
                  key: tab.supplierId,
                  label: (
                    <span className="supplier-price-list-tab-label">
                      <span>{tab.label}</span>
                      <Tag>
                        {t('supplierPriceList.tabs.brandCount', {
                          count: tab.brandCount,
                        })}
                      </Tag>
                    </span>
                  ),
                  children: null,
                }))}
              />
            ) : (
              <span className="supplier-price-list-tabs-empty">
                {listsQuery.isLoading
                  ? t('common.loading')
                  : t('supplierPriceList.tabs.empty')}
              </span>
            )}
            <Space className="supplier-price-list-tabs-actions" wrap>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields()
                  setAddOpen(true)
                }}
              >
                {t('supplierPriceList.tabs.add')}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                loading={listsQuery.isFetching}
                onClick={refresh}
              >
                {t('common.refresh')}
              </Button>
              <Button
                icon={<TableOutlined />}
                onClick={() => setMatrixOpen(true)}
              >
                {t('supplierPriceList.actions.matrix')}
              </Button>
            </Space>
          </div>

          {listsQuery.error ? (
            <Alert
              type="error"
              showIcon
              className="module-grid-warning"
              title={
                listsQuery.error instanceof Error
                  ? listsQuery.error.message
                  : t('api.loadFailed')
              }
              action={
                <Button
                  size="small"
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={refresh}
                >
                  {t('errorBoundary.retry')}
                </Button>
              }
            />
          ) : null}

          {activeSupplierId ? (
            <SupplierPriceListMatrixEditor
              key={activeSupplierId}
              supplierId={activeSupplierId}
              supplierName={activeSupplierName}
              brands={activeSupplier?.brands ?? []}
              onChanged={refresh}
            />
          ) : (
            <div className="supplier-price-list-placeholder">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('supplierPriceList.tabs.selectHint')}
              />
            </div>
          )}

          {listsQuery.isLoading && !activeSupplierId ? (
            <div className="supplier-price-list-placeholder">
              <Spin />
            </div>
          ) : null}
        </section>
      </div>

      {addOpen ? (
        <Modal
          open
          title={t('supplierPriceList.tabs.addTitle')}
          okText={t('supplierPriceList.tabs.addConfirm')}
          cancelText={t('common.cancel')}
          onOk={() => void handleAddSupplier()}
          onCancel={() => setAddOpen(false)}
          destroyOnHidden
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="supplierId"
              label={t('supplierPriceList.header.supplier')}
              rules={[
                {
                  required: true,
                  message: t('supplierPriceList.header.supplierRequired'),
                },
              ]}
            >
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                placeholder={t('common.pleaseSelect')}
                options={supplierOptions.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
              />
            </Form.Item>
          </Form>
          <Alert
            type="info"
            showIcon
            title={t('supplierPriceList.tabs.addHint')}
          />
        </Modal>
      ) : null}

      <SupplierPriceListMatrixOverlay
        open={matrixOpen}
        supplierOptions={supplierOptions}
        onClose={() => setMatrixOpen(false)}
      />
    </AppProPage>
  )
}
