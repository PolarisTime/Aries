import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Steps,
} from 'antd'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listRoles } from '@/api/system/roles'
import { getUserRoles } from '@/api/system/user-roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import type {
  UserAccountResponse,
  UserFormValues,
  UserUpdatePayload,
} from '@/shared/schemas'
import {
  buildUserCreatePayload,
  buildUserUpdatePayload,
  emptyUserFormValues,
  userToFormValues,
} from '@/views/system/user-account-form-utils'

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
  const roleIdsRef = useRef<string[]>([])
  const rolesTouchedRef = useRef(false)
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

  const statusOptions = [
    { value: 'NORMAL', label: t('system.userAccount.statusNormal') },
    { value: 'DISABLED', label: t('system.userAccount.statusDisabled') },
  ]

  const goNext = async () => {
    await form.validateFields()
    setCurrent(1)
  }

  const submit = async () => {
    const values = await form.validateFields()
    const effectiveRoleIds = rolesTouchedRef.current
      ? roleIdsRef.current
      : user?.id
        ? (userRolesQuery.data ?? [])
        : []
    onSave({
      id: user?.id,
      payload: editing
        ? buildUserUpdatePayload(values)
        : buildUserCreatePayload(values),
      roleIds: rolesUnavailable ? undefined : effectiveRoleIds,
    })
  }

  const roleFormReady = !user?.id || Boolean(userRolesQuery.data)

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
        <div hidden={current !== 0}>
          <Form
            form={form}
            layout="vertical"
            initialValues={
              user ? userToFormValues(user) : emptyUserFormValues()
            }
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
        <div hidden={current !== 1}>
          {rolesUnavailable ? (
            <Alert
              type="warning"
              showIcon
              message={t('system.userAccount.rolesUnavailable')}
            />
          ) : roleFormReady ? (
            <Form
              key={user?.id ?? 'new'}
              form={rolesForm}
              layout="vertical"
              initialValues={{
                roleIds: user?.id ? (userRolesQuery.data ?? []) : [],
              }}
              onValuesChange={(_changed, all) => {
                rolesTouchedRef.current = true
                roleIdsRef.current = all.roleIds ?? []
              }}
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
                  options={(roleOptionsQuery.data?.content ?? []).map(
                    (role) => ({
                      value: role.id,
                      label: `${role.name} (${role.code})`,
                    }),
                  )}
                />
              </Form.Item>
            </Form>
          ) : (
            <Skeleton active paragraph={{ rows: 4 }} />
          )}
        </div>
      </div>
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          {current === 1 ? (
            <Button onClick={() => setCurrent(0)}>
              {t('system.userAccount.wizardPrevious')}
            </Button>
          ) : null}
          {current === 0 ? (
            <Button
              type="primary"
              onClick={() => {
                void goNext()
              }}
            >
              {t('system.userAccount.wizardNext')}
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
