/* ============================================
   SERVICE WORKER - PWA آفلاین
   ============================================ */

var CACHE_NAME = 'cinema-cache-v1';
var CACHE_URLS = [
    './',
    './index.html',
    './404.html',
    './manifest.json',
    './css/style.css',
    './css/components.css',
    './css/responsive.css',
    './js/config.js',
    './js/auth.js',
    './js/theme.js',
    './js/movies.js',
    './js/bookings.js',
    './js/admin.js',
    './js/extra.js',
    './js/app.js'
];

// ===== نصب =====
self.addEventListener('install', function (event) {
    console.log('📦 Service Worker در حال نصب...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(CACHE_URLS).catch(function (err) {
                console.log('خطا در کش:', err);
            });
        }).then(function () {
            console.log('✅ Service Worker نصب شد');
            return self.skipWaiting();
        })
    );
});

// ===== فعال‌سازی =====
self.addEventListener('activate', function (event) {
    console.log('🚀 Service Worker فعال شد');
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (name) {
                    if (name !== CACHE_NAME) {
                        console.log('🗑️ حذف کش قدیمی:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// ===== دریافت =====
self.addEventListener('fetch', function (event) {
    // فقط درخواست‌های GET رو کش کن
    if (event.request.method !== 'GET') return;

    // درخواست‌های Supabase رو کش نکن
    if (event.request.url.includes('supabase.co')) return;

    // درخواست‌های API خارجی رو کش نکن
    if (event.request.url.includes('cdnjs.cloudflare.com')) {
        // اجازه بده از شبکه بیاد
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function (response) {
            // اگه توی کش بود
            if (response) {
                // همزمان از شبکه هم بروزرسانی کن
                fetch(event.request).then(function (networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                }).catch(function () { });

                return response;
            }

            // اگه توی کش نبود، از شبکه بگیر
            return fetch(event.request).then(function (response) {
                // کش کن
                if (response && response.status === 200) {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(function () {
                // اگه شبکه در دسترس نبود، صفحه آفلاین
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// ===== پیام‌ها =====
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(function () {
            console.log('✅ کش پاک شد');
        });
    }
});

console.log('🎬 Service Worker سینما آماده است');