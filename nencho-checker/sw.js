/*
 * 年末調整 控除額チェッカー ― サービスワーカー
 * 役割：ホーム画面アプリとしてのインストール要件を満たし、オフラインでも開けるようにする。
 * 方針：ネットワーク優先（常に最新を取りに行き、取れなければキャッシュを返す）。
 *       ファイルを更新したら CACHE_VERSION を上げると古いキャッシュが破棄される。
 */
var CACHE_VERSION = 'nencho-v8';
var PRECACHE = [
    './',
    './index.html',
    './nencho.css',
    './nencho-rules.js',
    './nencho-app.js',
    './nencho-links.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-512-maskable.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(function (cache) { return cache.addAll(PRECACHE); })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;
    var url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return; // Webフォント等の外部リソースは素通し
    event.respondWith(
        fetch(event.request).then(function (res) {
            if (res && res.ok) {
                var copy = res.clone();
                caches.open(CACHE_VERSION).then(function (cache) { cache.put(event.request, copy); });
            }
            return res;
        }).catch(function () {
            return caches.match(event.request, { ignoreSearch: true }).then(function (hit) {
                return hit || caches.match('./index.html');
            });
        })
    );
});
