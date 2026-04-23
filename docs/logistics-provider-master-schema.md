# 物流商信息落地文档

## 字段定义

物流商信息按最小必要字段收敛如下：

| 字段名 | 中文名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | 主键 | `BIGINT` | 是 | 雪花算法生成，接口按 `string` 返回 |
| `companyName` | 公司名称 | `VARCHAR(128)` | 是 | 物流商全称 |
| `taxNo` | 税号 | `VARCHAR(64)` | 否 | 纳税人识别号 |
| `bankName` | 开户银行 | `VARCHAR(128)` | 否 | 默认收款开户行 |
| `bankAccount` | 银行账号 | `VARCHAR(64)` | 否 | 默认收款账号 |
| `shortName` | 简写 | `VARCHAR(64)` | 否 | 列表、下拉、运费单展示使用 |
| `remark` | 备注 | `VARCHAR(255)` | 否 | 补充说明 |

## 主键规则

- `id` 使用雪花算法生成
- 数据库字段类型使用 `BIGINT`
- 接口返回时按 `string` 传输，避免前端精度丢失

## 接口返回示例

```json
{
  "id": "1914876201459235101",
  "companyName": "苏州顺达物流有限公司",
  "taxNo": "913205947953654321",
  "bankName": "中国建设银行苏州支行",
  "bankAccount": "6227000000000000000",
  "shortName": "顺达物流",
  "remark": ""
}
```

## 结论

物流商信息最终保留以下字段：

```text
id
companyName
taxNo
bankName
bankAccount
shortName
remark
```
