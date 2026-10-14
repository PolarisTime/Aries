import { KeyboardCode } from '@dnd-kit/core'

/**
 * 行拖动排序的共享激活参数(取消可见拖动手柄后的"长按起拖"口径)。
 *
 * <p>整行就是拖动区之后, 行上铺着数量/备注等输入控件, 用户还可能用鼠标划选文本。
 * 若"按下即起拖", 这些正常操作全会被拖动劫持, 因此统一要求:</p>
 * <ul>
 *   <li>按住不动满 {@link ROW_DRAG_LONG_PRESS_MS} 毫秒才起拖;</li>
 *   <li>还没到阈值就位移超过 {@link ROW_DRAG_MOVE_TOLERANCE_PX} 像素(想滚动/想选文本)
 *       立即取消长按, 交还原生行为。</li>
 * </ul>
 *
 * <p>阈值与容差只在这里定义一处: 各表接线都取同一份 {@link rowDragActivationConstraint},
 * 避免"某张表的拖动忽然变得很容易误触"这种各处一份参数导致的分叉。</p>
 *
 * <p><b>为什么只剩鼠标一套口径:</b> 应用只在 Windows/macOS + Chrome/Firefox 使用
 * (无移动端、无触摸屏、无 Safari)。原先为触摸单独注册的 TouchSensor
 * (`delay: 250, tolerance: 8`) 与提货单里那份 250ms 阈值因此作废, 统一收敛为
 * **单一鼠标口径** —— 380ms 长按起拖。鼠标/触摸两套阈值并存时, 同一张表在两种输入下
 * 起拖时机不同, 是这次要消除的分叉。</p>
 *
 * <p><b>为什么不用"移动 distance 即起拖":</b> 行内单元格要支持点选与文本划选, distance
 * 口径下任何一次划选都会变成拖动; 长按 + 小容差才能把"点/选"与"拖"分开。</p>
 */
export const ROW_DRAG_LONG_PRESS_MS = 380

/** 长按期间允许的抖动像素: 超过即取消长按(避免手滑把点击/滚动变成拖动)。 */
export const ROW_DRAG_MOVE_TOLERANCE_PX = 5

/** dnd-kit 的延迟激活约束(`{ delay, tolerance }`), 单位分别为毫秒与像素。 */
export interface RowDragActivationConstraint {
  delay: number
  tolerance: number
}

/**
 * 长按激活约束: 全系统只有一个出口。
 *
 * <p>鼠标不用"移动即起拖": 用户点单元格、划选数字都会先移动, 那会把点击也变成拖动。
 * 各表(共享行拖动、提货单明细)的传感器都取这一份, 不再各写一套数值。</p>
 */
export function rowDragActivationConstraint(): RowDragActivationConstraint {
  return {
    delay: ROW_DRAG_LONG_PRESS_MS,
    tolerance: ROW_DRAG_MOVE_TOLERANCE_PX,
  }
}

/**
 * 键盘模型里的单个键: 实现(dnd-kit 按 `event.code` 注册)、声明(`aria-keyshortcuts`)
 * 与提示文案三处写法都从这里派生, 三者不可能再分叉。
 */
export interface RowDragKeyboardModelEntry {
  /** `KeyboardEvent.code`: dnd-kit 的 KeyboardSensor 按物理键码比对。 */
  code: KeyboardCode
  /** `aria-keyshortcuts` 的写法(ARIA 键盘快捷键语法, 语言无关)。 */
  ariaKeyshortcuts: string
  /** 中文提示文案里的写法。 */
  label: string
}

/**
 * 主键盘模型(ARIA APG「可拖动/可排序列表」惯例): **Space 或 Enter 拾起 → 方向键移动
 * → Space 或 Enter 放下 → Esc 取消**。
 *
 * <p>背景: 此前只提供 Alt+↑/↓ 一条键盘路径, 文档、`aria-keyshortcuts` 与实现还互不一致
 * (文档写 Alt+↑/↓, 代码却注册了 dnd-kit 的空格拾起)。只给键盘拖动本身也不满足
 * WCAG 2.2 SC 2.5.7 —— 该条要求"功能可用单指针、无需拖动完成", 因此另配了行内可点击的
 * 上移/下移按钮(见 row-reorder-buttons), 键盘模型则回归 APG 惯例。</p>
 */
