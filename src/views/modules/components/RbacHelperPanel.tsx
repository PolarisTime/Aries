interface Props {
  roleName?: string
  permissionCount?: number
  userCount?: number
}

export function RbacHelperPanel({ roleName, permissionCount, userCount }: Props) {
  if (!roleName) return null
  return (
    <div className="rbac-helper-panel" style={{ padding: '12px 14px', marginBottom: 12, border: '1px solid #dbe3ee', borderRadius: 8, background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)' }}>
      <div className="rbac-helper-title" style={{ marginBottom: 10, color: '#1f2937', fontWeight: 600, fontSize: 'calc(var(--app-font-size) + 1px)' }}>
        权限概览 — {roleName}
      </div>
      <div className="rbac-helper-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {permissionCount !== undefined && (
          <div className="rbac-helper-item" style={{ padding: '10px 12px', border: '1px solid #e5edf7', borderRadius: 6, background: '#fff' }}>
            <span className="rbac-helper-label" style={{ color: '#64748b', fontSize: 'calc(var(--app-font-size) - 1px)' }}>权限数量</span>
            <strong style={{ color: '#1f2937', fontSize: 'calc(var(--app-font-size) + 4px)' }}>{permissionCount}</strong>
          </div>
        )}
        {userCount !== undefined && (
          <div className="rbac-helper-item" style={{ padding: '10px 12px', border: '1px solid #e5edf7', borderRadius: 6, background: '#fff' }}>
            <span className="rbac-helper-label" style={{ color: '#64748b', fontSize: 'calc(var(--app-font-size) - 1px)' }}>关联用户</span>
            <strong style={{ color: '#1f2937', fontSize: 'calc(var(--app-font-size) + 4px)' }}>{userCount}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
