import Vue from 'vue';
import VueRouter from 'vue-router';
import { createLocalVue } from '@vue/test-utils';
import VueYandexMetrika from '../index';
import { MetrikaService } from '../MetrikaService';

let localVue = createLocalVue();
localVue.use(VueRouter);

let metrika = new MetrikaService();

const routes = [
  { name: 'main', path: '/init', component: { render: (h) => h('div') } },
  { name: 'test', path: '/test', component: { render: (h) => h('div') } },
];
let router = new VueRouter({ mode: 'abstract', routes });

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
    localVue = createLocalVue();
    jest.clearAllMocks();
    metrika = new MetrikaService();
  });

  it('should throw an error if the Metrika id is missing', () => {
    expect(() => {
      localVue.use(VueYandexMetrika, {});
    }).toThrowError();
  });

  it('manualMode notification', () => {
    global.Ya = undefined;
    localVue.use(VueYandexMetrika, { id: 1 });
  });

  it('should inject metrika script', () => {
    global.Ya = undefined;
    metrika.loadScript(jest.fn());
    expect(metrika.getIsScriptInjected()).toBeTruthy();
  });

  it('should not inject metrika script', () => {
    global.Ya = {
      Metrika2: function Metrika2() {
        return {
          hit: jest.fn(),
        };
      },
    };
    metrika.loadScript(jest.fn());
    expect(metrika.getIsScriptInjected()).toBeFalsy();
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
    metrika.loadScript(mock);
    expect(metrika.getIsScriptInjected()).toBeFalsy();
    expect(mock).toBeCalled();
  });

  it('should pass checkConfig', () => {
    expect(() => {
      localVue.use(VueYandexMetrika, { id: 1, router });
    }).not.toThrowError();
  });

  it('env by default', () => {
    metrika.updateConfig({});
    expect(metrika.getConfig().env).toBe('development');
  });

  it('env from plugin options', () => {
    metrika.updateConfig({ env: 'plugin' });
    expect(metrika.getConfig().env).toBe('plugin');
  });
});

describe('tracking', () => {
  beforeEach(async () => {
    router = new VueRouter({ mode: 'abstract', routes });
    metrika = new MetrikaService();
    metrika.resetConfig();
    jest.clearAllMocks();
  });

  it('manualMode', () => {
    metrika.updateConfig({ id: 1 });
    const yandexMetrika = metrika.createMetrika(Vue);
    metrika.startTracking(yandexMetrika);
  });

  it('debug', () => {
    metrika.updateConfig({ id: 1, router, debug: true });
    const yandexMetrika = metrika.createMetrika(Vue);
    metrika.startTracking(yandexMetrika);
  });

  it('development', async () => {
    metrika.updateConfig({
      id: 1, router, debug: false, env: 'development',
    });

    const yandexMetrika = metrika.createMetrika(Vue);

    jest.spyOn(MetrikaService, 'stubApiCall').mockImplementation(jest.fn);

    metrika.startTracking(yandexMetrika);
    await router.push('/init'); // init
    await router.push('/test'); // should not tracked
    expect(MetrikaService.stubApiCall).toBeCalledTimes(2);
  });

  it('skipSamePath', async () => {
    metrika.updateConfig({ id: 1, router, env: 'production' });
    const yandexMetrika = metrika.createMetrika(Vue);
    metrika.startTracking(yandexMetrika);
    await router.push('/init'); // init
    await router.push('/init#samePath'); // triggers samePath
    expect(yandexMetrika.hit).toBeCalledTimes(1);
  });

  it('ignoreRoutes', async () => {
    metrika.updateConfig({
      id: 1, router, ignoreRoutes: ['test'], env: 'production',
    });
    const yandexMetrika = metrika.createMetrika(Vue);
    metrika.startTracking(yandexMetrika);
    await router.push('/init'); // init
    await router.push('/test'); // triggers ignoreRoutes
    expect(yandexMetrika.hit).toBeCalledTimes(1);
  });

  it('metrika.hit', async () => {
    metrika.updateConfig({ id: 1, router, env: 'production' });
    const yandexMetrika = metrika.createMetrika(Vue);
    metrika.startTracking(yandexMetrika);
    await router.push('/init'); // init
    await router.push('/test'); // triggers hit
    expect(yandexMetrika.hit).toBeCalledTimes(2);
  });
});

describe('proxy', () => {
  it('tests metrika is undefined', () => {
    global.Ya = undefined;
    metrika.updateConfig({ id: 1, env: 'production' });
    const yandexMetrika = metrika.createMetrika(Vue);
    metrika.startTracking(yandexMetrika);
  });
  it('tests counter exists already', () => {
    const counter = {};
    metrika.updateConfig({ id: 1, env: 'production' });
    window.yaCounter1 = counter;
    const yandexMetrika = metrika.createMetrika(Vue);
    expect(yandexMetrika).toStrictEqual(window.yaCounter1);
  });
});
