// noinspection JSValidateJSDoc

/**
 * Add-on module enhancing [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
 * management by automating environment setup, handling task scheduling, and managing resources efficiently.
 *
 * <note level="warning">
 * This module is **not included by default** in the main library.
 * Consumers must install it explicitly using {@link MainModule.installWorkersPoolModule}.
 * </note>
 *
 * The main entry point of the module is {@link WorkersPool}.
 *
 * @module WorkersPoolModule
 */
export * from './workers-factory'
export * from './web-worker.proxy'
