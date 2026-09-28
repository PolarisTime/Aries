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
import {
  type SupplierColumnOption,
  SupplierPriceListBrandMatrixEditor,
} from './SupplierPriceListBrandMatrixEditor'
import { SupplierPriceListMatrixOverlay } from './SupplierPriceListMatrixOverlay'
import './supplier-price-list.css'

const EMPTY_SUPPLIERS: SupplierOption[] = []

interface AddBrandFormValues {
  brandName?: string
  supplierId?: EntityId
}

/**
 * 供应商品牌价格表维护页（R2 + 轴向变更：**品牌标签页 + 供应商列**）。
 *
 * <p>顶部是**品牌标签页**（已有价格表的品牌 + 「新增品牌价格表」入口，新建时选品牌名与供应商），
 * 标签页下方是矩阵：左侧固定只读列 `类别/材质/规格(直径)/长度`（来自
 * `GET /supplier-price-lists/spec-catalog`），右侧每个供应商一列，列内只填该供应商对该品牌的
 * 单价。**没有版本**：一个（供应商 + 品牌）只有一张表，用更新时间展示。</p>
 *
 * <p>固定标识见设计契约 4.1：权限资源与菜单 code = `supplier-price-lists`，
 * 路由 `/master-data/supplier-price-lists`。</p>
 */
export function SupplierPriceListPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<AddBrandFormValues>()
  const [activeBrand, setActiveBrand] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(false)

  const supplierOptionsQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,
    queryFn: fetchSupplierOptions,
    staleTime: STALE_MASTER_OPTIONS,
  })
  const supplierOptions = supplierOptionsQuery.data ?? EMPTY_SUPPLIERS

  // 全量（品牌跨供应商）：标签页与「已有价格表的品牌」都从这里派生
  const listsQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceLists({ page: 1, size: 200 }),
    queryFn: ({ signal }) => fetchAllSupplierPriceLists({}, signal),
    staleTime: STALE_REALTIME,
  })
  const lists = useMemo(() => listsQuery.data ?? [], [listsQuery.data])

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['supplier-price-lists'] })
  }, [queryClient])

  /** 标签页 = 已有价格表的品牌（按品牌名排序），标签上带该品牌的供应商数。 */
  const tabs = useMemo(() => {
    const supplierIdsByBrand = new Map<string, Set<EntityId>>()
    for (const list of lists) {
      const brand = list.brandName.trim()
      if (!brand) {
        continue
      }
      const bucket = supplierIdsByBrand.get(brand) ?? new Set<EntityId>()
      bucket.add(list.supplierId)
      supplierIdsByBrand.set(brand, bucket)
    }
    return [...supplierIdsByBrand.entries()]
      .map(([brandName, supplierIds]) => ({
        brandName,
        supplierCount: supplierIds.size,
      }))
      .sort((left, right) =>
        left.brandName.localeCompare(right.brandName, 'zh-Hans-CN'),
      )
  }, [lists])

  /**
   * 当前品牌视图里默认出现的供应商列。
   *
   * <p>只取「经营品牌包含该品牌」（`md_supplier_brand`，经供应商选项接口带出的 `brands`）
   * 且尚无该品牌价格表的供应商：把所有供应商都当列会得到几十个空列。其余供应商仍可用
   * 「添加供应商列」手工加入，或直接粘贴整块数据。</p>
   */
  const supplierColumns = useMemo<SupplierColumnOption[]>(() => {
    const brand = (activeBrand ?? '').trim()
    const existing = new Set(
      lists
        .filter((list) => list.brandName.trim() === brand)
        .map((list) => list.supplierId),
    )
    return supplierOptions
      .filter(
        (option) =>
          !existing.has(option.id) &&
          (option.brands ?? []).some((value) => value.trim() === brand),
      )
      .map((option) => ({
        supplierId: option.id,
        supplierName: option.label,
      }))
  }, [supplierOptions, lists, activeBrand])

  /** 新增品牌价格表：品牌名 + 供应商（真正的建表发生在该列第一次填价时）。 */
  const handleAddBrand = async () => {
    let values: AddBrandFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    const brand = (values.brandName ?? '').trim()
    if (!brand) {
      return
    }
    setActiveBrand(brand)
    setAddOpen(false)
    form.resetFields()
  }

  const brandOptions = useMemo(() => {
    const names = new Set<string>()
    for (const list of lists) {
      const brand = list.brandName.trim()
      if (brand) {
        names.add(brand)
      }
    }
    for (const option of supplierOptions) {
      for (const brand of option.brands ?? []) {
        if (brand.trim()) {
          names.add(brand.trim())
        }
      }
    }
    return [...names].map((brand) => ({ value: brand, label: brand }))
  }, [lists, supplierOptions])

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
                activeKey={activeBrand ?? tabs[0]?.brandName}
                aria-label={t('supplierPriceList.tabs.label')}
                onChange={(key) => setActiveBrand(key)}
                items={tabs.map((tab) => ({
                  key: tab.brandName,
                  label: (
                    <span className="supplier-price-list-tab-label">
                      <span>{tab.brandName}</span>
                      <Tag>
                        {t('supplierPriceList.tabs.supplierCount', {
                          count: tab.supplierCount,
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

          {activeBrand ? (
            <SupplierPriceListBrandMatrixEditor
              key={activeBrand}
              brandName={activeBrand}
              supplierColumns={supplierColumns}
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

          {listsQuery.isLoading && !activeBrand ? (
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
          onOk={() => void handleAddBrand()}
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
            <Form.Item
              name="brandName"
              label={t('supplierPriceList.header.brand')}
              rules={[
                {
                  required: true,
                  message: t('supplierPriceList.header.brandRequired'),
                },
              ]}
            >
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                placeholder={t('supplierPriceList.tabs.brandHint')}
                options={brandOptions}
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
