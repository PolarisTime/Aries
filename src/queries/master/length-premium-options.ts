import {
  fetchLengthPremiumOptions,
  type LengthPremiumOption,
} from '@/api/master/length-premiums'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/queries/query-cached-options'

/**
 * 定尺主数据（`md_length_premium`）的**唯一缓存入口**。
 *
 * <p>与 `material-categories.ts` 同构：解析器/表单字段只做同步读缓存，真正的请求由
 * `useMasterOptions` 的 `lengthPremiums` 需求或 `useLengthPremiumOptions` 发起。
 * 两处用的是同一个 queryKey（{@link QUERY_KEYS.masterOptions.lengthPremiums}），
 * 因此同一份数据只请求一次。</p>
 */
const lengthPremiumOptions = createQueryCachedOptions<LengthPremiumOption>({
  queryKey: QUERY_KEYS.masterOptions.lengthPremiums,
  fetch: fetchLengthPremiumOptions,
})

/** 强制重新拉取（主数据维护页保存后刷新下拉用）。 */
export const reloadLengthPremiumOptions = lengthPremiumOptions.reload

/**
 * 同步读缓存；未命中时触发一次预取并返回空数组。
 *
 * <p>缓存为空时**不返回任何兜底词表**：定尺随业务维护变化，写死 9米/12米 会让新增定尺
 * 永远不出现（与 materialGrades 的处理口径一致 —— 宁可下拉为空，也不给出假选项）。</p>
 */
export const readCachedLengthPremiumOptions = lengthPremiumOptions.get
