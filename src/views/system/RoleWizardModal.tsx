import { useQuery } from '@tanstack/react-query'
import { Button, Form, Input, Modal, Skeleton, Space, Steps } from 'antd'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getRole } from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import type {
  RoleFormValues,
  RoleResponse,
  RoleUpdatePayload,
} from '@/shared/schemas'
import { RolePermissionPicker } from '@/views/system/RolePermissionPicker'
import {
  buildRolePayload,
  emptyRoleFormValues,
  roleToFormValues,
} from '@/views/system/role-form-utils'
import {
  hasWildcardPermission,
  isWildcardPermission,
} from '@/views/system/role-permission-utils'

export interface RoleWizardSubmit {
  id?: string
  payload: RoleUpdatePayload
  permissions: string[]
}

interface Props {
  open: boolean
  role: RoleResponse | null
  saving: boolean
  onSave: (submit: RoleWizardSubmit) => void
  onClose: () => void
}

/**
 * 角色配置向导：基本信息 → 权限配置。
 * 新建时先创建角色再写入所选权限；编辑时先更新角色再覆盖权限。
 * 调用方通过 key 在每次打开时重挂载本组件，保证步骤/表单初值重置。
 */
export function RoleWizardModal({
  open,
  role,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<RoleFormValues>()
  const [current, setCurrent] = useState(0)
  const selectedRef = useRef<string[]>([])
  const permissionsTouchedRef = useRef(false)
  const builtin = Boolean(role?.builtin)

  const roleQuery = useQuery({
    queryKey: QUERY_KEYS.role(role?.id ?? ''),
    queryFn: ({ signal }) => getRole(role?.id ?? '', signal),
    enabled: open && Boolean(role?.id),
  })

  const wildcard = hasWildcardPermission(roleQuery.data?.permissions ?? [])

  const goNext = async () => {
    await form.validateFields()
    setCurrent(1)
  }

  const submit = async () => {
    const values = await form.validateFields()
    const effectivePermissions = permissionsTouchedRef.current
      ? selectedRef.current
      : (roleQuery.data?.permissions ?? [])
    onSave({
      id: role?.id,
      payload: buildRolePayload(values, builtin),
      permissions: effectivePermissions.filter(
        (code) => !isWildcardPermission(code),
      ),
    })
  }

  const permissionsReady = !role?.id || Boolean(roleQuery.data)

  return (
    <Modal
      key={String(open)}
      open={open}
      title={role ? t('system.role.editRole') : t('system.role.newRole')}
      width={960}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      mask={{ closable: false }}
    >
      <Steps
        size="small"
        current={current}
        items={[
          { title: t('system.role.wizardStepBasic') },
          { title: t('system.role.wizardStepPermissions') },
        ]}
      />
      <div style={{ marginTop: 16, minHeight: 320 }}>
        <div hidden={current !== 0}>
          <Form
            form={form}
            layout="vertical"
            initialValues={
              role ? roleToFormValues(role) : emptyRoleFormValues()
            }
          >
            <Form.Item
              name="code"
              label={t('system.role.code')}
              tooltip={
                builtin ? t('system.role.builtinCodeReadonly') : undefined
              }
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
        </div>
        <div hidden={current !== 1}>
          {permissionsReady ? (
            <RolePermissionPicker
              key={role?.id ?? 'new'}
              initialSelected={
                role?.id ? (roleQuery.data?.permissions ?? []) : []
              }
              onSelectedChange={(next) => {
                permissionsTouchedRef.current = true
                selectedRef.current = next
              }}
              wildcard={wildcard}
            />
          ) : (
            <Skeleton active paragraph={{ rows: 8 }} />
          )}
        </div>
      </div>
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          {current === 1 ? (
            <Button onClick={() => setCurrent(0)}>
              {t('system.role.wizardPrevious')}
            </Button>
          ) : null}
          {current === 0 ? (
            <Button
              type="primary"
              onClick={() => {
                void goNext()
              }}
            >
              {t('system.role.wizardNext')}
            </Button>
          ) : (
            <Button
              type="primary"
              loading={saving}
              onClick={() => {
                void submit()
              }}
            >
              {t('common.save')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </Space>
      </div>
    </Modal>
  )
}
