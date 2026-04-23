# 客户信息落地文档

## 字段定义

客户信息按最小必要字段收敛如下：

| 字段名 | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | 主键 | `BIGINT` | 是 | 雪花算法生成，接口按 `string` 返回 |
| `companyName` | 公司名称 | `VARCHAR(128)` | 是 | 客户主体公司全称 |
| `taxNo` | 税号 | `VARCHAR(64)` | 否 | 纳税人识别号 |
| `bankName` | 开户银行 | `VARCHAR(128)` | 否 | 默认收款或开票银行信息 |
| `bankAccount` | 银行账号 | `VARCHAR(64)` | 否 | 默认收款账号 |
| `shortName` | 简写 | `VARCHAR(64)` | 否 | 列表、下拉、单据展示使用 |
| `remark` | 备注 | `VARCHAR(255)` | 否 | 补充说明 |

## 主键规则

- `id` 使用雪花算法生成
- 数据库字段类型使用 `BIGINT`
- 接口返回时按 `string` 传输，避免前端精度丢失

## 客户多个项目的合理处理方式

如果一个客户公司下面有多个项目名称，不建议在客户主表里直接重复建多条客户记录。  
更合理的方式是：

- 客户主表只存公司主体信息
- 单独建立客户项目子表，一家公司对应多个项目

也就是：

- `customer`
  - 存公司主体
- `customer_project`
  - 存项目名称
  - 通过 `customerId` 关联客户主体

### 为什么这样处理

- 同一个公司的税号、银行、简称、备注只维护一次
- 不会因为项目变化导致客户档案重复
- 销售单、送货单、对账单可以按项目维度选择
- 后续可以继续扩展项目地址、收货人、联系方式，而不污染客户主表

### 客户项目子表示例

| 字段名 | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | 主键 | `BIGINT` | 是 | 雪花算法生成 |
| `customerId` | 客户主键 | `BIGINT` | 是 | 关联客户主表 `id` |
| `projectName` | 项目名称 | `VARCHAR(200)` | 是 | 项目完整名称 |
| `projectShortName` | 项目简写 | `VARCHAR(64)` | 否 | 列表、下拉、单据展示使用 |
| `projectAddress` | 项目地址 | `VARCHAR(255)` | 否 | 项目送货地址 |
| `remark` | 备注 | `VARCHAR(255)` | 否 | 补充说明 |

### 示例

客户主表：

```json
{
  "id": "1914876201459235001",
  "companyName": "苏州城建一公司",
  "taxNo": "913205001234567890",
  "bankName": "中国银行苏州分行",
  "bankAccount": "6216000000000000000",
  "shortName": "城建一公司",
  "remark": ""
}
```

客户项目表：

```json
[
  {
    "id": "1914876201459235002",
    "customerId": "1914876201459235001",
    "projectName": "园区综合体一期",
    "projectShortName": "园区一期",
    "projectAddress": "苏州工业园区星华街 188 号",
    "remark": ""
  },
  {
    "id": "1914876201459235003",
    "customerId": "1914876201459235001",
    "projectName": "相城安置房二期",
    "projectShortName": "相城二期",
    "projectAddress": "苏州市相城区春申湖路 66 号",
    "remark": ""
  }
]
```

## 接口返回示例

```json
{
  "id": "1914876201459235001",
  "companyName": "苏州城建一公司",
  "taxNo": "913205001234567890",
  "bankName": "中国银行苏州分行",
  "bankAccount": "6216000000000000000",
  "shortName": "城建一公司",
  "remark": ""
}
```

## 结论

客户信息主表最终保留以下字段：

```text
id
companyName
taxNo
bankName
bankAccount
shortName
remark
```

客户项目建议拆成独立子表：

```text
id
customerId
projectName
projectShortName
projectAddress
remark
```
