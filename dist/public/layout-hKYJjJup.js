import { s as defineComponent, v as createElementBlock, A as createBaseVNode, H as createVNode, r as resolveComponent, o as openBlock } from "./vue-BjL5XjkG.js";
import { _ as _export_sfc } from "./index-DsWc6GFG.js";
import "./bootstrap-IS5Me-CY.js";
const _hoisted_1 = { class: "database-layout" };
const _hoisted_2 = { class: "main-content-modern" };
const _hoisted_3 = { class: "content-wrapper" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "layout",
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_router_view = resolveComponent("router-view");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("main", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createVNode(_component_router_view)
          ])
        ])
      ]);
    };
  }
});
const layout = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-db2714e7"]]);
export {
  layout as default
};
