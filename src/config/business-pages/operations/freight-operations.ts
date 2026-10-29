import i18next from 'i18next'
import {
  FIXED_FREIGHT_AMOUNT_FIELD,
  FREIGHT_SETTLEMENT_MODE_BY_TONNAGE,
  FREIGHT_SETTLEMENT_MODE_FIXED,
  isFixedFreightSettlement,
  isValidFixedFreightAmount,
  SETTLEMENT_MODE_FIELD,
} from '@/constants/freight-settlement'
import { withDeletedDocumentStatus } from '@/constants/module-options'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import {
  getCarrierVehiclePlateOptions,
  getSettlementCompanyOptions,
} from '@/module-system/core/module-option-resolvers'
import { getCarrierEntityOptions } from '@/queries/master/carrier-options'
import type {
  ModuleItemColumnConfig,
  ModulePageConfig,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  AUDIT_STATUS_LABEL,
  CARRIER_NAME_LABEL,
  FREIGHT_NO_FILTER_LABEL,
} from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import { statusMap } from '../shared/shared'
import { resolveModuleItemColumnConfig } from '../shared/shared-item-column-utils'
import {
  buildFreightBillOverview,
  buildFreightBillParentFilters,
  transformSalesOrderItemsToFreightBillItems,
} from './freight-operations-rules'

/**
 * 结算方式枚举 → 中文文案。
 *
 * <p>唯一展示出口：详情表头（`detailFields`）只认「同 dataIndex 列的 render」，
 * 因此这里同时供默认隐藏的列表列与详情字段使用；编辑表单的分段选项用的是同一组
 * i18n key，文案不会分叉。取值与后端 `FreightSettlementMode` 的 2 个枚举值一一对应，
 * 未知值原样回退（历史脏值不显示空白）。</p>
 */
const FREIGHT_SETTLEMENT_MODE_LABEL_KEYS: Record<string, string> = {
  [FREIGHT_SETTLEMENT_MODE_BY_TONNAGE]:
    'modules.pages.freightOperations.settlementModeByTonnage',
  [FREIGHT_SETTLEMENT_MODE_FIXED]:
    'modules.pages.freightOperations.settlementModeFixed',
}

function renderFreightSettlementMode(value: unknown) {
  const mode = asString(value)
  if (!mode) {
    return '-'
  }
  const labelKey = FREIGHT_SETTLEMENT_MODE_LABEL_KEYS[mode]
  return labelKey ? i18next.t(labelKey) : mode
}

// 物流单明细列：按仓库、品牌与规格核对，隐藏商品编码、商品名称、客户/项目、每件支数与批号。
const freightBillItemColumnConfig: ModuleItemColumnConfig = {
  include: [
    'sourceNo',
    'warehouseName',
    'brand',
    'category',
    'material',
    'spec',
    'length',
    'unit',
    'quantity',
    'quantityUnit',
    'pieceWeightTon',
    'weightTon',
  ],
  overrides: {
    warehouseName: { labelKey: 'modules.columns.warehouse', width: 132 },
    brand: { width: 92 },
    category: { width: 84 },
    material: { width: 92 },
    spec: { width: 128 },
    unit: { width: 64 },
    pieceWeightTon: { width: 90 },
  },
  projections: {
    saveResult: [
      'warehouseName',
      'brand',
      'material',
      'spec',
      'length',
      'quantity',
      'weightTon',
    ],
  },
}
const freightBillItemColumnOutputs = resolveModuleItemColumnConfig(
  freightBillItemColumnConfig,
)

