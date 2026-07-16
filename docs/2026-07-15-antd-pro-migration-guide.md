# Ant Design Pro 渐进式迁移指南

## 1. 目标

在不重写现有 ERP 业务逻辑的前提下，引入 Ant Design ProComponents，统一页面结构、查询区域、表格、表单和设计规范，逐步减少重复的页面代码与自定义样式。

本次迁移优先保证：

- 现有业务行为、权限、路由和数据请求保持不变。
- 以 Ant Design 6 Design Token 作为唯一视觉标准。
- 通过可复用的 Pro 页面组件逐页迁移，不进行一次性全量替换。
- 每个阶段均可独立验证和回滚。

## 2. 技术决策

### 2.1 保留现有应用架构

继续使用：

- React 19
- TypeScript 6
- Vite 8
- TanStack Router
- TanStack Query
- Zustand
- i18next
- Ant Design 6

当前阶段不迁移 Umi Max。Umi Max 会同时影响构建、路由、权限、初始化和请求体系，与现有架构重叠较大，不能直接解决页面视觉不一致问题。

### 2.2 引入 ProComponents

当前锁定版本：

```text
@ant-design/pro-components 3.1.14-2
```

选择该版本的原因：

- peer dependency 明确支持 `antd ^6.0.0`。
- 支持 React 18 及以上版本。
- 稳定版 `2.8.10` 只声明支持 antd 4/5，不能用于当前项目。

该版本仍是预发布版本，因此必须精确锁定，不使用 `^` 或 `~` 自动升级。升级前必须重新执行类型检查、Lint、构建和浏览器回归检查。

## 3. 当前第一阶段实现

### 3.1 按路由加载 Pro 上下文

Pro 页面继续位于现有 `AppAntdProvider` 内，因此可以继承当前 Ant Design 主题和区域设置。`PageContainer` 在已迁移页面内部创建 Pro 上下文，确保：

- ProComponents 继承当前 Ant Design 主题。
- 深色模式跟随现有 Ant Design Token。
- Pro 页面容器统一使用 16px 内容间距。
- Ant Design 中文/英文区域设置可以继续由现有配置控制。

禁止在全局应用入口直接挂载 `ProConfigProvider`。全局挂载会让未使用 ProComponents 的登录页和普通业务页也依赖完整 Pro 分块。Pro 上下文、组件和样式必须随已迁移路由按需加载。

### 3.2 统一页面容器

新增 `AppProPage`，作为业务页面使用 Pro `PageContainer` 的唯一入口。

新页面不要直接重复编写标题、说明和外层间距：

```tsx
<AppProPage
  title={t('example.title')}
  description={t('example.description')}
>
  <ExampleContent />
</AppProPage>
```

如页面需要独立样式，只允许添加表示业务语义的 `className`：

```tsx
<AppProPage
  className="example-page"
  title={t('example.title')}
  description={t('example.description')}
>
  <ExampleContent />
</AppProPage>
```

### 3.3 样板页面

`SystemParametersView` 是第一阶段迁移样板：

- 页面标题和说明由 `AppProPage` 统一输出。
- 原有 Tabs 及三个设置子页面保持不变。
- 通用设置、编号规则、OSS 设置的读取和保存逻辑均未修改。

## 4. 统一设计规范

### 4.1 Design Token

所有页面必须遵守以下基础规范：

| 项目 | 规范 |
|---|---|
| 基础字号 | 14px |
| 控件高度 | 32px |
| 控件圆角 | 6px |
| 卡片、弹窗圆角 | 8px |
| 间距 | 4 / 8 / 16 / 24 / 32px |
| 页面内容间距 | 16px |
| 主色 | `colorPrimary` |
| 状态色 | `colorSuccess` / `colorWarning` / `colorError` / `colorInfo` |

禁止在业务页面中直接硬编码：

- 颜色值，例如 `#1677ff`、`#ffffff`。
- 随意的阴影和圆角。
- 不属于 4px 间距网格的魔法数字。
- 模拟 Ant Design 组件外观的自定义按钮、输入框或标签。

