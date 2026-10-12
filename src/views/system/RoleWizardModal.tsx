import { useQuery } from '@tanstack/react-query'
import { Form, Input, Modal, Skeleton, Steps } from 'antd'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getRole } from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { RoleFormValues, RoleResponse } from '@/shared/schemas'
import { RolePermissionPicker } from '@/views/system/RolePermissionPicker'
import { hasWildcardPermission } from '@/views/system/role-permission-utils'
import {
  buildRoleWizardInitialValues,
  buildRoleWizardSubmit,
  type RoleWizardSubmit,
  resolveRoleWizardSourceId,
  resolveRoleWizardTitleKey,
} from '@/views/system/role-wizard-model'
import { WizardFooterActions } from './wizard-footer-actions'

export type { RoleWizardSubmit }

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
  const sourceId = resolveRoleWizardSourceId(role, cloneFrom)
  const initialValues = buildRoleWizardInitialValues({
    cloning,
    role,
    cloneFrom,
    t,
  })

  const roleQuery = useQuery({
    queryKey: QUERY_KEYS.role(sourceId),
    queryFn: ({ signal }) => getRole(sourceId, signal),
    enabled: open && Boolean(sourceId),
  })

  const wildcard = hasWildcardPermission(roleQuery.data?.permissions ?? [])

  const goNext = async () => {
    await form.validateFields()
    setCurrent(1)
  }

  const submit = async () => {
    const values = await form.validateFields()
    onSave(
      buildRoleWizardSubmit({
        cloning,
        roleId: role?.id,
        builtin,
        values,
        permissionsTouched: permissionsTouchedRef.current,
        selectedPermissions: selectedRef.current,
        rolePermissions: roleQuery.data?.permissions,
      }),
    )
  }

  const handlePermissionsChange = (next: string[]) => {
    permissionsTouchedRef.current = true
    selectedRef.current = next
  }

  return (
    <Modal
      key={String(open)}
      open={open}
      title={t(resolveRoleWizardTitleKey(cloning, Boolean(role)))}
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
          <RoleWizardPermissionsStep
            sourceId={sourceId}
            permissions={roleQuery.data?.permissions}
            wildcard={wildcard}
            onSelectedChange={handlePermissionsChange}
          />
        </div>
      </div>
      <WizardFooterActions
        current={current}
        saving={saving}
        previousLabel={t('system.role.wizardPrevious')}
        nextLabel={t('system.role.wizardNext')}
        onPrevious={() => setCurrent(0)}
        onNext={() => {
          void goNext()
        }}
        onSubmit={() => {
          void submit()
        }}
        onClose={onClose}
      />
    </Modal>
  )
}

/**
 * 权限步骤：来源角色的权限还没加载完时先占位，
 * 避免用空权限渲染出"这个角色没有任何权限"的假象。
 */
function RoleWizardPermissionsStep({
  sourceId,
  permissions,
  wildcard,
  onSelectedChange,
}: {
  sourceId: string
  permissions: string[] | undefined
  wildcard: boolean
  onSelectedChange: (permissions: string[]) => void
}) {
  if (sourceId && permissions === undefined) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }
  return (
    <RolePermissionPicker
      key={sourceId || 'new'}
      initialSelected={permissions ?? []}
      onSelectedChange={onSelectedChange}
      wildcard={wildcard}
    />
  )
}

/** 向导页脚：上一步 / 下一步 / 保存 / 取消。 */
