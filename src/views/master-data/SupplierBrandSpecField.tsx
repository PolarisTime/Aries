import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Empty, Flex, Modal, Spin, Tag, Typography } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchSpecRows } from '@/api/market/supplier-price-lists'
import {
  fetchSupplierBrandSpecs,
  normalizeSupplierBrandSpecs,
  type SupplierBrandSpecItem,
  supplierBrandSpecKey,
} from '@/api/master/supplier-brand-specs'
import {
  DIALOG_LEVEL_2_WIDE_WIDTH,
  dialogLevelProps,
} from '@/components/dialog-levels'
import { TableTransfer, type TransferItem } from './MasterTableTransferField'
import type { MasterFormFieldRenderContext } from './master-data-types'
import {
  applyBrandSpecSelection,
  brandListOf,
  brandSpecOptionsOf,
  configuredBrandSpecCount,
  selectedBrandSpecKeys,
  supplierBrandSpecLabelOf,
} from './supplier-brand-spec-model'
import './supplier-brand-spec.css'

/**
 * 供应商资料里的「品牌规格配置」字段控件。
 *
 * <p>字段值 = 显式配置的条目数组（`SupplierBrandSpecItem[]`），语义见
 * `supplier-brand-spec-model`：某品牌没有条目 = 按商品资料全量。控件按经营品牌逐行展示
 * 「默认全量 / 已配置 N 项」并各开一个表格穿梭框去勾选。</p>
 *
 * <p><b>为什么字段值可能是 `undefined`</b>：编辑态下已保存的配置要另外拉一次接口，
 * 拉到之前不能假称"没有配置"—— 否则保存时用一个空数组整集替换，会把服务端配置悄悄清空。
 * 因此 `undefined` 表示"未知"，保存流程据此跳过 PUT（见 `supplier-page-spec` 的 `afterSave`）。</p>
 */

/** 穿梭框的一行：条目 + Transfer 需要的 key/title。 */
type BrandSpecOption = SupplierBrandSpecItem & TransferItem

interface Props {
  /** Form.Item 注入：显式配置的条目；`undefined` = 尚未读到服务端配置（未知）。 */
  value?: SupplierBrandSpecItem[]
  /** Form.Item 注入。 */
  onChange?: (value: SupplierBrandSpecItem[]) => void
  /** 当前表单里已选的经营品牌（配置范围只在这里面）。 */
  brands: string[]
  /** 编辑态才有：读取该供应商已保存的配置。 */
  recordId?: string
  label: string
  disabled?: boolean
}

/** 已保存配置的查询键：按供应商区分，读到的值在本次会话内视为新鲜（保存后由调用方刷新页面）。 */
const brandSpecsQueryKey = (recordId: string) =>
  ['supplier-brand-specs', recordId] as const

/** 商品资料的规格行：与报价表共用同一份缓存（同一个数据源）。 */
const specRowsQueryKey = ['supplier-price-specs'] as const

