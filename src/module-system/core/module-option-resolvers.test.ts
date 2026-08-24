import { afterEach, describe, expect, it } from 'vitest'
import type { ProjectOption } from '@/api/master/project-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { queryClient } from '@/lib/query-client'
import { getCustomerProjectOptions } from './module-option-resolvers'

const customerId = '333662242446770176'

const projectOptions: ProjectOption[] = [
  {
    id: '335043034955644928',
    value: '335043034955644928',
    label: '苏州欧帝半导体科技有限公司半导体专用设备研发及生产项目',
    customerId,
    projectCode: 'DEV-REPAIR-PROJ-001',
    projectName: '苏州欧帝半导体科技有限公司半导体专用设备研发及生产项目',
  },
]

describe('getCustomerProjectOptions', () => {
  afterEach(() => {
    queryClient.removeQueries({
      queryKey: QUERY_KEYS.masterOptions.project(customerId),
    })
  })

  it('优先使用查询订阅返回的项目选项', () => {
    expect(getCustomerProjectOptions({ customerId }, projectOptions)).toEqual(
      projectOptions,
    )
  })
})
