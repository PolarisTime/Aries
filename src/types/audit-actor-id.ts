/** 审计主体 ID；`0` 表示系统主体，其余值为十进制 Long 标识。 */
export type AuditActorId = string

const MAX_SIGNED_LONG_ID = 9_223_372_036_854_775_807n
const AUDIT_ACTOR_ID_PATTERN = /^(0|[1-9]\d*)$/

/** 审计主体 ID 不符合前端传输契约时抛出的错误。 */
export class AuditActorIdContractError extends Error {
  readonly field: string

  constructor(field: string) {
    super(`审计主体 ID 契约无效：${field}`)
    this.name = 'AuditActorIdContractError'
    this.field = field
  }
}

/** 严格解析审计主体 ID，不兼容可能发生精度损失的 number。 */
export function parseAuditActorId(
  value: unknown,
  field = 'auditActorId',
): AuditActorId {
  if (
    typeof value !== 'string' ||
    !AUDIT_ACTOR_ID_PATTERN.test(value) ||
    BigInt(value) > MAX_SIGNED_LONG_ID
  ) {
    throw new AuditActorIdContractError(field)
  }
  return value
}
