# 供应商价格表：实时协作设计（Yjs CRDT）

> 状态：**M1–M6 已实现并完成真实联调**（边车 `leo c09bb3a0` / `5bf4a035` / `75c5684e`，
> Java `490d1d2d` / `a9801b2c`，前端 `aries 7e5dd259` / `74c99de4`）。供应商价格表与报单比价
> 两个房间均已用真实边车 + 真实 Java 票据 + 真实 Postgres 验证（改价/改吨位 → 文档收敛 →
> 物化落库 → 版本递增）。
> 本文对应两条需求：
> 1. 多端编辑同一份数据，**不能丢任何一次改动**；
> 2. 实时协作：多人同时改同一张表，**能看到对方光标**。
>
> 配套文档：界面偏好 / 页签等**本地状态跨设备同步**见
> [client-state-sync.md](./client-state-sync.md)（两者互不替代）。

---

## 0. 结论（TL;DR）

| 项 | 决定 |
| --- | --- |
| 冲突模型 | **Yjs CRDT**（`Y.Map` 格级文档），客户端离线可编辑、重连自动合并 |
| 服务端 | **Node 边车运行 Hocuspocus**（Yjs 官方生态框架，基于 `y-websocket` 协议），**不能纯 Java**（见 §2.2） |
| 真相源 | 协作期间 **Y.Doc 是编辑真相源**，Postgres 由物化器单向写入（供报单比价/导入/报表消费） |
| 房间粒度 | `supplier-price-list:<listId>`（**一张价格表 = 一个房间**；报价页每个品牌列各一个 session） |
| 光标 | Yjs Awareness 协议（`y-protocols/awareness`） |
| 迁移 | 影子同步 → 双写 → 切换，三阶段，带开关可回退 |

**验收口径**

- 两个浏览器上下文同账号、不同账号，分别改同一张表的不同格 → 双方立刻看到对方的值，SQL 物化值与两端一致；
- 一端断网改 5 格 → 重连后自动合并，另一端看到这 5 格，**无一丢失**；
- 同一格两人同时改 → 值按 CRDT 顺序收敛（必然只有一个），但**两条改动都留在审计日志里**，并在对方界面提示「该格刚被 X 修改」，不静默覆盖；
- 两端都能看到对方光标所在格与选区。

---

## 1. 现状与问题

### 1.1 当前写入链路

```
SupplierQuoteBoard（前端）
  └ 每格输入 → 800ms 防抖 → saveBrand(brandName)
      └ PUT /api/v2/supplier-price-lists/{id}/items   ← 整列替换 + expectedVersion
          └ SupplierPriceService.saveItems：@Version 乐观锁，冲突返回 409
```

### 1.2 根因

整列替换的语义是「我提交的是这一列的全部内容」。两个用户同时改同一列的不同格时：

- 后提交者携带的是**自己内存里的整列快照**，会把先提交者的改动覆盖掉；
- 若 `expectedVersion` 已变，则后提交者直接 409，前一个人的改动虽在库里，但后一个人要重敲。

两种结果都违反「不丢任何一次改动」。

### 1.3 现有资产（可复用）

| 资产 | 位置 | 用途 |
| --- | --- | --- |
| 价格表实体 | `leo/.../supplierprice/domain/entity/{SupplierPriceList,SupplierPriceItem}.java` | 物化目标 |
| 读接口 | `GET /supplier-price-lists/grid` | 保持不动 |
| 权限码 | `supplier-price-lists:update` | 房间写权限来源 |
| Redis | `spring-boot-starter-data-redis` 已在 pom | 多实例扇出、结构变更通知 |
| 部署方式 | 本地自托管（非 Docker）：`leo/scripts/prod.sh` + systemd + nginx 反代 `/api/` | 边车沿用同一套 |

---

## 2. 选型论证

### 2.1 为什么是 CRDT 而不是"格级 LWW + 自研同步"

