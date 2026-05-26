declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{
    }, {}, any>

    export default component
  }

import 'vue-i18n';

declare module 'vue-i18n' {
  export interface DefineLocaleMessage {
    common: Record<string, string>;
    nav: Record<string, string>;
    home: Record<string, string>;
    connection: Record<string, string>;
    explorer: Record<string, string>;
    database: Record<string, string>;
    table: Record<string, string>;
    sql: Record<string, string>;
    about: Record<string, string>;
  }
}