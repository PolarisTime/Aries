import i18next from 'i18next'
import { enabledStatusOptions } from '@/constants/module-options'
import type { ModulePageConfig } from '@/types/module-page'
import { actionSet, buildMasterOverview, statusMap } from '../shared/shared'
import { masterStatusFilter } from '../shared/shared-filters'

export const masterWarehousePageConfigs: Record<string, ModulePageConfig> = {
  warehouse: {
    key: 'warehouse',
    title: i18next.t('modules.pages.masterWarehouse.warehouseMaster'),
    kicker: 'Master Data',
    description: i18next.t('modules.pages.masterWarehouse.warehouseDesc'),
    primaryNoKey: 'warehouseCode',
    actions: actionSet,
    filters: [
      {
        key: 'keyword',
        label: i18next.t('modules.pages.masterWarehouse.keyword'),
        type: 'input',
        placeholder: i18next.t(
          'modules.pages.masterWarehouse.warehousePlaceholder',
        ),
      },
      {
        key: 'warehouseType',
        label: i18next.t('modules.pages.masterWarehouse.warehouseType'),
        type: 'select',
        options: [
          {
            label: i18next.t('modules.pages.masterWarehouse.ownWarehouse'),
            value: '自有仓',
          },
          {
            label: i18next.t('modules.pages.masterWarehouse.partnerWarehouse'),
            value: '合作仓',
          },
          {
            label: i18next.t('modules.pages.masterWarehouse.transitWarehouse'),
            value: '中转仓',
          },
          {
            label: i18next.t(
              'modules.pages.masterWarehouse.thirdPartyWarehouse',
            ),
            value: '第三方仓',
          },
        ],
      },
      { ...masterStatusFilter },
    ],
    columns: [
      {
        title: i18next.t('modules.pages.masterWarehouse.warehouseCode'),
        dataIndex: 'warehouseCode',
        width: 140,
      },
      {
        title: i18next.t('modules.pages.masterWarehouse.warehouseName'),
        dataIndex: 'warehouseName',
        width: 160,
      },
      {
        title: i18next.t('modules.pages.masterWarehouse.warehouseType'),
        dataIndex: 'warehouseType',
        width: 110,
      },
      {
        title: i18next.t('modules.pages.masterWarehouse.contact'),
        dataIndex: 'contactName',
        width: 110,
      },
      {
        title: i18next.t('modules.pages.masterWarehouse.phone'),
        dataIndex: 'contactPhone',
        width: 140,
      },
      {
        title: i18next.t('modules.pages.masterWarehouse.address'),
        dataIndex: 'address',
        width: 240,
      },
      {
        title: i18next.t('modules.pages.masterWarehouse.status'),
        dataIndex: 'status',
        width: 100,
        type: 'status',
        align: 'center',
      },
      {
        title: i18next.t('modules.pages.masterWarehouse.remark'),
        dataIndex: 'remark',
        width: 180,
      },
    ],
    defaultHiddenColumnKeys: ['contactPhone', 'address', 'remark'],
    detailFields: [
      {
        label: i18next.t('modules.pages.masterWarehouse.warehouseCode'),
        key: 'warehouseCode',
      },
      {
        label: i18next.t('modules.pages.masterWarehouse.warehouseName'),
        key: 'warehouseName',
      },
      {
        label: i18next.t('modules.pages.masterWarehouse.warehouseType'),
        key: 'warehouseType',
      },
      {
        label: i18next.t('modules.pages.masterWarehouse.contact'),
        key: 'contactName',
      },
      {
        label: i18next.t('modules.pages.masterWarehouse.phone'),
        key: 'contactPhone',
      },
      {
        label: i18next.t('modules.pages.masterWarehouse.address'),
        key: 'address',
      },
      {
        label: i18next.t('modules.pages.masterWarehouse.status'),
        key: 'status',
        type: 'status',
      },
      {
        label: i18next.t('modules.pages.masterWarehouse.remark'),
        key: 'remark',
      },
    ],
    detailColumnCount: 4,
    formFields: [
      {
        key: 'warehouseCode',
        label: i18next.t('modules.pages.masterWarehouse.warehouseCode'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'warehouseName',
        label: i18next.t('modules.pages.masterWarehouse.warehouseName'),
        type: 'input',
        required: true,
        row: 1,
      },
      {
        key: 'warehouseType',
        label: i18next.t('modules.pages.masterWarehouse.warehouseType'),
        type: 'select',
        required: true,
        row: 1,
        options: [
          {
            label: i18next.t('modules.pages.masterWarehouse.ownWarehouse'),
            value: '自有仓',
          },
          {
            label: i18next.t('modules.pages.masterWarehouse.partnerWarehouse'),
            value: '合作仓',
          },
          {
            label: i18next.t('modules.pages.masterWarehouse.transitWarehouse'),
            value: '中转仓',
          },
          {
            label: i18next.t(
              'modules.pages.masterWarehouse.thirdPartyWarehouse',
            ),
            value: '第三方仓',
          },
        ],
      },
      {
        key: 'contactName',
        label: i18next.t('modules.pages.masterWarehouse.contact'),
        type: 'input',
        row: 1,
      },
      {
        key: 'contactPhone',
        label: i18next.t('modules.pages.masterWarehouse.phone'),
        type: 'input',
        row: 2,
      },
      {
        key: 'address',
        label: i18next.t('modules.pages.masterWarehouse.address'),
        type: 'input',
        row: 2,
        fullRow: true,
      },
      {
        key: 'status',
        label: i18next.t('modules.pages.masterWarehouse.status'),
        type: 'select',
        defaultValue: '正常',
        options: enabledStatusOptions,
        row: 3,
      },
      {
        key: 'remark',
        label: i18next.t('modules.pages.masterWarehouse.remark'),
        type: 'textarea',
        row: 4,
        fullRow: true,
      },
    ],
    data: [],
    buildOverview: (rows) => buildMasterOverview(rows),
    statusMap,
    rowHighlightStatuses: ['禁用'],
  },
}
