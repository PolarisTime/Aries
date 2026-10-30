import { z } from 'zod'

export const initialSetupStatusSchema = z.object({
  setupRequired: z.boolean(),
  accountConfigured: z.boolean(),
})
export type InitialSetupStatus = z.output<typeof initialSetupStatusSchema>

const initialSetupAccountPayloadSchema = z.object({
  loginName: z.string().min(1),
  password: z.string().min(8),
  userName: z.string().min(1),
  /*
   * 手机号上限 20，与后端 `InitialSetupAccountRequest.mobile` 的 @Size(max = 20) 及
   * `sys_user.mobile` varchar(20) 对齐（当前表单没有渲染手机号输入框，这里锁的是提交载荷契约）。
   */
  mobile: z.string().max(20).optional(),
})
export type InitialSetupAccountPayload = z.input<
  typeof initialSetupAccountPayloadSchema
>

export type InitialSetupAccountSubmitPayload = {
  account: InitialSetupAccountPayload
}

export type InitialSetupResult = InitialSetupStatus

export const initialSetupAccountSubmitPayloadSchema = z.object({
  account: initialSetupAccountPayloadSchema,
})

/** POST /setup/account 201 返回的脱敏账号摘要（id 为雪花 ID 字符串）。 */
export const initialSetupAccountCreatedSchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/),
  loginName: z.string().min(1),
  userName: z.string().min(1),
})
export type InitialSetupAccountCreated = z.output<
  typeof initialSetupAccountCreatedSchema
>
