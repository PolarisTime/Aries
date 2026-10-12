import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Form,
  type FormInstance,
  Input,
  Modal,
  Select,
  Skeleton,
  Steps,
} from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listRoles } from '@/api/system/roles'
import { getUserRoles } from '@/api/system/user-roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import type {
  UserAccountResponse,
  UserFormValues,
  UserUpdatePayload,
} from '@/shared/schemas'
import { EffectivePermissionsPreview } from '@/views/system/EffectivePermissionsPreview'
import {
  buildUserCreatePayload,
  buildUserUpdatePayload,
  emptyUserFormValues,
  userToFormValues,
} from '@/views/system/user-account-form-utils'
import { WizardFooterActions } from './wizard-footer-actions'

const ROLE_OPTIONS_PAGE_SIZE = 200

interface RolesFormValues {
  roleIds: string[]
}

export interface UserWizardSubmit {
  id?: string
  payload: UserUpdatePayload
  roleIds?: string[]
}

interface Props {
  open: boolean
  user: UserAccountResponse | null
  saving: boolean
  onSave: (submit: UserWizardSubmit) => void
  onClose: () => void
}

/** 提交载荷：新建走创建 DTO, 编辑走更新 DTO。 */
function buildUserPayload(
  values: UserFormValues,
  editing: boolean,
): UserUpdatePayload {
  return editing
    ? buildUserUpdatePayload(values)
    : buildUserCreatePayload(values)
}

/**
 * 实际生效的角色：角色步骤被改过就用当前选择, 否则沿用已保存角色(新建为空数组)。
 * 抽成组件外的纯函数, 视图层的分支才不会堆在同一个组件里。
 */
function resolveEffectiveRoleIds(
  rolesTouched: boolean,
  roleIds: string[],
  savedRoleIds: string[],
  hasUser: boolean,
): string[] {
  if (rolesTouched) return roleIds
  return hasUser ? savedRoleIds : []
}

/** 向导第一步：基本信息表单(新建时可填密码, 编辑时账号只读)。 */
function BasicInfoStep({
  form,
  hidden,
  user,
}: {
  form: FormInstance<UserFormValues>
  hidden: boolean
  user: UserAccountResponse | null
}) {
  const { t } = useTranslation()
  const editing = Boolean(user)
  const statusOptions = [
    { value: 'NORMAL', label: t('system.userAccount.statusNormal') },
    { value: 'DISABLED', label: t('system.userAccount.statusDisabled') },
  ]
  return (
    <div hidden={hidden}>
      <Form
        form={form}
        layout="vertical"
        initialValues={user ? userToFormValues(user) : emptyUserFormValues()}
      >
        <Form.Item
          name="loginName"
          label={t('system.userAccount.loginName')}
          rules={[
            { required: true, whitespace: true },
            { max: 64 },
            { pattern: /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/ },
          ]}
        >
          <Input
            maxLength={64}
            disabled={editing}
            autoComplete="off"
            placeholder={t('system.userAccount.loginNamePlaceholder')}
          />
        </Form.Item>
        <Form.Item
          name="userName"
          label={t('system.userAccount.userName')}
          rules={[{ required: true, whitespace: true }, { max: 64 }]}
        >
          <Input
            maxLength={64}
            placeholder={t('system.userAccount.userNamePlaceholder')}
          />
        </Form.Item>
        {editing ? null : (
          <Form.Item
            name="password"
            label={t('system.userAccount.password')}
            rules={[
              { required: true },
              { min: 8 },
              { max: 128 },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                message: t('system.userAccount.passwordStrength'),
              },
            ]}
          >
            <Input.Password
              maxLength={128}
              autoComplete="new-password"
              placeholder={t('system.userAccount.passwordPlaceholder')}
            />
          </Form.Item>
        )}
        <Form.Item
          name="mobile"
          label={t('system.userAccount.mobile')}
          rules={[{ max: 20 }, { pattern: /^$|^1\d{10}$/ }]}
        >
          <Input
            maxLength={20}
            placeholder={t('system.userAccount.mobilePlaceholder')}
          />
        </Form.Item>
        <Form.Item
          name="status"
          label={t('system.userAccount.status')}
          rules={[{ required: true }]}
        >
          <Select options={statusOptions} />
        </Form.Item>
      </Form>
    </div>
  )
}