需求里「不能丢任何一次改动」+「实时协作」+「弱网/离线」三条同时成立时，自研方案要自己处理：离线重放、操作顺序、幂等、增量追平、并发收敛 —— 这正是 CRDT 已经解决的问题。Yjs 在协作编辑器领域有大量生产采用（如 AFFiNE、JupyterLab 的协作能力基于它），且 Awareness 协议直接给出光标/在线名单。

代价：引入一个 Node 边车服务（§2.2），前端包体增加 `yjs`（约 30KB gzip）。

### 2.2 为什么服务端必须是 Node 边车

**已核实**：Maven Central 上没有任何 Java 端 Yjs 实现，只有 `org.webjars.npm:yjs`（前端资源打包）：

```text
GET https://search.maven.org/solrsearch/select?q=yjs
→ numFound: 1，唯一命中 org.webjars.npm:yjs（webjar，非可执行实现）
```

因此服务端的三个选项：

| 方案 | 可行性 | 结论 |
| --- | --- | --- |
| Java 实现 Yjs 同步协议 | 需自研 CRDT 编码/解码与状态向量，工程量与正确性风险都高 | ❌ |
| **Node 边车跑 Hocuspocus** | Tiptap 团队维护的 Yjs 服务端框架：同步协议、`onAuthenticate` 鉴权钩子、`onStoreDocument` 持久化钩子、Redis 水平扩展、Throttle 限流全部现成 | ✅ **采用** |
| 纯前端 P2P（WebRTC） | 无中心持久化，服务端拿不到数据，物化不了 SQL | ❌ |

> 边车只做三件事：同步、持久化文档、物化到 SQL。**不含业务规则**，业务规则仍留 Java（票据签发、权限、结构变更）。
>
> 直接用 `y-websocket` 也能跑，但鉴权、持久化、多实例扇出、限流都要自己接一遍；
> Hocuspocus 把这些做成扩展点，边车代码从「协议实现」降级为「几个钩子函数」。

### 2.4 业内框架对比（选型依据）

| 方案 | 形态 | 提供什么 | 结论 |
| --- | --- | --- | --- |
| **Hocuspocus** | 自托管 Node | Yjs 同步、鉴权钩子、持久化钩子、Redis 扩展、限流、Awareness | ✅ 采用 |
| y-sweet | 自托管单二进制（Rust）+ TS 客户端 | CRDT 存储 + S3 持久化 + token | 备选：我们仍要把文档物化进 Postgres，S3 用不上 |
| Fluid Framework（Microsoft） | 框架 + Azure Fluid Relay | DDS，Excel 的协作底座 | ❌ 绑定 Microsoft 生态，自托管重 |
| Liveblocks | SaaS | storage + presence + React hooks | ❌ 价格数据出内网 |
| ElectricSQL / PowerSync / Replicache | 数据同步引擎 | Postgres ↔ 客户端同步 | ❌ 没有光标/在线，且解决不了同格并发 |
| Supabase Realtime / Ably / Pusher | 消息 + presence | 广播、在线状态 | ❌ 合并逻辑仍要自己写 |

> 框架只省"通信层"，**不省业务层**：Yjs 文档结构、物化到 SQL、光标 UI 渲染、权限模型、审计仍需自己实现。

### 2.3 与「自研格级操作日志」方案的关系

自研方案的产物（格级审计日志 `mk_supplier_price_cell_op`）在本方案里**仍然保留**，用途从"同步机制"降级为"审计与冲突提示" —— 因为它回答的是"谁在什么时候改了这一格"，CRDT 回答的是"并发时如何收敛"，两者互补。

---

## 3. 总体架构

