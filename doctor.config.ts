/**
 * React Doctor 扫描配置。
 *
 * - archive/**：仓库规范保留的历史归档（含归档测试），不属于应用构建入口，显式排除扫描。
 * - package.json 的 semantic-release 插件：由 .releaserc.json 与发布流水线在运行时加载，
 *   不通过源码 import 引用，unused-dev-dependency 属误报，对该文件豁免该规则。
 */
const config = {
  ignore: {
    files: ['archive/**'],
    overrides: [
      {
        files: ['package.json'],
        rules: ['deslop/unused-dev-dependency'],
      },
    ],
  },
}

export default config
