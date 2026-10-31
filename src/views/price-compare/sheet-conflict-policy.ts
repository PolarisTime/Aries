import { readRequestError } from '@/api/core/request-errors'

/**
 * 乐观并发冲突判定与重试策略。
 *
 * <p>从 `useSheetsStore` 抽出的独立职责：冲突分类(版本/签出锁)、资源键归一、
 * 覆盖重试次数。全是纯函数，可直接单测；弹窗文案与交互编排仍留在 hook 内。</p>
 */

/** 版本不匹配: 412 Precondition Failed。 */
export const VERSION_CONFLICT_STATUS = 412
export const VERSION_CONFLICT_CODE = 4120

/** 缺少版本前置条件: 428 Precondition Required(需要带版本重试)。 */
export const PRECONDITION_REQUIRED_STATUS = 428
export const PRECONDITION_REQUIRED_CODE = 4280

/** 他人签出锁冲突: 409 Conflict。 */
export const LOCK_CONFLICT_STATUS = 409
export const LOCK_CONFLICT_CODE = 4090

/** 「以我的覆盖」最多尝试次数(含首次), 避免无限连环冲突。 */
export const OVERRIDE_MAX_ATTEMPTS = 2

/** 乐观并发冲突: 单据头/项目配置/某商品行。 */
export type SheetsConflict = {
  kind: 'sheet' | 'config' | 'item'
  id: string
  itemId?: string
}

/** 冲突资源键: 表头与商品行同属一个单据资源, 项目配置独立。 */
export function conflictResourceKey(
  kind: SheetsConflict['kind'],
  id: string,
): string {
  return kind === 'config' ? `config:${id}` : `sheet:${id}`
}

/** 版本冲突: 412/4120(版本已变更) 或 428/4280(缺少版本前置条件)。 */
export function isVersionConflict(error: unknown): boolean {
  const { status, code } = readRequestError(error)
  return (
    status === VERSION_CONFLICT_STATUS ||
    status === PRECONDITION_REQUIRED_STATUS ||
    code === VERSION_CONFLICT_CODE ||
    code === PRECONDITION_REQUIRED_CODE
  )
}

/** 签出锁冲突: 409 / 4090(单据被他人签出)。 */
export function isLockConflict(error: unknown): boolean {
  const { status, code } = readRequestError(error)
  return status === LOCK_CONFLICT_STATUS || code === LOCK_CONFLICT_CODE
}

/** 服务端冲突(版本或签出锁)。 */
export function isConflictError(error: unknown): boolean {
  return isVersionConflict(error) || isLockConflict(error)
}

/** 覆盖保存结果: 成功/仍冲突/其他失败/无可保存内容。 */
export type ConflictResolution = 'ok' | 'conflict' | 'error' | 'skipped'

/** 冲突弹窗实例(antd confirm 返回值), 用于更新文案或销毁。 */
export type ConflictModalInstance = {
  update?: (config: Record<string, unknown>) => void
  destroy?: () => void
}