```
┌───────────┐   ┌───────────┐   ┌───────────┐
│ 浏览器 A  │   │ 浏览器 B  │   │ 浏览器 C  │
│ Y.Doc+    │   │ Y.Doc+    │   │ Y.Doc+    │
│ IndexedDB │   │ IndexedDB │   │ IndexedDB │
└─────┬─────┘   └─────┬─────┘   └─────┬─────┘
      │ WS /collab                    │
      └───────────────┬───────────────┘
                      ▼
        ┌──────────────────────────────┐
        │ price-collab（Node 边车）     │   :11212
        │  Hocuspocus + Awareness       │
        │  ├ 文档持久化（快照+增量）    │
        │  ├ 物化器（Yjs → SQL）        │
        │  └ JWT 校验 / 房间 ACL        │
        └───────┬──────────────┬───────┘
                │              │
         Redis pub/sub     Postgres（leo 库）
        （多实例扇出）      ├ mk_supplier_price_collab_update
                            ├ mk_supplier_price_collab_update / _cell_op
                            ├ mk_supplier_price_item   （物化值）
                            └ mk_supplier_price_cell_op（审计）
                      ▲
                      │ 只读（grid/lowest-quotes）
                ┌─────┴─────┐
                │ leo 后端  │ :11211
                └───────────┘
```

**数据流**

1. 前端 `POST /api/v2/supplier-price-lists/{listId}/collab-sessions` 拿短票据（Java 签发，201）；
2. 前端连 `wss://<host>/collab?room=supplier-price-list:<listId>&token=…`；
3. 边车校验票据 → 加入房间 → 同步 Y.Doc（快照 + 增量）；
4. 用户改格 → 本地 Y.Doc 立即生效 → 增量广播给房间内其他客户端；
5. 边车 debounce 500ms → 物化器把**差异**写入 `mk_supplier_price_item` 与审计表；
6. 报单比价 / 导入 / 报表继续读 SQL，**接口不变**。

---

## 4. 文档模型

### 4.1 Y.Doc 结构

```ts
// room = `supplier-price-list:${listId}`（一张价格表 = 一个房间）
doc.getMap<unknown>('meta')          // { listId, supplierId, brandName, quotedOn, warehouse, version }
doc.getMap<Y.Map<unknown>>('cells')  // key = cellKey，值 = CellValue（整格对象）
```

```ts
type CellValue = {
  price: number | null          // null = 不报价（与 0 元严格区分）
  priceStatus: PriceStatus      // NORMAL / PENDING / BUNDLED / NEGOTIABLE / OUT_OF_STOCK
  remark: string
}

/** 与 SQL 唯一索引 uk_supplier_price_item_key 对齐；用 \u0000 分隔避免字段值包含分隔符 */
const cellKey = (c: {category, material, spec, length}) =>
  [c.category, c.material, c.spec, c.length].join('\u0000')
```

**为什么一格是一个对象、而不是把三个字段拆成三个 Y.Map**：一次输入代表"这一格现在的完整状态"，拆字段会造出"价格更新了、状态没更新"的中间态；整格替换在 UI 上只有一个输入框，语义更贴合。

### 4.2 房间与列的关系（实现口径）

- **一个房间 = 一张价格表（`listId`）**；供应商报价页上一列品牌 = 一张价格表 = 一个 session，
  前端按 listId 逐表建连，某张表拿不到票据时该表继续走 REST，其余表照常协作；
- 表头元数据（listId/supplierId/brandName/quotedOn/warehouse/version）放 `meta`，格子只放
  `cells[cellKey]`；
- 品牌列的新增/删除、行的增删、规格变更都属于**结构变更**，不通过 CRDT 自由写：仍走 Java REST，
  写成功后由前端重建/刷新该表文档（避免两个写者）；
- 历史设计里的「一个供应商一个房间 + `lists → cells` 两层结构」**未采用**：两层结构让物化要
  遍历多张表、也让"某品牌列不可写"的权限粒度变粗；一张表一个房间与现有 REST 资源一一对应。

### 4.3 文档规模估算

单供应商：1–3 品牌 × 2 品类 × 2 材质 × 12 规格 × 2 定尺 ≈ 100–300 格 → 文档 < 100KB，Yjs 增量更新通常 < 2KB。**容量不是问题**。

---

## 5. 持久化

### 5.1 表结构（`leo/src/main/resources/db/migration/V218__supplier_price_collab.sql`）

