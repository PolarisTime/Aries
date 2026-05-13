import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const masterModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  material: {
    path: '/material',
    supportsSearch: true,
    nativeFilterKeys: ['keyword', 'category', 'material'],
  },
  supplier: {
    path: '/supplier',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'status'],
  },
  customer: {
    path: '/customer',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'status'],
  },
  carrier: {
    path: '/carrier',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'status'],
  },
  'material-categories': {
    path: '/material-categories',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'status'],
  },
  warehouse: {
    path: '/warehouse',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'warehouseType', 'status'],
  },
}
