
const routes = [
  {
    path: '/database',
    component: () => import('./layout.vue'),
    redirect: '/database/index',
    meta: {
      title: '数据库管理',
      icon: 'bi-database',
      needAuth: false
    },
    children: [
      {
        path: 'index',
        name: 'database-index',
        component: () => import('./index.vue'),
        meta: {
          title: '数据库管理首页',
          icon: 'bi-house',
          needAuth: false
        }
      },
      {
        path: 'explorer',
        name: 'database-explorer',
        component: () => import('./explorer.vue'),
        meta: {
          title: '数据库浏览器',
          icon: 'bi-diagram-3',
          needAuth: false
        }
      },
    ]
  }
];

export default routes;