# 键盘操作支持实施计划

## 1. 目标

为 `aries` 前端补齐键盘等价操作路径，优先覆盖业务工作台中的高频交互：

- 业务主表行选择、详情、编辑
- 父单据选择弹层
- 自定义工作区弹层
- 列设置与打印明细排序
- 焦点可视状态

目标对齐 WCAG 2.2 AA 的核心要求：

- `2.1.1 Keyboard`
- `2.1.2 No Keyboard Trap`
- `2.4.3 Focus Order`
- `2.4.7 Focus Visible`
- `4.1.2 Name, Role, Value`

本计划只覆盖前端键盘交互与可访问性语义，不修改后端接口、权限模型和业务状态规则。

## 2. 当前结论

antd 基础组件风险较低。已执行：

```bash
antd lint "./src" --only a11y --format json
```

结果为 0 个 antd a11y 规则问题。

主要缺口集中在项目自定义业务工作台层：

| 区域 | 当前行为 | 缺口 |
| --- | --- | --- |
| `BusinessGridTable` | 鼠标单击选中、双击打开 | 无行级键盘入口 |
| `ModuleParentSelectorOverlay` | 鼠标点击行导入或切换选择 | 无行级键盘入口 |
| `WorkspaceOverlay` | 支持遮罩点击和 Esc 关闭 | 缺少 dialog 语义、焦点陷阱、初始焦点和焦点恢复 |
| `ColumnSettingsPopover` | 已引入 `KeyboardSensor` | 拖拽句柄为 `span`，可聚焦和可访问名称不完整 |
| `PrintJobModal` | 拖拽句柄已是 `button` | 缺少 `sortableKeyboardCoordinates` 和更具体的拖拽名称 |
| 样式 | 少量组件有 focus 样式 | 表格行、页签、overlay 焦点可视态不统一 |

## 3. 交互规范

| 场景 | 键盘行为 |
| --- | --- |
| 主业务表格行 | `Tab` 聚焦行，`Space` 切换选中，`Enter` 打开详情或编辑 |
| 父单据选择表格 | `Tab` 聚焦行；多选时 `Space` / `Enter` 切换选择；单选时 `Enter` 导入 |
| 工作区弹层 | 打开后聚焦首个可操作元素，`Esc` 关闭顶层弹层，关闭后焦点回到触发元素 |
| 弹层内部 | `Tab` / `Shift+Tab` 不逃出当前弹层 |
| 页签 | 保留按钮结构和关闭按钮，补齐焦点样式 |
| 列设置排序 | 拖拽句柄可聚焦，`Space` 抓取或释放，方向键排序 |
| 打印明细排序 | 保留按钮句柄，补充键盘坐标 getter 和可访问名称 |
| 搜索与筛选 | 保留 `Enter` 查询，确保输入框或外层容器有可见焦点 |

## 4. 实施范围

### 4.1 P0：主业务表格行键盘支持

目标文件：

- `src/views/modules/components/BusinessGridTable.tsx`
- `src/views/modules/components/BusinessGridTable.spec.ts`
- `src/styles/module-table.css`

实施要点：

- 在 `onRow` 返回值中增加 `tabIndex: 0`。
- 增加 `onKeyDown`：
  - `Space` 调用 `onRowClick(record)`，用于切换选中。
  - `Enter` 调用 `onRowDoubleClick(record)`，用于打开详情或编辑。
- 抽出一个小的事件过滤函数，复用现有 `target.closest(...)` 逻辑，避免按钮、链接、复选框内部事件重复触发行操作。
- 保留原生 table/tr 语义，不把整行改成 `role="button"`。
- 根据选中状态补充 `aria-selected`。如果当前组件拿不到选中状态，则先只加键盘行为和焦点样式，避免引入额外状态耦合。

验收标准：

- 键盘能聚焦到数据行。
- `Space` 能切换行选中状态。
- `Enter` 能打开与双击一致的详情或编辑入口。
- 行内操作按钮、复选框、链接不会额外触发行级操作。
- 聚焦行有清晰可见的 focus ring。

### 4.2 P0：父单据选择表格键盘支持

目标文件：

- `src/views/modules/components/ModuleParentSelectorOverlay.tsx`
- `src/views/modules/components/ModuleParentSelectorOverlay.spec.ts`
- `src/styles/workspace-overlay.css`

