import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchPurchaseOrderTonnages,
  type PurchaseOrderTonnageRecord,
} from '@/api/market/quote-sheets'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import { formatWeight } from '@/utils/formatters'
import {
  matchesPickerVariety,
  type PickerVarietyTarget,
  remainingLinkableTon,
} from './purchase-order-picker-tonnage'

interface Props {
  open: boolean
  /** 当前已关联明细行 id(用于高亮与清除)。 */
  selectedItemId?: string
  /**
   * 当前行已关联的全部明细行 id: 打开弹窗时回填勾选态(多选叠加)。
   * <p>不传时勾选态为空, 行为与旧的单选路径完全一致。</p>
   */
  selectedItemIds?: string[]
  /** 排除的报价单标识(编辑当前单据时排除自身已保存吨位), 可为空。 */
  excludeSheetId?: string
  /**
   * 本单据内各订单明细行已关联的报单吨位合计(含未保存手填值)。
   * <p>服务端 remainingWeight 已排除本单据, 因此"本单还能不能再用这一行"必须再减去它,
   * 否则已被本单吃满的行仍会被当成可选项。</p>
   */
  linkedTonByItemId?: Map<string, number>
  /**
   * 当前报价行的材质/规格/长度: 弹窗默认只列与之一致的订单明细行(自动筛选), 避免用户
   * 关联到别的规格(实测踩过: HRB400E 20 9米 的行关联到了 HRB400E 16 9米 的明细行)。
   */
  matchVariety?: PickerVarietyTarget
  /** 选中明细行(undefined 表示清除关联); 选择后由调用方关闭弹窗。 */
  onSelect: (record: PurchaseOrderTonnageRecord | undefined) => void
  /**
   * 确认勾选的多张明细行(按勾选顺序, 只含当前可见的行); 由调用方关闭弹窗。
   * <p>不传时「确认」按钮只禁用不派发(保持既有单选调用方零改动)。</p>
   */
  onConfirmLinks?: (records: PurchaseOrderTonnageRecord[]) => void
  onClose: () => void
}

/** 关键字防抖时长: 避免每次输入都打后端。 */
const SEARCH_DEBOUNCE_MS = 300

/**
 * 采购订单明细行选择弹窗: **服务端**按关键字(单号/供应商/规格)过滤并展示订货/已开/剩余吨位。
 * <p>搜索下沉到后端, 避免固定条数截断导致匹配行落在窗口外搜不到。</p>
 */
