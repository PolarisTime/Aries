import { z } from 'zod'
import { parseApiContract } from '@/api/core/api-contract'
import { apiGet, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import { responsePositiveIntegerSchema } from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'

/**
 * 供应商品牌规格配置（`/suppliers/{id}/brand-specs`）。
 *
 * <p>业务口径：一家供应商的每个经营品牌可以单独限定「允许报价的 类别 + 材质 + 规格 + 定尺」。
 * 报价表按这份配置收敛列与格子（见 `src/views/price-compare/supplier-price-list-model.ts`）。</p>
 *
 * <p><b>「没有条目」与「空配置」是同一个意思</b>：某品牌一条记录都没有 = 未配置 =
 * 按商品资料里该品牌的全量组合报价。后端只有「整家供应商整集替换」，没有「某品牌一条都不报」
 * 这种状态，因此：</p>
 * <ul>
 *   <li>显式配置必须是**真子集**；「全选」等价于「未配置」，保存前归一成不写条目
 *       （见 {@link normalizeSupplierBrandSpecs} 的调用方 `supplier-brand-spec-model`）；</li>
 *   <li>提交空数组 = 清空整家供应商的配置，回落到「全量」。</li>
 * </ul>
 *
 * <p>契约要点：{@code spec} 是整数（后端 entry 表为 integer）；{@code supplierId} 是雪花 ID，
 * 全程十进制字符串（{@link EntityId}），禁止 `Number()`/`parseInt()`；写操作带
 * `X-Idempotency-Key`。</p>
 */

/** 一条配置：某品牌下允许报价的一个商品组合。 */
export interface SupplierBrandSpecItem {
  brandName: string
  category: string
  material: string
  /** 规格，正整数（与商品资料/价格表条目口径一致）。 */
  spec: number
  length: string
}

/**
 * 配置条目键 —— 判断「某组合是否被允许报价」的**唯一口径**。
 *
 * <p>配置侧（供应商资料里的穿梭框）与消费侧（报价表过滤）必须用同一个键算，
 * 否则两边各拼一次字符串，遇到分隔符或空白差异就会「配置了却不生效」。</p>
 */
export function supplierBrandSpecKey(item: SupplierBrandSpecItem): string {
  return `${item.brandName}|${item.category}|${item.material}|${item.spec}|${item.length}`
}

/** 响应条目：后端已按 `JacksonConfig` 输出字符串 ID、整数型 spec（同时兼容字符串数字）。 */
const responseItemSchema = z.looseObject({
  brandName: z.string(),
  category: z.string(),
  material: z.string(),
  spec: responsePositiveIntegerSchema,
  length: z.string(),
})

/** GET / PUT 的响应体：条目数组；未配置时为空数组。 */
export const supplierBrandSpecListSchema = z.array(responseItemSchema)

/**
 * 写入载荷的字段校验与归一化（trim + 正整数规格），是写路径的唯一口径。
 *
 * <p>同时被穿梭框控件用作「保存载荷是否合法」的判定：控件不会把空品牌、空类别、
 * 非整数规格发出去（这些到后端只会是 422）。</p>
 */
export const supplierBrandSpecItemInputSchema = z.object({
  brandName: z.string().trim().min(1),
  category: z.string().trim().min(1),
  material: z.string().trim().min(1),
  spec: z.coerce.number().int().positive(),
  length: z.string().trim().min(1),
})

/** 写入载荷：整集替换，空数组表示清空配置。 */
export const supplierBrandSpecListInputSchema = z.array(
  supplierBrandSpecItemInputSchema,
)

/**
 * 归一化响应条目：trim、丢弃无法归属的脏条目、按 {@link supplierBrandSpecKey} 去重。
 *
 * <p>丢弃只针对「缺品牌」这类无法归属到任何品牌列的记录（历史脏数据）；其余字段缺失
 * 交给 schema 抛契约错误，避免把配置静默改成另一个含义。</p>
 */
export function normalizeSupplierBrandSpecs(
  raw: readonly SupplierBrandSpecItem[],
): SupplierBrandSpecItem[] {
  const seen = new Set<string>()
  const items: SupplierBrandSpecItem[] = []
  for (const item of raw) {
    const normalized: SupplierBrandSpecItem = {
      brandName: item.brandName.trim(),
      category: item.category.trim(),
      material: item.material.trim(),
      spec: item.spec,
      length: item.length.trim(),
    }
    if (!normalized.brandName) continue
    const key = supplierBrandSpecKey(normalized)
    if (seen.has(key)) continue
    seen.add(key)
    items.push(normalized)
  }
  return items
}

/** 读取某供应商的全部品牌规格配置；未配置时后端返回空数组。 */
export async function fetchSupplierBrandSpecs(
  supplierId: EntityId,
  signal?: AbortSignal,
): Promise<SupplierBrandSpecItem[]> {
  const id = parseEntityId(supplierId, 'supplierId')
  const payload = await apiGet(
    ENDPOINTS.SUPPLIER_BRAND_SPECS(id),
    supplierBrandSpecListSchema,
    { ...(signal ? { signal } : {}) },
  )
  return normalizeSupplierBrandSpecs(payload)
}

/**
 * 整集替换某供应商的品牌规格配置；空数组 = 清空（回落到「按商品资料全量」）。
 *
 * <p>提交前先过一遍 {@link supplierBrandSpecListInputSchema}：载荷非法时在客户端就失败，
 * 不会把半截数据发给后端再被 422 打断。</p>
 */
export async function saveSupplierBrandSpecs(
  supplierId: EntityId,
  items: readonly SupplierBrandSpecItem[],
): Promise<SupplierBrandSpecItem[]> {
  const id = parseEntityId(supplierId, 'supplierId')
  const validated = parseApiContract(
    supplierBrandSpecListInputSchema,
    // 归一化后再校验：重复条目由这里收敛，避免后端唯一索引 409
    normalizeSupplierBrandSpecs(items),
    '供应商品牌规格请求',
  )
  const payload = await apiPut(
    ENDPOINTS.SUPPLIER_BRAND_SPECS(id),
    supplierBrandSpecListSchema,
    validated,
    withIdempotencyKey(),
  )
  return normalizeSupplierBrandSpecs(payload)
}
