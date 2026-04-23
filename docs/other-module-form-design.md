# 其他模块表单设计文档

## 适用范围

本文件用于补齐采购、销售之外的其余模块页面和字段设计，覆盖以下模块：

- 价格核准
- 物流单
- 商品库存报表
- 出入库报表
- 供应商对账单
- 客户对账单
- 物流对账单
- 收款单
- 付款单
- 应收应付
- 采购合同
- 销售合同

## 通用展示原则

所有表单和详情页统一按以下规则处理：

- `id` 为系统主键，页面隐藏不展示
- 除 `id` 外，其余业务字段默认全部展示
- 当前阶段不做字段折叠、不做高级字段隐藏
- 编辑页与详情页字段口径保持一致
- 报表页查询条件和结果字段尽量完整展示，不先做精简版

## 1. 价格核准

### 页面类型

- 列表页
- 新增/编辑页
- 详情页
- 选择销售出库单弹窗

### 表头字段

- `approvalNo`
- `depotHeadId`
- `organId`
- `billNo`
- `billTime`
- `deliveryDate`
- `totalWeight`
- `totalAmount`
- `status`
- `remark`

### 明细字段

- `depotItemId`
- `materialId`
- `materialExtendId`
- `barCode`
- `name`
- `standard`
- `model`
- `color`
- `brand`
- `operNumber`
- `weight`
- `unitPrice`
- `allPrice`
- `taxRate`
- `taxMoney`
- `taxLastMoney`
- `remark`

### 状态建议

- `待核准`
- `已核准`

### 现版业务逻辑

- 价格核准只允许从“已审核销售出库单”创建，不是采购/销售通用价格审批单
- 同一销售出库单只能生成一张价格核准单
- 创建时复制销售出库明细，后续允许在核准单内拆分明细行
- 拆分后多条核准明细仍共同对应原始 `depotItemId`
- 核准确认后，系统回写销售出库单头和出库明细价格数据
- 若该价格核准单已被客户对账单引用，则不允许取消核准
- 若销售出库重量变更，核准单需要同步刷新；已核准时还要继续回写销售出库金额

## 2. 物流单

### 页面类型

- 列表页
- 新增/编辑页
- 详情页

### 表头字段

- `billNo`
- `billTime`
- `carrierId`
- `carrierName`
- `unitPrice`
- `totalWeight`
- `totalFreight`
- `status`
- `deliveryStatus`
- `remark`

### 明细字段

- `depotHeadId`
- `billNo`
- `billTimeStr`
- `customerName`
- `projectName`
- `materialName`
- `standard`
- `model`
- `batchNo`
- `operNumber`
- `materialUnit`
- `itemWeight`
- `depotName`
- `salesMan`
- `remark`

### 状态建议

- `未审核`
- `已审核`
- `未送达`
- `已送达`

### 现版业务逻辑

- 物流单通过选择销售出库单建立，不单独手工录入商品明细
- 物流单明细本质上记录的是已关联的销售出库单，详情页再按出库商品展开显示
- 同一销售出库单不能重复关联到其他物流单
- 物流单总重量来源于关联销售出库单重量汇总
- 总运费 = 总重量 × 单价
- 查看物流单详情时，系统会按最新销售出库重量自动重算物流单重量和总运费
- 已审核物流单不能删除；已有付款记录时不能删除或反审核

## 3. 商品库存报表

### 页面类型

- 查询报表页
- 库存明细弹窗或详情页

### 查询条件

- `materialCode`
- `brand`
- `material`
- `category`
- `spec`
- `length`
- `warehouseId`
- `batchNo`
- `batchNoEnabled`

### 结果字段

- `materialCode`
- `brand`
- `material`
- `category`
- `spec`
- `length`
- `warehouseName`
- `batchNo`
- `quantity`
- `weightTon`
- `unit`
- `pieceWeightTon`
- `piecesPerBundle`

## 4. 出入库报表

### 页面类型

- 查询报表页
- 流水详情页

### 查询条件

- `dateRange`
- `businessType`
- `materialCode`
- `brand`
- `material`
- `category`
- `spec`
- `length`
- `warehouseId`
- `batchNo`
- `sourceNo`

### 结果字段

- `businessDate`
- `businessType`
- `sourceNo`
- `materialCode`
- `brand`
- `material`
- `category`
- `spec`
- `length`
- `warehouseName`
- `batchNo`
- `inQuantity`
- `outQuantity`
- `inWeightTon`
- `outWeightTon`
- `unit`
- `remark`

## 5. 供应商对账单

### 页面类型

- 列表页
- 对账详情页

### 表头字段

- `statementNo`
- `supplierId`
- `startDate`
- `endDate`
- `openingAmount`
- `purchaseAmount`
- `paymentAmount`
- `closingAmount`
- `status`
- `remark`

### 明细字段

- `businessDate`
- `businessType`
- `sourceNo`
- `materialId`
- `quantity`
- `weightTon`
- `unitPrice`
- `amount`
- `paymentAmount`
- `balanceAmount`
- `remark`

### 状态建议

- `草稿`
- `待确认`
- `已确认`
- `已完成`

## 6. 客户对账单

