/** 交易明细公共字段的稳定语义 key。 */
export type TradeLineItemFieldKey =
  | 'sourceNo'
  | 'materialCode'
  | 'brand'
  | 'category'
  | 'material'
  | 'spec'
  | 'length'
  | 'unit'
  | 'piecesPerBundle'
  | 'warehouseName'
  | 'batchNo'
  | 'quantity'
  | 'quantityUnit'
  | 'pieceWeightTon'
  | 'weightTon'
  | 'settlementMode'
  | 'weighWeightTon'
  | 'weightAdjustmentTon'
  | 'weightAdjustmentAmount'
  | 'actualWeightTon'
  | 'unitPrice'
  | 'amount'
  | 'materialName'
  | 'customerName'
  | 'projectName'

export type TradeLineItemEditorControl =
  | 'text'
  | 'number'
  | 'material'
  | 'warehouse'
  | 'settlementMode'

export interface TradeLineItemEditorSemantics {
  control: TradeLineItemEditorControl
  precision?: number
  min?: number
  controls?: boolean
}
