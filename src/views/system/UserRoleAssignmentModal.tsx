import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Form, Modal, Select } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { listRoles } from '@/api/system/roles'
import { getUserRoles, updateUserRoles } from '@/api/system/user-roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import type { UserAccountResponse } from '@/shared/schemas'
import { message } from '@/utils/antd-app'

const ROLE_OPTIONS_PAGE_SIZE = 200

interface RolesFormValues {
  roleIds: string[]
}

interface Props {
  user: UserAccountResponse | null
  onSaved: () => void
  onClose: () => void
}

/**
 * 分配角色浮层：复用 `GET /roles` 选项与 `GET/PUT /users/{id}/roles`。
 *
 * 当账号缺少 `roles:read` 时，`GET /roles` 会返回 403；此时区块优雅降级为
 * 提示信息并禁用保存，避免整页报错崩溃。
 */
export function UserRoleAssignmentModal({ user, onSaved, onClose }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const [form] = Form.useForm<RolesFormValues>()
  const open = Boolean(user)
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

  useEffect(() => {
    if (!open) return
    if (!userRolesQuery.data) return
    form.setFieldsValue({ roleIds: userRolesQuery.data })
  }, [form, open, userRolesQuery.data])

  const saveMutation = useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      updateUserRoles(id, roleIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userRoles(userId),
      })
      message.success(t('system.userAccount.rolesSaved'))
      onSaved()
      onClose()
    },
    onError: (error: Error) =>
      showError(error, t('system.userAccount.rolesSaveFailed')),
  })

  const rolesUnavailable = roleOptionsQuery.isError || userRolesQuery.isError
  const loading = roleOptionsQuery.isPending || userRolesQuery.isPending

  const handleOk = async () => {
    if (rolesUnavailable || !user) return
    const values = await form.validateFields()
    saveMutation.mutate({ id: user.id, roleIds: values.roleIds ?? [] })
  }

  return (
    <Modal
      open={open}
      title={t('system.userAccount.assignRolesTitle', {
        name: user?.userName || user?.loginName || '',
      })}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saveMutation.isPending}
      okButtonProps={{ disabled: rolesUnavailable }}
      onOk={() => {
        void handleOk()
      }}
      onCancel={onClose}
      destroyOnHidden
    >
      {rolesUnavailable ? (
        <Alert
          type="warning"
          showIcon
          title={t('system.userAccount.rolesUnavailable')}
        />
      ) : (
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="roleIds" label={t('system.userAccount.rolesLabel')}>
            <Select
              id="roleIds"
              mode="multiple"
              allowClear
              loading={loading}
              placeholder={t('system.userAccount.rolesPlaceholder')}
              options={(roleOptionsQuery.data?.content ?? []).map((role) => ({
                value: role.id,
                label: `${role.name} (${role.code})`,
              }))}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
