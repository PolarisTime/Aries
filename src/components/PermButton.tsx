import { Button, type ButtonProps } from 'antd'
import { usePermissionStore } from '@/stores/permissionStore'

interface PermButtonProps extends ButtonProps {
  resource: string
  action: string
  permissionStoreOverride?: { can: (resource: string, action: string) => boolean }
}

export function PermButton({
  resource,
  action,
  permissionStoreOverride,
  children,
  ...buttonProps
}: PermButtonProps) {
  const can = permissionStoreOverride?.can || usePermissionStore((s) => s.can)

  if (!can(resource, action)) {
    return null
  }

  return <Button {...buttonProps}>{children}</Button>
}
