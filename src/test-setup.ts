// 全局测试初始化: 提前初始化 i18n 并固定为 zh-CN, 使模块顶层调用 i18next.t() 的
// 注册表(page-registry / navigation-registry 等)能得到中文标题而非 undefined/英文。
// 需要英文的用例可自行 changeLanguage('en-US') 覆盖。
import i18next from 'i18next'
import '@/i18n'

void i18next.changeLanguage('zh-CN')
