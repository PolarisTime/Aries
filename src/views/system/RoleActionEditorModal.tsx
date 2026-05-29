import type { FormInstance } from 'antd'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { http } from '@/api/client'
import type { RoleRecord } from '@/api/role-actions'
import { FormModal } from '@/components/FormModal'
import { roleDataScopeValues, roleTypeValues } from '@/constants/module-options'
import { asString } from '@/utils/type-narrowing'

interface Props {
  open: boolean
  editingRole: RoleRecord | null
  form: FormInstance
  saving: boolean
  onSave: () => void
  onClose: () => void
  onApplyTemplate?: (templateName: string) => void
}

interface RoleTemplate {
  name: string
  description: string
}

export function RoleActionEditorModal({
  open,
  editingRole,
  form,
  saving,
  onSave,
  onClose,
  onApplyTemplate,
}: Props) {
  const { t } = useTranslation()
  const { data: templates = [] } = useQuery<RoleTemplate[]>({
    queryKey: ['role-templates'],
    queryFn: async () => {
      const resp = await http.get<{ data?: RoleTemplate[] } | RoleTemplate[]>(
        '/role-settings/templates',
      )
      return Array.isArray(resp) ? resp : (resp.data ?? [])
    },
    enabled: open && !editingRole,
    staleTime: 10 * 60 * 1000,
  })

  return (
    <FormModal
      title={editingRole ? t('system.roleEditor.editTitle') : t('system.roleEditor.createTitle')}
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      okText={t('system.roleEditor.save')}
      cancelText={t('system.roleEditor.cancel')}
    >
      <Form form={form} layout="vertical">
        {!editingRole && templates.length > 0 ? (
          <Form.Item label={t('system.roleEditor.permTemplate')}>
            <Select
              placeholder={t('system.roleEditor.templatePlaceholder')}
              allowClear
              options={templates.map((t) => ({
                label: `${t.name} — ${t.description}`,
                value: t.name,
              }))}
              onChange={(name) => {
                if (name && onApplyTemplate) onApplyTemplate(asString(name))
              }}
            />
            <Typography.Text type="secondary" className="text-xs">
              {t('system.roleEditor.templateHint')}
            </Typography.Text>
          </Form.Item>
        ) : null}
        <Form.Item name="roleName" label={t('system.roleEditor.roleName')} required>
          <Input placeholder={t('system.roleEditor.roleNamePlaceholder')} maxLength={64} />
        </Form.Item>
        <Form.Item name="roleCode" label={t('system.roleEditor.roleCode')} required>
          <Input
            placeholder={t('system.roleEditor.roleCodePlaceholder')}
            maxLength={64}
            disabled={!!editingRole}
          />
        </Form.Item>
        <Form.Item name="roleType" label={t('system.roleEditor.roleType')}>
          <Select
            options={roleTypeValues.map((value) => ({ label: value, value }))}
          />
        </Form.Item>
        <Form.Item name="dataScope" label={t('system.roleEditor.dataScope')}>
          <Select
            options={roleDataScopeValues.map((value) => ({
              label: value,
              value,
            }))}
          />
        </Form.Item>
        <Form.Item name="remark" label={t('system.roleEditor.remark')}>
          <Input.TextArea placeholder={t('system.roleEditor.remarkPlaceholder')} rows={3} />
        </Form.Item>
      </Form>
    </FormModal>
  )
}
