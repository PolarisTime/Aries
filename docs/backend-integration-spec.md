# 后端对接文档（按当前前端页面）

## 1. 文档目的

本文件不是抽象业务蓝图，而是给后端直接对接当前前端页面使用的落地文档。

文档基准来自以下代码：

- `/src/router/routes.ts`
- `/src/config/business-pages.ts`
- `/src/views/modules/BusinessGridView.vue`
- `/src/config/print-template-targets.ts`

结论优先级：

1. 当前前端页面实际字段
2. 当前前端实际接口调用方式
3. 旧版业务设计文档

## 2. 先说当前前端真实情况

当前前端大部分业务页都复用了统一底座 `BusinessGridView`，所以后端第一阶段最稳妥的做法，不是马上拆很多零散接口，而是先按统一模块接口对接。

当前前端与之前沉淀的业务文档有几个明显差异，后端必须按这里执行：

- 当前没有独立的“价格核准”菜单页和独立 `price-approvals` 路由。
- 当前价格核准语义被折叠进销售链路：
  - `sales-outbounds.status = 价格核准`
  - `sales-orders.status = 完成销售`
- 当前供应商、客户、物流方主数据页面仍是简化字段版，还没有完全落你前面定的税号、开户行、银行账号、简写那套正式档案结构。
- 当前客户页面也还没有单独的“客户项目子表”页面。
- 报表模块的真实 `moduleKey` 是：
  - `inventory-report`
  - `io-report`
- 打印模板是独立接口，不走统一模块接口。

如果后端现在就按前面更完整的业务文档一次性建模，也可以，但接口返回必须兼容当前前端字段，否则前端会直接空白或列不显示。

## 3. 统一接口约定

### 3.1 认证相关

前端当前认证接口如下：

