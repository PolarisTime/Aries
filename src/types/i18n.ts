export interface MessageSchema {
  validation: {
    default: string
    required: string
    enum: string
    whitespace: string
    date: {
      format: string
      parse: string
      invalid: string
    }
    types: {
      string: string
      method: string
      array: string
      object: string
      number: string
      date: string
      boolean: string
      integer: string
      float: string
      regexp: string
      email: string
      url: string
      hex: string
    }
    string: {
      len: string
      min: string
      max: string
      range: string
    }
    number: {
      len: string
      min: string
      max: string
      range: string
    }
    array: {
      len: string
      min: string
      max: string
      range: string
    }
    pattern: {
      mismatch: string
    }
  }
  dashboard: {
    title: string
    subtitle: string
    cards: {
      currentUser: string
      modules: string
      sessions: string
      lastLogin: string
    }
    notes: {
      currentUser: string
      modules: string
      sessions: string
      lastLogin: string
    }
    sections: {
      overview: string
      signals: string
      interfaceHealth: string
    }
    alerts: {
      title: string
      description: string
      loadFailed: string
    }
    fields: {
      company: string
      role: string
      loginName: string
      mfa: string
      actions: string
      visibleMenus: string
      serverTime: string
      apiState: string
    }
    values: {
      unknown: string
      unconfigured: string
      enabled: string
      disabled: string
      online: string
    }
  }
  common: {
    confirm: string
    cancel: string
    save: string
    delete: string
    edit: string
    create: string
    search: string
    reset: string
    export: string
    import: string
    refresh: string
    submit: string
    back: string
    close: string
    ok: string
    yes: string
    no: string
    more: string
    actions: string
    status: string
    remark: string
    operation: string
    createdAt: string
    updatedAt: string
    keyword: string
    detail: string
    loading: string
    noData: string
    total: string
    selected: string
    pleaseSelect: string
    pleaseInput: string
  }
  auth: {
    login: string
    logout: string
    loginName: string
    password: string
    remember: string
    twoFactorCode: string
    twoFactorTitle: string
    twoFactorHint: string
    loginSuccess: string
    loginFailed: string
    logoutSuccess: string
    sessionExpired: string
    forceTotpSetup: string
    initialSetup: string
    validation: {
      required: string
    }
    error: {
      network: string
      timeout: string
      sessionExpired: string
      forbidden: string
      notFound: string
      serverError: string
      generic: string
    }
  }
  table: {
    create: string
    edit: string
    delete: string
    batchDelete: string
    deleteConfirm: string
    deleteSuccess: string
    saveSuccess: string
    createSuccess: string
    updateSuccess: string
    operationSuccess: string
    operationFailed: string
    noPermission: string
    readOnly: string
  }
  attachment: {
    title: string
    upload: string
    preview: string
    download: string
    delete: string
    uploadSuccess: string
    noPermission: string
    notSupported: string
  }
}
