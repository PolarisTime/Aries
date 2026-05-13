import type { ModulePageConfig } from '@/types/module-page'
import type {
  PrintTemplateSnippet,
  PrintTemplateTokenDescriptor,
  PrintTemplateTokenGroup,
} from '@/utils/print-template-designer-types'

export function buildPrintTemplateTokenGroups(
  config: ModulePageConfig,
): PrintTemplateTokenGroup[] {
  const systemTokens: PrintTemplateTokenDescriptor[] = [
    {
      key: '_printDate',
      label: '打印日期',
      token: '{{_printDate}}',
      description: '当前打印日期，格式 YYYY-MM-DD',
    },
    {
      key: '_printTime',
      label: '打印时间',
      token: '{{_printTime}}',
      description: '当前打印时间，格式 YYYY-MM-DD HH:mm:ss',
    },
    {
      key: '_index',
      label: '明细序号',
      token: '{{_index}}',
      description: '在明细循环内表示从 1 开始的行号',
    },
  ]

  const headerTokens = config.detailFields.map((field) => ({
    key: field.key,
    label: field.label,
    token: `{{${field.key}}}`,
  }))

  const detailTokens = (config.itemColumns || []).map((column) => ({
    key: column.dataIndex,
    label: column.title,
    token: `{{detail.${column.dataIndex}}}`,
  }))

  return [
    {
      key: 'system',
      label: '系统变量',
      description: '打印时间和明细序号由系统自动注入。',
      tokens: systemTokens,
    },
    {
      key: 'header',
      label: '主表字段',
      description: '来自当前单据主表，可直接插入标题、摘要和页眉页脚。',
      tokens: headerTokens,
    },
    {
      key: 'detail',
      label: '明细字段',
      description: '必须放在明细循环块中使用。',
      tokens: detailTokens,
    },
  ]
}

export function buildPrintTemplateSnippets(
  config: ModulePageConfig,
): PrintTemplateSnippet[] {
  const firstHeaderField =
    config.detailFields[0]?.key || config.primaryNoKey || 'billNo'
  const firstDetailField = config.itemColumns?.[0]?.dataIndex || 'materialCode'

  return [
    {
      key: 'title',
      label: '标题行',
      description: '快速插入单据标题和打印时间。',
      content: `<div class="sheet-title">${config.title}：{{${firstHeaderField}}}</div>\n<div class="sheet-time">打印时间：{{_printTime}}</div>`,
    },
    {
      key: 'if',
      label: '条件块',
      description: '字段有值时才渲染内容。',
      content:
        '{{#if remark}}<div class="sheet-remark">备注：{{remark}}</div>{{/if}}',
    },
    {
      key: 'each',
      label: '循环块',
      description: '推荐的新明细循环写法。',
      content: `<tbody>\n{{#each details}}\n  <tr>\n    <td>{{_index}}</td>\n    <td>{{${firstDetailField}}}</td>\n  </tr>\n{{/each}}\n</tbody>`,
    },
    {
      key: 'legacy-detail',
      label: '兼容循环',
      description: '保留旧模板的注释式明细循环。',
      content: `<!--DETAIL_ROW_START-->\n<tr>\n  <td>{{_index}}</td>\n  <td>{{detail.${firstDetailField}}}</td>\n</tr>\n<!--DETAIL_ROW_END-->`,
    },
    {
      key: 'nested',
      label: '嵌套字段',
      description: '支持 customer.name 这类点路径。',
      content: '<div>业务员：{{meta.operatorName}}</div>',
    },
  ]
}
