import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/database',
    component: () => import('./layout.vue'),
    redirect: '/database/index',
    meta: {
      title: '数据库管理',
      icon: 'bi-database',
      needAuth: true
    },
    children: [
      {
        path: 'index',
        name: 'database-index',
        component: () => import('./index.vue'),
        meta: {
          title: '数据库管理首页',
          icon: 'bi-house',
          needAuth: true
        }
      },
      {
        path: 'connections',
        name: 'database-connections',
        component: () => import('./connections.vue'),
        meta: {
          title: '数据库连接',
          icon: 'bi-database-add',
          needAuth: true
        }
      },
      {
        path: 'schemas',
        name: 'database-schemas',
        component: () => import('./schemas.vue'),
        meta: {
          title: '数据库结构',
          icon: 'bi-diagram-3',
          needAuth: true
        }
      },
      {
        path: 'query',
        name: 'database-query',
        component: () => import('./query.vue'),
        meta: {
          title: 'SQL查询',
          icon: 'bi-code-slash',
          needAuth: true
        }
      }
    ]
  }
];

export default routes;