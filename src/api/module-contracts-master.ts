import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const masterModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  material: {
    path: '/materials',
    supportsSearch: true,
    nativeFilterKeys: ['keyword', 'category', 'material'],
  },
  supplier: {
    path: '/suppliers',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'status'],
  },
  customer: {
    path: '/customers',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'status'],
  },
  carrier: {
    path: '/carriers',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'status'],
  },
  'material-categories': {
    path: '/material-categories',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'status'],
  },
  warehouse: {
    path: '/warehouses',
    supportsSearch: false,
    nativeFilterKeys: ['keyword', 'warehouseType', 'status'],
  },
}
