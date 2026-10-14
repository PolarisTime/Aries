import type { FormInstance } from 'antd'
import { Button, Col, Form, Input, InputNumber, Row, Select, Space } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type QuoteRegionInput,
  type QuoteRegionRecord,
  quoteRegionInputSchema,
} from '@/api/master/quote-regions'
import { AccessibleFormItem } from '@/components/AccessibleFormItem'
import type { EntityId } from '@/types/entity-id'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import {
  buildQuoteRegionFormRules,
  buildQuoteRegionStatusOptions,
  EMPTY_QUOTE_REGION_FORM_VALUES,
  type QuoteRegionFormValues,
  toQuoteRegionFieldErrors,
  toQuoteRegionFormValues,
  toQuoteRegionInputDraft,
} from './quote-region-form-model'

interface Props {
  open: boolean
  /** 编辑中的记录；为 null 表示新增。 */
  editing: QuoteRegionRecord | null
  form: FormInstance<QuoteRegionFormValues>
  /** 当前已加载的记录：用于「城市名/子域名重复」的即时提示。 */
  records: readonly QuoteRegionRecord[]
  saving: boolean
  onSubmit: (payload: QuoteRegionInput) => void
  onClose: () => void
}

/**
 * 取价地区新增/编辑弹窗。
 *
 * <p>排版遵循仓库「主数据表单与弹层」规范：`WorkspaceOverlay` 的
 * `workspace-overlay-panel--form-dialog` 面板 + `master-form` 表单 +
 * `Row gutter={[16, 8]}` 栅格，取消/保存走面板底部 footer 槽。</p>
 *
 * <p>两道校验各司其职：antd 规则负责**输入时的即时提示**（必填/超长/slug 非法字符/重复），
 * Zod schema（{@link quoteRegionInputSchema}）负责**写入前的收口**（trim、空备注省略），
 * 与后端 422 的同一套业务不变量对齐。</p>
 */
export function QuoteRegionEditorDialog({
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
  const statusOptions = useMemo(() => buildQuoteRegionStatusOptions(t), [t])
  const rules = useMemo(
    () => buildQuoteRegionFormRules({ t, records, editingId }),
    [editingId, records, t],
  )

  const handleSubmit = async () => {
    let values: QuoteRegionFormValues
    try {
      values = await form.validateFields()
    } catch {
      // 字段校验失败时 antd 已内联提示，直接返回，避免未处理的 Promise rejection。
      return
    }
    const parsed = quoteRegionInputSchema.safeParse(
      toQuoteRegionInputDraft(values),
    )
    if (!parsed.success) {
      // 理论上不会走到这里（antd 规则与 schema 同源）；真出现说明两处口径漂移，
      // 把 schema 的错误按字段回填，避免「点了保存却毫无反应」。
      form.setFields(toQuoteRegionFieldErrors(parsed.error.issues))
      return
    }
    onSubmit(parsed.data)
  }

  return (
    <WorkspaceOverlay
      open={open}
      className="workspace-overlay-panel--form-dialog"
      title={
        editing ? t('quoteRegion.editTitle') : t('quoteRegion.createTitle')
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
      <Form<QuoteRegionFormValues>
        // 切换新增/编辑目标时重建表单，避免上一份录入残留。
        key={editingId ?? 'create'}
        className="master-form"
        form={form}
        layout="vertical"
        disabled={saving}
        initialValues={
          editing
            ? toQuoteRegionFormValues(editing)
            : EMPTY_QUOTE_REGION_FORM_VALUES
        }
      >
        <Row gutter={[16, 8]}>
          <Col span={6}>
            <AccessibleFormItem
              name="regionName"
              label={t('quoteRegion.regionName')}
              rules={rules.regionName}
            >
              <Input placeholder={t('quoteRegion.regionNamePlaceholder')} />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="slug"
              label={t('quoteRegion.slug')}
              rules={rules.slug}
              // 长说明走标签旁 ⓘ, 同一份文案同时作为 extra 下发: 视觉收起但读屏仍能通过
              // aria-describedby 听到（见 styles/workspace-overlay.css 的 master-form 段）。
              tooltip={t('quoteRegion.slugHint')}
              extra={t('quoteRegion.slugHint')}
            >
              <Input placeholder={t('quoteRegion.slugPlaceholder')} />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="sortOrder"
              label={t('quoteRegion.sortOrder')}
              rules={rules.sortOrder}
              tooltip={t('quoteRegion.sortOrderHint')}
              extra={t('quoteRegion.sortOrderHint')}
            >
              <InputNumber
                min={0}
                precision={0}
                className="w-full"
                placeholder={t('quoteRegion.sortOrderPlaceholder')}
              />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="status"
              label={t('quoteRegion.status')}
              rules={rules.status}
              tooltip={t('quoteRegion.statusHint')}
              extra={t('quoteRegion.statusHint')}
            >
              <Select
                placeholder={t('quoteRegion.statusRequired')}
                options={statusOptions}
              />
            </AccessibleFormItem>
          </Col>
          <Col span={6}>
            <AccessibleFormItem
              name="remark"
              label={t('quoteRegion.remark')}
              rules={rules.remark}
            >
              <Input placeholder={t('quoteRegion.remarkPlaceholder')} />
            </AccessibleFormItem>
          </Col>
        </Row>
      </Form>
    </WorkspaceOverlay>
  )
}