export function PurchaseOrderPickerModal({
  open,
  selectedItemId,
  selectedItemIds,
  excludeSheetId,
  matchVariety,
  linkedTonByItemId,
  onSelect,
  onConfirmLinks,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  /** 是否显示"剩余可关联吨位已用尽"的行: 默认隐藏, 仅本弹窗内状态, 不回传后端。 */
  const [showFullyLinked, setShowFullyLinked] = useState(false)
  /** 是否显示"材质/规格/长度不一致"的行: 默认隐藏(自动筛选), 需要借用别的规格时可打开。 */
  const [showOtherVarieties, setShowOtherVarieties] = useState(false)
  /** 勾选的明细行 id: 数组保序, 顺序即"确认"后的关联顺序。 */
  const [checkedItemIds, setCheckedItemIds] = useState<string[]>([])

  /*
   * 打开时用当前行已关联的明细行回填勾选态。
   *
   * <p>只在 `open` 由假变真那一次回填: 打开期间行数据改动(自动保存/他人编辑)会换掉
   * `selectedItemIds` 的引用, 若按引用联动就会把用户刚勾上的选择冲掉。ref 承接最新值,
   * 保证回填的始终是打开那一刻的关联集合。</p>
   */
  const selectedItemIdsRef = useRef(selectedItemIds ?? [])
  useEffect(() => {
    selectedItemIdsRef.current = selectedItemIds ?? []
  }, [selectedItemIds])
  useEffect(() => {
    if (!open) return
    setCheckedItemIds(selectedItemIdsRef.current)
  }, [open])

  const toggleChecked = (itemId: string, checked: boolean) => {
    setCheckedItemIds((prev) => {
      if (!checked) return prev.filter((id) => id !== itemId)
      // 保序去重: 重复勾选同一行不改变首次勾选的位置(关联顺序稳定)
      return prev.includes(itemId) ? prev : [...prev, itemId]
    })
  }

  // 关键字防抖: 避免每次输入都打后端。
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedKeyword(keyword.trim()),
      SEARCH_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [keyword])

  const { data = [], isFetching } = useQuery({
    queryKey: [
      ...QUERY_KEYS.priceCompare.purchaseOrderTonnages,
      'picker',
      debouncedKeyword,
      excludeSheetId ?? '',
    ],
    queryFn: ({ signal }) =>
      fetchPurchaseOrderTonnages(
        {
          ...(debouncedKeyword ? { keyword: debouncedKeyword } : {}),
          ...(excludeSheetId ? { excludeSheetId } : {}),
        },
        signal,
      ),
    enabled: open,
    staleTime: STALE_REALTIME,
    retry: 1,
  })

  /*
   * 已关联的明细行 id 集合(多选时是全部关联行, 旧调用方只给单选那一列)。
   * 这些行必须始终保留在可见集合里: 它们默认已勾选, 一旦被"已关联完"/自动筛选藏起来,
   * 用户点「确认」就会在毫不知情的情况下把这条隐藏的关联丢掉。
   */
  const preselectedIds = useMemo(() => {
    const ids = new Set(selectedItemIds ?? [])
    // 兼容旧调用方: 只给单选那一列时, 那一行同样不能因为"已关联完"被藏起来
    if (selectedItemId !== undefined) ids.add(selectedItemId)
    return ids
  }, [selectedItemIds, selectedItemId])

  /*
   * 剩余可关联吨位 <= 0 的行默认隐藏: 这些行已无额度可选, 留在列表里只会稀释搜索结果。
   * 开关只改本弹窗的可见集合, 不改查询参数; 当前已关联行始终保留, 避免用户以为关联丢了。
   */
  const { visibleData, fullyLinkedCount, varietyMismatchCount } =
    useMemo(() => {
      let hiddenCount = 0
      let mismatchCount = 0
      const rows: PurchaseOrderTonnageRecord[] = []
      for (const record of data) {
        const preselected = preselectedIds.has(record.purchaseOrderItemId)
        const fullyLinked =
          remainingLinkableTon(record, linkedTonByItemId) <= 0 && !preselected
        if (fullyLinked) hiddenCount += 1
        if (fullyLinked && !showFullyLinked) continue
        /*
         * 自动筛选: 只列与当前行材质/规格/长度一致的明细行。当前已关联行始终保留
         * (否则用户会以为关联被清掉了), 不一致的行由开关放行。
         */
        const varietyMismatch =
          !preselected && !matchesPickerVariety(record, matchVariety)
        if (varietyMismatch) mismatchCount += 1
        if (varietyMismatch && !showOtherVarieties) continue
        rows.push(record)
      }
      return {
        visibleData: rows,
        fullyLinkedCount: hiddenCount,
        varietyMismatchCount: mismatchCount,
      }
    }, [
      data,
      linkedTonByItemId,
      preselectedIds,
      showFullyLinked,
      showOtherVarieties,
      matchVariety,
    ])

  /*
   * 已勾选且当前可见的记录(按勾选顺序)。被开关藏起来的勾选行不算数: 确认后写回的就是
   * 用户眼前能核对的那几条, 不把不可见的行也一并写进去。
   */
  const checkedRecords = useMemo(
    () =>
      checkedItemIds
        .map((itemId) =>
          visibleData.find((record) => record.purchaseOrderItemId === itemId),
        )
        .filter(
          (record): record is PurchaseOrderTonnageRecord =>
            record !== undefined,
        ),
    [checkedItemIds, visibleData],
  )

  const columns: ColumnsType<PurchaseOrderTonnageRecord> = [
    {
      // 多选列: 勾选多行后走工具栏「确认（n）」按勾选顺序一次关联多张明细行。
      // 点击/按键必须阻止冒泡, 否则会触发行的"点一行=选一张"路径并直接关闭弹窗。
      key: 'choose',
      title: t('priceCompare.sheet.purchaseOrderPickerChoose'),
      width: 56,
      align: 'center',
      render: (_value, record) => {
        const checked = checkedItemIds.includes(record.purchaseOrderItemId)
        // 与"点行选中"同一口径: 剩余可关联吨位为 0 的行可见但不可勾选, 已勾选的行仍可取消
        const selectable =
          checked || remainingLinkableTon(record, linkedTonByItemId) > 0
        return (
          <span
            className="price-compare-purchase-order-picker-check"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Checkbox
              aria-label={record.orderNo}
              checked={checked}
              disabled={!selectable}
              onChange={(event) =>
                toggleChecked(record.purchaseOrderItemId, event.target.checked)
              }
            />
          </span>
        )
      },
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderNo'),
      dataIndex: 'orderNo',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderSupplier'),
      dataIndex: 'supplierName',
      width: 120,
      ellipsis: true,
    },
    {
      title: t('priceCompare.sheet.columns.variety'),
      key: 'variety',
      width: 240,
      render: (_value, record) => {
        const fullyLinked = remainingLinkableTon(record, linkedTonByItemId) <= 0
        const linkedHere =
          linkedTonByItemId?.get(record.purchaseOrderItemId) ?? 0
        return (
          // 同一「材质/规格/长度」可能对应多个品牌的多张订单: 品牌按行展示并作为标签,
          // 用户按行就能区分, 不必再靠单号去猜品牌。
          <div className="price-compare-purchase-order-picker-variety">
            <span className="price-compare-purchase-order-picker-spec">
              {`${record.category} ${record.material} Φ${record.spec} ${record.length}`}
            </span>
            {record.brand ? (
              <Tag
                className="price-compare-purchase-order-picker-brand"
                variant="filled"
              >
                {record.brand}
              </Tag>
            ) : null}
            {fullyLinked ? (
              <Tooltip
                title={
                  linkedHere > 0
                    ? t(
                        'priceCompare.sheet.purchaseOrderPickerFullyLinkedMine',
                        { ton: formatWeight(linkedHere) },
                      )
                    : t('priceCompare.sheet.purchaseOrderPickerFullyLinkedHint')
                }
              >
                <Tag
                  className="price-compare-purchase-order-picker-brand-done"
                  color="warning"
                  variant="filled"
                >
                  {t('priceCompare.sheet.purchaseOrderPickerFullyLinkedTag')}
                </Tag>
              </Tooltip>
            ) : null}
          </div>
        )
      },
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderOrdered'),
      dataIndex: 'orderedWeight',
      width: 96,
      align: 'right',
      render: (value: number) => formatWeight(value),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderIssued'),
      dataIndex: 'issuedWeight',
      width: 96,
      align: 'right',
      render: (value: number) => formatWeight(value),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderRemaining'),
      dataIndex: 'remainingWeight',
      width: 96,
      align: 'right',
      render: (value: number) => (
        <Typography.Text type={value < 0 ? 'danger' : undefined}>
          {formatWeight(value)}
        </Typography.Text>
      ),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderStatus'),
      dataIndex: 'status',
      width: 88,
      align: 'center',
      render: (value: string) => <Tag>{value}</Tag>,
    },
  ]

  return (
    <Modal
      title={t('priceCompare.sheet.purchaseOrderPickerTitle')}
      open={open}
      width={920}
      destroyOnHidden
      footer={
        <div className="price-compare-purchase-order-picker-footer">
          <Tooltip title={t('priceCompare.sheet.purchaseOrderPickerClearHint')}>
            <Button
              danger
              disabled={!selectedItemId}
              onClick={() => onSelect(undefined)}
            >
              {t('priceCompare.sheet.purchaseOrderPickerClear')}
            </Button>
          </Tooltip>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      }
      onCancel={onClose}
      styles={{ body: { paddingTop: 'var(--space-xs)' } }}
    >
      <div className="price-compare-purchase-order-picker-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('priceCompare.sheet.purchaseOrderPickerSearch')}
          value={keyword}
          onChange={(event) => setKeyword(event.currentTarget.value)}
        />
        {/* 可见开关: 让"已关联完"的行可临时查看, 计数写明被隐藏了多少条, 避免数据像是丢了 */}
        <Checkbox
          checked={showFullyLinked}
          className="price-compare-purchase-order-picker-toggle"
          onChange={(event) => setShowFullyLinked(event.target.checked)}
        >
          {t('priceCompare.sheet.purchaseOrderPickerShowFullyLinked', {
            count: fullyLinkedCount,
          })}
        </Checkbox>
        {/* 自动筛选的兜底出口: 默认只列同材质/规格/长度的行, 确需借用别的规格时在这里放行 */}
        <Checkbox
          checked={showOtherVarieties}
          className="price-compare-purchase-order-picker-toggle"
          onChange={(event) => setShowOtherVarieties(event.target.checked)}
        >
          {t('priceCompare.sheet.purchaseOrderPickerShowOtherVarieties', {
            count: varietyMismatchCount,
          })}
        </Checkbox>
        {/* 多选出口: 0 张禁用, 不派发空的确认(清除关联有独立的按钮) */}
        <Button
          className="price-compare-purchase-order-picker-confirm"
          disabled={checkedRecords.length === 0}
          type="primary"
          onClick={() => onConfirmLinks?.(checkedRecords)}
        >
          {t('priceCompare.sheet.purchaseOrderPickerConfirm', {
            count: checkedRecords.length,
          })}
        </Button>
      </div>
      <Table<PurchaseOrderTonnageRecord>
        columns={columns}
        dataSource={visibleData}
        rowKey="purchaseOrderItemId"
        loading={isFetching}
        size="small"
        pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
        scroll={{ y: 320 }}
        locale={{
          emptyText: (
            <Empty
              description={t(
                // 有命中行但被"已关联完"过滤掉时, 不能只说"暂无采购订单", 否则像是数据丢了
                fullyLinkedCount > 0
                  ? 'priceCompare.sheet.purchaseOrderPickerEmptyAllFullyLinked'
                  : varietyMismatchCount > 0
                    ? 'priceCompare.sheet.purchaseOrderPickerEmptyVariety'
                    : 'priceCompare.sheet.purchaseOrderPickerEmpty',
              )}
            />
          ),
        }}
        onRow={(record) => {
          const isSelected = record.purchaseOrderItemId === selectedItemId
          // 已关联完(剩余 <= 0)的行可见但不可选: 再关联只会超开, 由后端扣减口径兜底也没意义。
          const selectable =
            remainingLinkableTon(record, linkedTonByItemId) > 0 || isSelected
          return {
            'aria-selected': isSelected,
            'aria-disabled': selectable ? undefined : true,
            className: selectable
              ? 'price-compare-purchase-order-picker-row'
              : 'price-compare-purchase-order-picker-row price-compare-purchase-order-picker-row--disabled',
            onClick: selectable ? () => onSelect(record) : undefined,
            onKeyDown: selectable
              ? (event: React.KeyboardEvent<HTMLElement>) => {
                  // 行可聚焦: 键盘用户 Tab 到行后按 Enter/Space 选中
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(record)
                  }
                }
              : undefined,
            tabIndex: selectable ? 0 : -1,
            style: {
              cursor: selectable ? 'pointer' : 'not-allowed',
              background: isSelected
                ? 'var(--ant-color-primary-bg, #e6f4ff)'
                : undefined,
            },
          }
        }}
      />
      <Typography.Text
        type="secondary"
        style={{ fontSize: 'var(--font-size-xs)' }}
      >
        {t('priceCompare.sheet.purchaseOrderPickerHint')}
      </Typography.Text>
    </Modal>
  )
}
