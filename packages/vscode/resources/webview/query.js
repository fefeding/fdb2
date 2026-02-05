import { d as defineComponent, g as getVSCodeBridge, o as onMounted, a as openBlock, c as createElementBlock, b as createBaseVNode, w as withDirectives, e as vModelSelect, F as Fragment, r as renderList, v as vModelText, t as toDisplayString, i as ref, l as computed, _ as _export_sfc, k as createApp } from "./_plugin-vue_export-helper.js";
const _hoisted_1 = { class: "query-panel" };
const _hoisted_2 = { class: "query-toolbar" };
const _hoisted_3 = ["value"];
const _hoisted_4 = { class: "query-editor" };
const _hoisted_5 = { class: "query-results" };
const _hoisted_6 = {
  key: 0,
  class: "loading-state"
};
const _hoisted_7 = {
  key: 1,
  class: "results"
};
const _hoisted_8 = { class: "results-header" };
const _hoisted_9 = { class: "results-meta" };
const _hoisted_10 = { class: "data-table" };
const _hoisted_11 = {
  key: 2,
  class: "empty-state"
};
const _hoisted_12 = { class: "status-bar" };
const _hoisted_13 = { class: "status-item" };
const _hoisted_14 = { class: "status-item" };
const _hoisted_15 = { id: "statusTime" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "QueryPanel",
  setup(__props) {
    const vscode = getVSCodeBridge();
    const connections = ref([]);
    const selectedConnectionId = ref("");
    const queryText = ref("");
    const queryResults = ref(null);
    const loading = ref(false);
    const queryTextarea = ref(null);
    const selectedConnection = computed(() => {
      return connections.value.find((c) => c.id === selectedConnectionId.value);
    });
    onMounted(() => {
      vscode.postMessage({ command: "getConnections" });
      vscode.onMessage((message) => {
        if (message.command === "connections") {
          connections.value = message.data;
        } else if (message.command === "queryResult") {
          displayQueryResult(message.data);
        } else if (message.command === "error") {
          handleError(message.data);
        }
      });
    });
    function handleConnectionChange() {
    }
    function handleKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        executeQuery();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = queryTextarea.value;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          queryText.value = queryText.value.substring(0, start) + "  " + queryText.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }
      }
    }
    function executeQuery() {
      if (!selectedConnectionId.value) {
        alert("请先选择数据库连接");
        return;
      }
      if (!queryText.value.trim()) {
        alert("请输入 SQL 查询语句");
        return;
      }
      loading.value = true;
      vscode.postMessage({
        command: "executeQuery",
        data: {
          connectionId: selectedConnectionId.value,
          sql: queryText.value
        }
      });
    }
    function clearQuery() {
      queryText.value = "";
      queryResults.value = null;
    }
    function displayQueryResult(data) {
      queryResults.value = data;
      loading.value = false;
    }
    function handleError(error) {
      loading.value = false;
      alert(`查询错误: ${error}`);
    }
    function formatCell(cell) {
      if (cell === null || cell === void 0) {
        return "NULL";
      }
      if (typeof cell === "boolean") {
        return cell ? "✓" : "✗";
      }
      if (typeof cell === "object") {
        return JSON.stringify(cell);
      }
      return String(cell);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          withDirectives(createBaseVNode("select", {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedConnectionId.value = $event),
            class: "query-selector",
            onChange: handleConnectionChange
          }, [
            _cache[2] || (_cache[2] = createBaseVNode("option", { value: "" }, "选择数据库连接", -1)),
            (openBlock(true), createElementBlock(Fragment, null, renderList(connections.value, (conn) => {
              return openBlock(), createElementBlock("option", {
                key: conn.id,
                value: conn.id
              }, toDisplayString(conn.name) + " (" + toDisplayString(conn.host) + ":" + toDisplayString(conn.port) + ") ", 9, _hoisted_3);
            }), 128))
          ], 544), [
            [vModelSelect, selectedConnectionId.value]
          ]),
          createBaseVNode("button", {
            onClick: executeQuery,
            class: "btn btn-primary"
          }, " 执行 (Ctrl+Enter) "),
          createBaseVNode("button", {
            onClick: clearQuery,
            class: "btn btn-secondary"
          }, " 清空 ")
        ]),
        createBaseVNode("div", _hoisted_4, [
          withDirectives(createBaseVNode("textarea", {
            ref_key: "queryTextarea",
            ref: queryTextarea,
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => queryText.value = $event),
            class: "query-textarea",
            placeholder: "在此输入 SQL 查询语句...\n\n例如: SELECT * FROM users LIMIT 100",
            onKeydown: handleKeydown
          }, null, 544), [
            [vModelText, queryText.value]
          ])
        ]),
        createBaseVNode("div", _hoisted_5, [
          loading.value ? (openBlock(), createElementBlock("div", _hoisted_6, [..._cache[3] || (_cache[3] = [
            createBaseVNode("div", { class: "spinner" }, null, -1),
            createBaseVNode("span", null, "执行中...", -1)
          ])])) : queryResults.value ? (openBlock(), createElementBlock("div", _hoisted_7, [
            createBaseVNode("div", _hoisted_8, [
              _cache[4] || (_cache[4] = createBaseVNode("div", { class: "results-title" }, "查询结果", -1)),
              createBaseVNode("div", _hoisted_9, toDisplayString(queryResults.value.rowCount) + " 行 · " + toDisplayString(queryResults.value.executionTime) + "ms ", 1)
            ]),
            createBaseVNode("table", _hoisted_10, [
              createBaseVNode("thead", null, [
                createBaseVNode("tr", null, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(queryResults.value.columns, (col) => {
                    return openBlock(), createElementBlock("th", { key: col }, toDisplayString(col), 1);
                  }), 128))
                ])
              ]),
              createBaseVNode("tbody", null, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(queryResults.value.rows, (row, index) => {
                  return openBlock(), createElementBlock("tr", { key: index }, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(row, (cell, cellIndex) => {
                      return openBlock(), createElementBlock("td", { key: cellIndex }, toDisplayString(formatCell(cell)), 1);
                    }), 128))
                  ]);
                }), 128))
              ])
            ])
          ])) : (openBlock(), createElementBlock("div", _hoisted_11, [..._cache[5] || (_cache[5] = [
            createBaseVNode("div", { class: "empty-icon" }, "📊", -1),
            createBaseVNode("div", { class: "empty-text" }, "执行查询后，结果将显示在这里", -1)
          ])]))
        ]),
        createBaseVNode("div", _hoisted_12, [
          createBaseVNode("div", _hoisted_13, [
            _cache[6] || (_cache[6] = createBaseVNode("span", { class: "status-icon" }, "🔗", -1)),
            createBaseVNode("span", null, toDisplayString(selectedConnection.value?.name || "未选择连接"), 1)
          ]),
          createBaseVNode("div", _hoisted_14, [
            createBaseVNode("span", _hoisted_15, toDisplayString(queryResults.value ? `执行时间: ${queryResults.value.executionTime}ms` : ""), 1)
          ])
        ])
      ]);
    };
  }
});
const QueryPanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-eaf4025e"]]);
const app = createApp(QueryPanel);
app.mount("#app");
//# sourceMappingURL=query.js.map
