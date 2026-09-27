import { describe, expect, it } from 'vitest'
import { appAntdLocale, getAntdLocale } from './antd-locale'

describe('antd 中文语言包', () => {
  /**
   * 回归: 语言包曾只写定制段落、没有以官方 zh_CN 为基底, 导致未列出的段落静默回落英文
   * —— 实测表现为比价页「报单日期」显示 "Select date"、首次引导按钮显示 "Next"。
   * 这里锁住"必须留住了基底"这一契约。
   */
  it('保留官方 zh_CN 基底, DatePicker / Tour / Pagination / TimePicker 不缺段', () => {
    expect(appAntdLocale.DatePicker?.lang?.placeholder).toBe('请选择日期')
    expect(appAntdLocale.Tour?.Next).toBe('下一步')
    expect(appAntdLocale.Tour?.Finish).toBe('结束导览')
    expect(appAntdLocale.Pagination?.items_per_page).toBe('条/页')
    expect(appAntdLocale.TimePicker?.placeholder).toBe('请选择时间')
  })

  it('定制段落仍然生效', () => {
    expect(appAntdLocale.locale).toBe('zh-cn')
    expect(appAntdLocale.global?.placeholder).toBe('请选择')
    expect(appAntdLocale.global?.close).toBe('关闭')
    expect(appAntdLocale.Table?.emptyText).toBe('暂无数据')
    expect(appAntdLocale.Table?.filterReset).toBe('重置')
    expect(appAntdLocale.Modal?.okText).toBe('确定')
    expect(appAntdLocale.Form?.optional).toBe('（可选）')
    expect(appAntdLocale.Form?.defaultValidateMessages?.required).toContain(
      '请输入',
    )
  })

  it('英文语言返回官方 en_US(不做中文定制)', () => {
    expect(getAntdLocale('en-US').Table?.emptyText).toBe('No data')
    expect(getAntdLocale('en').Tour?.Next).toBe('Next')
    expect(getAntdLocale(undefined).Table?.emptyText).toBe('暂无数据')
    expect(getAntdLocale('zh-CN').Tour?.Next).toBe('下一步')
  })
})
