/** 将路由查询参数编码为可直接传给 navigate.to 的完整 href。 */
export function buildRouterHref(
  pathname: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  ).toString()
  return search ? `${pathname}?${search}` : pathname
}
