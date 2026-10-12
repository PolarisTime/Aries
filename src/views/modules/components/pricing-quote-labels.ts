import type { TFunction } from 'i18next'
import {
  PRICE_PERIOD_OPTIONS,
  type ProjectPriceDateBasis,
  type ProjectPricePeriod,
  type ProjectPricePeriodPolicy,
} from '@/api/master/project-options'

/** 可选的基准口径（与后端 DELIVERY/ORDER/MANUAL 一致）。 */
export const PRICE_BASIS_OPTIONS: ProjectPriceDateBasis[] = [
  'DELIVERY',
  'ORDER',
  'MANUAL',
]

/** 可选的时段策略（与后端 AUTO/FIXED/MANUAL 一致）。 */
export const PRICE_PERIOD_POLICY_OPTIONS: ProjectPricePeriodPolicy[] = [
  'AUTO',
  'FIXED',
  'MANUAL',
]

/** 基准/时段策略的展示文案统一复用项目资料页同款 key，避免两处措辞漂移。 */
export const PRICE_BASIS_LABEL_KEYS: Record<ProjectPriceDateBasis, string> = {
  DELIVERY: 'modules.pages.project.priceDateBasisDelivery',
  ORDER: 'modules.pages.project.priceDateBasisOrder',
  MANUAL: 'modules.pages.project.priceDateBasisManual',
}

export const PRICE_PERIOD_POLICY_LABEL_KEYS: Record<
  ProjectPricePeriodPolicy,
  string
> = {
  AUTO: 'modules.pages.project.pricePeriodPolicyAuto',
  FIXED: 'modules.pages.project.pricePeriodPolicyFixed',
  MANUAL: 'modules.pages.project.pricePeriodPolicyManual',
}

/** 中文时段枚举 → 项目资料页同款文案 key（取值本身是落库枚举，展示层才翻译）。 */
export const PRICE_PERIOD_LABEL_KEYS: Record<ProjectPricePeriod, string> = {
  上午: 'modules.pages.project.pricePeriodMorning',
  中午: 'modules.pages.project.pricePeriodMidday',
  下午: 'modules.pages.project.pricePeriodAfternoon',
}

/** 时段下拉备选：无解析结果时按完整枚举给出，便于人工指定后由后端提示回退。 */
export const PRICE_PERIOD_FALLBACK_OPTIONS: readonly string[] =
  PRICE_PERIOD_OPTIONS

/** 展示层翻译中文时段枚举：未知取值原样返回，避免界面出现空标签。 */
export function translatePricePeriod(t: TFunction, value: string): string {
  return value in PRICE_PERIOD_LABEL_KEYS
    ? t(PRICE_PERIOD_LABEL_KEYS[value as ProjectPricePeriod])
    : value
}
