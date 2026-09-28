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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchPurchaseOrderTonnages,
  type PurchaseOrderTonnageRecord,
} from '@/api/market/quote-sheets'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import { formatWeight } from '@/utils/formatters'

interface Props {
  open: boolean
  /** 当前已关联明细行 id(用于高亮与清除)。 */
  selectedItemId?: string
  /** 排除的报价单标识(编辑当前单据时排除自身已保存吨位), 可为空。 */
  excludeSheetId?: string
  /**
   * 本单据内各订单明细行已关联的报单吨位合计(含未保存手填值)。
   * <p>服务端 remainingWeight 已排除本单据, 因此"本单还能不能再用这一行"必须再减去它,
   * 否则已被本单吃满的行仍会被当成可选项。</p>
   */
  linkedTonByItemId?: Map<string, number>
  /** 选中明细行(undefined 表示清除关联); 选择后由调用方关闭弹窗。 */
  onSelect: (record: PurchaseOrderTonnageRecord | undefined) => void
  onClose: () => void
}

const SEARCH_DEBOUNCE_MS = 300

/**
 * 该明细行剩余可关联吨位(吨) = 服务端剩余吨位 - 本单据已关联吨位。
 *
 * <p>服务端 `remainingWeight` 在传入 excludeSheetId 时已排除本单据已保存吨位, 但本单据
 * 页面上手填(含未保存)的吨位不在服务端统计内, 因此这里再扣一次本单据的已关联合计。
 * 缺失/非法 remainingWeight 时回退到 `订货 - 已开`, 不用 0 兜底(0 会把行误判成已关联完)。</p>
 */
export function remainingLinkableTon(
  record: PurchaseOrderTonnageRecord,
  linkedTonByItemId?: Map<string, number>,
): number {
  const base = Number.isFinite(record.remainingWeight)
    ? record.remainingWeight
    : record.orderedWeight - record.issuedWeight
  const linkedHere = linkedTonByItemId?.get(record.purchaseOrderItemId) ?? 0
  return base - linkedHere
}

/**
 * 采购订单明细行选择弹窗: **服务端**按关键字(单号/供应商/规格)过滤并展示订货/已开/剩余吨位。
 * <p>搜索下沉到后端, 避免固定条数截断导致匹配行落在窗口外搜不到。</p>
 */
export function PurchaseOrderPickerModal({
  open,
  selectedItemId,
  excludeSheetId,
  linkedTonByItemId,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  /** 是否显示"剩余可关联吨位已用尽"的行: 默认隐藏, 仅本弹窗内状态, 不回传后端。 */
  const [showFullyLinked, setShowFullyLinked] = useState(false)

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
   * 剩余可关联吨位 <= 0 的行默认隐藏: 这些行已无额度可选, 留在列表里只会稀释搜索结果。
   * 开关只改本弹窗的可见集合, 不改查询参数; 当前已关联行始终保留, 避免用户以为关联丢了。
   */
  const { visibleData, fullyLinkedCount } = useMemo(() => {
    let hiddenCount = 0
    const rows: PurchaseOrderTonnageRecord[] = []
    for (const record of data) {
      const fullyLinked =
        remainingLinkableTon(record, linkedTonByItemId) <= 0 &&
        record.purchaseOrderItemId !== selectedItemId
      if (fullyLinked) hiddenCount += 1
      if (showFullyLinked || !fullyLinked) rows.push(record)
    }
    return { visibleData: rows, fullyLinkedCount: hiddenCount }
  }, [data, linkedTonByItemId, selectedItemId, showFullyLinked])

  const columns: ColumnsType<PurchaseOrderTonnageRecord> = [
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
