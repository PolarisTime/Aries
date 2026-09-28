import { Dropdown } from 'antd'
import type { MenuProps } from 'antd/es/menu'
import {
  type KeyboardEvent,
  type ReactElement,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

/**
 * 软禁用标记: rc-menu 的 `disabled` 项不会拿到 tabIndex, 无法聚焦也不在方向键序列里,
 * 因此本组件不把 `disabled` 透传给 rc-menu, 改由该属性(落到 DOM 的 li 上)表达不可用。
 */
const SOFT_DISABLED_ATTR = 'data-menu-item-soft-disabled'

/**
 * rc-menu 的 disabled 项既不可聚焦, 也会被方向键跳过; APG 要求禁用项可聚焦、可被读屏发现。
 * 这里把 `disabled: true` 降级为"软禁用": 保留在菜单的键盘序列与 Tab 序列中,
 * 由 `aria-disabled`(挂载后补写)与点击/回车拦截共同表达"可见但不可用"。
 */
function toSoftDisabledItems(items: MenuProps['items']): {
  items: MenuProps['items']
  softDisabledKeys: Set<string>
} {
  const softDisabledKeys = new Set<string>()
  const list = items ?? []
  const normalized = list.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item
    const config = item as unknown as Record<string, unknown>
    if (!config.disabled) return item
    const key = String(config.key ?? '')
    if (key) softDisabledKeys.add(key)
    const { disabled: _softDisabled, ...rest } = config
    return {
      ...rest,
      [SOFT_DISABLED_ATTR]: 'true',
      className: [rest.className, 'app-context-menu-item-disabled']
        .filter(Boolean)
        .join(' '),
      // rc-menu 的禁用样式走内部 disabled 分支, 这里用内联样式保住"不可用"的视觉提示
      style: {
        opacity: 0.45,
        cursor: 'not-allowed',
        ...((rest.style ?? {}) as Record<string, unknown>),
      },
    } as unknown as (typeof list)[number]
  })
  return { items: normalized, softDisabledKeys }
}

export interface ContextMenuProps {
  /**
   * 菜单可访问名称(渲染为 `role="menu"` 上的 aria-label)。
   * W3C ARIA APG / MDN 要求菜单必须有可访问名, 否则读屏只会念"菜单"。
   */
  ariaLabel: string
  items: MenuProps['items']
  onClick?: MenuProps['onClick']
  disabled?: boolean
  /** 触发器; 右键(或键盘上下文键)落在它或其子元素上时打开 */
  children: ReactElement
  /** 受控开关: 键盘调用场景由调用方置为 true(如标签栏的 Shift+F10) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** 菜单关闭后焦点归还的目标; 缺省回到"打开菜单时持有焦点的元素"(APG: 归还调用上下文) */
  returnFocusRef?: RefObject<HTMLElement | null>
  /**
   * 触发器: 默认只响应右键(纯右键菜单)。与可见"更多"按钮共用同一份菜单时传入
   * `['click', 'contextMenu']`, 这样点击按钮与右键都走本组件的无障碍契约。
   */
  triggers?: Array<'click' | 'contextMenu'>
}

/**
 * 右键菜单基元。
 *
 * <p>antd `Dropdown trigger={['contextMenu']}` 只解决"能弹出来", 不满足 APG 的键盘契约,
 * 本组件补齐三件事(缺一条键盘/读屏用户就用不了这个菜单):</p>
 * <ol>
 *   <li>菜单有可访问名(`aria-label`);</li>
 *   <li>打开后焦点进入第一个可用菜单项(否则方向键会落到页面其它控件上, Escape 也收不到);</li>
 *   <li>Escape 关闭并把焦点归还给打开菜单的元素。</li>
 * </ol>
 *
 * <p>注意: antd/rc-menu 在方向键导航时会跳过禁用项(APG 建议禁用项可聚焦但不可激活),
 * 本组件在渲染前把 `disabled` 项改写为"软禁用", 让它们仍可聚焦、可被读屏发现, 但激活无效。</p>
 */
