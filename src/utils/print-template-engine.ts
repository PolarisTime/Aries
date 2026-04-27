function formatNow() {
  const current = new Date()
  const date = [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, '0'),
    String(current.getDate()).padStart(2, '0'),
  ].join('-')
  const time = [
    String(current.getHours()).padStart(2, '0'),
    String(current.getMinutes()).padStart(2, '0'),
    String(current.getSeconds()).padStart(2, '0'),
  ].join(':')
  return {
    printDate: date,
    printTime: `${date} ${time}`,
  }
}

function stringifyValue(value: unknown) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const missingValue = Symbol('missing-print-template-value')

function resolvePath(source: unknown, path: string) {
  if (!path) {
    return source
  }

  const segments = path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let current = source
  for (const segment of segments) {
    if (
      current == null ||
      typeof current !== 'object' ||
      !(segment in current)
    ) {
      return missingValue
    }
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

interface RenderScope {
  model: Record<string, unknown>
  details: Array<Record<string, unknown>>
  current: Record<string, unknown> | null
  index: number
  system: {
    printDate: string
    printTime: string
  }
}

function resolveValue(expression: string, scope: RenderScope) {
  const normalized = expression.trim()
  if (!normalized) {
    return ''
  }

  if (normalized === '_printDate') {
    return scope.system.printDate
  }
  if (normalized === '_printTime') {
    return scope.system.printTime
  }
  if (normalized === '_index' || normalized === '@index') {
    return scope.index >= 0 ? scope.index + 1 : ''
  }

  if (normalized.startsWith('../')) {
    const value = resolvePath(scope.model, normalized.slice(3))
    return value === missingValue ? '' : value
  }

  if (normalized === 'this') {
    return scope.current ?? ''
  }
  if (normalized.startsWith('this.')) {
    const value = resolvePath(scope.current, normalized.slice(5))
    return value === missingValue ? '' : value
  }
  if (normalized.startsWith('detail.')) {
    const value = resolvePath(scope.current, normalized.slice(7))
    return value === missingValue ? '' : value
  }

  if (scope.current) {
    const currentValue = resolvePath(scope.current, normalized)
    if (currentValue !== missingValue) {
      return currentValue
    }
  }

  const modelValue = resolvePath(scope.model, normalized)
  if (modelValue !== missingValue) {
    return modelValue
  }

  return ''
}

function resolveTruthy(expression: string, scope: RenderScope) {
  const value = resolveValue(expression, scope)
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return Boolean(value)
}

function renderSection(template: string, scope: RenderScope): string {
  let rendered = template

  rendered = rendered.replace(
    /\{\{#each\s+details\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, rowTemplate: string) =>
      scope.details
        .map((item, index) =>
          renderSection(rowTemplate, {
            ...scope,
            current: item,
            index,
          }),
        )
        .join(''),
  )

  rendered = rendered.replace(
    /<!--DETAIL_ROW_START-->([\s\S]*?)<!--DETAIL_ROW_END-->/g,
    (_, rowTemplate: string) =>
      scope.details
        .map((item, index) =>
          renderSection(rowTemplate, {
            ...scope,
            current: item,
            index,
          }),
        )
        .join(''),
  )

  rendered = rendered.replace(
    /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, condition: string, block: string) =>
      resolveTruthy(condition, scope) ? renderSection(block, scope) : '',
  )

  rendered = rendered.replace(
    /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, condition: string, block: string) =>
      resolveTruthy(condition, scope) ? '' : renderSection(block, scope),
  )

  rendered = rendered.replace(
    /\{\{\{\s*([^}]+)\s*\}\}\}/g,
    (_: string, expression: string) =>
      stringifyValue(resolveValue(expression, scope)),
  )

  rendered = rendered.replace(
    /\{\{\s*([^#/][^}]*)\s*\}\}/g,
    (_: string, expression: string) =>
      escapeHtml(stringifyValue(resolveValue(expression, scope))),
  )

  return rendered
}

export function renderPrintTemplate(
  template: string,
  model: Record<string, unknown>,
  details: Array<Record<string, unknown>>,
) {
  if (!template) {
    return ''
  }

  const normalizedDetails = Array.isArray(details) ? details : []
  const { printDate, printTime } = formatNow()

  return renderSection(template, {
    model,
    details: normalizedDetails,
    current: null,
    index: -1,
    system: {
      printDate,
      printTime,
    },
  })
}
