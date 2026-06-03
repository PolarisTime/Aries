import { describe, expect, it } from 'vitest'
import { renderPrintTemplate } from './renderer'

describe('renderPrintTemplate', () => {
  it('keeps executable LODOP script logic for coordinate templates', () => {
    const result = renderPrintTemplate(
      [
        'LODOP.PRINT_INITA(0, 20, 2970, 2100, "A4打印模版");',
        'var DetailList = [',
        '{{#each details}}',
        '  {piece:"{{quantity}}",weight:"{{weightTon}}"},',
        '{{/each}}',
        '];',
        'var totalWeight=0;',
        'for(var k=0;k<DetailList.length;k++){',
        '  var d=DetailList[k];',
        '  if(!isNaN(parseFloat(d.weight))) totalWeight+=parseFloat(d.weight);',
        '  LODOP.ADD_PRINT_TEXT(10+k*20,10,80,16,d.piece);',
        '}',
        'LODOP.ADD_PRINT_TEXT(100,10,80,16,totalWeight.toFixed(3));',
        'LODOP.PREVIEW();',
      ].join('\n'),
      'COORD',
      {},
      [
        { quantity: '2', weightTon: '1.230' },
        { quantity: '3', weightTon: '2.345' },
      ],
    )

    expect(result.type).toBe('COORD')
    expect(result.script).toContain('for(var k=0;k<DetailList.length;k++)')
    expect(result.script).toContain('if(!isNaN(parseFloat(d.weight)))')
    expect(result.script).toContain('{piece:"2",weight:"1.230"},')
    expect(result.script).toContain('{piece:"3",weight:"2.345"},')
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
      [
        { sourceNo: 'SOO-001' },
        { isSeparator: 'true', groupName: '项目A' },
      ],
    )

    expect(result.script).toContain('"SOO-001"')
    expect(result.script).toContain('"项目A"')
    expect(result.script).not.toContain('{{else}}')
  })

  it('does not derive backend print fields in the renderer', () => {
    const result = renderPrintTemplate(
      'LODOP.ADD_PRINT_TEXT({{rowTop}},10,80,16,"{{pieceWeightTon}}");',
      'COORD',
      {},
      [{ brand: '抚顺新钢' }],
    )

    expect(result.script).toContain('LODOP.ADD_PRINT_TEXT(,10,80,16,"");')
  })

  it('renders HTML template with detail row blocks', () => {
    const result = renderPrintTemplate(
      [
        '<h1>{{title}}</h1>',
        '<table>',
        '<!--DETAIL_ROW_START-->',
        '<tr><td>{{detail.materialName}}</td><td>{{detail.quantity}}</td></tr>',
        '<!--DETAIL_ROW_END-->',
        '</table>',
      ].join('\n'),
      'HTML',
      { title: '打印测试' },
      [
        { materialName: '盘螺', quantity: '10' },
        { materialName: '螺纹钢', quantity: '5' },
      ],
    )

    expect(result.type).toBe('HTML')
    expect(result.html).toContain('<h1>打印测试</h1>')
    expect(result.html).toContain('<tr><td>盘螺</td><td>10</td></tr>')
    expect(result.html).toContain('<tr><td>螺纹钢</td><td>5</td></tr>')
    expect(result.html).not.toContain('<!--DETAIL_ROW_START-->')
    expect(result.html).not.toContain('{{title}}')
  })

  it('renders HTML template without detail rows', () => {
    const result = renderPrintTemplate(
      '<p>{{message}}</p>',
      'HTML',
      { message: 'Hello' },
      [],
    )

    expect(result.type).toBe('HTML')
    expect(result.html).toBe('<p>Hello</p>')
  })

  it('renders HTML template with detail rows containing multiple fields', () => {
    const result = renderPrintTemplate(
      [
        '<!--DETAIL_ROW_START-->',
        '<tr><td>{{detail.code}}</td><td>{{detail.name}}</td><td>{{detail.qty}}</td></tr>',
        '<!--DETAIL_ROW_END-->',
      ].join('\n'),
      'HTML',
      {},
      [
        { code: 'A01', name: 'Item1', qty: '10' },
        { code: 'A02', name: 'Item2', qty: '20' },
      ],
    )

    expect(result.type).toBe('HTML')
    expect(result.html).toContain('<tr><td>A01</td><td>Item1</td><td>10</td></tr>')
    expect(result.html).toContain('<tr><td>A02</td><td>Item2</td><td>20</td></tr>')
    expect(result.html).not.toContain('<!--DETAIL_ROW_START-->')
  })

  it('renders HTML template with empty detail items', () => {
    const result = renderPrintTemplate(
      [
        '<!--DETAIL_ROW_START-->',
        '<tr><td>{{detail.name}}</td></tr>',
        '<!--DETAIL_ROW_END-->',
      ].join('\n'),
      'HTML',
      {},
      [],
    )

    expect(result.type).toBe('HTML')
    expect(result.html).not.toContain('<!--DETAIL_ROW_START-->')
    expect(result.html).not.toContain('{{detail.name}}')
  })

  it('escapes special characters in HTML detail values', () => {
    const result = renderPrintTemplate(
      [
        '<!--DETAIL_ROW_START-->',
        '<td>{{detail.text}}</td>',
        '<!--DETAIL_ROW_END-->',
      ].join('\n'),
      'HTML',
      {},
      [{ text: 'test"quote' }],
    )

    expect(result.html).toContain('test\\"quote')
  })

  it('renders COORD template with if/else blocks and data placeholders', () => {
    const result = renderPrintTemplate(
      '{{#if showHeader}}LODOP.ADD_PRINT_TEXT(10,10,200,20,"{{title}}");{{/if}}',
      'COORD',
      { showHeader: 'true', title: '报表标题' },
      [],
    )

    expect(result.type).toBe('COORD')
    expect(result.script).toContain('LODOP.ADD_PRINT_TEXT(10,10,200,20,"报表标题")')
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
