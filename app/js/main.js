'use strict';

/**
 * Stores the assets of the urls into a specific cacheName
 * 
 * @param cacheName {string}    Name of the cache where to store the assets.
 * @param urls      {string[]}  Array of urls to cache.
 * @param cacheBust {boolean}   True if we need to make sure the requested assets are not comming from the HTTP browser cache.
 * @return  {Promise}   A promise which resolves when all the assets are cached.
 */
function cacheAssets(cacheName, urls, cacheBust) {
  // Reference: https://fetch.spec.whatwg.org/#concept-request-mode
  // Feature detection of cache options in the Request object.
  const REQUEST_SUPPORTS_CACHE_OPTION = typeof Request !== 'undefined'
    && Request.prototype.hasOwnProperty('cache');
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

    return Promise.all(cachePromises).catch(function(error) {
      console.error('cacheAssets failed:', error);
      return Promise.reject();
    });
  });
}