export const ROW_DRAG_KEYBOARD_MODEL = {
  pickUp: [
    { code: KeyboardCode.Space, ariaKeyshortcuts: 'Space', label: '空格' },
    { code: KeyboardCode.Enter, ariaKeyshortcuts: 'Enter', label: '回车' },
  ],
  /** 放下键与拾起键同一组(APG: 同一键切换拾起/放下)。 */
  drop: [
    { code: KeyboardCode.Space, ariaKeyshortcuts: 'Space', label: '空格' },
    { code: KeyboardCode.Enter, ariaKeyshortcuts: 'Enter', label: '回车' },
  ],
  cancel: [
    { code: KeyboardCode.Esc, ariaKeyshortcuts: 'Escape', label: 'Esc' },
  ],
  move: [
    { code: KeyboardCode.Up, ariaKeyshortcuts: 'ArrowUp', label: '↑' },
    { code: KeyboardCode.Down, ariaKeyshortcuts: 'ArrowDown', label: '↓' },
  ],
} as const satisfies {
  pickUp: readonly RowDragKeyboardModelEntry[]
  drop: readonly RowDragKeyboardModelEntry[]
  cancel: readonly RowDragKeyboardModelEntry[]
  move: readonly RowDragKeyboardModelEntry[]
}

/** dnd-kit `KeyboardSensor` 的 `keyboardCodes` 取值(与 {@link ROW_DRAG_KEYBOARD_MODEL} 同源)。 */
export interface RowDragKeyboardCodes {
  start: KeyboardCode[]
  cancel: KeyboardCode[]
  end: KeyboardCode[]
}

/**
 * KeyboardSensor 的注册键位: 由 {@link ROW_DRAG_KEYBOARD_MODEL} 派生。
 *
 * <p>不直接用 dnd-kit 的默认值, 是为了让"声明的键位"和"真正注册的键位"读同一份常量 ——
 * 否则改一处忘一处, 读屏用户听到的键位与能用的键位又会不一致。</p>
 */
export function rowDragKeyboardCodes(): RowDragKeyboardCodes {
  return {
    start: ROW_DRAG_KEYBOARD_MODEL.pickUp.map((entry) => entry.code),
    cancel: ROW_DRAG_KEYBOARD_MODEL.cancel.map((entry) => entry.code),
    end: ROW_DRAG_KEYBOARD_MODEL.drop.map((entry) => entry.code),
  }
}

/**
 * 可选附加直移键: **Alt+↑ / Alt+↓**。
 *
 * <p>它只是"少按两次键"的加速路径, 不再是唯一键盘路径 —— 主路径是上面那套 Space/Enter
 * 状态机。方向键在不按 Alt 时留给表格与数字输入, 因此这一组必须带 Alt。</p>
 */
export interface RowDragKeyboardShortcut {
  /** `KeyboardEvent.key` 的取值: 实现按它匹配。 */
  key: 'ArrowUp' | 'ArrowDown'
  /** 需要按住的修饰键: 统一为 Alt。 */
  altKey: true
  /** 行内移动增量: -1 上移 / +1 下移。 */
  delta: -1 | 1
  /** `aria-keyshortcuts` 的取值(ARIA 键盘快捷键语法, 语言无关)。 */
  ariaKeyshortcuts: string
  /** 提示文案里的写法: 供 locale 文案插值, 与 aria 声明同源。 */
  label: string
}

export const ROW_DRAG_DIRECT_MOVE_SHORTCUTS: readonly RowDragKeyboardShortcut[] =
  [
    {
      key: 'ArrowUp',
      altKey: true,
      delta: -1,
      ariaKeyshortcuts: 'Alt+ArrowUp',
      label: 'Alt+↑',
    },
    {
      key: 'ArrowDown',
      altKey: true,
      delta: 1,
      ariaKeyshortcuts: 'Alt+ArrowDown',
      label: 'Alt+↓',
    },
  ]

