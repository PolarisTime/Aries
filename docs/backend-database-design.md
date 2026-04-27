# 后端数据库表设计（按当前前端页面）

## 1. 设计目标

本文件用于给后端直接建表，目标是：

- 先把当前前端页面完整跑通
- 与 [`backend-integration-spec.md`](/home/instance/aries/docs/backend-integration-spec.md) 保持一致
- 保留后续扩展到正式 ERP 业务的空间

当前设计原则：

- 所有主表主键使用雪花算法 `BIGINT`
- 接口层统一按字符串返回 `id`
- 单据头表与明细表分离
- 报表优先从业务表和库存流水表汇总，不单独维护冗余报表表
- 当前前端大量直接显示名称、编码、规格，因此业务明细保留快照字段，不依赖实时 join 才能渲染

## 2. 通用规范

### 2.1 通用字段

除纯关系表外，建议所有业务表统一带以下字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `BIGINT` | 雪花主键 |
| `created_by` | `BIGINT` | 创建人 |
| `created_name` | `VARCHAR(64)` | 创建人名称快照 |
| `created_at` | `DATETIME` | 创建时间 |
| `updated_by` | `BIGINT` | 更新人 |
| `updated_name` | `VARCHAR(64)` | 更新人名称快照 |
| `updated_at` | `DATETIME` | 更新时间 |
| `deleted_flag` | `TINYINT(1)` | 逻辑删除，`0` 正常，`1` 已删 |

### 2.2 单号字段

所有业务单据表统一规则：

- 单号字段唯一索引
- 格式：`YYYY + 前缀 + 6位流水`
- 由后端统一生成

### 2.3 状态字段

当前前端页面使用中文状态值，后端第一阶段建议直接存中文，减少映射成本。

例如：

- `草稿`
- `已审核`
- `完成采购`
- `完成入库`
- `完成销售`
- `价格核准`
- `待确认`
- `已确认`

### 2.4 快照字段

因为当前前端列表和弹窗大量直接显示名称，建议在业务单据头表、明细表中保留主数据快照字段。

例如：

- 单据头保存：
  - `supplier_id`
  - `supplier_name`
- 单据明细保存：
  - `material_id`
  - `material_code`
  - `brand`
  - `material`
  - `category`
  - `spec`
  - `length`
  - `unit`

这样即使主数据被修改，历史单据仍能稳定回显。

## 3. 表命名建议

| 模块 | 表前缀 |
| --- | --- |
| 主数据 | `md_` |
| 采购 | `po_` |
| 销售 | `so_` |
| 物流 | `lg_` |
| 库存 | `inv_` |
| 对账 | `st_` |
| 财务 | `fm_` |
| 合同 | `ct_` |
| 系统 | `sys_` |
| 运维 | `ops_` |
| 打印 | `print_` |

## 4. 主数据表

### 4.1 商品资料 `md_material`

对应前端模块：`materials`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `material_code` | `VARCHAR(64)` | 是 | 商品编码，唯一 |
| `brand` | `VARCHAR(64)` | 是 | 品牌 |
| `material` | `VARCHAR(32)` | 是 | 材质，如 `HRB400` |
| `category` | `VARCHAR(32)` | 是 | 类别 |
| `spec` | `VARCHAR(32)` | 是 | 规格 |
| `length` | `VARCHAR(32)` | 否 | 长度 |
| `unit` | `VARCHAR(16)` | 是 | 单位 |
| `quantity_unit` | `VARCHAR(16)` | 是 | 数量单位，当前统一固定为 `件` |
| `piece_weight_ton` | `DECIMAL(12,3)` | 是 | 件重/吨 |
| `pieces_per_bundle` | `INT` | 是 | 每件支数 |
| `unit_price` | `DECIMAL(12,2)` | 是 | 默认单价 |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_material_code(material_code)`
- `idx_material_category(category)`
- `idx_material_brand(brand)`

### 4.2 供应商资料 `md_supplier`

对应前端模块：`suppliers`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `supplier_code` | `VARCHAR(64)` | 是 | 供应商编码，唯一 |
| `supplier_name` | `VARCHAR(128)` | 是 | 供应商名称 |
| `contact_name` | `VARCHAR(64)` | 是 | 联系人 |
| `contact_phone` | `VARCHAR(32)` | 是 | 联系电话 |
| `city` | `VARCHAR(64)` | 是 | 所在城市 |
| `status` | `VARCHAR(16)` | 是 | `正常/禁用` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_supplier_code(supplier_code)`
- `idx_supplier_name(supplier_name)`

