import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { EmptyStateType } from '@/components/EmptyState'

export interface EmptyStateActionConfig {
  label: string
  onClick: () => void
}

export interface EmptyStateViewConfig {
  type: EmptyStateType
  title: string
  description: string
  hint?: string
  primaryAction?: EmptyStateActionConfig
  secondaryAction?: EmptyStateActionConfig
}

export interface EmptyStateStateInput {
  /** 是否存在筛选条件（用于区分「无数据」与「筛选无结果」） */
  hasFilters?: boolean
  /** 列表加载是否出错 */
  hasError?: boolean
  /** 是否有查看权限；undefined/null 表示未知，不触发无权限状态 */
  hasPermission?: boolean | null
  /** 是否允许手动创建（如 modulePageConfig.allowManualCreate 推导结果） */
  canCreate?: boolean
  onResetFilters?: () => void
  onCreate?: () => void
  onRetry?: () => void
}

interface Input extends EmptyStateStateInput {
  /** 数据是否已加载且有记录；null 表示状态未知（如加载中），不渲染空状态 */
  hasData?: boolean | null
}

/**
 * 根据数据/筛选/错误状态推导应展示的空状态配置。
 * 优先级：error > no-permission > no-result > no-data。
 * 返回 null 表示无需展示空状态（有数据或状态未知）。
 */
export function useEmptyState({
  hasData,
  hasFilters = false,
  hasError = false,
  hasPermission,
  canCreate = false,
  onResetFilters,
  onCreate,
  onRetry,
}: Input): EmptyStateViewConfig | null {
  const { t } = useTranslation()

  return useMemo(() => {
    if (hasError) {
      return {
        type: 'error',
        title: t('emptyState.error.title'),
        description: t('emptyState.error.description'),
        secondaryAction: onRetry
          ? { label: t('emptyState.error.retry'), onClick: onRetry }
          : undefined,
      }
    }

    if (hasPermission === false) {
      return {
        type: 'no-permission',
        title: t('emptyState.noPermission.title'),
        description: t('emptyState.noPermission.description'),
        hint: t('emptyState.noPermission.hint'),
      }
    }

    if (hasData === false) {
      if (hasFilters) {
        return {
          type: 'no-result',
          title: t('emptyState.noResult.title'),
          description: t('emptyState.noResult.description'),
          secondaryAction: onResetFilters
            ? {
                label: t('emptyState.noResult.resetFilters'),
                onClick: onResetFilters,
              }
            : undefined,
        }
      }
      return {
        type: 'no-data',
        title: t('emptyState.noData.title'),
        description: t('emptyState.noData.description'),
        primaryAction:
          canCreate && onCreate
            ? {
                label: t('emptyState.noData.createFirstRecord'),
                onClick: onCreate,
              }
            : undefined,
      }
    }

    return null
  }, [
    canCreate,
    hasData,
    hasError,
    hasFilters,
    hasPermission,
    onCreate,
    onResetFilters,
    onRetry,
    t,
  ])
}
