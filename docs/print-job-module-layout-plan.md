# 打印作业分模块布局方案

> 状态：待评审
> 范围：前端 `aries`（打印作业弹窗）+ 后端 `leo`（print-runtime / 模板清单）
> 关联提交：`07e843f5`、`b143f5fd`、`76d8f972`、`92e7546a`（本轮打印问题修复与真实库列契约门禁）

## 1. 背景

打印作业弹窗目前是「一套通用骨架 + 3 处模块补丁」：

| 已有模块差异 | 位置 |
| --- | --- |
| 明细列（4 个模块专门，其余共用默认） | `src/utils/print-module-config.ts` 的 `PRINT_ITEM_FIELDS_BY_MODULE` |
| 对账单分组 + 限高滚动 | `isStatementPrintModule` |
| 销售订单选项（隐藏单价/品牌替换/合并拆分） | `supportsSalesOrderPrintOption` |

其余（Header、汇总条、选项区、弹窗骨架）对所有单据类型同一套，导致：

1. 采购订单/采购入库/销售出库/物流单明细**看不到单价、金额**（后端 `printItemAmount=true` 已返回，前端列清单排除）；
2. 所有非对账单模块**不显示数量单位**；
3. 汇总条固定「交货日期 / 合计件数 / 合计重量」：交货日期只有销售订单有，其余模块显示 `-`；收付款单的件数/重量无意义；
4. Header 往来对象只认 `customerName / supplierName / carrierName`，收付款单是 `counterpartyName` → 为空；
5. 模板清单（`print-template-manifest.json`）只覆盖 7/10 模块，payment / receipt / sales-return 仍显示打印按钮，打开后是「无可用模板」；
6. 「拆分打印」对所有模块显示，但对账单/采购单没有拆分件数语义。

根因：**打印布局没有"单据类型"这一层配置**，模块差异散落在前端函数判断、后端 `print-runtime.json`、模板 manifest 三处，且互相不知道对方。

## 2. 业内模型

主流 ERP 都是「模块 → 单据类型 → 模板 + 打印参数」的分层配置，并要求每个单据类型显式声明：

- **Dynamics 365 Print Management**：模块下挂该模块所有业务单据类型节点，每个节点配置模板、输出目标、份数、页面；新增单据类型需在 `PrintMgmtDocumentType` 登记。支持模块级 → 客户级 → 交易级覆盖。
  <https://dynamics-tips.com/print-management/> · <https://ax.docentric.com/d365fo-print-management-settings-per-module/>
- **NetSuite**：模板绑定「custom form + transaction type」，新建自定义事务类型自动生成标准模板。
  <https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_4453550706.html>
- **ERPNext**：每个可打印 Document Type 有 Standard Print Format，打印界面可改选。
  <https://docs.erpnext.com/docs/user/manual/en/print-format>
- **金蝶套打设置**：按单据类型保存打印方案（模板、每张分录数、相同分录合并、条件方案），按用户保存。
  <https://help.open.kingdee.com/dokuwiki/doku.php?id=套打设置与应用> · <https://www.kingdee-tj.com/news/1083396226566721536>
- **打印对话框 UX**：只显示当前单据相关参数，参数由打印动作预设。
  <https://ux.stackexchange.com/questions/37026/print-options-dialog>

结论：**我们缺的是"单据类型节点"这一层**，而不是多级覆盖。按我们的规模，做「模块级配置 + 每模块默认模板」即可。

## 3. 目标

1. 一处声明：`模块 → 打印布局`（明细列、Header 往来对象、汇总条、选项、是否可滚动、是否可打印）；
2. 显式可打印：没有模板的模块不再显示打印入口（或明确提示），不再出现「有按钮、无模板」的悬空状态；
3. 配置与后端能力对齐：前端列清单不超出 `print-runtime.json` 的 `productPrintItems` / `printItemAmount` / `allocationAmountColumn` 能力；
4. 渐进式：未配置模块回退当前默认布局，可逐模块切换，不破坏现有功能；
5. 沿用已有门禁：真实库列契约测试（`PrintRuntimeColumnContractPostgresTest`）继续守住数据面。

## 4. 配置模型

新增 `src/utils/print-job-layout.ts`：

