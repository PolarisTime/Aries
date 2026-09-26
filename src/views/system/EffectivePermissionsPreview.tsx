import { useQueries } from '@tanstack/react-query'
import { Alert, Flex, Space, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getRole } from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  getPermissionCodeLabel,
  getResourceLabel,
  isWildcardPermission,
  OTHER_RESOURCE,
  parsePermissionCode,
} from '@/views/system/role-permission-utils'

interface Props {
  /** 参与并集计算的角色 ID 列表。 */
  roleIds: string[]
  /** 是否启用查询（如仅在相关步骤可见时）。 */
  enabled?: boolean
}

interface EffectivePermissionGroup {
  resource: string
  items: { code: string; label: string }[]
}

/**
 * 有效权限预览：实时汇总所选角色的权限并集，按资源分组只读展示。
 * 供用户配置向导判断"该用户最终能做什么"。
 *
 * <p>展示口径与权限矩阵一致：资源名中文化、字段级权限保留「动作·字段」，
 * 因此此处复用 {@link getResourceLabel}/{@link getPermissionCodeLabel}。</p>
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

  const wildcard = effectivePermissions.some(isWildcardPermission)

  const groups = useMemo<EffectivePermissionGroup[]>(() => {
    const map = new Map<string, { code: string; label: string }[]>()
    for (const code of effectivePermissions) {
      if (isWildcardPermission(code)) continue
      const { resource } = parsePermissionCode(code)
      const key = resource || OTHER_RESOURCE
      const items = map.get(key)
      const entry = { code, label: getPermissionCodeLabel(code, t) }
      if (items) {
        items.push(entry)
      } else {
        map.set(key, [entry])
      }
    }
    return [...map.entries()].map(([resource, items]) => ({
      resource,
      items,
    }))
  }, [effectivePermissions, t])

  return (
    <div className="effective-permissions-preview">
      <Typography.Title level={5} style={{ marginBlockEnd: 8 }}>
        {t('system.userAccount.effectivePermissions')}
      </Typography.Title>
      {wildcard ? (
        <Alert
          type="info"
          showIcon
          title={t('system.userAccount.effectivePermissionsWildcard')}
        />
      ) : groups.length === 0 ? (
        <Typography.Text type="secondary">
          {t('system.userAccount.effectivePermissionsEmpty')}
        </Typography.Text>
      ) : (
        <Flex vertical gap={8}>
          {groups.map((group) => (
            <div key={group.resource}>
              <Typography.Text strong>
                {getResourceLabel(group.resource, t)}
              </Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Space wrap size={4}>
                  {group.items.map((item) => (
                    <Tag key={item.code} title={item.code}>
                      {item.label}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          ))}
        </Flex>
      )}
    </div>
  )
}