边车（`leo/collab-server`）启动时按 `REQUIRED_COLUMNS` 做 strict 自检，列名必须与下面一致：

```sql
-- 文档快照：一行一个房间（边车 upsert）
CREATE TABLE mk_supplier_price_collab_doc (
  room       TEXT PRIMARY KEY,              -- 例：supplier-price-list:374015303912259584
  state      BYTEA NOT NULL,                -- Y.encodeStateAsUpdate 的完整文档
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 增量更新（append-only，审计/补放用）
CREATE TABLE mk_supplier_price_collab_update (
  id          BIGSERIAL PRIMARY KEY,
  room        TEXT NOT NULL,
  update_blob BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sp_collab_update_room_id ON mk_supplier_price_collab_update (room, id);

-- 格级审计（谁在什么时候把哪一格改成了什么）
CREATE TABLE mk_supplier_price_cell_op (
  id            BIGINT PRIMARY KEY,         -- 边车雪花，无默认值
  list_id       BIGINT NOT NULL,
  cell_key      TEXT NOT NULL,
  price         NUMERIC(12,2),
  price_status  VARCHAR(16),
  remark        VARCHAR(255),
  actor_id      BIGINT,
  list_revision BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sp_cell_op_list ON mk_supplier_price_cell_op (list_id, created_at);
CREATE INDEX ix_sp_cell_op_cell ON mk_supplier_price_cell_op (cell_key);
```

> 边车默认 `COLLAB_SCHEMA_CHECK=strict`：缺表/缺列直接启动失败并打印缺什么，避免"跑起来但读不到数据"。
> 边车雪花机器号（`COLLAB_SNOWFLAKE_WORKER_ID`，默认 7）必须与 Java `leo.id.machine-id`（默认 0）错开。

### 5.2 加载与压缩

```text
加载：SELECT state FROM mk_supplier_price_collab_doc WHERE room=?（无快照时按 §6 从 SQL 价格表生成初始文档）
压缩：每 24h（或增量 > 500 条）时 Y.encodeStateAsUpdate(doc) → 写快照 → 删除 id<=last_update_id 的增量
```

### 5.3 断电/崩溃语义

Yjs 更新是**幂等合并**的：重复 apply 同一条 update 不改变文档状态。边车在事务里"先写 update 再广播"（或先广播后写，二者都安全），崩溃重启后按快照+增量重建即可。

---

## 6. 物化（Yjs → SQL）

### 6.1 唯一写者原则

**协作开启期间，`mk_supplier_price_item` 只能由物化器写。** Java 的 `PUT /{id}/items` 对协作中的表直接返回 `409 COLLAB_ACTIVE`，避免两个写者互相覆盖。

### 6.2 物化算法

```ts
// 每个房间一份内存镜像（启动时从 SQL 加载）
lastMaterialized: Map<listId, Map<cellKey, CellValue>>

onDocUpdate(room):
  scheduleDebounce(500ms, () => {
    const next = readDocSnapshot(doc)             // 纯读取，无副作用
    const diffs = diff(lastMaterialized, next)    // 只取变化的格
    if (!diffs.length) return
    await db.tx(async (tx) => {
      for (const [listId, cells] of groupByList(diffs)) {
        await bumpListVersion(tx, listId)                        // version = version + 1
        await upsertItems(tx, listId, cells)                     // INSERT ... ON CONFLICT DO UPDATE
        await deleteClearedItems(tx, listId, cells)              // price IS NULL 且无状态/备注
        await insertAudit(tx, listId, cells, actorOf(transaction)) // 审计
      }
    })
    lastMaterialized = next
  })
```

**幂等性**：物化基于"状态差异"而非"操作日志"，所以重放同一条 Yjs update、或边车重启后重新物化，都不会产生重复审计或错误值。

**失败处理**：事务失败 → 保留 `dirty` 标记，指数退避重试（上限 60s），期间该房间的后续改动合并到下一次；**永不清空 dirty**。

### 6.3 变更广播给 Java 侧

