import type { MasterFormFieldRenderContext } from './master-data-types'
import { SupplierBrandSpecField } from './SupplierBrandSpecField'
import { brandListOf } from './supplier-brand-spec-model'

/**
 * 供 `MasterFormFieldSpec.render` 使用的适配器：把表单上下文翻译成控件 props。
 *
 * <p>单独一个文件的两个理由：</p>
 * <ol>
 *   <li>`supplier-page-spec.ts` 是纯声明（`.ts`，不写 JSX），需要一个能返回 JSX 的入口；</li>
 *   <li>控件文件只导出组件，Fast Refresh 才能安全保留状态（导出非组件会整页重载）。</li>
 * </ol>
 */
export function renderSupplierBrandSpecField(
  context: MasterFormFieldRenderContext,
) {
  return (
    <SupplierBrandSpecField
      brands={brandListOf(context.values.brands)}
      disabled={context.disabled}
      label={context.label}
      recordId={context.record ? String(context.record.id) : undefined}
    />
  )
}
