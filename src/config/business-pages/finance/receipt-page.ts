import i18next from 'i18next'
import { withDeletedDocumentStatus } from '@/constants/module-options'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import {
  getCustomerProjectOptions,
  getSettlementAccountOptions,
  getSettlementCompanyOptions,
} from '@/module-system/core/module-option-resolvers'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { BILL_STATUS_LABEL } from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import { statusMap } from '../shared/shared'
import {
  buildReceiptOverview,
  getReceiptCounterpartyOptions,
} from './finance-page-rules'

/**
 * 收款用途枚举 → 中文文案。
 *
 * <p>唯一展示出口：详情表头（`detailFields`）只认「同 dataIndex 列的 render」，
 * 因此这里同时供默认隐藏的列表列与详情字段使用，不另写一份映射。取值与后端
 * `ReceiptPurposes` 的 3 个常量一一对应，未知值原样回退（历史脏值不显示空白）。</p>
 */
const RECEIPT_PURPOSE_LABEL_KEYS: Record<string, string> = {
  CUSTOMER_STATEMENT_SETTLEMENT:
    'financeDetail.purposeCustomerStatementSettlement',
  SUPPLIER_PREPAYMENT_REFUND: 'financeDetail.purposeSupplierPrepaymentRefund',
  SUPPLIER_OTHER_RECEIPT: 'financeDetail.purposeSupplierOtherReceipt',
}

function renderReceiptPurpose(value: unknown) {
  const purpose = asString(value)
  if (!purpose) {
    return '-'
  }
  const labelKey = RECEIPT_PURPOSE_LABEL_KEYS[purpose]
  return labelKey ? i18next.t(labelKey) : purpose
}

