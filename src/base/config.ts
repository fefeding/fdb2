// 基础配置

const state = window.__INITIAL_STATE__ || {};

const config = state.config || {};

const prefix = config.prefix || '';
const apiUrl = config.apiUrl || '';

export default {
    ...config,
    state,
    prefix,
    apiUrl,
    // api的根URL
    baseURL: `${location.origin}` + prefix,
    // xhr的超时时间
    timeout: 3e4,
    logUrl: prefix + '/api/monitor/log',
};
