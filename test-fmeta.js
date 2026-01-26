// 测试从SQL文件中提取的Fmeta字段值
const fmetaValue = '{"Fields":[{"data":"","name":"code","sort":0,"type":"text","isHide":false,"default":"","isUnique":true,"nickName":"错误码","sortable":true,"maxLength":0,"isDisabled":false,"isRequired":true,"searchType":0,"dataChannel":"config","sourceConfig":""},{"data":"","name":"msg","sort":0,"type":"json","isHide":false,"default":"{\"zh_CN\": \"简体中文\", \"zh_HK\":\"繁体中文\",\"en\":\"英文\"}","isUnique":false,"nickName":"异常信息","sortable":false,"maxLength":0,"isDisabled":false,"isRequired":false,"searchType":0,"dataChannel":"config","sourceConfig":""}]}';

console.log('Testing Fmeta JSON...');
console.log('Fmeta value:', fmetaValue);
console.log('Length:', fmetaValue.length);

// 检查位置325附近的内容
if (fmetaValue.length > 325) {
  console.log('Position 325:', fmetaValue.substring(315, 335));
}

try {
  const parsed = JSON.parse(fmetaValue);
  console.log('Parsed successfully:', parsed);
  console.log('Test passed!');
} catch (error) {
  console.error('Parsing failed:', error);
  console.log('Test failed!');
}