### 4.3 客户资料 `md_customer`

对应前端模块：`customers`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `customer_code` | `VARCHAR(64)` | 是 | 客户编码，唯一 |
| `customer_name` | `VARCHAR(128)` | 是 | 客户名称 |
| `contact_name` | `VARCHAR(64)` | 是 | 联系人 |
| `contact_phone` | `VARCHAR(32)` | 是 | 联系电话 |
| `city` | `VARCHAR(64)` | 是 | 所在城市 |
| `settlement_mode` | `VARCHAR(32)` | 是 | 结算方式 |
| `status` | `VARCHAR(16)` | 是 | `正常/禁用` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_customer_code(customer_code)`
- `idx_customer_name(customer_name)`

说明：

- 当前前端还没有客户项目子表页面。
- 但为后续扩展，建议预留客户项目表。

### 4.4 客户项目 `md_customer_project`

当前前端暂未直接使用，但建议建表，便于后续升级。

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `customer_id` | `BIGINT` | 是 | 客户主键 |
| `project_name` | `VARCHAR(200)` | 是 | 项目全称 |
| `project_short_name` | `VARCHAR(64)` | 否 | 项目简写 |
| `project_address` | `VARCHAR(255)` | 否 | 项目地址 |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `idx_customer_project_customer(customer_id)`

### 4.5 物流方资料 `md_carrier`

对应前端模块：`carriers`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `carrier_code` | `VARCHAR(64)` | 是 | 物流方编码，唯一 |
| `carrier_name` | `VARCHAR(128)` | 是 | 物流方名称 |
| `contact_name` | `VARCHAR(64)` | 是 | 联系人 |
| `contact_phone` | `VARCHAR(32)` | 是 | 联系电话 |
| `vehicle_type` | `VARCHAR(64)` | 是 | 常用车型 |
| `price_mode` | `VARCHAR(32)` | 否 | 计费模式，当前列表展示需要 |
| `status` | `VARCHAR(16)` | 是 | `正常/禁用` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_carrier_code(carrier_code)`
- `idx_carrier_name(carrier_name)`

### 4.6 仓库资料 `md_warehouse`

