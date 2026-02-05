import { d as defineComponent, g as getVSCodeBridge, o as onMounted, a as openBlock, c as createElementBlock, b as createBaseVNode, w as withDirectives, e as vModelSelect, F as Fragment, r as renderList, t as toDisplayString, n as normalizeClass, m as vShow, f as createCommentVNode, h as withModifiers, i as ref, _ as _export_sfc, k as createApp } from "./_plugin-vue_export-helper.js";
const _hoisted_1 = { class: "database-panel" };
const _hoisted_2 = { style: { "margin-bottom": "20px" } };
const _hoisted_3 = ["value"];
const _hoisted_4 = { id: "contentArea" };
const _hoisted_5 = {
  key: 0,
  class: "loading"
};
const _hoisted_6 = {
  key: 1,
  class: "empty-state"
};
const _hoisted_7 = { key: 2 };
const _hoisted_8 = { class: "tabs" };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = { class: "tab-content active" };
const _hoisted_11 = { class: "database-grid" };
const _hoisted_12 = ["onClick"];
const _hoisted_13 = { class: "database-header" };
const _hoisted_14 = { class: "database-name" };
const _hoisted_15 = { class: "database-info" };
const _hoisted_16 = { class: "database-stat" };
const _hoisted_17 = { class: "database-stat" };
const _hoisted_18 = { class: "tab-content" };
const _hoisted_19 = { class: "database-grid" };
const _hoisted_20 = ["onClick"];
const _hoisted_21 = { class: "database-header" };
const _hoisted_22 = { class: "database-name" };
const _hoisted_23 = { class: "database-info" };
const _hoisted_24 = { class: "database-stat" };
const _hoisted_25 = { class: "database-stat" };
const _hoisted_26 = { class: "tab-content" };
const _hoisted_27 = { class: "table-list" };
const _hoisted_28 = { class: "table-icon" };
const _hoisted_29 = { class: "table-info" };
const _hoisted_30 = { class: "table-name" };
const _hoisted_31 = {
  key: 0,
  class: "table-comment"
};
const _hoisted_32 = {
  key: 1,
  class: "table-meta"
};
const _hoisted_33 = { class: "table-actions" };
const _hoisted_34 = ["onClick"];
const _hoisted_35 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "DatabasePanel",
  setup(__props) {
    const vscode = getVSCodeBridge();
    const connections = ref([]);
    const selectedConnectionId = ref("");
    const databases = ref([]);
    const tables = ref([]);
    const loading = ref(false);
    const currentTab = ref("overview");
    const tabs = [
      { id: "overview", name: "概览" },
      { id: "databases", name: "数据库" },
      { id: "tables", name: "表" }
    ];
    onMounted(() => {
      vscode.postMessage({ command: "getConnections" });
      vscode.onMessage((message) => {
        if (message.command === "connections") {
          connections.value = message.data;
        } else if (message.command === "selectConnection") {
          selectConnection(message.data);
        } else if (message.command === "databases") {
          databases.value = message.data;
          loading.value = false;
        } else if (message.command === "tables") {
          tables.value = message.data;
          loading.value = false;
        } else if (message.command === "error") {
          handleError(message.data);
        }
      });
    });
    function handleAddConnection() {
      vscode.postMessage({ command: "addConnection" });
    }
    function handleConnectionChange() {
      if (selectedConnectionId.value) {
        const connection = connections.value.find((c) => c.id === selectedConnectionId.value);
        selectConnection(connection);
      } else {
        databases.value = [];
        tables.value = [];
      }
    }
    function selectConnection(connection) {
      if (!connection) return;
      selectedConnectionId.value = connection.id;
      loading.value = true;
      vscode.postMessage({
        command: "getDatabases",
        data: { connectionId: connection.id }
      });
    }
    function selectDatabase(database) {
      loading.value = true;
      currentTab.value = "tables";
      vscode.postMessage({
        command: "getTables",
        data: {
          connectionId: selectedConnectionId.value,
          databaseName: database.name
        }
      });
    }
    function handleViewData(table) {
      vscode.postMessage({
        command: "openTableData",
        data: {
          connectionId: selectedConnectionId.value,
          tableName: table.name
        }
      });
    }
    function handleViewStructure(table) {
      vscode.postMessage({
        command: "openTableStructure",
        data: {
          connectionId: selectedConnectionId.value,
          tableName: table.name
        }
      });
    }
    function handleError(error) {
      loading.value = false;
      console.error("Error:", error);
      alert(`操作失败: ${error}`);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", { class: "panel-header" }, [
          _cache[1] || (_cache[1] = createBaseVNode("h1", { class: "panel-title" }, "数据库管理", -1)),
          createBaseVNode("div", { class: "panel-actions" }, [
            createBaseVNode("button", {
              onClick: handleAddConnection,
              class: "btn btn-secondary"
            }, "添加连接")
          ])
        ]),
        createBaseVNode("div", _hoisted_2, [
          withDirectives(createBaseVNode("select", {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedConnectionId.value = $event),
            class: "connection-selector",
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
          ])
        ]),
        createBaseVNode("div", _hoisted_4, [
          loading.value ? (openBlock(), createElementBlock("div", _hoisted_5, [..._cache[3] || (_cache[3] = [
            createBaseVNode("div", { class: "spinner" }, null, -1),
            createBaseVNode("div", null, "加载中...", -1)
          ])])) : !selectedConnectionId.value ? (openBlock(), createElementBlock("div", _hoisted_6, [..._cache[4] || (_cache[4] = [
            createBaseVNode("div", { class: "empty-icon" }, "🗄️", -1),
            createBaseVNode("div", { class: "empty-title" }, "未选择连接", -1),
            createBaseVNode("div", { class: "empty-text" }, "请从下拉列表中选择一个数据库连接", -1)
          ])])) : (openBlock(), createElementBlock("div", _hoisted_7, [
            createBaseVNode("div", _hoisted_8, [
              (openBlock(), createElementBlock(Fragment, null, renderList(tabs, (tab) => {
                return createBaseVNode("button", {
                  key: tab.id,
                  class: normalizeClass(["tab", { active: currentTab.value === tab.id }]),
                  onClick: ($event) => currentTab.value = tab.id
                }, toDisplayString(tab.name), 11, _hoisted_9);
              }), 64))
            ]),
            withDirectives(createBaseVNode("div", _hoisted_10, [
              _cache[6] || (_cache[6] = createBaseVNode("h3", { class: "section-title" }, "数据库概览", -1)),
              createBaseVNode("div", _hoisted_11, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(databases.value, (db) => {
                  return openBlock(), createElementBlock("div", {
                    key: db.name,
                    class: "database-card",
                    onClick: ($event) => selectDatabase(db)
                  }, [
                    createBaseVNode("div", _hoisted_13, [
                      _cache[5] || (_cache[5] = createBaseVNode("div", { class: "database-icon" }, "🗄️", -1)),
                      createBaseVNode("div", _hoisted_14, toDisplayString(db.name), 1)
                    ]),
                    createBaseVNode("div", _hoisted_15, [
                      createBaseVNode("span", _hoisted_16, "📊 " + toDisplayString(db.tables) + " 表", 1),
                      createBaseVNode("span", _hoisted_17, "💾 " + toDisplayString(db.size), 1)
                    ])
                  ], 8, _hoisted_12);
                }), 128))
              ])
            ], 512), [
              [vShow, currentTab.value === "overview"]
            ]),
            withDirectives(createBaseVNode("div", _hoisted_18, [
              _cache[8] || (_cache[8] = createBaseVNode("h3", { class: "section-title" }, "数据库列表", -1)),
              createBaseVNode("div", _hoisted_19, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(databases.value, (db) => {
                  return openBlock(), createElementBlock("div", {
                    key: db.name,
                    class: "database-card",
                    onClick: ($event) => selectDatabase(db)
                  }, [
                    createBaseVNode("div", _hoisted_21, [
                      _cache[7] || (_cache[7] = createBaseVNode("div", { class: "database-icon" }, "🗄️", -1)),
                      createBaseVNode("div", _hoisted_22, toDisplayString(db.name), 1)
                    ]),
                    createBaseVNode("div", _hoisted_23, [
                      createBaseVNode("span", _hoisted_24, "📊 " + toDisplayString(db.tables) + " 表", 1),
                      createBaseVNode("span", _hoisted_25, "💾 " + toDisplayString(db.size), 1)
                    ])
                  ], 8, _hoisted_20);
                }), 128))
              ])
            ], 512), [
              [vShow, currentTab.value === "databases"]
            ]),
            withDirectives(createBaseVNode("div", _hoisted_26, [
              _cache[9] || (_cache[9] = createBaseVNode("h3", { class: "section-title" }, "表列表", -1)),
              createBaseVNode("div", _hoisted_27, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(tables.value, (table) => {
                  return openBlock(), createElementBlock("div", {
                    key: table.name,
                    class: "table-item"
                  }, [
                    createBaseVNode("div", _hoisted_28, toDisplayString(table.type === "table" ? "📋" : "👁️"), 1),
                    createBaseVNode("div", _hoisted_29, [
                      createBaseVNode("div", _hoisted_30, toDisplayString(table.name), 1),
                      table.comment ? (openBlock(), createElementBlock("div", _hoisted_31, toDisplayString(table.comment), 1)) : createCommentVNode("", true),
                      table.rows !== null ? (openBlock(), createElementBlock("div", _hoisted_32, [
                        createBaseVNode("span", null, toDisplayString(table.rows.toLocaleString()) + " 行", 1),
                        createBaseVNode("span", null, toDisplayString(table.engine || ""), 1),
                        createBaseVNode("span", null, toDisplayString(table.size || ""), 1)
                      ])) : createCommentVNode("", true)
                    ]),
                    createBaseVNode("span", {
                      class: normalizeClass(["table-type", table.type])
                    }, toDisplayString(table.type === "table" ? "TABLE" : "VIEW"), 3),
                    createBaseVNode("div", _hoisted_33, [
                      createBaseVNode("button", {
                        class: "action-btn",
                        onClick: withModifiers(($event) => handleViewData(table), ["stop"])
                      }, "数据", 8, _hoisted_34),
                      createBaseVNode("button", {
                        class: "action-btn",
                        onClick: withModifiers(($event) => handleViewStructure(table), ["stop"])
                      }, "结构", 8, _hoisted_35)
                    ])
                  ]);
                }), 128))
              ])
            ], 512), [
              [vShow, currentTab.value === "tables"]
            ])
          ]))
        ])
      ]);
    };
  }
});
const DatabasePanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-974a0a17"]]);
const app = createApp(DatabasePanel);
app.mount("#app");
//# sourceMappingURL=database.js.map
