import { masterDataPageConfigs } from '@/config/business-pages/master-data'

describe('master data page config', () => {
  it('uses four-column detail views for core master data modules', () => {
    expect(
      [
        'customers',
        'suppliers',
        'carriers',
        'warehouses',
      ].map((moduleKey) => masterDataPageConfigs[moduleKey].detailColumnCount),
    ).toEqual([4, 4, 4, 4])
  })
})
