import { describe, expect, it } from 'vitest'
import { appAntdLocale } from './antd-locale'

describe('appAntdLocale', () => {
  it('sets locale to zh-cn', () => {
    expect(appAntdLocale.locale).toBe('zh-cn')
  })

  it('defines global translations', () => {
    expect(appAntdLocale.global).toBeDefined()
    expect(appAntdLocale.global?.placeholder).toBe('请选择')
    expect(appAntdLocale.global?.close).toBe('关闭')
    expect(appAntdLocale.global?.sortable).toBe('可排序')
  })

  it('defines Table translations', () => {
    expect(appAntdLocale.Table).toBeDefined()
    expect(appAntdLocale.Table?.filterTitle).toBe('筛选')
    expect(appAntdLocale.Table?.filterConfirm).toBe('确定')
    expect(appAntdLocale.Table?.filterReset).toBe('重置')
    expect(appAntdLocale.Table?.filterEmptyText).toBe('无筛选项')
    expect(appAntdLocale.Table?.filterCheckAll).toBe('全选')
    expect(appAntdLocale.Table?.filterSearchPlaceholder).toBe('在筛选项中搜索')
    expect(appAntdLocale.Table?.emptyText).toBe('暂无数据')
    expect(appAntdLocale.Table?.selectAll).toBe('全选当页')
    expect(appAntdLocale.Table?.selectInvert).toBe('反选当页')
    expect(appAntdLocale.Table?.selectNone).toBe('清空所有')
    expect(appAntdLocale.Table?.selectionAll).toBe('全选所有')
    expect(appAntdLocale.Table?.sortTitle).toBe('排序')
    expect(appAntdLocale.Table?.expand).toBe('展开行')
    expect(appAntdLocale.Table?.collapse).toBe('关闭行')
    expect(appAntdLocale.Table?.triggerDesc).toBe('点击降序')
    expect(appAntdLocale.Table?.triggerAsc).toBe('点击升序')
    expect(appAntdLocale.Table?.cancelSort).toBe('取消排序')
  })

  it('defines Modal translations', () => {
    expect(appAntdLocale.Modal).toBeDefined()
    expect(appAntdLocale.Modal?.okText).toBe('确定')
    expect(appAntdLocale.Modal?.cancelText).toBe('取消')
    expect(appAntdLocale.Modal?.justOkText).toBe('知道了')
  })

  it('defines Popconfirm translations', () => {
    expect(appAntdLocale.Popconfirm).toBeDefined()
    expect(appAntdLocale.Popconfirm?.cancelText).toBe('取消')
    expect(appAntdLocale.Popconfirm?.okText).toBe('确定')
  })

  it('defines Upload translations', () => {
    expect(appAntdLocale.Upload).toBeDefined()
    expect(appAntdLocale.Upload?.uploading).toBe('文件上传中')
    expect(appAntdLocale.Upload?.removeFile).toBe('删除文件')
    expect(appAntdLocale.Upload?.uploadError).toBe('上传错误')
    expect(appAntdLocale.Upload?.previewFile).toBe('预览文件')
    expect(appAntdLocale.Upload?.downloadFile).toBe('下载文件')
  })

  it('defines Empty description', () => {
    expect(appAntdLocale.Empty?.description).toBe('暂无数据')
  })

  it('defines Icon translations', () => {
    expect(appAntdLocale.Icon).toBeDefined()
    expect(appAntdLocale.Icon?.icon).toBe('图标')
  })

  it('defines Text translations', () => {
    expect(appAntdLocale.Text).toBeDefined()
    expect(appAntdLocale.Text?.edit).toBe('编辑')
    expect(appAntdLocale.Text?.copy).toBe('复制')
    expect(appAntdLocale.Text?.copied).toBe('复制成功')
    expect(appAntdLocale.Text?.expand).toBe('展开')
    expect(appAntdLocale.Text?.collapse).toBe('收起')
  })

  it('defines Form validation messages', () => {
    expect(appAntdLocale.Form).toBeDefined()
    expect(appAntdLocale.Form?.defaultValidateMessages?.required).toContain('${label}')
    expect(appAntdLocale.Form?.optional).toBe('（可选）')
    expect(appAntdLocale.Form?.defaultValidateMessages?.default).toContain('${label}')
    expect(appAntdLocale.Form?.defaultValidateMessages?.enum).toContain('${label}')
    expect(appAntdLocale.Form?.defaultValidateMessages?.whitespace).toContain('${label}')
  })

  it('defines Form date validation messages', () => {
    const date = appAntdLocale.Form?.defaultValidateMessages?.date
    expect(date).toBeDefined()
    expect(date?.format).toContain('${label}')
    expect(date?.parse).toContain('${label}')
    expect(date?.invalid).toContain('${label}')
  })

  it('defines Form types validation messages', () => {
    const types = appAntdLocale.Form?.defaultValidateMessages?.types
    expect(types).toBeDefined()
    expect(types?.string).toContain('${label}')
    expect(types?.method).toContain('${label}')
    expect(types?.array).toContain('${label}')
    expect(types?.object).toContain('${label}')
    expect(types?.number).toContain('${label}')
    expect(types?.date).toContain('${label}')
    expect(types?.boolean).toContain('${label}')
    expect(types?.integer).toContain('${label}')
    expect(types?.float).toContain('${label}')
    expect(types?.regexp).toContain('${label}')
    expect(types?.email).toContain('${label}')
    expect(types?.url).toContain('${label}')
    expect(types?.hex).toContain('${label}')
  })

  it('defines Form string validation messages', () => {
    const string = appAntdLocale.Form?.defaultValidateMessages?.string
    expect(string).toBeDefined()
    expect(string?.len).toContain('${label}')
    expect(string?.min).toContain('${label}')
    expect(string?.max).toContain('${label}')
    expect(string?.range).toContain('${label}')
  })

  it('defines Form number validation messages', () => {
    const number = appAntdLocale.Form?.defaultValidateMessages?.number
    expect(number).toBeDefined()
    expect(number?.len).toContain('${label}')
    expect(number?.min).toContain('${label}')
    expect(number?.max).toContain('${label}')
    expect(number?.range).toContain('${label}')
  })

  it('defines Form array validation messages', () => {
    const array = appAntdLocale.Form?.defaultValidateMessages?.array
    expect(array).toBeDefined()
    expect(array?.len).toContain('${label}')
    expect(array?.min).toContain('${label}')
    expect(array?.max).toContain('${label}')
    expect(array?.range).toContain('${label}')
  })

  it('defines Form pattern validation message', () => {
    const pattern = appAntdLocale.Form?.defaultValidateMessages?.pattern
    expect(pattern).toBeDefined()
    expect(pattern?.mismatch).toContain('${label}')
  })

  it('defines QRCode translations', () => {
    expect(appAntdLocale.QRCode).toBeDefined()
    expect(appAntdLocale.QRCode?.expired).toBe('二维码过期')
    expect(appAntdLocale.QRCode?.refresh).toBe('点击刷新')
    expect(appAntdLocale.QRCode?.scanned).toBe('已扫描')
  })

  it('defines ColorPicker translations', () => {
    expect(appAntdLocale.ColorPicker).toBeDefined()
    expect(appAntdLocale.ColorPicker?.presetEmpty).toBe('暂无')
    expect(appAntdLocale.ColorPicker?.transparent).toBe('无色')
    expect(appAntdLocale.ColorPicker?.singleColor).toBe('单色')
    expect(appAntdLocale.ColorPicker?.gradientColor).toBe('渐变色')
  })
})
