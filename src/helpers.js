import config from './config';

let currentConfig = { ...config };
let isScriptInjected = false;
let isTracked = false;

export function updateConfig(params) {
  // Merges default config and plugin options
  Object.keys(params).forEach((key) => { currentConfig[key] = params[key]; });
}

export function resetConfig() {
  currentConfig = { ...config };
}

export function getConfig() {
  return currentConfig;
}

export function getIsScriptInjected() {
  return isScriptInjected;
}

const log = {

  warn(...args) {
    console.warn('[vue-yandex-metrika]', ...args);
  },
  error(...args) {
    console.error('[vue-yandex-metrika]', ...args);
  },
  log(...args) {
    console.log('[vue-yandex-metrika]', ...args);
  },
};

export function checkConfig() {
  // Checks if config is valid
  if (typeof document === 'undefined') { return; }
  if (!currentConfig.id) { throw new Error('[vue-yandex-metrika] Please enter a Yandex Metrika tracking ID'); }
  if (!currentConfig.router && currentConfig.env !== 'production') {
    log.warn('[vue-yandex-metrika] Router is not passed, autotracking is disabled');
  }
}

export function loadScript(callback, scriptSrc = currentConfig.scriptSrc) {
  isScriptInjected = false;

  if (!currentConfig.injectScript || window.Ya?.Metrika2 !== undefined) {
    callback();
    return;
  }

  const head = document.head || document.getElementsByTagName('head')[0];
  const script = document.createElement('script');

  script.async = true;
  script.src = scriptSrc;

  head.appendChild(script);

  script.onload = callback;

  isScriptInjected = true;
}

function resolveMetrika(init) {
  let metrika = {};
  const counterId = `yaCounter${currentConfig.id}`;

  if (window[counterId] !== undefined) {
    return window[counterId];
  }

  if (window.Ya?.Metrika2 !== undefined) {
    metrika = new window.Ya.Metrika2(init);
  }
  return new Proxy(metrika, {
    get(target, prop) {
      if (currentConfig.debug) { log.log(`method ${prop} is called with arguments ${arguments}`); }
      if (target[prop]) {
        return target[prop];
      }
      return () => {
        log.warn('Ya.Metrika2 is not defined');
      };
    },
  });
}

export function createMetrika(Vue) {
  if (currentConfig.debug) { log.warn('DEBUG is true: you\'ll see all API calls in the console'); }

  // Creates Metrika
  const init = {
    id: currentConfig.id,
    ...currentConfig.options,
  };

  const metrika = resolveMetrika(init);
  window[`yaCounter${currentConfig.id}`] = metrika;
  Vue.prototype.$metrika = metrika;
  Vue.$metrika = metrika;

  return metrika;
}

// eslint-disable-next-line consistent-return
export function startTracking(metrika) {
  // Starts autotracking if router is passed

  if (currentConfig.router && !isTracked) {
    currentConfig.router.afterEach((to, from) => {
      // check if route is in ignoreRoutes
      if (currentConfig.ignoreRoutes.includes(to.name)) {
        return;
      }

      // do not track page visit if previous and next routes URLs match
      if (currentConfig.skipSamePath && to.path === from.path) {
        return;
      }

      // track page visit
      metrika.hit(to.path, { referer: from.path });
    });
    isTracked = true;
  }
}
