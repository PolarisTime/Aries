import { appTitle } from '@/utils/env'
import { appPageDefinitions } from '@/config/page-registry'

export interface RoutePageContext {
  activeMenuKey: string
  openPageKey: string
  title: string
}

const pageDefinitionByPath = new Map(
  appPageDefinitions.map((definition) => [
    normalizePath(definition.menuKey),
    definition,
  ] as const),
)

function normalizePath(pathname: string) {
  const normalized = String(pathname || '').replace(/\/+$/, '')
  return normalized || '/'
}

export function resolveRoutePageContext(pathname: string): RoutePageContext {
  const normalizedPath = normalizePath(pathname)
  const matchedDefinition = pageDefinitionByPath.get(normalizedPath)
  if (matchedDefinition) {
    return {
      title: matchedDefinition.title,
      activeMenuKey: matchedDefinition.activeMenuKey || matchedDefinition.menuKey,
      openPageKey: matchedDefinition.openPageKey || matchedDefinition.menuKey,
    }
  }

  if (normalizedPath.startsWith('/api-key-management/')) {
    return {
      title: 'API Key 详情',
      activeMenuKey: '/api-key-management',
      openPageKey: '/api-key-management',
    }
  }

  return {
    title: appTitle,
    activeMenuKey: normalizedPath,
    openPageKey: normalizedPath,
  }
}
