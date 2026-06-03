
// Versionado de caché basado en fecha de deploy — Actualizar esta fecha al hacer cambios
const CACHE_VERSION = '2026.06.03_v3';
const CACHE_NAME = `calc-divisas-v${CACHE_VERSION}`;
const ASSETS = [
  './',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Instalación del Service Worker y almacenamiento de recursos estáticos en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Almacenando recursos estáticos en precaché');
      // Intentamos agregar todos los recursos. Si falla, los guardamos uno por uno
      // para asegurar que al menos los recursos críticos (HTML, CSS, JS) se almacenen.
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[Service Worker] Error en addAll colectivo, intentando almacenamiento individual:', err);
        return Promise.all(
          ASSETS.map((asset) => {
            return cache.add(asset).catch((individualErr) => {
              console.warn(`[Service Worker] No se pudo precachear el recurso: ${asset}`, individualErr);
            });
          })
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación del Service Worker y limpieza de cachés antiguos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antiguo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. Filtrar solo peticiones HTTP y HTTPS (evitar esquemas internos del WebView o extensiones)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 2. Ignorar peticiones que no sean de método GET
  if (e.request.method !== 'GET') {
    return;
  }

  // 3. Ignorar peticiones a APIs externas (DolarAPI y CriptoYa)
  // El bloque try-catch de app.js capturará los fallos offline/online nativos en JS.
  if (url.hostname.includes('dolarapi.com') || url.hostname.includes('criptoya.com')) {
    return;
  }

  // 4. Estrategia diferenciada de carga:

  // A. Peticiones de Navegación (Carga de la aplicación HTML) -> Estrategia Network-First con Fallback Garantizado
  const isHTMLRequest = e.request.mode === 'navigate' || 
                       (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'));

  if (isHTMLRequest) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          // Si la respuesta es exitosa (200), guardarla dinámicamente en la caché
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache).catch((err) => {
                console.warn('[Service Worker] Falló al guardar navegación en caché:', err);
              });
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('[Service Worker] Error de red en navegación, buscando fallback offline:', err);
          
          // Intentar retornar la raíz '/' o '/index.html' de la caché
          return caches.match('./').then((fallbackRoot) => {
            if (fallbackRoot) return fallbackRoot;
            return caches.match('./index.html').then((fallbackHTML) => {
              if (fallbackHTML) return fallbackHTML;

              // CRÍTICO: Si no hay nada de nada en la caché (por ejemplo, instalación corrupta), 
              // NUNCA debemos retornar undefined. Retornamos una respuesta HTML básica válida 
              // para evitar que el navegador aborte con el error del sistema ERR_FAILED.
              return new Response(
                '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conversor VES - Sin conexión</title><style>body{font-family:sans-serif;background:#0d0e12;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center}div{max-width:400px;background:#1e293b;padding:30px;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)}h2{color:#10b981;margin-top:0}button{background:#10b981;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:bold;cursor:pointer;margin-top:15px}</style></head><body><div><h2>Conversor VES</h2><p>La aplicación está offline y no pudo cargar el recurso local. Por favor, conéctate a internet e inténtalo de nuevo.</p><button onclick="window.location.reload()">Reintentar</button></div></body></html>',
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html; charset=utf-8' }
                }
              );
            });
          });
        })
    );
    return;
  }

  // B. Recursos Estáticos Locales (CSS, JS, imágenes, manifest) -> Estrategia Cache-First
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request)
        .then((networkResponse) => {
          // Almacenar dinámicamente respuestas válidas (mismo origen o Google Fonts)
          const isGoogleFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
          if (networkResponse && networkResponse.status === 200 && (url.origin === location.origin || isGoogleFont)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache).catch((err) => {
                console.warn('[Service Worker] Falló al guardar recurso estático en caché:', err);
              });
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('[Service Worker] Falló descarga de red para recurso estático:', e.request.url, err);
          // Si el recurso estático no está en caché y falla la red, propagamos el error nativo del fetch
          throw err;
        });
    })
  );
});
