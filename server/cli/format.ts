/**
 * 非 --json 模式下的人类可读输出
 */
export function renderTable(headers: string[], rows: any[][]): string {
  if (rows.length === 0) return '(空)';
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)));
  const pad = (s: any, w: number) => String(s ?? '').padEnd(w);
  const line = headers.map((h, i) => pad(h, widths[i])).join('  ');
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  const body = rows.map((r) => r.map((c, i) => pad(c, widths[i])).join('  ')).join('\n');
  return `${line}\n${sep}\n${body}`;
}

export function humanizeResult(cmd: string, data: any): string {
  const cut = (s: string, n = 3000) => (s.length > n ? s.slice(0, n) + '...' : s);

  switch (cmd) {
    case 'conn:list': {
      const list = data.connections || [];
      const lines = list.map((c: any) => {
        const d = c.isDefault ? '*' : ' ';
        return `${d} ${c.name}  [${c.type}]  ${c.host || ''}${c.port ? ':' + c.port : ''}  ${c.database || ''}  ${c.enabled === false ? '(禁用)' : ''}`;
      });
      return lines.length ? `默认连接用 * 标记\n${lines.join('\n')}` : '还没有任何连接';
    }
    case 'conn:current':
      return `当前连接: ${data.name} (${data.type})`;
    case 'db:list': {
      const dbs = data.databases || [];
      return dbs.length ? dbs.map((d: any) => `- ${d}`).join('\n') : '(无数据库)';
    }
    case 'table:list': {
      const tables = data.tables || [];
      const headers = ['name', 'rows', 'size', 'engine', 'comment'];
      const rows = tables.map((t: any) => [t.name, t.rowCount ?? '', t.size ?? '', t.engine ?? '', t.comment ?? '']);
      return `${data.database} 共 ${tables.length} 张表\n${renderTable(headers, rows)}`;
    }
    case 'table:columns': {
      const cols = (data.table && data.table.columns) || data.columns || [];
      const headers = ['name', 'type', 'null', 'key', 'default', 'comment'];
      const rows = cols.map((c: any) => [
        c.name,
        c.type + (c.length ? `(${c.length})` : ''),
        c.nullable === false ? 'NO' : 'YES',
        c.isPrimary ? 'PRI' : c.unique ? 'UNI' : '',
        c.defaultValue ?? '',
        c.comment || ''
      ]);
      return renderTable(headers, rows);
    }
    case 'table:indexes':
    case 'index:list': {
      const list = data.indexes || [];
      return renderTable(['name', 'type', 'columns', 'unique'], list.map((x: any) => [x.name, x.type, (x.columns || []).join(','), x.unique ? 'YES' : 'NO']));
    }
    case 'rows:list':
    case 'rows:get': {
      const rows = data.data || [];
      if (!rows.length) return '(无数据)';
      const headers = Object.keys(rows[0]);
      const body = rows.slice(0, 50).map((r: any) => headers.map((h) => cell(r[h])).join('  '));
      const more = rows.length > 50 ? `\n... 共 ${rows.length} 行，已省略` : '';
      return `${data.table} · ${data.meta ? `${rows.length} 行` : ''}\n${headers.join('  ')}\n${'-'.repeat(40)}\n${body.join('\n')}${more}`;
    }
    case 'rows:count':
      return `${data.table} 符合条件 ${data.count} 行`;
    case 'types':
      return (data.types || []).map((t: any) => `- ${t.type}${t.label ? ' (' + t.label + ')' : ''}${t.experimental ? ' [experimental]' : ''}`).join('\n');
    case 'ops:logs': {
      const logs = data.logs || [];
      return logs.map((l: any) => JSON.stringify(l)).join('\n') || '(无日志)';
    }
    case 'audit': {
      const logs = data.logs || [];
      return logs.map((l: any) => `${l.ts}  ${l.action}  ${l.conn || ''} ${l.database || ''} ${l.table || ''} ${l.ok ? '' : 'FAILED'}${l.error ? ' ' + l.error : ''}`).join('\n') || '(无审计记录)';
    }
    case 'setup':
    case 'config:show':
      return JSON.stringify(data, null, 2);
    case 'export:schema': {
      if (data.schema) return cut(data.schema);
      return `schema 已导出到 ${data.path}`;
    }
    default: {
      if (data && typeof data === 'object' && (data.sql || data.dryRun !== undefined || data.token)) {
        const parts: string[] = [];
        if (data.dryRun) parts.push('(dry-run 预演，未执行)');
        if (data.sql) parts.push(Array.isArray(data.sql) ? data.sql.join('\n') : data.sql);
        if (data.estimatedRows != null) parts.push(`预计影响 ${data.estimatedRows} 行`);
        if (data.token) parts.push(`confirmToken: ${data.token}`);
        if (data.result !== undefined) parts.push('结果: ' + cut(JSON.stringify(data.result)));
        if (data.dryRun) parts.push('\n确认执行请携带: --confirm ' + data.token);
        return parts.join('\n');
      }
      return cut(JSON.stringify(data, null, 2));
    }
  }
}

function cell(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}
