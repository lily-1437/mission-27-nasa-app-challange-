const CACHE_NAME = 'mission27-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './lib/three.module.js',
  './src/main.js',
  './src/state.js',
  './src/ui.js',
  './src/world.js',
  './src/player.js',
  './src/astronaut.js',
  './src/story.js',
  './src/minigames.js',
  './src/emergencies.js',
  './src/economy.js',
  './src/audio.js',
  './src/storage.js',
  './src/nasa.js',
  './src/handbook.js',
  './src/compute/epic-match.js',
  './src/compute/slope.js',
  './src/compute/dose.js',
  './src/compute/pressure.js',
  './assets/data/moon-terrain.json',
  './assets/data/storm-record.json',
  './assets/data/epic-2024-05-10.json',
  './assets/data/handbook.json',
  './assets/data/scenarios.json',
  './assets/data/story.json',
  './assets/textures/shackleton-local-h16.bin'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