export function ContextMenu({
  ariaLabel,
  items,
  onClick,
  disabled,
  children,
  open: controlledOpen,
  onOpenChange,
  returnFocusRef,
  triggers,
}: ContextMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const popupRef = useRef<HTMLDivElement>(null)
  const { items: normalizedItems, softDisabledKeys } = useMemo(
    () => toSoftDisabledItems(items),
    [items],
  )
  /** 用户已经点过菜单项(可能打开了对话框/确认框), 此时不再抢焦点。 */
  const interactedRef = useRef(false)
  /** 打开菜单时持有焦点的元素(右键场景通常是被右击的元素)。 */
  const openerRef = useRef<HTMLElement | null>(null)
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next)
    }
    onOpenChange?.(next)
  }

  /** 把焦点放进第一个菜单项; 返回是否成功(菜单项可能还没挂载)。 */
  const focusFirstItem = useCallback(() => {
    // 软禁用项同样可聚焦(APG), 因此不按 aria-disabled 过滤
    const target =
      popupRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
    if (!target) return false
    target.focus()
    return true
  }, [])

  /**
   * 补写软禁用项的 aria-disabled。
   *
   * <p>rc-menu 用自己的 `aria-disabled={undefined}` 覆盖 items 上的同名 props,
   * 无法通过配置声明, 只能在弹层挂载后落到 DOM; React 后续重渲染不会移除该属性
   * (props 两侧都是 undefined, 不产生 DOM 写入)。</p>
   */
  const markSoftDisabledItems = useCallback(() => {
    const popup = popupRef.current
    if (!popup) return
    popup
      .querySelectorAll<HTMLElement>(`[${SOFT_DISABLED_ATTR}="true"]`)
      .forEach((node) => {
        if (node.getAttribute('aria-disabled') !== 'true') {
          node.setAttribute('aria-disabled', 'true')
        }
      })
  }, [])

  /** 记录弹层节点; 焦点迁移统一在下面延后执行(见注释)。 */
  const attachPopup = (node: HTMLDivElement | null) => {
    popupRef.current = node
  }

  const handleMenuClick: MenuProps['onClick'] = (info) => {
    // 软禁用项: 可聚焦、可被读屏发现, 但激活(点击/回车)不产生任何动作
    if (softDisabledKeys.has(String(info.key))) return
    // 点过菜单项后焦点该交给对话框/被操作对象, 看门狗必须停手
    interactedRef.current = true
    onClick?.(info)
  }

  useEffect(() => {
    if (!open) return
    interactedRef.current = false
    openerRef.current = (document.activeElement as HTMLElement) ?? null
    /*
     * antd 不会替上下文菜单移动焦点; 少了它方向键会落到页面其它控件上, Escape 也收不到。
     * 两件事必须同时做, 否则线上仍会失效:
     *   1) 延后到本轮 effect(含父组件)跑完之后再 focus —— 在 effect 内同步 focus 会被父组件的
     *      焦点恢复抢走(实测 antd Tabs 会在 focus 成功 8ms 后把焦点抢回标签);
     *   2) 只 focus 一次不够, focus() 调用成功 ≠ 焦点留得住, 所以在时间窗内持续校验:
     *      焦点一旦跑到弹层外就重新落到第一个可用项; 焦点已在弹层内(例如用户按方向键移动)
     *      则不干预。窗口结束后不再介入, 避免与用户后续操作打架。
     */
    let cancelled = false
    const deadline = Date.now() + 700
    let timer = 0
    const watch = () => {
      if (cancelled || interactedRef.current) return
      const popup = popupRef.current
      markSoftDisabledItems()
      if (popup && !popup.contains(document.activeElement)) focusFirstItem()
      if (Date.now() < deadline) timer = window.setTimeout(watch, 20)
    }
    timer = window.setTimeout(watch, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [focusFirstItem, markSoftDisabledItems, open])

  const restoreFocus = () => {
    const target = returnFocusRef?.current ?? openerRef.current
    target?.focus?.()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      // 焦点在菜单内时由这里收敛: 关闭并把焦点还回调用上下文
      event.stopPropagation()
      setOpen(false)
      restoreFocus()
      return
    }
    if (event.key !== 'Tab') return
    /*
     * APG: Tab/Shift+Tab 必须关闭菜单并把焦点交还页面顺序。
     * 这里刻意不 preventDefault —— 先把焦点还给打开者, 浏览器随后照常从它继续移动焦点,
     * 这样焦点走向与原生 Tab 完全一致(rc-menu 会吞掉 Tab, 所以必须在捕获阶段处理)。
     */
    event.stopPropagation()
    setOpen(false)
    restoreFocus()
  }

  return (
    <Dropdown
      disabled={disabled}
      menu={{
        items: normalizedItems,
        ...(onClick ? { onClick: handleMenuClick } : {}),
        'aria-label': ariaLabel,
      }}
      open={open}
      onOpenChange={setOpen}
      popupRender={(menu) => (
        <div
          className="app-context-menu"
          ref={attachPopup}
          onKeyDownCapture={handleKeyDown}
        >
          {menu}
        </div>
      )}
      trigger={triggers ?? ['contextMenu']}
    >
      {children}
    </Dropdown>
  )
}
