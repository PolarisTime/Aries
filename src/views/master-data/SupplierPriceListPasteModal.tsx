import { Alert, Button, Input, Modal, Radio, Select, Space } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { modal } from '@/utils/antd-app'
import {
  applyMatrixPaste,
  type BlockPastePreview,
  describePriceColumn,
  type MatrixPasteResult,
  type PriceMatrixState,
  previewBlockPaste,
} from './supplier-price-list-editor-model'

interface Props {
  /** 视图所属品牌 */
  brandName: string
  state: PriceMatrixState
  onCancel: () => void
  /** 单列粘贴：把计算好的结果交回调用方落状态 */
  onApply: (result: MatrixPasteResult) => void
  /** 整块粘贴：调用方按列写入各（供应商, 品牌）价格表 */
  onApplyBlock: (text: string) => void
}

const MAX_VISIBLE_ERRORS = 50
type PasteMode = 'COLUMN' | 'BLOCK'

/**
 * TSV 粘贴导入（从 Excel 复制）。
 *
 * <p>两种模式，**都必须能唯一确定目标价格表**：</p>
 * - **单列**：选定一个供应商列，粘贴 `材质 / 规格 / 长度 / 单价`（或带类别 5 列）；
 * - **整块**：粘贴 `供应商 / 材质 / 规格 / 长度 / 单价`，按供应商名拆列，逐列落到各自的
 *   （供应商, 品牌）价格表；识别不到的供应商名单独提示，**不猜着写入**。
 *
 * <p>解析容错但**不写脏数据**：列数不足、规格非正整数、单价格式错误、无法对齐固定行的行
 * 逐行报错并跳过。单元格留空 = 不报价（绝不写 0）；若粘贴会清掉已有报价，先二次确认。</p>
 */
