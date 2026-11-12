import {} from '@ant-design/icons'
import i18next from 'i18next'
import { createElement } from 'react'
import { buildDocumentStatusOptions } from '@/constants/module-options'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import {
  getCustomerOptions,
  getCustomerProjectOptions,
  getSettlementCompanyOptions,
} from '@/module-system/core/module-option-resolvers'
import { computeDraftTotals } from '@/module-system/editor/module-editor-draft'
import type {
  ModuleItemColumnConfig,
  ModulePageConfig,
} from '@/types/module-page'
import { renderProjectNameCell } from '@/utils/project-display'
import { asString } from '@/utils/type-narrowing'
import { buildDefaultLineItemSummary } from '@/views/modules/components/module-detail-summary'
import { NetPriceMatchChip } from '@/views/modules/components/NetPriceMatchChip'
import { SalesOrderDetailMetrics } from '@/views/modules/components/SalesOrderDetailMetrics'
import { SalesOrderNetPriceCheck } from '@/views/modules/components/SalesOrderNetPriceCheck'
import { SalesOrderNetPriceFiller } from '@/views/modules/components/SalesOrderNetPriceFiller'
import { sumChargeItemAmount } from '@/views/modules/module-editor-draft-adapter'
import { sumLineItemsBy } from '@/views/modules/module-editor-workspace-support'
import { renderDocumentReferenceNo } from '../shared/document-reference'
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
    /*
     * 默认隐藏的派生列：
     * - 剩余可出库量只在「出库录入/候选」里有用（那是数量上限的依据），录单与详情都用不上；
     * - 已交付 / 已退货 / 净交付 是整单口径的派生量，列表行上已经汇总显示过一次，
     *   展开行再逐行重复一遍会让「整单 vs 行」两个层级混在一屏里
     *   （且 A 口径下它们与「剩余可出库」不闭合，并排容易被读成数据对不上）。
     * 需要时都能从明细的「列设置」勾出来。
     */
    hiddenByDefault: [
      'outboundRemainingQuantity',
      'deliveredQuantity',
      'returnedQuantity',
      'deliveredNetQuantity',
    ],
    // 商品编码列不再占用表格空间；材质列承载物料选择，选中后仍会同步填充
    // materialId/materialCode 及其它物料快照字段，满足后端请求契约。
    overrides: {
      material: {
        editor: { control: 'material' },
      },
    },
    /*
     * 4 个派生数量列：值由后端按**已保存**单据聚合，新建 / 草稿单据必然全是空值或 0。
     * `hideWhenAllEmpty` 让整列没信息时**不进表**（否则新建页右侧并排 4 个「-」，
     * 白占约三分之一宽度，还容易让人以为漏填）；一旦有交付数据，列自动出现。
     * 只读详情面不受影响 —— 详情要能看到"这一列是 0"本身。
     */
    privateColumns: [
      {
        title: i18next.t('modules.pages.salesOrder.colDeliveredQuantity'),
        dataIndex: 'deliveredQuantity',
        width: 100,
        align: 'right',
        type: 'count',
        hideWhenAllEmpty: true,
        render: renderDerivedQuantity,
      },
      {
        title: i18next.t('modules.pages.salesOrder.colReturnedQuantity'),
        dataIndex: 'returnedQuantity',
        width: 100,
        align: 'right',
        type: 'count',
        hideWhenAllEmpty: true,
        render: renderDerivedQuantity,
      },
      {
        title: i18next.t('modules.pages.salesOrder.colDeliveredNetQuantity'),
        dataIndex: 'deliveredNetQuantity',
        width: 110,
        align: 'right',
        type: 'count',
        hideWhenAllEmpty: true,
        render: renderDerivedQuantity,
      },
      {
        title: i18next.t('modules.columns.outboundRemainingQuantity'),
        dataIndex: 'outboundRemainingQuantity',
        width: 116,
        align: 'right',
        type: 'count',
        hideWhenAllEmpty: true,
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
  /*
   * 筛选条件按 `row` 分成两行（渲染顺序 = 这里的声明顺序）：
   * - 第一行：单据编号 / 交货日期（占 2 列）/ 单据状态 —— 查单号、查时间窗、查状态；
   *   日期区间要并排显示两个完整日期，占 2 列才不会被截断，正好把 4 列排满。
   * - 第二行：客户名称 / 项目名称 / 结算主体 —— 客户与项目联动（换客户清项目），
   *   结算主体是补充第 3 格新增的入口（后端 `salesOrderPage` 早就支持
   *   `settlementCompanyId`，前端此前没有）。
   */
  filters: [
    {
      key: 'keyword',
      label: ORDER_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t('modules.pages.salesOrder.placeholderOrderNo'),
      row: 1,
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
      row: 1,
    },
    {
      /*
       * 日期区间占 2 列，且**排在行尾**：它比其它字段宽（需要放下两个完整日期），
       * 放在行中会让右侧剩下的空白夹在字段之间、看起来像少了一个控件；
       * 放在行尾时多出来的宽度就落在行的右边界上。
       */
      key: 'deliveryDate',
      label: i18next.t('modules.pages.salesOrder.filterDeliveryDate'),
      type: 'dateRange',
      defaultDateRange: {
        monthsBefore: 3,
        monthsAfter: 1,
      },
      row: 1,
      span: 2,
    },
    {
      key: 'customerId',
      label: CUSTOMER_NAME_LABEL,
      type: 'select',
      options: getCustomerOptions,
      resetKeysOnChange: ['projectId'],
      row: 2,
    },
    {
      key: 'projectId',
      label: i18next.t('modules.pages.salesOrder.filterProjectName'),
      type: 'select',
      options: getCustomerProjectOptions,
      row: 2,
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
      row: 2,
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.salesOrder.colOrderNo'),
      dataIndex: 'orderNo',
      width: 190,
      render: renderDocumentReferenceNo,
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
  defaultHiddenColumnKeys: ['purchaseOrderNo', 'salesName', 'remark'],
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
    /*
     * 信息区的排布顺序按参考稿（顶栏已显示单号，方案 B 里 `orderNo` 通过
     * `detailInfoHiddenKeys` 从信息区隐藏，因此它排在最前不影响新版的四列流式网格）：
     * 客户 → 采购订单号 → 结算主体 → 销售员 / 接单日期 → 交货日期 → 总金额 → 总重量。
     */
    {
      label: i18next.t('modules.pages.salesOrder.colCustomerName'),
      key: 'customerName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colPurchaseOrderNo'),
      key: 'purchaseOrderNo',
      row: 1,
    },
    {
      label: SETTLEMENT_COMPANY_LABEL,
      key: 'settlementCompanyName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.salesOrder.colSalesName'),
      key: 'salesName',
      row: 1,
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
      /* 总金额是信息区里唯一需要被第一眼看到的关键数值：强调色 + 粗体（纯展示标记）。 */
      label: i18next.t('modules.columns.totalAmount'),
      key: 'totalAmount',
      type: 'amount',
      row: 2,
      emphasis: true,
    },
    {
      label: i18next.t('modules.columns.totalWeight'),
      key: 'totalWeight',
      type: 'weight',
      row: 2,
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
      row: 3,
    },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
      row: 3,
    },
    /*
     * 项目名称与订单备注放在最后并**整行展示**（`fullRow`）：两者都是长文本，
     * 夹在四列短字段中间会把后面的行挤得参差不齐。
     *
     * 只有项目名称额外声明 `boxed`（浅灰圆角底框 + 定位图标）—— 它是"地址/地点"性质的值，
     * 需要从一串字段里跳出来；备注是普通说明文本，整行即可，加框反而像又一张小卡片。
     */
    {
      label: i18next.t('modules.pages.salesOrder.colProjectName'),
      key: 'projectName',
      row: 5,
      fullRow: true,
      boxed: true,
    },
    {
      label: i18next.t('modules.columns.remark'),
      key: 'remark',
      row: 6,
      fullRow: true,
    },
  ],
  formFields: [
    /*
     * 抬头不分区标题（2026-11）：原先用「基本信息 / 日期与经手」两个 Divider 分段，
     * 用户反馈占一行高度、信息量为零。改为单段平铺——视觉分组仍由 row 保持
     * （第 1 行客户/项目/单号，第 2 行报单/交货日期与销售员，备注整行收尾），
     * 不再声明 section 时 ModuleEditorFormSection 不渲染区块标题。
     */
    {
      key: 'orderNo',
      label: i18next.t('modules.pages.salesOrder.colOrderNo'),
      type: 'input',
      required: true,
      row: 1,
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
    },
    {
      key: 'customerId',
      label: i18next.t('modules.pages.salesOrder.colCustomerName'),
      type: 'select',
      required: true,
      options: getCustomerOptions,
      masterOptionRequirements: { customers: true },
      row: 1,
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
    },
    {
      key: 'orderDate',
      label: i18next.t('modules.pages.salesOrder.colOrderDate'),
      type: 'date',
      required: true,
      /*
       * row 2：row 1 由「客户 / 项目 / 订单编号 / 采购订单号」4 个 span=6 字段占满
       * （单号由 moveDocumentNoFieldsToSectionEnd 移到段末，渲染仍按 row 归组），
       * 第 5 个会被 antd 静默挤到下一行最左（30 栅格 > 24），日期与经手统一放第 2 行。
       */
      row: 2,
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
    },
    {
      key: 'salesName',
      label: i18next.t('modules.pages.salesOrder.colSalesName'),
      type: 'input',
      required: true,
      disabled: true,
      row: 2,
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
  /*
   * 只读详情面(详情弹窗 / 列表行「+」展开)没有取价工具栏, 由这里发起网价核查;
   * 否则「网价匹配」列在这两处永远显示「未核查」。
   *
   * 「项目数据」卡片行已从这两处只读面移除: 同一批数据改由顶部指标条(detailMetricsSlot)
   * 展示, 否则详情里会同时出现"卡片行 + 指标条"两份同源数字。编辑器侧的卡片行保留,
   * 见 renderEditorExtras。
   */
  renderDetailExtras: ({ record }) =>
    createElement(SalesOrderNetPriceCheck, { record }),
  /** 详情顶部的四项指标条：合同金额/吨位使用率、送货对比、未对账。 */
  detailMetricsSlot: SalesOrderDetailMetrics,
  /*
   * 信息区改用方案 B 的紧凑「标签：值」流式网格（2 列 / md 4 列，长文本整行）。
   *
   * 缺省值是 `'descriptions'`：其余 18 个模块共用同一套详情组件，它们不配置本字段，
   * 信息区继续用 antd Descriptions，外观与改造前一致。顶栏（标题 + 单号 + 状态）
   * 同样只在 `'inline'` 下渲染 —— 换句话说，这一行就是「销售订单详情面走方案 B」的总开关。
   */
  detailLayout: 'inline',
  /*
   * 业务信息卡的标题栏文案（白卡内「蓝色竖条 + 标题」）。
   * 未配置的模块不渲染标题栏，信息卡与改造前一致。
   */
  detailInfoTitle: i18next.t('modules.detailCards.businessInfoTitle'),
  /*
   * 顶栏「来源单据」chip：本单由哪张采购订单转入。
   *
   * 只放单号身份（+ 复制），不放「关联项目」——项目属于业务字段，信息区已有，
   * 顶栏再放一次就是同一串字在上下两处打架（销售订单此前正是这种重复）。
   * 空值（手工新建的销售订单没有来源单）时组件整段不渲染，不留孤立竖线。
   */
  detailHeaderSource: {
    typeLabel: i18next.t('modules.pages.salesOrder.colPurchaseOrderNo'),
    key: 'purchaseOrderNo',
  },
  /*
   * 顶栏「单据链」按钮：打开单据流向弹层（图 / 列表 / 时间线）。
   * 弹层复用的是列表页同一个 DocumentFlowModal，数据接口与节点口径完全一致。
   */
  detailHeaderDocumentFlow: true,
  /*
   * 顶栏右侧的三个动作按钮（参考稿的视觉占位）。
   *
   * 三个都**没有对接接口**，因此一律 `disabled` + 悬停说明「未接入」：
   * - 打印送货单 / 导出对账单：前端还没有这两个动作的实现（不走「点了没反应」的假按钮）；
   * - 变更维护：详情覆盖层**拿不到**编辑器的打开能力（`BusinessGridOverlays` 只把
   *   `onCloseDetail / onRetryDetail` 传给详情面，没有 openEditor），因此这里接不上，
   *   同样禁用。等详情面拿到编辑回调后，只需给这几项补 `onClick` 并去掉 `disabled`。
   */
  /*
   * 顶栏不再放「打印送货单 / 导出对账单 / 变更维护」三个占位按钮。
   *
   * <p>它们原本是 `disabled: true` 且没有 `onClick` 的占位（后端也没有对应能力），
   * 用户能做的只有 hover 才看到「未接入」—— 三个灰按钮里还有一个是 `variant: 'primary'`
   * 的主色按钮，不可点的主按钮是误导最强的一档。占位承诺的不是功能，而是"系统坏了"。
   * 等接口真正就绪时再加回；历史实现见 ef9e8a98。</p>
   */
  /*
   * 方案 B 的信息区不再重复顶栏已经显示的主单号（18 位数字在一屏里出现两次，
   * 读者会怀疑是不是两张单）。状态字段由 `hasDetailHeaderStatus` 统一处理，不在这里列。
   */
  detailInfoHiddenKeys: ['orderNo', 'purchaseOrderNo'],
  /*
   * 明细表底部的合计行。
   *
   * 求和口径的唯一出口是 sumLineItemsBy（编辑器联动、保存载荷用的是同一个函数），
   * 这里只把四项合计投影成按列对齐的单元格，不再写第二份 reduce 或 toLocaleString。
   */
  detailSummary: ({ items }) => buildDefaultLineItemSummary(items),
  /*
   * 编辑器(新建/编辑弹层)的项目数据：**与「完成销售」详情面同一套四张指标卡**
   * （同一个 `SalesOrderDetailMetrics` 组件、同一份口径），不再是三组带边框的小面板。
   *
   * 编辑器与详情面的唯一差别是本单还没落库：
   * - 排除本单已保存的金额/吨位（excludeOrderId），否则与草稿合计重复计数；
   * - 把草稿合计作为 pending 下发，让使用率/送货包含本单；
   * - 「/ 总重量」取草稿合计吨位，否则新建单据时恒为 0。
   *
   * 合计口径复用 computeDraftTotals —— 与保存载荷同一出口，绝不在本配置里再 reduce 明细。
   */
  renderEditorExtras: ({ record, items, expenseItems }) => {
    const totals = computeDraftTotals(
      'sales-order',
      items,
      sumLineItemsBy,
      sumChargeItemAmount(expenseItems),
    )
    const excludeOrderId = asString(record.id).trim()
    return createElement(SalesOrderDetailMetrics, {
      record,
      variant: 'editor',
      ...(excludeOrderId ? { excludeOrderId } : {}),
      ...(totals
        ? {
            pendingAmount: totals.totalAmount,
            pendingTonnage: totals.totalWeight,
            orderTotalWeight: totals.totalWeight,
          }
        : {}),
    })
  },
  data: [],
  buildOverview: buildSalesOrderOverview,
  statusMap: salesOrderStatusMap,
  rowHighlightStatuses: [DOCUMENT_STATUS.DRAFT],
}
