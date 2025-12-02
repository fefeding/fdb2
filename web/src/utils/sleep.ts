// 暂停指定时间后再继续执行，默认暂停1000毫秒
const sleep = (time = 1000): Promise<void> => new Promise(rs => setTimeout(rs, time));

export default sleep;