确需覆盖视觉样式时，优先级如下：

1. Ant Design 全局 Token。
2. Ant Design Component Token。
3. ProComponents Token。
4. 语义化 CSS 类。

### 4.2 页面模板

页面统一收敛为以下四类：

1. 列表页：页面标题、查询区、操作区、表格、分页。
2. 编辑页：页面标题、分组表单、明细表格、底部操作栏。
3. 详情页：页面标题、状态区、详情字段、明细、操作记录。
4. 设置页：页面标题、页签或分类导航、设置内容、保存操作。

同一页面只能有一个主要操作按钮。次要操作使用默认按钮、文本按钮或下拉菜单。

## 5. 组件使用策略

### 5.1 优先使用 ProComponents 的场景

- 标准查询表格：`ProTable`
- 标准编辑表单：`ProForm`
- 详情字段展示：`ProDescriptions`
- 统一页面外壳：`PageContainer`，通过项目封装的 `AppProPage` 使用

### 5.2 继续使用原生 antd 的场景

- 动态行项目编辑器
- 复杂 ERP 单据工作区
- 打印模板编辑和预览
- 附件上传、拖拽和预览
- 强业务规则驱动的复合交互

不得为了使用 ProComponents 而把清晰的业务组件改成复杂配置。ProComponents 只负责减少标准页面样板代码，不承载领域规则。

## 6. 分阶段迁移计划

### 阶段一：基础设施与样板页

- [x] 安装并精确锁定 ProComponents 3 预发布版本。
- [x] 接入按路由加载的 Pro 上下文。
- [x] 新增统一 `AppProPage`。
- [x] 迁移系统参数页外壳。
- [x] 建立独立 ProComponents 样式入口。

### 阶段二：标准列表页

评估结果：

- [x] API Key 列表迁移到 `ProTable`。
- [x] 会话管理迁移到 `ProTable`，保留会话统计区。
- [x] 用户账号列表迁移到 `ProTable`。
- [x] 编号规则和上传规则迁移到 `ProTable`。
- [x] 打印模板完成评估，保留现有主从列表，不迁移为 `ProTable`。

只有满足以下条件的页面才迁移到 `ProTable`：

- 查询条件和列定义可以稳定声明。
- 分页、排序、加载状态能够映射到现有 API。
- 不需要在表格内部实现复杂编辑器。
- 迁移后代码量和状态复杂度确实下降。

### 阶段三：标准表单

- [x] API Key 新建表单的标准字段迁移为 `ProForm` 字段。
- [x] 编号规则和上传规则编辑表单迁移为 `ProForm`。
- [x] 保留现有表单实例、后端校验和权限判断。
- [x] 用户账号角色配置、打印模板正文、动态行项目和复杂单据编辑器完成评估并保留原生 Ant Design。

### 阶段四：布局评估

在至少三个列表页稳定运行后，再评估是否使用 `ProLayout` 替换部分应用外壳。默认不替换现有 `AppLayout`，除非可以证明：

- 顶部/侧边导航均可完整覆盖。
- 编辑任务页签行为不退化。
- 全局搜索、个人设置、水印和会话状态均可保留。
- 构建产物和首屏性能满足现有基线。

本轮已经开始并完成静态评估，结论是继续保留 `AppLayout`：

- 当前 `AppLayout` 与 `AppLayoutHeader` 共约 567 行，但其中大部分是业务外壳能力，不是可由 `ProLayout` 直接删除的展示样板。
- 现有外壳同时支持侧边导航和顶部导航，并承载编辑任务页签、全局搜索、个人设置、水印、后端在线状态及会话守卫。
- 新迁移的列表页尚未完成登录后浏览器回归，不满足“至少三个列表页稳定运行”的实施前置条件。
- 此时引入 `ProLayout` 会形成两套导航状态映射，不能证明代码量、状态复杂度或首屏体积下降。

因此阶段四的交付物是“保留 `AppLayout`”的架构决策，不引入第二套布局实现。后续只有在浏览器回归完成且具备可量化收益时才重新开启 `ProLayout` 实施。

