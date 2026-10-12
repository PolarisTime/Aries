import { useEffect, useRef } from 'react'
import type { usePriceCompareData } from './usePriceCompareData'
import type { useSheetsStore } from './useSheetsStore'

/**
 * PriceCompareView 的参照日期/时段与网价回填副作用。
 *
 * <p>抽出原因：这两段 effect 加 patchSheet 的 ref 同步在组件里占约 40 行，
 * 是 no-giant-component (>300 行) 的行数来源之一。之所以只搬这一段：另外几段
 * 「品牌兜底回填 / URL 参数 / 现货联动」都需要在 effect 里回调外部传入的
 * setBrands/patchSheet，搬到 hook 后会命中 react-doctor/no-pass-data-to-parent
 * （data passed to parent via effect），故保留在组件内。这里通过 ref 间接调用，
 * 不对外推数据，语义与原实现逐字一致。</p>
 */

type SheetsStore = ReturnType<typeof useSheetsStore>
type ActiveSheet = SheetsStore['active']

/**
 * 参照日期/时段与网价刷新后的回填。
 *
 * <p>参照锁定期间不得程序化改写 refDate/refPeriod: 绕过锁定会被后端 422 拒绝；
 * 但网价仍需随刷新合并，否则锁定后刷新会丢失网价。patchSheet 通过 ref 读取，
 * 避免回调身份变化导致重复请求。</p>
 */
export function usePriceCompareReferenceSync({
  active,
  activeRefDate,
  activeRefPeriod,
  activeSheetId,
  isLatestRef,
  matchesData,
  mergeMatches,
  patchSheet,
  resolvedRefPeriod,
}: {
  active: ActiveSheet
  activeRefDate: string
  activeRefPeriod: string
  activeSheetId: string
  isLatestRef: boolean
  matchesData:
    | Parameters<ReturnType<typeof usePriceCompareData>['mergeMatches']>[0]
    | undefined
  mergeMatches: ReturnType<typeof usePriceCompareData>['mergeMatches']
  patchSheet: SheetsStore['patchSheet']
  resolvedRefPeriod: string
}) {
  const patchSheetRef = useRef(patchSheet)
  useEffect(() => {
    patchSheetRef.current = patchSheet
  }, [patchSheet])

  useEffect(() => {
    // 参照锁定期间不得程序化改写 refPeriod: 绕过锁定会被后端 422 拒绝
    if (active?.locked) return
    if (!activeSheetId || !activeRefDate || !resolvedRefPeriod) return
    if (resolvedRefPeriod !== activeRefPeriod)
      patchSheetRef.current(activeSheetId, { refPeriod: resolvedRefPeriod })
  }, [
    active?.locked,
    activeSheetId,
    activeRefDate,
    activeRefPeriod,
    resolvedRefPeriod,
  ])

  useEffect(() => {
    const matches = matchesData
    if (!activeSheetId || !matches?.length) return
    // 参照锁定仅固定参照日期/时段, 网价仍需随刷新合并; 否则锁定后刷新会丢失网价
    mergeMatches(matches)
    // 参照锁定期间不得程序化改写 refDate/refPeriod: 绕过锁定会被后端 422 拒绝
    if (active?.locked) return
    if (isLatestRef) {
      const quoteDate = matches.find((row) => row.quoteDate)?.quoteDate ?? ''
      const period = matches.find((row) => row.period)?.period ?? ''
      patchSheetRef.current(activeSheetId, {
        refDate: quoteDate,
        ...(activeRefPeriod ? {} : { refPeriod: period }),
      })
    }
  }, [
    active?.locked,
    activeSheetId,
    activeRefPeriod,
    isLatestRef,
    matchesData,
    mergeMatches,
  ])
}
