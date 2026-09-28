import { type RefObject, useEffect, useRef } from 'react'

/**
 * 输入/可编辑控件: 焦点落在这些控件内时, 全局快捷键必须让位给控件自身行为
 * (例如输入框内的原生撤销), 否则会越过用户意图直接改业务数据。
 */
const EDITABLE_TARGET_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
].join(', ')

/** 事件目标是否位于输入框 / 文本域 / 可编辑区域内。 */
export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(EDITABLE_TARGET_SELECTOR))
}

/**
 * 主修饰键: Ctrl 或 macOS 的 Cmd。
 * 带 Alt 的组合(如 Ctrl+Alt+Z)属于系统/其它工具快捷键, 不参与本应用快捷键判定。
 */
export function hasShortcutModifier(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey
}

/** 容器是否挂在 `[hidden]` 面板之下(多标签 keep-alive 用 hidden 切换显隐)。 */
export function isShortcutContainerVisible(
  container: HTMLElement | null | undefined,
): boolean {
  if (!container) return true
  return !container.closest('[hidden]')
}

function isDocumentVisible(): boolean {
  return (
    typeof document === 'undefined' || document.visibilityState !== 'hidden'
  )
}

export interface GlobalShortcutOptions {
  /** 关闭时不注册任何监听(如只读态)。 */
  enabled?: boolean
  /** 键位判定; 返回 true 时才会执行 run。 */
  match: (event: KeyboardEvent) => boolean
  /** 命中后的动作; preventDefault 由动作自行决定(保存类快捷键需无条件拦截浏览器默认行为)。 */
  run: (event: KeyboardEvent) => void
  /** 焦点位于输入控件/可编辑区域时不处理; 默认 false(编辑器保存快捷键需在表单内生效)。 */
  ignoreEditableTarget?: boolean
  /** 本标签页/面板当前是否为可见页(如比价页只在激活 Tab 内响应)。 */
  isActive?: () => boolean
  /** 快捷键所属容器; 容器处于 `[hidden]` 面板内时不处理。 */
  containerRef?: RefObject<HTMLElement | null>
  /** 默认在捕获阶段监听, 保证先于输入控件与页面其它处理器命中。 */
  capture?: boolean
}

/**
 * 全局快捷键基元。
 *
 * <p>在 window 上注册快捷键前统一收敛四类越界风险(缺一条就会在用户没看这个页面时
 * 改到数据):</p>
 * <ol>
 *   <li>未启用(只读/编辑器未打开)直接不注册;</li>
 *   <li>输入法组合态(<code>isComposing</code>)与焦点在输入控件内时让位给控件自身行为;</li>
 *   <li>后台标签页(<code>document.visibilityState === 'hidden'</code>)或处于 `[hidden]` 面板内不响应;</li>
 *   <li>非当前激活页(<code>isActive</code>)不响应。</li>
 * </ol>
 */
export function useGlobalShortcut({
  enabled = true,
  match,
  run,
  ignoreEditableTarget = false,
  isActive,
  containerRef,
  capture = true,
}: GlobalShortcutOptions): void {
  // match/run 每次渲染都会是新闭包(依赖 props), 用 ref 取最新值,
  // 避免监听器频繁解绑重绑, 也避免闭包捕获到过期的 enabled/saving 等状态。
  const latestRef = useRef({
    enabled,
    match,
    run,
    ignoreEditableTarget,
    isActive,
    containerRef,
  })
  useEffect(() => {
    latestRef.current = {
      enabled,
      match,
      run,
      ignoreEditableTarget,
      isActive,
      containerRef,
    }
  })

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const current = latestRef.current
      if (!current.enabled) return
      // 中文等输入法组合过程中的按键不参与快捷键判定
      if (event.isComposing) return
      if (!isDocumentVisible()) return
      if (
        current.ignoreEditableTarget &&
        isEditableShortcutTarget(event.target)
      ) {
        return
      }
      if (!isShortcutContainerVisible(current.containerRef?.current)) return
      if (current.isActive && !current.isActive()) return
      if (!current.match(event)) return
      current.run(event)
    }

    window.addEventListener('keydown', handleKeyDown, capture)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, capture)
    }
    // containerRef 通过 latestRef 读取最新值, 无需作为依赖
  }, [enabled, capture])
}