```ts
import type { ModuleKey } from '@/module-system/core/module-key'
import type { PrintItemFieldKey } from '@/utils/print-module-config'

export interface PrintJobSummarySpec {
  /** 日期行：labelKey + 从单据记录取值的候选字段（按顺序取第一个非空）。 */
  date: { labelKey: string; fields: string[] } | null
  remark: boolean
  settlementCompany: boolean
  /** 商品类合计。 */
  quantity: boolean
  weight: boolean
  /** 金额类合计：优先取明细 amount，取不到再取表头金额字段。 */
  amount?: { labelKey: string; headerFields?: string[] }
}

export interface PrintJobOptionsSpec {
  hideRemark: boolean
  itemSelection: boolean
  hideUnitPrice: boolean
  brandOverride: boolean
  split: boolean
  merge: boolean
}

export interface PrintJobLayout {
  /** false = 该模块不提供打印作业入口（无模板或业务上不支持）。 */
  printable: boolean
  /** Header 往来对象字段（按顺序取第一个非空）。 */
  counterpartyFields: string[]
  itemFields: PrintItemFieldKey[]
  summary: PrintJobSummarySpec
  options: PrintJobOptionsSpec
  scrollableItems: boolean
}

/** 未配置模块的回退：保留现状（商品列、无金额、通用选项）。 */
export const DEFAULT_PRINT_JOB_LAYOUT: PrintJobLayout

export const PRINT_JOB_LAYOUTS: Partial<Record<ModuleKey, PrintJobLayout>>

export function getPrintJobLayout(moduleKey: string): PrintJobLayout
```

保留 `getPrintItemFields` / `supportsSalesOrderPrintOption` / `isStatementPrintModule` 三个导出，改为从 layout 派生（薄封装），避免一次性改所有调用方。

## 5. 模块矩阵

字段能力取自 `print-runtime.json`；模板取自 `print-template-manifest.json`（现状）。

| 模块 | 模板 | 明细列（建议） | Header 往来对象 | 日期行 | 合计 | 选项 | 可滚动 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sales-order | 6 | 品牌/类别/材质/规格/长度/件数/**数量单位**/件重/总重/单价/金额 | customerName | 交货日期 `deliveryDate` | 件数+重量 | hideRemark/itemSelection/hideUnitPrice/brandOverride/split/merge | 否 |
| sales-outbound | 1 | 同上（后端有单价/金额） | customerName | 出库日期 `outboundDate` | 件数+重量 | hideRemark/itemSelection | 否 |
| sales-return | **无** | —（阶段 2 补模板后同 sales-order，无 merge） | customerName | 退货日期 `returnDate` | 件数+重量 | ← printable: false | — |
| purchase-order | 1 | 品牌/类别/材质/规格/长度/件数/数量单位/件重/总重/单价/金额 | supplierName | 采购日期 `orderDate` | 件数+重量 | hideRemark/itemSelection | 否 |
| purchase-inbound | 1 | 同上 | supplierName | 入库日期 `inboundDate` | 件数+重量 | hideRemark/itemSelection | 否 |
| freight-bill | 3 | 品牌/类别/材质/规格/长度/件数/数量单位/件重/总重（无单价金额） | carrierName | 单据日期 `billTime` | 件数+重量+总运费 `totalFreight` | hideRemark/itemSelection | 否 |
| customer-statement | 2 | 品牌/类别/材质/规格/长度/件数/数量单位/件重/总重/单价/金额 | customerName | **对账期间** `startDate ~ endDate` | 件数+重量+金额 | hideRemark/itemSelection | 是 |
| freight-statement | 1 | 品牌/规格/材质/类别/长度/件数/数量单位/件重/总重（金额在分组行） | carrierName | **对账期间** | 件数+重量+总运费 | hideRemark/itemSelection | 是 |
| payment | **无** | —（阶段 2：来源单号 + 分摊金额） | counterpartyName | 付款日期 `paymentDate` | 金额 | ← printable: false | — |
| receipt | **无** | —（阶段 2：来源单号 + 分摊金额） | counterpartyName | 收款日期 `receiptDate` | 金额 | ← printable: false | — |

说明：

- `split` 仅在 sales-order 为 true（拆分件数语义只对它成立）；
- 数量单位 `quantityUnit` 在后端 `itemPrintColumns` 里全部存在，可直接上列；
- 收付款单明细是 `fm_*_allocation`（`productPrintItems=false`，`allocationAmountColumn=allocated_amount`），列应为「来源单号 + 分摊金额」，不是商品列。

## 6. 改造清单

### 前端（阶段 1）

