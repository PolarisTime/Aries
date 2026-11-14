# 客户端本地状态同步方案（localStorage → 服务器）

> 状态：**P0/P1 已实现**（后端 `leo 82fa4590`、前端 `aries 4f19caa1` / `413285bc`），等待联调验收。
> 本文只覆盖**「界面偏好 / 本地状态」的跨设备同步**；
> 多人实时协作（Yjs / CRDT）另见 [supplier-price-realtime-collab.md](./supplier-price-realtime-collab.md)。

---

## 0. 摘要

| 项 | 结论 |
| --- | --- |
| 同步什么 | 个人设置、页签、供应商报价页视图偏好、语言/引导标记、列设置（已同步） |
| 不同步什么 | 登录凭据、业务数据缓存、**草稿**（见 §6.5） |
| 存哪里 | 复用 `sys_user.preferences_json`（JSONB），**无需 DDL** |
| 接口 | `GET/PUT /api/v2/account/settings`，按 section 分片；`/account/preferences` 保留为弃用别名 |
| 冲突 | 覆盖型按时间戳 LWW；合并型（按 supplierId）深度合并 |
| 客户端 | 本地先写（离线可用），远端防抖异步，失败退避重试，409 以服务端为准 |
| 分期 | P0：`ui` 分片；P1：`layoutTabs` + `supplierQuote`；**P2 草稿取消** |

---

## 1. 目标与非目标

**目标**

1. 换电脑 / 换浏览器登录后，界面偏好、打开的页签、供应商报价页的视图状态自动恢复；
2. 离线时所有操作照常可用，恢复联网后补发；
3. 多端同时修改时**不静默丢数据**（覆盖型可接受"后写赢"，但必须可解释）；
4. 不改动任何业务数据的读写路径。

**非目标**

- 不做"把 localStorage 整个镜像到服务端"——按数据类型分别处理；
- 不做业务数据的本地优先同步（订单、报价、库存仍以服务端为准）；
- 不做多人实时协作（单独方案）。

---

## 2. 本地状态盘点（实测）

| 键 | 内容 | 归属 | 决策 |
| --- | --- | --- | --- |
| `aries-personal-settings` | 字号 / 主题 / 导航布局 / 单据按钮位置 / 右键菜单隐藏项 | 个人 | ✅ `ui` 分片（覆盖型） |
| `aries-list-column-settings:<user>:<page>` | 列顺序、隐藏列、列宽 | 个人 | ✅ **已同步**（`/account/preferences`），只做结构迁移 |
| `aries-layout-tabs:<userId>` | 工作台打开的页签（≤10） | 个人 | ✅ `layoutTabs` 分片（覆盖型） |
| `leo-locale` | 界面语言 | 个人 | ✅ 并入 `ui` |
| `aries-price-compare-tour` | 比价页引导是否已看 | 个人 | ✅ 并入 `ui` |
| `aries:supplier-quote-tabs` | 打开的供应商页签 + 激活项 | 个人视图 | ✅ `supplierQuote`（覆盖型） |
| `aries:supplier-quote-material:<sid>` | 每个供应商停留的材质 tab | 个人视图 | ✅ `supplierQuote`（**按 supplierId 合并**） |
| `aries:supplier-quote-drafts:<sid>` | 未落库草稿 | 个人编辑态 | ❌ **不同步**（见 §6.5） |
| `aries-token` / `aries-refresh-token` / `aries-user` | 登录凭据 | 设备 | ❌ 绝不同步 |
| `aries-business-list-cache:*` | 业务列表缓存 | 设备 | ❌ 不同步（当前已是死常量，可删） |

> 供应商报价表本身是**共享数据**（多人编辑同一张表），但页签/材质只是"我怎么看这张表"，
> 属于个人视图偏好 —— 写**账户设置**，不写进共享业务表。

---

## 3. 分类原则与业界做法

业内共识是按数据性质分四类，各用不同机制：

| 类别 | 例子 | 机制 | 冲突 |
| --- | --- | --- | --- |
| 用户偏好 | 主题、字号、列宽、页签 | 账户设置 + 本地缓存 | 后写赢 / 按项合并 |
| 未提交草稿 | 文档草稿 | **服务端自动保存**为主，本地只做崩溃恢复 | 服务端为准 |
| 业务数据 | 订单、报价、库存 | 服务端唯一真相源 + 乐观锁 | 409 + 业务锁 |
| 实时协作 | 多人同改一表 | CRDT / OT | 算法解决 |

