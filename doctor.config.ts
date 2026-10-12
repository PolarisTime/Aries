/**
 * React Doctor 扫描配置。
 *
 * - archive/**：仓库规范保留的历史归档（含归档测试），不属于应用构建入口，显式排除扫描。
 * - package.json 的 semantic-release 插件：由 .releaserc.json 与发布流水线在运行时加载，
 *   不通过源码 import 引用，unused-dev-dependency 属误报，对该文件豁免该规则。
 * - ColumnHeaderMenu 的列头触发器：表格标题版式依赖 span 包装（换成原生 button 会破坏既有布局），
 *   键盘与读屏语义已按 APG button 模式手动实现（Enter/Space/Shift+F10 + role/aria），
 *   该文件同时以 biome-ignore 豁免了同类 a11y 规则，属有意为之的例外。
 */
const config = {
  ignore: {
    files: ['archive/**'],
    overrides: [
      {
        files: ['package.json'],
        rules: ['deslop/unused-dev-dependency'],
      },
      {
        files: ['src/components/ColumnHeaderMenu.tsx'],
        rules: ['react-doctor/prefer-tag-over-role'],
      },
    ],
  },
}

export default config