### 页面类型

- 列表页
- 对账详情页

### 现版业务逻辑说明

- 客户对账口径应建立在价格核准之后
- 已被客户对账单引用的价格核准单不允许取消核准
- 因此客户对账页面的数据源建议使用“已核准销售出库明细”，不要直接使用原始销售出库

### 表头字段

- `statementNo`
- `customerId`
- `customerProjectId`
- `startDate`
- `endDate`
- `openingAmount`
- `salesAmount`
- `receiptAmount`
- `closingAmount`
- `status`
- `remark`

### 明细字段

- `businessDate`
- `businessType`
- `sourceNo`
- `materialId`
- `quantity`
- `weightTon`
- `unitPrice`
- `amount`
- `receiptAmount`
- `balanceAmount`
- `remark`

### 状态建议

- `草稿`
- `待确认`
- `已确认`
- `已完成`

## 7. 物流对账单

### 页面类型

- 列表页
- 对账详情页
- 对账单生成弹窗
- 运费对账汇总页
- 运费对账明细弹窗

### 现版业务逻辑说明

- 当前版本存在两类页面：
  - 运费对账汇总/明细：直接按物流方汇总已审核物流单，并在物流单上记录付款状态、已付金额
  - 正式物流对账单：从未被其他对账单引用的已审核物流单生成
- 正式物流对账单支持审核、签署、附件、已付金额累计
- 已签署对账单不能删除；签署前必须先审核
- “部分付款”状态在物流单付款状态模型中存在，但当前页面操作主要支持“标记已付款”和“取消付款”

### 表头字段

- `statementNo`
- `carrierId`
- `startDate`
- `endDate`
- `totalWeight`
- `totalFreight`
- `paidAmount`
- `status`
- `signStatus`
- `attachment`
- `remark`

### 明细字段

- `businessDate`
- `businessType`
- `billNo`
- `carrierName`
- `totalWeight`
- `unitPrice`
- `totalFreight`
- `remark`

### 状态建议

- `待审核`
- `已审核`
- `未签署`
- `已签署`

## 8. 收款单

### 页面类型

- 列表页
- 新增/编辑页
- 详情页

### 表头字段

- `receiptNo`
- `customerId`
- `customerProjectId`
- `receiptDate`
- `payType`
- `amount`
- `status`
- `remark`

### 明细字段

- `sourceType`
- `sourceNo`
- `sourceAmount`
- `receivedAmount`
- `writeOffAmount`
- `balanceAmount`
- `remark`

### 状态建议

- `草稿`
- `已审核`
- `已核销`

## 9. 付款单

### 页面类型

- 列表页
- 新增/编辑页
- 详情页

### 表头字段

- `paymentNo`
- `businessType`
- `counterpartyId`
- `paymentDate`
- `payType`
- `amount`
- `status`
- `remark`

### 明细字段

- `sourceType`
- `sourceNo`
- `sourceAmount`
- `paidAmount`
- `writeOffAmount`
- `balanceAmount`
- `remark`

### 状态建议

- `草稿`
- `已审核`
- `已核销`

## 10. 应收应付

### 页面类型

- 应收列表页
- 应付列表页
- 往来详情页

### 应收查询条件

- `customerId`
- `customerProjectId`
- `dateRange`
- `sourceType`
- `sourceNo`

### 应收结果字段

- `customerName`
- `projectName`
- `sourceType`
- `sourceNo`
- `businessDate`
- `receivableAmount`
- `receivedAmount`
- `balanceAmount`

### 应付查询条件

- `businessType`
- `counterpartyId`
- `dateRange`
- `sourceType`
- `sourceNo`

### 应付结果字段

- `counterpartyName`
- `businessType`
- `sourceType`
- `sourceNo`
- `businessDate`
- `payableAmount`
- `paidAmount`
- `balanceAmount`

## 11. 采购合同

### 页面类型

- 列表页
- 新增/编辑页
- 详情页

### 表头字段

- `contractNo`
- `supplierId`
- `signDate`
- `startDate`
- `endDate`
- `amount`
- `status`
- `remark`

### 明细字段

- `materialId`
- `spec`
- `length`
- `quantity`
- `weightTon`
- `unitPrice`
- `amount`
- `remark`

### 状态建议

- `草稿`
- `已生效`
- `已终止`
- `已完成`

## 12. 销售合同

### 页面类型

- 列表页
- 新增/编辑页
- 详情页

### 表头字段

- `contractNo`
- `customerId`
- `customerProjectId`
- `signDate`
- `startDate`
- `endDate`
- `amount`
- `status`
- `remark`

### 明细字段

- `materialId`
- `spec`
- `length`
- `quantity`
- `weightTon`
- `unitPrice`
- `amount`
- `remark`

### 状态建议

- `草稿`
- `已生效`
- `已终止`
- `已完成`

## 结论

采购、销售之外的其余模块，当前统一按以下原则推进：

- `id` 隐藏
- 其余字段全部展示
- 列表页、编辑页、详情页口径统一
- 报表页查询条件和结果字段优先完整展示

后续如果要继续落地页面原型，可以直接基于本文件拆分每个模块的前端页面。