export const freightOperationsPageConfigs: Record<string, ModulePageConfig> = {
  'freight-bill': {
    key: 'freight-bill',
    title: i18next.t('modules.pages.freightOperations.freightBill'),
    kicker: 'Freight',
    description: i18next.t('modules.pages.freightOperations.freightBillDesc'),
    primaryNoKey: 'billNo',
    actions: [
      {
        key: 'create_freight_bill',
        label: i18next.t('modules.pages.freightOperations.createFreightBill'),
        type: 'primary',
      },
    ],
    filters: [
      {
        key: 'keyword',
        label: FREIGHT_NO_FILTER_LABEL,
        type: 'input',
        placeholder: i18next.t(
          'modules.pages.freightOperations.freightBillPlaceholder',
        ),
      },
      {
        key: 'productKeyword',
        label: i18next.t('moduleFilters.商品信息'),
        type: 'input',
      },
      {
        key: 'carrierId',
        label: CARRIER_NAME_LABEL,
        type: 'select',
        options: getCarrierEntityOptions,
      },
      {
        key: 'status',
        label: AUDIT_STATUS_LABEL,
        type: 'segmented',
        options: withDeletedDocumentStatus([
          {
            label: i18next.t('modules.status.draft'),
            value: DOCUMENT_STATUS.DRAFT,
          },
          {
            label: i18next.t('modules.pages.freightOperations.audited'),
            value: DOCUMENT_STATUS.AUDITED,
          },
        ]),
      },
      {
        key: 'settlementCompanyId',
        label: SETTLEMENT_COMPANY_LABEL,
        type: 'segmented',
        options: getSettlementCompanyOptions,
      },
      {
        key: 'billTime',
        label: i18next.t('modules.pages.freightOperations.documentDate'),
        type: 'dateRange',
        row: 2,
      },
    ],
    columns: [
      {
        title: i18next.t('modules.pages.freightOperations.freightBillNo'),
        dataIndex: 'billNo',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.freightStatement.carrierCode'),
        dataIndex: 'carrierCode',
        width: 130,
      },
      {
        title: i18next.t('modules.pages.freightOperations.carrier'),
        dataIndex: 'carrierName',
        width: 140,
      },
      {
        title: i18next.t('modules.pages.freightOperations.vehiclePlate'),
        dataIndex: 'vehiclePlate',
        width: 120,
      },
      {
        title: SETTLEMENT_COMPANY_LABEL,
        dataIndex: 'settlementCompanyName',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.freightOperations.documentDate'),
        dataIndex: 'billTime',
        width: 120,
        type: 'date',
      },
      {
        /*
         * 默认隐藏的「结算方式」列：本身是详情表头的展示口径来源
         * （`detailFields` 复用同 dataIndex 列的 render，见 renderFreightSettlementMode）。
         * 已在 defaultHiddenColumnKeys 声明，列表默认外观不变。
         */
        title: i18next.t('modules.pages.freightOperations.settlementMode'),
        dataIndex: SETTLEMENT_MODE_FIELD,
        width: 120,
        render: renderFreightSettlementMode,
      },
      {
        title: i18next.t('modules.pages.freightOperations.totalWeight'),
        dataIndex: 'totalWeight',
        width: 116,
        align: 'right',
        type: 'weight',
      },
      {
        title: i18next.t('modules.pages.freightOperations.unitPrice'),
        dataIndex: 'unitPrice',
        width: 100,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.freightOperations.totalFreight'),
        dataIndex: 'totalFreight',
        width: 110,
        align: 'right',
        type: 'amount',
      },
      {
        title: i18next.t('modules.pages.freightOperations.auditStatus'),
        dataIndex: 'status',
        width: 110,
        type: 'status',
        align: 'center',
      },
      {
        title: i18next.t('modules.columns.remark'),
        dataIndex: 'remark',
        width: 180,
      },
    ],
    defaultHiddenColumnKeys: [
      'carrierCode',
      'settlementCompanyName',
      'unitPrice',
      SETTLEMENT_MODE_FIELD,
      'remark',
    ],
    detailFields: [
      {
        label: i18next.t('modules.pages.freightOperations.freightBillNo'),
        key: 'billNo',
      },
      {
        label: i18next.t('modules.pages.freightOperations.carrier'),
        key: 'carrierName',
      },
      {
        label: i18next.t('modules.pages.freightStatement.carrierCode'),
        key: 'carrierCode',
      },
      {
        label: SETTLEMENT_COMPANY_LABEL,
        key: 'settlementCompanyName',
      },
      {
        label: i18next.t('modules.pages.freightOperations.vehiclePlate'),
        key: 'vehiclePlate',
      },
      {
        label: i18next.t('modules.pages.freightOperations.documentDate'),
        key: 'billTime',
        type: 'date',
      },
      {
        // 后端响应已返回结算方式（字符串枚举，V184）；详情表头此前漏配。
        // 中文映射由同名列的 render 提供（renderFreightSettlementMode），不在这里另写。
        label: i18next.t('modules.pages.freightOperations.settlementMode'),
        key: SETTLEMENT_MODE_FIELD,
      },
      {
        label: i18next.t('modules.pages.freightOperations.unitPrice'),
        key: 'unitPrice',
        type: 'amount',
      },
      {
        // 固定运费模式下才有值；按吨位模式后端返回 null，格式化后显示「-」。
        label: i18next.t('modules.pages.freightOperations.fixedFreightAmount'),
        key: 'fixedFreightAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.freightOperations.totalWeight'),
        key: 'totalWeight',
        type: 'weight',
      },
      {
        label: i18next.t('modules.pages.freightOperations.totalFreight'),
        key: 'totalFreight',
        type: 'amount',
      },
      {
        // 附加费用合计：货物口径的 totalFreight 不含费用，后端详情单独返回该值。
        label: i18next.t('modules.expense.totalAmount'),
        key: 'totalExpenseAmount',
        type: 'amount',
      },
      {
        label: i18next.t('modules.pages.freightOperations.auditStatus'),
        key: 'status',
        type: 'status',
      },
      {
        label: i18next.t('modules.pages.freightOperations.remark'),
        key: 'remark',
      },
    ],
    /*
     * 表头分区（实测反馈「布局不合理」后重排）：可填字段在前，只读派生值整行后置。
     *   第 1 行 单据头   —— 编号 / 物流商* / 车号 / 单据日期*
     *   第 2 行 结算     —— 结算方式* + 它决定的两个金额紧邻，切换模式时目光不用跨行
     *   第 3 行 只读派生 —— 物流商编码 / 结算主体 / 总运费，均由上游带出或系统计算；
     *                       只读框与输入框同权重混排会让人以为"没填对"，故集中到末行
     *   第 4 行 备注     —— 整行
     */
    formFields: [
      {
        key: 'billNo',
        label: i18next.t('modules.pages.freightOperations.freightBillNo'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'carrierId',
        label: i18next.t('modules.pages.freightOperations.carrier'),
        type: 'select',
        required: true,
        options: getCarrierEntityOptions,
        row: 1,
      },
      {
        // 物流商编码由所选物流商派生（只读），必须紧跟在物流商后面：
        // 中间隔一个「车号」会让读数时以为它与车号相关（实测反馈的排版问题之一）。
        // row 必须与 carrierId 同为 1 —— 此前写的是 row: 3，配置上"紧跟"而渲染上被排到
        // 最后一行，注释与结果自相矛盾。
        key: 'carrierCode',
        label: i18next.t('modules.pages.freightStatement.carrierCode'),
        type: 'input',
        disabled: true,
        row: 1,
      },
      {
        key: 'vehiclePlate',
        label: i18next.t('modules.pages.freightOperations.vehiclePlate'),
        type: 'autoComplete',
        options: getCarrierVehiclePlateOptions,
        row: 2,
      },
      {
        key: 'billTime',
        label: i18next.t('modules.pages.freightOperations.documentDate'),
        type: 'date',
        required: true,
        row: 1,
      },
      {
        key: SETTLEMENT_MODE_FIELD,
        label: i18next.t('modules.pages.freightOperations.settlementMode'),
        type: 'segmented',
        required: true,
        defaultValue: FREIGHT_SETTLEMENT_MODE_BY_TONNAGE,
        options: [
          {
            label: i18next.t(
              'modules.pages.freightOperations.settlementModeByTonnage',
            ),
            value: FREIGHT_SETTLEMENT_MODE_BY_TONNAGE,
          },
          {
            label: i18next.t(
              'modules.pages.freightOperations.settlementModeFixed',
            ),
            value: FREIGHT_SETTLEMENT_MODE_FIXED,
          },
        ],
        /*
         * 不再合并两列：本表单实际是 3 列节奏（每行 3 个字段，各占 8），colSpan 12 会占 1.5 格，
         * 把后面的「单价」顶到最右并留出半格空洞（实测截图的空洞就来自这里）。
         * 3 列节奏下每格约 470px，「按吨位结算 / 固定运费」两个分段放得下，无需加宽。
         */
        row: 2,
      },
      {
        key: 'unitPrice',
        label: i18next.t('modules.pages.freightOperations.unitPrice'),
        type: 'number',
        // 固定运费模式下单价仍必填并照旧存储（后端 @NotNull / unit_price NOT NULL），
        // 只是不再作为结算依据，因此用 extra + tooltip 明确标注而不隐藏、不清空。
        required: true,
        min: 0,
        precision: 2,
        defaultValue: 0,
        extra: (form) =>
          isFixedFreightSettlement(form)
            ? i18next.t(
                'modules.pages.freightOperations.unitPriceNotSettlementBasis',
              )
            : undefined,
        tooltip: (form) =>
          isFixedFreightSettlement(form)
            ? i18next.t(
                'modules.pages.freightOperations.unitPriceNotSettlementBasis',
              )
            : undefined,
        row: 2,
      },
      {
        key: FIXED_FREIGHT_AMOUNT_FIELD,
        label: i18next.t('modules.pages.freightOperations.fixedFreightAmount'),
        type: 'number',
        // 只在固定运费模式出现：其余模式下整块 Form.Item 被卸载，既不会用不存在的金额拦住提交，
        // 也不会把切模式前残留的必填错误留在界面上。
        required: true,
        visibleWhen: isFixedFreightSettlement,
        precision: 2,
        validate: (value: unknown) =>
          isValidFixedFreightAmount(value)
            ? undefined
            : i18next.t('modules.validation.fixedFreightAmountPositive'),
        extra: i18next.t(
          'modules.pages.freightOperations.fixedFreightAmountHelp',
        ),
        row: 2,
      },
      {
        // 结算主体与结算方式同属「结算信息」，排在同一行；原来夹在固定运费与总运费之间，
        // 把一组结算字段拆到了两行。
        key: 'settlementCompanyId',
        label: SETTLEMENT_COMPANY_LABEL,
        type: 'select',
        options: getSettlementCompanyOptions,
        disabled: true,
        row: 3,
      },
      {
        key: 'totalFreight',
        label: i18next.t('modules.pages.freightOperations.totalFreight'),
        type: 'number',
        precision: 2,
        controls: false,
        // 结算金额由 normalizer 按结算方式算好后写回表单；服务端同样计算，不参与提交载荷。
        disabled: true,
        extra: (form) =>
          i18next.t(
            isFixedFreightSettlement(form)
              ? 'modules.pages.freightOperations.totalFreightFromFixed'
              : 'modules.pages.freightOperations.totalFreightFromTonnage',
          ),
        row: 3,
      },
      {
        key: 'remark',
        label: i18next.t('modules.pages.freightOperations.remark'),
        type: 'input',
        row: 4,
        fullRow: true,
      },
    ],
    saveFields: {
      scalar: [
        'billNo',
        'carrierId',
        'carrierCode',
        'carrierName',
        'settlementCompanyId',
        'settlementCompanyName',
        'vehiclePlate',
        'billTime',
        'unitPrice',
        SETTLEMENT_MODE_FIELD,
        FIXED_FREIGHT_AMOUNT_FIELD,
        'status',
        'remark',
      ],
      lineItem: [
        'sourceNo',
        'sourceSalesOrderItemId',
        'settlementCompanyId',
        'settlementCompanyName',
        'customerId',
        'customerName',
        'projectId',
        'projectName',
        'materialId',
        'materialCode',
        'materialName',
        'brand',
        'category',
        'material',
        'spec',
        'length',
        'quantity',
        'quantityUnit',
        'pieceWeightTon',
        'piecesPerBundle',
        'batchNo',
        'weightTon',
        'warehouseId',
        'warehouseName',
      ],
    },
    parentImport: {
      parentModuleKey: 'sales-order',
      label: i18next.t('modules.filter.salesOrder'),
      parentFieldKey: 'sourceOrderNos',
      parentDisplayFieldKey: 'orderNo',
      buttonText: '选择销售订单导入（可部分）',
      candidateQueryType: 'freight-sales-order-import',
      allowMultipleSelection: true,
      replaceUnlinkedItemsOnFirstImport: true,
      requiredSourceItemIdField: 'sourceSalesOrderItemId',
      buildParentFilters: buildFreightBillParentFilters,
      /*
       * 刻意不设 `validateBeforeOpen`：选择销售订单不需要先选物流商。
       * 导入明细的结算主体取自**上级销售订单行**（见 transformSalesOrderItemsToFreightBillItems），
       * 与物流商无关；此前"请先选择物流商"的门槛会让先导入、后补物流商的正常录入顺序走不通。
       */
      transformItems: transformSalesOrderItemsToFreightBillItems,
    },
    ...freightBillItemColumnOutputs,
    data: [],
    buildOverview: buildFreightBillOverview,
    statusMap,
    rowHighlightStatuses: [DOCUMENT_STATUS.DRAFT],
  },
}