物化事务提交后，边车 `PUBLISH collab:list-changed <listId>`；Java 侧监听（需要时）用于失效缓存或推送报表刷新。**第一期可不接**。

---

## 7. 权限与安全

### 7.1 短票据（Java 签发）

```
POST /api/v2/supplier-price-lists/{listId}/collab-sessions
→ 200 {
    "room": "supplier-price:333229108731322368",
    "url": "wss://host/collab",
    "token": "<JWT，5 分钟有效>",
    "writable": true,
    "color": "#1677ff"
  }
```

JWT claims：

```json
{ "sub": "<userId>", "name": "张三", "room": "supplier-price-list:<listId>",
  "writable": true, "color": "#1677ff", "exp": 1794647, "perms": ["supplier-price-lists:update"],
  "rooms": ["supplier-price:333229108731322368"], "exp": 1731000000 }
```

- 签名算法 HS256，密钥与 Java/边车共享（环境变量 `COLLAB_JWT_SECRET`）；
- 票据只授予**这一个房间**，不授予"全部价格表"；
- 无 `supplier-price-lists:update` 权限时 `writable=false`，边车只读转发（可用于看板/大屏）。

### 7.2 边车侧的强制校验

| 校验 | 失败处理 |
| --- | --- |
| JWT 签名/过期 | 拒绝连接（4401） |
| `rooms` 不含请求房间 | 拒绝（4403） |
| 写消息但 `writable=false` | 丢弃该 update 并回 `forbidden` |
| 单条 update > 256KB | 拒绝（防止恶意/异常载荷） |
| 连接频率/房间数 | 每用户 ≤ 5 连接，超出拒绝 |

### 7.3 审计与留存

`mk_supplier_price_cell_op` 永久保留（按需按年归档）；文档快照与增量保留 90 天后压缩为快照。

---

## 8. 冲突语义

| 场景 | 行为 |
| --- | --- |
| 两人改**不同格** | 两条改动都保留（CRDT 天然合并） |
| 两人改**同一格** | 按 Yjs 确定性顺序收敛（同一份文档在两端最终一致）；**审计表留下两条记录**；输的人界面提示「该格刚被张三改为 3280」 |
| 一端离线改、另一端在线改**同一格** | 重连后按 CRDT 顺序合并，同上提示 |
| 一端离线改**不同格** | 全部保留 |
| 结构变更（加列/删列） vs 在线编辑 | 结构变更走 Java + 房间重建，编辑者会收到 `doc-reset` 并自动重载（提示"表格结构已更新"） |
| 撤销/重做 | `Y.UndoManager`，**只撤销自己的操作**（`trackedOrigins: [localClient]`），不会撤掉别人的改动 |

> 明确不做：同格"文本级合并"（价格是标量，合并没有业务意义）；跨列事务（一次提交多列属于"保存整表"的语义，需产品另议）。

---

## 9. 前端改造

### 9.1 新增文件

```
src/views/price-compare/collab/
  collab-doc.ts          # 文档 schema 读写（cellKey、CellValue、结构校验）
  useSupplierPriceCollab.ts  # provider 生命周期、awareness、连接状态
  RemoteCursors.tsx      # 远端光标/选区渲染
  collab-status.ts       # 连接状态 → UI 文案（在线/重连中/离线）
```

### 9.2 状态替换

| 现在的实现 | 替换为 |
| --- | --- |
| `drafts`（本地草稿） | Y.Doc（本地即时生效，无需草稿） |
| `savedValues`（保存后回显） | Y.Doc 的 `cells` |
| `history`（自定义撤销栈） | `Y.UndoManager` |
| `saveBrand` 800ms 整列 PUT | `${listId}.cells.set(cellKey, value)` + 广播 |
| `setSaveState`（保存中/失败） | 连接状态（connected/offline/reconnecting）+ 物化延迟提示 |
| 本地草稿 `supplier-quote-drafts` | 停用（协作开启时不再写）；仅保留崩溃恢复兜底 |

