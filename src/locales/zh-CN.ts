const zhCN = {
  validation: {
    default: '字段校验失败',
    required: '请填写{label}',
    enum: '{label}的取值不在允许范围内',
    whitespace: '{label}不能为空',
    date: {
      format: '{label}格式不正确',
      parse: '{label}无法识别为日期',
      invalid: '{label}不是有效日期',
    },
    types: {
      string: '{label}格式不正确',
      method: '{label}格式不正确',
      array: '请选择{label}',
      object: '{label}格式不正确',
      number: '{label}必须为数字',
      date: '{label}不是有效日期',
      boolean: '{label}格式不正确',
      integer: '{label}必须为整数',
      float: '{label}必须为数字',
      regexp: '{label}格式不正确',
      email: '{label}不是有效邮箱',
      url: '{label}不是有效链接',
      hex: '{label}格式不正确',
    },
    string: {
      len: '{label}长度必须为{len}个字符',
      min: '{label}至少{min}个字符',
      max: '{label}最多{max}个字符',
      range: '{label}长度必须在{min}-{max}个字符之间',
    },
    number: {
      len: '{label}必须等于{len}',
      min: '{label}不能小于{min}',
      max: '{label}不能大于{max}',
      range: '{label}必须在{min}-{max}之间',
    },
    array: {
      len: '{label}必须选择{len}项',
      min: '{label}至少选择{min}项',
      max: '{label}最多选择{max}项',
      range: '{label}需选择{min}-{max}项',
    },
    pattern: {
      mismatch: '{label}格式不正确',
    },
  },
  dashboard: {
    title: '系统首页',
    subtitle: '{appTitle} 业务前端，当前界面基于实时接口汇总展示当前账号和系统接入状态。',
    cards: {
      currentUser: '当前账号',
      modules: '可用模块',
      sessions: '我的会话',
      lastLogin: '最近登录',
    },
    notes: {
      currentUser: '显示当前登录账号与角色信息。',
      modules: '按当前账号实时权限统计可访问模块。',
      sessions: '按当前账号的有效 refresh token 会话实时统计。',
      lastLogin: '最近一次成功登录时间。',
    },
    sections: {
      overview: '系统概览',
      signals: '实时信号',
      interfaceHealth: '接口状态',
    },
    alerts: {
      title: '当前重点',
      description: 'Dashboard 已切到真实 API 汇总，后续逐步把更多业务摘要接入同一入口。',
      loadFailed: '工作台摘要加载失败，请稍后重试。',
    },
    fields: {
      company: '公司主体',
      role: '当前角色',
      loginName: '登录账号',
      mfa: '双重验证',
      actions: '授权动作',
      visibleMenus: '可见菜单',
      serverTime: '服务时间',
      apiState: '接口状态',
    },
    values: {
      unknown: '--',
      unconfigured: '未配置',
      enabled: '已启用',
      disabled: '未启用',
      online: '已连通',
    },
  },
} as const

export default zhCN
