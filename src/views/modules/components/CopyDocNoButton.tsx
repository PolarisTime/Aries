import { CopyOutlined } from '@ant-design/icons'
import { Button, type ButtonProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useCopyDocNo } from '@/module-system/record/use-module-record-clipboard'

interface Props {
  /** 待复制的单号（config.primaryNoKey 对应字段值）。 */
  docNo: string
  /** 按钮文案，默认「复制单号」。 */
  label?: string
  size?: ButtonProps['size']
  className?: string
}

/**
 * 单据单号复制按钮。
 *
 * <p>单号为空/空白时整体不渲染（不提供把雪花 id 当单号复制的入口）。</p>
 */
export function CopyDocNoButton({ docNo, label, size, className }: Props) {
  const { t } = useTranslation()
  const copyDocNo = useCopyDocNo()
  const normalizedDocNo = String(docNo ?? '').trim()
  if (!normalizedDocNo) return null

  const resolvedLabel = label ?? t('hooks.recordActions.copyDocNo')
  return (
    <Button
      type="text"
      size={size}
      className={className}
      icon={<CopyOutlined />}
      title={resolvedLabel}
      aria-label={`${resolvedLabel} ${normalizedDocNo}`}
      onClick={() => copyDocNo(normalizedDocNo)}
    >
      {resolvedLabel}
    </Button>
  )
}
