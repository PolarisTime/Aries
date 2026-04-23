# 商品主数据落地文档

## 适用范围

本版商品主数据用于钢材业务的基础档案，当前优先覆盖以下品类：

- 螺纹钢
- 盘螺
- 线材

商品主数据只描述商品默认属性，不处理采购、销售、入库、出库阶段的过磅结算逻辑。  
过磅相关字段和计算规则放在业务单据阶段处理。

## 主键与编码

- `id`
  - 类型：`BIGINT`
  - 生成方式：雪花算法
  - 用途：系统内部主键、数据库关联、前端行标识
  - 接口传输：按 `string` 返回，避免前端精度丢失
- `materialCode`
  - 类型：`VARCHAR(64)`
  - 用途：业务编码
  - 说明：对用户可见，用于搜索、录单、打印

## 字段清单

| 字段名 | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | 主键 | `BIGINT` | 是 | 雪花算法生成，接口按字符串返回 |
| `materialCode` | 商品编码 | `VARCHAR(64)` | 是 | 业务唯一编码 |
| `brand` | 品牌 | `VARCHAR(64)` | 是 | 如沙钢、永钢 |
| `material` | 材质 | `VARCHAR(32)` | 是 | 如 `HRB400`、`HRB500` |
| `category` | 类别 | `VARCHAR(32)` | 是 | `螺纹钢`、`盘螺`、`线材` |
| `spec` | 规格 | `VARCHAR(32)` | 是 | 如 `Φ18`、`Φ8` |
| `length` | 长度 | `VARCHAR(32)` | 否 | 螺纹钢填 `9米`、`12米`；盘螺、线材可为空 |
| `unit` | 单位 | `VARCHAR(16)` | 是 | 当前统一建议为 `吨` |
| `pieceWeightTon` | 件重/吨 | `DECIMAL(10,3)` | 是 | 所有类别都填写默认件重 |
| `piecesPerBundle` | 每件支数 | `INT` | 是 | 所有类别都填写；盘螺、线材可按业务约定填写 `1` |
| `unitPrice` | 单价 | `DECIMAL(10,2)` | 是 | 口径统一为 `元/吨` |
| `batchNoEnabled` | 批号开关 | `TINYINT(1)` | 是 | `1` 启用批号管理，`0` 不启用 |
| `remark` | 备注 | `VARCHAR(255)` | 否 | 补充说明 |
| `enabled` | 启停状态 | `TINYINT(1)` | 是 | `1` 启用，`0` 停用 |
| `ext1` | 保留字段1 | `VARCHAR(255)` | 否 | 预留扩展使用 |
| `ext2` | 保留字段2 | `VARCHAR(255)` | 否 | 预留扩展使用 |
| `ext3` | 保留字段3 | `VARCHAR(255)` | 否 | 预留扩展使用 |

## 业务规则

### 1. 类别

当前类别范围固定为：

- `螺纹钢`
- `盘螺`
- `线材`

### 2. 长度规则

- `category = 螺纹钢` 时，`length` 建议必填，推荐值：
  - `9米`
  - `12米`
- `category = 盘螺` 或 `线材` 时，`length` 允许为空

### 3. 件重规则

- `pieceWeightTon` 所有类别都必须填写
- 该字段表示商品默认件重，用于业务单据阶段带出默认值
- 盘螺、线材后续如果发生过磅，以业务单据中的实际过磅重量处理，不回写商品主数据字段定义

### 4. 每件支数规则

- `piecesPerBundle` 所有类别都填写
- 对螺纹钢，填写真实每件支数
- 对盘螺、线材，如果业务按整件处理，可先约定为 `1`

### 5. 单价规则

- `unitPrice` 统一口径为 `元/吨`
- 商品档案中保存默认单价
- 实际成交价允许在采购单、销售单中覆盖

### 6. 批号开关规则

- `batchNoEnabled = 1` 时，表示该商品启用批号管理
- `batchNoEnabled = 0` 时，表示该商品不启用批号管理
- 是否录入具体批号，不放在商品主数据本体里，而放在业务单据明细和库存批次中处理
- 当商品启用批号管理后，采购入库、销售出库、库存明细建议按批号分开处理

### 7. 保留字段规则

- `ext1`
- `ext2`
- `ext3`

以上三个字段为通用保留字段，当前不赋予固定业务含义。

当前建议：

- 默认允许为空
- 当前不参与查询、排序、金额计算
- 前端页面默认可隐藏
- 后续有明确业务需求时，再单独赋予实际用途

## 推荐枚举

### 类别枚举

```text
螺纹钢
盘螺
线材
```

### 长度枚举

```text
9米
12米
```

仅螺纹钢使用该枚举；盘螺、线材可为空。

### 启停状态

```text
1 = 启用
0 = 停用
```

## 接口返回示例

```json
{
  "id": "1914876201459234816",
  "materialCode": "LW-HRB500-18-12",
  "brand": "沙钢",
  "material": "HRB500",
  "category": "螺纹钢",
  "spec": "Φ18",
  "length": "12米",
  "unit": "吨",
  "pieceWeightTon": 2.59,
  "piecesPerBundle": 18,
  "unitPrice": 3630.0,
  "batchNoEnabled": 1,
  "remark": "",
  "enabled": 1,
  "ext1": null,
  "ext2": null,
  "ext3": null
}
```

```json
{
  "id": "1914876201459234817",
  "materialCode": "PL-HRB400-8",
  "brand": "永钢",
  "material": "HRB400",
  "category": "盘螺",
  "spec": "Φ8",
  "length": null,
  "unit": "吨",
  "pieceWeightTon": 1.98,
  "piecesPerBundle": 1,
  "unitPrice": 3580.0,
  "batchNoEnabled": 0,
  "remark": "",
  "enabled": 1,
  "ext1": null,
  "ext2": null,
  "ext3": null
}
```

## 前端落地建议

- 商品列表主列：
  - 商品编码
  - 品牌
  - 材质
  - 类别
  - 规格
  - 长度
  - 单位
  - 件重/吨
  - 每件支数
  - 单价
  - 批号管理
  - 状态
- 商品编辑表单：
  - `category = 螺纹钢` 时显示并校验 `length`
  - `category = 盘螺` 或 `线材` 时 `length` 可为空

## 结论

本版商品主数据最终保留以下字段：

```text
id
materialCode
brand
material
category
spec
length
unit
pieceWeightTon
piecesPerBundle
unitPrice
batchNoEnabled
remark
enabled
ext1
ext2
ext3
```