对照标杆：VS Code Settings Sync（偏好，带冲突合并）、Chrome `storage.sync`（有 8KB/项、100KB/总量配额）、
Google Docs / Excel Online（草稿即服务端自动保存，本地不留可同步草稿）、Linear（本地优先同步引擎）。

**落到我们身上**：偏好类走本文方案；草稿类**不跨端同步**；业务数据不动。

---

## 4. 服务端模型与 API

### 4.1 存哪里：复用 `sys_user.preferences_json`

```java
// UserAccount
@Column(name = "preferences_json", columnDefinition = "JSONB")
@ColumnTransformer(read = "preferences_json::text", write = "?::jsonb")
private String preferencesJson;
```

列已存在，只把结构升级为 v2（旧数据即 v1：只有 `pages`）：

```json
{
  "version": 2,
  "sections": {
    "ui":            { "value": {...}, "clientUpdatedAt": "...", "serverUpdatedAt": "..." },
    "layoutTabs":    { "value": {...}, "clientUpdatedAt": "...", "serverUpdatedAt": "..." },
    "supplierQuote": { "value": {...}, "clientUpdatedAt": "...", "serverUpdatedAt": "..." }
  },
  "pages": { "<pageKey>": { "orderedKeys": [], "hiddenKeys": [], "columnSizes": {} } }
}
```

读取时按 `version` 判定 v1/v2；写入恒为 v2。**无需 Flyway**。

### 4.2 接口

```
GET  /api/v2/account/settings
PUT  /api/v2/account/settings     # 只提交变化的 section
```

```json
// PUT 请求
{ "sections": { "ui": { "value": { "fontSize": 14, "themeMode": "system" },
                        "clientUpdatedAt": "2026-11-14T07:05:00Z" } } }
```

| 场景 | 状态码 | 客户端处理 |
| --- | --- | --- |
| 正常 | 200 | 用响应覆盖本地缓存 |
| 服务端该 section 更新更晚 | 409 | 采用服务端值 + 提示「已在其他设备更新」 |
| 单 section > 32KB / 总量 > 256KB | 413 | 停止同步并提示，不阻塞本地使用 |
| 未认证 | 401 | 只写本地，登录后重试 |

`/account/preferences` 保留为弃用别名（内部转调同一 service），避免破坏已上线客户端。

### 4.3 section 内容

```jsonc
// ui
{ "fontSize": 14, "themeMode": "system", "layoutMode": "top",
  "editorActionPlacement": "top", "locale": "zh-CN",
  "toursSeen": ["price-compare"], "contextMenu": { "hiddenActionKeys": [] } }

// layoutTabs
{ "tabs": [{ "pathname": "/sales-order", "search": "", "userPinned": true }],
  "activeTabPath": "/sales-order" }

// supplierQuote
{ "openSupplierIds": ["333229108731322368", "333229172467965952"],
  "activeSupplierId": "333229172467965952",
  "materialTabs": { "333229108731322368": { "直条": "HRB400E", "盘螺": "HRB400" } } }
```

---

## 5. 前端同步引擎

`src/services/user-settings-sync.ts`：

```
启动 → GET /account/settings（与列设置共用一次）
     → 本地先渲染，远端到达后按 section 静默替换
任意设置变更 → 写 localStorage（UI 立即生效）
            → 标记 dirty → 1s 防抖 → 合并 dirty section 一次 PUT
```

| 问题 | 处理 |
| --- | --- |
| 多账号同浏览器串号 | 本地键加 `:<userId>` 前缀，读取时做一次性旧键迁移（读旧 → 写新 → 删旧） |
| 频繁 PUT | 1s 防抖 + 单 in-flight，合并同批 section |
| 离线 | `navigator.onLine` + 失败队列；`online` 事件立即重试 |
| 失败 | 指数退避（1s/2s/4s…30s），保留 dirty，不清空 |
| 409 | 以服务端为准并提示 |
| 多标签页 | `storage` 事件同步其他标签页的本地值，避免互相覆盖 |
| 匿名/未登录 | 只写本地 |

**首登与冲突**

| 本地 | 服务端 | 处理 |
| --- | --- | --- |
| 有 | 空 | 上传（bootstrap），避免换电脑全丢 |
| 空 | 有 | 落地 |
| 都有 | 都有 | 按 section 时间戳取新；`materialTabs` 深度合并 |
| 服务端有未知 section | — | 原样保留，不丢数据（向前兼容） |

