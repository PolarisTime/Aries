import { Form, Input, Modal } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * 批次名称长度上限 —— 与后端 `QuoteSheetRequest.name` 的 `@Size(max = 64)` 同口径。
 *
 * <p>前端先按同一上限拦截，避免用户输入 65 个字符后才在保存时收到 422；
 * 后端校验仍是最终防线，这里只负责即时反馈。</p>
 */
export const BATCH_NAME_MAX_LENGTH = 64

export interface RenameBatchModalProps {
  open: boolean
  /** 当前批次名称，打开时作为初始值 */
  currentName: string
  onCancel: () => void
  /** 已 trim 且通过校验的新名称 */
  onSubmit: (name: string) => void
}

/**
 * 「重命名批次」弹层。
 *
 * <p>为什么不用 `modal.confirm` 带一个 Input：那种写法拿不到受控值，校验态也没处渲染。
 * 单独成组件后，空值 / 超长 / 未变化三种情况都能即时反馈，且可直接被测试覆盖。</p>
 *
 * <p>校验口径与后端对齐：`@NotBlank` → trim 后不可为空；`@Size(max = 64)` → 长度上限。
 * 额外拦「与原名相同」：提交一次无变化的改名只会白跑一次保存请求。</p>
 */
export function RenameBatchModal({
  open,
  currentName,
  onCancel,
  onSubmit,
}: RenameBatchModalProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(currentName)

  // 每次打开都把输入框重置为当前名称：关闭后残留上一次编辑会让用户误以为已生效
  useEffect(() => {
    if (open) {
      setValue(currentName)
    }
  }, [open, currentName])

  const trimmed = value.trim()
  const error = !trimmed
    ? t('priceCompare.picker.renameEmpty')
    : trimmed.length > BATCH_NAME_MAX_LENGTH
      ? t('priceCompare.picker.renameTooLong', {
          max: BATCH_NAME_MAX_LENGTH,
        })
      : null
  const unchanged = !error && trimmed === currentName.trim()

  const submit = () => {
    if (error || unchanged) {
      return
    }
    onSubmit(trimmed)
  }

  return (
    <Modal
      open={open}
      title={t('priceCompare.picker.renameTitle')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: Boolean(error) || unchanged }}
      onOk={submit}
      onCancel={onCancel}
      destroyOnHidden
    >
      {/* label 方向全站统一 vertical（见 AGENTS.md 排版规范） */}
      <Form layout="vertical">
        <Form.Item
          label={t('priceCompare.picker.renameLabel')}
          validateStatus={error && value.length > 0 ? 'error' : undefined}
          help={error && value.length > 0 ? error : undefined}
        >
          <Input
            id="price-compare-batch-name"
            /* antd 把 Form.Item 的 label 关联到控件时依赖 id；显式给 id 便于测试按字段名定位 */
            aria-label={t('priceCompare.picker.renameLabel')}
            autoFocus
            maxLength={BATCH_NAME_MAX_LENGTH}
            placeholder={t('priceCompare.picker.renamePlaceholder')}
            showCount
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onPressEnter={submit}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
