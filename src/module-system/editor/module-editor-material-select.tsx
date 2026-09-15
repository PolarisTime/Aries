import { Select, Spin } from 'antd'
import i18next from 'i18next'
import type { ModuleLineItem } from '@/types/module-page'
import { createStructuredMaterialFilterOption } from '@/utils/pinyin-search'
import { asString } from '@/utils/type-narrowing'
import {
  type MaterialSelectOption,
  withCurrentMaterialOption,
} from './module-editor-material-options'

/** 商品下拉的服务端搜索控制器：输入时回调关键词，关闭下拉时复位。 */
export interface MaterialSearchController {
  searching: boolean
  onSearch: (keyword: string) => void
  onClose: () => void
}

interface Props {
  record: ModuleLineItem
  options: MaterialSelectOption[]
  search: MaterialSearchController
  onChange: (materialId: string) => void
}

const filterMaterialOption = createStructuredMaterialFilterOption()

/**
 * 商品编码单元格下拉：本地结构化/拼音过滤与服务端搜索并用。
 * 本地只预加载首页 200 条，超出部分必须依赖输入关键词触发服务端搜索。
 */
export function ModuleEditorMaterialSelect({
  record,
  options,
  search,
  onChange,
}: Props) {
  const materialValue = asString(record.materialId).trim()

  return (
    <Select
      value={materialValue || undefined}
      showSearch={{
        filterOption: filterMaterialOption,
        onSearch: search.onSearch,
      }}
      allowClear
      className="w-full"
      placeholder={i18next.t('modules.itemColumns.materialSearchPlaceholder')}
      optionLabelProp="label"
      notFoundContent={search.searching ? <Spin size="small" /> : undefined}
      onOpenChange={(open) => {
        if (!open) {
          search.onClose()
        }
      }}
      onChange={(selectedValue) => onChange(String(selectedValue || ''))}
      options={withCurrentMaterialOption(options, record)}
    />
  )
}
