export const STORAGE_KEYS = {
  token: 'aries-token',
  refreshToken: 'aries-refresh-token',
  tokenExpiresAt: 'aries-token-expires-at',
  user: 'aries-user',
  authPersistence: 'aries-auth-persistence',
  personalSettings: 'aries-personal-settings',
  listColumnSettingsPrefix: 'aries-list-column-settings:',
  businessListCachePrefix: 'aries-business-list-cache:',
  layoutTabsPrefix: 'aries-layout-tabs:',
  /** 用户设置同步镜像（按账号隔离，`aries-user-settings:<userKey>`）。 */
  userSettingsPrefix: 'aries-user-settings:',
  /** 同步镜像旧键（未按账号隔离）；首次激活时一次性迁移到新键后删除。 */
  userSettingsLegacyKey: 'aries-user-settings',
} as const
