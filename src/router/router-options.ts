import { stringifySearchWith } from '@tanstack/react-router'
import { lazy } from 'react'

/**
 * 查询参数统一按字符串保留。
 *
 * TanStack Router 默认会把纯数字值解析为 number；雪花 ID 超出
 * JavaScript 安全整数范围后会丢失低位，导致跨模块详情请求命中错误记录。
 * 业务层本身按 URLSearchParams 读取查询串，因此无需在路由层做类型推断。
 */
const parseSearch = (searchStr: string): Record<string, unknown> => {
  const params = new URLSearchParams(
    searchStr.startsWith('?') ? searchStr.slice(1) : searchStr,
  )
  const result = Object.create(null) as Record<string, unknown>
  for (const [key, value] of params.entries()) {
    const previous = result[key]
    if (previous === undefined) {
      result[key] = value
    } else if (Array.isArray(previous)) {
      previous.push(value)
    } else {
      result[key] = [previous, value]
    }
  }
  return result
}

// 不传 JSON parser，使纯字符串（尤其是数字 ID）保持原始文本，不被加引号。
const stringifySearch = stringifySearchWith(JSON.stringify)

/**
 * 主 Router 与多标签页子 Router 共享的 options。
 * 抽取自 router/index.ts，避免两份配置漂移。
 */
export function buildSharedRouterOptions() {
  return {
    parseSearch,
    stringifySearch,
    defaultPreload: 'intent' as const,
    defaultPendingMs: 100,
    defaultPendingComponent: lazy(() =>
      import('@/views/modules/components/BusinessGridPageSkeleton').then(
        (m) => ({
          default: m.BusinessGridPageSkeleton,
        }),
      ),
    ),
    defaultErrorComponent: lazy(() =>
      import('@/views/error/ErrorView').then((m) => ({
        default: m.ErrorView,
      })),
    ),
    defaultNotFoundComponent: lazy(() =>
      import('@/views/error/NotFoundView').then((m) => ({
        default: m.NotFoundView,
      })),
    ),
  }
}
