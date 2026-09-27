/**
 * 提货清单明细行/分组头的右键菜单定义。
 *
 * <p>行菜单的类型、Context 与输入控件放行守卫已收敛到共享模块
 * `@/components/row-context-menu`, 这里只做别名导出, 让提货清单保持自己的命名。</p>
 */
export {
  preserveNativeContextMenuOnInputs,
  type RowContextMenuConfig as PickupRowMenu,
  RowContextMenuContext as PickupRowMenuContext,
  type RowContextMenuMap as PickupRowMenuMap,
} from '@/components/row-context-menu'
