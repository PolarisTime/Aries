import { afterEach, describe, expect, it, vi } from 'vitest'
import { execPrintCode } from './clodop'

describe('execPrintCode', () => {
  afterEach(() => {
    delete window.getCLodop
    vi.restoreAllMocks()
  })

  it('evaluates simple numeric coordinate expressions before calling C-Lodop', () => {
    const addPrintText = vi.fn()
    const lodop = {
      PRINT_INITA: vi.fn(),
      PRINT_INIT: vi.fn(),
      SET_LICENSES: vi.fn(),
      GET_PRINTER_COUNT: vi.fn(),
      GET_PRINTER_NAME: vi.fn(),
      SET_PRINT_PAGESIZE: vi.fn(),
      SET_PRINTER_INDEX: vi.fn(),
      SET_PRINT_COPIES: vi.fn(),
      ADD_PRINT_HTM: vi.fn(),
      ADD_PRINT_TEXT: addPrintText,
      PREVIEW: vi.fn(),
      PRINT: vi.fn(),
    }

    window.getCLodop = () => lodop

    const success = execPrintCode(
      [
        'LODOP.PRINT_INITA(0, 20, 2970, 2100, "A4打印模版（带备注）");',
        'LODOP.ADD_PRINT_TEXT(204+5,12,74,16,"抚顺新钢");',
      ].join('\n'),
      { preview: true },
    )

    expect(success).toBe(true)
    expect(addPrintText).toHaveBeenCalledWith(209, 12, 74, 16, '抚顺新钢')
  })
})
