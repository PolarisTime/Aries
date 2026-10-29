import i18next from 'i18next'
import { withDeletedDocumentStatus } from '@/constants/module-options'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import {
  getSettlementAccountOptions,
  getSettlementCompanyOptions,
} from '@/module-system/core/module-option-resolvers'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  AUDITED_STATUS_LABEL,
  BILL_STATUS_LABEL,
} from '../shared/filter-labels'
import { statusMap } from '../shared/shared'
import {
  buildPaymentOverview,
  getPaymentCounterpartyOptions,
} from './finance-page-rules'

/**
 * 付款用途枚举 → 中文文案。
 *
 * <p>唯一展示出口：详情表头（`detailFields`）只认「同 dataIndex 列的 render」，
 * 因此这里同时供默认隐藏的列表列与详情字段使用，不另写一份映射。取值与后端
 * `PaymentPurposes` 的 3 个常量一一对应，未知值原样回退（历史脏值不显示空白）。</p>
 */
const PAYMENT_PURPOSE_LABEL_KEYS: Record<string, string> = {
  STATEMENT_SETTLEMENT: 'financeDetail.purposeStatementSettlement',
  PURCHASE_PREPAYMENT: 'financeDetail.purposePurchasePrepayment',
  SUPPLIER_PAYMENT: 'financeDetail.purposeSupplierPayment',
}

function renderPaymentPurpose(value: unknown) {
  const purpose = asString(value)
  if (!purpose) {
    return '-'
  }
  const labelKey = PAYMENT_PURPOSE_LABEL_KEYS[purpose]
  return labelKey ? i18next.t(labelKey) : purpose
}

