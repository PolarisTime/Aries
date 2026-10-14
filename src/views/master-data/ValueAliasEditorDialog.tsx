import type { FormInstance } from 'antd'
import { Button, Col, Form, Input, Row, Select, Space } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ValueAliasInput,
  type ValueAliasRecord,
  valueAliasInputSchema,
} from '@/api/master/value-aliases'
import { AccessibleFormItem } from '@/components/AccessibleFormItem'
import type { EntityId } from '@/types/entity-id'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import {
  buildValueAliasDimensionOptions,
  buildValueAliasFormRules,
  EMPTY_VALUE_ALIAS_FORM_VALUES,
  toValueAliasFieldErrors,
  toValueAliasFormValues,
  toValueAliasInputDraft,
  type ValueAliasFormValues,
} from './value-alias-form-model'

interface Props {
  open: boolean
  /** 编辑中的记录；为 null 表示新增。 */
  editing: ValueAliasRecord | null
  form: FormInstance<ValueAliasFormValues>
  /** 当前已加载的记录：用于「同维度源写法重复」的即时提示。 */
  records: readonly ValueAliasRecord[]
  saving: boolean
  onSubmit: (payload: ValueAliasInput) => void
  onClose: () => void
}

/**
 * 值映射新增/编辑弹窗。
 *
 * <p>排版遵循仓库「主数据表单与弹层」规范：`WorkspaceOverlay` 的
 * `workspace-overlay-panel--form-dialog` 面板 + `master-form` 表单 +
 * `Row gutter={[16, 8]}` 栅格，取消/保存走面板底部 footer 槽。</p>
 *
 * <p>两道校验各司其职：antd 规则负责**输入时的即时提示**（必填/超长/自映射/同维度重复），
 * Zod schema 负责**写入前的收口**（维度归一为大写、trim、空备注省略），
 * 与后端 422 的同一套业务不变量对齐。</p>
 */
export function ValueAliasEditorDialog({
  open,
  editing,
  form,
  records,
  saving,
  onSubmit,
  onClose,
}: Props) {
  const { t } = useTranslation()

  const editingId: EntityId | null = editing ? editing.id : null
  const dimensionOptions = useMemo(
    () => buildValueAliasDimensionOptions(t),
    [t],
  )
  const rules = useMemo(
    () =>
      buildValueAliasFormRules({
        t,
        records,
        editingId,
        getFieldValue: (field) => form.getFieldValue(field),
      }),
    [editingId, form, records, t],
  )

  const handleSubmit = async () => {
    let values: ValueAliasFormValues
    try {
      values = await form.validateFields()
    } catch {
      // 字段校验失败时 antd 已内联提示，直接返回，避免未处理的 Promise rejection。
      return
    }
    const parsed = valueAliasInputSchema.safeParse(
      toValueAliasInputDraft(values),
    )
    if (!parsed.success) {
      // 理论上不会走到这里（antd 规则与 schema 同源）；真出现说明两处口径漂移，
      // 把 schema 的错误按字段回填，避免「点了保存却毫无反应」。
      form.setFields(toValueAliasFieldErrors(parsed.error.issues))
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <WorkspaceOverlay
      open={open}
      className="workspace-overlay-panel--form-dialog"
      title={editing ? t('valueAlias.editTitle') : t('valueAlias.createTitle')}
      onClose={onClose}
      footer={
        <Space>
          <Button disabled={saving} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="primary"
            loading={saving}
            onClick={() => {
              void handleSubmit()
            }}
          >
            {t('common.save')}
          </Button>
        </Space>
      }
    >
      <Form<ValueAliasFormValues>
        // 切换新增/编辑目标时重建表单，避免上一份录入残留。
        key={editingId ?? 'create'}
        className="master-form"
        form={form}
        layout="vertical"
        disabled={saving}
        initialValues={
          editing
            ? toValueAliasFormValues(editing)
            : EMPTY_VALUE_ALIAS_FORM_VALUES
        }
      >
        <Row gutter={[16, 8]}>
          <Col span={6}>
            <AccessibleFormItem
              name="dimension"
              label={t('valueAlias.dimension')}
              rules={rules.dimension}
            >
              <Select
                placeholder={t('valueAlias.dimensionPlaceholder')}
                options={dimensionOptions}
              />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="sourceValue"
              label={t('valueAlias.sourceValue')}
              rules={rules.sourceValue}
              // 维度变了要重算「同维度源写法重复」。
              dependencies={['dimension']}
            >
              <Input placeholder={t('valueAlias.sourceValuePlaceholder')} />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="targetValue"
              label={t('valueAlias.targetValue')}
              rules={rules.targetValue}
              // 源写法变了要重算「自映射」。
              dependencies={['sourceValue']}
            >
              <Input placeholder={t('valueAlias.targetValuePlaceholder')} />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="remark"
              label={t('valueAlias.remark')}
              rules={rules.remark}
            >
              <Input placeholder={t('valueAlias.remarkPlaceholder')} />
            </AccessibleFormItem>
          </Col>
        </Row>
      </Form>
    </WorkspaceOverlay>
  )
}
