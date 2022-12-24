import Vue from "vue";

import App from "./App.vue";
import router from "./router";

import "./assets/main.css";
import VueYandexMetrika from "vue2-ya-metrika";

Vue.use(VueYandexMetrika, {
  id: "91831011",
  router,
  env: "production",
  debug: true,
});

new Vue({
  router,
  render: (h) => h(App),
}).$mount("#app");