- `POST /auth/login`
- `POST /auth/login-2fa`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/ping`

请求头：

- `Authorization: Bearer <accessToken>`

登录请求体：

```json
{
  "loginName": "admin",
  "password": "明文或前端当前处理后的密码"
}
```

登录第一步返回分两种：

1. 不需要 2FA，直接返回 token：

```json
{
  "code": 0,
  "data": {
    "accessToken": "access-token",
    "refreshToken": "refresh-token",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "user": {
      "id": "1914876201459236001",
      "loginName": "admin",
      "userName": "系统管理员",
      "roleName": "系统管理员",
      "menuCodes": ["dashboard", "materials"],
      "actionMap": {
        "materials": ["VIEW", "CREATE", "EDIT"]
      }
    }
  }
}
```

2. 需要 2FA，只返回临时令牌：

```json
{
  "code": 0,
  "data": {
    "requires2fa": true,
    "tempToken": "temp-token"
  }
}
```

第二步验证接口：

- `POST /auth/login-2fa`

```json
{
  "tempToken": "temp-token",
  "totpCode": "123456"
}
```

刷新登录态：

- `POST /auth/refresh`

```json
{
  "refreshToken": "refresh-token"
}
```

退出登录：

- `POST /auth/logout`

```json
{
  "refreshToken": "refresh-token"
}
```

权限与菜单补充接口：

- `GET /system/menus/tree`

该接口返回当前用户可见菜单树及动作列表，前端导航应优先以该接口为准。

### 3.2 统一业务模块接口

当前前端通用业务页已经不是旧版 `/rest/modules/{moduleKey}` 统一网关模式，而是直接调用各模块自己的 REST 资源。

当前真实实现以 `/src/api/business.ts` 的 `moduleEndpoints` 为准，例如：

- `materials -> /materials`
- `suppliers -> /suppliers`
- `customers -> /customers`
- `carriers -> /carriers`
- `warehouses -> /warehouses`
- `purchase-orders -> /purchase-orders`
- `purchase-inbounds -> /purchase-inbounds`
- `sales-orders -> /sales-orders`
- `sales-outbounds -> /sales-outbounds`
- `freight-bills -> /freight-bills`
- `purchase-contracts -> /purchase-contracts`
- `sales-contracts -> /sales-contracts`
- `supplier-statements -> /supplier-statements`
- `customer-statements -> /customer-statements`
- `freight-statements -> /freight-statements`
- `receipts -> /receipts`
- `payments -> /payments`
- `general-settings -> /general-settings`
- `operation-logs -> /operation-logs`
- `permission-management -> /permission-management`
- `user-accounts -> /user-accounts`
- `role-settings -> /role-settings`
- `inventory-report -> /inventory-report`
- `io-report -> /io-report`
- `receivables-payables -> /receivables-payables`

可写模块调用方式：

- 列表：`GET /{resource}`
- 详情：`GET /{resource}/{id}`
- 新增：`POST /{resource}`
- 更新：`PUT /{resource}/{id}`
- 删除：`DELETE /{resource}/{id}`

只读模块：

- `operation-logs`
- `permission-management`
- `inventory-report`
- `io-report`
- `receivables-payables`

#### 列表接口

请求参数：

- `page`
- `size`
- 以及各模块自己的查询参数，例如 `keyword`、`status`、`startDate`、`endDate`

分页从 `0` 开始。

返回结构必须是：

```json
{
  "code": 0,
  "data": {
    "records": [],
    "page": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0,
    "first": true,
    "last": true
  }
}
```

#### 保存接口

新增返回结构：

- `POST /{resource}`
- `code = 0`
- `data = 当前保存后的记录`

更新返回结构：

- `PUT /{resource}/{id}`
- `code = 0`
- `data = 当前保存后的记录`

#### 删除接口

- `DELETE /{resource}/{id}`
- `code = 0`
- `message = 删除成功`

### 3.3 当前前端对记录结构的硬要求

统一模块页当前不是“列表拉头表、点查看再拉详情”模式，而是：

- 列表接口返回的每条 `row` 已经要足够支撑查看弹窗
- 编辑弹窗默认也直接复用当前行数据
- 如果该模块有明细，列表行里就要带 `items`
- 如果该模块支持附件，列表行里建议带：
  - `attachment`
  - `attachments`

也就是说，后端第一阶段最省事的方式是：

- 列表接口直接返回“头 + 明细 + 附件摘要”
- 先不强拆详情接口

## 4. 基础数据规范

### 4.1 主键

所有主数据和业务单据建议统一使用：

- `id`: 雪花算法
- 数据库存储：`BIGINT`
- 接口返回：建议返回字符串，避免前端精度问题

### 4.2 业务单号

按已经确定的规则执行：

- 每种单据类型单独流水
- 每年重置一次
- 后端统一生成
- 单号字段唯一索引

推荐格式：

```text
YYYY + 前缀 + 6位流水
```

详细规则见：

- [`docs/document-numbering-rules.md`](/home/instance/aries/docs/document-numbering-rules.md)

### 4.3 时间与数值格式

- 日期字段：`YYYY-MM-DD`
- 时间字段：`YYYY-MM-DD HH:mm:ss`
- 金额：2 位小数
- 重量：3 位小数
- 计数类：当前页面按整数展示

### 4.4 状态字段

当前前端实际使用过的状态值包括：

- `草稿`
- `已审核`
- `完成采购`
- `完成入库`
- `完成销售`
- `价格核准`
- `未审核`
- `已送达`
- `未送达`
- `待确认`
- `已确认`
- `待审核`
- `已签署`
- `未签署`
- `已收款`
- `已付款`
- `执行中`
- `已归档`
- `正常`
- `禁用`

## 5. 当前模块清单

### 5.1 主数据

| moduleKey    | 页面       | 主单号字段      |
| ------------ | ---------- | --------------- |
| `materials`  | 商品资料   | `materialCode`  |
| `suppliers`  | 供应商资料 | `supplierCode`  |
| `customers`  | 客户资料   | `customerCode`  |
| `carriers`   | 物流方资料 | `carrierCode`   |
| `warehouses` | 仓库资料   | `warehouseCode` |

### 5.2 采购与销售

| moduleKey           | 页面     | 主单号字段   |
| ------------------- | -------- | ------------ |
| `purchase-orders`   | 采购订单 | `orderNo`    |
| `purchase-inbounds` | 采购入库 | `inboundNo`  |
| `sales-orders`      | 销售订单 | `orderNo`    |
| `sales-outbounds`   | 销售出库 | `outboundNo` |
| `freight-bills`     | 物流单   | `billNo`     |

### 5.3 报表与对账

| moduleKey             | 页面         | 主单号字段    |
| --------------------- | ------------ | ------------- |
| `inventory-report`    | 商品库存报表 | 无            |
| `io-report`           | 出入库报表   | 无            |
| `supplier-statements` | 供应商对账单 | `statementNo` |
| `customer-statements` | 客户对账单   | `statementNo` |
| `freight-statements`  | 物流对账单   | `statementNo` |

### 5.4 财务与合同

| moduleKey              | 页面     | 主单号字段   |
| ---------------------- | -------- | ------------ |
| `receipts`             | 收款单   | `receiptNo`  |
| `payments`             | 付款单   | `paymentNo`  |
| `receivables-payables` | 应收应付 | 无           |
| `purchase-contracts`   | 采购合同 | `contractNo` |
| `sales-contracts`      | 销售合同 | `contractNo` |

### 5.5 系统设置

| moduleKey               | 页面     | 主单号字段       |
| ----------------------- | -------- | ---------------- |
| `general-settings`      | 通用设置 | `settingCode`    |
| `operation-logs`        | 操作日志 | `logNo`          |
| `permission-management` | 权限管理 | `permissionCode` |
| `user-accounts`         | 用户账户 | `loginName`      |
| `role-settings`         | 角色设置 | `roleCode`       |
| `ops-support`           | 运维支持 | `ticketNo`       |

## 6. 各模块字段要求

说明：

- “保存字段”表示当前编辑弹窗会提交的字段。
- “列表补充字段”表示当前列表/查看弹窗依赖，但当前编辑弹窗未必能改。
- “明细字段”表示 `items` 内字段。

### 6.1 商品资料 `materials`

- 保存字段：
  - `id`
  - `materialCode`
  - `brand`
  - `material`
  - `category`
  - `spec`
  - `length`
  - `unit`
  - `quantityUnit`
  - `pieceWeightTon`
  - `piecesPerBundle`
  - `unitPrice`
  - `remark`
- 列表补充字段：无
- 明细字段：无

注意：

- 当前页面还没有把“批号开关、保留字段、理算/过磅规则”完整体现在 UI 上。
- 这些内容已存在于旧文档，但当前前端不依赖。

### 6.2 供应商资料 `suppliers`

- 保存字段：
  - `id`
  - `supplierCode`
  - `supplierName`
  - `contactName`
  - `contactPhone`
  - `city`
  - `status`
  - `remark`

注意：

- 当前 UI 不是你之前定的正式版字段。
- 当前前端还没有这些字段：
  - `taxNo`
  - `bankName`
  - `bankAccount`
  - `shortName`

### 6.3 客户资料 `customers`

- 保存字段：
  - `id`
  - `customerCode`
  - `customerName`
  - `contactName`
  - `contactPhone`
  - `city`
  - `settlementMode`
  - `status`
  - `remark`

注意：

- 当前页面还没有客户项目子表。
- 你之前定的“一个客户多个项目、项目地址、项目简写”目前还未落到当前 UI。

### 6.4 物流方资料 `carriers`

- 保存字段：
  - `id`
  - `carrierCode`
  - `carrierName`
  - `contactName`
  - `contactPhone`
  - `vehicleType`
  - `status`
  - `remark`
- 列表补充字段：
  - `priceMode`

注意：

- 当前列表会显示 `priceMode`，但编辑表单没有这个字段。
- 后端返回列表时建议带上 `priceMode`。

### 6.5 仓库资料 `warehouses`

- 保存字段：
  - `id`
  - `warehouseCode`
  - `warehouseName`
  - `warehouseType`
  - `contactName`
  - `contactPhone`
  - `address`
  - `status`
  - `remark`

### 6.6 采购订单 `purchase-orders`

- 保存字段：
  - `id`
  - `orderNo`
  - `supplierName`
  - `orderDate`
  - `remark`
  - `items`
- 列表补充字段：
  - `buyerName`
  - `totalWeight`
  - `totalAmount`
  - `status`
- 明细字段：
  - `id`
  - `materialCode`
  - `brand`
  - `category`
  - `material`
  - `spec`
  - `length`
  - `unit`
  - `quantity`
  - `quantityUnit`
  - `pieceWeightTon`
  - `piecesPerBundle`
  - `weightTon`
  - `unitPrice`
  - `amount`

说明：

- 当前表单不编辑 `buyerName`，但列表和详情会展示。
- 后端保存时建议自动汇总：
  - `totalWeight = sum(items.weightTon)`
  - `totalAmount = sum(items.amount)`

### 6.7 采购入库 `purchase-inbounds`

- 保存字段：
  - `id`
  - `inboundNo`
  - `purchaseOrderNo`
  - `supplierName`
  - `warehouseName`
  - `inboundDate`
  - `settlementMode`
  - `remark`
  - `items`
- 列表补充字段：
  - `totalWeight`
  - `totalAmount`
  - `status`
- 明细字段：同采购订单明细

上游关系：

- 前端支持从 `purchase-orders` 导入明细
- `purchaseOrderNo` 当前前端视为上级单据字段

### 6.8 销售订单 `sales-orders`

- 保存字段：
  - `id`
  - `orderNo`
  - `purchaseInboundNo`
  - `customerName`
  - `projectName`
  - `orderDate`
  - `salesName`
  - `remark`
  - `items`
- 列表补充字段：
  - `totalWeight`
  - `totalAmount`
  - `status`
- 明细字段：同采购订单明细

上游关系：

- 前端支持从 `purchase-inbounds` 导入明细
- `purchaseInboundNo` 当前字段名允许承载来源入库单号

### 6.9 销售出库 `sales-outbounds`

- 保存字段：
  - `id`
  - `outboundNo`
  - `salesOrderNo`
  - `customerName`
  - `projectName`
  - `warehouseName`
  - `outboundDate`
  - `remark`
  - `items`
- 列表补充字段：
  - `totalWeight`
  - `totalAmount`
  - `status`
- 明细字段：同采购订单明细

上游关系：

- 前端支持从 `sales-orders` 导入明细

### 6.10 物流单 `freight-bills`

- 保存字段：
  - `id`
  - `billNo`
  - `outboundNo`
  - `carrierName`
  - `customerName`
  - `projectName`
  - `billTime`
  - `unitPrice`
  - `status`
  - `deliveryStatus`
  - `remark`
  - `items`
- 列表补充字段：
  - `totalWeight`
  - `totalFreight`
- 明细字段：
  - `id`
  - `sourceNo`
  - `customerName`
  - `projectName`
  - `materialCode`
  - `materialName`
  - `brand`
  - `category`
  - `material`
  - `spec`
  - `length`
  - `quantity`
  - `quantityUnit`
  - `pieceWeightTon`
  - `piecesPerBundle`
  - `batchNo`
  - `weightTon`
  - `warehouseName`

上游关系：

- 前端支持从 `sales-outbounds` 导入明细
- 物流单明细不是手工录入，当前 UI 假设由销售出库明细展开得到

### 6.11 商品库存报表 `inventory-report`

- 列表字段：
  - `materialCode`
  - `brand`
  - `material`
  - `category`
  - `spec`
  - `length`
  - `warehouseName`
  - `batchNo`
  - `quantity`
  - `quantityUnit`
  - `weightTon`
  - `unit`

说明：

- 当前是纯查询页，无保存接口实际需求。
- 如果后端统一走模块接口，`save`/`delete` 可以不开放或直接返回不支持。

### 6.12 出入库报表 `io-report`

- 列表字段：
  - `businessDate`
  - `businessType`
  - `sourceNo`
  - `materialCode`
  - `spec`
  - `warehouseName`
  - `batchNo`
  - `inQuantity`
  - `outQuantity`
  - `quantityUnit`
  - `inWeightTon`
  - `outWeightTon`
  - `remark`

### 6.13 供应商对账单 `supplier-statements`

- 保存字段：
  - `id`
  - `statementNo`
  - `supplierName`
  - `startDate`
  - `endDate`
  - `purchaseAmount`
  - `paymentAmount`
  - `closingAmount`
  - `status`
  - `remark`
- 列表补充字段：
  - `sourceInboundNos`

### 6.14 客户对账单 `customer-statements`

- 保存字段：
  - `id`
  - `statementNo`
  - `customerName`
  - `projectName`
  - `startDate`
  - `endDate`
  - `salesAmount`
  - `receiptAmount`
  - `closingAmount`
  - `status`
  - `remark`
- 列表补充字段：
  - `sourceOrderNos`

### 6.15 物流对账单 `freight-statements`

- 保存字段：
  - `id`
  - `statementNo`
  - `carrierName`
  - `startDate`
  - `endDate`
  - `totalWeight`
  - `totalFreight`
  - `paidAmount`
  - `status`
  - `signStatus`
  - `remark`
  - `attachment`
  - `attachments`
  - `items`
- 列表补充字段：
  - `unpaidAmount`
  - `sourceBillNos`
- 明细字段：同物流单明细，另可补充：
  - `sourceBillNo`

### 6.16 收款单 `receipts`

- 保存字段：
  - `id`
  - `receiptNo`
  - `customerName`
  - `projectName`
  - `receiptDate`
  - `payType`
  - `amount`
  - `status`
  - `operatorName`
  - `remark`

### 6.17 付款单 `payments`

- 保存字段：
  - `id`
  - `paymentNo`
  - `businessType`
  - `counterpartyName`
  - `paymentDate`
  - `payType`
  - `amount`
  - `status`
  - `operatorName`
  - `remark`

### 6.18 应收应付 `receivables-payables`

- 列表字段：
  - `direction`
  - `counterpartyType`
  - `counterpartyName`
  - `openingAmount`
  - `currentAmount`
  - `settledAmount`
  - `balanceAmount`
  - `status`
  - `remark`

### 6.19 采购合同 `purchase-contracts`

- 保存字段：
  - `id`
  - `contractNo`
  - `supplierName`
  - `signDate`
  - `effectiveDate`
  - `expireDate`
  - `buyerName`
  - `status`
  - `remark`
  - `items`
- 列表补充字段：
  - `totalWeight`
  - `totalAmount`
- 明细字段：同采购订单明细

### 6.20 销售合同 `sales-contracts`

- 保存字段：
  - `id`
  - `contractNo`
  - `customerName`
  - `projectName`
  - `signDate`
  - `effectiveDate`
  - `expireDate`
  - `salesName`
  - `status`
  - `remark`
  - `items`
- 列表补充字段：
  - `totalWeight`
  - `totalAmount`
- 明细字段：同采购订单明细

### 6.21 通用设置 `general-settings`

- 保存字段：
  - `id`
  - `settingCode`
  - `settingName`
  - `billName`
  - `prefix`
  - `dateRule`
  - `serialLength`
  - `resetRule`
  - `sampleNo`
- `status`
- `remark`

### 6.22 操作日志 `operation-logs`

- 列表字段：
  - `id`
  - `logNo`
  - `operatorName`
  - `loginName`
  - `moduleName`
  - `actionType`
  - `businessNo`
  - `requestMethod`
  - `requestPath`
  - `clientIp`
  - `resultStatus`
  - `operationTime`
  - `remark`
- 推荐查询条件：
  - `keyword`
  - `moduleName`
  - `actionType`
  - `resultStatus`
  - `startTime`
  - `endTime`

说明：

- 当前前端页面为只读查询页，不提供新增、编辑、删除。
- 后端必须在以下系统模块写操作成功或失败时自动落库操作日志：
  - `general-settings`
  - `permission-management`
  - `user-accounts`
  - `role-settings`
  - `print-templates`
- `businessNo` 建议保存被操作对象主键或主业务编码，例如 `settingCode`、`permissionCode`、`loginName`、`roleCode`、模板编号。

### 6.23 权限管理 `permission-management`

- 保存字段：
  - `id`
  - `permissionCode`
  - `permissionName`
  - `moduleName`
  - `permissionType`
  - `actionName`
  - `scopeName`
  - `resourceKey`
  - `status`
  - `remark`

说明：

- 当前页面按 RBAC 思路设计，已切换到真实后端接口对接。

### 6.24 用户账户 `user-accounts`

- 保存字段：
  - `id`
  - `loginName`
  - `password`（仅新增时可选传）
  - `userName`
  - `mobile`
  - `roleNames`
  - `dataScope`
  - `permissionSummary`
  - `lastLoginDate`
  - `status`
  - `remark`

说明：

- `roleNames` 当前前端是多选数组。
- 后端可返回数组，前端能显示。
- 新增用户时前端可直接传 `password`；若未传，则后端回退到 `leo.auth.user.default-password`。

### 6.25 角色设置 `role-settings`

- 保存字段：
  - `id`
  - `roleCode`
  - `roleName`
  - `roleType`
  - `dataScope`
  - `permissionCodes`
  - `permissionSummary`
  - `userCount`
  - `status`
  - `remark`
- 列表补充字段：
  - `permissionCount`

说明：

- `permissionCodes` 当前前端是多选数组。
- 建议后端保存后同时回写：
  - `permissionSummary`
  - `permissionCount`

### 6.26 运维支持 `ops-support`

- 保存字段：
  - `id`
  - `ticketNo`
  - `issueType`
  - `priorityLevel`
  - `submitterName`
  - `handlerName`
  - `submitDate`
  - `status`
  - `remark`

## 7. 当前前端已实现的特殊业务逻辑

这部分是后端最容易忽略，但现在页面已经写死交互假设的地方。

### 7.1 单据导入关系

当前前端支持以下上级单据导入：

- `purchase-inbounds` <- `purchase-orders`
- `sales-orders` <- `purchase-inbounds`
- `sales-outbounds` <- `sales-orders`
- `freight-bills` <- `sales-outbounds`

前端当前默认假设：

- 上级单据被导入后，要能把明细复制到下游单据
- 某些页面要求唯一关联，不允许同一上级单据重复导入

### 7.2 自动汇总逻辑

这些字段建议后端统一计算，不依赖前端传值：

- `totalWeight`
- `totalAmount`
- `totalFreight`
- `closingAmount`
- `unpaidAmount`

### 7.3 当前页面依赖的状态口径

前端页面当前按以下状态关系理解数据：

- 采购订单：
  - 若存在关联采购入库且入库单状态为 `已审核/完成入库`，则采购订单状态记为 `完成采购`
- 采购入库：
  - 若被销售订单引用，则状态记为 `完成入库`
- 销售出库：
  - 若状态为 `价格核准/已核准/已完成`，前端最终按 `价格核准` 展示
- 销售订单：
  - 若存在关联销售出库且该出库单状态为 `价格核准`，则销售订单状态记为 `完成销售`

后端不需要复刻历史 mock 逻辑，但必须保证返回结果与页面状态口径一致。

### 7.4 供应商对账单生成规则

前端当前生成入口逻辑：

- 从 `purchase-inbounds` 中选来源单
- 候选条件：
  - `inboundNo` 不为空
  - 状态不是 `草稿`
  - 未被已有对账单 `sourceInboundNos` 占用
- 只允许同一供应商合并生成

草稿默认计算：

- `startDate = 最早入库日期`
- `endDate = 最晚入库日期`
- `purchaseAmount = 所选入库单 totalAmount 汇总`
- `paymentAmount = 同账期内、同供应商、状态为 已付款 的付款单汇总`
- `closingAmount = purchaseAmount - paymentAmount`

### 7.5 客户对账单生成规则

前端当前生成入口逻辑：

- 从 `sales-orders` 中选来源单
- 候选条件：
  - `orderNo` 不为空
  - 状态必须是 `完成销售`
  - 未被已有对账单 `sourceOrderNos` 占用
- 只允许同一客户、同一项目合并生成

草稿默认计算：

- `startDate = 最早订单日期`
- `endDate = 最晚订单日期`
- `salesAmount = 所选销售订单 totalAmount 汇总`
- `receiptAmount = 0`
- `closingAmount = salesAmount`

### 7.6 物流对账单生成规则

前端当前生成入口逻辑：

- 从 `freight-bills` 中选来源单
- 候选条件：
  - `billNo` 不为空
  - 未被已有对账单 `sourceBillNos` 占用
- 只允许同一物流商合并生成

草稿默认计算：

- `startDate = 最早物流单日期`
- `endDate = 最晚物流单日期`
- `totalWeight = 汇总`
- `totalFreight = 汇总`
- `paidAmount = 0`
- `unpaidAmount = totalFreight`
- `status = 待审核`
- `signStatus = 未签署`
- 自动带出 `items`

### 7.7 物流单批量动作

当前页面有批量“标记送达”动作：

- 适用模块：`freight-bills`
- 动作结果：
  - `deliveryStatus = 已送达`
  - 若原状态为 `未审核`，同时将 `status = 已审核`

### 7.8 附件逻辑

当前页面附件能力主要落在物流对账单查看/编辑弹窗：

- 记录可以只有 `attachment` 字符串
- 也可以有 `attachments` 数组

建议后端统一返回：

```json
{
  "attachment": "附件A.pdf, 附件B.pdf",
  "attachments": [
    {
      "id": "1",
      "name": "附件A.pdf",
      "uploader": "系统管理员",
      "uploadTime": "2026-04-23 15:00:00"
    }
  ]
}
```

## 8. 打印模板接口

打印模板不走统一模块接口，当前前端单独调用：

- `GET /printTemplate/getByBillType?billType={moduleKey}`
- `GET /printTemplate/listByBillType?billType={moduleKey}`
- `POST /printTemplate/save`
- `DELETE /printTemplate/delete?id={id}`

建议字段：

```json
{
  "id": 1,
  "billType": "sales-outbounds",
  "templateName": "销售出库标准模板",
  "templateHtml": "<html>...</html>",
  "isDefault": "1",
  "source": "db",
  "updateTime": "2026-04-23 15:00:00"
}
```

当前可配置打印模板的模块范围为：

- 采购订单
- 采购入库
- 销售订单
- 销售出库
- 物流单
- 采购合同
- 销售合同
- 供应商对账单
- 客户对账单
- 物流对账单
- 收款单
- 付款单

## 9. 后端第一阶段建议落地顺序

如果现在开始正式写后端，建议按下面顺序推进，能最快把当前前端跑通：

1. 登录认证
2. 主数据
3. 采购订单、采购入库
4. 销售订单、销售出库
5. 物流单
6. 三类对账单
7. 收款单、付款单、应收应付
8. 合同管理
9. 通用设置、操作日志、RBAC、运维支持
10. 打印模板

## 10. 与旧文档的关系

以下文档仍然有效，但它们描述的是“更完整的业务目标态”，不完全等于当前 UI 已落地字段：

- [`docs/business-module-design.md`](/home/instance/aries/docs/business-module-design.md)
- [`docs/material-master-schema.md`](/home/instance/aries/docs/material-master-schema.md)
- [`docs/supplier-master-schema.md`](/home/instance/aries/docs/supplier-master-schema.md)
- [`docs/customer-master-schema.md`](/home/instance/aries/docs/customer-master-schema.md)
- [`docs/logistics-provider-master-schema.md`](/home/instance/aries/docs/logistics-provider-master-schema.md)
- [`docs/other-module-form-design.md`](/home/instance/aries/docs/other-module-form-design.md)

后端当前如果以“先对接当前前端”为目标，请优先执行本文件。