/** 向导第二步：角色分配；无 roles:read 权限时降级为提示, 数据未就绪时显示骨架屏。 */
function RolesStep({
  form,
  hidden,
  enabled,
  user,
  savedRoleIds,
  rolesUnavailable,
  rolesLoading,
  roleFormReady,
  roleOptions,
  previewRoleIds,
  onRolesChange,
}: {
  form: FormInstance<RolesFormValues>
  hidden: boolean
  enabled: boolean
  user: UserAccountResponse | null
  savedRoleIds: string[]
  rolesUnavailable: boolean
  rolesLoading: boolean
  roleFormReady: boolean
  roleOptions: { value: string; label: string }[]
  previewRoleIds: string[]
  onRolesChange: (roleIds: string[]) => void
}) {
  const { t } = useTranslation()
  return (
    <div hidden={hidden}>
      {rolesUnavailable ? (
        <Alert
          type="warning"
          showIcon
          title={t('system.userAccount.rolesUnavailable')}
        />
      ) : roleFormReady ? (
        <>
          <Form
            key={user?.id ?? 'new'}
            form={form}
            layout="vertical"
            initialValues={{
              roleIds: user?.id ? savedRoleIds : [],
            }}
            onValuesChange={(_changed, all) => onRolesChange(all.roleIds ?? [])}
          >
            <Form.Item
              name="roleIds"
              label={t('system.userAccount.rolesLabel')}
            >
              <Select
                id="user-wizard-roleIds"
                mode="multiple"
                allowClear
                loading={rolesLoading}
                placeholder={t('system.userAccount.rolesPlaceholder')}
                options={roleOptions}
              />
            </Form.Item>
          </Form>
          <EffectivePermissionsPreview
            roleIds={previewRoleIds}
            enabled={enabled}
          />
        </>
      ) : (
        <Skeleton active paragraph={{ rows: 4 }} />
      )}
    </div>
  )
}

/** 向导底部操作区：上一步 / 下一步 / 保存 / 取消。 */
/**
 * 用户配置向导：基本信息 → 角色分配。
 * 新建时先建号再写入角色；编辑时先更新资料再覆盖角色。
 * 无 `roles:read` 权限时角色步骤优雅降级为提示并跳过角色写入。
 * 调用方通过 key 在每次打开时重挂载本组件，保证步骤/表单初值重置。
 */
export function UserAccountWizardModal({
  open,
  user,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<UserFormValues>()
  const [rolesForm] = Form.useForm<RolesFormValues>()
  const [current, setCurrent] = useState(0)
  const [roleIds, setRoleIds] = useState<string[]>([])
  /*
   * 角色步骤是否被用户改过: 它同时决定权限预览与提交取「当前选择」还是「已保存角色」,
   * 属于渲染要读的状态 —— 用 state 而不是 ref, 避免渲染期访问 ref.current。
   */
  const [rolesTouched, setRolesTouched] = useState(false)
  const editing = Boolean(user)
  const userId = user?.id ?? ''

  const roleOptionsQuery = useQuery({
    queryKey: QUERY_KEYS.roles({
      keyword: '',
      status: undefined,
      page: 0,
      size: ROLE_OPTIONS_PAGE_SIZE,
    }),
    queryFn: ({ signal }) =>
      listRoles({ page: 0, size: ROLE_OPTIONS_PAGE_SIZE }, signal),
    enabled: open,
    retry: false,
  })

  const userRolesQuery = useQuery({
    queryKey: QUERY_KEYS.userRoles(userId),
    queryFn: ({ signal }) => getUserRoles(userId, signal),
    enabled: open && Boolean(userId),
    retry: false,
  })

  const rolesUnavailable = roleOptionsQuery.isError || userRolesQuery.isError
  const rolesLoading = roleOptionsQuery.isPending || userRolesQuery.isPending

  // 有效权限预览与提交共用的角色来源（编辑态未改动时取已保存角色）。
  const savedRoleIds = userRolesQuery.data ?? []
  const effectiveRoleIds = resolveEffectiveRoleIds(
    rolesTouched,
    roleIds,
    savedRoleIds,
    Boolean(user?.id),
  )

  const goNext = async () => {
    await form.validateFields()
    setCurrent(1)
  }

  const submit = async () => {
    const values = await form.validateFields()
    onSave({
      id: user?.id,
      payload: buildUserPayload(values, editing),
      roleIds: rolesUnavailable ? undefined : effectiveRoleIds,
    })
  }

  const roleFormReady = !user?.id || Boolean(userRolesQuery.data)
  const roleOptions = (roleOptionsQuery.data?.content ?? []).map((role) => ({
    value: role.id,
    label: `${role.name} (${role.code})`,
  }))

  return (
    <Modal
      key={String(open)}
      open={open}
      title={
        editing
          ? t('system.userAccount.editUser')
          : t('system.userAccount.newUser')
      }
      width={720}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      mask={{ closable: false }}
    >
      <Steps
        size="small"
        current={current}
        items={[
          { title: t('system.userAccount.wizardStepBasic') },
          { title: t('system.userAccount.wizardStepRoles') },
        ]}
      />
      <div style={{ marginTop: 16, minHeight: 300 }}>
        <BasicInfoStep form={form} hidden={current !== 0} user={user} />
        <RolesStep
          form={rolesForm}
          hidden={current !== 1}
          enabled={open && current === 1}
          user={user}
          savedRoleIds={savedRoleIds}
          rolesUnavailable={rolesUnavailable}
          rolesLoading={rolesLoading}
          roleFormReady={roleFormReady}
          roleOptions={roleOptions}
          previewRoleIds={effectiveRoleIds}
          onRolesChange={(nextRoleIds) => {
            setRolesTouched(true)
            setRoleIds(nextRoleIds)
          }}
        />
      </div>
      <WizardFooterActions
        current={current}
        saving={saving}
        previousLabel={t('system.userAccount.wizardPrevious')}
        nextLabel={t('system.userAccount.wizardNext')}
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
