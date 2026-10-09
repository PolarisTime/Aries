import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/utils/formatters'

/**
 * 当前批次的服务端落库元信息: 保存时间 + 版本号。
 * <p>此前页面只给出"已保存/未保存"结论, 无法判断这份报单是哪一刻落库的、服务端版本是多少;
 * 排查"改了没生效""是不是别人先改过"时缺少依据, 因此把两个值常驻在标题栏。</p>
 * <p>保存时间优先取服务端 updatedAt(加载与整单保存都会回传); 行级写接口只回传版本,
 * 此时由 store 用写成功的时刻兜底, 保证只改单元格也能看到新的保存时间。</p>
 */
export function PriceCompareSheetMeta({
  savedAt,
  version,
}: {
  /** 最后保存时间(ISO 8601 或时间戳); 缺省显示短横线。 */
  savedAt?: string | null
  /** 服务端乐观锁版本号; 缺省显示短横线。 */
  version?: string | null
}) {
  const { t } = useTranslation()
  return (
    <span className="price-compare-sheet-meta">
      <span className="price-compare-sheet-meta-field">
        <span className="price-compare-sheet-meta-label">
          {t('priceCompare.meta.savedAt')}
        </span>
        <span className="price-compare-sheet-meta-value">
          {formatDateTime(savedAt)}
        </span>
      </span>
      <span className="price-compare-sheet-meta-sep" aria-hidden="true">
        ·
      </span>
      <span className="price-compare-sheet-meta-field">
        <span className="price-compare-sheet-meta-label">
          {t('priceCompare.meta.version')}
        </span>
        <span className="price-compare-sheet-meta-value">
          {version ? version : '—'}
        </span>
      </span>
    </span>
  )
}