对应前端模块：`warehouses`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `warehouse_code` | `VARCHAR(64)` | 是 | 仓库编码，唯一 |
| `warehouse_name` | `VARCHAR(128)` | 是 | 仓库名称 |
| `warehouse_type` | `VARCHAR(32)` | 是 | 仓库类型 |
| `contact_name` | `VARCHAR(64)` | 是 | 联系人 |
| `contact_phone` | `VARCHAR(32)` | 是 | 联系电话 |
| `address` | `VARCHAR(255)` | 是 | 仓库地址 |
| `status` | `VARCHAR(16)` | 是 | `正常/禁用` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_warehouse_code(warehouse_code)`
- `idx_warehouse_name(warehouse_name)`

## 5. 采购业务表

### 5.1 采购订单头 `po_purchase_order`

对应前端模块：`purchase-orders`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `order_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `supplier_id` | `BIGINT` | 否 | 供应商主键 |
| `supplier_name` | `VARCHAR(128)` | 是 | 供应商名称快照 |
| `order_date` | `DATE` | 是 | 订单日期 |
| `buyer_name` | `VARCHAR(64)` | 否 | 采购员 |
| `total_weight` | `DECIMAL(14,3)` | 是 | 总吨位 |
| `total_amount` | `DECIMAL(14,2)` | 是 | 总金额 |
| `status` | `VARCHAR(16)` | 是 | `草稿/已审核/完成采购` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_po_order_no(order_no)`
- `idx_po_supplier_date(supplier_name, order_date)`
- `idx_po_status(status)`

### 5.2 采购订单明细 `po_purchase_order_item`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `order_id` | `BIGINT` | 是 | 采购订单头主键 |
| `line_no` | `INT` | 是 | 行号 |
| `material_id` | `BIGINT` | 否 | 商品主键 |
| `material_code` | `VARCHAR(64)` | 是 | 商品编码快照 |
| `brand` | `VARCHAR(64)` | 是 | 品牌 |
| `category` | `VARCHAR(32)` | 是 | 类别 |
| `material` | `VARCHAR(32)` | 是 | 材质 |
| `spec` | `VARCHAR(32)` | 是 | 规格 |
| `length` | `VARCHAR(32)` | 否 | 长度 |
| `unit` | `VARCHAR(16)` | 是 | 单位 |
| `quantity` | `INT` | 是 | 数量 |
| `quantity_unit` | `VARCHAR(16)` | 是 | 数量单位，当前统一固定为 `件` |
| `piece_weight_ton` | `DECIMAL(12,3)` | 是 | 件重/吨 |
| `pieces_per_bundle` | `INT` | 是 | 每件支数 |
| `weight_ton` | `DECIMAL(14,3)` | 是 | 吨位 |
| `unit_price` | `DECIMAL(12,2)` | 是 | 单价 |
| `amount` | `DECIMAL(14,2)` | 是 | 金额 |

索引：

- `idx_po_item_order(order_id)`
- `idx_po_item_material(material_code)`

### 5.3 采购入库头 `po_purchase_inbound`

对应前端模块：`purchase-inbounds`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `inbound_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `purchase_order_id` | `BIGINT` | 否 | 上游采购订单主键 |
| `purchase_order_no` | `VARCHAR(256)` | 否 | 上游采购订单号，支持多号展示 |
| `supplier_id` | `BIGINT` | 否 | 供应商主键 |
| `supplier_name` | `VARCHAR(128)` | 是 | 供应商名称快照 |
| `warehouse_id` | `BIGINT` | 否 | 仓库主键 |
| `warehouse_name` | `VARCHAR(128)` | 是 | 仓库名称快照 |
| `inbound_date` | `DATE` | 是 | 入库日期 |
| `settlement_mode` | `VARCHAR(32)` | 是 | `理算/过磅` |
| `total_weight` | `DECIMAL(14,3)` | 是 | 总吨位 |
| `total_amount` | `DECIMAL(14,2)` | 是 | 总金额 |
| `status` | `VARCHAR(16)` | 是 | `草稿/已审核/完成入库` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_po_inbound_no(inbound_no)`
- `idx_po_inbound_supplier_date(supplier_name, inbound_date)`
- `idx_po_inbound_status(status)`

### 5.4 采购入库明细 `po_purchase_inbound_item`

结构与 `po_purchase_order_item` 基本一致，增加批号和仓库字段：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `inbound_id` | `BIGINT` | 是 | 入库头主键 |
| `line_no` | `INT` | 是 | 行号 |
| `material_id` | `BIGINT` | 否 | 商品主键 |
| `material_code` | `VARCHAR(64)` | 是 | 商品编码快照 |
| `brand` | `VARCHAR(64)` | 是 | 品牌 |
| `category` | `VARCHAR(32)` | 是 | 类别 |
| `material` | `VARCHAR(32)` | 是 | 材质 |
| `spec` | `VARCHAR(32)` | 是 | 规格 |
| `length` | `VARCHAR(32)` | 否 | 长度 |
| `unit` | `VARCHAR(16)` | 是 | 单位 |
| `batch_no` | `VARCHAR(64)` | 否 | 批号 |
| `quantity` | `INT` | 是 | 数量 |
| `quantity_unit` | `VARCHAR(16)` | 是 | 数量单位，当前统一固定为 `件` |
| `piece_weight_ton` | `DECIMAL(12,3)` | 是 | 件重/吨 |
| `pieces_per_bundle` | `INT` | 是 | 每件支数 |
| `weight_ton` | `DECIMAL(14,3)` | 是 | 吨位 |
| `unit_price` | `DECIMAL(12,2)` | 是 | 单价 |
| `amount` | `DECIMAL(14,2)` | 是 | 金额 |

索引：

- `idx_po_inbound_item_head(inbound_id)`
- `idx_po_inbound_item_batch(batch_no)`

## 6. 销售业务表

### 6.1 销售订单头 `so_sales_order`

对应前端模块：`sales-orders`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `order_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `purchase_inbound_id` | `BIGINT` | 否 | 来源采购入库主键 |
| `purchase_inbound_no` | `VARCHAR(256)` | 否 | 来源采购入库单号展示 |
| `customer_id` | `BIGINT` | 否 | 客户主键 |
| `customer_name` | `VARCHAR(128)` | 是 | 客户名称快照 |
| `project_name` | `VARCHAR(200)` | 是 | 项目名称 |
| `order_date` | `DATE` | 是 | 订单日期 |
| `sales_name` | `VARCHAR(64)` | 是 | 销售员 |
| `total_weight` | `DECIMAL(14,3)` | 是 | 总吨位 |
| `total_amount` | `DECIMAL(14,2)` | 是 | 总金额 |
| `status` | `VARCHAR(16)` | 是 | `草稿/已审核/完成销售` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_so_order_no(order_no)`
- `idx_so_customer_project(customer_name, project_name)`
- `idx_so_status(status)`

### 6.2 销售订单明细 `so_sales_order_item`

结构基本同采购订单明细。

索引：

- `idx_so_item_order(order_id)`
- `idx_so_item_material(material_code)`

### 6.3 销售出库头 `so_sales_outbound`

对应前端模块：`sales-outbounds`

说明：

- 当前前端没有独立价格核准表
- `status = 价格核准` 直接落在销售出库头上

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `outbound_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `sales_order_id` | `BIGINT` | 否 | 销售订单主键 |
| `sales_order_no` | `VARCHAR(256)` | 否 | 销售订单号 |
| `customer_id` | `BIGINT` | 否 | 客户主键 |
| `customer_name` | `VARCHAR(128)` | 是 | 客户名称快照 |
| `project_name` | `VARCHAR(200)` | 是 | 项目名称 |
| `warehouse_id` | `BIGINT` | 否 | 仓库主键 |
| `warehouse_name` | `VARCHAR(128)` | 是 | 仓库名称快照 |
| `outbound_date` | `DATE` | 是 | 出库日期 |
| `total_weight` | `DECIMAL(14,3)` | 是 | 总吨位 |
| `total_amount` | `DECIMAL(14,2)` | 是 | 总金额 |
| `status` | `VARCHAR(16)` | 是 | `草稿/已审核/价格核准` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_so_outbound_no(outbound_no)`
- `idx_so_outbound_customer_date(customer_name, outbound_date)`
- `idx_so_outbound_status(status)`

### 6.4 销售出库明细 `so_sales_outbound_item`

结构基本同采购入库明细，建议保留批号字段。

索引：

- `idx_so_outbound_item_head(outbound_id)`
- `idx_so_outbound_item_batch(batch_no)`

## 7. 物流业务表

### 7.1 物流单头 `lg_freight_bill`

对应前端模块：`freight-bills`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `bill_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `outbound_id` | `BIGINT` | 否 | 销售出库主键 |
| `outbound_no` | `VARCHAR(256)` | 否 | 销售出库单号 |
| `carrier_id` | `BIGINT` | 否 | 物流方主键 |
| `carrier_name` | `VARCHAR(128)` | 是 | 物流方名称快照 |
| `customer_id` | `BIGINT` | 否 | 客户主键 |
| `customer_name` | `VARCHAR(128)` | 是 | 客户名称快照 |
| `project_name` | `VARCHAR(200)` | 是 | 项目名称 |
| `bill_time` | `DATE` | 是 | 单据日期 |
| `unit_price` | `DECIMAL(12,2)` | 是 | 运费单价 |
| `total_weight` | `DECIMAL(14,3)` | 是 | 总吨位 |
| `total_freight` | `DECIMAL(14,2)` | 是 | 总运费 |
| `status` | `VARCHAR(16)` | 是 | `未审核/已审核` |
| `delivery_status` | `VARCHAR(16)` | 是 | `未送达/已送达` |
| `paid_amount` | `DECIMAL(14,2)` | 否 | 已付金额，可供汇总使用 |
| `unpaid_amount` | `DECIMAL(14,2)` | 否 | 未付金额 |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_lg_bill_no(bill_no)`
- `idx_lg_carrier_date(carrier_name, bill_time)`
- `idx_lg_status(status, delivery_status)`

### 7.2 物流单明细 `lg_freight_bill_item`

当前前端会展开商品明细查看，因此建议落表。

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `bill_id` | `BIGINT` | 是 | 物流单头主键 |
| `line_no` | `INT` | 是 | 行号 |
| `source_no` | `VARCHAR(64)` | 是 | 来源出库单号 |
| `customer_name` | `VARCHAR(128)` | 是 | 客户快照 |
| `project_name` | `VARCHAR(200)` | 是 | 项目快照 |
| `material_id` | `BIGINT` | 否 | 商品主键 |
| `material_code` | `VARCHAR(64)` | 是 | 商品编码快照 |
| `material_name` | `VARCHAR(128)` | 否 | 商品名称 |
| `brand` | `VARCHAR(64)` | 是 | 品牌 |
| `category` | `VARCHAR(32)` | 是 | 类别 |
| `material` | `VARCHAR(32)` | 是 | 材质 |
| `spec` | `VARCHAR(32)` | 是 | 规格 |
| `length` | `VARCHAR(32)` | 否 | 长度 |
| `quantity` | `INT` | 是 | 数量 |
| `quantity_unit` | `VARCHAR(16)` | 是 | 数量单位，当前统一固定为 `件` |
| `piece_weight_ton` | `DECIMAL(12,3)` | 是 | 件重/吨 |
| `pieces_per_bundle` | `INT` | 是 | 每件支数 |
| `batch_no` | `VARCHAR(64)` | 否 | 批号 |
| `weight_ton` | `DECIMAL(14,3)` | 是 | 吨位 |
| `warehouse_name` | `VARCHAR(128)` | 否 | 仓库名称 |

索引：

- `idx_lg_item_bill(bill_id)`
- `idx_lg_item_source(source_no)`

## 8. 库存与报表支撑表

### 8.1 库存结存表 `inv_stock_balance`

对应前端模块：`inventory-report`

建议以以下维度唯一：

- `material_id`
- `warehouse_id`
- `batch_no`

字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `BIGINT` | 主键 |
| `material_id` | `BIGINT` | 商品主键 |
| `material_code` | `VARCHAR(64)` | 商品编码快照 |
| `brand` | `VARCHAR(64)` | 品牌 |
| `material` | `VARCHAR(32)` | 材质 |
| `category` | `VARCHAR(32)` | 类别 |
| `spec` | `VARCHAR(32)` | 规格 |
| `length` | `VARCHAR(32)` | 长度 |
| `unit` | `VARCHAR(16)` | 单位 |
| `warehouse_id` | `BIGINT` | 仓库主键 |
| `warehouse_name` | `VARCHAR(128)` | 仓库名称快照 |
| `batch_no` | `VARCHAR(64)` | 批号 |
| `quantity` | `INT` | 当前数量 |
| `quantity_unit` | `VARCHAR(16)` | 当前数量单位，统一为 `件` |
| `weight_ton` | `DECIMAL(14,3)` | 当前吨位 |

索引：

- `uk_inv_balance(material_id, warehouse_id, batch_no)`
- `idx_inv_balance_material(material_code)`

### 8.2 库存流水表 `inv_stock_io_log`

对应前端模块：`io-report`

字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `BIGINT` | 主键 |
| `business_date` | `DATE` | 业务日期 |
| `business_type` | `VARCHAR(32)` | `采购入库/销售出库` |
| `source_table` | `VARCHAR(64)` | 来源表名 |
| `source_id` | `BIGINT` | 来源单据主键 |
| `source_no` | `VARCHAR(64)` | 来源单号 |
| `material_id` | `BIGINT` | 商品主键 |
| `material_code` | `VARCHAR(64)` | 商品编码 |
| `spec` | `VARCHAR(32)` | 规格 |
| `warehouse_id` | `BIGINT` | 仓库主键 |
| `warehouse_name` | `VARCHAR(128)` | 仓库名称 |
| `batch_no` | `VARCHAR(64)` | 批号 |
| `in_quantity` | `INT` | 入库数量 |
| `out_quantity` | `INT` | 出库数量 |
| `quantity_unit` | `VARCHAR(16)` | 数量单位，统一为 `件` |
| `in_weight_ton` | `DECIMAL(14,3)` | 入库吨位 |
| `out_weight_ton` | `DECIMAL(14,3)` | 出库吨位 |
| `remark` | `VARCHAR(255)` | 备注 |

索引：

- `idx_inv_log_date(business_date)`
- `idx_inv_log_source(source_no)`
- `idx_inv_log_material(material_code)`

## 9. 对账业务表

### 9.1 供应商对账单 `st_supplier_statement`

对应前端模块：`supplier-statements`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `statement_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `supplier_id` | `BIGINT` | 否 | 供应商主键 |
| `supplier_name` | `VARCHAR(128)` | 是 | 供应商名称快照 |
| `start_date` | `DATE` | 是 | 账期开始 |
| `end_date` | `DATE` | 是 | 账期结束 |
| `purchase_amount` | `DECIMAL(14,2)` | 是 | 采购金额 |
| `payment_amount` | `DECIMAL(14,2)` | 是 | 付款金额 |
| `closing_amount` | `DECIMAL(14,2)` | 是 | 期末余额 |
| `source_inbound_nos` | `VARCHAR(500)` | 否 | 来源入库单号列表 |
| `status` | `VARCHAR(16)` | 是 | `待确认/已确认` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

