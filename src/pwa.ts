import { registerSW } from 'virtual:pwa-register';

// autoUpdate: cuando hay una versión nueva del sitio, el SW toma control y la página se recarga sola.
// El chequeo horario evita que una pestaña abierta mucho tiempo siga mostrando una versión vieja.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
  },
});
