import { ArrowLeftOutlined, CloseOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { createElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleRecordHelpers } from '@/hooks/useModuleRecordHelpers'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import '@/styles/module-detail.css'

interface Props {
  config: ModulePageConfig
  record: ModuleRecord
  /** 行展开的窄容器：标题降一级、单号与状态允许换行，且不渲染动作按钮。 */
  compact?: boolean
  /**
   * 返回动作（详情覆盖层里就是「关闭详情、回到列表」）。
   *
   * <p>只由覆盖层传入：行展开没有自己的返回栈，不传时不渲染返回箭头。
   * 不新造路由返回逻辑 —— 覆盖层的关闭本来就是"退出当前详情"，
   * 返回箭头与右上角 × 走同一个回调，两者语义相同、避免出现第二套退场路径。</p>
   */
  onBack?: () => void
  /** 关闭动作（覆盖层的 `onClose`）；不传时不渲染右上角 ×。 */
  onClose?: () => void
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
 * 顶栏的关联对象文案（如「关联项目：海宁市潮圣…」）。
 *
 * <p>值取 `config.detailHeaderMeta.key` 对应字段的字符串形式；没有配置、或该字段为空时
 * 返回 `null`，顶栏连带竖线一起不渲染 —— 不留一条孤零零的分隔线。</p>
 */
function resolveHeaderMeta(
  config: ModulePageConfig,
  record: ModuleRecord,
): string | null {
  const meta = config.detailHeaderMeta
  if (!meta) return null
  const value = asString(record[meta.key]).trim()
  if (!value) return null
  return `${meta.label}${value}`
}

/**
 * 只读详情面的顶栏（参考稿右上角那张卡的内容）。
 *
 * <p>左到右固定为「返回箭头（可选）→ 标题 → 单号 → 状态标签 → 竖线 + 关联对象（可选）」，
 * 右侧是「动作按钮（声明式配置）→ 竖线 → 关闭 ×（可选）」。尺寸、留白、分隔线都在
 * `styles/module-detail.css` 的 `.module-detail-header*` 上，组件不内联尺寸。</p>
 *
 * <p>几个刻意的取舍：</p>
 * <ul>
 *   <li>**标题文案不新造 i18n key**：`config.title` + `modules.detail.titleSuffix`
 *   （销售订单 + 详情），与详情弹层外壳、行展开用的是同一个拼法。</li>
 *   <li>**单号取 `getPrimaryNo`**：主单号口径的唯一实现（含 `primaryNoKey` 缺省回退），
 *   不在这里再读 `record[config.primaryNoKey]` 一遍。</li>
 *   <li>**状态复用 `renderModuleRecordStatus`**：颜色与文案来自各模块 `statusMap`，
 *   顶栏不硬编码任何状态色。小圆点由 CSS 的 `::before` 用 `currentColor` 画，跟随 Tag
 *   的语义色，不需要在这里判断第二次。</li>
 *   <li>**动作按钮走声明式配置**（`config.detailHeaderButtons`）：未配置时右侧整块只在有
 *   关闭按钮时才渲染，其余模块的 DOM 一个字都不变（它们本来就没有顶栏）。</li>
 *   <li>**禁用按钮一定有 `title`**：接口没接入的占位按钮必须能说明"为什么点不了"，
 *   否则读屏与鼠标用户都只能看到一个灰按钮。说明文案来自 `disabledHint`。</li>
 * </ul>
 */
export function ModuleDetailHeader({
  config,
  record,
  compact = false,
  onBack,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const { getPrimaryNo } = useModuleRecordHelpers({
    moduleKey: config.key,
    config,
  })

  const primaryNo = getPrimaryNo(record).trim()
  const showStatus = hasDetailHeaderStatus(record)
  const HeaderActions = config.detailHeaderActions
  /*
   * 行展开（compact）不渲染动作按钮：那是列表内嵌视图，执行「打印 / 变更维护」
   * 会打断列表上下文；覆盖层才是单据动作的落点。
   */
  const buttons = compact ? [] : (config.detailHeaderButtons ?? [])
  const meta = resolveHeaderMeta(config, record)
  const notConnected = t('modules.detailCards.notConnected')
  const hasActions =
    buttons.length > 0 || HeaderActions !== undefined || onClose

  const renderButton = (button: (typeof buttons)[number]) => {
    const node = (
      <Button
        key={button.key}
        type={button.variant === 'primary' ? 'primary' : 'default'}
        icon={button.icon}
        disabled={button.disabled}
        onClick={() => button.onClick?.({ record })}
      >
        {button.label}
      </Button>
    )
    if (!button.disabled) return node
    /*
     * 禁用态外面包一层带 `title` 的 span：禁用按钮自己不接收指针事件，
     * 直接给 Button 加 title 在 Chrome 里悬停不出提示（键盘/读屏也拿不到原因）。
     */
    return (
      <span
        key={button.key}
        className="module-detail-header__button-tip"
        title={button.disabledHint ?? notConnected}
      >
        {node}
      </span>
    )
  }

  const renderActions = (): ReactNode => {
    if (!hasActions) return null
    return (
      <div className="module-detail-header__actions">
        {buttons.map(renderButton)}
        {HeaderActions ? createElement(HeaderActions, { record }) : null}
        {onClose ? (
          <>
            <span className="module-detail-header__divider" aria-hidden />
            <button
              type="button"
              className="module-detail-header__close"
              aria-label={t('modules.workspace.closeAria')}
              aria-keyshortcuts="Escape"
              title={t('modules.workspace.closeAria')}
              onClick={onClose}
            >
              <CloseOutlined aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <header
      className={`module-detail-header${compact ? ' module-detail-header--compact' : ''}`}
    >
      <div className="module-detail-header__main">
        {onBack ? (
          <button
            type="button"
            className="module-detail-header__back"
            aria-label={t('common.back')}
            title={t('common.back')}
            onClick={onBack}
          >
            <ArrowLeftOutlined aria-hidden />
          </button>
        ) : null}
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
        {meta ? (
          <>
            <span className="module-detail-header__divider" aria-hidden />
            <span className="module-detail-header__meta" title={meta}>
              {meta}
            </span>
          </>
        ) : null}
      </div>
      {renderActions()}
    </header>
  )
}
