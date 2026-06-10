const CACHE_NAME = 'aguy-retired'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.delete(CACHE_NAME))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => caches.delete(key)))
    }),
  )
  self.clients.claim()
  self.registration.unregister()
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