export const receiptsPageConfig: ModulePageConfig = {
  key: 'receipt',
  title: i18next.t('modules.pages.receipt.receipt'),
  kicker: 'Finance',
  description: i18next.t('modules.pages.receipt.receiptDesc'),
  primaryNoKey: 'receiptNo',
  actions: [
    {
      key: 'create_receipt',
      label: i18next.t('modules.pages.receipt.createReceipt'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.filter.documentOrCounterparty'),
      type: 'input',
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: withDeletedDocumentStatus([
        {
          label: i18next.t('modules.pages.receipt.draft'),
          value: DOCUMENT_STATUS.DRAFT,
        },
        {
          label: i18next.t('modules.filter.auditStatus'),
          value: DOCUMENT_STATUS.AUDITED,
        },
      ]),
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      options: getSettlementCompanyOptions,
    },
    {
      key: 'receiptDate',
      label: i18next.t('modules.pages.receipt.receiptDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.receipt.receiptNo'),
      dataIndex: 'receiptNo',
      width: 170,
    },
    {
      title: i18next.t('modules.filter.counterpartyType'),
      dataIndex: 'counterpartyType',
      width: 100,
    },
    {
      title: i18next.t('modules.filter.counterpartyCode'),
      dataIndex: 'counterpartyCode',
      width: 130,
    },
    {
      title: i18next.t('modules.filter.counterparty'),
      dataIndex: 'counterpartyName',
      width: 180,
    },
    {
      /*
       * 默认隐藏的「收款用途」列：本身是详情表头的展示口径来源
       * （`detailFields` 复用同 dataIndex 列的 render，见 renderReceiptPurpose）。
       * 已在 defaultHiddenColumnKeys 声明，列表默认外观不变。
       */
      title: i18next.t('modules.pages.receipt.receiptPurpose'),
      dataIndex: 'receiptPurpose',
      width: 160,
      render: renderReceiptPurpose,
    },
    {
      title: SETTLEMENT_COMPANY_LABEL,
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.receipt.receiptDate'),
      dataIndex: 'receiptDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.receipt.receiptMethod'),
      dataIndex: 'payType',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.receipt.amount'),
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.receipt.status'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.receipt.operator'),
      dataIndex: 'operatorName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.receipt.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: [
    'counterpartyCode',
    'payType',
    'receiptPurpose',
    'operatorName',
    'remark',
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.receipt.receiptNo'),
      key: 'receiptNo',
      row: 1,
    },
    {
      label: i18next.t('modules.filter.counterpartyType'),
      key: 'counterpartyType',
      row: 1,
    },
    {
      label: i18next.t('modules.filter.counterparty'),
      key: 'counterpartyName',
      row: 1,
    },
    {
      label: i18next.t('modules.filter.counterpartyCode'),
      key: 'counterpartyCode',
      row: 1,
    },
    { label: SETTLEMENT_COMPANY_LABEL, key: 'settlementCompanyName', row: 2 },
    {
      label: i18next.t('modules.pages.receipt.receiptDate'),
      key: 'receiptDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.receipt.receiptMethod'),
      key: 'payType',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.receipt.amount'),
      key: 'amount',
      type: 'amount',
      row: 2,
    },
    {
      // 后端新增的账户名称快照（accountName）：详情此前只能显示 accountId（雪花 ID）。
      // 放在金额之后，回答「这笔钱进了哪个账户」。
      label: i18next.t('modules.columns.account'),
      key: 'accountName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.receipt.status'),
      key: 'status',
      type: 'status',
      row: 3,
    },
    {
      // 收款用途由后端枚举返回，用于区分客户结算收款 / 供应商预付款退款等业务。
      label: i18next.t('modules.pages.receipt.receiptPurpose'),
      key: 'receiptPurpose',
      row: 3,
    },
    {
      // 编辑页用关联项目下拉（projectId），详情展示后端快照的项目名称。
      label: i18next.t('modules.filter.relatedContractProject'),
      key: 'projectName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.receipt.operator'),
      key: 'operatorName',
      row: 4,
    },
    {
      label: i18next.t('modules.pages.receipt.remark'),
      key: 'remark',
      row: 4,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'receiptNo',
      label: i18next.t('modules.pages.receipt.receiptNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'counterpartyType',
      label: i18next.t('modules.filter.counterpartyType'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '客户',
      options: [
        {
          label: i18next.t('modules.filter.counterpartyCustomer'),
          value: '客户',
        },
        {
          label: i18next.t('modules.filter.counterpartySupplier'),
          value: '供应商',
        },
      ],
      row: 1,
    },
    {
      key: 'counterpartyId',
      label: i18next.t('modules.filter.counterparty'),
      type: 'select',
      required: true,
      options: getReceiptCounterpartyOptions,
      masterOptionRequirements: { customers: true, suppliers: true },
      row: 1,
    },
    {
      key: 'settlementCompanyId',
      label: SETTLEMENT_COMPANY_LABEL,
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      masterOptionRequirements: { settlementCompanies: true },
      row: 2,
    },
    {
      key: 'receiptDate',
      label: i18next.t('modules.pages.receipt.receiptDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'payType',
      label: i18next.t('modules.pages.receipt.receiptMethod'),
      type: 'select',
      required: true,
      options: [
        {
          label: i18next.t('modules.pages.receipt.bankTransfer'),
          value: '银行转账',
        },
        {
          label: i18next.t('modules.pages.receipt.bankAcceptance'),
          value: '银行承兑',
        },
        {
          label: i18next.t('modules.pages.receipt.acceptanceBill'),
          value: '承兑汇票',
        },
        { label: i18next.t('modules.pages.receipt.cash'), value: '现金' },
      ],
      row: 3,
    },
    {
      key: 'amount',
      label: i18next.t('modules.pages.receipt.amount'),
      type: 'number',
      required: true,
      min: 0.01,
      precision: 2,
      row: 3,
    },
    {
      key: 'accountId',
      label: i18next.t('modules.columns.account'),
      type: 'select',
      required: true,
      options: getSettlementAccountOptions,
      row: 4,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.receipt.status'),
      type: 'select',
      disabled: true,
      defaultValue: DOCUMENT_STATUS.DRAFT,
      visibleWhen: () => false,
      options: [
        {
          label: i18next.t('modules.pages.receipt.draft'),
          value: DOCUMENT_STATUS.DRAFT,
        },
        {
          label: i18next.t('modules.filter.auditStatus'),
          value: DOCUMENT_STATUS.AUDITED,
        },
      ],
      row: 5,
    },
    {
      key: 'projectId',
      label: i18next.t('modules.filter.relatedContractProject'),
      type: 'select',
      options: getCustomerProjectOptions,
      masterOptionRequirements: { customers: true, projects: true },
      row: 4,
    },
    {
      key: 'operatorName',
      label: i18next.t('modules.pages.receipt.operator'),
      type: 'input',
      required: true,
      row: 5,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.receipt.remark'),
      type: 'textarea',
      row: 6,
      fullRow: true,
    },
    {
      key: 'attachments',
      label: i18next.t('modules.filter.receiptVoucher'),
      type: 'upload',
      row: 7,
      fullRow: true,
    },
  ],
  saveFields: {
    scalar: [
      'receiptNo',
      'counterpartyType',
      'counterpartyId',
      'counterpartyCode',
      'counterpartyName',
      'receiptPurpose',
      'customerId',
      'customerCode',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'settlementCompanyName',
      'receiptDate',
      'payType',
      'amount',
      'accountId',
      'status',
      'operatorName',
      'remark',
    ],
  },
  data: [],
  buildOverview: buildReceiptOverview,
  statusMap,
  rowHighlightStatuses: [DOCUMENT_STATUS.DRAFT],
}