| 文件 | 改动 |
| --- | --- |
| `src/utils/print-job-layout.ts`（新增） | 配置模型 + 10 模块矩阵 + `getPrintJobLayout` |
| `src/utils/print-job-layout.spec.ts`（新增） | 逐模块断言 printable/列/汇总/选项（矩阵即契约） |
| `src/views/modules/components/PrintJobModalBody.tsx` | 汇总条、选项、列、滚动全部读 layout；`recordCounterparty` 传 layout 字段 |
| `src/views/modules/components/PrintJobModalSummaryBar.tsx` | 改为 layout 驱动的 item 列表，支持金额合计与自定义日期标签 |
| `src/views/modules/components/PrintJobTemplateOptionsForm.tsx` | 选项来自 `layout.options`（去掉 `isSalesOrder` 入参） |
| `src/views/modules/components/PrintTemplateDropdown.tsx` | `printable: false` 时不渲染按钮（或禁用 + tooltip「该单据暂不支持打印」） |
| `src/views/modules/components/print-job-modal-format.ts` | `recordCounterparty(record, fields?)` 支持 `counterpartyName` |
| `src/utils/print-module-config.ts` | 三个导出改为从 layout 派生；`FULL_PRINT_ITEM_FIELDS` 保持 |
| `src/views/modules/components/PrintJobModalBody.spec.tsx` | 增加销售订单/采购订单/对账单/收付款单四类快照断言 |

### 后端（阶段 2，前端配置落地后再做）

| 文件 | 改动 |
| --- | --- |
| `src/main/resources/print-runtime.json` | 每个模块增加 `"printable": true/false`（当前 7 个 true，payment/receipt/sales-return false） |
| `PrintRuntimeProperties` | 暴露 `printableModules()`（已存在）与 `isPrintable(moduleKey)` |
| `PrintRecordAuthorization` | 白名单由 `print-runtime.json` 派生（阶段 3），暂时保留硬编码 + 一致性测试 |
| 新增契约测试 | manifest 的 billType ⊆ printable 模块；printable 模块必须有模板（杜绝「有入口无模板」） |
| 阶段 2 可选 | 补 payment/receipt/sales-return 默认模板（`print-forms/` + manifest + PDF 渲染回归） |

### i18n

日期行与金额合计的文案优先复用现有 key（`modules.print.deliveryDate`、`modules.print.statementPeriod`、`modules.columns.*`）；缺失的（出库日期/采购日期/入库日期/单据日期/付款日期/收款日期）成对补 `zh-CN` / `en-US`。

## 7. 分阶段

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| 阶段 0（已完成） | 真实库列契约门禁 `PrintRuntimeColumnContractPostgresTest` | 已提交 `92e7546a` |
| 阶段 1（P0） | 前端 layout 配置化 + 显式 printable + 修 4 处错配（counterpartyName、split 门控、单价/金额列、数量单位） | `print-job-layout.spec` 覆盖 10 模块；Body 四类单据断言；`tsc`/biome/antd lint/vitest 绿 |
| 阶段 2（P1） | `print-runtime.json` printable + manifest 一致性测试；补 3 个模块模板（或确认不支持） | 契约测试绿；PDF 渲染回归 |
| 阶段 3（P2） | `statementGroupingColumns` / 模块读权限白名单配置化；`PrintScriptService` 拆分 | 真实库回归 + ArchUnit + 全量测试 |

阶段 1 不改后端，可独立发布；阶段 2 起需要后端配合。

## 8. 兼容与回退

- `getPrintJobLayout` 对未配置模块返回 `DEFAULT_PRINT_JOB_LAYOUT`（= 当前行为），因此可逐模块切换；
- `printable: false` 只隐藏前端入口，不删除后端打印能力，回退只需改回 true；
- 明细列只做"从可选中去掉/加上"，不改变后端返回结构；
- 后端 `printable` 为新增字段，旧配置缺省按 false 处理（失败闭合，需与 manifest 一起上线）。

## 9. 风险

1. **矩阵是业务决策**：采购订单/入库/出库是否显示单价金额、物流单是否显示总运费，需要产品确认后再改代码；
2. 补模板涉及 PDF 渲染回归（`default-*.layout.json`），成本高于前端配置化；
3. 收付款单的明细语义（分摊金额）与商品明细完全不同，若接入需要单独的列定义与后端字段（`amount` 已可用）；
4. 不做多级覆盖（客户级/交易级），那是多组织/客户定制场景，当前规模不需要。

## 10. 不在本方案内

- 打印队列/异步任务（`print-exports` 现状是同步下载）；
- 多级打印设置覆盖（模块 → 客户 → 交易）；
- 打印预览所见即所得编辑器（模板编辑已有独立入口）。
