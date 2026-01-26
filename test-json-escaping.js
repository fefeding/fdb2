// 测试JSON转义功能
const obj = {
  Fields: [
    {
      data: '',
      name: 'code',
      sort: 0,
      type: 'text',
      isHide: false,
      default: '',
      isUnique: true,
      nickName: '错误码',
      sortable: true,
      maxLength: 0,
      isDisabled: false,
      isRequired: true,
      searchType: 0,
      dataChannel: 'config',
      sourceConfig: ''
    },
    {
      data: '',
      name: 'msg',
      sort: 0,
      type: 'json',
      isHide: false,
      default: '{"zh_CN": "简体中文", "zh_HK":"繁体中文","en":"英文"}',
      isUnique: false,
      nickName: '异常信息',
      sortable: false,
      maxLength: 0,
      isDisabled: false,
      isRequired: false,
      searchType: 0,
      dataChannel: 'config',
      sourceConfig: ''
    }
  ]
};

console.log('Testing JSON serialization...');

// 模拟导出函数中的处理逻辑
function escapeForSQL(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  } else if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  } else if (typeof value === 'boolean') {
    return value ? '1' : '0';
  } else if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  } else if (typeof value === 'object') {
    try {
      // 先序列化对象为JSON字符串
      let stringValue = JSON.stringify(value);
      // 对JSON字符串中的单引号进行转义，确保在SQL中正确处理
      stringValue = stringValue.replace(/'/g, "''");
      // 返回用单引号包裹的字符串
      return `'${stringValue}'`;
    } catch {
      return `'${String(value).replace(/'/g, "''")}'`;
    }
  } else {
    return String(value);
  }
}

// 测试序列化和转义
const escapedValue = escapeForSQL(obj);
console.log('Escaped for SQL:', escapedValue);

// 测试从SQL中提取并解析
const extractedValue = escapedValue.replace(/^'|'$/g, '').replace(/''/g, "'");
console.log('Extracted from SQL:', extractedValue);

try {
  const parsedValue = JSON.parse(extractedValue);
  console.log('Parsed successfully:', parsedValue);
  console.log('Test passed!');
} catch (error) {
  console.error('Parsing failed:', error);
  console.log('Test failed!');
}