export function SupplierBrandSpecField({
  value,
  onChange,
  brands,
  recordId,
  label,
  disabled,
}: Props) {
  const { t } = useTranslation()
  const [configuringBrand, setConfiguringBrand] = useState<string | undefined>(
    undefined,
  )

  const configQuery = useQuery({
    queryKey: brandSpecsQueryKey(recordId ?? ''),
    queryFn: ({ signal }) => fetchSupplierBrandSpecs(recordId ?? '', signal),
    enabled: Boolean(recordId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  /*
   * 把读到的配置写回表单值：每个供应商只播种一次。
   *
   * 守卫「value !== undefined」是防止覆盖用户已改的内容（例如接口慢、用户先点了配置并确认）：
   * 此时表单值已经有明确含义，服务端值不能再盖回去。
   */
  const seededForRef = useRef<string | undefined>(undefined)
  const configData = configQuery.data
  useEffect(() => {
    if (!recordId || !configData || seededForRef.current === recordId) return
    seededForRef.current = recordId
    if (value !== undefined) return
    onChange?.(normalizeSupplierBrandSpecs(configData))
  }, [configData, onChange, recordId, value])

  const specsQuery = useQuery({
    queryKey: specRowsQueryKey,
    queryFn: ({ signal }) => fetchSpecRows(signal),
    // 只有打开弹窗时才需要商品资料全量（一份不小的分页数据）
    enabled: Boolean(configuringBrand),
    staleTime: Number.POSITIVE_INFINITY,
  })

  const options = useMemo(
    () =>
      configuringBrand
        ? brandSpecOptionsOf(specsQuery.data ?? [], configuringBrand)
        : [],
    [configuringBrand, specsQuery.data],
  )

  const configLoading = Boolean(recordId) && configQuery.isPending
  const configFailed = Boolean(recordId) && configQuery.isError
  const configureDisabled = Boolean(disabled) || configLoading || configFailed

  if (brands.length === 0) {
    return (
      <Typography.Text type="secondary">
        {t('modules.pages.supplier.brandSpecsEmpty')}
      </Typography.Text>
    )
  }

  return (
    <Flex
      aria-label={label}
      className="supplier-brand-spec"
      gap={8}
      role="group"
      vertical
    >
      {configFailed ? (
        <Flex align="center" gap={8} wrap>
          <Typography.Text type="danger">
            {t('modules.pages.supplier.brandSpecsLoadFailed')}
          </Typography.Text>
          <Button
            onClick={() => {
              seededForRef.current = undefined
              void configQuery.refetch()
            }}
          >
            {t('modules.pages.supplier.brandSpecsRetry')}
          </Button>
        </Flex>
      ) : null}

      {brands.map((brand) => {
        const configuredCount = configuredBrandSpecCount(value, brand)
        return (
          <Flex
            align="center"
            className="supplier-brand-spec-row"
            gap={8}
            key={brand}
          >
            <span className="supplier-brand-spec-name">{brand}</span>
            <span className="supplier-brand-spec-state">
              {configuredCount === null ? (
                <Tag>{t('modules.pages.supplier.brandSpecsDefaultFull')}</Tag>
              ) : (
                <Tag color="blue">
                  {t('modules.pages.supplier.brandSpecsConfigured', {
                    count: configuredCount,
                  })}
                </Tag>
              )}
            </span>
            <Button
              aria-label={t('modules.pages.supplier.brandSpecsConfigureA11y', {
                name: brand,
              })}
              disabled={configureDisabled}
              onClick={() => setConfiguringBrand(brand)}
            >
              {t('modules.pages.supplier.brandSpecsConfigure')}
            </Button>
          </Flex>
        )
      })}

      {configuringBrand ? (
        <BrandSpecDialog
          /* 每个品牌一个实例：切换品牌时把穿梭框的临时勾选一起重置 */
          key={configuringBrand}
          brand={configuringBrand}
          brandLabel={label}
          draft={value}
          loading={specsQuery.isPending}
          failed={specsQuery.isError}
          options={options}
          onCancel={() => setConfiguringBrand(undefined)}
          onConfirm={(keys) => {
            onChange?.(
              applyBrandSpecSelection(value, configuringBrand, options, keys),
            )
            setConfiguringBrand(undefined)
          }}
          onRetry={() => void specsQuery.refetch()}
        />
      ) : null}
    </Flex>
  )
}

interface DialogProps {
  brand: string
  brandLabel: string
  options: readonly SupplierBrandSpecItem[]
  draft: SupplierBrandSpecItem[] | undefined
  loading: boolean
  failed: boolean
  onCancel: () => void
  onRetry: () => void
  onConfirm: (keys: string[]) => void
}

/**
 * 单个品牌的规格穿梭框（二级弹窗）。
 *
 * <p>交互沿用经营品牌穿梭框（`MasterTableTransferField`）：左右两栏表格、整行点击、
 * 支持按「类别 · 材质 · 规格 · 定尺」文本搜索、确认后回写表单值。</p>
 */
function BrandSpecDialog({
  brand,
  brandLabel,
  options,
  draft,
  loading,
  failed,
  onCancel,
  onRetry,
  onConfirm,
}: DialogProps) {
  const { t } = useTranslation()
  /** 用户临时勾选；null = 还没动过，用「默认全量/已保存配置」作为初始值。 */
  const [picked, setPicked] = useState<string[] | null>(null)

  const items = useMemo<BrandSpecOption[]>(
    () =>
      options.map((option) => ({
        ...option,
        key: supplierBrandSpecKey(option),
        title: supplierBrandSpecLabelOf(option),
      })),
    [options],
  )
  const initialKeys = selectedBrandSpecKeys(draft, brand, options)
  const keys = picked ?? initialKeys

  const columns: TableColumnsType<BrandSpecOption> = [
    {
      dataIndex: 'category',
      title: t('modules.columns.category'),
      ellipsis: true,
    },
    {
      dataIndex: 'material',
      title: t('modules.columns.material'),
      ellipsis: true,
    },
    {
      dataIndex: 'spec',
      title: t('modules.columns.spec'),
      width: 72,
      align: 'right',
    },
    {
      dataIndex: 'length',
      title: t('modules.pages.supplier.brandSpecsColLength'),
      width: 84,
    },
  ]

  const confirmDisabled = loading || failed || keys.length === 0

  return (
    <Modal
      cancelText={t('common.cancel')}
      centered
      destroyOnHidden
      okButtonProps={{ disabled: confirmDisabled }}
      okText={t('common.confirm')}
      onCancel={onCancel}
      onOk={() => onConfirm(keys)}
      open
      title={t('modules.pages.supplier.brandSpecsDialogTitle', { name: brand })}
      width={DIALOG_LEVEL_2_WIDE_WIDTH}
      {...dialogLevelProps(2)}
    >
      <Flex className="supplier-brand-spec-dialog" gap={8} vertical>
        <Typography.Text type="secondary">
          {t('modules.pages.supplier.brandSpecsDialogHint')}
        </Typography.Text>
        {failed ? (
          <Flex align="center" gap={8} wrap>
            <Typography.Text type="danger">
              {t('modules.pages.supplier.brandSpecsCombosLoadFailed')}
            </Typography.Text>
            <Button onClick={onRetry}>
              {t('modules.pages.supplier.brandSpecsRetry')}
            </Button>
          </Flex>
        ) : loading ? (
          <Flex align="center" gap={8} justify="center">
            <Spin />
            <Typography.Text type="secondary">
              {t('modules.pages.supplier.brandSpecsLoading')}
            </Typography.Text>
          </Flex>
        ) : items.length === 0 ? (
          <Empty
            description={t('modules.pages.supplier.brandSpecsNoCombos', {
              name: brand,
            })}
          />
        ) : (
          <TableTransfer
            ariaLabel={t('modules.pages.supplier.brandSpecsTransferA11y', {
              name: brand,
              field: brandLabel,
            })}
            columns={columns}
            dataSource={items}
            scrollY={320}
            sectionHeight={420}
            value={keys}
            onChange={setPicked}
          />
        )}
        {!loading && !failed && keys.length === 0 ? (
          <Typography.Text type="danger">
            {t('modules.pages.supplier.brandSpecsEmptySelection')}
          </Typography.Text>
        ) : null}
      </Flex>
    </Modal>
  )
}

/**
 * 供 `MasterFormFieldSpec.render` 使用的适配器：把表单上下文翻译成控件 props。
 *
 * <p>放在这个模块里而不是 `supplier-page-spec.ts`：通用编辑器不认识供应商模块，
 * 而 spec 文件是纯声明（`.ts`，不写 JSX）。</p>
 */
export function renderSupplierBrandSpecField(
  context: MasterFormFieldRenderContext,
) {
  return (
    <SupplierBrandSpecField
      brands={brandListOf(context.values.brands)}
      disabled={context.disabled}
      label={context.label}
      recordId={context.record ? String(context.record.id) : undefined}
    />
  )
}