## 7. 性能约束

- 重型 Pro 页面继续通过现有路由动态导入。
- 不在应用入口直接渲染 `ProTable`、`ProForm` 等重型组件。
- 默认使用包公开导出。当前 `PageContainer` 是受控例外：ProComponents 3 预发布版的根导出会把未使用的 ProTable、ProForm 等模块带入共享分块，因此暂时使用其 ESM 组件入口；升级稳定版时必须重新验证并优先恢复公开根导出。
- Vite 的 Ant Design 手动分块规则必须排除 `@ant-design/pro-components`，让 Pro 代码跟随动态路由加载，避免未迁移页面承担 ProComponents 下载成本。
- 每一阶段记录构建产物大小，避免 ProComponents 被错误打入首屏公共包。
- 查询和远端状态继续由 TanStack Query 管理，不同时引入另一套请求缓存模型。

## 8. 验证要求

由于仓库测试文件政策禁止恢复或新增活动测试文件，每一阶段至少执行：

```bash
pnpm typecheck
pnpm lint
antd lint ./src --format json
pnpm build
```

浏览器回归至少覆盖：

- 中文与英文。
- 浅色与深色主题。
- 侧边导航与顶部导航。
- 1440px 桌面宽度和窄屏布局。
- 页面切换后滚动、页签和弹窗状态。

## 9. 版本升级规则

升级 ProComponents 前必须：

1. 检查目标版本的 `peerDependencies`。
2. 确认其支持当前 antd 与 React 版本。
3. 阅读变更记录，重点检查 ProTable、ProForm、PageContainer、ProLayout。
4. 在单独阶段完成升级，不与业务功能混合修改。
5. 完整执行类型检查、Lint、构建和浏览器回归。

在 ProComponents 3 发布稳定版前，不允许自动跟随 beta 标签。

## 10. 回滚方案

第一阶段可以按以下顺序回滚：

1. 将 `SystemParametersView` 恢复为原有标题和 Tabs 外壳。
2. 删除 `AppProPage` 和 ProComponents 集成样式。
3. 删除 `@ant-design/pro-components` 依赖并重新生成锁文件。

回滚不得影响现有 Ant Design 主题、业务组件、TanStack Router、TanStack Query 或 Zustand 状态。

## 11. 第一阶段验证记录

验证日期：2026-07-15。

已通过：

- `pnpm typecheck`
- `pnpm lint`
- `antd lint ./src --format json`，无错误、无弃用、无可访问性问题
- `pnpm build`
- `git diff --check`
- 本地 Vite 根路径、登录路径和系统参数路径 HTTP 烟雾检查

构建结果：

- `SystemParametersView` 异步脚本约 88.47kB，gzip 约 29.80kB。
- Pro 页面样式约 0.39kB，gzip 约 0.17kB。
- `index.html` 和 `AppLayout` 构建产物均不直接引用 ProComponents，路由隔离检查通过。

已知验证限制：

- 本地后端 `127.0.0.1:11211` 未运行，无法登录并完成系统参数页的数据加载、主题切换和交互视觉回归。
- Ant Design CLI 报告 6 个既有警告：5 个反馈 API 上下文使用提示、1 个 OSS Select 关闭虚拟滚动的性能提示；本阶段未新增相关警告。

## 12. 第二至第四阶段实施记录

实施日期：2026-07-15。

### 12.1 页面外壳

以下顶层页面已统一使用 `AppProPage`：

- 系统参数
- 权限管理
- 安全中心
- 打印模板
- 独立 API Key 页面
- 独立会话管理页面
- 独立编号规则页面

安全中心和系统参数中的嵌入页面继续复用同一业务组件，通过 `embedded` 模式避免嵌套 `PageContainer` 和重复标题。

### 12.2 标准列表

`ProTable` 只接管表格、卡片和工具栏结构。以下行为保持不变：

- TanStack Query 的缓存键、启用条件和刷新方式。
- 服务端分页参数和现有分页文案。
- 权限判断、二次验证、撤销、删除和详情跳转。
- 会话自动刷新和统计数据请求。

