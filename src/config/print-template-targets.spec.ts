import { describe, expect, it } from 'vitest'
import {
  printTemplateTargetMap,
  printTemplateTargetOptions,
} from './print-template-targets'

describe('printTemplateTargetOptions', () => {
  it('注册销售退货单为可打印目标', () => {
    expect(printTemplateTargetMap['sales-return']).toBe('销售退货单')
    expect(printTemplateTargetOptions.map((option) => option.value)).toContain(
      'sales-return',
    )
  })

  it('保留既有销售单据打印目标', () => {
    expect(printTemplateTargetMap['sales-order']).toBe('销售订单')
    expect(printTemplateTargetMap['sales-outbound']).toBe('销售出库')
  })

  it('目标白名单未包含未注册模块', () => {
    expect(printTemplateTargetMap['operation-log']).toBeUndefined()
  })
})
