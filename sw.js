"use strict"
const version = 1

self.addEventListener("install", onInstall)
self.addEventListener("activate", onActivate)

main().catch(console.error)

// *****************************************************

async function main() {
    console.log(`Service Worker ${version} is starting...`)

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
    console.log(`Service Worker ${version} is activated.`)
}   