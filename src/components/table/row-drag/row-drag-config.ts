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
 * 键盘移动的**单一键位清单**: 实现(按键匹配)、声明(`aria-keyshortcuts`)与提示文案
 * (locales 的 `common.rowDragSort.keyboardHint`)都只从这一份派生。
 *
 * <p>背景: 此前文档只写 Alt+↑/↓, 代码却同时注册了 dnd-kit 的"空格拾起"(KeyboardSensor)
 * 并把 `Space` 写进 `aria-keyshortcuts` —— 声明的键位与真正生效的键位是两套。现在统一为
 * **只有 Alt+↑/↓ 一套**: 空格不再拾起拖动, 也不出现在任何声明里。</p>
 */
export interface RowDragKeyboardShortcut {
  /** `KeyboardEvent.key` 的取值: 实现按它匹配。 */
  key: 'ArrowUp' | 'ArrowDown'
  /** 需要按住的修饰键: 统一为 Alt(单独的方向键要留给表格与数字输入)。 */
  altKey: true
  /** 行内移动增量: -1 上移 / +1 下移。 */
  delta: -1 | 1
  /** `aria-keyshortcuts` 的取值(ARIA 键盘快捷键语法, 语言无关)。 */
  ariaKeyshortcuts: string
  /** 提示文案里的写法: 供 locale 文案插值, 与 aria 声明同源。 */
  label: string
}

export const ROW_DRAG_KEYBOARD_SHORTCUTS: readonly RowDragKeyboardShortcut[] = [
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
 * `aria-keyshortcuts` 取值: 由键位清单拼出, 再追加调用方原有的快捷键(如行菜单的
 * Shift+F10)。声明里的键位因此不可能与清单分叉。
 */
export function rowDragAriaKeyshortcuts(original?: string): string {
  return [
    ...ROW_DRAG_KEYBOARD_SHORTCUTS.map((entry) => entry.ariaKeyshortcuts),
    original,
  ]
    .filter(Boolean)
    .join(' ')
}

/** 提示文案里的键位写法(如 `Alt+↑ / Alt+↓`): 供 locale 的 keyboardHint 插值, 与清单同源。 */
export function rowDragKeyboardHintText(): string {
  return ROW_DRAG_KEYBOARD_SHORTCUTS.map((entry) => entry.label).join(' / ')
}

/**
 * 按键 → 行内移动增量: 只认键位清单里的组合。
 *
 * <p>返回 `undefined` 即"不处理" —— 空格、单独的方向键、带 Ctrl/Meta/Shift 的组合都走这里,
 * 因此"哪些键能移动行"始终只有清单一个出口。</p>
 */
export function rowDragKeyboardDelta(event: {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}): -1 | 1 | undefined {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return undefined
  const match = ROW_DRAG_KEYBOARD_SHORTCUTS.find(
    (entry) => entry.key === event.key && entry.altKey === event.altKey,
  )
  return match?.delta
}
