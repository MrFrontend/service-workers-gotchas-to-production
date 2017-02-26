'use strict';

// Assets to cache
const staticAssets = [
  '/',
  'index.html',
  // 'non-existing-file.html',
  // CSS
  '/css/main.css',
  // JS
  '/js/main.js',
  // Fonts
  '/fonts/clarendon-text-pro-regular.woff',
  '/fonts/clarendon-text-pro-regular.woff2'
];

// Images to preload
const imagesToPreload = [
  '/images/monkeys/4.jpg',
  '/images/cats/2.jpg',
  '/images/grumpy-cat/3.jpg'
];

// Reference: https://fetch.spec.whatwg.org/#concept-request-mode
// Feature detection of cache options in the Request object.
const REQUEST_SUPPORTS_CACHE_OPTION = typeof Request !== 'undefined'
  && Request.prototype.hasOwnProperty('cache');

// Incrementing CACHE_VERSION will kick off the install event and force previously cached
// resources to be cached again.
const CACHE_VERSION = 1;
let CURRENT_CACHES = {
  siteAssets: 'offline-site-v' + CACHE_VERSION,
  images: 'offline-images-v' + CACHE_VERSION
};

/**
 * Stores the assets of the urls into a specific cacheName
 * 
 * @param cacheName {string}    Name of the cache where to store the assets.
 * @param urls      {string[]}  Array of urls to cache.
 * @param cacheBust {boolean}   True if we need to make sure the requested assets are not comming from the HTTP browser cache.
 * @return  {Promise}   A promise which resolves when all the assets are cached.
 */
function cacheAssets(cacheName, urls, cacheBust) {
  let useCacheBusting = typeof cacheBust === 'boolean' ? cacheBust : false;
  if (useCacheBusting === true && REQUEST_SUPPORTS_CACHE_OPTION === false){
    var now = Date.now();
  }

  return caches.open(cacheName).then(function(cache) {
    let cachePromises = urls.map(function(urlToPrefetch) {
      let url = urlToPrefetch;
      let request;

      if (useCacheBusting === true && REQUEST_SUPPORTS_CACHE_OPTION === false) {
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

      if (useCacheBusting === true){
        request = new Request(url, {cache: 'no-cache'});
      } else {
        request = new Request(url);
      }
      
      return fetch(request).then(function(response) {
        if (response.status >= 400) {
          throw new Error('request for ' + urlToPrefetch + ' failed with status ' + response.statusText);
        }

        cache.put(urlToPrefetch, response);
      }).catch(function(error) {
        console.error('Not caching ' + urlToPrefetch + ' due to ' + error);
        return Promise.reject();
      });
    });

    return Promise.all(cachePromises)
    .catch(function(error) {
      console.error('cacheAssets failed:', error);
      return Promise.reject();
    });
  });
}

/**
 * Install
 */
self.addEventListener('install', function (event) {

  // Preload non essential assets
  cacheAssets(CURRENT_CACHES.images, imagesToPreload, true);

  // Load All the core resources to prefetch
  event.waitUntil(
    cacheAssets(CURRENT_CACHES.siteAssets, staticAssets)
    .catch(function(error) {
      console.error('Pre-fetching failed:', error);
      return Promise.reject();
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

  // console.log('%c Service worker: ', 'color:black; background-color: #FFD700', 'Handling fetch event for ', event.request.url);

  event.respondWith(
    // caches.match() will look for a cache entry in all of the caches available to the service worker.
    // It's an alternative to first opening a specific named cache and then matching on that.
    caches.match(event.request).then(function(response) {
      if (response) {
        // Cache hit !
        console.log('%c Service worker: ', 'color:black; background-color: #FFD700', 'Cache hit !', event.request.url);
        return response;
      }

      // event.request will always have the proper mode set ('cors, 'no-cors', etc.) so we don't
      // have to hardcode 'no-cors' like we do when fetch()ing in the install handler.
      return fetch(event.request).then(function(response) {
        console.log('%c Service worker: ', 'color:black; background-color: #FFD700', 'Not cached ! ', event.request.url);
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
