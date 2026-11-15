import { z } from 'zod'
import { apiPost, downloadGet } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { readRequestError } from '@/api/core/request-errors'
import { HTTP_STATUS } from '@/constants/http-status'
import { getApiMessage } from '@/utils/api-messages'
import { downloadBlob } from '@/utils/download'
import { apiBaseUrl } from '@/utils/env'

/**
 * 导出产物资源表示，与后端 `ExportArtifactResponse` 一一对应。
 *
 * <p>契约要点：</p>
 * <ul>
 *   <li>`id` 是雪花 id 的十进制字符串，禁止数值转换（19 位超出 JS 安全整数）；</li>
 *   <li>`size` 是字节数，后端用 NumericLongSerializer 保持 JSON number；</li>
 *   <li>`contentPath` 是内容端点的相对路径，含版本前缀（如
 *       `/v2.0/module-export-requests/123/content`），不含 context-path。</li>
 * </ul>
 *
 * <p>本模块是「导出产物资源」两步协议的唯一实现处：POST 创建产物 → GET `content` 下载。
 * 导出的六个端点（资金流水 / 模块 / 商品 / 附件恢复清单 / 销售订单套打）都复用它，
 * 不要在各自的 API 文件里重复拼 content 路径或重复判断 404。</p>
 */
export const exportArtifactSchema = z.object({
  id: z.string(),
  kind: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  size: z.number(),
  createdAt: z.string(),
  expiresAt: z.string(),
  contentPath: z.string(),
})

export type ExportArtifact = z.infer<typeof exportArtifactSchema>

/** 版本前缀（`/v2.0`）：由 `apiBaseUrl`（`/api/v2.0`）推导，避免请求基址出现第二份口径。 */
const API_VERSION_SEGMENT = apiBaseUrl.slice(apiBaseUrl.lastIndexOf('/'))

/**
 * 把后端给出的 `contentPath` 转成相对 axios baseURL 的请求路径。
 *
 * <p>`contentPath` 含版本前缀（`/v2.0/...`），而 baseURL 已经是 `/api/v2.0`；
 * 直接拼接会得到 `/api/v2.0/v2.0/...`，因此这里剥掉版本段。</p>
 */
function toContentRequestPath(contentPath: string): string {
  const trimmed = contentPath.trim()
  if (!trimmed) {
    return ''
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash.startsWith(`${API_VERSION_SEGMENT}/`)
    ? withLeadingSlash.slice(API_VERSION_SEGMENT.length)
    : withLeadingSlash
}

export interface CreateExportArtifactOptions {
  /** 同一次用户动作内重试传同一个 key；不传则本次请求创建时生成一次。 */
  idempotencyKey?: string
  /** 由调用方呈现错误时抑制这些状态码的全局提示，避免同一错误弹两次。 */
  suppressGlobalErrorStatuses?: readonly number[]
}

/**
 * 第一步：POST 创建导出产物资源。
 *
 * <p>成功返回 201 + `ExportArtifactResponse`，`Location` 指向该资源；产物在服务端有界缓存，
 * 默认保留 30 分钟。`Authorization` 由统一 client 的请求拦截器注入。</p>
 */
export async function createExportArtifact(
  collectionPath: string,
  body: unknown,
  options: CreateExportArtifactOptions = {},
): Promise<ExportArtifact> {
  // 抑制列表只在调用方明确要求时下发；省略时保持拦截器的默认全局提示。
  // `suppressGlobalErrorStatuses` 是 ApiRequestConfig 的扩展字段：这里用展开合并而不是对象字面量，
  // 以免字面量在 apiPost 的上下文类型下被当作多余属性拒绝。
  const suppressed = options.suppressGlobalErrorStatuses
  const requestConfig = {
    ...withIdempotencyKey(undefined, options.idempotencyKey),
    ...(suppressed ? { suppressGlobalErrorStatuses: suppressed } : {}),
  }

  return apiPost(collectionPath, exportArtifactSchema, body, requestConfig)
}

/**
 * 第二步：GET 产物内容端点下载文件。
 *
 * <p>404 表示产物已过期（30 分钟）或服务端重启后丢失，提示用户重新生成；
 * 其余错误原样抛出，由调用方按既有方式呈现。</p>
 */
export async function downloadExportArtifact(
  artifact: ExportArtifact,
  fallbackFileName: string,
): Promise<void> {
  const requestPath = toContentRequestPath(artifact.contentPath)
  if (!requestPath) {
    throw new Error(getApiMessage('exportArtifactContentUnavailable'))
  }

  try {
    const blob = await downloadGet(requestPath)
    downloadBlob(blob, artifact.fileName.trim() || fallbackFileName)
  } catch (error) {
    if (readRequestError(error).status === HTTP_STATUS.NOT_FOUND) {
      throw new Error(getApiMessage('exportArtifactExpired'), {
        cause: error,
      })
    }
    throw error
  }
}

export interface ExportArtifactDownloadOptions
  extends CreateExportArtifactOptions {
  /** 产物未给出可用文件名时的兜底文件名。 */
  fallbackFileName: string
}

/** 两步导出：POST 创建产物（带幂等键）→ GET `content` 下载；返回产物元数据。 */
export async function createAndDownloadExportArtifact(
  collectionPath: string,
  body: unknown,
  options: ExportArtifactDownloadOptions,
): Promise<ExportArtifact> {
  const artifact = await createExportArtifact(collectionPath, body, options)
  await downloadExportArtifact(artifact, options.fallbackFileName)
  return artifact
}
