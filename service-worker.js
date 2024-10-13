const CACHE_NAME = 'v1';

// Files da mettere in cache
const filesToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Aggiungere file alla cache quando il Service Worker è installato
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                filesToCache.map((file) => {
                    return cache.add(file).catch((err) => {
                        console.error(`Error caching ${file}: `, err);
                    });
                })
            );
        })
    );
});

// Aggiungere logica per fetch e cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
