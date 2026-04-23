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

export function renderPrintTemplate(
  template: string,
  model: Record<string, unknown>,
  details: Array<Record<string, unknown>>,
) {
  if (!template) {
    return ''
  }

  const normalizedDetails = Array.isArray(details) ? details : []
  let rendered = template
  const { printDate, printTime } = formatNow()

  rendered = rendered.replace(/\{\{#each\s+details\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, rowTemplate: string) =>
    normalizedDetails
      .map((item, index) =>
        rowTemplate.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
          if (key === '_index') {
            return String(index + 1)
          }
          return stringifyValue(item[key])
        }),
      )
      .join(''),
  )

  rendered = rendered.replace(/<!--DETAIL_ROW_START-->([\s\S]*?)<!--DETAIL_ROW_END-->/g, (_, rowTemplate: string) =>
    normalizedDetails
      .map((item, index) =>
        rowTemplate
          .replace(/\{\{_index\}\}/g, String(index + 1))
          .replace(/\{\{detail\.(\w+)\}\}/g, (_: string, key: string) => stringifyValue(item[key])),
      )
      .join(''),
  )

  rendered = rendered
    .replace(/\{\{_printDate\}\}/g, printDate)
    .replace(/\{\{_printTime\}\}/g, printTime)
    .replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => stringifyValue(model[key]))

  return rendered
}
