import { describe, expect, it } from 'vitest'
import { renderPrintTemplate } from './renderer'

describe('renderPrintTemplate', () => {
  it('rejects executable JavaScript logic after rendering coordinate templates', () => {
    expect(() =>
      renderPrintTemplate(
        [
          'LODOP.PRINT_INITA(0, 20, 2970, 2100, "A4打印模版");',
          'var DetailList = [',
          '{{#each details}}',
          '  {piece:"{{quantity}}",weight:"{{weightTon}}"},',
          '{{/each}}',
          '];',
          'for(var k=0;k<DetailList.length;k++){',
          '  LODOP.ADD_PRINT_TEXT(10+k*20,10,80,16,"{{quantity}}");',
          '}',
        ].join('\n'),
        'COORD',
        {},
        [
          { quantity: '2', weightTon: '1.230' },
          { quantity: '3', weightTon: '2.345' },
        ],
      ),
    ).toThrow('Invalid LODOP script')
  })

  it('renders coordinate if else blocks from backend-provided items', () => {
    const result = renderPrintTemplate(
      [
        '{{#each details}}',
        '{{#if isSeparator}}',
        'LODOP.ADD_PRINT_TEXT(0,0,100,20,"{{groupName}}");',
        '{{else}}',
        'LODOP.ADD_PRINT_TEXT(0,0,100,20,"{{sourceNo}}");',
        '{{/if}}',
        '{{/each}}',
      ].join('\n'),
      'COORD',
      {},
      [{ sourceNo: 'SOO-001' }, { isSeparator: 'true', groupName: '项目A' }],
    )

    expect(result.script).toContain('"SOO-001"')
    expect(result.script).toContain('"项目A"')
    expect(result.script).not.toContain('{{else}}')
  })

  it('renders parent totals inside A5 page break blocks', () => {
    const result = renderPrintTemplate(
      [
        '{{#each details}}',
        '{{#if needsNewPage}}',
        'LODOP.ADD_PRINT_TEXT({{sumTop}},295,41,24,"{{totalQuantity}}");',
        'LODOP.ADD_PRINT_TEXT({{sumTop}},415,71,24,"{{totalWeight}}");',
        'LODOP.NewPage();',
        '{{/if}}',
        'LODOP.ADD_PRINT_TEXT({{rowTop}},295,41,24,"{{quantity}}");',
        '{{/each}}',
      ].join('\n'),
      'COORD',
      { sumTop: '453', totalQuantity: '394', totalWeight: '1040.052' },
      [
        { rowTop: '407', quantity: '4' },
        { rowTop: '161', quantity: '13', needsNewPage: 'true' },
      ],
    )

    expect(result.script).toContain(
      'LODOP.ADD_PRINT_TEXT(453,295,41,24,"394");',
    )
    expect(result.script).toContain(
      'LODOP.ADD_PRINT_TEXT(453,415,71,24,"1040.052");',
    )
    expect(result.script.indexOf('"1040.052"')).toBeLessThan(
      result.script.indexOf('LODOP.NewPage();'),
    )
  })

  it('rejects templates when required backend print fields are missing', () => {
    expect(() =>
      renderPrintTemplate(
        'LODOP.ADD_PRINT_TEXT({{rowTop}},10,80,16,"{{pieceWeightTon}}");',
        'COORD',
        {},
        [{ brand: '抚顺新钢' }],
      ),
    ).toThrow('Invalid LODOP script')
  })

  it('rejects numeric placeholder values that inject additional instructions', () => {
    expect(() =>
      renderPrintTemplate(
        'LODOP.ADD_PRINT_LINE({{top}},2,3,4,0,1);',
        'COORD',
        {
          top: '1,2,3,4,0,1);LODOP.NewPage();LODOP.ADD_PRINT_LINE(1',
        },
        [],
      ),
    ).toThrow('Invalid numeric print template value')
  })

  it('rejects unsupported HTML templates', () => {
    expect(() =>
      renderPrintTemplate(
        '<p>{{message}}</p>',
        'HTML',
        { message: 'Hello' },
        [],
      ),
    ).toThrow('Unsupported print template type')
  })

  it('renders COORD template with if/else blocks and data placeholders', () => {
    const result = renderPrintTemplate(
      '{{#if showHeader}}LODOP.ADD_PRINT_TEXT(10,10,200,20,"{{title}}");{{/if}}',
      'COORD',
      { showHeader: 'true', title: '报表标题' },
      [],
    )

    expect(result.type).toBe('COORD')
    expect(result.script).toContain(
      'LODOP.ADD_PRINT_TEXT(10,10,200,20,"报表标题")',
    )
  })

  it('renders COORD template with falsy if block', () => {
    const result = renderPrintTemplate(
      '{{#if showHeader}}LODOP.ADD_PRINT_TEXT(10,10,200,20,"header");{{else}}LODOP.ADD_PRINT_TEXT(10,10,200,20,"no header");{{/if}}',
      'COORD',
      { showHeader: '' },
      [],
    )

    expect(result.type).toBe('COORD')
    expect(result.script).toContain('no header')
    expect(result.script).not.toContain('"header"')
  })
})
