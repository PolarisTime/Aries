import type { FormInstance } from 'antd'
import { Button, Col, Form, Input, InputNumber, Row, Select, Space } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type LengthPremiumInput,
  type LengthPremiumRecord,
  lengthPremiumInputSchema,
} from '@/api/master/length-premiums'
import { AccessibleFormItem } from '@/components/AccessibleFormItem'
import type { EntityId } from '@/types/entity-id'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import {
  buildLengthPremiumFormRules,
  buildLengthPremiumStatusOptions,
  EMPTY_LENGTH_PREMIUM_FORM_VALUES,
  type LengthPremiumFormValues,
  toLengthPremiumFieldErrors,
  toLengthPremiumFormValues,
  toLengthPremiumInputDraft,
} from './length-premium-form-model'

interface Props {
  open: boolean
  /** 编辑中的记录；为 null 表示新增。 */
  editing: LengthPremiumRecord | null
  form: FormInstance<LengthPremiumFormValues>
  /** 当前已加载的记录：用于「定尺名称重复」的即时提示。 */
  records: readonly LengthPremiumRecord[]
  saving: boolean
  onSubmit: (payload: LengthPremiumInput) => void
  onClose: () => void
}

/**
 * 定尺加价新增/编辑弹窗。
 *
 * <p>排版遵循仓库「主数据表单与弹层」规范：`WorkspaceOverlay` 的
 * `workspace-overlay-panel--form-dialog` 面板 + `master-form` 表单 +
 * `Row gutter={[16, 8]}` 栅格，取消/保存走面板底部 footer 槽。</p>
 *
 * <p>两道校验各司其职：antd 规则负责**输入时的即时提示**（必填/超长/加价超区间/重复），
 * Zod schema（{@link lengthPremiumInputSchema}）负责**写入前的收口**（trim、空备注省略），
 * 与后端 422 的同一套业务不变量对齐。加价允许为负，输入框因此不设 `min={0}`。</p>
 */
export function LengthPremiumEditorDialog({
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
  const statusOptions = useMemo(() => buildLengthPremiumStatusOptions(t), [t])
  const rules = useMemo(
    () => buildLengthPremiumFormRules({ t, records, editingId }),
    [editingId, records, t],
  )

  const handleSubmit = async () => {
    let values: LengthPremiumFormValues
    try {
      values = await form.validateFields()
    } catch {
      // 字段校验失败时 antd 已内联提示，直接返回，避免未处理的 Promise rejection。
      return
    }
    const parsed = lengthPremiumInputSchema.safeParse(
      toLengthPremiumInputDraft(values),
    )
    if (!parsed.success) {
      // 理论上不会走到这里（antd 规则与 schema 同源）；真出现说明两处口径漂移，
      // 把 schema 的错误按字段回填，避免「点了保存却毫无反应」。
      form.setFields(toLengthPremiumFieldErrors(parsed.error.issues))
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <WorkspaceOverlay
      open={open}
      className="workspace-overlay-panel--form-dialog"
      title={
        editing ? t('lengthPremium.editTitle') : t('lengthPremium.createTitle')
      }
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
      <Form<LengthPremiumFormValues>
        // 切换新增/编辑目标时重建表单，避免上一份录入残留。
        key={editingId ?? 'create'}
        className="master-form"
        form={form}
        layout="vertical"
        disabled={saving}
        initialValues={
          editing
            ? toLengthPremiumFormValues(editing)
            : EMPTY_LENGTH_PREMIUM_FORM_VALUES
        }
      >
        <Row gutter={[16, 8]}>
          <Col span={6}>
            <AccessibleFormItem
              name="lengthName"
              label={t('lengthPremium.lengthName')}
              rules={rules.lengthName}
            >
              <Input placeholder={t('lengthPremium.lengthNamePlaceholder')} />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="premium"
              label={t('lengthPremium.premium')}
              rules={rules.premium}
              // 长说明走标签旁 ⓘ, 同一份文案同时作为 extra 下发: 视觉收起但读屏仍能通过
              // aria-describedby 听到（见 styles/workspace-overlay.css 的 master-form 段）。
              tooltip={t('lengthPremium.premiumHint')}
              extra={t('lengthPremium.premiumHint')}
            >
              <InputNumber
                // 不加 min={0}: 加价允许为负（优惠），只限制后端区间。
                min={-100000}
                max={100000}
                precision={0}
                className="w-full"
                placeholder={t('lengthPremium.premiumPlaceholder')}
              />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="sortOrder"
              label={t('lengthPremium.sortOrder')}
              rules={rules.sortOrder}
              tooltip={t('lengthPremium.sortOrderHint')}
              extra={t('lengthPremium.sortOrderHint')}
            >
              <InputNumber
                min={0}
                precision={0}
                className="w-full"
                placeholder={t('lengthPremium.sortOrderPlaceholder')}
              />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="status"
              label={t('lengthPremium.status')}
              rules={rules.status}
              tooltip={t('lengthPremium.statusHint')}
              extra={t('lengthPremium.statusHint')}
            >
              <Select
                placeholder={t('lengthPremium.statusRequired')}
                options={statusOptions}
              />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="remark"
              label={t('lengthPremium.remark')}
              rules={rules.remark}
            >
              <Input placeholder={t('lengthPremium.remarkPlaceholder')} />
            </AccessibleFormItem>
          </Col>
        </Row>
      </Form>
    </WorkspaceOverlay>
  )
}
