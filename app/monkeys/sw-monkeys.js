'use strict';

// Assets to cache
const urlsToPrefetch = [
  '/monkeys/',
  '/monkeys/index.html',
  '/images/monkeys/1.jpg',
  '/images/monkeys/2.jpg',
  '/images/monkeys/3.jpg',
  '/images/monkeys/4.jpg',
  '/images/monkeys/5.jpg',
  '/images/monkeys/6.jpg',
  '/images/monkeys/7.jpg',
  '/images/monkeys/8.jpg',
  '/images/monkeys/9.jpg',
  '/images/monkeys/10.jpg',
  '/images/monkeys/11.jpg',
  '/images/monkeys/12.jpg'
];

// Feature detection of cache options in the Request object.
// Reference: https://fetch.spec.whatwg.org/#concept-request-mode
const REQUEST_SUPPORTS_CACHE_OPTION = typeof Request !== 'undefined'
  && Request.prototype.hasOwnProperty('cache');

// Incrementing CACHE_VERSION will kick off the install event and force previously cached
// resources to be cached again.
const CACHE_VERSION = 1;
let CURRENT_CACHES = {
  offline: 'offline-monkeys-v' + CACHE_VERSION
};

self.addEventListener('install', function (event) {
  if (REQUEST_SUPPORTS_CACHE_OPTION === false){
    var now = Date.now();
  }

  // Load All the resources to prefetch
  event.waitUntil(
    caches.open(CURRENT_CACHES.offline).then(function(cache) {
      let cachePromises = urlsToPrefetch.map(function(urlToPrefetch) {
        let url = urlToPrefetch;

        if (REQUEST_SUPPORTS_CACHE_OPTION === false) {
          // This constructs a new URL object using the service worker's script location as the base
          // for relative URLs.
          url = new URL(urlToPrefetch, location.href);
          // Append a cache-bust=TIMESTAMP URL parameter to each URL's query string.
          // This is particularly important when precaching resources that are later used in the
          // fetch handler as responses directly, without consulting the network (i.e. cache-first).
          // If we were to get back a response from the HTTP browser cache for this precaching request
          // then that stale response would be used indefinitely, or at least until the next time
          // the service worker script changes triggering the install flow.
          url.search += (url.search ? '&' : '?') + 'cache-bust=' + now;
        }

        // It's very important to use {mode: 'no-cors'} if there is any chance that
        // the resources being fetched are served off of a server that doesn't support
        // CORS (http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).
        // In this example, www.chromium.org doesn't support CORS, and the fetch()
        // would fail if the default mode of 'cors' was used for the fetch() request.
        // The drawback of hardcoding {mode: 'no-cors'} is that the response from all
        // cross-origin hosts will always be opaque
        // (https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#cross-origin-resources)
        // and it is not possible to determine whether an opaque response represents a success or failure
        // (https://github.com/whatwg/fetch/issues/14).
        let request = new Request(url, {mode: 'no-cors', cache: 'no-cache'});
        return fetch(request).then(function(response) {
          if (response.status >= 400) {
            throw new Error('request for ' + urlToPrefetch +
              ' failed with status ' + response.statusText);
          }

          // Use the original URL without the cache-busting parameter as the key for cache.put().
          return cache.put(urlToPrefetch, response);
        }).catch(function(error) {
          console.error('Not caching ' + urlToPrefetch + ' due to ' + error);
        });
      });

      return Promise.all(cachePromises);
    }).catch(function(error) {
      console.error('Pre-fetching failed:', error);
    })
  );
});

// After the service worker is installed, it is then activated, meaning it can start controlling what the user gets!
self.addEventListener('activate', function (event) {
  // clients.claim() tells the active service worker to take immediate
  // control of all of the clients under its scope.
  if (self.clients && (typeof self.clients.claim === 'function')) {
    self.clients.claim();
  }

  // Delete all caches that belong to this service worker 
  // and are in a different version.
  let serviceWorkerCacheNames = [];
  let expectedCacheVersions = [];
  Object.keys(CURRENT_CACHES).map(function(key) {
    serviceWorkerCacheNames.push(CURRENT_CACHES[key].split('-v')[0]);
    expectedCacheVersions.push(CURRENT_CACHES[key]);
  });

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Detect if this cache belong to this Service Worker
          if (serviceWorkerCacheNames.includes(cacheName.split('-v')[0])){
            // If this cache name isn't present in the array of "expected" cache names,
            // then delete it.
            if (expectedCacheVersions.indexOf(cacheName) === -1) {
              console.warn('Old cache deleted: ', cacheName);
              return caches.delete(cacheName);
            }
          }
        })
      );
    })
  );

});

self.addEventListener('fetch', function (event) {

  // console.log('%c Monkeys worker: ', 'color:black; background-color: #1E90FF', 'Handling fetch event for ', event.request.url);

  event.respondWith(
    // caches.match() will look for a cache entry in all of the caches available to the service worker.
    // It's an alternative to first opening a specific named cache and then matching on that.
    caches.match(event.request).then(function(response) {
      if (response) {
        // Cache hit !
        console.log('%c Monkeys worker: ', 'color:black; background-color: #1E90FF', 'Cache hit !', event.request.url);
        return response;
      }

      // event.request will always have the proper mode set ('cors, 'no-cors', etc.) so we don't
      // have to hardcode 'no-cors' like we do when fetch()ing in the install handler.
      return fetch(event.request).then(function(response) {
        console.log('%c Monkeys worker: ', 'color:black; background-color: #1E90FF', 'Not found ! ', event.request.url);
        return response;
      }).catch(function(error) {
        // This catch() will handle exceptions thrown from the fetch() operation.
        // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
        // It will return a normal response object that has the appropriate error code set.
        throw error;
      });
    })
  );

});
