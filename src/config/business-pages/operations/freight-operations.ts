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
  compactFreightItemColumns,
  statusMap,
  transformFreightItems,
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
        dataIndex: 'outboundNo',
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
    ],
    defaultHiddenColumnKeys: [
      'carrierCode',
      'customerName',
      'projectName',
      'settlementCompanyName',
      'unitPrice',
    ],
    detailFields: [
      {
        label: i18next.t('modules.pages.freightOperations.freightBillNo'),
        key: 'billNo',
      },
      {
        label: i18next.t('modules.pages.freightOperations.relatedOutbound'),
        key: 'outboundNo',
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
        key: 'outboundNo',
        label: i18next.t('modules.pages.freightOperations.relatedOutbound'),
        type: 'input',
        disabled: true,
        placeholder: i18next.t(
          'modules.pages.freightOperations.importFromParent',
        ),
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
        'sourceSalesOutboundItemId',
        'settlementCompanyId',
        'settlementCompanyName',
        'customerName',
        'projectName',
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
        'warehouseName',
      ],
    },
    parentImport: {
      parentModuleKey: 'sales-outbound',
      label: i18next.t('modules.pages.freightOperations.parentSalesOutbound'),
      parentFieldKey: 'outboundNo',
      parentDisplayFieldKey: 'outboundNo',
      candidateQueryType: 'freight-bill-import',
      buttonText: i18next.t(
        'modules.pages.freightOperations.importParentSalesOutbound',
      ),
      enforceUniqueRelation: true,
      allowMultipleSelection: true,
      buildParentFilters: () => ({ status: '已审核' }),
      hiddenSelectorColumnKeys: ['status'],
      validateBeforeOpen: (currentRecord) =>
        asString(currentRecord.carrierName).trim()
          ? null
          : '请先选择物流商，再导入销售出库单',
      mapParentToDraft: (parentRecord) => ({
        customerName: parentRecord.customerName || '',
        projectName: parentRecord.projectName || '',
      }),
      transformItems: transformFreightItems,
    },
    itemColumns: compactFreightItemColumns,
    data: [],
    buildOverview: (rows) => buildAmountWeightOverview(rows, 'totalFreight'),
    statusMap,
    rowHighlightStatuses: ['未审核'],
  },
}
