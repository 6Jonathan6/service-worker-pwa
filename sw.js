"use strict"
const version = 4
const cacheName = `sw-${version}`
const urlsToCache = {
    public: [
        "/",
        "/images/homer.png"
    ]
}
let isOnline
self.addEventListener("install", onInstall)
self.addEventListener("activate", onActivate)
self.addEventListener("message", onMessage)
self.addEventListener("fetch", onFetch)
main().catch(console.error)

// *****************************************************

async function main() {
    console.log(`Service Worker ${version} is starting...`)
    await sendMessage({ requestStatusUpdate: true })
    await cachePublicFiles()
}

async function onInstall(evt) {
    console.log(`Service Worker ${version} is installed.`)
    self.skipWaiting()
}

async function onActivate(evt) {
    //Tell the browser don't kill this sw until
    //handleActivation must be a promise
    evt.waitUntil(handleActivativation())
}
async function handleActivativation() {
    //Tell the clients that the sw has taken control
    await clients.claim()
    await clearCaches()
    await cachePublicFiles(/*forceReload=*/true)
    console.log(`Service Worker ${version} is activated.`)
}

async function sendMessage(msg) {
    const allClients = await clients.matchAll({ includeUncontrolled: true })
    return Promise.all(
        allClients.map(client => {
            //Port 1 sw is listenning
            //Port 2 client is listening
            const chan = new MessageChannel()
            chan.port1.onmessage = onMessage
            return client.postMessage(msg, [chan.port2])
        })
    )
}

function onMessage({ data }) {
    if (data.statusUpdate) {
        ({ isOnline } = data.statusUpdate)
        console.log('Sevice Worker status update isOnline', isOnline)
    }
}

async function cachePublicFiles(forceReload = true) {
    // caches is global a browser variable
    const cache = await caches.open(cacheName)
    return Promise.all(
        urlsToCache.public.map(async (url) => {
            try {
                let res
                if (!forceReload) {
                    res = await cache.match(url)
                    if (res) {
                        return res
                    }
                }
                let fetchOptions = {
                    method: 'GET',
                    cache: "no-cache",
                    credentials: 'omit'
                }
                res = await fetch(url, fetchOptions)
                if (res.ok) {
                    // Clone response in case the response will be stored in cache and returned to the browser
                    await cache.put(url, res.clone())
                }
            } catch (error) {
                console.error(error);
                ;
            }
        })
    )
}
async function clearCaches() {
    const cacheNames = await caches.keys()
    const oldCacheNames = cacheNames.filter(function matchOldCacheNames(cacheName) {
        if (/^sw-\d+$/.test(cacheName)) {
            let [, cacheVersion] = cacheName.match(/^sw-(\d+)$/)
            cacheVersion = (cacheVersion != null) ? Number(cacheVersion) : cacheVersion
            return (cacheVersion > 0 && cacheVersion != version)
        }
    })
    return Promise.all(
        oldCacheNames.map(cacheName => {
            return caches.delete(cacheName)
        })
    )
}

async function onFetch(evt) {
    evt.respondWith(router(evt.request))
}
async function router(request) {
    const url = new URL(request.url)
    const reqURL = url.pathname
    const cache = await caches.open(cacheName)
    let res
    if (url.origin == location.origin) {
        try {
            let fetchOptions = {
                method: request.method,
                headers: request.headers,
                credentials: "omit",
                cache: "no-store"
            }
            res = await fetch(request.url, fetchOptions)
            if (res && res.ok) {
                await cache.put(reqURL, res.clone())
                return res
            }
        } catch (error) {
            console.log('Returning from cache')
            res = await cache.match(reqURL)
            if (res) {
                return res.clone()
            }
        }
    }
    //Todo figure out CORS requests
}