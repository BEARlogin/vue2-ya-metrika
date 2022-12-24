import { MetrikaService } from './MetrikaService';

export default function install(Vue, options = {}) {
  const metrika = new MetrikaService();

  metrika.updateConfig(options); // Merge options and default config

  metrika.checkConfig(); // Check if all required options are presented

  metrika.loadScript(() => { // Load Metrika script
    const yandexMetrika = metrika.createMetrika(Vue); // Create Metrika
    metrika.startTracking(yandexMetrika); // Start autotracking
  }, options.scriptSrc);
}
