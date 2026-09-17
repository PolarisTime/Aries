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
  /** 编辑目标；为 null 表示新建。 */
  role: RoleResponse | null
  /** 克隆源：存在时以该角色的信息与权限作为初值，保存为新建角色。 */
  cloneFrom?: RoleResponse | null
  saving: boolean
  onSave: (submit: RoleWizardSubmit) => void
  onClose: () => void
}

/**
 * 角色配置向导：基本信息 → 权限配置。
 * - 新建：创建角色后写入所选权限；
 * - 编辑：更新角色后覆盖权限；
 * - 克隆：以源角色信息/权限为初值，保存为新角色。
 * 调用方通过 key 在每次打开时重挂载本组件，保证步骤/表单初值重置。
 */
export function RoleWizardModal({
  open,
  role,
  cloneFrom = null,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<RoleFormValues>()
  const [current, setCurrent] = useState(0)
  const selectedRef = useRef<string[]>([])
  const permissionsTouchedRef = useRef(false)
  const cloning = Boolean(cloneFrom)
  const builtin = !cloning && Boolean(role?.builtin)
  const sourceRole = cloneFrom ?? role
  const sourceId = sourceRole?.id ?? ''

  const roleQuery = useQuery({
    queryKey: QUERY_KEYS.role(sourceId),
    queryFn: ({ signal }) => getRole(sourceId, signal),
    enabled: open && Boolean(sourceId),
  })

  const wildcard = hasWildcardPermission(roleQuery.data?.permissions ?? [])
  const initialValues: RoleFormValues = cloning
    ? {
        code: `${cloneFrom?.code ?? ''}_copy`,
        name: `${cloneFrom?.name ?? ''}${t('system.role.cloneNameSuffix')}`,
        description: cloneFrom?.description ?? '',
      }
    : role
      ? roleToFormValues(role)
      : emptyRoleFormValues()

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
      id: cloning ? undefined : (role?.id ?? undefined),
      payload: buildRolePayload(values, builtin),
      permissions: effectivePermissions.filter(
        (code) => !isWildcardPermission(code),
      ),
    })
  }

  const permissionsReady = !sourceId || Boolean(roleQuery.data)

  return (
    <Modal
      key={String(open)}
      open={open}
      title={
        cloning
          ? t('system.role.cloneRole')
          : role
            ? t('system.role.editRole')
            : t('system.role.newRole')
      }
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
          <Form form={form} layout="vertical" initialValues={initialValues}>
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
              key={sourceId || 'new'}
              initialSelected={
                sourceId ? (roleQuery.data?.permissions ?? []) : []
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
