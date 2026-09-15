import { Form, Input, Modal } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  RoleFormValues,
  RoleResponse,
  RoleUpdatePayload,
} from '@/shared/schemas'
import {
  buildRolePayload,
  emptyRoleFormValues,
  roleToFormValues,
} from '@/views/system/role-form-utils'

interface Props {
  open: boolean
  role: RoleResponse | null
  saving: boolean
  onSave: (payload: RoleUpdatePayload) => void
  onClose: () => void
}

export function RoleEditorModal({
  open,
  role,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<RoleFormValues>()
  const builtin = Boolean(role?.builtin)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(role ? roleToFormValues(role) : emptyRoleFormValues())
  }, [form, open, role])

  const handleOk = async () => {
    const values = await form.validateFields()
    onSave(buildRolePayload(values, builtin))
  }

  return (
    <Modal
      open={open}
      title={role ? t('system.role.editRole') : t('system.role.newRole')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      onOk={() => {
        void handleOk()
      }}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="code"
          label={t('system.role.code')}
          tooltip={builtin ? t('system.role.builtinCodeReadonly') : undefined}
          rules={[
            { required: true, whitespace: true },
            { max: 64 },
            { pattern: /^[a-zA-Z0-9_-]+$/ },
          ]}
        >
          <Input
            maxLength={64}
            disabled={builtin}
            placeholder={t('system.role.codePlaceholder')}
          />
        </Form.Item>
        <Form.Item
          name="name"
          label={t('system.role.name')}
          rules={[{ required: true, whitespace: true }, { max: 64 }]}
        >
          <Input
            maxLength={64}
            placeholder={t('system.role.namePlaceholder')}
          />
        </Form.Item>
        <Form.Item
          name="description"
          label={t('system.role.descriptionLabel')}
          rules={[{ max: 255 }]}
        >
          <Input.TextArea
            maxLength={255}
            rows={3}
            placeholder={t('system.role.descriptionPlaceholder')}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