### 9.2 客户对账单 `st_customer_statement`

对应前端模块：`customer-statements`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `statement_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `customer_id` | `BIGINT` | 否 | 客户主键 |
| `customer_name` | `VARCHAR(128)` | 是 | 客户名称快照 |
| `project_name` | `VARCHAR(200)` | 是 | 项目名称 |
| `start_date` | `DATE` | 是 | 账期开始 |
| `end_date` | `DATE` | 是 | 账期结束 |
| `sales_amount` | `DECIMAL(14,2)` | 是 | 销售金额 |
| `receipt_amount` | `DECIMAL(14,2)` | 是 | 收款金额 |
| `closing_amount` | `DECIMAL(14,2)` | 是 | 期末余额 |
| `source_order_nos` | `VARCHAR(500)` | 否 | 来源销售订单号列表 |
| `status` | `VARCHAR(16)` | 是 | `待确认/已确认` |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

### 9.3 物流对账单头 `st_freight_statement`

对应前端模块：`freight-statements`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `statement_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `carrier_id` | `BIGINT` | 否 | 物流方主键 |
| `carrier_name` | `VARCHAR(128)` | 是 | 物流方名称快照 |
| `start_date` | `DATE` | 是 | 账期开始 |
| `end_date` | `DATE` | 是 | 账期结束 |
| `total_weight` | `DECIMAL(14,3)` | 是 | 总吨位 |
| `total_freight` | `DECIMAL(14,2)` | 是 | 总运费 |
| `paid_amount` | `DECIMAL(14,2)` | 是 | 已付金额 |
| `unpaid_amount` | `DECIMAL(14,2)` | 是 | 未付金额 |
| `source_bill_nos` | `VARCHAR(500)` | 否 | 来源物流单号列表 |
| `status` | `VARCHAR(16)` | 是 | `待审核/已审核` |
| `sign_status` | `VARCHAR(16)` | 是 | `未签署/已签署` |
| `attachment` | `VARCHAR(500)` | 否 | 附件名称摘要 |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

