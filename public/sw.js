// Service Worker cho Xổ Số Bắc Trung Nam
// Tối ưu performance và caching

const CACHE_NAME = 'xoso-cache-v1.0.0';
const STATIC_CACHE = 'xoso-static-v1.0.0';
const DYNAMIC_CACHE = 'xoso-dynamic-v1.0.0';

// Tối ưu: Danh sách các file cần cache
const STATIC_FILES = [
    '/',
    '/asset/img/LOGOxsmn_win.png',
    '/asset/img/og-image.jpg',
    '/favicon/favicon.ico',
    '/favicon/favicon-32x32.png',
    '/favicon/favicon-16x16.png',
    '/favicon/apple-touch-icon.png',
    '/styles/globals.css',
    '/styles/optimizedNavigation.module.css',
    '/public/css/navbar.module.css'
];

// Tối ưu: Danh sách các API endpoints cần cache
const API_ENDPOINTS = [
    '/api/kqxs/kqxsMB',
    '/api/kqxs/kqxsMT',
    '/api/kqxs/kqxsMN',
    '/api/auth/session'
];

// Tối ưu: Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Error caching static files', error);
            })
    );
});

// Tối ưu: Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Tối ưu: Fetch event - network first với fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Tối ưu: Bỏ qua các request không cần cache
    if (request.method !== 'GET') {
        return;
    }

    // Tối ưu: Xử lý API requests
    if (API_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Tối ưu: Xử lý static files
    if (STATIC_FILES.some(file => url.pathname.includes(file))) {
        event.respondWith(handleStaticRequest(request));
        return;
    }

    // Tối ưu: Xử lý navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    // Tối ưu: Xử lý image requests
    if (request.destination === 'image') {
        event.respondWith(handleImageRequest(request));
        return;
    }
});

// Tối ưu: Xử lý API requests với cache first
async function handleApiRequest(request) {
    try {
        // Tối ưu: Thử cache trước
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Tối ưu: Background sync để update cache
            fetch(request).then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
            });
            return cachedResponse;
        }

        // Tối ưu: Nếu không có cache, fetch từ network
        const response = await fetch(request);
        if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
            });
        }
        return response;
    } catch (error) {
        console.error('Service Worker: Error handling API request', error);
        // Tối ưu: Fallback to cache nếu network fails
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Tối ưu: Xử lý static requests với cache first
async function handleStaticRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const response = await fetch(request);
        if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
            });
        }
        return response;
    } catch (error) {
        console.error('Service Worker: Error handling static request', error);
        throw error;
    }
}

// Tối ưu: Xử lý navigation requests với network first
async function handleNavigationRequest(request) {
    try {
        // Tối ưu: Thử network trước
        const response = await fetch(request);
        if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
            });
        }
        return response;
    } catch (error) {
        console.error('Service Worker: Error handling navigation request', error);
        // Tối ưu: Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Tối ưu: Fallback to offline page
        return caches.match('/offline.html');
    }
}

// Tối ưu: Xử lý image requests với cache first
async function handleImageRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const response = await fetch(request);
        if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
            });
        }
        return response;
    } catch (error) {
        console.error('Service Worker: Error handling image request', error);
        throw error;
    }
}

// Tối ưu: Background sync cho offline functionality
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Tối ưu: Background sync function
async function doBackgroundSync() {
    try {
        // Tối ưu: Sync cached data khi online
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();

        for (const request of requests) {
            if (request.url.includes('/api/')) {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.put(request, response);
                    }
                } catch (error) {
                    console.error('Service Worker: Background sync error', error);
                }
            }
        }
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

// Tối ưu: Push notification handling
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'Có kết quả xổ số mới!',
            icon: '/asset/img/LOGOxsmn_win.png',
            badge: '/favicon/favicon-32x32.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            },
            actions: [
                {
                    action: 'view',
                    title: 'Xem ngay'
                },
                {
                    action: 'close',
                    title: 'Đóng'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification('Xổ Số Bắc Trung Nam', options)
        );
    }
});

// Tối ưu: Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

// Tối ưu: Message handling cho communication với main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_UPDATED') {
        // Tối ưu: Clear old caches khi có update
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        );
    }
});

// Tối ưu: Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker: Error', event.error);
});

// Tối ưu: Unhandled rejection handling
self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled rejection', event.reason);
});
