import type { output, ZodType } from 'zod'

class ApiContractError extends Error {
  readonly context: string
  readonly issues: readonly string[]

  constructor(context: string, issues: readonly string[]) {
    super(`API 响应契约校验失败：${context}`)
    this.name = 'ApiContractError'
    this.context = context
    this.issues = issues
  }
}

export function parseApiContract<Schema extends ZodType>(
  schema: Schema,
  value: unknown,
  context: string,
): output<Schema> {
  const result = schema.safeParse(value)
  if (result.success) {
    return result.data
  }

  throw new ApiContractError(
    context,
    result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '<root>'
      return `${path}: ${issue.message}`
    }),
  )
}
