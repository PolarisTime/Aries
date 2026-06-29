import i18next from 'i18next'
import {
  enabledStatusOptions,
  getSettlementCompanyOptions,
} from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, buildMasterOverview, statusMap } from '../shared/shared'
import { masterStatusFilter } from '../shared/shared-filters'

export const carriersPageConfig: ModulePageConfig = {
  key: 'carrier',
  title: i18next.t('modules.pages.carrier.title'),
  kicker: 'Master Data',
  description: i18next.t('modules.pages.carrier.description'),
  primaryNoKey: 'carrierCode',
  actions: actionSet,
  filters: [
    {
      key: 'keyword',
      label: i18next.t('modules.filter.keyword'),
      type: 'input',
      placeholder: i18next.t('modules.pages.carrier.placeholderKeyword'),
    },
    { ...masterStatusFilter },
  ],
  columns: [
    {
      title: i18next.t('modules.pages.carrier.colCarrierCode'),
      dataIndex: 'carrierCode',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.carrier.colCarrierName'),
      dataIndex: 'carrierName',
      width: 180,
    },
    {
      title: i18next.t('modules.pages.carrier.colContactName'),
      dataIndex: 'contactName',
      width: 110,
    },
    {
      title: i18next.t('modules.pages.carrier.colContactPhone'),
      dataIndex: 'contactPhone',
      width: 140,
    },
    {
      title: i18next.t('modules.pages.carrier.colVehicleType'),
      dataIndex: 'vehicleType',
      width: 120,
    },
    {
      title: i18next.t('modules.pages.carrier.colPriceMode'),
      dataIndex: 'priceMode',
      width: 100,
      align: 'center',
    },
    {
      title: i18next.t('modules.pages.carrier.colDefaultSettlementCompany'),
      dataIndex: 'defaultSettlementCompanyName',
      width: 180,
    },
    {
      title: i18next.t('modules.columns.status'),
      dataIndex: 'status',
      width: 100,
      type: 'status',
      align: 'center',
    },
    {
      title: i18next.t('modules.columns.remark'),
      dataIndex: 'remark',
      width: 180,
    },
  ],
  detailFields: [
    {
      label: i18next.t('modules.pages.carrier.colCarrierCode'),
      key: 'carrierCode',
    },
    {
      label: i18next.t('modules.pages.carrier.colCarrierName'),
      key: 'carrierName',
    },
    {
      label: i18next.t('modules.pages.carrier.colContactName'),
      key: 'contactName',
    },
    {
      label: i18next.t('modules.pages.carrier.colContactPhone'),
      key: 'contactPhone',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehiclePlate'),
      key: 'vehiclePlate',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehicleContact'),
      key: 'vehicleContact',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehiclePhone'),
      key: 'vehiclePhone',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehiclePlate2'),
      key: 'vehiclePlate2',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehicleContact2'),
      key: 'vehicleContact2',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehiclePhone2'),
      key: 'vehiclePhone2',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehiclePlate3'),
      key: 'vehiclePlate3',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehicleContact3'),
      key: 'vehicleContact3',
    },
    {
      label: i18next.t('modules.pages.carrier.colVehiclePhone3'),
      key: 'vehiclePhone3',
    },
    {
      label: i18next.t('modules.pages.carrier.colPriceMode'),
      key: 'priceMode',
    },
    {
      label: i18next.t('modules.pages.carrier.colDefaultSettlementCompany'),
      key: 'defaultSettlementCompanyName',
    },
    {
      label: i18next.t('modules.columns.status'),
      key: 'status',
      type: 'status',
    },
    { label: i18next.t('modules.columns.remark'), key: 'remark' },
  ],
  detailColumnCount: 4,
  formFields: [
    {
      key: 'carrierCode',
      label: i18next.t('modules.pages.carrier.colCarrierCode'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'carrierName',
      label: i18next.t('modules.pages.carrier.colCarrierName'),
      type: 'input',
      required: true,
      row: 1,
    },
    {
      key: 'contactName',
      label: i18next.t('modules.pages.carrier.colContactName'),
      type: 'input',
      row: 1,
    },
    {
      key: 'contactPhone',
      label: i18next.t('modules.pages.carrier.colContactPhone'),
      type: 'input',
      row: 1,
    },
    {
      key: 'vehiclePlate',
      label: i18next.t('modules.pages.carrier.formVehiclePlate'),
      type: 'input',
      row: 2,
    },
    {
      key: 'vehicleContact',
      label: i18next.t('modules.pages.carrier.formVehicleContact'),
      type: 'input',
      row: 2,
    },
    {
      key: 'vehiclePhone',
      label: i18next.t('modules.pages.carrier.formVehiclePhone'),
      type: 'input',
      row: 2,
    },
    {
      key: 'vehicleRemark',
      label: i18next.t('modules.pages.carrier.formVehicleRemark'),
      type: 'input',
      row: 2,
    },
    {
      key: 'vehiclePlate2',
      label: i18next.t('modules.pages.carrier.formVehiclePlate2'),
      type: 'input',
      row: 3,
    },
    {
      key: 'vehicleContact2',
      label: i18next.t('modules.pages.carrier.formVehicleContact2'),
      type: 'input',
      row: 3,
    },
    {
      key: 'vehiclePhone2',
      label: i18next.t('modules.pages.carrier.formVehiclePhone2'),
      type: 'input',
      row: 3,
    },
    {
      key: 'vehicleRemark2',
      label: i18next.t('modules.pages.carrier.formVehicleRemark2'),
      type: 'input',
      row: 3,
    },
    {
      key: 'vehiclePlate3',
      label: i18next.t('modules.pages.carrier.formVehiclePlate3'),
      type: 'input',
      row: 4,
    },
    {
      key: 'vehicleContact3',
      label: i18next.t('modules.pages.carrier.formVehicleContact3'),
      type: 'input',
      row: 4,
    },
    {
      key: 'vehiclePhone3',
      label: i18next.t('modules.pages.carrier.formVehiclePhone3'),
      type: 'input',
      row: 4,
    },
    {
      key: 'vehicleRemark3',
      label: i18next.t('modules.pages.carrier.formVehicleRemark3'),
      type: 'input',
      row: 4,
    },
    {
      key: 'defaultSettlementCompanyId',
      label: i18next.t('modules.pages.carrier.colDefaultSettlementCompany'),
      type: 'select',
      required: true,
      options: getSettlementCompanyOptions,
      row: 5,
    },
    {
      key: 'status',
      label: i18next.t('modules.columns.status'),
      type: 'select',
      defaultValue: '正常',
      options: enabledStatusOptions,
      row: 5,
    },
    {
      key: 'remark',
      label: i18next.t('modules.columns.remark'),
      type: 'textarea',
      row: 6,
      fullRow: true,
    },
  ],
  data: [],
  buildOverview: (rows) => buildMasterOverview(rows),
  statusMap,
  rowHighlightStatuses: ['禁用'],
  saveFields: {
    scalar: [
      'carrierCode',
      'carrierName',
      'contactName',
      'contactPhone',
      'vehiclePlate',
      'vehicleContact',
      'vehiclePhone',
      'vehicleRemark',
      'vehiclePlate2',
      'vehicleContact2',
      'vehiclePhone2',
      'vehicleRemark2',
      'vehiclePlate3',
      'vehicleContact3',
      'vehiclePhone3',
      'vehicleRemark3',
      'priceMode',
      'defaultSettlementCompanyId',
      'defaultSettlementCompanyName',
      'status',
      'remark',
    ],
  },
}
