import { describe, expect, it } from 'vitest'
import { toProjectAbbreviationOptions } from './project-options'

describe('toProjectAbbreviationOptions', () => {
  it('优先以项目简称作为提货分组下拉展示文本', () => {
    expect(
      toProjectAbbreviationOptions([
        {
          id: '333662242446770176',
          projectName: '苏州欧帝半导体科技有限公司半导体专用设备研发及生产项目',
          projectNameAbbr: '欧帝半导体',
        },
      ]),
    ).toEqual([
      {
        value: '333662242446770176',
        label: '欧帝半导体',
        title: '苏州欧帝半导体科技有限公司半导体专用设备研发及生产项目',
      },
    ])
  })

  it('项目未维护简称时回退为项目全称', () => {
    expect(
      toProjectAbbreviationOptions([
        {
          id: '333662242446770177',
          projectName: '华东材料配送项目',
          projectNameAbbr: '',
        },
      ]),
    ).toEqual([
      {
        value: '333662242446770177',
        label: '华东材料配送项目',
        title: '华东材料配送项目',
      },
    ])
  })
})
