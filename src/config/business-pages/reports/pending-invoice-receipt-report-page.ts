import i18next from 'i18next'
import { getSupplierNameFilterOptions } from '@/api/supplier-options'
import type { ModulePageConfig } from '@/types/module-page'
import { SUPPLIER_NAME_LABEL } from '../shared/filter-labels'
import {
  formatAmount,
  formatInteger,
  formatWeight,
  statusMap,
  sumBy,
} from '../shared/shared'

export const pendingInvoiceReceiptReportPageConfig: ModulePageConfig = {
  key: 'pending-invoice-receipt-report',
  title: i18next.t(
    'modules.pages.pendingInvoiceReceiptReport.pendingInvoiceReceiptReport',
  ),
  kicker: 'Finance',
  description: i18next.t(
    'modules.pages.pendingInvoiceReceiptReport.pendingInvoiceDesc',
  ),
  readOnly: true,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.keyword'),
      type: 'input',
      placeholder: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.pendingInvoicePlaceholder',
      ),
    },
    {
      key: 'supplierName',
      label: SUPPLIER_NAME_LABEL,
      type: 'select',
      options: getSupplierNameFilterOptions,
    },
    {
      key: 'orderDate',
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.purchaseDate',
      ),
      type: 'dateRange',
    },
  ],
  columns: [
    {
      title: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.purchaseOrderNo',
      ),
      dataIndex: 'orderNo',
      width: 170,
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.supplier'),
      dataIndex: 'supplierName',
      width: 150,
    },
    {
      title: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.invoiceTitle',
      ),
      dataIndex: 'invoiceTitle',
      width: 170,
    },
    {
      title: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.purchaseDate',
      ),
      dataIndex: 'orderDate',
      width: 120,
      type: 'date',
    },
    {
      title: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.materialCode',
      ),
      dataIndex: 'materialCode',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.brand'),
      dataIndex: 'brand',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.material'),
      dataIndex: 'material',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.category'),
      dataIndex: 'category',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.spec'),
      dataIndex: 'spec',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.length'),
      dataIndex: 'length',
      width: 100,
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.orderQty'),
      dataIndex: 'orderQuantity',
      width: 100,
      align: 'right',
      type: 'count',
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.qtyUnit'),
      dataIndex: 'quantityUnit',
      width: 90,
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.orderWeight'),
      dataIndex: 'orderWeightTon',
      width: 124,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.receivedWeight',
      ),
      dataIndex: 'receivedInvoiceWeightTon',
      width: 136,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.pendingWeight',
      ),
      dataIndex: 'pendingInvoiceWeightTon',
      width: 136,
      align: 'right',
      type: 'weight',
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.unitPrice'),
      dataIndex: 'unitPrice',
      width: 100,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.orderAmount'),
      dataIndex: 'orderAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.receivedAmount',
      ),
      dataIndex: 'receivedInvoiceAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.pendingAmount',
      ),
      dataIndex: 'pendingInvoiceAmount',
      width: 110,
      align: 'right',
      type: 'amount',
    },
    {
      title: i18next.t('modules.pages.pendingInvoiceReceiptReport.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
  ],
  defaultHiddenColumnKeys: [
    'brand',
    'material',
    'category',
    'length',
    'orderQuantity',
    'quantityUnit',
    'orderWeightTon',
    'receivedInvoiceWeightTon',
    'unitPrice',
    'orderAmount',
    'receivedInvoiceAmount',
  ],
  detailFields: [
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.purchaseOrderNo',
      ),
      key: 'orderNo',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.supplier'),
      key: 'supplierName',
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.invoiceTitle',
      ),
      key: 'invoiceTitle',
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.purchaseDate',
      ),
      key: 'orderDate',
      type: 'date',
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.materialCode',
      ),
      key: 'materialCode',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.brand'),
      key: 'brand',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.material'),
      key: 'material',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.category'),
      key: 'category',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.spec'),
      key: 'spec',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.length'),
      key: 'length',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.orderQty'),
      key: 'orderQuantity',
      type: 'count',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.qtyUnit'),
      key: 'quantityUnit',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.orderWeight'),
      key: 'orderWeightTon',
      type: 'weight',
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.receivedWeight',
      ),
      key: 'receivedInvoiceWeightTon',
      type: 'weight',
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.pendingWeight',
      ),
      key: 'pendingInvoiceWeightTon',
      type: 'weight',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.unitPrice'),
      key: 'unitPrice',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.orderAmount'),
      key: 'orderAmount',
      type: 'amount',
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.receivedAmount',
      ),
      key: 'receivedInvoiceAmount',
      type: 'amount',
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.pendingAmount',
      ),
      key: 'pendingInvoiceAmount',
      type: 'amount',
    },
    {
      label: i18next.t('modules.pages.pendingInvoiceReceiptReport.status'),
      key: 'status',
      type: 'status',
    },
  ],
  data: [],
  buildOverview: (rows) => [
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.pendingItemCount',
      ),
      value: formatInteger(rows.length),
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.pendingWeight',
      ),
      value: formatWeight(sumBy(rows, 'pendingInvoiceWeightTon')),
    },
    {
      label: i18next.t(
        'modules.pages.pendingInvoiceReceiptReport.pendingAmount',
      ),
      value: formatAmount(sumBy(rows, 'pendingInvoiceAmount')),
    },
  ],
  statusMap,
  rowHighlightStatuses: ['未收票'],
}
