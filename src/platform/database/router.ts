
const routes = [
  {
    path: '/database',
    component: () => import('./layout.vue'),
    redirect: '/database/index',
    meta: {
      titleKey: 'nav.databaseManagement',
      icon: 'bi-database',
      needAuth: false
    },
    children: [
      {
        path: 'index',
        name: 'database-index',
        component: () => import('./explorer.vue'),
        meta: {
          titleKey: 'nav.databaseHome',
          icon: 'bi-house',
          needAuth: false
        }
      },
      {
        path: 'explorer',
        name: 'database-explorer',
        component: () => import('./explorer.vue'),
        meta: {
          titleKey: 'nav.databaseExplorer',
          icon: 'bi-diagram-3',
          needAuth: false
        }
      },
    ]
  }
];

export default routes;