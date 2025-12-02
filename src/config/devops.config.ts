
import {utils} from '@cicctencent/midwayjs-base';

utils.loadEnv();

const PREFIX =  process.env.PREFIX || '';
export default {
    prefix: PREFIX,
    prefixUrl: PREFIX ? `/${PREFIX}` : '',
    siteTitle: process.env.TITLE || '系统',
};
