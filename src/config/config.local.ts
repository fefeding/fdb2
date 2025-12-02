import * as path from 'path';
import devopsConfig from './devops.config';

export default () => {
    const webDir = path.join(__dirname, '../../web/');
    return {
        view: {
            //默认view目录,本地开发目录必须在web下的，正式环境则是根目录下的view，因为web目录会被删
            rootDir: {
                default: path.join(webDir, 'view'),
            },
        },
        typeorm: {
            // dataSource: {
            //     default: {
            //         type: 'mysql',
            //         host: '',
            //         port: 3306,
            //         username: '',
            //         password: '',
            //         database: '',
            //         synchronize: true,
            //         // 或者扫描形式
            //         entities: ['**/model/**/*{.ts,.js}'],
            //     },
            // },
        },
        staticFile: {
            dirs: {
                default: {
                    prefix: `${devopsConfig.prefixUrl}/public`,
                    // 默认public目录
                    dir: path.join(webDir, 'public'),
                },
            },
        },
    };
};