### 9.3 交互细节

- **输入**：`onChange` 立即写本地 Y.Doc（本地输入框不受网络影响），不阻塞打字；
- **远端光标**：awareness 节流 80ms 上报 `{cursor: {listId, cellKey}, selection: {rowRange, colRange}}`；远端渲染为彩色边框 + 姓名气泡（颜色由 Java 分配的 `color` 决定，同用户跨端一致）；
- **在线名单**：工具栏显示「在线：张三、李四」，无人时显示「仅你」；
- **冲突提示**：收到远端对"当前正在输入格"的更新时，不覆盖输入框，标 `conflict` 角标，失焦后再决定采用值并提示；
- **断线**：输入继续写本地 Y.Doc + `y-indexeddb`；顶部条显示「离线，改动将在重连后同步」；
- **降级**：`collab-sessions` 返回 404/405/501（功能未开）→ 自动回退到现有 REST 自动保存，用户无感。

### 9.4 初始化顺序

```
mount → GET /grid（现有只读接口，先渲染骨架）
      → POST /collab-sessions（拿票据，201）
      → new Y.Doc() + IndexeddbPersistence + WebsocketProvider
      → provider.on('synced') → 用 Y.Doc 覆盖渲染（以文档为准）
```

先用 REST 渲染骨架，避免等 WS 连接造成白屏；`synced` 后以文档为准（此时 REST 数据必然已被文档包含，因为物化是同一份数据）。

---

## 10. 后端改造（`leo`）

### 10.1 新增接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/v2/supplier-price-lists/{listId}/collab-sessions` | 签发房间票据（`@RequirePermission(SUPPLIER_PRICE_LISTS_READ)`，返回 201） |

### 10.2 写接口开关

`PUT /{id}/items` 增加判断：若该 `listId` 有活跃协作房间（Redis key `collab:active:<listId>`），返回 `409 COLLAB_ACTIVE`，body 带 `collabUrl`，前端据此切到协作模式。**保留该接口**用于"协作未开启/降级"场景。

### 10.3 结构变更（加列/删列）

```
Java addColumn/removeColumn → 写 SQL → PUBLISH collab:structure <supplierId>
→ 边车收到 → 重建该房间 Y.Doc（从 SQL 读全量）→ 广播 doc-reset
```

重建期间（毫秒级）禁止写入，用 Redis 短暂锁 `collab:rebuild:<room>` 保护。

### 10.4 读接口

`GET /grid`、`GET /lowest-quotes` **完全不变**（读物化后的 SQL），报单比价、导入、报表无需改动。

---

## 11. 迁移与灰度

### 阶段 0：影子同步（1 周，不改 UI）

- 边车上线，从 SQL 生成 Y.Doc，**只读**镜像；
- 物化器写 SQL 后与"上一版 SQL 值"逐格比对，差异写日志（期望：零差异）；
- 目的：验证文档模型与物化正确性，零用户影响。

### 阶段 1：协作开关（灰度到单个供应商）

- 环境变量/表字段 `collab_enabled` 控制哪些供应商走协作；
- 开启的供应商：UI 用 CRDT，REST 写返回 409；
- 观察指标：物化延迟、冲突提示次数、断线重连成功率。

### 阶段 2：全量

- 全部供应商切换；REST 写接口保留为降级通道。

### 回滚

- 开关关闭 → 前端回退 REST 自动保存；SQL 始终是完整物化值，**回滚不丢数据**；
- Y.Doc 数据保留（不删表），再次开启可续。

---

## 12. 部署与运维