打印模板明确不迁移为 `ProTable`。该页面是模板列表、活动项、详情面板、预览、复制、JSON 上传和模板编辑的复合工作区，转换为声明式列配置不会减少状态或领域代码。

### 12.3 标准表单

API Key 和编号规则只将可稳定声明的输入、选择、数字输入与文本域迁移为 ProForm 字段。资源分组、预设联动、角色数据范围、模板正文等复杂业务交互继续使用原生 Ant Design 组件。

### 12.4 代码量判断

ProComponents 本轮主要压缩页面外壳、卡片、工具栏和字段样板，不会替代 API、权限、校验、缓存和领域状态。迁移目标不是追求总代码行数的机械下降，而是让新增标准列表和表单不再复制结构代码。

本轮源代码变更为新增 416 行、删除 337 行，净增加 79 行。净增加主要来自：

- 独立路由与嵌入页共用的 `embedded` 边界。
- ProColumns 对原始领域值的显式类型适配。
- `ProLayout` 评估和页面外壳一致性处理。

这说明在保留现有 TanStack Query、工具栏和领域状态的前提下，首次迁移不会自动减少总代码行数。后续新增同类页面可以直接复用 Pro 结构；若要继续压缩存量代码，应单独评估把查询条件收敛到 ProTable 搜索表单，而不是绕过现有查询缓存。

生产构建记录：

| 构建产物 | 原始体积 | gzip |
|---|---:|---:|
| ProTable 共享异步分块 | 252.40 kB | 77.23 kB |
| `AppProPage` 异步分块 | 14.03 kB | 4.76 kB |
| API Key 路由自身分块 | 22.35 kB | 7.84 kB |
| 会话管理路由自身分块 | 8.66 kB | 3.33 kB |
| 编号规则路由自身分块 | 13.80 kB | 5.38 kB |
| 用户账号异步分块 | 41.33 kB | 14.13 kB |

路由自身分块不包含共享依赖，不能直接作为页面总传输体积。`index.html` 与 `AppLayout` 仍未直接引用 `ProTable` 或 `AppProPage` 分块，未迁移页面不承担 ProComponents 的首屏下载成本。

本轮前端服务可访问，后端端口有响应但受保护接口返回 403；同时执行环境没有 X Server，Playwright 的可视浏览器模式无法启动。因此登录后中英文、深浅主题、双导航和窄屏回归仍需在具备有效登录态和图形环境时完成。

## 13. 公共层收敛记录

实施日期：2026-07-16。

本轮在不改变 Vite、TanStack Router、TanStack Query 和 Zustand 边界的前提下，新增以下公共能力：

- `AppProTable`：统一关闭内置搜索和设置入口、列表卡片样式及默认密度，保留完整 `ProTableProps` 透传。
- `AppProPage embedded`：独立路由与设置页嵌入模式使用同一页面组件，不再由业务页面重复判断是否渲染 `PageContainer`。
- `useResourcePermissions`：统一资源级 CRUD 权限订阅，并支持领域自定义动作。
- `useActivePageEnabled`：统一活动页签与浏览器可见性的查询启用条件。
- `useKeywordPaginationState`：统一关键词、当前页、页容量和翻页状态，不介入领域筛选或远端查询。
- `useInvalidateQueries`：只负责按查询键失效缓存；系统设置之间的联动刷新下沉到 `useSystemSettingsRefresh`。

公共层边界同步调整：

- `TableActions` 不再依赖模块系统的图标解析，领域操作负责提供自己的图标。
- `StatusTag` 不再硬编码中文 ERP 状态，只解析调用方传入的状态元数据和通用颜色别名。
- 业务模块的权限 Hook 组合 `useResourcePermissions`，避免只订阅稳定的 `can` 函数而错过权限数据更新。

`AppProTable` 当前覆盖 API Key、会话、用户账号和编号规则的 5 个表格实例。打印模板、动态行项目和单据工作区仍保持领域组件，不纳入全局配置化页面模板。
