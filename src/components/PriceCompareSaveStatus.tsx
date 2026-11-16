import {
  CheckCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  WarningFilled,
} from '@ant-design/icons'
import { Button } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * 保存状态取值。
 *
 * <p>报单比价（`SheetSaveStatus`：idle/dirty/saving/saved/error/conflict）与供应商报价表
 * （按品牌汇总后的 saving > error > dirty > saved）共用这一份展示口径，组件本身不依赖任一页面的
 * store 类型，避免 `components/` 反向依赖 `views/`。</p>
 */
export type PriceCompareSaveStatusValue =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict'

interface StatusPresentation {
  icon?: ReactNode
  label: string
  hint?: string
  retryable?: boolean
}

interface Props {
  status: PriceCompareSaveStatusValue
  /** 失败时的重试入口；不传则不渲染重试按钮。 */
  onRetry?: () => void
  /**
   * 覆盖默认说明（例如供应商报价表的「失败品牌名单」）。
   *
   * <p>说明文字必须**可见**，不能只放在 Tooltip 里：读屏与低视力用户都要能直接读到
   * 「改动还在本地 / 可重试」这类结论。</p>
   */
  detail?: ReactNode
}

/**
 * 两个比价页共用的保存状态指示灯。
 *
 * <p>`role="status"` 容器**常驻**（idle 也不卸载），否则读屏只会听到首次出现的状态，
 * 后续保存中 → 已保存的变化没有 live region 承接。idle 时容器为空，视觉上不占位。</p>
 */
export function PriceCompareSaveStatus({ status, onRetry, detail }: Props) {
  const { t } = useTranslation()
  /*
   * idle 也输出文案（容器常驻）：locale key 由 task-18 统一补，这里直接按最终 key 名使用。
   */
  const presentations: Record<PriceCompareSaveStatusValue, StatusPresentation> =
    {
      idle: {
        label: t('priceCompare.saveStatus.idle'),
      },
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

  const presentation = presentations[status]
  const hint = detail ?? presentation.hint

  return (
    <span
      aria-live="polite"
      className={`price-compare-save-status price-compare-save-status-${status}`}
      data-save-status={status}
      role="status"
    >
      {presentation.icon ? (
        <span className="price-compare-save-status-icon" aria-hidden="true">
          {presentation.icon}
        </span>
      ) : null}
      <span className="price-compare-save-status-label">
        {presentation.label}
      </span>
      {hint ? (
        <span className="price-compare-save-status-hint">{hint}</span>
      ) : null}
      {presentation.retryable && onRetry ? (
        <Button type="link" size="small" onClick={onRetry}>
          {t('priceCompare.saveStatus.retry')}
        </Button>
      ) : null}
    </span>
  )
}