| 项 | 方案 |
| --- | --- |
| 进程 | 新增 systemd unit `price-collab.service`（Node 20，端口 11212），与 `leo-backend.service` 并列 |
| 反代 | nginx 增加 `location /collab/ { proxy_pass http://127.0.0.1:11212; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }` |
| 配置 | `COLLAB_JWT_SECRET`、`DATABASE_URL`、`REDIS_URL`、`COLLAB_MAX_DOC_BYTES` |
| 健康检查 | `GET /healthz` → 连接数、房间数、物化队列长度 |
| 指标 | Prometheus：`collab_connections`、`collab_updates_total`、`collab_materialize_lag_ms`、`collab_materialize_failures` |
| 日志 | JSON 行日志，含 room/user/update 字节数（不记价格值） |
| 备份 | 跟随 Postgres 每日备份；快照表可重建（增量在 update 表） |
| 容量 | 单房间 <100KB；20 并发编辑者约 200 次更新/分；CPU/内存压力极小 |

---

## 13. 测试计划

| 层 | 用例 |
| --- | --- |
| CRDT 单元（Node） | 两个 doc 并发改不同格/同格 → 乱序 apply 后收敛一致；离线 50 条改动重连合并；撤销只撤自己 |
| 物化单元 | 差异计算正确；重复 apply 幂等；价格 null vs 0 区分；删格（不报价）正确落库；审计 actor 正确 |
| 持久化 | 快照+增量重组文档等价；压缩后删除旧增量不影响加载；崩溃重启不丢 |
| Java | 票据签发/过期/权限；`COLLAB_ACTIVE` 409；结构变更通知 |
| E2E（Playwright 双上下文） | 两端同时编辑 → 互相看到值与光标；同格并发 → 收敛 + 提示；断网编辑 → 重连合并；降级开关 → 回退 REST |
| 故障注入 | Redis 挂（多实例失联）、Postgres 慢（物化堆积）、边车重启（客户端自动重连） |

门禁沿用仓库现有：`pnpm antd:lint`（解析输出）、`tsc`、`biome`、`eslint`、`vitest`；`leo` 侧 `mvn test` + Flyway 校验。

---

## 14. 里程碑与工作量

| 里程碑 | 内容 | 预估 |
| --- | --- | --- |
| **M1 边车骨架** | Hocuspocus + 鉴权钩子 + 持久化钩子 + 健康检查 | 0.5d |
| **M2 物化器** | 差异写 SQL + 审计 + 失败重试 + 影子比对脚本 | 1.5d |
| **M3 前端接入** | Y.Doc 替换草稿/自动保存 + UndoManager + 降级 | 2d |
| **M4 协作体验** | Awareness 光标/选区 + 在线名单 + 冲突提示 | 1d |
| **M5 Java 侧** | 票据接口 + 409 + 结构变更通知 + V218 迁移 | 0.5d |
| **M6 回归** | 双端 E2E + 故障注入 + 影子比对验收 | 1d |
| 合计 | | **≈6.5 人日**（不含评审与灰度观察；采用框架后 M1 省约 1 人日） |

---

## 14.1 与「报单比价」协作的关系（范围更小）

报单比价已按「实时价格」重构（网价=行情同步、现货价=供应商价格表实时派生，报价单只存规格与吨位，
见 `aries` 提交 `b0053d8f` / `leo` 提交 `045e4151`）。因此它的协作范围比供应商价格表**小得多**：

| 维度 | 供应商价格表 | 报单比价 |
| --- | --- | --- |
| 可编辑内容 | 价格 / 状态 / 备注（格级） | **规格、吨位、行结构**（价格全只读） |
| 文档模型 | `lists → cells` 两层 Y.Map | `items: Y.Array` + `ton` |
| 冲突面 | 任意两格可能并发 | 只有吨位与行结构 |
| 预估工期 | 6.5 人日 | **≈4 人日**（复用同一 Hocuspocus 边车与物化框架） |

排期建议：先做供应商价格表（把平台跑稳），再复制到报单比价；反过来会把平台问题与业务问题混在一起排查。

## 14.2 联调记录（2026-11-15 实测）

环境：本机 Vite 3100 + Spring Boot 11211 + 边车 11212（COLLAB_STORE=postgres，V218 已由 Flyway 执行）。

