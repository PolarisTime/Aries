import i18next from 'i18next'
import {
  getCarrierOptions,
  getCarrierVehiclePlateOptions,
  getSettlementCompanyOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import {
  AUDIT_STATUS_LABEL,
  CARRIER_NAME_LABEL,
  FREIGHT_NO_FILTER_LABEL,
} from '../shared/filter-labels'
import { SETTLEMENT_COMPANY_LABEL } from '../shared/settlement-company'
import {
  buildAmountWeightOverview,
  cloneLineItems,
  compactFreightItemColumns,
  statusMap,
} from '../shared/shared'

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
      {
        key: 'generate_pickup_list',
        label: i18next.t('modules.pages.freightOperations.generatePickupList'),
        type: 'default',
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
        key: 'carrierName',
        label: CARRIER_NAME_LABEL,
        type: 'select',
        options: getCarrierOptions,
      },
      {
        key: 'status',
        label: AUDIT_STATUS_LABEL,
        type: 'select',
        options: [
          {
            label: i18next.t('modules.pages.freightOperations.unaudited'),
            value: '未审核',
          },
          {
            label: i18next.t('modules.pages.freightOperations.audited'),
            value: '已审核',
          },
        ],
      },
      {
        key: 'settlementCompanyId',
        label: SETTLEMENT_COMPANY_LABEL,
        type: 'select',
        options: getSettlementCompanyOptions,
        row: 2,
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
        title: i18next.t('modules.pages.freightOperations.relatedOutbound'),
        dataIndex: 'sourceSalesOutboundNo',
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
        title: i18next.t('modules.pages.freightOperations.customerName'),
        dataIndex: 'customerName',
        width: 140,
      },
      {
        title: i18next.t('modules.pages.freightOperations.projectName'),
        dataIndex: 'projectName',
        width: 180,
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
      'customerName',
      'projectName',
      'settlementCompanyName',
      'unitPrice',
      'remark',
    ],
    detailFields: [
      {
        label: i18next.t('modules.pages.freightOperations.freightBillNo'),
        key: 'billNo',
      },
      {
        label: i18next.t('modules.pages.freightOperations.relatedOutbound'),
        key: 'sourceSalesOutboundNo',
      },
      {
        label: '来源销售订单 ID',
        key: 'sourceSalesOrderId',
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
        label: i18next.t('modules.pages.freightOperations.customerName'),
        key: 'customerName',
      },
      {
        label: i18next.t('modules.pages.freightOperations.projectName'),
        key: 'projectName',
      },
      {
        label: i18next.t('modules.pages.freightOperations.documentDate'),
        key: 'billTime',
        type: 'date',
      },
      {
        label: i18next.t('modules.pages.freightOperations.unitPrice'),
        key: 'unitPrice',
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
        label: i18next.t('modules.pages.freightOperations.auditStatus'),
        key: 'status',
        type: 'status',
      },
      {
        label: i18next.t('modules.pages.freightOperations.remark'),
        key: 'remark',
      },
    ],
    formFields: [
      {
        key: 'billNo',
        label: i18next.t('modules.pages.freightOperations.freightBillNo'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'sourceSalesOrderId',
        label: '来源销售订单 ID',
        type: 'input',
        disabled: true,
        placeholder: '导入销售订单后自动带入',
        row: 1,
      },
      {
        key: 'carrierName',
        label: i18next.t('modules.pages.freightOperations.carrier'),
        type: 'select',
        required: true,
        options: getCarrierOptions,
        row: 1,
      },
      {
        key: 'carrierCode',
        label: i18next.t('modules.pages.freightStatement.carrierCode'),
        type: 'input',
        disabled: true,
        row: 1,
      },
      {
        key: 'settlementCompanyId',
        label: SETTLEMENT_COMPANY_LABEL,
        type: 'select',
        options: getSettlementCompanyOptions,
        row: 1,
      },
      {
        key: 'vehiclePlate',
        label: i18next.t('modules.pages.freightOperations.vehiclePlate'),
        type: 'autoComplete',
        options: getCarrierVehiclePlateOptions,
        row: 1,
      },
      {
        key: 'billTime',
        label: i18next.t('modules.pages.freightOperations.documentDate'),
        type: 'date',
        required: true,
        row: 2,
      },
      {
        key: 'unitPrice',
        label: i18next.t('modules.pages.freightOperations.unitPrice'),
        type: 'number',
        required: true,
        min: 0,
        precision: 2,
        defaultValue: 0,
        row: 2,
      },
      {
        key: 'remark',
        label: i18next.t('modules.pages.freightOperations.remark'),
        type: 'input',
        row: 2,
      },
    ],
    saveFields: {
      scalar: [
        'billNo',
        'sourceSalesOrderId',
        'carrierCode',
        'carrierName',
        'settlementCompanyId',
        'settlementCompanyName',
        'vehiclePlate',
        'customerName',
        'projectName',
        'billTime',
        'unitPrice',
        'status',
        'remark',
      ],
      lineItem: [
        'sourceNo',
        'sourceSalesOrderItemId',
        'settlementCompanyId',
        'settlementCompanyName',
        'customerName',
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
      label: '来源销售订单',
      parentFieldKey: 'sourceSalesOrderId',
      parentDisplayFieldKey: 'orderNo',
      candidateQueryType: 'sales-order-freight-import',
      buttonText: i18next.t(
        'modules.pages.freightOperations.importParentSalesOutbound',
      ),
      enforceUniqueRelation: true,
      allowMultipleSelection: false,
      buildParentFilters: (currentRecord) => ({
        customerId: currentRecord.customerId,
        projectId: currentRecord.projectId,
        currentRecordId: currentRecord.id,
      }),
      hiddenSelectorColumnKeys: ['status'],
      validateBeforeOpen: (currentRecord) =>
        asString(currentRecord.carrierName).trim()
          ? null
          : '请先选择物流商，再导入销售订单',
      mapParentToDraft: (parentRecord) => ({
        sourceSalesOrderId: parentRecord.id,
        customerId: parentRecord.customerId,
        customerName: parentRecord.customerName || '',
        projectId: parentRecord.projectId,
        projectName: parentRecord.projectName || '',
      }),
      transformItems: (parentRecord) =>
        cloneLineItems(
          Array.isArray(parentRecord.items)
            ? parentRecord.items.map((item) => ({
                ...item,
                sourceNo: parentRecord.orderNo || '',
                sourceSalesOrderItemId: item.id,
                sourceSalesOutboundItemId: undefined,
              }))
            : [],
          'freight-bill-item',
        ),
    },
    itemColumns: compactFreightItemColumns,
    data: [],
    buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalFreight'),
    statusMap,
    rowHighlightStatuses: ['未审核'],
  },
}
