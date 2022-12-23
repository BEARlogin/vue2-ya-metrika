import Vue from 'vue';
import VueRouter from 'vue-router';
import VueYandexMetrika from '../index';
import * as helpers from '../helpers';
import {
  getConfig, getIsScriptInjected, loadScript, resetConfig,
} from '../helpers';

Vue.use(VueRouter);

const routes = [
  { name: 'main', path: '/init', component: { render: (h) => h('div') } },
  { name: 'test', path: '/test', component: { render: (h) => h('div') } },
];
const router = new VueRouter({ mode: 'hash', routes });

// Yandex Metrika mock
global.Ya = {
  Metrika2: function Metrika2() {
    return {
      hit: jest.fn(),
    };
  },
};

describe('checkConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if the Metrika id is missing', () => {
    expect(() => {
      Vue.use(VueYandexMetrika, {});
    }).toThrowError();
  });

  it('manualMode notification', () => {
    global.Ya = undefined;
    Vue.use(VueYandexMetrika, { id: 1 });
  });

  it('tests inject metrika script', () => {
    expect(getIsScriptInjected()).toBeTruthy();
  });

  it('should not inject', () => {
    global.Ya = {
      Metrika2: function Metrika2() {
        return {
          hit: jest.fn(),
        };
      },
    };
    const mock = jest.fn();
    loadScript(mock);
    expect(getIsScriptInjected()).toBeFalsy();
    expect(mock).toBeCalled();
  });

  it('should pass checkConfig', () => {
    expect(() => {
      Vue.use(VueYandexMetrika, { id: 1, router });
    }).not.toThrowError();
  });

  it('env by default', () => {
    helpers.updateConfig({});
    expect(getConfig().env).toBe('development');
  });

  it('env from plugin options', () => {
    helpers.updateConfig({ env: 'plugin' });
    expect(getConfig().env).toBe('plugin');
  });
});

describe('tracking', () => {
  beforeEach(async () => {
    resetConfig();
    jest.clearAllMocks();
  });

  it('manualMode', () => {
    helpers.updateConfig({ id: 1 });
    const metrika = helpers.createMetrika(Vue);
    helpers.startTracking(metrika);
  });

  it('debug', () => {
    helpers.updateConfig({ id: 1, router, debug: true });
    const metrika = helpers.createMetrika(Vue);
    helpers.startTracking(metrika);
  });

  it('development', () => {
    helpers.updateConfig({ id: 1, router, debug: false });
    const metrika = helpers.createMetrika(Vue);
    helpers.startTracking(metrika);
  });

  it('skipSamePath', async () => {
    helpers.updateConfig({ id: 1, router });
    const metrika = helpers.createMetrika(Vue);
    helpers.startTracking(metrika);
    await router.push('/init'); // init
    await router.push('/init#samePath'); // triggers samePath
    expect(metrika.hit).toBeCalledTimes(1);
  });

  it('ignoreRoutes', async () => {
    helpers.updateConfig({ id: 1, router, ignoreRoutes: ['test'] });
    const metrika = helpers.createMetrika(Vue);
    helpers.startTracking(metrika);
    await router.push('/init'); // init
    await router.push('/test'); // triggers ignoreRoutes
    expect(metrika.hit).toBeCalledTimes(0);
  });

  it('metrika.hit', async () => {
    helpers.updateConfig({ id: 1, router });
    const metrika = helpers.createMetrika(Vue);
    helpers.startTracking(metrika);
    await router.push('/init'); // init
    await router.push('/test'); // triggers hit
    expect(metrika.hit).toBeCalledTimes(2);
  });
});

describe('proxy', () => {
  it('tests metrika is undefined', () => {
    global.Ya = undefined;
    helpers.updateConfig({ id: 1, env: 'production' });
    const metrika = helpers.createMetrika(Vue);
    helpers.startTracking(metrika);
  });
  it('tests counter exists already', () => {
    const counter = {};
    helpers.updateConfig({ id: 1, env: 'production' });
    window.yaCounter1 = counter;
    const metrika = helpers.createMetrika(Vue);
    expect(metrika).toStrictEqual(window.yaCounter1);
  });
});
