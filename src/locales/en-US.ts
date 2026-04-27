const enUS = {
  validation: {
    default: 'Validation failed',
    required: 'Please enter {label}',
    enum: '{label} is out of range',
    whitespace: '{label} cannot be empty',
    date: {
      format: '{label} has an invalid format',
      parse: '{label} could not be parsed as a date',
      invalid: '{label} is not a valid date',
    },
    types: {
      string: '{label} has an invalid format',
      method: '{label} has an invalid format',
      array: 'Please select {label}',
      object: '{label} has an invalid format',
      number: '{label} must be a number',
      date: '{label} is not a valid date',
      boolean: '{label} has an invalid format',
      integer: '{label} must be an integer',
      float: '{label} must be a number',
      regexp: '{label} has an invalid format',
      email: '{label} is not a valid email',
      url: '{label} is not a valid URL',
      hex: '{label} has an invalid format',
    },
    string: {
      len: '{label} must be {len} characters',
      min: '{label} must be at least {min} characters',
      max: '{label} must be at most {max} characters',
      range: '{label} must be between {min} and {max} characters',
    },
    number: {
      len: '{label} must equal {len}',
      min: '{label} cannot be less than {min}',
      max: '{label} cannot be greater than {max}',
      range: '{label} must be between {min} and {max}',
    },
    array: {
      len: '{label} must have {len} item(s)',
      min: '{label} must have at least {min} item(s)',
      max: '{label} must have at most {max} item(s)',
      range: '{label} must have between {min} and {max} item(s)',
    },
    pattern: {
      mismatch: '{label} has an invalid format',
    },
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: '{appTitle} now shows the current account and system linkage through a live API summary.',
    cards: {
      currentUser: 'Current User',
      modules: 'Available Modules',
      sessions: 'My Sessions',
      lastLogin: 'Last Login',
    },
    notes: {
      currentUser: 'Shows the signed-in account and role.',
      modules: 'Counts accessible modules from current permissions.',
      sessions: 'Real-time active refresh-token sessions for the current account.',
      lastLogin: 'Latest successful login time.',
    },
    sections: {
      overview: 'Overview',
      signals: 'Live Signals',
      interfaceHealth: 'API Status',
    },
    alerts: {
      title: 'Current Focus',
      description: 'The dashboard now uses a real summary API, and more business snapshots will be added here next.',
      loadFailed: 'Failed to load dashboard summary. Please try again later.',
    },
    fields: {
      company: 'Company',
      role: 'Role',
      loginName: 'Login',
      mfa: 'Two-Factor Auth',
      actions: 'Granted Actions',
      visibleMenus: 'Visible Menus',
      serverTime: 'Server Time',
      apiState: 'API Status',
    },
    values: {
      unknown: '--',
      unconfigured: 'Not configured',
      enabled: 'Enabled',
      disabled: 'Disabled',
      online: 'Connected',
    },
  },
} as const

export default enUS