| 场景 | 结果 |
| --- | --- |
| 票据 | `POST /supplier-price-lists/{listId}/collab-sessions` 与 `/quote-sheets/{id}/collab-sessions` 均 201，`room=supplier-price-list:<listId>` / `quote-sheet:<sheetId>` |
| 鉴权 | 合法票据 synced；篡改签名 → 4401「协作票据无效：signature verification failed」；房间不符 → 4403；无票据 → 4401「缺少协作票据」 |
| 双端收敛 | 两个客户端各改一格，双方 `cells` 收敛为同一值；清理（删格/还原）也同步 |
| 物化（供应商价） | 改价 → `mk_supplier_price_item` 更新、`mk_supplier_price_cell_op` 审计 1 行（cell_key 为 `\u001f` 转义形态）、`mk_supplier_price_list.version` +1 |
| 物化（报价单） | 改吨位/备注 → `mk_quote_item` 更新、`mk_quote_sheet.version` +1、`updated:1` |
| 页面 | `/supplier-quote` 与 `/price-compare` 在开关开启时状态条显示「实时协作中」，边车日志有「协作连接已认证」 |

联调中修掉的三个真实缺陷（都已提交）：
1. **provider 必须显式 `attach()`**：传 `websocketProvider` 时 `manageSocket=false`，构造函数不会自动 attach —— 症状是 WS 已连上、`synced` 永远 false、边车无认证日志（`aries 74c99de4`）；
2. **取票 POST 缺 `X-Idempotency-Key`** → 422 → 静默降级为 REST（`aries 74c99de4`）；
3. **cellKey 的 NUL 写进 PG text 列** → 整个物化事务回滚（`leo 5bf4a035`，NUL→US 可逆转义）。

## 15. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 新增 Node 服务带来运维复杂度 | 中 | 只做同步/物化，无业务逻辑；单进程 + systemd + 健康检查；日志/metrics 齐备 |
| 物化失败导致 SQL 落后 | 高 | dirty 标记 + 指数退避 + 告警（lag > 5s）；影子阶段先验证正确性 |
| 两写者（REST vs 物化器） | 高 | 协作开启即拒绝 REST 写；Redis 标记 `collab:active` |
| 同格并发"丢一方"的误解 | 中 | 审计表留证 + 界面提示；文档明确"同格必然单值，但改动不丢记录" |
| Yjs 协议版本升级不兼容 | 中 | 前后端 `yjs` 版本锁定（package.json + 边车 lockfile 同步升级） |
| 前端包体增加 | 低 | 仅价格表路由动态 import `yjs`/`y-websocket`/`y-indexeddb` |
| 大文档/异常载荷 | 低 | 单 update ≤256KB、文档 ≤2MB、超限拒绝并告警 |

---

## 16. 附录

### 16.1 WS 消息（y-websocket 协议之上）

Yjs 使用 `y-protocols/sync` 与 `y-protocols/awareness` 的标准二进制消息；业务层不自定义消息，房间参数通过握手 URL 传递：

```
wss://host/collab?room=supplier-price-list:<listId>&token=<jwt>
```

### 16.2 配置项

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `COLLAB_PORT` | 11212 | 监听端口 |
| `COLLAB_JWT_SECRET` | — | 与 Java 共享 |
| `COLLAB_MAX_DOC_BYTES` | 2MB | 单房间文档上限 |
| `COLLAB_MATERIALIZE_DEBOUNCE_MS` | 500 | 物化节流 |
| `COLLAB_SNAPSHOT_INTERVAL_MS` | 24h | 快照压缩周期 |
| `COLLAB_AWARENESS_TTL_MS` | 30000 | 他人光标消失时间 |

### 16.3 参考实现

- Yjs 文档与 API：<https://docs.yjs.dev/>
- `y-websocket`（连接器与服务器工具）：<https://github.com/yjs/y-websocket>
- `y-indexeddb`（离线持久化）：<https://github.com/yjs/y-indexeddb>
- Maven Central 检索结果（确认无 Java 端实现）：<https://search.maven.org/solrsearch/select?q=yjs&rows=20&wt=json>
