# antd 使用规范(本仓库约定)

本文件是 `aries` 仓库的 antd 规范落点。

原规范只存在于 `.agents/skills/antd/SKILL.md`，而该路径被 `.gitignore` 忽略，**无法提交**，新人和其他 agent 拉取仓库后看不到。本文件把其中「本仓库约定」的部分版本化：可执行门禁、规范边界、菜单类组件的无障碍契约，以及本仓库已经落地的基元。

antd 组件 API 本身不在本文件重复，写 antd 代码前仍应先用 `@ant-design/cli` 查询（`antd info` / `antd doc` / `antd demo` / `antd semantic` / `antd token`），不要凭记忆写 props。

## 可执行门禁(本仓库约定)

修改 antd 代码后必须执行下列命令；提交钩子与 CI 已接入同一检查。

| 命令 | 作用 |
| --- | --- |
| `pnpm antd:lint` | 全量扫描 `src`（a11y / deprecated / usage / performance 四类） |
| `pnpm antd:lint:staged` | 只扫暂存文件（提交钩子内部调用，等价 `antd lint --staged`） |
| `pnpm hooks:install` | 让 git 使用仓库内钩子（`git config core.hooksPath scripts/git-hooks`） |

### 提交钩子（`scripts/git-hooks/pre-commit`）

- `antd lint --staged` 发现 **a11y 或废弃 API** 违规 → **阻断提交**；
- react-doctor 仍只提示不阻断（设 `REACT_DOCTOR_STRICT=1` 可改为阻断）；
- CLI 缺失时明确打印「跳过」而不是静默通过；安装方式 `npm i -g @ant-design/cli`。

### CI（`.github/workflows/ci.yml` 的 lint 任务）

CI 里 CLI 不是仓库依赖，固定版本临时拉取，输出被 `tee` 到文件后同样按 `⚠` 判定，命中即 `exit 1`。

### 关键陷阱：`antd lint` 总是退出 0

**`antd lint` 即使发现违规也返回 0**（只打印结果），所以**不能靠退出码判定**。必须：

1. 解析输出里是否含 `⚠`（钩子与 CI 都走这条路径）；或
2. 直接读输出末尾的 `Summary:` 四类计数。

凡是把 `antd lint` 当普通 lint 用 `&&` / `set -e` 判定的写法都是无效门禁。

## 规范边界(antd 覆盖什么，不覆盖什么)

| 层 | 依据 | 说明 |
| --- | --- | --- |
| 设计语言 | `antd design.md` + `antd token` | 颜色 / 字号 / 间距 / 圆角 / 动效 token，四价值观（Natural / Certain / Meaningful / Growing） |
| 组件 API | `antd doc` / `info` / `demo` / `semantic` | 何时使用、props 与默认值、语义 DOM、示例（含 `Dropdown` 的 `contextMenu` 示例） |
| 静态检查 | `antd lint` / `antd doctor` / `antd changelog` / `antd migrate` | 废弃 API、a11y 静态项、用法、性能 |
| **交互与无障碍语义** | **W3C ARIA APG + WCAG 2.2 AA** | antd 文档**不写**键盘与焦点规范，lint 也查不出。必须自己实现并补测试 |

**冲突时以 WCAG 为准（合规优先），antd 只决定外观与 API 形态。**

具体到本仓库：菜单可访问名、打开后焦点进首项、Escape 归还焦点、禁用项可聚焦、目标 ≥24×24 这些点，antd 组件一律不提供，属于业务层责任。键盘交互的整体实施记录见 [键盘操作支持实施记录](./keyboard-accessibility-plan.md)。

## 菜单类组件无障碍契约

以下条目是右键菜单 / 上下文菜单的**验收清单**，缺一条键盘或读屏用户就用不了这个菜单。

- **菜单必须有可访问名**：`role="menu"` 上要有 `aria-label`（例如「标签 订单列表 的上下文菜单」），否则读屏只念「菜单」。
- **打开后焦点进入第一个可用项**：`focus()` 成功 ≠ 焦点留得住，还要防止被父组件的焦点恢复抢走（见下节基元）。
- **Escape 关闭并把焦点归还调用上下文**：优先回到打开菜单时的 `document.activeElement`，调用方也可以显式指定归还目标。
- **禁用项保留 `aria-disabled`**：视觉可辨、语义可读。注意 antd / rc-menu 在方向键导航时会**跳过**禁用项，而 APG 建议禁用项可聚焦但不可激活——这是已知偏差，接受它，但不得丢掉 `aria-disabled`。
- **菜单项高度 ≥24px**：满足 WCAG 2.2 SC 2.5.8（Target Size Minimum）；antd 默认尺寸已满足，不要为了「紧凑」把行高改到 24px 以下。
- **会打开对话框的项，文案带「…」**：例如「重命名…」「导出设置…」，让用户知道点了会弹层。
- **破坏性项用 `danger`**：删除、关闭全部等不可逆操作使用 antd 的 `danger` 语义色。
- **不在输入控件内劫持右键**：文本框、文本域等需要本机右键菜单（剪切/复制/粘贴），在它们上面不要挂 `trigger={['contextMenu']}`。
- **Firefox 按住 Shift 右键不触发 `contextmenu`**：Shift+F10 之外的 Shift+右键组合在 Firefox 上不会冒泡出右键菜单，不要依赖它。
- **触屏没有右键**：右键菜单**只能作为补充**。默认必须保留**可见按钮**入口，同时键盘路径（`ContextMenu` 键 / Shift+F10）可用，满足 WCAG 2.1.1（Keyboard）。
- **移除可见按钮的前提（例外条款）**：仅在界面简洁性要求更高时允许移除可见按钮，且必须同时满足两条，缺一不可：
  1. **键盘等价路径**：触发元素可聚焦（`tabIndex=0`）并响应 `Shift+F10` / 上下文菜单键 —— 直接复用 `RowContextMenuRow`（表格行）或按同一契约自行接线；
  2. **拖动类操作的“非拖动替代”**：若该能力原本靠拖动完成（排序等），菜单里必须提供等价命令（如「上移/下移」），满足 [WCAG 2.2 SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)。
  - **已知取舍（提货单拆分弹窗）**：长按手势在触屏上只能服务一个动作。该弹窗把长按让给“整行拖动排序”，因此触摸下**没有**打开行菜单的手势；拆分/合并/移除在触屏上不可用，键盘（Shift+F10）与鼠标右键仍可用。这是有意接受的限制，不是遗漏。