/**
 * `aria-keyshortcuts` 取值: 由**同一份键位常量**拼出(拾起键 + 可选直移键), 再追加调用方
 * 原有的快捷键(如行菜单的 Shift+F10)。声明里的键位因此不可能与注册的键位分叉。
 */
export function rowDragAriaKeyshortcuts(original?: string): string {
  return [
    ...ROW_DRAG_KEYBOARD_MODEL.pickUp.map((entry) => entry.ariaKeyshortcuts),
    ...ROW_DRAG_DIRECT_MOVE_SHORTCUTS.map((entry) => entry.ariaKeyshortcuts),
    original,
  ]
    .filter(Boolean)
    .join(' ')
}

/** 键位模型里各组的**中文写法**(由同一份常量派生), 供提示与读屏说明插值。 */
export function rowDragKeyboardModelLabels(): {
  pickUp: string
  drop: string
  move: string
  cancel: string
} {
  const labels = (entries: readonly RowDragKeyboardModelEntry[]) =>
    entries.map((entry) => entry.label).join('/')
  return {
    pickUp: labels(ROW_DRAG_KEYBOARD_MODEL.pickUp),
    drop: labels(ROW_DRAG_KEYBOARD_MODEL.drop),
    move: labels(ROW_DRAG_KEYBOARD_MODEL.move),
    cancel: labels(ROW_DRAG_KEYBOARD_MODEL.cancel),
  }
}

/** 提示文案里的**主键盘模型**写法(由模型派生): 例 `空格/回车 拾起 · ↑/↓ 移动 · …`。 */
export function rowDragKeyboardHintText(): string {
  const { pickUp, move, cancel } = rowDragKeyboardModelLabels()
  return `${pickUp} 拾起 · ${move} 移动 · ${pickUp} 放下 · ${cancel} 取消`
}

/** 提示文案里的**可选直移键**写法(由同一份常量派生): 例 `Alt+↑ / Alt+↓`。 */
export function rowDragDirectMoveHintText(): string {
  return ROW_DRAG_DIRECT_MOVE_SHORTCUTS.map((entry) => entry.label).join(' / ')
}

/**
 * 按键 → 行内移动增量: 只认 {@link ROW_DRAG_DIRECT_MOVE_SHORTCUTS} 里的组合。
 *
 * <p>返回 `undefined` 即"不处理", 调用方据此**不调用 preventDefault**, 事件原样交还浏览器。
 * 因此下面这些一律放行:</p>
 * <ul>
 *   <li>单独的方向键(留给表格/数字输入)与空格/回车(留给拾起状态机);</li>
 *   <li>带 Ctrl / Meta / Shift 的组合 —— 判定恒为 `!ctrl &amp;&amp; !meta &amp;&amp; !shift`;</li>
 *   <li>Alt+← / Alt+→ 等不在这份清单里的方向键(浏览器后退/前进、macOS 的按词移动)。</li>
 * </ul>
 */
export function rowDragKeyboardDelta(event: {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}): -1 | 1 | undefined {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return undefined
  const match = ROW_DRAG_DIRECT_MOVE_SHORTCUTS.find(
    (entry) => entry.key === event.key && entry.altKey === event.altKey,
  )
  return match?.delta
}

/**
 * 行号(1 起算)兜底: 有序位次拿不到时(`indexOf` 为 -1)退回调用方给的兜底位次。
 *
 * <p>直接把 `indexOf` 的结果 +1 会得到 0 —— 序号列会显示「0」, 可访问名会读成
 * 「拖动第 0 行」。这里返回 `undefined` 表示"真的定位不到", 由调用方给固定文案,
 * 绝不把雪花 id 当作行号或行名播报出去。</p>
 */
export function resolveRowNumber(
  rowIds: readonly string[],
  rowId: string,
  fallbackIndex = -1,
): number | undefined {
  const index = rowIds.indexOf(rowId)
  if (index >= 0) return index + 1
  return fallbackIndex >= 0 ? fallbackIndex + 1 : undefined
}
