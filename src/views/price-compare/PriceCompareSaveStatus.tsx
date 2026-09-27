import {
  CheckCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  WarningFilled,
} from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SheetSaveStatus } from './useSheetsStore'

/** 非 idle 的保存状态。 */
type VisibleSaveStatus = Exclude<SheetSaveStatus, 'idle'>

interface StatusPresentation {
  icon: ReactNode
  label: string
  hint?: string
  retryable?: boolean
}

/**
 * 批次保存状态指示灯。
 * <p>此前编辑只在失败时弹一次 toast, 用户无法判断"当前改动到底落库没有",
 * 关闭标签页也没有任何拦截; 这里把保存结论常驻在标题栏, 失败时直接给出重试入口。</p>
 */
export function PriceCompareSaveStatus({
  status,
  onRetry,
}: {
  status: SheetSaveStatus
  onRetry: () => void
}) {
  const { t } = useTranslation()
  if (status === 'idle') return null

  const presentations: Record<VisibleSaveStatus, StatusPresentation> = {
    dirty: {
      icon: <ClockCircleOutlined />,
      label: t('priceCompare.saveStatus.dirty'),
      hint: t('priceCompare.saveStatus.dirtyHint'),
    },
    saving: {
      icon: <LoadingOutlined spin />,
      label: t('priceCompare.saveStatus.saving'),
    },
    saved: {
      icon: <CheckCircleFilled />,
      label: t('priceCompare.saveStatus.saved'),
    },
    error: {
      icon: <ExclamationCircleFilled />,
      label: t('priceCompare.saveStatus.error'),
      hint: t('priceCompare.saveStatus.errorHint'),
      retryable: true,
    },
    conflict: {
      icon: <WarningFilled />,
      label: t('priceCompare.saveStatus.conflict'),
      hint: t('priceCompare.saveStatus.conflictHint'),
    },
  }
  const { icon, label, hint, retryable } = presentations[status]

  const content = (
    <span
      className={`price-compare-save-status price-compare-save-status-${status}`}
      role="status"
      aria-live="polite"
    >
      <span className="price-compare-save-status-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="price-compare-save-status-label">{label}</span>
      {retryable ? (
        <Button type="link" size="small" onClick={onRetry}>
          {t('priceCompare.saveStatus.retry')}
        </Button>
      ) : null}
    </span>
  )

  if (!hint) return content
  return <Tooltip title={hint}>{content}</Tooltip>
}
