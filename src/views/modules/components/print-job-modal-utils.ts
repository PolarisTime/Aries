export function reorderPrintItemIds(
  order: string[],
  activeId: string,
  overId: string,
) {
  const oldIndex = order.indexOf(activeId)
  const newIndex = order.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return order
  }

  const next = [...order]
  next.splice(oldIndex, 1)
  next.splice(newIndex, 0, activeId)
  return next
}
