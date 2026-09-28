import { defineStore } from 'pinia';

export const useAboutStore = defineStore('about', {
  state: () => ({
    visible: false,
  }),

  actions: {
    open() {
      this.visible = true;
    },

    close() {
      this.visible = false;
    },

    toggle() {
      this.visible = !this.visible;
    },
  },
});
