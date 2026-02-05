import { d as defineComponent, g as getVSCodeBridge, o as onMounted, a as openBlock, c as createElementBlock, b as createBaseVNode, t as toDisplayString, w as withDirectives, v as vModelText, e as vModelSelect, F as Fragment, r as renderList, f as createCommentVNode, h as withModifiers, i as ref, j as reactive, _ as _export_sfc, k as createApp } from "./_plugin-vue_export-helper.js";
const _hoisted_1 = { class: "connection-form" };
const _hoisted_2 = { class: "panel-title" };
const _hoisted_3 = { class: "form-group" };
const _hoisted_4 = { class: "form-group" };
const _hoisted_5 = ["value"];
const _hoisted_6 = {
  key: 0,
  class: "form-row"
};
const _hoisted_7 = { class: "form-col form-group" };
const _hoisted_8 = { class: "form-col form-group" };
const _hoisted_9 = ["id"];
const _hoisted_10 = { class: "form-label" };
const _hoisted_11 = ["placeholder"];
const _hoisted_12 = {
  key: 1,
  class: "form-group"
};
const _hoisted_13 = { class: "form-row" };
const _hoisted_14 = { class: "form-col" };
const _hoisted_15 = { class: "form-col" };
const _hoisted_16 = { class: "form-actions" };
const _hoisted_17 = {
  type: "submit",
  class: "btn btn-primary"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ConnectionPanel",
  setup(__props) {
    const vscode = getVSCodeBridge();
    const isEditMode = ref(false);
    const editingConnection = ref(null);
    const form = reactive({
      name: "",
      type: "mysql",
      host: "localhost",
      port: 3306,
      database: "",
      username: "",
      password: ""
    });
    const databaseTypes = [
      { type: "mysql", name: "MySQL", defaultPort: 3306 },
      { type: "postgresql", name: "PostgreSQL", defaultPort: 5432 },
      { type: "sqlite", name: "SQLite", defaultPort: 0 },
      { type: "sqlserver", name: "SQL Server", defaultPort: 1433 },
      { type: "oracle", name: "Oracle", defaultPort: 1521 }
    ];
    onMounted(() => {
      vscode.onMessage((message) => {
        if (message.command === "editConnection") {
          enterEditMode(message.data);
        } else if (message.command === "testResult") {
          handleTestResult(message.data);
        }
      });
    });
    function enterEditMode(connection) {
      editingConnection.value = connection;
      isEditMode.value = true;
      Object.assign(form, {
        name: connection.name,
        type: connection.type,
        host: connection.host,
        port: connection.port,
        database: connection.database || "",
        username: connection.username || "",
        password: connection.password || ""
      });
    }
    function handleTypeChange() {
      const dbType = databaseTypes.find((db) => db.type === form.type);
      if (dbType && dbType.defaultPort > 0) {
        form.port = dbType.defaultPort;
      }
    }
    function handleSubmit() {
      const connectionData = { ...form };
      if (isEditMode.value && editingConnection.value) {
        connectionData.id = editingConnection.value.id;
        vscode.postMessage({ command: "updateConnection", data: connectionData });
      } else {
        vscode.postMessage({ command: "addConnection", data: connectionData });
      }
    }
    function handleTestConnection() {
      vscode.postMessage({ command: "testConnection", data: { ...form } });
    }
    function handleTestResult(data) {
      if (data.success) {
        alert("连接测试成功");
      } else {
        alert("连接测试失败");
      }
    }
    function handleCancel() {
      vscode.postMessage({ command: "close" });
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("h1", _hoisted_2, toDisplayString(isEditMode.value ? "编辑" : "添加") + "数据库连接", 1),
        createBaseVNode("form", {
          onSubmit: withModifiers(handleSubmit, ["prevent"])
        }, [
          createBaseVNode("div", _hoisted_3, [
            _cache[7] || (_cache[7] = createBaseVNode("label", { class: "form-label" }, "连接名称", -1)),
            withDirectives(createBaseVNode("input", {
              type: "text",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => form.name = $event),
              class: "form-control",
              placeholder: "例如：生产环境 MySQL",
              required: ""
            }, null, 512), [
              [vModelText, form.name]
            ])
          ]),
          createBaseVNode("div", _hoisted_4, [
            _cache[8] || (_cache[8] = createBaseVNode("label", { class: "form-label" }, "数据库类型", -1)),
            withDirectives(createBaseVNode("select", {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.type = $event),
              class: "form-control",
              onChange: handleTypeChange,
              required: ""
            }, [
              (openBlock(), createElementBlock(Fragment, null, renderList(databaseTypes, (db) => {
                return createBaseVNode("option", {
                  key: db.type,
                  value: db.type
                }, toDisplayString(db.name), 9, _hoisted_5);
              }), 64))
            ], 544), [
              [vModelSelect, form.type]
            ])
          ]),
          form.type !== "sqlite" ? (openBlock(), createElementBlock("div", _hoisted_6, [
            createBaseVNode("div", _hoisted_7, [
              _cache[9] || (_cache[9] = createBaseVNode("label", { class: "form-label" }, "主机地址", -1)),
              withDirectives(createBaseVNode("input", {
                type: "text",
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => form.host = $event),
                class: "form-control",
                placeholder: "localhost",
                required: ""
              }, null, 512), [
                [vModelText, form.host]
              ])
            ]),
            createBaseVNode("div", _hoisted_8, [
              _cache[10] || (_cache[10] = createBaseVNode("label", { class: "form-label" }, "端口", -1)),
              withDirectives(createBaseVNode("input", {
                type: "number",
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => form.port = $event),
                class: "form-control",
                placeholder: "3306",
                required: ""
              }, null, 512), [
                [
                  vModelText,
                  form.port,
                  void 0,
                  { number: true }
                ]
              ])
            ])
          ])) : createCommentVNode("", true),
          createBaseVNode("div", {
            class: "form-group",
            id: form.type === "sqlite" ? "sqlite-path" : "database-name"
          }, [
            createBaseVNode("label", _hoisted_10, toDisplayString(form.type === "sqlite" ? "数据库文件路径" : "数据库名称"), 1),
            withDirectives(createBaseVNode("input", {
              type: "text",
              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => form.database = $event),
              class: "form-control",
              placeholder: form.type === "sqlite" ? "/path/to/database.sqlite" : "数据库名称"
            }, null, 8, _hoisted_11), [
              [vModelText, form.database]
            ])
          ], 8, _hoisted_9),
          form.type !== "sqlite" ? (openBlock(), createElementBlock("div", _hoisted_12, [
            createBaseVNode("div", _hoisted_13, [
              createBaseVNode("div", _hoisted_14, [
                _cache[11] || (_cache[11] = createBaseVNode("label", { class: "form-label" }, "用户名", -1)),
                withDirectives(createBaseVNode("input", {
                  type: "text",
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => form.username = $event),
                  class: "form-control",
                  placeholder: "root"
                }, null, 512), [
                  [vModelText, form.username]
                ])
              ]),
              createBaseVNode("div", _hoisted_15, [
                _cache[12] || (_cache[12] = createBaseVNode("label", { class: "form-label" }, "密码", -1)),
                withDirectives(createBaseVNode("input", {
                  type: "password",
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => form.password = $event),
                  class: "form-control",
                  placeholder: "••••••••"
                }, null, 512), [
                  [vModelText, form.password]
                ])
              ])
            ])
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_16, [
            createBaseVNode("button", {
              type: "button",
              onClick: handleTestConnection,
              class: "btn btn-secondary"
            }, " 测试连接 "),
            createBaseVNode("button", {
              type: "button",
              onClick: handleCancel,
              class: "btn btn-secondary"
            }, " 取消 "),
            createBaseVNode("button", _hoisted_17, toDisplayString(isEditMode.value ? "保存" : "添加"), 1)
          ])
        ], 32)
      ]);
    };
  }
});
const ConnectionPanel = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d5bbc9a6"]]);
const app = createApp(ConnectionPanel);
app.mount("#app");
//# sourceMappingURL=connection.js.map