索引：

- `uk_st_freight_no(statement_no)`
- `idx_st_freight_carrier_date(carrier_name, end_date)`

### 9.4 物流对账单明细 `st_freight_statement_item`

当前前端会在对账单查看弹窗里展示明细，建议独立落表。

字段可与 `lg_freight_bill_item` 基本一致，增加：

- `statement_id`
- `source_bill_no`

### 9.5 通用附件表 `sys_biz_attachment`

当前前端主要用于物流对账单，但建议做成通用表。

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `biz_type` | `VARCHAR(64)` | 是 | 业务类型，如 `freight-statements` |
| `biz_id` | `BIGINT` | 是 | 业务主键 |
| `name` | `VARCHAR(255)` | 是 | 附件名称 |
| `file_url` | `VARCHAR(500)` | 否 | 文件地址 |
| `uploader` | `VARCHAR(64)` | 否 | 上传人 |
| `upload_time` | `DATETIME` | 是 | 上传时间 |

索引：

- `idx_attachment_biz(biz_type, biz_id)`

## 10. 财务表

### 10.1 收款单 `fm_receipt`

对应前端模块：`receipts`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `receipt_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `customer_id` | `BIGINT` | 否 | 客户主键 |
| `customer_name` | `VARCHAR(128)` | 是 | 客户名称快照 |
| `project_name` | `VARCHAR(200)` | 是 | 项目名称 |
| `receipt_date` | `DATE` | 是 | 收款日期 |
| `pay_type` | `VARCHAR(32)` | 是 | 收款方式 |
| `amount` | `DECIMAL(14,2)` | 是 | 金额 |
| `status` | `VARCHAR(16)` | 是 | `草稿/已收款` |
| `operator_name` | `VARCHAR(64)` | 是 | 经办人 |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

### 10.2 付款单 `fm_payment`

对应前端模块：`payments`

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 是 | 主键 |
| `payment_no` | `VARCHAR(32)` | 是 | 单号，唯一 |
| `business_type` | `VARCHAR(32)` | 是 | `供应商/物流商` |
| `counterparty_id` | `BIGINT` | 否 | 往来方主键 |
| `counterparty_name` | `VARCHAR(128)` | 是 | 往来方名称快照 |
| `payment_date` | `DATE` | 是 | 付款日期 |
| `pay_type` | `VARCHAR(32)` | 是 | 付款方式 |
| `amount` | `DECIMAL(14,2)` | 是 | 金额 |
| `status` | `VARCHAR(16)` | 是 | `草稿/已付款` |
| `operator_name` | `VARCHAR(64)` | 是 | 经办人 |
| `remark` | `VARCHAR(255)` | 否 | 备注 |

### 10.3 应收应付建议实现

对应前端模块：`receivables-payables`

当前不建议单独建“固定结果表”，建议通过视图或汇总 SQL 生成。

可选方案：

- 方案 A：数据库视图 `vw_receivables_payables`
- 方案 B：服务层按对账单 + 收付款单实时汇总

建议输出字段：

- `direction`
- `counterparty_type`
- `counterparty_name`
- `opening_amount`
- `current_amount`
- `settled_amount`
- `balance_amount`
- `status`
- `remark`

## 11. 合同表

### 11.1 采购合同头 `ct_purchase_contract`

对应前端模块：`purchase-contracts`

字段：

- `id`
- `contract_no`
- `supplier_id`
- `supplier_name`
- `sign_date`
- `effective_date`
- `expire_date`
- `buyer_name`
- `total_weight`
- `total_amount`
- `status`
- `remark`

状态建议：

- `草稿`
- `执行中`
- `已签署`
- `已归档`

### 11.2 采购合同明细 `ct_purchase_contract_item`

结构同采购订单明细。

### 11.3 销售合同头 `ct_sales_contract`

对应前端模块：`sales-contracts`

字段：

- `id`
- `contract_no`
- `customer_id`
- `customer_name`
- `project_name`
- `sign_date`
- `effective_date`
- `expire_date`
- `sales_name`
- `total_weight`
- `total_amount`
- `status`
- `remark`

### 11.4 销售合同明细 `ct_sales_contract_item`

结构同销售订单明细。

## 12. 系统设置与 RBAC 表

### 12.1 单号规则 `sys_no_rule`

对应前端模块：`general-settings`

字段：

- `id`
- `setting_code`
- `setting_name`
- `bill_name`
- `prefix`
- `date_rule`
- `serial_length`
- `reset_rule`
- `sample_no`
- `status`
- `remark`

### 12.2 权限表 `sys_permission`

对应前端模块：`permission-management`

字段：

- `id`
- `permission_code`
- `permission_name`
- `module_name`
- `permission_type`
- `action_name`
- `scope_name`
- `resource_key`
- `status`
- `remark`

### 12.3 角色表 `sys_role`

对应前端模块：`role-settings`

字段：

- `id`
- `role_code`
- `role_name`
- `role_type`
- `data_scope`
- `permission_count`
- `permission_summary`
- `user_count`
- `status`
- `remark`

### 12.4 用户表 `sys_user`

对应前端模块：`user-accounts`

字段：

- `id`
- `login_name`
- `password_hash`
- `user_name`
- `mobile`
- `data_scope`
- `permission_summary`
- `last_login_date`
- `status`
- `remark`

### 12.5 用户角色关系 `sys_user_role`

字段：

- `id`
- `user_id`
- `role_id`

唯一索引：

- `uk_user_role(user_id, role_id)`

### 12.6 角色权限关系 `sys_role_permission`

字段：

- `id`
- `role_id`
- `permission_id`

唯一索引：

- `uk_role_permission(role_id, permission_id)`

### 12.7 操作日志 `sys_operation_log`

对应前端模块：`operation-logs`

字段：

- `id`
- `log_no`
- `operator_id`
- `operator_name`
- `login_name`
- `module_name`
- `action_type`
- `business_no`
- `request_method`
- `request_path`
- `client_ip`
- `result_status`
- `operation_time`
- `remark`

索引：

- `idx_sys_op_log_time(operation_time)`
- `idx_sys_op_log_module(module_name)`
- `idx_sys_op_log_operator(login_name)`
- `idx_sys_op_log_business_no(business_no)`

## 13. 运维支持与打印模板

### 13.1 运维工单 `ops_ticket`

对应前端模块：`ops-support`

字段：

- `id`
- `ticket_no`
- `issue_type`
- `priority_level`
- `submitter_name`
- `handler_name`
- `submit_date`
- `status`
- `remark`

### 13.2 打印模板 `print_template`

对应前端打印模板页

字段：

- `id`
- `bill_type`
- `template_name`
- `template_html`
- `is_default`
- `source`
- `update_time`

索引：

- `idx_print_bill_type(bill_type)`
- `idx_print_bill_default(bill_type, is_default)`

## 14. 当前前端不建议单独建表的内容

以下内容当前前端没有独立模块或没有稳定字段，不建议第一阶段单独建业务表：

- 独立价格核准表
- 应收应付结果固化表
- 独立物流对账汇总表

原因：

- 当前前端没有独立价格核准页面
- 当前应收应付更适合视图/汇总结果
- 当前物流对账汇总只是查询态弹窗，不是正式单据

## 15. 第一阶段最小可用建表清单

如果以“最短时间跑通当前前端”为目标，建议至少先建这些表：

1. `md_material`
2. `md_supplier`
3. `md_customer`
4. `md_carrier`
5. `md_warehouse`
6. `po_purchase_order`
7. `po_purchase_order_item`
8. `po_purchase_inbound`
9. `po_purchase_inbound_item`
10. `so_sales_order`
11. `so_sales_order_item`
12. `so_sales_outbound`
13. `so_sales_outbound_item`
14. `lg_freight_bill`
15. `lg_freight_bill_item`
16. `inv_stock_balance`
17. `inv_stock_io_log`
18. `st_supplier_statement`
19. `st_customer_statement`
20. `st_freight_statement`
21. `st_freight_statement_item`
22. `sys_biz_attachment`
23. `fm_receipt`
24. `fm_payment`
25. `ct_purchase_contract`
26. `ct_purchase_contract_item`
27. `ct_sales_contract`
28. `ct_sales_contract_item`
29. `sys_no_rule`
30. `sys_permission`
31. `sys_role`
32. `sys_user`
33. `sys_user_role`
34. `sys_role_permission`
35. `ops_ticket`
36. `print_template`

## 16. 下一步建议

基于这份表结构，后端下一步最适合继续拆两份内容：

1. 建表 SQL 初稿
2. 接口清单到 Controller / Service / DTO 级别

如果你继续，我下一步直接给你生成 SQL 文档，不再停在设计层。
