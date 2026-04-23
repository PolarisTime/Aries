import type { RouteRecordRaw } from 'vue-router'

const moduleView = () => import('@/views/modules/BusinessGridView.vue')

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      public: true,
      title: '登录',
    },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: {
          title: '工作台',
          menuKey: '/dashboard',
        },
      },
      {
        path: 'materials',
        name: 'materials',
        component: moduleView,
        props: { moduleKey: 'materials' },
        meta: {
          title: '商品资料',
          menuKey: '/materials',
          menuParent: 'master',
        },
      },
      {
        path: 'suppliers',
        name: 'suppliers',
        component: moduleView,
        props: { moduleKey: 'suppliers' },
        meta: {
          title: '供应商资料',
          menuKey: '/suppliers',
          menuParent: 'master',
        },
      },
      {
        path: 'customers',
        name: 'customers',
        component: moduleView,
        props: { moduleKey: 'customers' },
        meta: {
          title: '客户资料',
          menuKey: '/customers',
          menuParent: 'master',
        },
      },
      {
        path: 'carriers',
        name: 'carriers',
        component: moduleView,
        props: { moduleKey: 'carriers' },
        meta: {
          title: '物流方资料',
          menuKey: '/carriers',
          menuParent: 'master',
        },
      },
      {
        path: 'warehouses',
        name: 'warehouses',
        component: moduleView,
        props: { moduleKey: 'warehouses' },
        meta: {
          title: '仓库资料',
          menuKey: '/warehouses',
          menuParent: 'master',
        },
      },
      {
        path: 'purchase-orders',
        name: 'purchase-orders',
        component: moduleView,
        props: { moduleKey: 'purchase-orders' },
        meta: {
          title: '采购订单',
          menuKey: '/purchase-orders',
          menuParent: 'purchase',
        },
      },
      {
        path: 'purchase-inbounds',
        name: 'purchase-inbounds',
        component: moduleView,
        props: { moduleKey: 'purchase-inbounds' },
        meta: {
          title: '采购入库',
          menuKey: '/purchase-inbounds',
          menuParent: 'purchase',
        },
      },
      {
        path: 'sales-orders',
        name: 'sales-orders',
        component: moduleView,
        props: { moduleKey: 'sales-orders' },
        meta: {
          title: '销售订单',
          menuKey: '/sales-orders',
          menuParent: 'sales',
        },
      },
      {
        path: 'sales-outbounds',
        name: 'sales-outbounds',
        component: moduleView,
        props: { moduleKey: 'sales-outbounds' },
        meta: {
          title: '销售出库',
          menuKey: '/sales-outbounds',
          menuParent: 'sales',
        },
      },
      {
        path: 'freight-bills',
        name: 'freight-bills',
        component: moduleView,
        props: { moduleKey: 'freight-bills' },
        meta: {
          title: '物流单',
          menuKey: '/freight-bills',
          menuParent: 'freight',
        },
      },
      {
        path: 'purchase-contracts',
        name: 'purchase-contracts',
        component: moduleView,
        props: { moduleKey: 'purchase-contracts' },
        meta: {
          title: '采购合同',
          menuKey: '/purchase-contracts',
          menuParent: 'contracts',
        },
      },
      {
        path: 'sales-contracts',
        name: 'sales-contracts',
        component: moduleView,
        props: { moduleKey: 'sales-contracts' },
        meta: {
          title: '销售合同',
          menuKey: '/sales-contracts',
          menuParent: 'contracts',
        },
      },
      {
        path: 'inventory-report',
        name: 'inventory-report',
        component: moduleView,
        props: { moduleKey: 'inventory-report' },
        meta: {
          title: '商品库存报表',
          menuKey: '/inventory-report',
          menuParent: 'reports',
        },
      },
      {
        path: 'io-report',
        name: 'io-report',
        component: moduleView,
        props: { moduleKey: 'io-report' },
        meta: {
          title: '出入库报表',
          menuKey: '/io-report',
          menuParent: 'reports',
        },
      },
      {
        path: 'supplier-statements',
        name: 'supplier-statements',
        component: moduleView,
        props: { moduleKey: 'supplier-statements' },
        meta: {
          title: '供应商对账单',
          menuKey: '/supplier-statements',
          menuParent: 'statements',
        },
      },
      {
        path: 'customer-statements',
        name: 'customer-statements',
        component: moduleView,
        props: { moduleKey: 'customer-statements' },
        meta: {
          title: '客户对账单',
          menuKey: '/customer-statements',
          menuParent: 'statements',
        },
      },
      {
        path: 'freight-statements',
        name: 'freight-statements',
        component: moduleView,
        props: { moduleKey: 'freight-statements' },
        meta: {
          title: '物流对账单',
          menuKey: '/freight-statements',
          menuParent: 'statements',
        },
      },
      {
        path: 'receipts',
        name: 'receipts',
        component: moduleView,
        props: { moduleKey: 'receipts' },
        meta: {
          title: '收款单',
          menuKey: '/receipts',
          menuParent: 'finance',
        },
      },
      {
        path: 'payments',
        name: 'payments',
        component: moduleView,
        props: { moduleKey: 'payments' },
        meta: {
          title: '付款单',
          menuKey: '/payments',
          menuParent: 'finance',
        },
      },
      {
        path: 'receivables-payables',
        name: 'receivables-payables',
        component: moduleView,
        props: { moduleKey: 'receivables-payables' },
        meta: {
          title: '应收应付',
          menuKey: '/receivables-payables',
          menuParent: 'finance',
        },
      },
      {
        path: 'print-templates',
        name: 'print-templates',
        component: () => import('@/views/system/PrintTemplateView.vue'),
        meta: {
          title: '打印模板',
          menuKey: '/print-templates',
          menuParent: 'system',
        },
      },
      {
        path: 'general-settings',
        name: 'general-settings',
        component: moduleView,
        props: { moduleKey: 'general-settings' },
        meta: {
          title: '通用设置',
          menuKey: '/general-settings',
          menuParent: 'system',
        },
      },
      {
        path: 'permission-management',
        name: 'permission-management',
        component: moduleView,
        props: { moduleKey: 'permission-management' },
        meta: {
          title: '权限管理',
          menuKey: '/permission-management',
          menuParent: 'system',
        },
      },
      {
        path: 'user-accounts',
        name: 'user-accounts',
        component: moduleView,
        props: { moduleKey: 'user-accounts' },
        meta: {
          title: '用户账户',
          menuKey: '/user-accounts',
          menuParent: 'system',
        },
      },
      {
        path: 'role-settings',
        name: 'role-settings',
        component: moduleView,
        props: { moduleKey: 'role-settings' },
        meta: {
          title: '角色设置',
          menuKey: '/role-settings',
          menuParent: 'system',
        },
      },
      {
        path: 'ops-support',
        name: 'ops-support',
        component: moduleView,
        props: { moduleKey: 'ops-support' },
        meta: {
          title: '运维支持',
          menuKey: '/ops-support',
          menuParent: 'system',
        },
      },
    ],
  },
]
