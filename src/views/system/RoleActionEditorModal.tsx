import type { FormInstance } from 'antd'
import { Form, Input, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import type { RoleRecord } from '@/api/role-actions'
import { FormModal } from '@/components/FormModal'
import {
  enabledStatusOptions,
  roleTypeValues,
} from '@/constants/module-options'

interface Props {
  open: boolean
  editingRole: RoleRecord | null
  form: FormInstance
  saving: boolean
  onSave: () => void
  onClose: () => void
}

export function RoleActionEditorModal({
  open,
  editingRole,
  form,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const isAdminRole = editingRole?.roleCode.trim().toUpperCase() === 'ADMIN'

  return (
    <FormModal
      title={
        editingRole
          ? t('system.roleEditor.editTitle')
          : t('system.roleEditor.createTitle')
      }
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      okText={t('system.roleEditor.save')}
      cancelText={t('system.roleEditor.cancel')}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="roleName"
          label={t('system.roleEditor.roleName')}
          rules={[{ required: true, whitespace: true }, { max: 128 }]}
        >
          <Input
            placeholder={t('system.roleEditor.roleNamePlaceholder')}
            maxLength={128}
          />
        </Form.Item>
        <Form.Item
          name="roleCode"
          label={t('system.roleEditor.roleCode')}
          rules={[
            { required: true, whitespace: true },
            { max: 64 },
            { pattern: /^[A-Za-z0-9_-]+$/ },
          ]}
        >
          <Input
            placeholder={t('system.roleEditor.roleCodePlaceholder')}
            maxLength={64}
            disabled={isAdminRole}
          />
        </Form.Item>
        <Form.Item
          name="roleType"
          label={t('system.roleEditor.roleType')}
          rules={[{ required: true }]}
        >
          <Select
            options={roleTypeValues.map((value) => ({ label: value, value }))}
          />
        </Form.Item>
        <Form.Item
          name="status"
          label={t('common.status')}
          rules={[{ required: true }]}
        >
          <Select options={enabledStatusOptions} disabled={isAdminRole} />
        </Form.Item>
        <Form.Item
          name="remark"
          label={t('system.roleEditor.remark')}
          rules={[{ max: 255 }]}
        >
          <Input.TextArea
            placeholder={t('system.roleEditor.remarkPlaceholder')}
            rows={3}
            maxLength={255}
          />
        </Form.Item>
      </Form>
    </FormModal>
  )
}
