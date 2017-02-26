'use strict';

/**
 * Service Workers hello world
 * 
 * @version 1
 */

self.addEventListener('install', function(event) {
  console.log('%c install ', 'color: white; background-color: blue;');
  if (typeof self.skipWaiting === 'function') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', function(event) {
  console.log('%c activate ', 'color: white; background-color: green;');
});

self.addEventListener('fetch', function(event) {
  console.log('%c fetch: ', 'color: black; background-color: darkorange;', event.request.url);
  // console.log('Fetch request for:', event.request.url);
});