export const paymentsPageConfig: ModulePageConfig = {
  key: 'payment',
  title: i18next.t('modules.pages.payment.payment'),
  kicker: 'Finance',
  description: i18next.t('modules.pages.payment.paymentDesc'),
  primaryNoKey: 'paymentNo',
  actions: [
    {
      key: 'create_payment',
      label: i18next.t('modules.pages.payment.createPayment'),
      type: 'primary',
    },
  ],
  filters: [
    {
      key: 'businessType',
      label: i18next.t('modules.pages.payment.businessType'),
      type: 'select',
      options: [
        { label: i18next.t('modules.pages.payment.supplier'), value: '供应商' },
        { label: i18next.t('modules.pages.payment.carrier'), value: '物流商' },
      ],
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: withDeletedDocumentStatus([
        {
          label: i18next.t('modules.pages.payment.draft'),
          value: DOCUMENT_STATUS.DRAFT,
        },
        { label: AUDITED_STATUS_LABEL, value: DOCUMENT_STATUS.AUDITED },
      ]),
    },
    {
      key: 'paymentDate',
      label: i18next.t('modules.pages.payment.paymentDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.payment.paymentNo'),
      dataIndex: 'paymentNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.payment.businessType'),
      dataIndex: 'counterpartyType',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.payment.counterpartyCode'),
      dataIndex: 'counterpartyCode',
      width: 130,
    },
    {
      title: i18next.t('modules.pages.payment.counterparty'),
      dataIndex: 'counterpartyName',
      width: 180,
    },
    {
      /*
       * 默认隐藏的「付款用途」列：本身是详情表头的展示口径来源
       * （`detailFields` 复用同 dataIndex 列的 render，见 renderPaymentPurpose）。
       * 已在 defaultHiddenColumnKeys 声明，列表默认外观不变。
       */
      title: i18next.t('modules.pages.payment.paymentPurpose'),
      dataIndex: 'paymentPurpose',
      width: 160,
      render: renderPaymentPurpose,
    },
    {
      title: i18next.t('modules.pages.payment.settlementCompany'),
      dataIndex: 'settlementCompanyName',
      width: 160,
    },
    {
      title: i18next.t('modules.pages.payment.paymentDate'),
      dataIndex: 'paymentDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.payment.payType'),
      dataIndex: 'payType',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.payment.amount'),
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.payment.status'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.payment.operator'),
      dataIndex: 'operatorName',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.payment.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  defaultHiddenColumnKeys: [
    'counterpartyCode',
    'payType',
    'paymentPurpose',
    'operatorName',
    'remark',
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.payment.paymentNo'),
      key: 'paymentNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.businessType'),
      key: 'counterpartyType',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.counterparty'),
      key: 'counterpartyName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.counterpartyCode'),
      key: 'counterpartyCode',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.payment.settlementCompany'),
      key: 'settlementCompanyName',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.paymentDate'),
      key: 'paymentDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.payType'),
      key: 'payType',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.payment.amount'),
      key: 'amount',
      type: 'amount',
      row: 2,
    },
    {
      // 后端新增的账户名称快照（accountName）：详情此前只能显示 accountId（雪花 ID）。
      // 放在金额之后，回答「这笔钱从哪个账户出」。
      label: i18next.t('modules.columns.account'),
      key: 'accountName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.payment.status'),
      key: 'status',
      type: 'status',
      row: 3,
    },
    {
      // 付款用途由后端枚举返回，用于区分对账结算 / 采购预付款等业务。
      label: i18next.t('modules.pages.payment.paymentPurpose'),
      key: 'paymentPurpose',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.payment.operator'),
      key: 'operatorName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.payment.remark'),
      key: 'remark',
      row: 4,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'paymentNo',
      label: i18next.t('modules.pages.payment.paymentNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'counterpartyType',
      label: i18next.t('modules.pages.payment.businessType'),
      type: 'select',
      required: true,
      allowClear: false,
      defaultValue: '供应商',
      options: [
        { label: i18next.t('modules.pages.payment.supplier'), value: '供应商' },
        { label: i18next.t('modules.pages.payment.carrier'), value: '物流商' },
      ],
      row: 1,
    },
    {
      key: 'counterpartyId',
      label: i18next.t('modules.pages.payment.counterparty'),
      type: 'select',
      required: true,
      options: getPaymentCounterpartyOptions,
      masterOptionRequirements: { suppliers: true, carriers: true },
      row: 1,
    },
    {
      key: 'settlementCompanyId',
      label: i18next.t('modules.pages.payment.settlementCompany'),
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      masterOptionRequirements: { settlementCompanies: true },
      row: 2,
    },
    {
      key: 'paymentDate',
      label: i18next.t('modules.pages.payment.paymentDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'payType',
      label: i18next.t('modules.pages.payment.payType'),
      type: 'select',
      required: true,
      options: [
        {
          label: i18next.t('modules.pages.payment.bankTransfer'),
          value: '银行转账',
        },
        {
          label: i18next.t('modules.pages.payment.bankAcceptance'),
          value: '银行承兑',
        },
        { label: i18next.t('modules.pages.payment.cash'), value: '现金' },
      ],
      row: 3,
    },
    {
      key: 'amount',
      label: i18next.t('modules.pages.payment.amount'),
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
      label: i18next.t('modules.pages.payment.status'),
      type: 'select',
      disabled: true,
      defaultValue: DOCUMENT_STATUS.DRAFT,
      visibleWhen: () => false,
      options: [
        {
          label: i18next.t('modules.pages.payment.draft'),
          value: DOCUMENT_STATUS.DRAFT,
        },
        { label: AUDITED_STATUS_LABEL, value: DOCUMENT_STATUS.AUDITED },
      ],
      row: 5,
    },
    {
      key: 'operatorName',
      label: i18next.t('modules.pages.payment.operator'),
      type: 'input',
      required: true,
      row: 4,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.payment.remark'),
      type: 'textarea',
      row: 6,
      fullRow: true,
    },
    {
      key: 'attachments',
      label: i18next.t('modules.filter.receiptVoucher'),
      type: 'upload',
      /*
       * fullRow 字段各占一行：与 remark 同处 row 4 时声明宽度是 24 + 24 = 48，
       * 已超出 24 栅格，「一行」语义失效（antd 只能各自换行，行间距还会叠加）。
       */
      row: 7,
      fullRow: true,
    },
  ],
  saveFields: {
    scalar: [
      'paymentNo',
      'counterpartyType',
      'counterpartyId',
      'paymentPurpose',
      'counterpartyCode',
      'counterpartyName',
      'settlementCompanyId',
      'settlementCompanyName',
      'paymentDate',
      'payType',
      'amount',
      'accountId',
      'status',
      'operatorName',
      'remark',
    ],
  },
  data: [],
  buildOverview: buildPaymentOverview,
  statusMap,
  rowHighlightStatuses: [DOCUMENT_STATUS.DRAFT],
}