## 本仓库落地基元

实现位置：`src/components/ContextMenu.tsx`（测试：`src/components/ContextMenu.spec.tsx`）。

### Props 契约

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `ariaLabel` | `string` | 必填。渲染为 `role="menu"` 上的 `aria-label` |
| `items` | `MenuProps['items']` | antd 菜单项，直接透传 |
| `onClick` | `MenuProps['onClick']`（可选） | 透传；组件会先标记「用户已交互」再回调 |
| `disabled` | `boolean`（可选） | 禁用触发器 |
| `children` | `ReactElement` | 触发器；右键（或键盘上下文键）落在它或其子元素上时打开 |
| `open` | `boolean`（可选） | 受控开关，键盘调用场景由调用方置为 `true`（如标签栏的 Shift+F10） |
| `onOpenChange` | `(open: boolean) => void`（可选） | 受控模式下的开关回调 |
| `returnFocusRef` | `RefObject<HTMLElement \| null>`（可选） | 菜单关闭后焦点归还目标；缺省回到打开菜单时持有焦点的元素 |
| `onOpen` | `() => void`（可选） | 打开前回调，可用于记录被操作对象 |

### 用法样例

```tsx
<ContextMenu
  ariaLabel={t('layouts.tabs.contextMenuLabel', { name: title })}
  items={contextMenu.items ?? []}
  onClick={contextMenu.onClick}
  open={keyboardMenuTabId === tab.id}
  onOpenChange={(next) => setKeyboardMenuTabId(next ? tab.id : null)}
>
  <span className="leo-tabbar-label">{title}</span>
</ContextMenu>
```

鼠标右键由 antd 自行触发；键盘路径用 `open` / `onOpenChange` 做受控打开（`LayoutTabBar` 在容器上委托 `ContextMenu` 键与 Shift+F10，取出焦点所在标签的 `data-node-key` 再置受控状态）。

### 它替你搞定了什么

`antd Dropdown` 加 `trigger={['contextMenu']}` 只解决「能弹出来」，不满足 APG 的键盘契约。本组件补齐三件事：

1. **菜单有可访问名**——把 `ariaLabel` 写到菜单的 `aria-label` 上；
2. **打开后焦点进入第一个可用菜单项**（`[role="menuitem"]:not([aria-disabled="true"])`）——否则方向键会落到页面其它控件上，Escape 也收不到；
3. **Escape 关闭并把焦点归还给调用上下文**——关闭时 `stopPropagation`，避免连带上层弹层。

**焦点被父组件抢走会自动夺回**：antd 不会替上下文菜单移动焦点，而「在 effect 里同步 `focus()`」会被父组件的焦点恢复抢走（实测 antd `Tabs` 会在 focus 成功约 8ms 后把焦点抢回标签）。因此组件把焦点迁移**延后到本轮 effect 跑完之后**，并在约 700ms 的时间窗内持续校验：焦点一旦跑到弹层外就重新落到第一个可用项；焦点已在弹层内（用户正在按方向键）则不干预。用户点过菜单项后（多半已经打开了对话框 / 确认框），看门狗立即停手，不再抢焦点。

## 参考来源

- [W3C ARIA APG — Menu and Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)（菜单可访问名、焦点进首项、方向键、Escape 归还焦点、禁用项语义）
- [MDN — Element: contextmenu event](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event)
- [WCAG 2.2 SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)（目标 ≥24×24 CSS px）
- [WCAG 2.2 SC 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)（右键菜单只能补充，必须保留键盘等价路径；可见按钮例外条款见上文）
- [WCAG 2.2 SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)（拖动排序必须提供非拖动替代）
- [Microsoft Windows 应用设计指南 — Context menus](https://learn.microsoft.com/en-us/windows/apps/design/controls/dialogs-and-flyouts/context-menus)（上下文菜单承载次要命令，主要命令放可见入口）
- 仓库内：[键盘操作支持实施记录](./keyboard-accessibility-plan.md)
