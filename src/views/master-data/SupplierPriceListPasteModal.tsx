import { Alert, Button, Input, Modal, Space } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { modal } from '@/utils/antd-app'
import {
  applyTsvPaste,
  type PriceDraftRow,
  type TsvPasteResult,
} from './supplier-price-list-editor-model'

interface Props {
  rows: PriceDraftRow[]
  /** 从网格直接粘贴时带入的原始文本 */
  initialText?: string
  onCancel: () => void
  onApply: (rows: PriceDraftRow[], result: TsvPasteResult) => void
}

const MAX_VISIBLE_ERRORS = 50

/**
 * TSV 粘贴导入（从 Excel 复制）。
 *
 * <p>解析容错但**不写脏数据**：列数不足、规格非正整数、单价格式错误、无法对齐固定行的行
 * 逐行报错并跳过。单元格留空 = 不报价（绝不写 0）；若粘贴会清掉已有报价，先二次确认。</p>
 *
 * <p>调用方按需挂载（`{open ? <Modal/> : null}`），初始文本直接作为 state 初值。</p>
 */
export function SupplierPriceListPasteModal({
  rows,
  initialText = '',
  onCancel,
  onApply,
}: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState(initialText)
  const [parsed, setParsed] = useState<TsvPasteResult | null>(null)

  const visibleErrors = useMemo(
    () => (parsed ? parsed.errors.slice(0, MAX_VISIBLE_ERRORS) : []),
    [parsed],
  )

  const handleApply = () => {
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
        onOk: () => onApply(parsed.rows, parsed),
      })
      return
    }
    onApply(parsed.rows, parsed)
  }

  return (
    <Modal
      open
      title={t('supplierPriceList.paste.title')}
      width={720}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="parse"
          disabled={!text.trim()}
          onClick={() => setParsed(applyTsvPaste(rows, text))}
        >
          {t('supplierPriceList.paste.parse')}
        </Button>,
        <Button
          key="apply"
          type="primary"
          disabled={!parsed || parsed.appliedCount === 0}
          onClick={handleApply}
        >
          {t('supplierPriceList.paste.apply')}
        </Button>,
      ]}
    >
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          title={t('supplierPriceList.paste.hintTitle')}
          description={t('supplierPriceList.paste.hintDetail')}
        />
        <Input.TextArea
          aria-label={t('supplierPriceList.paste.textareaLabel')}
          rows={8}
          value={text}
          placeholder={t('supplierPriceList.paste.placeholder')}
          onChange={(event) => {
            setText(event.target.value)
            setParsed(null)
          }}
        />
        {parsed ? (
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
      </Space>
    </Modal>
  )
}
