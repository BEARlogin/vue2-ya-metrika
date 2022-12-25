import config from './config';
import { logger } from './logger';
import { ErrorTypes } from './enums';

export class MetrikaService {
  constructor() {
    this.currentConfig = { ...config };
    this.isScriptInjected = false;
    this.isTracked = false;
  }

  updateConfig(params) {
    Object.keys(params).forEach((key) => { this.currentConfig[key] = params[key]; });
  }

  resetConfig() {
    this.currentConfig = { ...config };
  }

  getConfig() {
    return this.currentConfig;
  }

  getIsScriptInjected() {
    return this.isScriptInjected;
  }

  checkConfig() {
    if (typeof document === 'undefined') {
      return;
    }
    if (!this.currentConfig.id) {
      throw new Error('[vue2-ya-metrika] Please enter a Yandex Metrika tracking ID');
    }
    if (!this.currentConfig.router && this.currentConfig.env !== 'production') {
      logger.warn('Router is not passed, autotracking is disabled');
    }
  }

  loadScript(callback, scriptSrc = this.currentConfig.scriptSrc) {
    this.isScriptInjected = false;

    if (typeof document === 'undefined') { return; }

    if (!this.currentConfig.injectScript || window.Ya?.Metrika2 !== undefined) {
      callback();
      return;
    }

    const head = document.head || document.getElementsByTagName('head')[0];
    const script = document.createElement('script');

    script.async = true;
    script.src = scriptSrc;

    head.appendChild(script);

    script.onload = (callback);

    this.isScriptInjected = true;
  }

  static stubApiCall() {
    logger.warn('You are in development mode. Api calls to Yandex Metrika will not be executed ');
    logger.log(...arguments);
  }

  onError(type) {
    if (typeof this.currentConfig.onError === 'function') {
      this.currentConfig.onError(type);
    }
  }

  resolveMetrika(init) {
    let metrika = {};
    const counterId = `yaCounter${this.currentConfig.id}`;

    if (window[counterId] !== undefined) {
      return window[counterId];
    }

    if (window.Ya?.Metrika2 !== undefined) {
      metrika = new window.Ya.Metrika2(init);
    }

    if (window.Ya?.Metrika2 === undefined) {
      this.onError(ErrorTypes.SCRIPT_NOT_LOADED);
    }

    const obj = this;

    return new Proxy(metrika, {
      get(target, prop) {
        if (obj.currentConfig.debug) {
          logger.log(`Method ${prop} is called`);
        }
        if (obj.currentConfig.env === 'development') {
          return MetrikaService.stubApiCall;
        }
        if (target[prop]) {
          return target[prop];
        }
        return () => {
          logger.warn('Metrika script is not loaded');
        };
      },
    });
  }

  createMetrika(Vue) {
    if (this.currentConfig.debug) { logger.warn('DEBUG is true: you\'ll see all API calls in the console'); }

    // Creates Metrika
    const metrika = this.resolveMetrika({
      id: this.currentConfig.id,
      ...this.currentConfig.options,
    });

    window[`yaCounter${this.currentConfig.id}`] = metrika;

    Vue.prototype.$metrika = metrika;
    Vue.$metrika = metrika;

    return metrika;
  }

  startTracking(metrika) {
    // Starts autotracking if router is passed
    if (this.currentConfig.router && !this.isTracked) {
      this.currentConfig.router.afterEach((to, from) => {
        // check if route is in ignoreRoutes
        if (this.currentConfig.ignoreRoutes.includes(to.name)) {
          return;
        }

        // do not track page visit if previous and next routes URLs match
        if (this.currentConfig.skipSamePath && to.path === from.path) {
          return;
        }
        metrika.hit(to.path, { referer: from.path });
      });
      this.isTracked = true;
    }
  }
}
