// 探测运行环境并标记各个全局环境变量
const UA = navigator.userAgent;

// 在iframe中
export const isInIframe = window.top !== window;

// 平台
export enum PLATFORM {
    UNKNOWN = 'unknown',
    WEB = 'web',
    PCWEIXIN = 'pcweixin',
    WEIXIN = 'weixin',
    WEWORK = 'wework',// 企业微信
    MQQ = 'mqq',
    // 微信小程序
    MINA = 'mina',
    // 嵌入iframe中
    IFRAME = 'iframe',
}
export const IS_WINDOWS = /WindowsWechat/i.test(UA);
export const IS_MOBILE = /Mobile/i.test(UA); 
// 系统
export enum SYSTEM {
    UNKNOWN = 'unknown',
    ANDROID = 'android',
    IOS = 'ios',
}

const VER_MQQ = UA.match(/QQ\/([\d.]+)/i) && UA.match(/QQ\/([\d.]+)/i)?.[1];
export const IS_MQQ = Boolean(VER_MQQ);
// 微信版本号可能分4段，影响业务代码里使用semver比较版本号（会报错），如果业务需要4段版本号可以自己从ua里取
const VER_WEIXIN =
    UA.match(/MicroMessenger\/([\d.]+)/i) &&
    UA.match(/MicroMessenger\/([\d.]+)/i)?.[1]?.split('.').slice(0, 3).join('.');
export const IS_WEIXIN = Boolean(VER_WEIXIN);

// 是否是开发者工具
export const IS_WECHATTOOLS = /wechatdevtools\//i.test(UA);
// @ts-ignore
export const IS_WKWEBVIEW = window.__wxjs_is_wkwebview;
export const IS_PCWEIXIN = /(Windows|Mac)Wechat/i.test(UA);
// 是否是企业微信
export const IS_WXWORK = /wxwork\//i.test(UA);
// @ts-ignore
const VER_MINA = window.__wxjs_environment === 'miniprogram' || /miniProgram/i.test(UA);
export const IS_MINA = Boolean(VER_MINA);

let platformVersion = '0.0.0';
let platformID = PLATFORM.WEB;
let platformName = '';
if (IS_MQQ) {
    platformID = PLATFORM.MQQ;
    platformVersion = VER_MQQ as string;
    platformName = '手机QQ';
} else if (IS_MINA) {
    platformID = PLATFORM.MINA;
    platformVersion = VER_WEIXIN || '0.0.0';
    platformName = '微信小程序';
} else if (IS_PCWEIXIN) {
    platformID = PLATFORM.PCWEIXIN;
    platformVersion = VER_WEIXIN as string;
    platformName = '微信';
} else if (IS_WEIXIN) {
    platformID = PLATFORM.WEIXIN;
    platformVersion = VER_WEIXIN || '0.0.0';
    platformName = '微信';
}

const os: { version: string; android: boolean; ios: boolean; iphone: boolean; ipad: boolean; x5: boolean } = {
    version: '0.0.0',
    android: false,
    ios: false,
    iphone: false,
    ipad: false,
    x5: false,
};

const webkit = UA.match(/Web[kK]it[/]{0,1}([\d.]+)/),
    android = UA.match(/(Android);?[\s/]+([\d.]+)?/),
    osx = !!UA.match(/\(Macintosh; Intel /),
    ipad = UA.match(/(iPad).*OS\s([\d_]+)/),
    ipod = UA.match(/(iPod)(.*OS\s([\d_]+))?/),
    iphone = !ipad && UA.match(/(iPhone\sOS)\s([\d_]+)/),
    webos = UA.match(/(webOS|hpwOS)[\s/]([\d.]+)/),
    win = /Win\d{2}|Windows/.test(navigator.platform),
    blackberry = UA.match(/(BlackBerry).*Version\/([\d.]+)/),
    bb10 = UA.match(/(BB10).*Version\/([\d.]+)/),
    playbook = UA.match(/PlayBook/),
    chrome = UA.match(/Chrome\/([\d.]+)/) || UA.match(/CriOS\/([\d.]+)/),
    x5 = UA.match(/MQQBrowser\/([\d.]+)/i),
    ie = UA.match(/MSIE\s([\d.]+)/) || UA.match(/Trident\/[\d](?=[^?]+).*rv:([0-9.].)/),
    webview = !chrome && UA.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/),
    safari = webview || UA.match(/Version\/([\d.]+)([^S](Safari)|[^M]*(Mobile)[^S]*(Safari))/);

if (android) {
    (os.android = true), (os.version = android[2] as string);
}
if (iphone && !ipod) {
    (os.ios = os.iphone = true), (os.version = iphone[2]?.replace(/_/g, '.') as string);
}
if (ipad) {
    (os.ios = os.ipad = true), (os.version = ipad[2]?.replace(/_/g, '.') as string);
}

if (x5) {
    (os.x5 = true), (os.version = x5[1] as string);
}

let system = SYSTEM.UNKNOWN;
if (os.ios) {
    system = SYSTEM.IOS;
} else if (os.android) {
    system = SYSTEM.ANDROID;
}

let IS_IPHONEX = false;
if (os.ios) {
    if (screen.height == 812 && screen.width == 375) {
        IS_IPHONEX = true;
    }
}
export { platformID as platform, platformVersion, platformName };
export { os };
export { system };
export { IS_IPHONEX };
