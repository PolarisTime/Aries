import type { FormInstance } from 'antd'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecordInput,
} from '@/types/module-page'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'

interface Props {
  config: ModulePageConfig
  /** 持久化编辑器草稿（新建为 null）；与实时表单值合并后交给配置。 */
  record: ModuleRecordInput | null
  form: FormInstance<ModuleRecordInput>
  /** 实时表单值（`Form.useWatch([], form)`）。 */
  formValues: ModuleRecordInput
  items: ModuleLineItem[]
  expenseItems: DocumentChargeItemDraft[]
}

/**
 * 编辑器附加节点的**唯一挂载点**（见 {@link ModulePageConfig['renderEditorExtras']}）。
 *
 * <p>位置在表单区（`ModuleEditorFormArea`）之后、明细区之前：面板要能读到刚录入的项目/明细，
 * 又不属于表单字段本身（否则会被表单校验与脏状态连带）。</p>
 *
 * <p>上下文里的 `record` 是「持久化字段 + 实时表单值 + 明细行」的合并视图：
 * 配置侧不需要自己关心新建态没有 `id`、编辑态哪些字段还没进表单。</p>
 */
export function ModuleEditorExtras({
  config,
  record,
  form,
  formValues,
  items,
  expenseItems,
}: Props) {
  const render = config.renderEditorExtras
  if (!render) {
    return null
  }

  return (
    <>
      {render({
        record: { ...record, ...formValues, items },
        form,
        items,
        expenseItems,
      })}
    </>
  )
}
