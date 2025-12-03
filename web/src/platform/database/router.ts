
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
        path: 'connections',
        name: 'database-connections',
        component: () => import('./connections.vue'),
        meta: {
          title: '数据库连接',
          icon: 'bi-database-add',
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
      {
        path: 'schemas',
        name: 'database-schemas',
        component: () => import('./schemas.vue'),
        meta: {
          title: '数据库结构',
          icon: 'bi-diagram-3',
          needAuth: false
        }
      },
      {
        path: 'query',
        name: 'database-query',
        component: () => import('./query.vue'),
        meta: {
          title: 'SQL查询',
          icon: 'bi-code-slash',
          needAuth: false
        }
      }
    ]
  }
];

export default routes;