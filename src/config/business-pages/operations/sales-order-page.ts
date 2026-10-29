import i18next from 'i18next'
import { createElement } from 'react'
import { buildDocumentStatusOptions } from '@/constants/module-options'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import {
  getCustomerOptions,
  getCustomerProjectOptions,
} from '@/module-system/core/module-option-resolvers'
import type {
  ModuleItemColumnConfig,
  ModulePageConfig,
} from '@/types/module-page'
import { renderProjectNameCell } from '@/utils/project-display'
import { NetPriceMatchChip } from '@/views/modules/components/NetPriceMatchChip'
import { SalesOrderNetPriceCheck } from '@/views/modules/components/SalesOrderNetPriceCheck'
import { SalesOrderNetPriceFiller } from '@/views/modules/components/SalesOrderNetPriceFiller'
import {
  BILL_STATUS_LABEL,
  CUSTOMER_NAME_LABEL,
  ORDER_NO_FILTER_LABEL,
} from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import { actionSet } from '../shared/shared'
import { resolveModuleItemColumnConfig } from '../shared/shared-item-column-utils'
import { statusMap as sharedStatusMap } from '../shared/shared-status'
import {
  buildSalesOrderOverview,
  buildSalesOrderParentFilters,
  mapPurchaseInboundToSalesOrderDraft,
  renderDerivedQuantity,
  renderSalesOrderNo,
  renderSalesOrderTotalWeight,
  transformPurchaseInboundItemsToSalesOrderItems,
  validateSalesOrderPurchaseSourceImport,
  warnSalesOrderPurchaseSourceImport,
} from './sales-order-rules'

/**
 * 网价匹配状态列 key。
 *
 * <p>匹配状态不落在明细行上（那会把单据标脏并可能混入保存载荷），而是由取价组件写入
 * 页面级快照（{@link useNetPriceMatchStore}），本列只按行 id 订阅渲染标识。</p>
 */
const NET_PRICE_MATCH_COLUMN_KEY = '_netPriceMatch' as const

// 销售订单明细列：仓库放在品牌前，商品编码与批号不进入默认页面白名单（永久不可见）。
// 末端三个派生数量列由后端聚合返回，仅用于只读展示。
type SalesOrderDerivedItemColumnKey =
  | 'deliveredQuantity'
  | 'returnedQuantity'
  | 'deliveredNetQuantity'
  | 'outboundRemainingQuantity'
  | typeof NET_PRICE_MATCH_COLUMN_KEY

const salesOrderItemColumnConfig: ModuleItemColumnConfig<SalesOrderDerivedItemColumnKey> =
  {
    include: [
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
      'unitPrice',
      'amount',
      // 网价匹配状态列紧邻单价/金额: 判断"单价是否落在网价口径上"时就在价格旁边
      NET_PRICE_MATCH_COLUMN_KEY,
      'deliveredQuantity',
      'returnedQuantity',
      'deliveredNetQuantity',
      'outboundRemainingQuantity',
    ],
    requiredFieldKeys: [
      'warehouseName',
      'brand',
      'category',
      'material',
      'spec',
      'unit',
      'quantity',
      'pieceWeightTon',
      'weightTon',
      'unitPrice',
      'amount',
    ],
    // 剩余可出库量仅在销售订单详情/出库来源候选中只读展示，销售订单编辑态默认隐藏。
    hiddenByDefault: ['outboundRemainingQuantity'],
    // 商品编码列不再占用表格空间；材质列承载物料选择，选中后仍会同步填充
    // materialId/materialCode 及其它物料快照字段，满足后端请求契约。
    overrides: {
      material: {
        editor: { control: 'material' },
      },
    },
    privateColumns: [
      {
        title: i18next.t('modules.pages.salesOrder.colDeliveredQuantity'),
        dataIndex: 'deliveredQuantity',
        width: 100,
        align: 'right',
        type: 'count',
        render: renderDerivedQuantity,
      },
      {
        title: i18next.t('modules.pages.salesOrder.colReturnedQuantity'),
        dataIndex: 'returnedQuantity',
        width: 100,
        align: 'right',
        type: 'count',
        render: renderDerivedQuantity,
      },
      {
        title: i18next.t('modules.pages.salesOrder.colDeliveredNetQuantity'),
        dataIndex: 'deliveredNetQuantity',
        width: 110,
        align: 'right',
        type: 'count',
        render: renderDerivedQuantity,
      },
      {
        title: i18next.t('modules.columns.outboundRemainingQuantity'),
        dataIndex: 'outboundRemainingQuantity',
        width: 116,
        align: 'right',
        type: 'count',
        render: renderDerivedQuantity,
      },
      {
        title: i18next.t('modules.pages.salesOrder.netPriceMatchColumn'),
        dataIndex: NET_PRICE_MATCH_COLUMN_KEY,
        width: 104,
        align: 'center',
        // 匹配状态是页面级核查快照(见 net-price-match-store), 不写进明细行:
        // 由组件按行 id 订阅, 避免把单据标脏、避免混入保存载荷。
        // .ts 配置不能用 JSX, 用 createElement 渲染行内标识。
        render: (_value, record) =>
          createElement(NetPriceMatchChip, { itemId: String(record.id) }),
        // 匹配状态不在明细行上(按行 id 订阅页面级 store), 必须显式声明由列渲染接管只读单元格。
        renderInEditor: true,
      },
    ],
    projections: {
      saveResult: [
        'brand',
        'material',
        'spec',
        'length',
        'quantity',
        'weightTon',
        'unitPrice',
        'amount',
      ],
    },
  }