export function SupplierPriceListPasteModal({
  brandName,
  state,
  onCancel,
  onApply,
  onApplyBlock,
}: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<PasteMode>('COLUMN')
  const [text, setText] = useState('')
  const [supplierId, setSupplierId] = useState<string>(
    state.columnOrder[0] ?? '',
  )
  const [parsed, setParsed] = useState<MatrixPasteResult | null>(null)
  const [blockPreview, setBlockPreview] = useState<BlockPastePreview | null>(
    null,
  )

  const columnOptions = useMemo(
    () =>
      state.columnOrder.map((id) => ({
        value: id,
        label: state.columns[id]
          ? describePriceColumn(state.columns[id])
          : `#${id}`,
      })),
    [state.columnOrder, state.columns],
  )

  const targetLabel =
    columnOptions.find((option) => option.value === supplierId)?.label ??
    supplierId

  const reset = () => {
    setParsed(null)
    setBlockPreview(null)
  }

  const handleParse = () => {
    if (mode === 'COLUMN') {
      setBlockPreview(null)
      setParsed(applyMatrixPaste(state, supplierId, text))
      return
    }
    setParsed(null)
    setBlockPreview(previewBlockPaste(state, text))
  }

  const handleApply = () => {
    if (mode === 'BLOCK') {
      const result = previewBlockPaste(state, text)
      if (result.clearedCount > 0) {
        modal.confirm({
          title: t('supplierPriceList.paste.clearConfirmTitle'),
          content: t('supplierPriceList.paste.clearConfirmContent', {
            count: result.clearedCount,
          }),
          okText: t('common.ok'),
          cancelText: t('common.cancel'),
          okButtonProps: { danger: true },
          onOk: () => onApplyBlock(text),
        })
        return
      }
      onApplyBlock(text)
      return
    }
    if (!parsed) {
      return
    }
    if (parsed.clearedCount > 0) {
      modal.confirm({
        title: t('supplierPriceList.paste.clearConfirmTitle'),
        content: t('supplierPriceList.paste.clearConfirmContent', {
          count: parsed.clearedCount,
        }),
        okText: t('common.ok'),
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: () => onApply(parsed),
      })
      return
    }
    onApply(parsed)
  }

  const visibleErrors = useMemo(
    () => (parsed ? parsed.errors.slice(0, MAX_VISIBLE_ERRORS) : []),
    [parsed],
  )

  return (
    <Modal
      open
      title={t('supplierPriceList.paste.title', { brand: brandName })}
      width={760}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="parse"
          disabled={!text.trim() || (mode === 'COLUMN' && !supplierId.trim())}
          onClick={handleParse}
        >
          {t('supplierPriceList.paste.parse')}
        </Button>,
        <Button
          key="apply"
          type="primary"
          disabled={
            mode === 'COLUMN'
              ? !parsed || parsed.appliedCount === 0
              : !blockPreview || blockPreview.appliedCount === 0
          }
          onClick={handleApply}
        >
          {t('supplierPriceList.paste.apply')}
        </Button>,
      ]}
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Radio.Group
          aria-label={t('supplierPriceList.paste.modeLabel')}
          optionType="button"
          buttonStyle="solid"
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as PasteMode)
            reset()
          }}
          options={[
            { value: 'COLUMN', label: t('supplierPriceList.paste.modeColumn') },
            { value: 'BLOCK', label: t('supplierPriceList.paste.modeBlock') },
          ]}
        />
        {mode === 'COLUMN' ? (
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: '100%' }}
            aria-label={t('supplierPriceList.paste.targetLabel')}
            placeholder={t('supplierPriceList.paste.targetLabel')}
            value={supplierId || undefined}
            onChange={(value) => {
              setSupplierId(value)
              reset()
            }}
            options={columnOptions}
          />
        ) : null}
        <Alert
          type="info"
          showIcon
          title={
            mode === 'COLUMN'
              ? t('supplierPriceList.paste.hintTitleColumn', {
                  brand: brandName,
                  supplier: targetLabel,
                })
              : t('supplierPriceList.paste.hintTitleBlock', {
                  brand: brandName,
                })
          }
          description={
            mode === 'COLUMN'
              ? t('supplierPriceList.paste.hintDetail')
              : t('supplierPriceList.paste.hintDetailBlock')
          }
        />
        <Input.TextArea
          aria-label={t('supplierPriceList.paste.textareaLabel')}
          rows={8}
          value={text}
          placeholder={
            mode === 'COLUMN'
              ? t('supplierPriceList.paste.placeholder')
              : t('supplierPriceList.paste.placeholderBlock')
          }
          onChange={(event) => {
            setText(event.target.value)
            reset()
          }}
        />
        {mode === 'COLUMN' && parsed ? (
          <div aria-live="polite">
            <div className="supplier-price-list-editor-summary">
              <span>
                {t('supplierPriceList.paste.applied', {
                  count: parsed.appliedCount,
                })}
              </span>
              <span>
                {t('supplierPriceList.paste.errorCount', {
                  count: parsed.errors.length,
                })}
              </span>
              {parsed.clearedCount > 0 ? (
                <span>
                  {t('supplierPriceList.paste.cleared', {
                    count: parsed.clearedCount,
                  })}
                </span>
              ) : null}
            </div>
            {parsed.errors.length ? (
              <ul className="supplier-price-row-error">
                {visibleErrors.map((error) => (
                  <li key={`${error.line}-${error.message}`}>
                    {t('supplierPriceList.paste.errorLine', {
                      line: error.line,
                      message: error.message,
                    })}
                  </li>
                ))}
                {parsed.errors.length > MAX_VISIBLE_ERRORS ? (
                  <li>
                    {t('supplierPriceList.paste.moreErrors', {
                      count: parsed.errors.length - MAX_VISIBLE_ERRORS,
                    })}
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        ) : null}
        {mode === 'BLOCK' && blockPreview ? (
          <div aria-live="polite">
            <div className="supplier-price-list-editor-summary">
              <span>
                {t('supplierPriceList.paste.blockApplied', {
                  count: blockPreview.appliedCount,
                })}
              </span>
              <span>
                {t('supplierPriceList.paste.blockColumns', {
                  count: blockPreview.columns.length,
                })}
              </span>
              <span>
                {t('supplierPriceList.paste.errorCount', {
                  count: blockPreview.errorCount,
                })}
              </span>
            </div>
            {blockPreview.unknownSupplierNames.length ? (
              <p className="supplier-price-row-error">
                {t('supplierPriceList.paste.blockSkipped', {
                  names: blockPreview.unknownSupplierNames.join('、'),
                })}
              </p>
            ) : null}
          </div>
        ) : null}
      </Space>
    </Modal>
  )
}
