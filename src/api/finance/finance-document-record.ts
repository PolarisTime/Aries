import { z } from 'zod'
import { normalizeVersion } from '@/api/market/quote-concurrency'
import type { LegacyModuleRecordInput } from '@/types/module-record'

/**
 * 付款单 / 收款单的乐观锁版本契约（`version`）。
 *
 * <p>后端 `PaymentResponse` / `ReceiptResponse`（列表 / 详情 / 更新）新增 `version`
 * 十进制字符串，`PUT /payments/{id}`、`PUT /receipts/{id}` 必须带 `X-Resource-Version`：
 * 缺 428、过期 412。前端在「取记录 → 交给编辑器 → 更新时作为 `expectedVersion`」这条链上
 * 原样带回该值，因此记录进入编辑器前必须归一成**十进制字符串**。</p>
 *
 * <p>为什么在这里归一：付款/收款走通用旧模块通道（`rawRecordSchema` = `z.record`），
 * 记录 shape 本身没有逐字段 schema，`version` 会以 `unknown` 透传；ECS/旧后端可能给
 * number 或 `null`。归一规则与请求头层 `withResourceVersion` 完全一致
 * （复用 `api/market/quote-concurrency` 的 `normalizeVersion`，不复制第二份），
 * 非法值一律视为「无版本」→ 不发空头 → 后端 428 → 走统一「刷新后重试」恢复路径。</p>
 */
export const FINANCE_DOCUMENT_MODULE_KEYS = ['payment', 'receipt'] as const

export type FinanceDocumentModuleKey =
  (typeof FINANCE_DOCUMENT_MODULE_KEYS)[number]

/** 该模块是否属于「带 version 前置条件的财务资金单据」。 */
export function isFinanceDocumentModuleKey(
  moduleKey: string,
): moduleKey is FinanceDocumentModuleKey {
  return (FINANCE_DOCUMENT_MODULE_KEYS as readonly string[]).includes(moduleKey)
}

/** 付款单 / 收款单记录：在通用旧模块记录上声明 `version?: string`。 */
export interface FinanceDocumentRecord extends LegacyModuleRecordInput {
  /** 乐观锁版本号（十进制字符串）；旧后端不返回时缺省，更新时不发版本头。 */
  version?: string
}

/**
 * 财务单据响应 shape。
 *
 * <p>`z.record` 保留后端下发的全部字段（列表/详情字段因模块而异，不能收紧成白名单），
 * 只把 `version` 归一成十进制字符串或 undefined（兼容旧响应）。</p>
 */
export const financeDocumentRecordSchema = z
  .record(z.string(), z.unknown())
  .transform((record): FinanceDocumentRecord => {
    const version = normalizeVersion(record.version)
    const normalized: FinanceDocumentRecord = { ...record }
    // 非法/缺失时必须删掉原始值（可能是 null / 小数 / 负数），不能让它冒充版本号。
    if (version === undefined) delete normalized.version
    else normalized.version = version
    return normalized
  })

/**
 * 把一条付款单 / 收款单记录（列表行或详情）归一成带 `version?: string` 的记录。
 *
 * <p>缺省版本时不写 `version` 键（保持与旧响应同样的 shape，避免表单里多出一个
 * `undefined` 字段）；非法版本同样按缺省处理。</p>
 */
export function normalizeFinanceDocumentRecord(
  record: LegacyModuleRecordInput,
): FinanceDocumentRecord {
  return financeDocumentRecordSchema.parse(record)
}

/**
 * 从编辑器记录读取要随更新发送的版本前置条件值。
 *
 * <p>返回 undefined 表示「没有可用版本」：适配层不会发送 `X-Resource-Version` 空头，
 * 后端据此返回 428，由统一错误展示引导「刷新后重试」。</p>
 */
export function readFinanceDocumentVersion(
  record: object | null | undefined,
): string | undefined {
  return financeDocumentRecordSchema.parse(record ?? {}).version
}