实施要点：

- 在父单据候选表格 `onRow` 中增加 `tabIndex: 0`。
- 单选模式：
  - `Enter` 导入当前行。
- 多选模式：
  - `Space` 切换当前行选择。
  - `Enter` 同样切换当前行选择，降低学习成本。
- 保留 `.ant-table-selection-column` 和 `.parent-selector-selected-chip-remove` 的排除逻辑。

验收标准：

- 键盘能聚焦候选行。
- 单选模式下 `Enter` 与鼠标点击导入结果一致。
- 多选模式下 `Space` / `Enter` 与鼠标点击行选择结果一致。
- 选中 chip 的移除按钮仍可独立键盘操作。

### 4.3 P0：`WorkspaceOverlay` dialog 语义与焦点管理

目标文件：

- `src/views/modules/components/WorkspaceOverlay.tsx`
- `src/views/modules/components/WorkspaceOverlay.spec.tsx`
- `src/styles/workspace-overlay.css`

实施要点：

- 面板增加：
  - `role="dialog"`
  - `aria-modal="true"`
  - `aria-labelledby`
- 标题生成稳定 id，并与 `aria-labelledby` 关联。
- 打开时保存 `document.activeElement`。
- 打开后聚焦弹层内第一个可聚焦元素；如果没有可聚焦元素，则聚焦关闭按钮或面板本身。
- `Tab` 到最后一个可聚焦元素时回到第一个。
- `Shift+Tab` 从第一个可聚焦元素回到最后一个。
- 关闭后恢复焦点到打开弹层前的元素。
- `Esc` 只关闭当前顶层 overlay，避免嵌套弹层误关父层。

验收标准：

- `getByRole('dialog', { name })` 能定位到工作区弹层。
- 打开弹层后焦点进入弹层。
- `Tab` / `Shift+Tab` 不会逃出弹层。
- `Esc` 关闭弹层。
- 关闭后焦点恢复到触发按钮。

### 4.4 P0：焦点可视状态

目标文件：

- `src/styles/module-table.css`
- `src/styles/workspace-overlay.css`
- `src/styles/layout-shell.css`

实施要点：

- 为可聚焦表格行增加 `:focus-visible` 样式。
- 为 `.workspace-overlay-close:focus-visible` 增加统一样式。
- 为 `.open-page-strip-trigger:focus-visible` 和 `.open-page-strip-close:focus-visible` 增加统一样式。
- 搜索输入当前移除了 `outline`，需要通过 `:focus-within` 在外层容器补可见焦点。
- 焦点样式优先使用现有主题变量，例如 `--theme-highlight-border`、`--theme-primary`。

验收标准：

- 所有新增键盘入口都能看到清晰焦点位置。
- 焦点样式不造成布局跳动。
- 焦点颜色与当前主题保持一致。

### 4.5 P1：列设置排序键盘完善

目标文件：

- `src/views/modules/components/ColumnSettingsPopover.tsx`
- `src/views/modules/components/ColumnSettingsPopover.spec.tsx`

实施要点：

- 将拖拽句柄从 `span` 改为 `button type="button"`。
- `KeyboardSensor` 配置 `sortableKeyboardCoordinates`。
- 拖拽句柄增加具体 `aria-label`，例如：
  - `拖动列：客户名称`
  - `Drag column: Customer`
- 保留 checkbox 的可操作性，避免句柄和 checkbox 焦点冲突。

验收标准：

- 拖拽句柄可通过 `Tab` 聚焦。
- 拖拽句柄有明确可访问名称。
- 键盘排序行为可用。
- 列显示/隐藏 checkbox 不受影响。

### 4.6 P1：打印明细排序键盘完善

目标文件：

- `src/views/modules/components/PrintJobModal.tsx`
- `src/views/modules/components/PrintJobModal.spec.tsx`

实施要点：

- 保留当前按钮式拖拽句柄。
- `KeyboardSensor` 配置 `sortableKeyboardCoordinates`。
- 拖拽按钮的 `aria-label` 包含行序号或物料信息，例如：
  - `拖动第 1 行打印明细`
  - `Drag print item row 1`

验收标准：

- 打印明细排序可通过键盘完成。
- 拖拽按钮名称可区分不同行。
- 品牌替换输入框焦点不受拖拽句柄影响。

