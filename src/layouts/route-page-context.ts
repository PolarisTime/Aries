import type { TFunction } from 'i18next'
import { appPageDefinitions } from '@/config/page-registry'
import { appTitle } from '@/utils/env'

export interface RoutePageContext {
  activeMenuKey: string
  openPageKey: string
  title: string
}

const pageDefinitionByPath = new Map(
  appPageDefinitions.map(
    (definition) => [normalizePath(definition.menuKey), definition] as const,
  ),
)

function normalizePath(pathname: string) {
  const normalized = String(pathname || '').replace(/\/+$/, '')
  return normalized || '/'
}

export function resolveRoutePageContext(
  pathname: string,
  t: TFunction,
): RoutePageContext {
  const normalizedPath = normalizePath(pathname)
  const matchedDefinition = pageDefinitionByPath.get(normalizedPath)
  if (matchedDefinition) {
    return {
      title: matchedDefinition.title,
      activeMenuKey:
        matchedDefinition.activeMenuKey || matchedDefinition.menuKey,
      openPageKey: matchedDefinition.openPageKey || matchedDefinition.menuKey,
    }
  }

  if (normalizedPath.startsWith('/api-key/')) {
    return {
      title: t('layouts.routePage.apiKeyDetail'),
      activeMenuKey: '/api-key',
      openPageKey: '/api-key',
    }
  }

  return {
    title: appTitle,
    activeMenuKey: normalizedPath,
    openPageKey: normalizedPath,
  }
}
