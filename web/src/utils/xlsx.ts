// @ts-ignore
import * as xlsx from "xlsx";
import ExcelJS from 'exceljs';

// 读取excel文件内容（支持xls和xlsx）
export async function readExcel(file: Blob): Promise<xlsx.WorkBook> {
    return new Promise(resolve => {
        if (!file) {
            resolve({} as any);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target) {
                resolve({} as any);
                return;
            }
            const data = e.target.result;
            const book = xlsx.read(data, { 
                type: 'binary',
                cellDates: true,
                cellText: false
            });
            resolve(book);
        }
        reader.readAsBinaryString(file);
    });
}

// 文档解成json对象（处理合并单元格）
export function decodeBook(book: xlsx.WorkBook) {
    const result = {
        sheetNames: book.SheetNames || [],
        sheets: []
    } as any;
    if (!book.SheetNames || !book.SheetNames.length) return result;
    for (const name of book.SheetNames) {
        result.sheets.push({
            name,
            data: decodeSheet(book.Sheets[name] as any),
        });
    }
    return result;
}

// 解析单个表（修复合并单元格多行问题）
export function decodeSheet(sheet: xlsx.WorkSheet) {
    const res = {
        cols: {} as any,
        data: [] as any,
    };
    
    // 获取表格范围和合并单元格信息
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const merges = sheet['!merges'] || [];
    
    // 记录哪些行是合并区域的一部分（用于后续去重）
    const mergedRows = new Set<number>();
    
    // 1. 先解析所有单元格数据
    for (const key in sheet) {
        if (!key || typeof key !== 'string' || key.startsWith('!')) continue;
        
        const { r: rowIndex, c: colIndex } = xlsx.utils.decode_cell(key);
        const colKey = xlsx.utils.encode_col(colIndex);
        const cellValue = sheet[key].v || '';
        
        // 处理表头行（第0行）
        if (rowIndex === 0) {
            res.cols[colKey] = cellValue;
        } 
        // 处理数据行
        else {
            const dataRowIndex = rowIndex - 1;
            if (!res.data[dataRowIndex]) {
                res.data[dataRowIndex] = {};
            }
            res.data[dataRowIndex][colKey] = cellValue;
        }
    }
    
    // 2. 处理合并单元格并标记合并行
    merges.forEach((merge: xlsx.Range) => {
        const startRow = merge.s.r;
        const endRow = merge.e.r;
        const startCol = merge.s.c;
        const endCol = merge.e.c;
        
        // 获取合并区域左上角单元格的值作为基准值
        const startCellKey = xlsx.utils.encode_cell({ r: startRow, c: startCol });
        const mergedValue = sheet[startCellKey]?.v || '';
        
        // 填充合并区域内的所有单元格
        for (let r = startRow; r <= endRow; r++) {
            // 标记合并行（除了起始行外的其他行）
            if (r > startRow && startRow > 0) { // 只标记数据行（startRow > 0）
                mergedRows.add(r - 1); // 转换为数据行索引
            }
            
            for (let c = startCol; c <= endCol; c++) {
                const colKey = xlsx.utils.encode_col(c);
                
                if (r === 0) {
                    res.cols[colKey] = mergedValue;
                } else {
                    const dataRowIndex = r - 1;
                    if (!res.data[dataRowIndex]) {
                        res.data[dataRowIndex] = {};
                    }
                    res.data[dataRowIndex][colKey] = mergedValue;
                }
            }
        }
    });
    
    // 3. 移除合并产生的重复行（只保留起始行）
    const filteredData = [] as Array<any>;
    for (let i = 0; i < res.data.length; i++) {
        // 只保留非合并行或合并起始行
        if (!mergedRows.has(i)) {
            filteredData.push(res.data[i]);
        }
    }
    res.data = filteredData;
    
    // 4. 补全空列，确保数据结构完整
    res.data.forEach((row: any) => {
        Object.keys(res.cols).forEach(colKey => {
            if (row[colKey] === undefined) {
                row[colKey] = '';
            }
        });
    });
    
    return res;
}

// 导出excel
/**
 * 导出 Excel 文件（支持表头样式）
 * @param data 数据数组
 * @param headers 字段映射（如 { id: 'ID', name: '姓名' }）
 * @param sheetName 工作表名（默认 'Sheet1'）
 */
export async function exportToExcel(
    data: Array<any>,
    headers: Record<string, string> = {},
    sheetName = 'Sheet1'
  ) {
    // 1. 创建工作簿和工作表
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
  
    // 2. 准备表头和数据行
    const headerKeys = Object.keys(headers);
    const headerLabels = Object.values(headers);
  
    // 3. 添加表头（并设置样式）
    const headerRow = worksheet.addRow(headerLabels);
    
    // 4. 设置表头样式
    headerRow.font = {
      bold: true,
      color: { argb: 'FF000000' } // 白色字体
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' } // 蓝色背景
    };
    headerRow.alignment = { horizontal: 'center' }; // 居中
  
    // 5. 添加数据行
    data.forEach(row => {
      const rowData = headerKeys.map(key => row[key] ?? '');
      const r = worksheet.addRow(rowData);
      // 如果是图片，则插入图片
      for(const key in rowData) {
        const d = rowData[key];
        if(d?.type !== 'image') continue;
        const cellNum = Number(key);
        if(d.data instanceof ArrayBuffer) {
            const id = workbook.addImage({
                buffer: d.data,
                extension: d.ext || 'png',
            })
            worksheet.addImage(id, {
                tl: {
                    col: cellNum,
                    row: r.number - 1,
                },
                ext: {
                    width: 32,
                    height: 32
                }
            })
        }
        else if(d.url) {
            const cell = r.getCell(cellNum + 1);
            cell.value = {
                hyperlink: d.url,
                text: d.text || '查看图片'
            };
            cell.font = { color: { argb: 'FF0000FF' }, underline: true};
        }
      }
    });
  
    // 6. 自动调整列宽
    worksheet.columns.forEach(column => {
      if(column.values) {        
            let maxW = 20;
            column.values.map(v => {
                const w = String(v)?.length || 1;
                maxW = Math.max(maxW, w);
            });
            column.width = maxW;
        }
    });
  
    // 7. 导出 Excel 文件
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  
    return blob;
  }
