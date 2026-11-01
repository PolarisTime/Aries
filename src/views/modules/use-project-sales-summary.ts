import { useCallback, useEffect, useState } from 'react'
import {
  isCanceledRequestError,
  readRequestError,
} from '@/api/core/request-errors'
import {
  fetchProjectSalesSummary,
  type ProjectSalesSummary,
} from '@/api/sales/project-sales-summary'
import type { EntityId } from '@/types/entity-id'

/** pending（含本单）会随明细键入连续变化，统一 300ms 防抖，避免每次按键打一次接口。 */
export const PROJECT_SALES_SUMMARY_DEBOUNCE_MS = 300

export interface ProjectSalesSummaryQuery {
  /** 雪花 ID 字符串；空字符串表示未选项目（不发请求）。 */
  projectId: EntityId
  /** 编辑态排除本单；新建/详情态不传。 */
  excludeOrderId?: EntityId
  pendingAmount?: number
  pendingTonnage?: number
}

export interface ProjectSalesSummaryError {
  /** HTTP 状态码（404 = 项目不存在/已停用）；传输层失败时为 undefined。 */
  status?: number
  message: string
}

export interface ProjectSalesSummaryState {
  summary: ProjectSalesSummary | null
  loading: boolean
  error: ProjectSalesSummaryError | null
  /** 错误态下的「重试」出口。 */
  retry: () => void
}

interface InternalState {
  /** 当前 state 归属的项目；用于「换项目清空、同项目保留」判断。 */
  projectId: string
  summary: ProjectSalesSummary | null
  loading: boolean
  error: ProjectSalesSummaryError | null
}

function toSummaryError(error: unknown): ProjectSalesSummaryError {
  const { status } = readRequestError(error)
  const message =
    error instanceof Error && error.message.trim() ? error.message.trim() : ''
  return {
    ...(status === undefined ? {} : { status }),
    message,
  }
}

/**
 * 「项目数据」面板的数据出口：项目销售汇总。
 *
 * <p>行为契约（详见 `use-project-sales-summary.spec.tsx`）：</p>
 * <ul>
 *   <li>空 `projectId` 不发请求，返回空态；</li>
 *   <li>`projectId` / `pending*` 变化后 300ms 才发请求（连续键入只打最后一次）；</li>
 *   <li>新一轮请求开始（依赖变化或重试）立即 `abort()` 上一轮，过期响应不会覆盖新状态；</li>
 *   <li>换项目时清空旧数字（避免把上一个项目的合计显示在新项目名下），
 *       同一项目内 pending 变化保留旧数字（避免每次键入都闪骨架）；</li>
 *   <li>失败保留 `status`，由展示层区分「项目不存在/已停用（404）」与可重试的加载失败。</li>
 * </ul>
 *
 * <p>只读：本 hook 不产生任何写请求。</p>
 */
export function useProjectSalesSummary(
  query: ProjectSalesSummaryQuery,
  options: { debounceMs?: number } = {},
): ProjectSalesSummaryState {
  const debounceMs = options.debounceMs ?? PROJECT_SALES_SUMMARY_DEBOUNCE_MS
  const projectId = String(query.projectId ?? '').trim()
  const excludeOrderId = String(query.excludeOrderId ?? '').trim()
  const { pendingAmount, pendingTonnage } = query
  const [retryToken, setRetryToken] = useState(0)
  const [state, setState] = useState<InternalState>(() => ({
    projectId,
    summary: null,
    loading: false,
    error: null,
  }))

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryToken 只是「重试」的重跑触发器，效果体内不读它（读它等于把计数器混进请求参数）
  useEffect(() => {
    if (!projectId) {
      setState({
        projectId: '',
        summary: null,
        loading: false,
        error: null,
      })
      return undefined
    }

    const controller = new AbortController()
    setState((current) => ({
      projectId,
      summary: current.projectId === projectId ? current.summary : null,
      loading: true,
      error: null,
    }))

    const timer = setTimeout(() => {
      void fetchProjectSalesSummary(
        {
          projectId,
          ...(excludeOrderId ? { excludeOrderId } : {}),
          ...(pendingAmount === undefined ? {} : { pendingAmount }),
          ...(pendingTonnage === undefined ? {} : { pendingTonnage }),
        },
        controller.signal,
      )
        .then((summary) => {
          if (controller.signal.aborted) return
          setState({ projectId, summary, loading: false, error: null })
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || isCanceledRequestError(error)) {
            return
          }
          setState({
            projectId,
            summary: null,
            loading: false,
            error: toSummaryError(error),
          })
        })
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [
    projectId,
    excludeOrderId,
    pendingAmount,
    pendingTonnage,
    debounceMs,
    retryToken,
  ])

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1)
  }, [])

  return {
    summary: state.summary,
    loading: state.loading,
    error: state.error,
    retry,
  }
}