## 5. 测试计划

### 5.1 单元测试

优先补共享组件单测：

| 文件 | 覆盖点 |
| --- | --- |
| `BusinessGridTable.spec.ts` | `Space` 调用选中，`Enter` 调用打开，行内按钮/复选框不触发行操作 |
| `ModuleParentSelectorOverlay.spec.ts` | 单选 `Enter` 导入，多选 `Space` / `Enter` 切换 |
| `WorkspaceOverlay.spec.tsx` | dialog 语义、初始焦点、焦点循环、Esc 关闭、焦点恢复 |
| `ColumnSettingsPopover.spec.tsx` | 拖拽句柄为按钮，有可访问名称 |
| `PrintJobModal.spec.tsx` | 拖拽句柄名称包含行信息 |

### 5.2 E2E 测试

新增最小键盘冒烟测试：

- 登录后进入业务页。
- `Tab` 聚焦到首个数据行。
- `Space` 选中行，断言选中计数变化。
- `Enter` 打开详情或编辑 overlay。
- `Esc` 关闭 overlay。
- 断言焦点回到触发区域或合理的业务上下文。

注意：

- mock 模式当前业务集合返回空数据，适合验证导航、弹层和空状态。
- 行级 E2E 更适合真实后端数据，或者通过组件单测 mock antd Table 完成。

### 5.3 推荐验证命令

```bash
pnpm test:unit
E2E_BACKEND_MODE=mock pnpm test:e2e -- auth-shell.spec.ts
E2E_BACKEND_MODE=real pnpm test:e2e -- business-modules.spec.ts
```

如果只验证修改范围，优先运行对应单测文件，再补一次完整 `pnpm test:unit`。

## 6. 风险与约束

- 不修改后端接口，避免扩大联调范围。
- 不修改业务权限、状态判断和保存逻辑，只把现有鼠标行为映射到键盘行为。
- 不批量改造所有页面，先从共享组件入手，覆盖最大业务面。
- 不引入新的可访问性库，除非本地焦点陷阱实现变得复杂或出现嵌套弹层缺陷。
- 不把表格行改造成伪按钮，避免破坏表格语义和 antd Table 行为。
- 不新增全局快捷键，避免与浏览器、输入框、表格控件冲突。

## 7. 交付拆分

### 第一批：行级键盘入口

内容：

- `BusinessGridTable` 行键盘支持
- `ModuleParentSelectorOverlay` 行键盘支持
- 表格行 focus-visible 样式
- 对应单测

预估：0.5 到 1 天。

### 第二批：工作区弹层焦点管理

内容：

- `WorkspaceOverlay` dialog 语义
- 初始焦点、焦点陷阱、Esc、焦点恢复
- overlay focus-visible 样式
- 对应单测
- 一条 E2E 冒烟

预估：0.5 到 1 天。

### 第三批：排序与细节补强

内容：

- `ColumnSettingsPopover` 键盘排序完善
- `PrintJobModal` 键盘排序完善
- 页签和搜索框焦点样式收口
- 对应单测

预估：0.5 到 1 天。

## 8. 验收清单

- [ ] 主业务表格行可以用键盘选择。
- [ ] 主业务表格行可以用键盘打开详情或编辑。
- [ ] 父单据选择行可以用键盘导入或切换选择。
- [ ] 工作区弹层有正确 dialog 语义。
- [ ] 工作区弹层打开后焦点进入弹层。
- [ ] 工作区弹层内不会出现键盘焦点逃逸。
- [ ] 工作区弹层关闭后焦点恢复。
- [ ] 列设置排序句柄可聚焦且有明确名称。
- [ ] 打印排序句柄可聚焦且有明确名称。
- [ ] 所有新增键盘入口都有清晰焦点样式。
- [ ] 单元测试覆盖核心键盘路径。
- [ ] 至少一条 E2E 冒烟覆盖 overlay 键盘闭环。

## 9. 原则应用

- KISS：只补现有业务行为的键盘等价入口，不设计额外快捷键系统。
- YAGNI：不引入新库，不预留复杂命令面板或全局键位。
- DRY：优先改共享表格、共享 overlay、共享排序组件，避免逐页面重复改造。
- SOLID：键盘行为留在组件交互边界，业务权限与打开详情/编辑的判断仍由上层现有逻辑负责。
