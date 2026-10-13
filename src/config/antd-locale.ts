import type { Locale } from 'antd/es/locale'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import {
  DISPLAY_DATE_FORMAT,
  DISPLAY_DATE_TIME_FORMAT,
} from '@/utils/formatters'

const typeTemplate = '${label}不是一个有效的${type}'

/**
 * 日期输入框（DatePicker / RangePicker / showTime）的默认展示格式。
 *
 * <p>rc-picker 在 locale 未给 {@code fieldDateFormat} 时会回落到 ISO `YYYY-MM-DD`，
 * 于是所有不显式传 `format` 的日期选择器都会显示成 ISO；这里统一改写为
 * {@link DISPLAY_DATE_FORMAT}（`X年X月X日`，月/日补零），避免逐处传 `format` 漂移。</p>
 */
const datePickerLang = {
  fieldDateFormat: DISPLAY_DATE_FORMAT,
  fieldDateTimeFormat: DISPLAY_DATE_TIME_FORMAT,
  /** 月份/年份面板的输入框同样走中文口径（默认 `YYYY-MM` / `YYYY`）。 */
  fieldMonthFormat: 'YYYY年MM月',
  fieldYearFormat: 'YYYY年',
} as const

/**
 * 给任意 antd 语言包补齐统一的日期输入框展示格式（`X年X月X日`，月/日补零）。
 *
 * <p>不做这个改写时，未显式传 `format` 的日期选择器会回落到 rc-picker 的 ISO 默认值，
 * 界面里就会一半中文日期、一半 ISO —— 表格走 {@code formatDate}，选择器走 locale。</p>
 *
 * <p><b>必须同时补 DatePicker 与 Calendar 两段</b>：antd 的单日期 DatePicker 读
 * {@code useLocale('DatePicker')}，而 **RangePicker 读的是 {@code useLocale('Calendar')}**
 * （见 antd 的 generateRangePicker），只补前者会让区间选择器继续显示 ISO。</p>
 */
function withDisplayDatePicker(locale: Locale): Locale {
  const datePicker = locale.DatePicker
  const calendar = locale.Calendar
  return {
    ...locale,
    ...(datePicker
      ? {
          DatePicker: {
            ...datePicker,
            lang: { ...datePicker.lang, ...datePickerLang },
          },
        }
      : {}),
    ...(calendar
      ? {
          Calendar: {
            ...calendar,
            lang: { ...calendar.lang, ...datePickerLang },
          },
        }
      : {}),
  }
}

/** 英文语言包同样遵循系统的中文日期展示口径（与表格 formatDate 保持一致）。 */
const enUsLocale: Locale = withDisplayDatePicker(enUS)

/**
 * 中文语言包。
 *
 * <p>必须以 antd 官方的 {@link zhCN} 为基底展开: 只写下面这些被定制过的段落时,
 * 未列出的段落会静默回落到 antd 的英文默认值(实测: DatePicker 占位符显示
 * "Select date"、首次引导 Tour 的按钮显示 "Next")。当前会受影响的段落包括
 * Calendar / Carousel / DatePicker / Pagination / TimePicker / Tour / Transfer。</p>
 */
export const appAntdLocale: Locale = withDisplayDatePicker({
  ...zhCN,
  locale: 'zh-cn',
  global: {
    ...zhCN.global,
    placeholder: '请选择',
    close: '关闭',
    sortable: '可排序',
  },
  Table: {
    ...zhCN.Table,
    filterTitle: '筛选',
    filterConfirm: '确定',
    filterReset: '重置',
    filterEmptyText: '无筛选项',
    filterCheckAll: '全选',
    filterSearchPlaceholder: '在筛选项中搜索',
    emptyText: '暂无数据',
    selectAll: '全选当页',
    selectInvert: '反选当页',
    selectNone: '清空所有',
    selectionAll: '全选所有',
    sortTitle: '排序',
    expand: '展开行',
    collapse: '关闭行',
    triggerDesc: '点击降序',
    triggerAsc: '点击升序',
    cancelSort: '取消排序',
  },
  Modal: {
    ...zhCN.Modal,
    okText: '确定',
    cancelText: '取消',
    justOkText: '知道了',
  },
  Popconfirm: {
    ...zhCN.Popconfirm,
    cancelText: '取消',
    okText: '确定',
  },
  Upload: {
    ...zhCN.Upload,
    uploading: '文件上传中',
    removeFile: '删除文件',
    uploadError: '上传错误',
    previewFile: '预览文件',
    downloadFile: '下载文件',
  },
  Empty: {
    ...zhCN.Empty,
    description: '暂无数据',
  },
  Icon: {
    ...zhCN.Icon,
    icon: '图标',
  },
  Text: {
    ...zhCN.Text,
    edit: '编辑',
    copy: '复制',
    copied: '复制成功',
    expand: '展开',
    collapse: '收起',
  },
  Form: {
    ...zhCN.Form,
    optional: '（可选）',
    defaultValidateMessages: {
      ...zhCN.Form?.defaultValidateMessages,
      default: '字段验证错误${label}',
      required: '请输入${label}',
      enum: '${label}必须是其中一个[${enum}]',
      whitespace: '${label}不能为空字符',
      date: {
        format: '${label}日期格式无效',
        parse: '${label}不能转换为日期',
        invalid: '${label}是一个无效日期',
      },
      types: {
        string: typeTemplate,
        method: typeTemplate,
        array: typeTemplate,
        object: typeTemplate,
        number: typeTemplate,
        date: typeTemplate,
        boolean: typeTemplate,
        integer: typeTemplate,
        float: typeTemplate,
        regexp: typeTemplate,
        email: typeTemplate,
        url: typeTemplate,
        hex: typeTemplate,
      },
      string: {
        len: '${label}须为${len}个字符',
        min: '${label}最少${min}个字符',
        max: '${label}最多${max}个字符',
        range: '${label}须在${min}-${max}字符之间',
      },
      number: {
        len: '${label}必须等于${len}',
        min: '${label}最小值为${min}',
        max: '${label}最大值为${max}',
        range: '${label}须在${min}-${max}之间',
      },
      array: {
        len: '须为${len}个${label}',
        min: '最少${min}个${label}',
        max: '最多${max}个${label}',
        range: '${label}数量须在${min}-${max}之间',
      },
      pattern: {
        mismatch: '${label}与模式不匹配${pattern}',
      },
    },
  },
  QRCode: {
    ...zhCN.QRCode,
    expired: '二维码过期',
    refresh: '点击刷新',
    scanned: '已扫描',
  },
  ColorPicker: {
    ...zhCN.ColorPicker,
    presetEmpty: '暂无',
    transparent: '无色',
    singleColor: '单色',
    gradientColor: '渐变色',
  },
})

/** 依据 i18n 语言返回 antd 组件语言包（中文用定制版，其余用英文默认 + 统一日期展示口径）。 */
export function getAntdLocale(language: string | undefined): Locale {
  return (language ?? '').toLowerCase().startsWith('en')
    ? enUsLocale
    : appAntdLocale
}
