<!-- antd-cli setup start -->
## Ant Design CLI Skill

Use the shared Ant Design skill at `.agents/skills/antd/SKILL.md` before working on Ant Design code in this repository.

The skill teaches agents when and how to call `@ant-design/cli` commands such as `antd info`, `antd doc`, `antd demo`, `antd token`, `antd semantic`, and `antd changelog`.

修改 antd 代码后必须执行 `pnpm antd:lint`（或至少在暂存范围内执行 `pnpm antd:lint:staged`）；提交钩子（`pnpm hooks:install`）与 CI 的 lint 任务已接入同一检查，a11y 或废弃 API 违规会阻断。`antd lint` 发现违规仍返回 0，判定必须解析输出。

antd 只覆盖设计语言、组件 API 与静态检查；键盘交互与无障碍语义（菜单可访问名、打开后焦点进首项、Escape 归还焦点、禁用项可聚焦、目标 ≥24×24 等）以 W3C ARIA APG 与 WCAG 2.2 AA 为准，需自行实现并补测试。

详细规范见 docs/antd-conventions.md。

<!-- antd-cli setup end -->

## Skill Policy

Use only the skills listed below for this repository. Treat every unlisted skill as disabled unless the user explicitly names it for the current turn.

Frontend skills:
- `antd`, `react-best-practices`, `react-patterns`, `react-state-management`
- `typescript-expert`, `typescript-pro`, `frontend-api-integration-patterns`
- `frontend-dev-guidelines`, `senior-frontend`
- `react-component-performance`, `web-performance-optimization`
- `ui-a11y`, `accesslint-audit`, `wcag-audit-patterns`
- `e2e-testing`, `playwright-skill`, `javascript-testing-patterns`, `test-automator`

Backend skills:
- `backend-architect`, `backend-dev-guidelines`, `backend-development-feature-development`
- `backend-security-coder`, `api-design-principles`, `api-patterns`, `api-endpoint-builder`
- `openapi-spec-generation`, `api-documentation`
- `database-design`, `database-migration`, `database-migrations-sql-migrations`
- `postgresql`, `postgres-best-practices`, `postgresql-optimization`
- `sql-pro`, `sql-optimization-patterns`
- `test-driven-development`, `unit-testing-test-generate`, `testing-patterns`

Full-stack, architecture, and quality skills:
- `architecture`, `software-architecture`, `architecture-patterns`, `improve-codebase-architecture`
- `production-code-audit`, `codebase-audit-pre-push`
- `security-audit`, `api-security-best-practices`, `security-scanning-security-sast`
- `application-performance-performance-optimization`, `performance-engineer`
- `docker-expert`, `deployment-engineer`, `deployment-procedures`
- `bash-defensive-patterns`, `bash-pro`, `mcp-builder`, `mcp-tool-developer`

## 主数据表单与弹层排版规范

主数据类「新建 / 编辑」界面（项目资料、供应商资料、客户资料、物流商资料、仓库资料、材料资料…）
统一按本节排版。改动这些页面之前先读本节，不要再各自发明尺寸。

