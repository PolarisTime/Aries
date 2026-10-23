import { resolveSpotSourceMaterial } from './core'
import type { PriceRow, SheetInput, SheetInputs } from './types'

/**
 * 单格「取消代取」的语义词层。
 *
 * <p>为什么单独一个文件、而不写进 `core.ts`：`core.ts` 正在被「去硬编码类别」那条线
 * 并行修改，把仅属本功能的两个小函数放进去会制造无谓冲突。这里只**依赖** `core`
 * 的判断出口（不复制它的规则），职责是「单格例外」这一层。</p>
 */

/**
 * 单格取消代取标记的**唯一写入实现**。
 *
 * <p>为什么写 `null` 而不是删字段：契约里 `null` = 「查过、确认没代取」，
 * 缺字段 = 「这条数据没带信息」。抹平会让来源列无法区分"确认过"与"不知道"，
 * 也会让 {@link resolveCellSpotSource} 的单格例外判据失效。</p>
 *
 * <p>只改来源标记：`spot` 数值、`ton`、供应商与行级开关全部原样保留
 * （单格是例外覆盖，不是改整行口径）。</p>
 *
 * @returns 新的 inputs；该格不存在时返回 null，调用方据此跳过 patch
 */
export function clearSpotSourceIn(
  inputs: SheetInputs,
  brandName: string,
  rowId: string,
): SheetInputs | null {
  const key = `${brandName}:${rowId}`
  const prev = inputs[key]
  if (!prev) return null
  return { ...inputs, [key]: { ...prev, spotSourceMaterial: null } }
}

/**
 * 单元格级角标判据 = **单格例外** 包在 `core.resolveSpotSourceMaterial` 外层。
 *
 * <p>显式 `null` 必须优先于行级开关：否则用户刚点「取消」，只要该行开关还开着，
 * 角标就会被行级判据立刻判回来 —— 取消操作等于无效。</p>
 *
 * <p>其余情况一律委派给 `core.resolveSpotSourceMaterial`，不在此重复材质白名单/
 * 单据头开关等规则（那些的唯一出口在 core）。</p>
 */
export function resolveCellSpotSource(args: {
  input?: SheetInput
  row: Pick<PriceRow, 'material' | 'hrb400eFallback'>
  allowHrb400eFallback: boolean
}): string | undefined {
  if (args.input && args.input.spotSourceMaterial === null) return undefined
  return resolveSpotSourceMaterial(args)
}
