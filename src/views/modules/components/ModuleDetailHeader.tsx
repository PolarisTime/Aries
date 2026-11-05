import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface Props {
  config: ModulePageConfig
  record: ModuleRecord
  /** 行展开的窄容器：标题降一级、单号与状态允许换行。 */
  compact?: boolean
}

/**
 * 顶栏是否会渲染状态标签（有 status 才渲染）。
 *
 * <p>导出成函数是因为**两个详情面都要用同一个判定**：顶栏渲染了状态标签时，方案 B 的
 * 信息区就把重复的「状态」字段去掉（否则同一张卡里上下两处都是「完成销售」）；
 * 判定写两份必然漂移，一处改了另一处就会同时显示或同时消失。</p>
 */
export function hasDetailHeaderStatus(record: ModuleRecord): boolean {
  return String(record.status ?? '').trim() !== ''
}

/**
 * 只读详情面的顶栏（设计稿「方案 B」的第一段）。
 *
 * <p>左到右固定为「标题 → 单号 → 状态标签」，右侧是页面可选的动作区。顶栏只由
 * `ModuleDetailHeader` 渲染一次，宽度、分隔线、留白都在 `styles/module-detail.css`
 * 的 `.module-detail-header*` 上，组件不内联尺寸。</p>
 *
 * <p>几个刻意的取舍：</p>
 * <ul>
 *   <li>**标题文案不新造 i18n key**：`config.title` + `modules.detail.titleSuffix`
 *   （销售订单 + 详情），与详情弹层外壳用的是同一个拼法，不会出现「销售订单详情」
 *   与「销售订单 详情」两种写法。</li>
 *   <li>**单号取 `getPrimaryNo`**：主单号口径的唯一实现（含 `primaryNoKey` 缺省回退），
 *   不在这里再读 `record[config.primaryNoKey]` 一遍。</li>
 *   <li>**状态复用 `renderModuleRecordStatus`**：颜色与文案来自各模块 `statusMap`，
 *   顶栏不硬编码任何状态色（「完成销售」在注册表里就是 cyan）。这也是为什么顶栏
 *   只挂一个容器类、圆点由 CSS 的 `::before` 用 `currentColor` 画 —— 小圆点跟随
 *   Tag 的语义色，不需要在这里判断第二次。</li>
 *   <li>**动作区是可选插槽**：`config.detailHeaderActions` 未配置时右侧整块不渲染，
 *   不留空 div（否则标题区会被 justify-content 推到左边、右侧留下一条空白缝）。</li>
 * </ul>
 */
export function ModuleDetailHeader({ config, record, compact = false }: Props) {
  const { t } = useTranslation()
  const { getPrimaryNo } = useModuleRecordHelpers({
    moduleKey: config.key,
    config,
  })

  const primaryNo = getPrimaryNo(record).trim()
  const showStatus = hasDetailHeaderStatus(record)
  const HeaderActions = config.detailHeaderActions

  return (
    <header
      className={`module-detail-header${compact ? ' module-detail-header--compact' : ''}`}
    >
      <div className="module-detail-header__main">
        <h2 className="module-detail-header__title">
          {`${config.title}${t('modules.detail.titleSuffix')}`}
        </h2>
        {primaryNo ? (
          <span className="module-detail-header__no" title={primaryNo}>
            {primaryNo}
          </span>
        ) : null}
        {showStatus ? (
          <span className="module-detail-header__status">
            {renderModuleRecordStatus({
              record,
              statusKey: 'status',
              statusMap: config.statusMap,
              // 没有 statusMap 的模块退回状态原文；空值不渲染（上面已判空）
              renderFallback: (value) => value || '-',
            })}
          </span>
        ) : null}
      </div>
      {HeaderActions ? (
        <div className="module-detail-header__actions">
          {createElement(HeaderActions, { record })}
        </div>
      ) : null}
    </header>
  )
}