依据：[antd 布局（网格基数 8）](https://github.com/ant-design/ant-design/blob/master/docs/spec/layout.zh-CN.md)、
[antd 亲密性（8 / 16 / 24）](https://github.com/ant-design/ant-design/blob/master/docs/spec/proximity.zh-CN.md)、
[antd 数据录入（长说明用信息图标）](https://github.com/ant-design/ant-design/blob/master/docs/spec/data-entry.zh-CN.md)、
[NN/g 表单十条](https://www.nngroup.com/articles/web-form-design/)。

### 结构与类名

- 弹层用 `WorkspaceOverlay`，面板加 `className="workspace-overlay-panel--form-dialog"`：居中对话框、圆角、
  宽 `min(1040px, 100% - 24px)`、高 `auto` + `max-height: min(900px, 100% - 24px)`。
- 尺寸按**覆盖层容器**算，禁止用 `100vh`：覆盖层位于顶栏与页签之下，用视口高度会让底边超出内容区，
  把「取消 / 保存」裁到屏幕外。
- 表单加 `className="master-form"`，字段栅格用 `<Row gutter={[16, 8]}>`。
- 高度跟内容走：字段少（如客户 9 个）不该被撑成整屏留一大片空白；字段多（物流商 19 个）用满上限。
  1080p（内容区 939px）下上限 900px 正好一屏放得下，小屏由容器封顶。
- 取消 / 保存**走 `WorkspaceOverlay` 的 `footer` 槽**固定在面板底部；写在表单末尾会随表单滚走。
- 控件密度沿用全局 `--app-control-height`，不要单独给某一页加 `size="small"`。

### 间距：只用 8 的倍数

- 区块内横向 16px（中号间距）、纵向 8px（小号间距），区块之间 24px（大号间距）。
- 字段自身不得再叠加 antd 默认的 `margin-bottom: 24px`（`master-form` 已置 0），否则会出现 20px 这种
  既非 8 的倍数、又难解释的间距。
- **行级留白只用阶梯值**（`--space-xxs/xs/sm/md/xl/2xl/3xl` = 4/8/12/16/20/24/32/48）：列表页筛选行与
  操作行之间、工具栏与表格之间、卡片网格的行列间距都属于此类。实测踩过：筛选条件之间 10px、行间 2px、
  工具栏下 2px，看起来"没有间距"。
- `--space-2/6/10` 是文件里标注的「细粒度非 4px 阶梯」值，**只用于组件内部微调**（图标↔文字、徽标内边距、
  头像↔名字），不要用在行与行、块与块之间。

### 列宽：只用 24 栅格的整数倍

- 普通字段一律 `span={6}`（四等分）；只有「一件占一行」的字段用 `span={12}` / `span={24}`。
- 禁止 5 / 7 / 8 / 4 这类按内容微调的宽度：各行竖边落在不同位置，扫读时显得零碎。
- 确需按内容给宽度时用「合并多列」表达：例如标签有 11 个汉字的「休市按前一交易日结算」用 `span={12}`。

### 分区（区块标题）

- 语义相关的字段放同一区块：区块标题用
  `<Divider className="master-section-divider" plain titlePlacement="start">`，外层包
  `<section className="master-form-section">`（首个区块标题不带顶部间距）。
- 配置驱动的表单（`MasterDataEditor`）给字段声明 `section`：相邻且相同的 `section` 自动归为一组，
  **未声明则保持平铺** —— 未分区的模块不会因此改变外观。`section` 已打通
  `ModuleFormFieldDefinition`（配置侧）与 `MasterFormFieldSpec`（编辑器侧）两处类型。
- 区块标题文案共用 `modules.formSections.{basic,contact,settlement,vehicle,other}`，不要各页另造 key。
- 字段少（≤9）且语义单一时可以不分区，不要为分区而分区。

### 字段说明

- **长说明**（一句话及以上）用 `Form.Item` 的 `tooltip` 做成标签旁的 ⓘ；同一份文案**同时**作为 `extra`
  下发 —— CSS 会把 `extra` 视觉收起，但 antd 会把它写进控件的 `aria-describedby`，读屏用户照旧能听到。
  只写 `tooltip` 会让读屏用户拿不到说明，只写 `extra` 会让每个字段多占一行。
- **短提示**（短于一句、输入格式要求）才直接放 `extra`。

### 遮罩

- 遮罩 = 压暗 + 背景虚化：`background: var(--ant-color-bg-mask)` + `backdrop-filter: blur(4px)`，
  让背后密集的表格退成色块、前景对话框浮起来。
- 遮罩是 `<button class="workspace-overlay-mask">`，靠 `position: absolute; inset: 0` 铺满内容区。
  **任何给 `button` 加 `position: relative` 的全局补丁都必须排除它**（`src/styles/touch-targets.css` 已排除）：
  被覆盖后遮罩会塌成 0×0，背景既不被压暗也不被虚化。

### 无障碍与文案

- label 方向按**表单类型**统一，同一类型内不得各自发明：
  - **主数据弹层**（`.master-form`，字段少、以阅读为主）：`layout="vertical"`，标签在控件上方。
  - **单据编辑器**（`.editor-form-shell`，一张单据几十个字段的密集录入）：`layout="horizontal"`，标签与控件同行。
    密集录入场景下纵向标签会让每个字段多占一行，一屏可见字段数近乎减半，反而增加滚动与漏填。
  - 两者方向不同是**有意的**，不要为了"全站统一"把其中一侧改成另一侧；但同类之间必须一致。
  - 横向布局的对齐由 `.editor-form-shell .ant-form-item-label` 统一提供（`min-width: var(--app-editor-label-width)` + 右对齐 + 省略号），**不要**再用全角空格给标签补白（`padLabel`）——那会占掉标签的可见宽度预算，在纵向布局下还会变成可见左缩进。
- 命中区 ≥24×24（WCAG 2.5.8），沿用 `touch-targets.css` 的补丁，不要为某个页面关掉它。
- 新增文案（区块标题、说明、按钮）必须同时补 `zh-CN` 与 `en-US`。

### 业务口径只在一处计算

- 同一业务口径（例如吨位的「未开」= 本单该明细行报单吨位 − 已开吨位）必须**只有一个计算处**，
  多个渲染出口（表格列、悬浮 tooltip、ⓘ 弹层、保存载荷）都取同一个函数的结果。
- 实测踩过：吨位「未开」在列与 tooltip 上已改成「报单 − 已开」，ⓘ 弹层里还留着早先被否掉的
  「订货 − 已开」，同一行两个数字打架（列上 12、弹层 10.240）。
- 出口越多越要按此约束；新增出口时先找现有口径函数，不要就地另写一遍算式。
- 测试要**用能区分两种口径的数据**锁定：例如订货 40 / 报单 45，两个公式同值（订货 = 报单）时断言是绿的，
  漏掉分叉的就是这种"恰好同值"的用例。

### 测试写法

- 弹层内定位控件**按字段名**，不要按顺序：antd 会把字段名注入控件 id，用
  `input#<fieldName>` 再 `closest('.ant-select')` 之类定位。按下标（第几个下拉 / 第几个输入框）定位会在
  排版调整后静默选错字段 —— 实测曾把必填项漏掉，保存被校验拦住却看不出原因。
- 排版改动后至少断言：面板尺寸、是否溢出、字段数、区块标题、按钮是否在面板内。

### 自检清单（改完必做）

1. 在 3100 的真实环境逐页打开弹层截图，确认居中、按钮固定、背景虚化、分区正确、无横向滚动；
2. 记录面板尺寸与 `body.scrollHeight / clientHeight`：溢出应为 0，确因内容过多而滚动时要在说明里给出原因；
3. `pnpm antd:lint` 必须解析输出（它发现违规仍返回 0）；`tsc`、`biome`、`eslint`、`vitest` 全绿后再提交。

## Mandatory Pre-Development Check

在开始任何前端代码修改、调试、重启服务、提交或部署前，必须先完成开发前检查；检查未完成时不得改文件、启动长任务或执行提交/部署。

- 执行 `git status --short --branch`，确认当前分支、是否有未提交改动、是否 ahead/behind/diverged。
- 如果仓库落后上游且工作区干净，必须先执行 `git pull --ff-only`，把本地快进到远端最新提交；禁止产生 merge commit。
- 如果仓库存在未提交改动、分支分叉、rebase/merge 进行中，必须先向用户说明状态并等待明确处理指令；不得自动覆盖、回滚或强推。
- release 后继续开发前，必须先拉取 `semantic-release` 生成的版本提交，例如 `chore(release): x.y.z`，确保本地 `package.json` 与 `CHANGELOG.md` 和远端一致。
- 检查完成后，在工作更新中说明分支、同步结果和工作区是否干净，再继续开发。

## Mandatory PGP-Signed Commits

- **所有提交必须使用 PGP/GPG 签名。** 仓库已配置 `commit.gpgsign=true` 与 `user.signingkey`；禁止使用 `--no-gpg-sign`、`-c commit.gpgsign=false` 或任何临时关闭签名的方式提交。
- 提交前确认 gpg-agent 已解锁。若签名失败（例如 batchmode 无法输入密码、`gpg failed to sign the data`），必须停止提交并请用户解锁 gpg-agent 后重试；不得改以未签名方式提交或跳过签名。
- 每次提交后自检：`git log --format='%h %G? %s' -n <数量>` 中 `%G?` 必须为 `G`（或受信任密钥的 `U`）；出现 `N`（无签名）、`B`（坏签名）视为不合格，必须修复后再继续。
- 若某次提交被判定未签名，优先用 `git commit --amend -S --no-edit`（仅限尚未推送的提交）补救；已推送到共享远端的历史不得为补签名而重写。
- 历史遗留的未签名提交保持原样，不重写已共享历史；本规则约束今后所有新增提交。

## 门禁判据：脏工作区用定向集合

- 工作区存在他人未提交改动时，"全量门禁全绿"不可复现（并发写入 + flake 都会让全量反复变红）。此时以**本次改动范围内的定向测试集**作为合并判据；全量门禁只在干净工作区运行，并在最终交付前由 Lead 统一跑一次并留证。
- 出现跨文件 `tsc` / `vitest` 失败时，先 `git status --short` 与 `git diff --name-only` 判断归属；属于他人未提交改动的一律不改、不绕、不屏蔽，只如实标注"非本次改动"。
- 报数字要精确：门禁结论写"本次定向集合全绿"，不要把"脏工作区里恰好绿"说成"全量通过"。

## 同一口径只在一处实现（新增检查项）

- 任何"同一业务语义"出现第二份实现，都视为缺陷。已知的真实形态包括：同一段留白被父级 `padding` 与末行 `margin` 各加一次；同一公式（吨位/金额/权限）在多个出口各算一遍；同一枚举/文案映射在多处各写一份。
- 修法是**收敛到唯一出口**，并在注释里写明"该出口是唯一来源"；不要用"两处保持一致"来代替收敛。
- 评审每个新增或改动项时，至少问一次：这份判断/数值**有没有第二个地方也算过**？
