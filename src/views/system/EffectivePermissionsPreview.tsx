import { useQueries } from '@tanstack/react-query'
import { Alert, Space, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getRole } from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'

interface Props {
  /** 参与并集计算的角色 ID 列表。 */
  roleIds: string[]
  /** 是否启用查询（如仅在相关步骤可见时）。 */
  enabled?: boolean
}

/**
 * 有效权限预览：实时汇总所选角色的权限并集，按资源分组只读展示。
 * 供用户配置向导判断"该用户最终能做什么"。
 */
export function EffectivePermissionsPreview({
  roleIds,
  enabled = true,
}: Props) {
  const { t } = useTranslation()

  const roleDetailQueries = useQueries({
    queries: roleIds.map((id) => ({
      queryKey: QUERY_KEYS.role(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getRole(id, signal),
      enabled,
      staleTime: 60_000,
    })),
  })

  const effectivePermissions = useMemo(() => {
    const set = new Set<string>()
    for (const query of roleDetailQueries) {
      for (const code of query.data?.permissions ?? []) {
        set.add(code)
      }
    }
    return [...set].toSorted()
  }, [roleDetailQueries])

  const wildcard = effectivePermissions.includes('*')

  const groups = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const code of effectivePermissions) {
      if (code === '*') continue
      const [resource, action] = code.split(':')
      const key = resource || 'other'
      const actions = map.get(key)
      if (actions) {
        actions.add(action)
      } else {
        map.set(key, new Set([action]))
      }
    }
    return [...map.entries()].map(([resource, actions]) => ({
      resource,
      actions: [...actions].toSorted(),
    }))
  }, [effectivePermissions])

  return (
    <div style={{ marginTop: 16 }}>
      <Typography.Title level={5}>
        {t('system.userAccount.effectivePermissions')}
      </Typography.Title>
      {wildcard ? (
        <Alert
          type="info"
          showIcon
          message={t('system.userAccount.effectivePermissionsWildcard')}
        />
      ) : groups.length === 0 ? (
        <Typography.Text type="secondary">
          {t('system.userAccount.effectivePermissionsEmpty')}
        </Typography.Text>
      ) : (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {groups.map((group) => (
            <div key={group.resource}>
              <Typography.Text strong>{group.resource}</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Space wrap size={4}>
                  {group.actions.map((action) => (
                    <Tag key={action}>{action}</Tag>
                  ))}
                </Space>
              </div>
            </div>
          ))}
        </Space>
      )}
    </div>
  )
}
