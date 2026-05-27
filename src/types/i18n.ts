export interface MessageSchema {
  errorBoundary: {
    retry: string
    noPermission: string
    serverBusy: string
    networkError: string
    timeout: string
    serverError: string
  }
  result: {
    '403': {
      subTitle: string
    }
    '404': {
      subTitle: string
    }
    '500': {
      subTitle: string
    }
    success: {
      title: string
    }
    error: {
      title: string
      subTitle: string
    }
    info: {
      title: string
    }
    warning: {
      title: string
    }
    homeButton: string
    backButton: string
  }
  toolbar: {
    searchPlaceholder: string
    refresh: string
    create: string
  }
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
    flow: {
      material: {
        title: string
        hint: string
        metric: string
      }
      supplier: {
        title: string
        hint: string
        metric: string
      }
      customer: {
        title: string
        hint: string
        metric: string
      }
      warehouse: {
        title: string
        hint: string
      }
      purchaseContract: {
        title: string
        hint: string
      }
      purchaseOrder: {
        title: string
        hint: string
      }
      purchaseInbound: {
        title: string
        hint: string
      }
      supplierStatement: {
        title: string
        hint: string
      }
      payment: {
        title: string
        hint: string
      }
      salesContract: {
        title: string
        hint: string
      }
      salesOrder: {
        title: string
        hint: string
      }
      salesOutbound: {
        title: string
        hint: string
      }
      customerStatement: {
        title: string
        hint: string
      }
      receipt: {
        title: string
        hint: string
      }
      carrier: {
        title: string
        hint: string
      }
      freightBill: {
        title: string
        hint: string
      }
      freightStatement: {
        title: string
        hint: string
      }
      loadingDescription: string
    }
    info: {
      userName: string
      loginName: string
      roleName: string
      unassigned: string
      companyName: string
      mfaStatus: string
      lastLogin: string
      accountInfo: string
      systemOverview: string
      activeSessions: string
      actionPermissions: string
    }
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
    confirmLogout: string
    logout: string
    saveSuccess: string
    addSuccess: string
    editSuccess: string
    deleteSuccess: string
    deleteConfirm: string
    columnSettings: string
    saveAndAudit: string
    auditConfirm: string
    confirmLogoutContent: string
    displaySettingsSaved: string
    brandSubtitle: string
    confirmAudit: string
    saveFailed: string
    saveFailedRetry: string
    query: string
    masterData: string
    purchaseChain: string
    salesChain: string
    masterDataDesc: string
    purchaseChainDesc: string
    salesChainDesc: string
    prevPage: string
    nextPage: string
    preallocateNoFailed: string
    generateNoFailed: string
    primaryNoGenerating: string
    noPermission: string
    importParentFailed: string
    logisticsChain: string
    logisticsChainDesc: string
    pleaseSelectWith: string
    importParentSuccess: string
    importParentSuccessSimple: string
    disabled: string
    batchDelete: string
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
    loginview: {
      forceTotpSetupSuccess: string
      codeInvalid: string
      heroSubtitle: string
      backendOnline: string
      backendOffline: string
      setupReady: string
      setupPending: string
    }
    loginform: {
      step: string
      title: string
      description: string
      loginNameLabel: string
      loginNameRequired: string
      loginNamePlaceholder: string
      passwordLabel: string
      passwordRequired: string
      passwordPlaceholder: string
      captchaLabel: string
      captchaRequired: string
      captchaPlaceholder: string
      captchaAlt: string
      captchaRefresh: string
      captchaExpired: string
      remember: string
      submit: string
    }
    totppanel: {
      step: string
      title: string
      description: string
      expired: string
      inputAria: string
      placeholder: string
      submit: string
      back: string
    }
    setup2fa: {
      currentUserFallback: string
      heroTag: string
      heroSubtitle: string
      heroDescription: string
      highlights: {
        scanTitle: string
        scanDescription: string
        secretTitle: string
        secretDescription: string
        effectiveTitle: string
        effectiveDescription: string
      }
      steps: {
        scanTitle: string
        scanDescription: string
        secretTitle: string
        secretDescription: string
        verifyTitle: string
        verifyDescription: string
      }
      content: {
        tag: string
        title: string
        description: string
        regenerate: string
        secretLabel: string
        backupHint: string
        codeLabel: string
        codeRequired: string
        codePlaceholder: string
        submit: string
        loadFailed: string
        retry: string
      }
    }
    twofactormodal: {
      title: string
      codeRequired: string
      verifyFailed: string
      description: string
      placeholder: string
    }
    personalsecurity: {
      accountTitle: string
      enabledDescription: string
      disabledDescription: string
      loginName: string
      currentStatus: string
      enabled: string
      disabled: string
      twoFactor: string
      alreadyEnabled: string
      codeAria: string
      codePlaceholder: string
      enable: string
      generate: string
      currentPassword: string
      currentPasswordRequired: string
      newPassword: string
      newPasswordRequired: string
      passwordHint: string
      updatePassword: string
      passwordSuccess: string
      passwordFailed: string
      setupFailed: string
      codeInvalid: string
      enableSuccess: string
      enableFailed: string
    }
    user2fa: {
      title: string
      enabledTag: string
      disabledTag: string
      userLabel: string
      setupTitle: string
      setupDescription: string
      generate: string
      secretLabel: string
      verifyLabel: string
      verifyPlaceholder: string
      regenerate: string
      enable: string
      statusTitle: string
      statusDescription: string
      disable: string
      loadFailed: string
      generateSuccess: string
      generateFailed: string
      codeInvalid: string
      enableSuccess: string
      enableFailed: string
      disableTitle: string
      disableContent: string
      disableOk: string
      disableSuccess: string
      disableFailed: string
    }
    initialsetup: {
      checking: string
      completedTitle: string
      guideTitle: string
      adminStep: string
      companyStep: string
      defaultAdminUserName: string
      alreadyCompletedRedirect: string
      loadStatusFailed: string
      operationFailed: string
      inputAdminLoginFirst: string
      totpGenerated: string
      passwordMismatch: string
      totpRequired: string
      adminCreateSuccess: string
      companyCreateSuccess: string
      admin: {
        loginNameLabel: string
        loginNameRequired: string
        loginNamePlaceholder: string
        passwordLabel: string
        passwordRequired: string
        passwordPlaceholder: string
        confirmPasswordLabel: string
        confirmPasswordRequired: string
        confirmPasswordPlaceholder: string
        userNameLabel: string
        userNamePlaceholder: string
        generateTotp: string
        regenerateTotp: string
        secretLabel: string
        totpCodeLabel: string
        totpCodeRequired: string
        totpCodePlaceholder: string
        submit: string
      }
      company: {
        adminCreated: string
        companyNameLabel: string
        companyNameRequired: string
        companyNamePlaceholder: string
        taxNoLabel: string
        taxNoRequired: string
        taxNoPlaceholder: string
        bankNameLabel: string
        bankNameRequired: string
        bankNamePlaceholder: string
        bankAccountLabel: string
        bankAccountRequired: string
        bankAccountPlaceholder: string
        taxRateLabel: string
        remarkLabel: string
        back: string
        submit: string
      }
    }
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
      loginFailed: string
      missing2faToken: string
      missingTokenOrUser: string
      verify2faFailed: string
      missing2faResponseTokenOrUser: string
      sessionRestoreFailed: string
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
  api: {
    requestFailed: string
    loadFailed: string
    saveFailed: string
    deleteFailed: string
    updateFailed: string
    createFailed: string
    exportFailed: string
    importFailed: string
    validationFailed: string
    networkError: string
    timeout: string
    unauthorized: string
    forbidden: string
    notFound: string
    serverError: string
    moduleNotConfigured: string
    authServiceUnavailable: string
    backendServiceUnavailable: string
    responseValidationFailed: string
    pageDataValidationFailed: string
    loadPermissionOptionsFailed: string
    loadRolesFailed: string
    loadRolePermissionsFailed: string
    saveRolePermissionsFailed: string
    updateRoleFailed: string
    createRoleFailed: string
    loadMenusFailed: string
    loadSessionsFailed: string
    loadSessionSummaryFailed: string
    disableSessionFailed: string
    clearAllSessionsFailed: string
    loadAccountColumnSettingsFailed: string
    saveAccountColumnSettingsFailed: string
    resultIncomplete: string
    loadSecurityKeyStatusFailed: string
    jwtKeyRotationFailed: string
    twoFactorKeyRotationFailed: string
    loadCompanyInfoFailed: string
    saveCompanyInfoFailed: string
    changePasswordFailed: string
    generate2faQrCodeFailed: string
    enable2faFailed: string
    disable2faFailed: string
    loadSecurityStatusFailed: string
    loadUsersFailed: string
    loadUserDetailFailed: string
    checkLoginNameFailed: string
    createUserFailed: string
    saveUserFailed: string
    deleteUserFailed: string
    loadDepartmentsFailed: string
    loadSearchResultsFailed: string
    loadApiKeyFailed: string
    loadUserOptionsFailed: string
    loadResourceOptionsFailed: string
    generateApiKeyFailed: string
    loadActionOptionsFailed: string
    disableApiKeyFailed: string
    loadApiKeyDetailFailed: string
    getInitStatusFailed: string
    firstInitFailed: string
    generateAdmin2faFailed: string
    adminAccountInitFailed: string
    companyInitFailed: string
    importResponseValidationFailed: string
    loadDatabaseStatusFailed: string
    queryStatementCandidatesFailed: string
    loginExpiring: string
    loginExpiringDescription: string
    refreshLoginStatusFailed: string
    loginStatusExpired: string
  }
  modules: {
    editor: {
      edit: string
      create: string
      title: string
    }
    itemColumns: {
      brand: string
      material: string
      spec: string
      length: string
      quantity: string
      weightTon: string
      unitPrice: string
      amount: string
      warehouseName: string
      sourceNo: string
    }
    units: {
      ton: string
      yuan: string
    }
    nextModule: {
      createPurchaseInbound: string
      createSalesOutbound: string
      createFreightBill: string
    }
    saveResult: {
      success: string
      error: string
      backToEdit: string
      close: string
    }
    statement: {
      supplier: string
      customer: string
      freight: string
      counterpartyNotFound: string
      multipleCounterparties: string
      dateMissing: string
      generateTitle: string
      selectHint: string
      extractError: string
      counterpartyUnit: string
      period: string
      documentCount: string
      documentCountUnit: string
      generated: string
      generateFailed: string
      generateButton: string
      gotIt: string
    }
    weightCell: {
      materialCode: string
      brand: string
      material: string
      spec: string
      length: string
      pieceWeightTon: string
      quantity: string
      weightTon: string
      popoverTitle: string
      noLineItems: string
      loadDetailFailed: string
    }
    detail: {
      titleSuffix: string
      recordDetail: string
      noData: string
      close: string
      print: string
      noDetailItems: string
    }
    attachment: {
      title: string
      upload: string
      uploadHint: string
      noPermissionHint: string
      noPreviewUrl: string
      noDownloadUrl: string
      uploadBindSuccess: string
      uploadFailed: string
      uploadNoId: string
      unbindSuccess: string
      deleteFailed: string
      noAttachments: string
      pdfPreview: string
    }
    filter: {
      selectPlaceholder: string
      inputPlaceholder: string
    }
    formField: {
      inputPlaceholder: string
      selectPlaceholder: string
      inputRequired: string
      selectRequired: string
    }
    pieceWeight: {
      brand: string
      material: string
      spec: string
      length: string
      quantity: string
      detailTitle: string
      detailTitleFallback: string
      loading: string
      noData: string
      ton: string
      relatedOrderNo: string
    }
    print: {
      noTemplate: string
      preview: string
      directPrint: string
      print: string
    }
    itemsPanel: {
      defaultTitle: string
    }
    workspace: {
      closeAria: string
    }
    page: {
      configNotFound: string
      moduleConfigNotFound: string
    }
    itemsSection: {
      addItem: string
      importItems: string
      deleteSelected: string
      emptyTextWithImport: string
      emptyText: string
      parentDoc: string
      selectParent: string
    }
    freightPickup: {
      title: string
      billNo: string
      customer: string
      project: string
      carrier: string
      vehiclePlate: string
      totalWeight: string
      totalFreight: string
    }
  }
  hooks: {
    batchActions: {
      pleaseSelectRecords: string
      noBatchAuditStatus: string
      auditNotSupported: string
      batchAudit: string
      batchAuditConfirm: string
      skippedPart: string
      auditFailed: string
      auditCompletedWithFailures: string
      skippedCount: string
      auditSuccess: string
      deleteNotSupported: string
      batchDelete: string
      batchDeleteConfirm: string
      deleteFailed: string
      deleteCompletedWithFailures: string
      deleteSuccess: string
      noBatchReverseAuditStatus: string
      reverseAuditNotSupported: string
      batchReverseAudit: string
      batchReverseAuditConfirm: string
      reverseAuditFailed: string
      reverseAuditCompletedWithFailures: string
      reverseAuditSuccess: string
      pleaseSelectFreight: string
      batchMarkDelivered: string
      batchMarkDeliveredConfirm: string
      markDeliveredFailed: string
      markDeliveredCompletedWithFailures: string
      markDeliveredSuccess: string
    }
    printActions: {
      selectPrintTemplate: string
      noPrintableRecords: string
      printScriptGenerationFailed: string
      printServiceUnavailable: string
      noPrintContent: string
      printFailed: string
    }
    freightActions: {
      noFreightData: string
      freightSummaryTitle: string
      documentCount: string
      totalWeight: string
      totalFreight: string
      paidAmount: string
      unpaidAmount: string
    }
    toolbarActions: {
      delete: string
      audit: string
      reverseAudit: string
      printPreview: string
      directPrint: string
      noPermission: string
      noExtraLogic: string
    }
    recordActions: {
      view: string
      edit: string
      attachment: string
      audit: string
      reverseAudit: string
    }
    requestError: {
      requestFailed: string
    }
    pagination: {
      total: string
    }
    displaySupport: {
      yes: string
      no: string
    }
    excelExport: {
      exportSuccess: string
      exportFailed: string
    }
    openPages: {
      unnamedPage: string
      workbench: string
    }
    gridColumns: {
      actions: string
    }
    columnSettings: {
      syncRetryLater: string
    }
    statement: {
      noCandidateDocuments: string
    }
    recordHelpers: {
      currentUser: string
    }
  }
  layouts: {
    userMenu: {
      personalSettings: string
      logout: string
    }
    personalSettings: {
      title: string
      displayTab: string
      securityTab: string
    }
    settings: {
      systemFont: string
      systemFontDefault: string
      fontSize: string
      navLayout: string
      themeMode: string
      resetDefault: string
      saveDisplay: string
      theme: {
        light: string
        dark: string
        system: string
      }
      layout: {
        sider: string
        top: string
        siderDesc: string
        topDesc: string
      }
    }
    topNav: {
      serverTime: string
    }
    sideNav: {
      breadcrumbPrefix: string
      apiOnline: string
      apiOffline: string
    }
    headerSearch: {
      placeholder: string
    }
    userInfo: {
      notLoggedIn: string
      currentAccount: string
    }
    routePage: {
      apiKeyDetail: string
    }
  }
  system: {
    company: {
      title: string
      saveSuccess: string
      enterpriseMode: string
      singleEnterprise: string
      subjectStatus: string
      settlementBanks: string
      supplementNote: string
      atLeastOneSettlementAccount: string
      inputAccountName: string
      inputBankName: string
      inputBankAccount: string
      duplicateBankAccount: string
      countUnit: string
      lockedByOobe: string
      noViewPermission: string
      settlementInfo: string
      addBank: string
      settlementAccount: string
      accountName: string
      accountNamePlaceholder: string
      usageType: string
      usageGeneral: string
      usageReceive: string
      usagePay: string
      bankName: string
      bankNamePlaceholder: string
      bankAccount: string
      bankAccountPlaceholder: string
      statusNormal: string
      statusDisabled: string
      remarkPlaceholder: string
      subjectRemarkPlaceholder: string
    }
    session: {
      title: string
      searchPlaceholder: string
      revokeAll: string
      valid: string
      disabled: string
      offline: string
      online: string
      disable: string
      loginIp: string
      deviceInfo: string
      lastActive: string
      expiresAt: string
      onlineStatus: string
      disableConfirm: string
      revokeAllConfirm: string
      revoked: string
    }
    printTemplate: {
      title: string
      newTemplate: string
      editTemplate: string
      deleteTemplate: string
      preview: string
      copy: string
      templateName: string
      billType: string
      isDefault: string
      deleteContent: string
      inputTemplateContent: string
    }
    numberRules: {
      title: string
      searchPlaceholder: string
      documentRules: string
      uploadRules: string
      disabledUploadRules: string
      billName: string
      settingName: string
      prefix: string
      dateRule: string
      serialLength: string
      resetRule: string
      sampleNo: string
      moduleName: string
      renamePattern: string
      sampleFileName: string
      allStatus: string
      editNumberRule: string
      editUploadRule: string
      settingCode: string
      billNameLabel: string
      prefixPlaceholder: string
      sampleNoPrefix: string
      moduleCode: string
      ruleCode: string
      ruleName: string
      renamePatternPlaceholder: string
      sampleFileNamePrefix: string
    }
    userAccount: {
      title: string
      searchPlaceholder: string
      createButton: string
      loginName: string
      userName: string
      department: string
      mobile: string
      roleNames: string
      dataScope: string
      twoFactorStatus: string
      lastLogin: string
      enabled: string
      notEnabled: string
      createSuccess: string
      account: string
      copyAccount: string
      initialPassword: string
      copyPassword: string
      savePasswordHint: string
      deleteTitle: string
      deleteContent: string
      copied: string
      copyFailed: string
    }
    apiKey: {
      title: string
      totpRequiredHint: string
      verifyTotpTitle: string
      generateTitle: string
      userId: string
      keyName: string
      keyNamePlaceholder: string
      usageScope: string
      allowedResources: string
      allowedResourcesPlaceholder: string
      allowedActions: string
      allowedActionsPlaceholder: string
      expireDays: string
      expireDaysPlaceholder: string
      generate: string
      copyKeyHint: string
      searchPlaceholder: string
      filterUserPlaceholder: string
      allStatus: string
      allScope: string
      generateButton: string
    }
    generalSettings: {
      title: string
      searchPlaceholder: string
      basicParams: string
      systemSwitches: string
      currentEnabled: string
      enabled: string
      closed: string
      statusNormal: string
      statusDisabled: string
    }
    database: {
      title: string
      description: string
      refreshStatus: string
    }
    twoFactor: {
      title: string
      enabled: string
      notEnabled: string
      step1: string
      step2: string
      generateQr: string
      confirmEnable: string
      disable: string
      currentStatus: string
    }
    securityKey: {
      title: string
      jwtRotated: string
      totpRotated: string
    }
  }
  finance: {
    projectArDetail: {
      title: string
      projectOverview: string
      projectName: string
      projectNameAbbr: string
      customerCode: string
      customerName: string
      projectAddress: string
      projectStatus: string
      projectManager: string
      contactPerson: string
      completedSalesAmount: string
      prepaymentBalance: string
      unreceivedAmount: string
      netUnreceivedAmount: string
      unreconciledTab: string
      reconciledTab: string
      sourceDocumentNo: string
      documentType: string
      businessDate: string
      amount: string
      writtenOffAmount: string
      unwrittenOffAmount: string
      reconciliationStatus: string
      receiptStatus: string
      operatorName: string
    }
  }
  print: {
    defaultTitle: string
    clodopLicenseInjectFailed: string
    clodopTemplatePrintFailed: string
    clodopPrintFailed: string
    printTimeLabel: string
  }
}