---

## 6. 各模块落点

### 6.1 个人设置（P0）

- 来源：`useUiSettingsStore`（zustand persist）+ `PersonalSettingsDisplayTab`；
- 变更点：保存时 `patchSection('ui', …)`；启动时用远端值覆盖本地（`applySettings`）；
- 兼容：老版本只读本地，不影响。

### 6.2 工作台页签（P1）

- 来源：`src/stores/layoutTabsStore.ts`（按 userId 分键，已持久化）；
- 提交：`tabs` 变化防抖 1s；恢复时按 `sanitizePersistedTabs` 同一套规则清洗（钉选/上限/失效路径）。

### 6.3 供应商报价页视图偏好（P1）

- 来源：`src/views/price-compare/supplier-quote-view-prefs.ts`；
- 提交：`openSupplierIds` / `activeSupplierId` / `materialTabs` → `supplierQuote` 分片；
- 恢复：先用当前供应商列表过滤失效 id，再落地（`materialTabs` 按 supplierId 合并，互不覆盖）；
- 边界：供应商被删除 → 自动过滤；全部失效 → 回落默认第一个。

### 6.4 报单比价（无需新增分片）

- 业务数据（单据、吨位、锁）全在服务端，本地无副本；
- 价格已改为**上游实时派生**（网价=行情同步、现货价=供应商价格表），本地不存价格；
- 本地只剩「引导已看」与列设置：`toursSeen` 并入 `ui` 分片，列设置沿用现有通路。

### 6.5 草稿：明确不做跨端同步

- 供应商报价页草稿（`aries:supplier-quote-drafts:<sid>`）保留**仅本机崩溃恢复**；
- 理由：草稿是未验证中间态，共享表中跨端合并会造出用户没确认过的价格；Excel/Google Docs 也是"输入即保存到服务端"，不存在可同步草稿；
- 保存成功后清空本地草稿（现有行为），不上传。

---

## 7. 冲突与边界

| 场景 | 行为 |
| --- | --- |
| A 端改字号、B 端改主题（同一 `ui` section） | 后写赢（同一 section 整体替换，可接受） |
| A、B 各改不同供应商的材质 tab | 深度合并，两者都保住 |
| A 端删页签、B 端新增页签 | 后写赢（页签列表整体替换），提示一次 |
| 供应商被删除 | 恢复时过滤，不报错 |
| 服务端返回未知字段 | 原样保留 |
| 离线改设置 | 本地生效，联网补发 |

---

## 8. 分期与工作量

| 期 | 范围 | 后端 | 前端 |
| --- | --- | --- | --- |
| **P0** | `ui` 分片 + `/account/settings` + 同步引擎 + 旧键迁移 | 0.5d | 1d |
| **P1** | `layoutTabs`、`supplierQuote`（合并型）；`pages` 结构迁移 | 0.5d | 1d |
| ~~P2~~ | ~~草稿同步~~ | — | 取消（见 §6.5） |

灰度：`VITE_USER_SETTINGS_SYNC` 开关，先内网账号一周，无异常再默认开。

---

## 9. 测试与验收

| 用例 | 期望 |
| --- | --- |
| 两个浏览器上下文同账号，A 改字号 → B 刷新 | 字号一致 |
| A 打开 3 家供应商、选材质 → B 刷新 | 页签与材质一致 |
| A、B 各改不同供应商材质 | 两者都保住 |
| 断网改设置 → 联网 | 补发成功，无丢失 |
| 服务端 409 | 采用服务端值并提示 |
| 单 section 超限 | 413，本地仍可用，不再重试该 section |
| 老数据（v1 只有 pages） | 正常读取，写入后升级为 v2 |
| 未登录 | 只写本地，不请求 |

门禁：`tsc`、`antd lint`（解析输出）、`eslint`、`biome`、`vitest`。

---

## 10. 明确不做

- 不同步 token / 用户信息（安全边界）；
- 不同步业务列表缓存（属于设备，且当前为死常量）；
- 不把个人视图偏好写进共享业务表；
- 不做草稿跨端同步。

---

## 11. 相关文档

- 实时协作（Yjs / CRDT）：[supplier-price-realtime-collab.md](./supplier-price-realtime-collab.md)
- 报单比价价格来源重构（已落地）：见 `leo` 提交 `045e4151`、`aries` 提交 `b0053d8f`
