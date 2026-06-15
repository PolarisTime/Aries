import dayjs from 'dayjs'
import i18next from 'i18next'
import { getSupplierOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  BILL_STATUS_LABEL,
  CONTRACT_NO_FILTER_LABEL,
  SUPPLIER_NAME_LABEL,
} from '../shared/filter-labels'
import {
  actionSet,
  buildAmountWeightOverview,
  cloneLineItems,
  compactOrderItemColumns,
  statusMap,
} from '../shared/shared'
import { contractStatusOptions } from './contract-shared'

export const purchaseContractsPageConfig: ModulePageConfig = {
  key: 'purchase-contract',
  title: i18next.t('modules.pages.purchaseContract.purchaseContract'),
  kicker: 'Contracts',
  description: i18next.t('modules.pages.purchaseContract.purchaseContractDesc'),
  primaryNoKey: 'contractNo',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: CONTRACT_NO_FILTER_LABEL,
      type: 'input',
      placeholder: i18next.t(
        'modules.pages.purchaseContract.purchaseContractPlaceholder',
      ),
    },
    {
      key: 'supplierName',
      label: SUPPLIER_NAME_LABEL,
      type: 'select',
      options: getSupplierOptions,
    },
    {
      key: 'status',
      label: BILL_STATUS_LABEL,
      type: 'select',
      options: contractStatusOptions,
    },
    {
      key: 'signDate',
      label: i18next.t('modules.pages.purchaseContract.signDate'),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.purchaseContract.contractNo'),
      dataIndex: 'contractNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.purchaseContract.relatedPurchaseOrder'),
      dataIndex: 'sourcePurchaseOrderNos',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.purchaseContract.supplier'),
      dataIndex: 'supplierName',
      width: 150,
    },
    {
      title: i18next.t('modules.pages.purchaseContract.signDate'),
      dataIndex: 'signDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.purchaseContract.effectiveDate'),
      dataIndex: 'effectiveDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.purchaseContract.expireDate'),
      dataIndex: 'expireDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t('modules.pages.purchaseContract.buyer'),
      dataIndex: 'buyerName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.purchaseContract.totalWeight'),
      dataIndex: 'totalWeight',
      width: 116,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.purchaseContract.totalAmount'),
      dataIndex: 'totalAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.purchaseContract.status'),
      dataIndex: 'status',
      width: 110,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.purchaseContract.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.purchaseContract.contractNo'),
      key: 'contractNo',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.relatedPurchaseOrder'),
      key: 'sourcePurchaseOrderNos',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.supplier'),
      key: 'supplierName',
      row: 1,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.signDate'),
      key: 'signDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.effectiveDate'),
      key: 'effectiveDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.expireDate'),
      key: 'expireDate',
      type: 'date',
      row: 2,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.buyer'),
      key: 'buyerName',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.status'),
      key: 'status',
      type: 'status',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.totalWeight'),
      key: 'totalWeight',
      type: 'weight',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.totalAmount'),
      key: 'totalAmount',
      type: 'amount',
      row: 3,
    },
    {
      label: i18next.t('modules.pages.purchaseContract.remark'),
      key: 'remark',
      row: 4,
      fullRow: true,
    },
  ],
  formFields: [
    {
      key: 'contractNo',
      label: i18next.t('modules.pages.purchaseContract.contractNo'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'sourcePurchaseOrderNos',
      label: i18next.t('modules.pages.purchaseContract.relatedPurchaseOrder'),
      type: 'input',
      disabled: true,
      placeholder: i18next.t('modules.pages.purchaseContract.importFromParent'),
      row: 1,
    },
    {
      key: 'supplierName',
      label: i18next.t('modules.pages.purchaseContract.supplier'),
      type: 'select',
      required: true,
      options: getSupplierOptions,
      row: 1,
    },
    {
      key: 'signDate',
      label: i18next.t('modules.pages.purchaseContract.signDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'effectiveDate',
      label: i18next.t('modules.pages.purchaseContract.effectiveDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'expireDate',
      label: i18next.t('modules.pages.purchaseContract.expireDate'),
      type: 'date',
      required: true,
      row: 2,
    },
    {
      key: 'buyerName',
      label: i18next.t('modules.pages.purchaseContract.buyer'),
      type: 'input',
      required: true,
      disabled: true,
      row: 3,
    },
    {
      key: 'status',
      label: i18next.t('modules.pages.purchaseContract.status'),
      type: 'select',
      defaultValue: '草稿',
      options: contractStatusOptions,
      row: 3,
    },
    {
      key: 'remark',
      label: i18next.t('modules.pages.purchaseContract.remark'),
      type: 'textarea',
      row: 3,
      fullRow: true,
    },
  ],
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: i18next.t('modules.pages.purchaseContract.purchaseOrder'),
    parentFieldKey: 'sourcePurchaseOrderNos',
    parentDisplayFieldKey: 'orderNo',
    allowMultipleSelection: false,
    buttonText: i18next.t(
      'modules.pages.purchaseContract.importPurchaseOrderItems',
    ),
    mapParentToDraft: (parentRecord) => {
      const signDate = parentRecord.orderDate || undefined
      return {
        supplierName: parentRecord.supplierName || '',
        buyerName: parentRecord.buyerName || '',
        signDate,
        effectiveDate: signDate,
        expireDate: signDate
          ? dayjs(asString(signDate)).add(1, 'year')
          : undefined,
        status: '已归档',
      }
    },
    transformItems: (parentRecord) =>
      cloneLineItems(
        Array.isArray(parentRecord.items) ? parentRecord.items : [],
        'purchase-contract-item',
      ),
  },
  itemColumns: compactOrderItemColumns,
  data: [],
  buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalAmount'),
  statusMap,
  rowHighlightStatuses: ['草稿'],
}