const salesOrderItemColumnOutputs = resolveModuleItemColumnConfig(
  salesOrderItemColumnConfig,
)

// 销售订单状态含义：已审核=待交付核定，交付核定=待出库，完成销售=销售流程完成。
const salesOrderStatusMap = {
  ...sharedStatusMap,
  草稿: { ...sharedStatusMap.草稿, hint: '未审核，可编辑' },
  已审核: { ...sharedStatusMap.已审核, hint: '已审核，待交付核定' },
  交付核定: { ...sharedStatusMap.交付核定, hint: '已核定交付，待出库' },
  完成销售: { ...sharedStatusMap.完成销售, hint: '销售流程已完成' },
}

export const salesOrdersPageConfig: ModulePageConfig = {
  key: 'sales-order',
  title: i18next.t('modules.pages.salesOrder.title'),
  kicker: 'Sales',
  description: i18next.t('modules.pages.salesOrder.description'),
  primaryNoKey: 'orderNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: ORDER_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t('modules.pages.salesOrder.placeholderOrderNo'),
    },
    {
      key: 'customerId',
      label: CUSTOMER_NAME_LABEL,
      type: 'select',
      options: getCustomerOptions,
      resetKeysOnChange: ['projectId'],
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'segmented',
      options: buildDocumentStatusOptions(
        DOCUMENT_STATUS.DRAFT,
        DOCUMENT_STATUS.AUDITED,
        '交付核定',
        '完成销售',
      ),
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.salesOrder.filterProjectName'),
      type: 'select',
      options: getCustomerProjectOptions,
      row: 2,
    },
    {
      key: 'deliveryDate',
      label: i18next.t('modules.pages.salesOrder.filterDeliveryDate'),
      type: 'dateRange',
      defaultDateRange: {
        monthsBefore: 3,
        monthsAfter: 1,
      },
      row: 2,
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.salesOrder.colOrderNo'),
      dataIndex: 'orderNo',
      width: 190,
      render: renderSalesOrderNo,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colPurchaseOrderNo'),
      dataIndex: 'purchaseOrderNo',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colProjectName'),
      dataIndex: 'projectName',
      width: 240,
      render: renderProjectNameCell,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colCustomerName'),
      dataIndex: 'customerName',
      width: 140,
    },
    {
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colSalesName'),
      dataIndex: 'salesName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colOrderDate'),
      dataIndex: 'orderDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.salesOrder.colDeliveryDate'),
      dataIndex: 'deliveryDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.columns.totalWeight'),
      dataIndex: 'totalWeight',
      width: 140,
      align: 'right',
      type: 'weight',
      render: renderSalesOrderTotalWeight,
    },
    {
      title: i18next.t('modules.columns.totalAmount'),
      dataIndex: 'totalAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.salesOrder.colDeliveredQuantity'),
      dataIndex: 'deliveredQuantity',
      width: 100,
      align: 'right',
      type: 'count',
      render: renderDerivedQuantity,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colReturnedQuantity'),
      dataIndex: 'returnedQuantity',
      width: 100,
      align: 'right',
      type: 'count',
      render: renderDerivedQuantity,
    },
    {
      title: i18next.t('modules.pages.salesOrder.colDeliveredNetQuantity'),
      dataIndex: 'deliveredNetQuantity',
      width: 110,
      align: 'right',
      type: 'count',
      render: renderDerivedQuantity,
    },
    {
      title: i18next.t('modules.columns.status'),
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
  defaultHiddenColumnKeys: ['salesName', 'remark'],
  /*
   * 详情页表头顺序（全单据统一口径）：
   * 单号 → 来源单号 → 往来对象 → 项目 → 结算主体 → 业务日期 → 交货/截止日期 →
   * 经手人 → 汇总（重量/金额/派生数量）→ 状态 → 备注。
   *
   * 每行最多 4 个 span=6 字段：此前 row 2 塞了 6 个（项目/结算主体/报单日期/交货日期/
   * 总重量/总金额），靠 antd 自动换行"碰巧"没炸，但 row 值已不表达真实行号，
   * 后续插字段必然错位。
   */
  detailFields: [
    {
      label: i18next.t('modules.pages.salesOrder.colOrderNo'),
      key: 'orderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colPurchaseOrderNo'),
      key: 'purchaseOrderNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colCustomerName'),
      key: 'customerName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colProjectName'),
      key: 'projectName',
      row: 1,
    },
    {
      label: SETTLEMENT_COMPANY_LABEL,
      key: 'settlementCompanyName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colOrderDate'),
      key: 'orderDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colDeliveryDate'),
      key: 'deliveryDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colSalesName'),
      key: 'salesName',
      row: 2,
    },
    {
      label: i18next.t('modules.columns.totalWeight'),
      key: 'totalWeight',
      type: 'weight',
      row: 3,
    },
    {
      label: i18next.t('modules.columns.totalAmount'),
      key: 'totalAmount',
      type: 'amount',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colDeliveredQuantity'),
      key: 'deliveredQuantity',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colReturnedQuantity'),
      key: 'returnedQuantity',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colDeliveredNetQuantity'),
      key: 'deliveredNetQuantity',
      row: 4,
    },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
      row: 4,
    },
    {
      label: i18next.t('modules.columns.remark'),
      key: 'remark',
      row: 5,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'orderNo',
      label: i18next.t('modules.pages.salesOrder.colOrderNo'),
      type: 'input',
      required: true,
      row: 1,
      section: i18next.t('modules.formSections.basic'),
    },
    {
      /* 来源单号与主单号相邻：两者同属「这是哪张单/从哪来」，放一起便于追溯。 */
      key: 'purchaseOrderNo',
      label: i18next.t('modules.pages.salesOrder.colPurchaseOrderNo'),
      type: 'input',
      disabled: true,
      placeholder: i18next.t(
        'modules.pages.salesOrder.placeholderPurchaseOrderNo',
      ),
      row: 1,
      section: i18next.t('modules.formSections.basic'),
    },
    {
      key: 'customerId',
      label: i18next.t('modules.pages.salesOrder.colCustomerName'),
      type: 'select',
      required: true,
      options: getCustomerOptions,
      masterOptionRequirements: { customers: true },
      row: 1,
      section: i18next.t('modules.formSections.basic'),
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.salesOrder.colProjectName'),
      type: 'select',
      required: true,
      options: getCustomerProjectOptions,
      masterOptionRequirements: { customers: true, projects: true },
      // 项目按客户过滤: 未选客户时下拉必然为空, 空态要说明这个前置条件, 不能只说"暂无数据"
      emptyHint: i18next.t('modules.pages.salesOrder.projectEmptyHint'),
      row: 1,
      section: i18next.t('modules.formSections.basic'),
    },
    {
      key: 'orderDate',
      label: i18next.t('modules.pages.salesOrder.colOrderDate'),
      type: 'date',
      required: true,
      /*
       * row 2：row 1 已被「订单编号 / 采购订单号 / 客户 / 项目」4 个 span=6 字段占满，
       * 第 5 个会被 antd 静默挤到下一行最左（30 栅格 > 24）。
       * 现在行内顺序是「单号 → 来源单号 → 客户 → 项目」，日期与经手统一放第 2 行。
       */
      row: 2,
      section: i18next.t('modules.formSections.schedule'),
    },
    {
      key: 'deliveryDate',
      label: i18next.t('modules.pages.salesOrder.colDeliveryDate'),
      type: 'date',
      required: true,
      /*
       * 与报单日期同在第 2 行：两个日期相邻便于对比「报单 → 交货」的间隔。
       * 行宽由 module-field-layout 的行宽守卫测试锁定（每行 span 之和 ≤ 24）。
       */
      row: 2,
      section: i18next.t('modules.formSections.schedule'),
    },
    {
      key: 'salesName',
      label: i18next.t('modules.pages.salesOrder.colSalesName'),
      type: 'input',
      required: true,
      disabled: true,
      row: 2,
      section: i18next.t('modules.formSections.schedule'),
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'input',
      row: 3,
      fullRow: true,
    },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: i18next.t('modules.pages.salesOrder.parentImportLabel'),
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
    buttonText: i18next.t('modules.pages.salesOrder.parentImportButton'),
    allowMultipleSelection: true,
    remainingQuantityKey: 'remainingQuantity',
    candidateQueryType: 'sales-order-purchase-source',
    useCandidateSnapshot: true,
    buildParentFilters: buildSalesOrderParentFilters,
    hiddenSelectorColumnKeys: ['status'],
    mapParentToDraft: mapPurchaseInboundToSalesOrderDraft,
    transformItems: transformPurchaseInboundItemsToSalesOrderItems,
    // 项目资料可维护「允许品牌/允许材质」与处理方式：BLOCK 挡在导入前，WARN 导入后再提示。
    // 前端拦截只是体验层，服务端保存时还会再判一次（见 SalesOrderProjectScopeGuard）。
    validateParentImport: validateSalesOrderPurchaseSourceImport,
    warnParentImport: warnSalesOrderPurchaseSourceImport,
  },
  ...salesOrderItemColumnOutputs,
  renderItemsActions: (ctx) => createElement(SalesOrderNetPriceFiller, ctx),
  // 只读详情面(详情弹窗 / 列表行「+」展开)没有取价工具栏, 由这里发起网价核查;
  // 否则「网价匹配」列在这两处永远显示「未核查」。
  renderDetailExtras: ({ record }) =>
    createElement(SalesOrderNetPriceCheck, { record }),
  data: [],
  buildOverview: buildSalesOrderOverview,
  statusMap: salesOrderStatusMap,
  rowHighlightStatuses: [DOCUMENT_STATUS.DRAFT],
}
