// ==UserScript==
// @name              Unified Wayfarer Tools
// @namespace         https://github.com/Frankmans/Wayfarer-Tools
// @version           1.1.0.159
// @description       Unofficial addons that add extra quality of life features to Scopely's project Wayfarer.
// @homepageURL       https://github.com/Frankmans/Wayfarer-Tools#readme
// @supportURL        https://github.com/Frankmans/Wayfarer-Tools/issues
// @license           GPL-3.0-only
// @author            bilde2910
// @copyright         bilde2910 (https://github.com/bilde2910)
// @icon              https://raw.githubusercontent.com/Frankmans/Wayfarer-Tools/redesign-port/resources/images/logo_48.png?b=449462e
// @match             https://wayfarer.scopely.com/*
// @downloadURL       https://raw.githubusercontent.com/Frankmans/Wayfarer-Tools/redesign-port/dist/unified-wayfarer-tools.user.js
// @updateURL         https://raw.githubusercontent.com/Frankmans/Wayfarer-Tools/redesign-port/dist/unified-wayfarer-tools.meta.js
// @grant             GM.getResourceUrl
// @grant             GM.xmlHttpRequest
// @grant             GM.openInTab
// @noframes
// @resource          geofences https://raw.githubusercontent.com/Frankmans/Wayfarer-Tools/redesign-port/resources/geofences.json?b=449462e
// @require           https://cdn.jsdelivr.net/npm/@googlemaps/markerclusterer@2.6.2/dist/index.min.js
// @require           https://cdn.jsdelivr.net/npm/proj4@2.20.0/dist/proj4.js
// @require           https://cdn.jsdelivr.net/npm/ag-grid-community@34.3.1/dist/ag-grid-community.min.js
// @require           https://cdn.jsdelivr.net/npm/diff@8.0.2/dist/diff.min.js
// @require           https://cdn.jsdelivr.net/npm/s2-geometry@1.2.10/src/s2geometry.js
// ==/UserScript==


(function(s2Geometry,markerclusterer,agGrid,proj4,diff){'use strict';/** Info about the userscript, parsed from the userscript header (tools/post-build.js) */
const scriptInfo = {
    name: GM.info.script.name,
    version: GM.info.script.version,
    namespace: GM.info.script.namespace,
};/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function __addDisposableResource(env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;

}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function __disposeResources(env) {
    function fail(e) {
        env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
    }
    var r, s = 0;
    function next() {
        while (r = env.stack.pop()) {
            try {
                if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                if (r.dispose) {
                    var result = r.dispose.call(r.value);
                    if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                }
                else s |= 1;
            }
            catch (e) {
                fail(e);
            }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
    }
    return next();
}var _Logger_subsystem;
/**
 * Returns the URL of a resource by its name, as defined in `assets/resources.json`, from GM resource cache - [see GM.getResourceUrl docs](https://wiki.greasespot.net/GM.getResourceUrl)
 * Falls back to a `raw.githubusercontent.com` URL or base64-encoded data URI if the resource is not available in the GM resource cache.
 * ⚠️ Requires the directive `@grant GM.getResourceUrl`
 */
async function getResourceUrl(name) {
    const logger = new Logger("utils:resources");
    let url = await GM.getResourceUrl(name);
    if (!url || url.length === 0) {
        logger.warn(`Couldn't get blob URL nor external URL for @resource '${name}', trying to use base64-encoded fallback`);
        // @ts-ignore
        url = await GM.getResourceUrl(name, false);
    }
    return url;
}
let geofenceCache = null;
const readGeofences = async () => {
    const logger = new Logger("utils:geofences");
    if (geofenceCache)
        return geofenceCache;
    logger.info("Reading geofences...");
    const resp = await fetch(await getResourceUrl("geofences"));
    geofenceCache = await resp.json();
    // For binary encoded data
    // Disabled because for some reason this is extremely slow
    /*const ds = new DecompressionStream("gzip");
    const rawStream = resp.body?.pipeThrough(ds);
    const reader = new ByteReader(rawStream!);
    geofenceCache = {};
    const decoder = new TextDecoder();
    while (!reader.done) {
      try {
        const zLength = new Uint8Array(await reader.read(1));
        const zBytes = await reader.read(zLength[0]);
        const zone = decoder.decode(zBytes);
        geofenceCache[zone] = [];
        const pLength = new Uint32Array(await reader.read(4));
        for (let i = 0; i < pLength[0]; i++) {
          const ll = new Float32Array(await reader.read(8));
          geofenceCache[zone].push([ll[0], ll[1]]);
        }
      } catch (e) {
        logger.warn(e);
      }
    }*/
    logger.info("Done reading geofences");
    return geofenceCache;
};
const isDarkMode = () => { var _a; return !!((_a = document.querySelector("html")) === null || _a === void 0 ? void 0 : _a.classList.contains("dark")); };
//#region DOM utils
let domLoaded = document.readyState === "complete" || document.readyState === "interactive";
document.addEventListener("DOMContentLoaded", () => domLoaded = true);
function untilTruthy(listener) {
    return new Promise((resolve, _reject) => {
        const queryLoop = () => {
            const ref = listener();
            if (ref)
                resolve(ref);
            else
                setTimeout(queryLoop, 100);
        };
        queryLoop();
    });
}
const makeChildNode = (parent, tagName, content) => {
    const e = document.createElement(tagName);
    if (typeof content !== "undefined") {
        e.textContent = content;
    }
    parent.appendChild(e);
    return e;
};
const insertAfter = (after, node) => {
    after.parentNode.insertBefore(node, after.nextSibling);
};
//#region Storage utils
// https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
const cyrb53 = function (str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
//#region Miscellaneous
/**
 * Returns an copy of obj containing only the keys specified in the keys array.
 * @param obj The object to remove entries from
 * @param keys The keys to keep
 * @returns
 */
const filterObject = (obj, keys) => keys
    .reduce((nObj, key) => {
    nObj[key] = obj[key];
    return nObj;
}, {});
/**
 * Type-safe version of Object.entries(). The object must be string-keyed.
 * @param obj The object to get entries from
 * @returns An array of pairs of the object's keys and values
 */
const iterObject = (obj) => Object
    .entries(obj)
    .map(([k, v]) => [k, v]);
/**
 * Type-safe version of Object.keys(). The object must be string-keyed.
 * @param obj The object to get keys from
 * @returns An array of the object's keys
 */
const iterKeys = (obj) => Object
    .keys(obj)
    .map(k => k);
/**
 * Type-safe version of Object.assign(target, ...source).
 * @param target The target to assign to
 * @param source An array of sources to assign from
 * @returns The target that was assigned to
 */
const assignAll = (target, ...source) => source
    .reduce((t, s) => Object.assign(t, s), target);
/**
 * Converts an array of objects of type `T` to a map indexed by a property of `T`.
 * @param arr The list of objects to index
 * @param index The key by which to index
 * @returns An object `{ [T[index]]: T }` for all `T` in `arr`
 */
const indexToMap = (arr, index) => assignAll({}, ...arr.map(e => ({ [e[index]]: e })));
const deepEquals = (obj1, obj2) => {
    if (typeof obj1 !== typeof obj2)
        return false;
    if (typeof obj1 === "object" && typeof obj2 === "object") {
        if (Array.isArray(obj1) !== Array.isArray(obj2))
            return false;
        if (Array.isArray(obj1) && Array.isArray(obj2)) {
            if (obj1.length !== obj2.length)
                return false;
            for (let i = 0; i < obj1.length; i++)
                if (!deepEquals(obj1[i], obj2[i]))
                    return false;
            return true;
        }
        else {
            const k1 = iterKeys(obj1);
            const k2 = iterKeys(obj2);
            if (k1.length !== k2.length)
                return false;
            for (const k of k1)
                if (!k2.includes(k))
                    return false;
            for (const k of k2)
                if (!k1.includes(k))
                    return false;
            for (const k of k1)
                if (!deepEquals(obj1[k], obj2[k]))
                    return false;
            return true;
        }
    }
    else {
        return obj1 === obj2;
    }
};
const sleep = (ms) => new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
});
const downloadAsFile = (data, type, name) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.setAttribute("download", name);
    anchor.href = url;
    anchor.setAttribute("target", "_blank");
    anchor.click();
    URL.revokeObjectURL(url);
};
const readFile = (...accept) => new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept.length > 0) {
        input.accept = accept.join(",");
    }
    input.addEventListener("change", () => {
        if (input.files !== null && input.files.length >= 1) {
            resolve(input.files[0]);
        }
        else {
            reject();
        }
    });
    input.click();
});
const readFiles = (...accept) => new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    if (accept.length > 0)
        input.accept = accept.join(",");
    input.addEventListener("change", () => {
        if (input.files !== null) {
            resolve([...input.files]);
        }
        else {
            reject();
        }
    });
    input.click();
});
const haversine = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => x * Math.PI / 180;
    const R = 6371; // km
    const x1 = lat2 - lat1;
    const dLat = toRad(x1);
    const x2 = lon2 - lon1;
    const dLon = toRad(x2);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    // returns in meters
    return d * 1000;
};
const toUtcIsoDate = (d) => `${d.getUTCFullYear()}-` +
    `${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-` +
    `${d.getUTCDate().toString().padStart(2, "0")}`;
const shiftDays = (date, offset) => {
    const nd = new Date(date);
    nd.setUTCDate(nd.getUTCDate() + offset);
    return nd;
};
const mergeArraysToObject = (a, b) => a.map((e, i) => ({ a: e, b: b[i] }));
const weightNumbers = (a, b, ratio) => a * ratio + b * (1 - ratio);
const weightNumericArray = (arr1, arr2, ratio) => mergeArraysToObject(arr1, arr2).map(({ a, b }) => weightNumbers(a, b, ratio));
class S2Overlay {
    constructor() {
        Object.defineProperty(this, "polyLines", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.polyLines = [];
    }
    checkMapBoundsReady(map) {
        return !!map && typeof map.getBounds !== "undefined" && typeof map.getBounds() !== "undefined";
    }
    until(cond, map) {
        const poll = (resolve, reject) => {
            if (cond(map))
                resolve(map);
            else
                setTimeout(() => poll(resolve), 400);
        };
        return new Promise(poll);
    }
    async updateGrid(map, grids) {
        this.polyLines.forEach((line) => line.setMap(null));
        for (const grid of grids) {
            await this.drawCellGrid(map, grid);
        }
    }
    async drawCellGrid(map, grid) {
        await this.until(this.checkMapBoundsReady, map);
        const bounds = map.getBounds();
        if (typeof bounds === "undefined")
            return;
        const zoom = map.getZoom();
        const seenCells = {};
        const cellsToDraw = [];
        if (grid.level >= 2 && typeof zoom !== "undefined" && grid.level < (zoom + 2)) {
            const ll = map.getCenter();
            if (typeof ll === "undefined")
                return;
            const cell = s2Geometry.S2.S2Cell.FromLatLng(this.getLatLngPoint(ll), grid.level);
            cellsToDraw.push(cell);
            seenCells[cell.toString()] = true;
            let curCell;
            while (cellsToDraw.length > 0) {
                curCell = cellsToDraw.pop();
                const neighbors = curCell.getNeighbors();
                for (let n = 0; n < neighbors.length; n++) {
                    const nStr = neighbors[n].toString();
                    if (!seenCells[nStr]) {
                        seenCells[nStr] = true;
                        if (this.isCellOnScreen(bounds, neighbors[n])) {
                            cellsToDraw.push(neighbors[n]);
                        }
                    }
                }
                this.drawCell(map, curCell, grid);
            }
        }
    }
    drawCell(map, cell, style) {
        var _a, _b;
        const cellCorners = cell.getCornerLatLngs();
        cellCorners[4] = cellCorners[0]; // Loop it
        const polyline = new (uwtGoogle().maps.Polyline)({
            path: cellCorners,
            geodesic: true,
            strokeColor: style.color,
            strokeOpacity: (_a = style.opacity) !== null && _a !== void 0 ? _a : 1,
            strokeWeight: (_b = style.thickness) !== null && _b !== void 0 ? _b : 1,
            map: map,
        });
        this.polyLines.push(polyline);
    }
    getLatLngPoint(data) {
        return {
            lat: typeof data.lat == "function" ? data.lat() : data.lat,
            lng: typeof data.lng == "function" ? data.lng() : data.lng,
        };
    }
    isCellOnScreen(mapBounds, cell) {
        const corners = cell.getCornerLatLngs();
        for (let i = 0; i < corners.length; i++) {
            if (mapBounds.intersects(new (uwtGoogle().maps.LatLngBounds)(corners[i]))) {
                return true;
            }
        }
        return false;
    }
}
const addS2Overlay = async (map, grids) => {
    const overlay = new S2Overlay();
    grids.sort((a, b) => b.level - a.level);
    for (const grid of grids) {
        await overlay.drawCellGrid(map, grid);
    }
    map.addListener("idle", async () => {
        await overlay.updateGrid(map, grids);
    });
};
//#region Logging
class Logger {
    constructor(subsystem) {
        _Logger_subsystem.set(this, void 0);
        __classPrivateFieldSet(this, _Logger_subsystem, subsystem, "f");
    }
    debug(..._data) {
        //console.debug("[D]", "[unified-wf-tools]", `[${this.#subsystem}]`, ..._data);
    }
    info(...data) {
        console.log("[I]", "[unified-wf-tools]", `[${__classPrivateFieldGet(this, _Logger_subsystem, "f")}]`, ...data);
    }
    ;
    warn(...data) {
        console.warn("[W]", "[unified-wf-tools]", `[${__classPrivateFieldGet(this, _Logger_subsystem, "f")}]`, ...data);
    }
    ;
    error(...data) {
        console.error("[E]", "[unified-wf-tools]", `[${__classPrivateFieldGet(this, _Logger_subsystem, "f")}]`, ...data);
    }
    ;
}
_Logger_subsystem = new WeakMap();
// ---- redesign patch: the PAGE's window, not the userscript sandbox's ----
// With @grant GM.* the script runs in the script manager's sandbox, whose XMLHttpRequest/fetch/google
// are separate from the ones Wayfarer uses.
const uwtPageWin = (typeof unsafeWindow !== "undefined" && unsafeWindow)
    ? unsafeWindow
    : window;
const uwtPageXHR = uwtPageWin.XMLHttpRequest;
const uwtGoogle = () => uwtPageWin.google || (typeof google !== "undefined" ? google : undefined);
/**
 * redesign: where the Google maps of each review type live in the React-based review pages. Used by
 * open-in (to place its buttons) and review-map-mods (to find the map).
 */
const uwtReviewMapSelectors = {
    NEW: "[data-testid=\"review-new-check-duplicates-slot\"] [data-testid=\"base-map-container\"]",
    EDIT: "[data-testid=\"review-edit-live-map\"] [data-testid=\"base-map-container\"]",
    PHOTO: "[data-testid=\"review-photo-flow\"] [data-testid=\"base-map-container\"]",
};var _IDBStoreConnection_instances, _IDBStoreConnection_tx, _IDBStoreConnection_completeHandlers, _IDBStoreConnection_objectStoreName, _IDBStoreConnection_db, _IDBStoreConnection_mode, _IDBStoreConnection_logger, _IDBStoreConnection_objectStore_get;
class KeyNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "KeyNotFoundError";
    }
}
let activeConns = 0;
class IDBStoreConnection {
    constructor(db, objectStoreName, mode) {
        _IDBStoreConnection_instances.add(this);
        _IDBStoreConnection_tx.set(this, void 0);
        _IDBStoreConnection_completeHandlers.set(this, void 0);
        _IDBStoreConnection_objectStoreName.set(this, void 0);
        _IDBStoreConnection_db.set(this, void 0);
        _IDBStoreConnection_mode.set(this, void 0);
        _IDBStoreConnection_logger.set(this, void 0);
        __classPrivateFieldSet(this, _IDBStoreConnection_logger, new Logger("idb:connection"), "f");
        activeConns++;
        __classPrivateFieldGet(this, _IDBStoreConnection_logger, "f").debug(`Active IDB connections: ${activeConns} (+1, ${objectStoreName})`);
        __classPrivateFieldSet(this, _IDBStoreConnection_db, db, "f");
        __classPrivateFieldSet(this, _IDBStoreConnection_completeHandlers, [], "f");
        __classPrivateFieldSet(this, _IDBStoreConnection_tx, null, "f");
        __classPrivateFieldSet(this, _IDBStoreConnection_objectStoreName, objectStoreName, "f");
        __classPrivateFieldSet(this, _IDBStoreConnection_mode, mode, "f");
    }
    [(_IDBStoreConnection_tx = new WeakMap(), _IDBStoreConnection_completeHandlers = new WeakMap(), _IDBStoreConnection_objectStoreName = new WeakMap(), _IDBStoreConnection_db = new WeakMap(), _IDBStoreConnection_mode = new WeakMap(), _IDBStoreConnection_logger = new WeakMap(), _IDBStoreConnection_instances = new WeakSet(), Symbol.dispose)]() {
        __classPrivateFieldGet(this, _IDBStoreConnection_db, "f").close();
        activeConns--;
        __classPrivateFieldGet(this, _IDBStoreConnection_logger, "f").debug(`Active IDB connections: ${activeConns} (-1; ${__classPrivateFieldGet(this, _IDBStoreConnection_objectStoreName, "f")})`);
    }
    get(query) {
        return new Promise((resolve, reject) => {
            const req = __classPrivateFieldGet(this, _IDBStoreConnection_instances, "a", _IDBStoreConnection_objectStore_get).get(query);
            req.onsuccess = () => {
                if (typeof req.result !== "undefined")
                    resolve(req.result);
                else
                    reject(new KeyNotFoundError(`Key not found: ${query}`));
            };
            req.onerror = () => reject();
        });
    }
    getAll() {
        return new Promise((resolve, reject) => {
            const req = __classPrivateFieldGet(this, _IDBStoreConnection_instances, "a", _IDBStoreConnection_objectStore_get).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject();
        });
    }
    keys() {
        return new Promise((resolve, reject) => {
            const req = __classPrivateFieldGet(this, _IDBStoreConnection_instances, "a", _IDBStoreConnection_objectStore_get).getAllKeys();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject();
        });
    }
    async *iterate() {
        const keys = await this.keys();
        for (const key of keys) {
            const next = await this.get(key);
            this.commit();
            yield next;
        }
    }
    put(...values) {
        const store = __classPrivateFieldGet(this, _IDBStoreConnection_instances, "a", _IDBStoreConnection_objectStore_get);
        for (const value of values)
            store.put(value);
    }
    clear() {
        return new Promise((resolve, reject) => {
            const req = __classPrivateFieldGet(this, _IDBStoreConnection_instances, "a", _IDBStoreConnection_objectStore_get).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject();
        });
    }
    on(event, callback) {
        if (event === "complete")
            __classPrivateFieldGet(this, _IDBStoreConnection_completeHandlers, "f").push(callback);
    }
    commit() {
        if (__classPrivateFieldGet(this, _IDBStoreConnection_tx, "f") !== null) {
            __classPrivateFieldGet(this, _IDBStoreConnection_tx, "f").commit();
            __classPrivateFieldSet(this, _IDBStoreConnection_tx, null, "f");
        }
    }
}
_IDBStoreConnection_objectStore_get = function _IDBStoreConnection_objectStore_get() {
    if (__classPrivateFieldGet(this, _IDBStoreConnection_tx, "f") === null) {
        __classPrivateFieldSet(this, _IDBStoreConnection_tx, __classPrivateFieldGet(this, _IDBStoreConnection_db, "f").transaction([__classPrivateFieldGet(this, _IDBStoreConnection_objectStoreName, "f")], __classPrivateFieldGet(this, _IDBStoreConnection_mode, "f")), "f");
        __classPrivateFieldGet(this, _IDBStoreConnection_tx, "f").oncomplete = () => {
            __classPrivateFieldGet(this, _IDBStoreConnection_logger, "f").debug(`IDB transaction completed (${__classPrivateFieldGet(this, _IDBStoreConnection_mode, "f")}:${__classPrivateFieldGet(this, _IDBStoreConnection_objectStoreName, "f")}).`);
            for (const handler of __classPrivateFieldGet(this, _IDBStoreConnection_completeHandlers, "f"))
                handler();
        };
    }
    return __classPrivateFieldGet(this, _IDBStoreConnection_tx, "f").objectStore(__classPrivateFieldGet(this, _IDBStoreConnection_objectStoreName, "f"));
};var ImportIcon$1 = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22currentColor%22%20class%3D%22bi%20bi-download%22%20viewBox%3D%220%200%2016%2016%22%3E%20%20%3Cpath%20d%3D%22M.5%209.9a.5.5%200%200%201%20.5.5v2.5a1%201%200%200%200%201%201h12a1%201%200%200%200%201-1v-2.5a.5.5%200%200%201%201%200v2.5a2%202%200%200%201-2%202H2a2%202%200%200%201-2-2v-2.5a.5.5%200%200%201%20.5-.5%22%2F%3E%20%20%3Cpath%20d%3D%22M7.646%2011.854a.5.5%200%200%200%20.708%200l3-3a.5.5%200%200%200-.708-.708L8.5%2010.293V1.5a.5.5%200%200%200-1%200v8.793L5.354%208.146a.5.5%200%201%200-.708.708z%22%2F%3E%3C%2Fsvg%3E";var _AddonToolbox_addon;
const CORE_ADDON_ID = "uwt-core";
const ADDON_APIS = {};
let userHash = 0;
let userName = "Agent";
let language = "en";
const addons = [];
let initialized = false;
const observerHandlers = [];
const initializeUserHash = async () => {
    var _a, _b;
    if (userHash !== 0) {
        throw Error("Cannot reconfigure user hash");
    }
    else {
        let props = {};
        try {
            props = (await makeRequest("GET", "/api/v1/vault/properties")) || {};
        }
        catch (e) {
            console.warn("[W]", "[unified-wf-tools]", "[patch]", "Could not read /api/v1/vault/properties; continuing with defaults:", e);
        }
        const email = props.socialProfile && props.socialProfile.email;
        // a non-zero fallback keeps per-user storage working when the profile cannot be read
        userHash = email ? cyrb53(email) : (userHash || 1);
        userName = (_b = (_a = props.socialProfile) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : "Agent";
        language = props.language || "en";
        return userHash;
    }
};
class CheckboxEditor {
    render(opts) {
        const label = makeChildNode(opts.parent, "label");
        if (opts.help) {
            label.title = opts.help;
            label.classList.add("uwftcore-help-available");
        }
        const checkbox = document.createElement("input");
        label.appendChild(checkbox);
        checkbox.setAttribute("type", "checkbox");
        if (opts.value)
            checkbox.setAttribute("checked", "checked");
        checkbox.addEventListener("change", () => {
            opts.save(!!checkbox.checked);
        });
        makeChildNode(label, "span", ` ${opts.label} `);
    }
}
class SelectBoxEditor {
    constructor(options) {
        Object.defineProperty(this, "options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.options = options;
    }
    render(opts) {
        const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
        if (opts.help) {
            label.title = opts.help;
            label.classList.add("uwftcore-help-available");
        }
        const select = document.createElement("select");
        label.appendChild(select);
        for (const [v, label] of iterObject(this.options)) {
            const option = document.createElement("option");
            option.textContent = label;
            option.value = v;
            select.appendChild(option);
        }
        select.classList.add("uwftcore-fix");
        select.value = opts.value;
        select.addEventListener("change", () => {
            opts.save(select.value);
        });
    }
}
class UnixTimestampDateOnlyEditor {
    render(opts) {
        const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
        if (opts.help) {
            label.title = opts.help;
            label.classList.add("uwftcore-help-available");
        }
        const input = document.createElement("input");
        label.appendChild(input);
        input.classList.add("uwftcore-fix");
        input.setAttribute("type", "date");
        input.value = opts.value ? new Date(opts.value).toISOString().substring(0, 10) : "";
        input.addEventListener("change", () => {
            if (input.value === "")
                opts.clear();
            else
                (opts.save(new Date(input.value).getTime()));
        });
    }
}
class NumericInputEditor {
    constructor(options) {
        Object.defineProperty(this, "options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.options = options;
    }
    render(opts) {
        var _a, _b, _c;
        const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
        if (opts.help) {
            label.title = opts.help;
            label.classList.add("uwftcore-help-available");
        }
        const input = document.createElement("input");
        input.type = "number";
        if (typeof ((_a = this.options) === null || _a === void 0 ? void 0 : _a.min) !== "undefined")
            input.min = this.options.min.toString();
        if (typeof ((_b = this.options) === null || _b === void 0 ? void 0 : _b.max) !== "undefined")
            input.max = this.options.max.toString();
        if (typeof ((_c = this.options) === null || _c === void 0 ? void 0 : _c.step) !== "undefined")
            input.step = this.options.step.toString();
        label.appendChild(input);
        input.classList.add("uwftcore-fix");
        input.value = opts.value.toString();
        input.addEventListener("change", () => {
            var _a, _b;
            if (input.value === "")
                opts.clear();
            else if (((_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.step) !== null && _b !== void 0 ? _b : 1) < 1)
                opts.save(parseFloat(input.value));
            else
                opts.save(parseInt(input.value));
        });
    }
}
class TextInputEditor {
    constructor(options) {
        Object.defineProperty(this, "options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.options = options;
    }
    render(opts) {
        var _a;
        const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
        if (opts.help) {
            label.title = opts.help;
            label.classList.add("uwftcore-help-available");
        }
        const input = document.createElement("input");
        input.type = "text";
        if (typeof ((_a = this.options) === null || _a === void 0 ? void 0 : _a.placeholder) !== "undefined")
            input.placeholder = this.options.placeholder;
        label.appendChild(input);
        input.classList.add("uwftcore-fix");
        input.value = opts.value.toString();
        input.addEventListener("change", () => {
            if (input.value === "")
                opts.clear();
            else
                opts.save(input.value);
        });
    }
}
class ColorInputEditor {
    constructor() { }
    render(opts) {
        const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
        if (opts.help) {
            label.title = opts.help;
            label.classList.add("uwftcore-help-available");
        }
        const input = document.createElement("input");
        input.type = "color";
        label.appendChild(input);
        input.classList.add("uwftcore-fix");
        input.value = opts.value.toString();
        input.addEventListener("change", () => {
            if (input.value === "")
                opts.clear();
            else
                opts.save(input.value);
        });
    }
}
const DISCORD_AUTH_UUID = "04dae49a-ee23-4a62-a18e-bcfa2fbffaed";
class DiscordUserLinkEditor {
    constructor(options) {
        Object.defineProperty(this, "options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.options = options;
    }
    render(opts) {
        const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
        const box = makeChildNode(label, "span");
        box.classList.add("uwftcore-discord-link-box");
        box.classList.add("uwftcore-fix");
        if (opts.help) {
            label.title = opts.help;
            label.classList.add("uwftcore-help-available");
        }
        if (opts.value !== null) {
            const avatar = makeChildNode(box, "img");
            avatar.src = opts.value.avatar;
            makeChildNode(box, "span", opts.value.name);
            const dcButton = makeChildNode(box, "button");
            dcButton.innerHTML = "&#x274C;";
            dcButton.addEventListener("click", (e) => {
                // Somehow the whole box is clickable. This fixes that:
                if (e.offsetX < 0)
                    return;
                if (confirm("Are you sure you want to unlink your Discord account?")) {
                    opts.clear();
                    opts.redraw();
                }
            });
            dcButton.style.marginLeft = "5px";
        }
        else {
            const authButton = document.createElement("button");
            authButton.textContent = "Authenticate";
            authButton.addEventListener("click", (e) => {
                // Somehow the whole box is clickable. This fixes that:
                if (e.offsetX < 0)
                    return;
                if (confirm(this.options.confirmationText)) {
                    const url = URL.parse(this.options.authWindowUrl);
                    const authWindow = window.open(this.options.authWindowUrl);
                    const listener = (e) => {
                        if (e.data.uuid !== DISCORD_AUTH_UUID)
                            return;
                        if (e.origin === url.origin) {
                            authWindow.close();
                            window.removeEventListener("message", listener);
                            const data = e.data.data;
                            opts.save(data);
                            box.removeChild(authButton);
                            opts.redraw();
                            setTimeout(() => {
                                var _a, _b;
                                (_b = (_a = this.options).connectCallback) === null || _b === void 0 ? void 0 : _b.call(_a);
                            }, 10);
                        }
                    };
                    window.addEventListener("message", listener);
                }
            });
            box.appendChild(authButton);
        }
    }
}
class AddonSettings {
    constructor(storage, key, defaults, addEditor) {
        Object.defineProperty(this, "storage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "key", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "defaults", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "addEditor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.storage = storage;
        this.key = key;
        this.defaults = defaults;
        this.addEditor = addEditor;
    }
    get(key) {
        var _a, _b;
        const data = (_a = this.storage.getItem(`uwt-tools-settings-${userHash}`)) !== null && _a !== void 0 ? _a : "{}";
        const props = (_b = JSON.parse(data)[this.key]) !== null && _b !== void 0 ? _b : {};
        if (Object.prototype.hasOwnProperty.call(props, key)) {
            return props[key];
        }
        else {
            return this.defaults[key];
        }
    }
    set(key, value) {
        var _a;
        const data = (_a = this.storage.getItem(`uwt-tools-settings-${userHash}`)) !== null && _a !== void 0 ? _a : "{}";
        const props = JSON.parse(data);
        if (!Object.prototype.hasOwnProperty.call(props, this.key)) {
            props[this.key] = {};
        }
        props[this.key][key] = value;
        const nData = JSON.stringify(props);
        this.storage.setItem(`uwt-tools-settings-${userHash}`, nData);
    }
    clear(key) {
        var _a;
        const data = (_a = this.storage.getItem(`uwt-tools-settings-${userHash}`)) !== null && _a !== void 0 ? _a : "{}";
        const props = JSON.parse(data);
        if (!Object.prototype.hasOwnProperty.call(props, this.key)) {
            props[this.key] = {};
        }
        if (Object.prototype.hasOwnProperty.call(props[this.key], key)) {
            delete props[this.key][key];
        }
        const nData = JSON.stringify(props);
        this.storage.setItem(`uwt-tools-settings-${userHash}`, nData);
    }
    setUserEditable(key, options) {
        this.addEditor(key, { ...options, iface: this });
    }
}
/**
 * Opens an IDB database connection.
 * IT IS YOUR RESPONSIBILITY TO CLOSE THE RETURNED DATABASE CONNECTION WHEN YOU ARE DONE WITH IT.
 * THIS FUNCTION DOES NOT DO THIS FOR YOU - YOU HAVE TO CALL db.close()!
 * @param objectStoreName The name of the object store to open
 * @param version
 */
const getIDBInstance = (objectStoreName, version) => new Promise((resolve, reject) => {
    if (!window.indexedDB) {
        reject("This browser doesn't support IndexedDB!");
        return;
    }
    const logger = new Logger("core:idb");
    const openRequest = indexedDB.open(`uwt-tools-${userHash}`, version);
    openRequest.onsuccess = () => {
        const db = openRequest.result;
        const dbVer = db.version;
        logger.info(`IndexedDB initialization complete (database version ${dbVer}).`);
        if (!db.objectStoreNames.contains(objectStoreName)) {
            db.close();
            logger.info(`Database does not contain column ${objectStoreName}. Closing and incrementing version.`);
            getIDBInstance(objectStoreName, dbVer + 1).then(resolve).catch(reject);
        }
        else {
            resolve(db);
        }
    };
    openRequest.onupgradeneeded = () => {
        logger.info("Upgrading database...");
        const db = openRequest.result;
        if (!db.objectStoreNames.contains(objectStoreName)) {
            db.createObjectStore(objectStoreName, { keyPath: "id" });
        }
    };
});
// ---- redesign patch: hook the PAGE's own XMLHttpRequest/fetch, not the userscript sandbox's copy ----
// With @grant GM.* the script runs in the script manager's sandbox, whose XMLHttpRequest/fetch are
// separate from the ones Wayfarer uses -- so Wayfarer's own requests never reached the hooks.
// (uwtPageWin / uwtPageXHR / uwtGoogle live in utils.ts so that every script can use them.)
console.log("[I]", "[unified-wf-tools]", "[patch]", "hooking the page's own request functions:", uwtPageWin !== window ? "via unsafeWindow" : "same window (no unsafeWindow)");
/** Path of a request URL without origin / query string / trailing slash. */
function uwtPath(u) {
    try {
        const x = new URL(String(u), location.href);
        const path = x.pathname.length > 1 && x.pathname.endsWith("/") ? x.pathname.slice(0, -1) : x.pathname;
        return x.origin === location.origin ? path : String(u);
    }
    catch (_a) {
        return String(u);
    }
}
// ---- redesign patch: remember API responses that arrive before the addons have registered ----
// The redesigned site requests its data very early (e.g. the review). Addons only register their
// listeners after the page has loaded, so without this they would never see the first response.
const uwtBuffered = {};
let uwtAddonsReady = false;
console.log("[I]", "[unified-wf-tools]", "[patch]", "BUILD redesign10 loaded; readyState =", document.readyState, "; time since page start (ms) =", Math.round(performance.now()));
/** Called by the entry point once all addons are registered; stops buffering and frees memory. */
const uwtMarkAddonsReady = () => {
    uwtAddonsReady = true;
    for (const k of Object.keys(uwtBuffered))
        delete uwtBuffered[k];
};
function uwtBufferResponse(method, url, text) {
    if (uwtAddonsReady || String(method).toUpperCase() !== "GET")
        return;
    const path = uwtPath(url);
    if (!/^\/api\/v1\/vault\//.test(path) || typeof text !== "string" || text.length > 8000000)
        return;
    uwtBuffered["GET " + path] = text;
    console.log("[I]", "[unified-wf-tools]", "[patch]", "buffered early response:", path, text.length, "chars");
}
function uwtReplayBuffered(method, url, callback) {
    const text = uwtBuffered[String(method).toUpperCase() + " " + url];
    if (typeof text !== "string")
        return;
    console.log("[I]", "[unified-wf-tools]", "[patch]", "replaying early response to an addon:", method, url);
    setTimeout(() => {
        try {
            const json = JSON.parse(text);
            if (json && !json.captcha)
                callback(json.result);
        }
        catch (e) {
            new Logger("core:toolbox").error(e);
        }
    }, 0);
}
const uwtFetchHandlers = [];
let uwtFetchHookInstalled = false;
const uwtTransportSeen = {};
function uwtNoteTransport(kind, url) {
    if (uwtTransportSeen[kind] || !/\/api\/v1\/vault\//.test(String(url)))
        return;
    uwtTransportSeen[kind] = true;
    console.log("[I]", "[unified-wf-tools]", "[patch]", `Wayfarer API traffic seen via ${kind}:`, String(url));
}
function uwtInstallFetchHook() {
    if (uwtFetchHookInstalled || typeof uwtPageWin.fetch !== "function")
        return;
    uwtFetchHookInstalled = true;
    const originalFetch = uwtPageWin.fetch;
    uwtPageWin.fetch = async function (input, init) {
        let url = "", method = "GET";
        let bodyText;
        try {
            const isReq = typeof Request !== "undefined" && input instanceof Request;
            url = isReq ? input.url : String(input);
            method = String((init && init.method) || (isReq && input.method) || "GET").toUpperCase();
            const u = new URL(url, location.href);
            url = u.origin === location.origin ? u.pathname : url;
            uwtNoteTransport("fetch", url);
            if (init && typeof init.body === "string")
                bodyText = init.body;
            else if (isReq && method !== "GET" && method !== "HEAD")
                bodyText = await input.clone().text();
        }
        catch ( /* never break a request */_a) { /* never break a request */ }
        const mine = uwtFetchHandlers.filter(h => h.url === url && (!h.method || h.method === method));
        for (const h of mine) {
            if (h.filter) {
                let allowed = true;
                try {
                    allowed = h.filter(bodyText);
                }
                catch (_b) {
                    allowed = true;
                }
                if (!allowed) {
                    new Logger("core:toolbox").warn(`A Wayfarer Tools addon blocked a ${method} request to ${url}!`);
                    throw new TypeError("Request blocked by Wayfarer Tools");
                }
            }
        }
        let response = await originalFetch.apply(this, arguments);
        if (!uwtAddonsReady && method === "GET" && /^\/api\/v1\/vault\//.test(url)) {
            try {
                uwtBufferResponse(method, url, await response.clone().text());
            }
            catch ( /* ignore */_c) { /* ignore */ }
        }
        const reading = mine.filter(h => !h.filter);
        if (!reading.length)
            return response;
        try {
            let text = await response.clone().text();
            for (const h of reading) {
                try {
                    const json = JSON.parse(text);
                    if (!json || json.captcha)
                        continue;
                    if (h.manipulate) {
                        json.result = h.manipulate(json.result);
                        text = JSON.stringify(json);
                        response = new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers });
                    }
                    else if (h.onResponse) {
                        h.onResponse(json, bodyText);
                    }
                }
                catch (e) {
                    new Logger("core:toolbox").error(e);
                }
            }
        }
        catch ( /* unreadable body -- leave the response alone */_d) { /* unreadable body -- leave the response alone */ }
        return response;
    };
}
(function (open) {
    // note which transport the site really uses (shown once in the console)
    const seenUrls = new Set();
    uwtPageXHR.prototype.open = function (m, u) {
        uwtNoteTransport("XMLHttpRequest", u);
        if (/\/api\/v1\/vault\//.test(String(u)) && !seenUrls.has(m + " " + u) && seenUrls.size < 60) {
            seenUrls.add(m + " " + u);
            console.log("[I]", "[unified-wf-tools]", "[patch]", "API request:", m, String(u));
        }
        if (!uwtAddonsReady && /\/api\/v1\/vault\//.test(String(u))) {
            this.addEventListener("load", function () {
                try {
                    uwtBufferResponse(m, u, typeof this.response === "string" ? this.response : (this.responseType === "" || this.responseType === "text" ? this.responseText : undefined));
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }, false);
        }
        return open.apply(this, arguments);
    };
})(uwtPageXHR.prototype.open);
uwtInstallFetchHook();
const getNotificationDiv = () => {
    const div = document.getElementById("uwftcore-notifications");
    if (div)
        return div;
    const nc = makeChildNode(document.getElementsByTagName("body")[0], "div");
    nc.id = "uwftcore-notifications";
    return nc;
};
// ---- redesign: addons can add sections (e.g. the list of active plugins) at the top of the settings window ----
const settingsSections = [];
// ---- redesign: the old sidebar (app-sidebar-link) is gone. Sidebar items and addon menu items are all
// shown in the Wayfarer Tools menu, opened with the button at the bottom left (see uwtAddLauncher) ----
const menuItems = {};
const importers = [];
const addSidebarItem = (id, item) => {
    if (id in menuItems) {
        throw new Error(`Tried to add already existing menu item ${id}`);
    }
    menuItems[id] = { label: item.label, icon: item.imageUrl, callback: item.callback };
};
function makeRequest(method, url, body) {
    const logger = new Logger("core:toolbox");
    return new Promise((resolve, reject) => {
        const send = (xsrfCookie) => {
            const req = new XMLHttpRequest();
            req.open(method, url, true);
            req.setRequestHeader("Content-Type", "application/json");
            req.setRequestHeader("Accept", "application/json, text/plain, */*");
            req.setRequestHeader("x-angular", "");
            if (xsrfCookie)
                req.setRequestHeader("X-CSRF-TOKEN", xsrfCookie);
            req.addEventListener("error", () => reject(new Error("Network error")));
            req.addEventListener("load", () => {
                try {
                    const data = JSON.parse(req.responseText).result;
                    if (req.status >= 200 && req.status < 400) {
                        resolve(data);
                    }
                    else {
                        reject(new Error(`Error response code ${req.status}: ${req.responseText}`));
                    }
                }
                catch (_a) {
                    reject(new Error(`Unreadable response (status ${req.status}): ${String(req.responseText).slice(0, 200)}`));
                }
            });
            if (typeof body !== "undefined") {
                req.send(JSON.stringify(body));
            }
            else {
                req.send();
            }
        };
        const parseDocumentCookie = () => {
            logger.debug("Using document.cookie to access XSRF cookie");
            const cookies = document.cookie.split(";").map(c => c.trim());
            for (const cookie of cookies) {
                const [k, v] = cookie.split("=", 2);
                if (k === "XSRF-TOKEN")
                    return decodeURIComponent(v);
            }
        };
        if (method === "GET") {
            // No CSRF header for GET requests
            send();
        }
        else if (window.cookieStore) {
            logger.debug("Using cookieStore to access XSRF cookie");
            window.cookieStore.get("XSRF-TOKEN").then(cookie => {
                send(cookie === null || cookie === void 0 ? void 0 : cookie.value);
            }).catch(() => {
                send(parseDocumentCookie());
            });
        }
        else {
            send(parseDocumentCookie());
        }
    });
}
class AddonToolbox {
    constructor(addon) {
        _AddonToolbox_addon.set(this, void 0);
        Object.defineProperty(this, "makeRequest", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: makeRequest
        });
        __classPrivateFieldSet(this, _AddonToolbox_addon, addon, "f");
    }
    interceptOpen(method, url, callback) {
        (function (open) {
            uwtPageXHR.prototype.open = function (m, u) {
                if (uwtPath(u) === url && String(m).toUpperCase() === String(method).toUpperCase()) {
                    this.addEventListener("load", callback, false);
                }
                const args = arguments;
                open.apply(this, args);
            };
        })(uwtPageXHR.prototype.open);
    }
    interceptOpenJson(method, url, callback) {
        if (typeof url !== "string")
            throw Error("Invalid URL type");
        function handle(_event) {
            try {
                const resp = this.response;
                const json = JSON.parse(resp);
                if (!json)
                    return;
                if (json.captcha)
                    return;
                callback(json.result);
            }
            catch (e) {
                const logger = new Logger("core:toolbox");
                logger.error(e);
            }
        }
        this.interceptOpen(method, url, handle);
        uwtFetchHandlers.push({ method, url, onResponse: (json) => callback(json.result) });
        uwtReplayBuffered(method, url, callback);
    }
    manipulateOpenJson(method, url, callback) {
        if (typeof url !== "string")
            throw Error("Invalid URL type");
        function handle(_event) {
            try {
                const resp = this.response;
                const json = JSON.parse(resp);
                if (!json)
                    return;
                if (json.captcha)
                    return;
                const nv = callback(json.result);
                json.result = nv;
                Object.defineProperty(this, "response", { writable: true });
                this.response = JSON.stringify(json);
                Object.defineProperty(this, "response", { writable: false });
            }
            catch (e) {
                const logger = new Logger("core:toolbox");
                logger.error(e);
            }
        }
        this.interceptOpen(method, url, handle);
        uwtFetchHandlers.push({ method, url, manipulate: (result) => callback(result) });
    }
    interceptSend(url, callback) {
        (function (send) {
            uwtPageXHR.prototype.send = function (body) {
                this.addEventListener("load", function (e) {
                    if (uwtPath(this.responseURL) === url) {
                        callback(body, this, e);
                    }
                }, false);
                const args = arguments;
                send.apply(this, args);
            };
        })(uwtPageXHR.prototype.send);
    }
    filterSend(method, url, filter) {
        const addonId = __classPrivateFieldGet(this, _AddonToolbox_addon, "f").id;
        (function (open) {
            uwtPageXHR.prototype.open = function (m, u) {
                this._uwtTools = {
                    method: m,
                    url: u,
                };
                const args = arguments;
                open.apply(this, args);
            };
        })(uwtPageXHR.prototype.open);
        (function (send) {
            uwtPageXHR.prototype.send = function (body) {
                if (!this._uwtTools || String(this._uwtTools.method).toUpperCase() !== String(method).toUpperCase() || uwtPath(this._uwtTools.url) !== url || filter(body, this)) {
                    const args = arguments;
                    send.apply(this, args);
                }
                else {
                    const logger = new Logger("core:toolbox");
                    logger.warn(`Wayfarer Tools addon ${addonId} blocked a ${method} request to ${url}!`);
                }
            };
        })(uwtPageXHR.prototype.send);
    }
    interceptSendJson(url, callback) {
        function handle(data, request, _event) {
            try {
                const resp = request.response;
                const jSent = JSON.parse(data);
                const jRecv = JSON.parse(resp);
                if (!jRecv)
                    return;
                if (jRecv.captcha)
                    return;
                callback(jSent, jRecv.result);
            }
            catch (e) {
                const logger = new Logger("core:toolbox");
                logger.error(e);
            }
        }
        this.interceptSend(url, handle);
        uwtFetchHandlers.push({
            url,
            onResponse: (jRecv, bodyText) => {
                if (typeof bodyText !== "string")
                    return;
                callback(JSON.parse(bodyText), jRecv.result);
            },
        });
    }
    filterSendJson(method, url, callback) {
        function handle(data) {
            try {
                const jSent = JSON.parse(data);
                return callback(jSent);
            }
            catch (e) {
                const logger = new Logger("core:toolbox");
                logger.error(e);
                return true;
            }
        }
        this.filterSend(method, url, handle);
        uwtFetchHandlers.push({ method, url, filter: (bodyText) => (typeof bodyText === "string" ? handle(bodyText) : true) });
    }
    observeAddedNodes(nodeName, callback) {
        observerHandlers.push({ nodeName, callback });
    }
    observeNodeAttributeChanges(nodeName, attributeFilter, callback) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.target.nodeName === nodeName) {
                    callback(mutation.target);
                }
            }
        });
        observer.observe(document, {
            attributeFilter,
            childList: true,
            subtree: true,
        });
    }
    /** Adds a section at the top of the Wayfarer Tools settings window (opened with the gear button). */
    addSettingsSection(render) {
        settingsSections.push(render);
    }
    listAvailableAddons() {
        return addons.map((a) => {
            const copy = { ...a };
            delete copy.defaultConfig;
            delete copy.sessionData;
            delete copy.initialize;
            return copy;
        });
    }
    notify(options) {
        var _a;
        const div = getNotificationDiv();
        const message = typeof options.message === "string" ? document.createTextNode(options.message) : options.message;
        const notification = makeChildNode(div, "div");
        notification.classList.add("uwftcore-notification", `uwftcore-nbg-${options.color}`);
        if ((_a = options.dismissable) !== null && _a !== void 0 ? _a : true) {
            notification.addEventListener("click", () => notification.remove());
        }
        const contentWrapper = makeChildNode(notification, "div");
        contentWrapper.classList.add("uwftcore-notify-content-wrapper");
        if (typeof options.icon !== "undefined") {
            const iconWrapper = makeChildNode(contentWrapper, "div");
            iconWrapper.classList.add("uwftcore-notify-icon-wrapper");
            const img = makeChildNode(iconWrapper, "img");
            img.src = options.icon;
        }
        const content = makeChildNode(contentWrapper, "div");
        content.appendChild(message);
        return {
            dismiss: () => notification.remove(),
            updateContents: (message) => {
                for (let i = content.childNodes.length - 1; i >= 0; i--) {
                    content.childNodes[i].remove();
                }
                content.appendChild(typeof message === "string"
                    ? document.createTextNode(message)
                    : message);
            },
        };
    }
    addSidebarItem(id, item) {
        addSidebarItem(`addon-${__classPrivateFieldGet(this, _AddonToolbox_addon, "f").id}-${id}`, item);
    }
    /** Adds an entry to the Wayfarer Tools menu (the button at the bottom left). */
    addMenuItem(id, item) {
        menuItems[`addon-${__classPrivateFieldGet(this, _AddonToolbox_addon, "f").id}-${id}`] = item;
    }
    async createModal(...cssClasses) {
        const body = await untilTruthy(() => document.querySelector("body"));
        const outer = makeChildNode(body, "div");
        outer.classList.add("uwftcore-fullscreen-overlay");
        const inner = makeChildNode(outer, "div");
        inner.classList.add("uwftcore-fullscreen-inner", ...cssClasses);
        return {
            container: inner,
            dismiss: () => outer.remove(),
        };
    }
    addImporter(importer) {
        importers.push(importer);
        if (!("core-importer" in menuItems)) {
            addSidebarItem("core-importer", {
                imageUrl: ImportIcon$1,
                label: "Import Data",
                callback: async () => {
                    const { container, dismiss } = await this.createModal("uwftcore-modal-common", "uwftcore-import-options");
                    makeChildNode(container, "h1", "Import data to Wayfarer Tools");
                    makeChildNode(container, "p", "Please select the kind of data you want to import.");
                    for (const method of importers) {
                        const btn = makeChildNode(container, "div");
                        btn.classList.add("uwftcore-import-method");
                        if (typeof method.icon !== "undefined") {
                            btn.style.paddingLeft = "60px";
                            btn.style.backgroundImage = `url(${method.icon})`;
                        }
                        makeChildNode(btn, "p", method.title).classList.add("uwftcore-import-method-title");
                        makeChildNode(btn, "p", method.description).classList.add("uwftcore-import-method-desc");
                        btn.addEventListener("click", () => {
                            dismiss();
                            method.callback();
                        });
                    }
                },
            });
        }
    }
    get username() {
        return userName;
    }
    get l10n() {
        let i18n = {};
        try {
            i18n = JSON.parse(localStorage["@transloco/translations"] || "{}");
        }
        catch ( /* fall back to empty translations */_a) { /* fall back to empty translations */ }
        return i18n[language] || {};
    }
    i18nPrefixResolver(prefix) {
        const l10n = this.l10n;
        return (id) => l10n[prefix + id];
    }
    async openIDB(objectStoreName, mode) {
        const scopedOSN = `${__classPrivateFieldGet(this, _AddonToolbox_addon, "f").id}-${objectStoreName}`;
        const db = await getIDBInstance(scopedOSN);
        return new IDBStoreConnection(db, scopedOSN, mode);
    }
    get session() {
        return new AddonSettings(sessionStorage, __classPrivateFieldGet(this, _AddonToolbox_addon, "f").id, __classPrivateFieldGet(this, _AddonToolbox_addon, "f").sessionData, () => { });
    }
    getAddonAPI(addon) {
        return ADDON_APIS[addon];
    }
}
_AddonToolbox_addon = new WeakMap();
const register = () => (addon) => addons.push(addon);
const initializeAllAddons = () => {
    const logger = new Logger("core:init");
    if (initialized) {
        throw new Error("Addons have already been initialized!");
    }
    initialized = true;
    const coreSettings = new AddonSettings(localStorage, CORE_ADDON_ID, { activePlugins: [] }, () => { });
    const toInitialize = [
        CORE_ADDON_ID,
        ...coreSettings.get("activePlugins").filter(n => n !== CORE_ADDON_ID),
    ];
    logger.info("Creating shared MutationObserver");
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                for (const handler of observerHandlers) {
                    if (node.nodeName === handler.nodeName) {
                        handler.callback(node);
                    }
                }
            }
        }
    });
    observer.observe(document, {
        childList: true,
        subtree: true,
    });
    logger.info("Preparing to initialize addons", toInitialize);
    const options = {};
    for (const addon of addons) {
        if (toInitialize.includes(addon.id)) {
            logger.info(`Initializing addon ${addon.id}...`);
            try {
                const api = addon.initialize(new AddonToolbox(addon), new Logger(`addon:${addon.id}`), new AddonSettings(localStorage, addon.id, addon.defaultConfig, (key, opts) => {
                    if (!(addon.id in options)) {
                        options[addon.id] = { addon, options: {} };
                    }
                    options[addon.id].options[key] = opts;
                }));
                if (api) {
                    ADDON_APIS[addon.id] = api;
                }
            }
            catch (err) {
                logger.error(`Addon ${addon.id} failed to initialize and was skipped:`, err);
            }
        }
    }
    if (Object.keys(options).length > 0) {
        logger.info("Hooking settings editor...");
        const toolbox = new AddonToolbox({});
        toolbox.interceptOpenJson("GET", "/api/v1/vault/settings", renderEditors(Object.values(options)));
        uwtAddLauncher(Object.values(options));
    }
    logger.info("Addon initialization done.");
};
const renderEditors = (options) => async () => {
    // old settings page only; the redesigned site has no <app-settings> (see uwtAddSettingsButton)
    const ref = document.querySelector("app-settings");
    if (!ref)
        return;
    const box = makeChildNode(ref, "div");
    box.classList.add("max-w-md");
    box.id = "uwftoolsMainPluginSettingsPane";
    const header = makeChildNode(box, "h3", "Plugin Settings");
    header.classList.add("wf-page-header");
    uwtFillSettingsPane(box, options);
};
// ---- redesign: one button at the bottom left opens the Wayfarer Tools menu. It lists the entries addons
// add (toolbox.addMenuItem / addSidebarItem / addImporter) and, last, the settings window. ----
const UWT_TOOLS_ICON = "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"/></svg>";
const UWT_SETTINGS_ICON = "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"3\"></circle><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"></path></svg>";
function uwtMakeMenuItem(parent, item) {
    const button = makeChildNode(parent, "button");
    button.type = "button";
    button.className = "uwt-menu-item";
    const icon = makeChildNode(button, "span");
    icon.className = "uwt-menu-icon";
    if (item.icon.trimStart().startsWith("<svg")) {
        icon.innerHTML = item.icon;
    }
    else {
        makeChildNode(icon, "img").src = item.icon;
    }
    makeChildNode(button, "span", item.label);
    return button;
}
async function uwtOpenSettingsWindow(options) {
    if (!document.getElementById("uwt-settings-style")) {
        const st = document.createElement("style");
        st.id = "uwt-settings-style";
        st.textContent = `
      .uwt-settings-modal{background:#fff !important;color:#111827 !important;font-size:15px}
      .uwt-settings-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}
      .uwt-settings-modal .uwt-settings-close{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}
      .uwt-settings-modal .uwt-settings-close:hover{opacity:1}
      .uwt-settings-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.8rem}
      .uwt-settings-modal .settings-item{margin-bottom:1.2rem;padding-bottom:.6rem;border-bottom:1px solid rgba(128,128,128,.3)}
      .uwt-settings-modal .settings-item__header{font-weight:bold;margin-bottom:.4rem}
      .uwt-settings-modal input[type=text],.uwt-settings-modal input[type=number],.uwt-settings-modal select{
        border:1px solid #9ca3af;border-radius:4px;padding:2px 6px;background:#fff;color:#111827}`;
        document.head.appendChild(st);
    }
    const { container, dismiss } = await new AddonToolbox({}).createModal("uwt-settings-modal");
    if (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")) {
        container.classList.add("uwt-dark");
    }
    container.style.width = "min(900px, calc(100vw - 50px))";
    container.style.height = "min(720px, calc(100vh - 50px))";
    container.style.maxHeight = "none";
    const close = makeChildNode(container, "button", "\u00d7");
    close.className = "uwt-settings-close";
    close.addEventListener("click", dismiss);
    makeChildNode(container, "h2", "Wayfarer Tools settings");
    makeChildNode(container, "p", "Changes are saved immediately. Reload the page for newly enabled or disabled addons to take effect.").style.marginBottom = "1rem";
    const box = makeChildNode(container, "div");
    box.id = "uwftoolsMainPluginSettingsPane";
    for (const render of settingsSections) {
        try {
            render(makeChildNode(box, "div"));
        }
        catch (e) {
            new Logger("core:settings").error(e);
        }
    }
    uwtFillSettingsPane(box, options);
}
// ---- redesign: diagnostic. Writes an outline of the page's current structure (data-testid values, roles,
// control labels, custom elements) so that addons that change the review pages can be written against the
// real markup. Text content is not included, except for the labels of buttons, headings and similar controls. ----
const UWT_REPORT_SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "LINK", "META", "TEMPLATE", "PATH", "BR", "HR"]);
const UWT_REPORT_STRUCT = new Set([
    "BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "LABEL", "H1", "H2", "H3", "H4", "H5", "H6", "IMG", "VIDEO", "CANVAS",
    "IFRAME", "FORM", "DIALOG", "TABLE", "UL", "OL", "LI", "NAV", "MAIN", "HEADER", "FOOTER", "SECTION", "ARTICLE",
    "ASIDE", "SUMMARY", "DETAILS", "FIELDSET", "LEGEND", "OPTION", "SVG",
]);
const UWT_REPORT_LABELLED = new Set(["BUTTON", "A", "LABEL", "H1", "H2", "H3", "H4", "H5", "H6", "LEGEND", "SUMMARY", "OPTION"]);
const UWT_REPORT_ROLES = new Set(["button", "tab", "radio", "checkbox", "menuitem", "option", "switch", "link"]);
function uwtIsOwnUi(el) {
    var _a;
    return /(^|\s)(uwt|uwf)/.test(el.id) || /(^|\s)(uwt|uwf)/.test((_a = el.getAttribute("class")) !== null && _a !== void 0 ? _a : "");
}
function uwtPageReport() {
    const MAX_LINES = 900;
    const lines = [];
    const testIds = new Map();
    const customTags = new Map();
    const clip = (t, n) => (t.length > n ? `${t.slice(0, n)}...` : t);
    const labelText = (el) => { var _a; return ((_a = el.textContent) !== null && _a !== void 0 ? _a : "").trim().replace(/\s+/g, " "); };
    const describe = (el) => {
        var _a, _b;
        const tag = el.tagName.toLowerCase();
        const parts = [tag];
        const attr = (name, label = name) => {
            const v = el.getAttribute(name);
            if (v)
                parts.push(`${label}="${clip(v, 60)}"`);
        };
        attr("id");
        attr("data-testid");
        attr("role");
        attr("aria-label");
        attr("type");
        attr("name");
        attr("placeholder");
        attr("aria-checked");
        attr("aria-expanded");
        attr("aria-selected");
        if (el.disabled)
            parts.push("disabled");
        const cls = el.getAttribute("class");
        if (cls && el.tagName !== "svg")
            parts.push(`class="${clip(cls.trim().replace(/\s+/g, " "), 100)}"`);
        if (el instanceof HTMLImageElement && el.src) {
            try {
                parts.push(`src-host=${new URL(el.src, location.href).hostname}`);
            }
            catch ( /* ignore */_c) { /* ignore */ }
        }
        const role = (_a = el.getAttribute("role")) !== null && _a !== void 0 ? _a : "";
        if (UWT_REPORT_LABELLED.has(el.tagName) || UWT_REPORT_ROLES.has(role)) {
            const t = labelText(el);
            if (t)
                parts.push(`text="${clip(t, 50)}"`);
        }
        else {
            let own = 0;
            for (const n of Array.from(el.childNodes))
                if (n.nodeType === Node.TEXT_NODE)
                    own += ((_b = n.textContent) !== null && _b !== void 0 ? _b : "").trim().length;
            if (own > 0)
                parts.push(`own-text(${own} chars)`);
        }
        return parts.join(" ");
    };
    const hasOwnText = (el) => Array.from(el.childNodes).some(n => { var _a; return n.nodeType === Node.TEXT_NODE && ((_a = n.textContent) !== null && _a !== void 0 ? _a : "").trim().length > 0; });
    const interesting = (el) => el.hasAttribute("data-testid") || !!el.id || el.hasAttribute("role") || el.hasAttribute("aria-label") ||
        UWT_REPORT_STRUCT.has(el.tagName.toUpperCase()) || el.tagName.includes("-") || hasOwnText(el);
    const signature = (el) => { var _a, _b, _c; return `${el.tagName}|${(_a = el.getAttribute("data-testid")) !== null && _a !== void 0 ? _a : ""}|${(_b = el.getAttribute("role")) !== null && _b !== void 0 ? _b : ""}|${((_c = el.getAttribute("class")) !== null && _c !== void 0 ? _c : "").slice(0, 40)}`; };
    const walk = (el, depth) => {
        var _a, _b;
        if (lines.length >= MAX_LINES || depth > 16)
            return;
        const upper = el.tagName.toUpperCase();
        if (UWT_REPORT_SKIP.has(upper) || uwtIsOwnUi(el))
            return;
        const show = interesting(el);
        if (show) {
            lines.push(`${"  ".repeat(depth)}${describe(el)}`);
            const tid = el.getAttribute("data-testid");
            if (tid)
                testIds.set(tid, ((_a = testIds.get(tid)) !== null && _a !== void 0 ? _a : 0) + 1);
            if (el.tagName.includes("-"))
                customTags.set(el.tagName.toLowerCase(), ((_b = customTags.get(el.tagName.toLowerCase())) !== null && _b !== void 0 ? _b : 0) + 1);
            if (upper === "SVG")
                return;
        }
        // labelled controls are described by their text already; only look inside them for further controls
        let previous = "";
        let repeats = 0;
        const children = Array.from(el.children);
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const sig = signature(child);
            if (sig === previous) {
                repeats++;
                if (repeats >= 2 && interesting(child)) {
                    // collapse long runs of identical siblings (list rows and the like)
                    let j = i;
                    while (j + 1 < children.length && signature(children[j + 1]) === sig)
                        j++;
                    if (j > i || repeats >= 2) {
                        lines.push(`${"  ".repeat(depth + (show ? 1 : 0))}... (+${j - i + 1} similar ${child.tagName.toLowerCase()})`);
                        i = j;
                        continue;
                    }
                }
            }
            else {
                previous = sig;
                repeats = 0;
            }
            walk(child, depth + (show ? 1 : 0));
        }
    };
    walk(document.body, 0);
    const header = [
        "Wayfarer Tools page structure report",
        `page: ${location.pathname}`,
        `title: ${document.title}`,
        `viewport: ${window.innerWidth}x${window.innerHeight} | dark mode: ${document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")}`,
        `data-testid values: ${Array.from(testIds.entries()).map(([k, v]) => (v > 1 ? `${k} (x${v})` : k)).join(", ") || "none"}`,
        `custom elements: ${Array.from(customTags.entries()).map(([k, v]) => `${k} (x${v})`).join(", ") || "none"}`,
        `open dialogs: ${document.querySelectorAll("dialog[open], [role=dialog], [aria-modal=true]").length}`,
        lines.length >= MAX_LINES ? `(outline cut off after ${MAX_LINES} lines)` : "",
        "----",
    ].filter(Boolean);
    return `${header.join("\n")}\n${lines.join("\n")}\n`;
}
async function uwtShowPageReport() {
    const report = uwtPageReport();
    const { container, dismiss } = await new AddonToolbox({}).createModal("uwt-report-modal");
    const close = makeChildNode(container, "button", "\u00d7");
    close.className = "uwt-report-close";
    close.addEventListener("click", dismiss);
    makeChildNode(container, "h2", "Page structure report");
    makeChildNode(container, "p", "An outline of the structure of the page you are on. It contains element names, test ids and the labels of buttons and headings, but no other page text and no input values. Copy it and share it so that addons can be adapted to this page.");
    const area = makeChildNode(container, "textarea");
    area.className = "uwt-report-text";
    area.readOnly = true;
    area.value = report;
    const copy = makeChildNode(container, "button", "Copy to clipboard");
    copy.className = "uwftcore-ui-button";
    copy.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(report);
            copy.textContent = "Copied!";
        }
        catch (_a) {
            area.select();
            copy.textContent = "Select the text and copy it";
        }
    });
}
function uwtAddLauncher(options) {
    if (document.getElementById("uwt-menu-button"))
        return;
    menuItems["core-page-report"] = {
        label: "Page structure report",
        icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"/><polyline points=\"14 2 14 8 20 8\"/><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"/></svg>",
        callback: () => { void uwtShowPageReport(); },
    };
    const btn = document.createElement("button");
    btn.id = "uwt-menu-button";
    btn.type = "button";
    btn.title = "Wayfarer Tools";
    btn.innerHTML = UWT_TOOLS_ICON;
    const menu = document.createElement("div");
    menu.id = "uwt-menu";
    menu.hidden = true;
    const closeMenu = () => {
        menu.hidden = true;
        btn.classList.remove("uwt-open");
    };
    // rebuilt each time it opens, so entries added by addons after startup are included
    const openMenu = () => {
        menu.innerHTML = "";
        const items = Object.values(menuItems).sort((a, b) => a.label.localeCompare(b.label));
        for (const item of items) {
            uwtMakeMenuItem(menu, item).addEventListener("click", () => {
                closeMenu();
                item.callback();
            });
        }
        if (items.length > 0)
            makeChildNode(menu, "div").className = "uwt-menu-sep";
        uwtMakeMenuItem(menu, { label: "Settings", icon: UWT_SETTINGS_ICON}).addEventListener("click", () => {
            closeMenu();
            void uwtOpenSettingsWindow(options);
        });
        menu.hidden = false;
        btn.classList.add("uwt-open");
    };
    btn.addEventListener("click", () => {
        if (menu.hidden)
            openMenu();
        else
            closeMenu();
    });
    document.addEventListener("click", (e) => {
        if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target))
            closeMenu();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape")
            closeMenu();
    });
    document.body.append(menu, btn);
}
function uwtFillSettingsPane(box, options) {
    for (const entry of options) {
        const entryBox = makeChildNode(box, "div");
        entryBox.classList.add("settings__item");
        entryBox.classList.add("settings-item");
        const entryHeader = makeChildNode(entryBox, "div");
        entryHeader.classList.add("settings-item__header");
        makeChildNode(entryHeader, "div", entry.addon.name);
        const entryBody = makeChildNode(entryBox, "div");
        entryBody.classList.add("settings-item__description");
        for (const [key, option] of iterObject(entry.options)) {
            const lineItem = makeChildNode(entryBody, "div");
            lineItem.classList.add("uwftcore-option-line");
            option.editor.render({
                value: option.iface.get(key),
                parent: lineItem,
                save(v) {
                    option.iface.set(key, v);
                    this.value = v;
                },
                clear() {
                    option.iface.clear(key);
                    this.value = option.iface.get(key);
                },
                redraw() {
                    this.parent.innerHTML = "";
                    option.editor.render(this);
                },
                ...option,
            });
        }
    }
}var A = "ÀÁÂÃÅÄĀĂĄǍǞǠǺȀȂȦ";
var C = "ÇĆĈĊČ";
var D = "Ď";
var E = "ÈÊËÉĒĔĖĘĚȄȆȨ";
var G = "ĜĞĠĢǦǴ";
var H = "ĤȞ";
var I = "ÌÍÎÏĨĪĬĮİǏȈȊ";
var J = "Ĵ";
var K = "ĶǨ";
var L = "ĹĻĽ";
var N = "ÑŃŅŇǸ";
var O = "ÒÔÕÓÖŌŎŐƠǑǪǬȌȎȪȬȮȰ";
var R = "ŔŖŘȐȒ";
var S = "ŚŜŞŠȘ";
var T = "ŢŤȚ";
var U = "ÙÚÛÜŨŪŬŮŰŲƯǓǕǗǙǛȔȖ";
var W = "Ŵ";
var Y = "ÝŶŸȲ";
var Z = "ŹŻŽ";
var a = "àáâãåäāăąǎǟǡǻȁȃȧ";
var c = "çćĉċč";
var d = "ď";
var e = "èêëéēĕėęěȅȇȩ";
var g = "ĝğġģǧǵ";
var h = "ĥȟ";
var i = "ìíîïĩīĭįǐȉȋ";
var j = "ĵǰ";
var k = "ķǩ";
var l = "ĺļľ";
var n = "ñńņňǹ";
var o = "òôõóöōŏőơǒǫǭȍȏȫȭȯȱ";
var r = "ŕŗřȑȓ";
var s = "śŝşšș";
var t = "ţťț";
var u = "ùúûüũūŭůűųưǔǖǘǚǜȕȗ";
var w = "ŵ";
var y = "ýÿŷȳ";
var z = "źżž";
var diacritics = {
	A: A,
	C: C,
	D: D,
	E: E,
	G: G,
	H: H,
	I: I,
	J: J,
	K: K,
	L: L,
	N: N,
	O: O,
	R: R,
	S: S,
	T: T,
	U: U,
	W: W,
	Y: Y,
	Z: Z,
	a: a,
	c: c,
	d: d,
	e: e,
	g: g,
	h: h,
	i: i,
	j: j,
	k: k,
	l: l,
	n: n,
	o: o,
	r: r,
	s: s,
	t: t,
	u: u,
	w: w,
	y: y,
	z: z,
	"Æ": "ǢǼ",
	"Ø": "Ǿ",
	"æ": "ǣǽ",
	"ø": "ǿ",
	"Ʒ": "Ǯ",
	"ʒ": "ǯ",
	"'": "\""
};class InvalidEmailFormatError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidEmailFormatError";
    }
}
class InvalidContentTypeError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidContentTypeError";
    }
}
class NotImplementedError extends Error {
    constructor(message) {
        super(message);
        this.name = "NotImplementedError";
    }
}
class EmailImportError extends Error {
    constructor(message) {
        super(message);
        this.name = "EmailImportError";
    }
}
class HeaderNotFoundError extends EmailImportError {
    constructor(message) {
        super(message);
        this.name = "HeaderNotFoundError";
    }
}
class EmailClassificationError extends Error {
    constructor(message) {
        super(message);
        this.name = "EmailClassificationError";
    }
}
class DisambiguationFailedError extends EmailClassificationError {
    constructor(message) {
        super(message);
        this.name = "DisambiguationFailedError";
    }
}
class NoMatchingTemplateError extends EmailClassificationError {
    constructor(message) {
        super(message);
        this.name = "NoMatchingTemplateError";
    }
}const ENCODED_WORD_REGEX = /=\?([A-Za-z0-9-]+)\?([QqBb])\?([^?]+)\?=(?:\s+(?==\?[A-Za-z0-9-]+\?[QqBb]\?[^?]+\?=))?/g;
const extractEmail = (headerValue) => {
    // Technically not spec-compliant
    const sb = headerValue.lastIndexOf("<");
    const eb = headerValue.lastIndexOf(">");
    if (sb < 0 && eb < 0)
        return headerValue;
    return headerValue.substring(sb + 1, eb);
};
const parseMIME = (data) => {
    const bound = data.indexOf("\r\n\r\n");
    if (bound < 0)
        throw new InvalidEmailFormatError("Cannot find boundary between headers and body");
    const headers = data.substring(0, bound).replace(/\r\n\s/g, " ").split(/\r\n/).map((h) => parseHeader(h));
    const body = data.substring(bound + 4);
    return new Email(headers, body);
};
const parseHeader = (headerLine) => {
    const b = headerLine.indexOf(":");
    const token = headerLine.substring(0, b);
    // Decode RFC 2047 atoms
    const field = headerLine
        .substring(b + 1)
        .trim()
        .replace(ENCODED_WORD_REGEX, (_, c, e, t) => parseEncodedWord(c, e, t));
    return {
        name: token,
        value: field.trim(),
    };
};
const parseEncodedWord = (charset, encoding, text) => {
    switch (encoding) {
        case "Q":
        case "q":
            return new TextDecoder(charset).decode(qpStringToU8A(text.split("_").join(" ")));
        case "B":
        case "b":
            return charset.toLowerCase() == "utf-8" ? atobUTF8(text) : atob(text);
        default:
            throw new InvalidEmailFormatError(`Invalid RFC 2047 encoding format: ${encoding}`);
    }
};
const qpStringToU8A = (str) => {
    const u8a = new Uint8Array(str.length - (2 * (str.split("=").length - 1)));
    for (let i = 0, j = 0; i < str.length; i++, j++) {
        if (str[i] !== "=") {
            u8a[j] = str.codePointAt(i);
        }
        else {
            u8a[j] = parseInt(str.substring(i + 1, i + 3), 16);
            i += 2;
        }
    }
    return u8a;
};
// https://stackoverflow.com/a/30106551/1955334
const atobUTF8 = (text) => decodeURIComponent(atob(text)
    .split("")
    .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
    .join(""));
const decodeBodyUsingCTE = (body, cte, charset) => {
    switch (cte) {
        case null:
            return body;
        case "quoted-printable":
            return unfoldQuotedPrintable(body, charset);
        case "base64":
            return charset.toLowerCase() === "utf-8" ? atobUTF8(body) : atob(body);
        default:
            throw new NotImplementedError(`Unknown Content-Transfer-Encoding ${cte}`);
    }
};
const unfoldQuotedPrintable = (body, charset) => {
    // Unfold QP CTE
    const td = new TextDecoder(charset);
    return body
        .split(/=\r?\n/).join("")
        .split(/\r?\n/).map((line) => td.decode(qpStringToU8A(line)))
        .join("\n");
};var EmailType;
(function (EmailType) {
    EmailType["CHALLENGE_REWARD"] = "CHALLENGE_REWARD";
    EmailType["EDIT_APPEAL_DECIDED"] = "EDIT_APPEAL_DECIDED";
    EmailType["EDIT_APPEAL_RECEIVED"] = "EDIT_APPEAL_RECEIVED";
    EmailType["EDIT_DECIDED"] = "EDIT_DECIDED";
    EmailType["EDIT_RECEIVED"] = "EDIT_RECEIVED";
    EmailType["MISCELLANEOUS"] = "MISCELLANEOUS";
    EmailType["NOMINATION_APPEAL_DECIDED"] = "NOMINATION_APPEAL_DECIDED";
    EmailType["NOMINATION_APPEAL_RECEIVED"] = "NOMINATION_APPEAL_RECEIVED";
    EmailType["NOMINATION_DECIDED"] = "NOMINATION_DECIDED";
    EmailType["NOMINATION_RECEIVED"] = "NOMINATION_RECEIVED";
    EmailType["PHOTO_DECIDED"] = "PHOTO_DECIDED";
    EmailType["PHOTO_RECEIVED"] = "PHOTO_RECEIVED";
    EmailType["REPORT_DECIDED"] = "REPORT_DECIDED";
    EmailType["REPORT_RECEIVED"] = "REPORT_RECEIVED";
    EmailType["SURVEY"] = "SURVEY";
})(EmailType || (EmailType = {}));
var EmailStyle;
(function (EmailStyle) {
    EmailStyle["INGRESS"] = "INGRESS";
    EmailStyle["LIGHTSHIP"] = "LIGHTSHIP";
    EmailStyle["POKEMON_GO"] = "POKEMON_GO";
    EmailStyle["REDACTED"] = "REDACTED";
    EmailStyle["WAYFARER"] = "WAYFARER";
    EmailStyle["UNKNOWN"] = "UNKNOWN";
})(EmailStyle || (EmailStyle = {}));/* eslint-disable no-irregular-whitespace */
const TEMPLATES = [
    //  ---------------------------------------- MISCELLANEOUS ----------------------------------------
    {
        subject: /^Ingress Mission/,
        type: EmailType.MISCELLANEOUS,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Ingress Damage Report:/,
        type: EmailType.MISCELLANEOUS,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Help us improve Wayfarer$/,
        type: EmailType.SURVEY,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Help us tackle Wayfarer Abuse$/,
        type: EmailType.SURVEY,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Global Challenge Rewards$/,
        type: EmailType.CHALLENGE_REWARD,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Your Wayspot submission for/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.LIGHTSHIP,
        language: "en",
    },
    {
        subject: /Activated on VPS$/,
        type: EmailType.MISCELLANEOUS,
        style: EmailStyle.LIGHTSHIP,
        language: "en",
    },
    {
        subject: /^Re: \[\d+\] /,
        type: EmailType.MISCELLANEOUS,
        style: EmailStyle.UNKNOWN,
        language: "en",
    },
    //  ---------------------------------------- ENGLISH [en] ----------------------------------------
    {
        subject: /^Thanks! Niantic Wayspot nomination received for/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Niantic Wayspot nomination decided for/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Decision on your? Wayfarer Nomination,/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Thanks! Niantic Wayspot appeal received for/,
        type: EmailType.NOMINATION_APPEAL_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Your Niantic Wayspot appeal has been decided for/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Thanks! Niantic Wayspot (location|title|description) edit {2}appeal received for/,
        type: EmailType.EDIT_APPEAL_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Your Niantic Wayspot (location|title|description) edit appeal has been decided for/,
        type: EmailType.EDIT_APPEAL_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Portal submission confirmation:/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Portal review complete:/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Ingress Portal Submitted:/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.REDACTED,
        language: "en",
    },
    {
        subject: /^Ingress Portal Duplicate:/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.REDACTED,
        language: "en",
    },
    {
        subject: /^Ingress Portal Live:/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.REDACTED,
        language: "en",
    },
    {
        subject: /^Ingress Portal Rejected:/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.REDACTED,
        language: "en",
    },
    {
        subject: /^Trainer [^:]+: Thank You for Nominating a PokéStop for Review.$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Trainer [^:]+: Your PokéStop Nomination Is Eligible!$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Trainer [^:]+: Your PokéStop Nomination Is Ineligible$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Trainer [^:]+: Your PokéStop Nomination Review Is Complete:/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Photo Submission Received$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Photo Submission (Accepted|Rejected)$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Edit Suggestion Received$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Edit Suggestion (Accepted|Rejected)$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Invalid Pokéstop\/Gym Report Received$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Invalid Pokéstop\/Gym Report (Accepted|Rejected)$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "en",
    },
    {
        subject: /^Thanks! Niantic Wayspot Photo received for/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Niantic Wayspot media submission decided for/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Thanks! Niantic Wayspot edit suggestion received for/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Niantic Wayspot edit suggestion decided for/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Thanks! Niantic (Wayspot|location) report received for/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Niantic (Wayspot|location) report decided for/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "en",
    },
    {
        subject: /^Portal photo submission confirmation/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Portal photo review complete/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Portal Edit Suggestion Received$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Portal edit submission confirmation/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.REDACTED,
        language: "en",
    },
    {
        subject: /^Portal edit review complete/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Invalid Ingress Portal report received$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    {
        subject: /^Invalid Ingress Portal report reviewed$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.INGRESS,
        language: "en",
    },
    //  ---------------------------------------- BENGALI [bn] ----------------------------------------
    {
        subject: /^ধন্যবাদ! .*-এর জন্য Niantic Wayspot মনোনয়ন পাওয়া গেছে!/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "bn",
    },
    {
        subject: /-এর জন্য Niantic Wayspot মনোনয়নের সিদ্ধান্ত নেওয়া হয়েছে/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "bn",
    },
    {
        subject: /^ধন্যবাদ! .*( |-)এর জন্য Niantic Wayspot Photo পাওয়া গিয়েছে!$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "bn",
    },
    {
        subject: /-এর জন্য Niantic Wayspot মিডিয়া জমা দেওয়ার সিদ্ধান্ত নেওয়া হয়েছে$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "bn",
    },
    {
        subject: /^ধন্যবাদ! .*( |-)এর জন্য Niantic Wayspot সম্পাদনা করার পরামর্শ পাওয়া গেছে!$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "bn",
    },
    {
        subject: /-এর জন্য Niantic Wayspot সম্পাদনায় পরামর্শের সিদ্ধান্ত নেওয়া হয়েছে$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "bn",
    },
    {
        subject: /^ধন্যবাদ! .*( |-)এর জন্য Niantic Wayspot রিপোর্ট পাওয়া গেছে!$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "bn",
    },
    {
        subject: /^Niantic Wayspot রিপোর্ট .*-এর জন্য সিদ্ধান্ত নেওয়া হয়েছে$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "bn",
    },
    //  ---------------------------------------- CZECH [cs] ----------------------------------------
    {
        subject: /^Děkujeme! Přijali jsme nominaci na Niantic Wayspot pro/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Rozhodnutí o nominaci na Niantic Wayspot pro/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Děkujeme! Přijali jsme odvolání proti odmítnutí Niantic Wayspotu/,
        type: EmailType.NOMINATION_APPEAL_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Rozhodnutí o odvolání proti nominaci na Niantic Wayspot pro/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Děkujeme! Přijali jsme Photo pro Niantic Wayspot/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Rozhodnutí o odeslání obrázku Niantic Wayspotu/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Děkujeme! Přijali jsme návrh na úpravu Niantic Wayspotu pro/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Rozhodnutí o návrhu úpravy Niantic Wayspotu pro/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Děkujeme! Přijali jsme hlášení ohledně Niantic Wayspotu/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    {
        subject: /^Rozhodnutí o hlášení v souvislosti s Niantic Wayspotem/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "cs",
    },
    //  ---------------------------------------- GERMAN [de] ----------------------------------------
    {
        subject: /^Danke! Wir haben deinen Vorschlag für den Wayspot/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Entscheidung zum Wayspot-Vorschlag/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Danke! Wir haben deinen Einspruch für den Wayspot/,
        type: EmailType.NOMINATION_APPEAL_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Entscheidung zum Einspruch für den Wayspot/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Empfangsbestätigung deines eingereichten Portalvorschlags:/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.INGRESS,
        language: "de",
    },
    {
        subject: /^Überprüfung des Portals abgeschlossen:/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.INGRESS,
        language: "de",
    },
    {
        subject: /^Trainer [^:]+: Danke, dass du einen PokéStop zur Überprüfung vorgeschlagen hast$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Trainer [^:]+: Dein vorgeschlagener PokéStop ist (zulässig!|nicht zulässig)$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Trainer [^:]+: Die Prüfung deines PokéStop-Vorschlags wurde abgeschlossen:/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Fotovorschlag erhalten$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Fotovorschlag (akzeptiert|abgelehnt)$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Vorschlag für Bearbeitung erhalten$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Vorschlag für Bearbeitung (akzeptiert|abgelehnt)$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Meldung zu unzulässigen PokéStop\/Arena erhalten$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Meldung zu unzulässigen PokéStop\/Arena (akzeptiert|abgelehnt)$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.POKEMON_GO,
        language: "de",
    },
    {
        subject: /^Danke! Wir haben den Upload Photo für den Wayspot/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Entscheidung zu deinem Upload für den Wayspot/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Danke! Wir haben deinen Änderungsvorschlag für den Wayspot/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Entscheidung zu deinem Änderungsvorschlag für den Wayspot/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Danke! Wir haben deine Meldung für den Wayspot/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Entscheidung zu deiner Meldung für den Wayspot/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "de",
    },
    {
        subject: /^Portalfotovorschlag erhalten/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.INGRESS,
        language: "de",
    },
    {
        subject: /^Überprüfung des Portalfotos abgeschlossen/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.INGRESS,
        language: "de",
    },
    {
        subject: /^Vorschlag für die Änderung eines Portals erhalten/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.INGRESS,
        language: "de",
    },
    {
        subject: /^Überprüfung des Vorschlags zur Änderung eines Portals abgeschlossen/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.INGRESS,
        language: "de",
    },
    {
        subject: /^Meldung zu ungültigem Ingress-Portal erhalten$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.INGRESS,
        language: "de",
    },
    {
        subject: /^Meldung zu ungültigem Ingress-Portal geprüft$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.INGRESS,
        language: "de",
    },
    //  ---------------------------------------- SPANISH [es] ----------------------------------------
    {
        subject: /^¡Gracias! ¡Hemos recibido la propuesta de Wayspot de Niantic/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    {
        subject: /^Decisión tomada sobre la propuesta de Wayspot de Niantic/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    {
        subject: /^¡Gracias! ¡Recurso de Wayspot de Niantic recibido para/,
        type: EmailType.NOMINATION_APPEAL_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    {
        subject: /^¡Gracias! ¡Hemos recibido el Photo del Wayspot de Niantic para/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    {
        subject: /^Decisión tomada sobre el envío de archivo de Wayspot de Niantic para/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    {
        subject: /^¡Gracias! ¡Propuesta de modificación de Wayspot de Niantic recibida para/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    {
        subject: /^Decisión tomada sobre la propuesta de modificación del Wayspot de Niantic/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    {
        subject: /^¡Gracias! ¡Hemos recibido el informe sobre el Wayspot de Niantic/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    {
        subject: /^Decisión tomada sobre el Wayspot de Niantic/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "es",
    },
    //  ---------------------------------------- FRENCH [fr] ----------------------------------------
    {
        subject: /^Remerciements ! Proposition d’un Wayspot Niantic reçue pour/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "fr",
    },
    {
        subject: /^Résultat concernant la proposition du Wayspot Niantic/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "fr",
    },
    {
        subject: /^Remerciements ! Contribution de Wayspot Niantic Photo reçue pour/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "fr",
    },
    {
        subject: /^Résultat concernant le Wayspot Niantic/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "fr",
    },
    {
        subject: /^Remerciements ! Proposition de modification de Wayspot Niantic reçue pour/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "fr",
    },
    {
        subject: /^Résultat concernant la modification du Wayspot Niantic/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "fr",
    },
    {
        subject: /^Remerciements ! Signalement reçu pour le Wayspot/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "fr",
    },
    {
        subject: /^Résultat concernant le signalement du Wayspot Niantic/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "fr",
    },
    //  ---------------------------------------- HINDI [hi] ----------------------------------------
    {
        subject: /^धन्यवाद! .* के लिए Niantic Wayspot नामांकन प्राप्त हुआ!$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "hi",
    },
    {
        subject: /^Niantic Wayspot का नामांकन .* के लिए तय किया गया$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "hi",
    },
    {
        subject: /के लिए तह Niantic Wayspot मीडिया सबमिशन$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "hi",
    },
    {
        subject: /^धन्यवाद! .* के लिए Niantic Wayspot Photo प्राप्त हुआ!$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "hi",
    },
    {
        subject: /^धन्यवाद! .* के लिए Niantic Wayspot संपादन सुझाव प्राप्त हुआ!$/,
        disambiguate: (email) => {
            var _a;
            const doc = email.getDocument();
            const title = (_a = doc === null || doc === void 0 ? void 0 : doc.querySelector("td.em_pbottom.em_blue.em_font_20")) === null || _a === void 0 ? void 0 : _a.textContent.trim();
            if (title == "बढ़िया खोज की! आपके वेस्पॉट Photo सबमिशन के लिए धन्यवाद!") {
                return {
                    type: EmailType.PHOTO_RECEIVED,
                    style: EmailStyle.WAYFARER,
                    language: "hi",
                };
            }
            else if (title === null || title === void 0 ? void 0 : title.includes("आपके संपादन हमारे खोजकर्ताओं के समुदाय के लिए सर्वोत्तम संभव अनुभव बनाए रखने में मदद करते हैं।")) {
                return {
                    type: EmailType.EDIT_RECEIVED,
                    style: EmailStyle.WAYFARER,
                    language: "hi",
                };
            }
            else {
                return null;
            }
        },
    },
    {
        subject: /के लिए Niantic Wayspot संपादन सुझाव प्राप्त हुआ$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "hi",
    },
    {
        subject: /^धन्यवाद! .* के लिए प्राप्त Niantic Wayspot रिपोर्ट!$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "hi",
    },
    {
        subject: /के लिए तय Niantic Wayspot रिपोर्ट$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "hi",
    },
    //  ---------------------------------------- ITALIAN [it] ----------------------------------------
    {
        subject: /^Grazie! Abbiamo ricevuto una candidatura di Niantic Wayspot per/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "it",
    },
    {
        subject: /^Proposta di Niantic Wayspot decisa per/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "it",
    },
    {
        subject: /^Grazie! Abbiamo ricevuto Photo di Niantic Wayspot per/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "it",
    },
    {
        subject: /^Proposta di contenuti multimediali di Niantic Wayspot decisa per/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "it",
    },
    {
        subject: /^Grazie! Abbiamo ricevuto il suggerimento di modifica di Niantic Wayspot per/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "it",
    },
    {
        subject: /^Suggerimento di modifica di Niantic Wayspot deciso per/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "it",
    },
    {
        subject: /^Grazie! Abbiamo ricevuto la segnalazione di Niantic Wayspot per/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "it",
    },
    {
        subject: /^Segnalazione di Niantic Wayspot decisa per/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "it",
    },
    //  ---------------------------------------- JAPANESE [ja] ----------------------------------------
    {
        subject: /^ありがとうございます。 Niantic Wayspotの申請「.*」が受領されました。$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^Niantic Wayspotの申請「.*」が決定しました。$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^ありがとうございます。 Niantic Wayspotに関する申し立て「.*」が受領されました。$/,
        type: EmailType.NOMINATION_APPEAL_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^Niantic Wayspot「.*」に関する申し立てが決定しました。$/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^ありがとうございます。 Niantic Wayspot Photo「.*」が受領されました。$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^Niantic Wayspotのメディア申請「.*」が決定しました。$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^ありがとうございます。 Niantic Wayspot「.*」の編集提案が受領されました。$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^Niantic Wayspotの編集提案「.*」が決定しました。$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^ありがとうございます。 Niantic Wayspotに関する報告「.*」が受領されました。$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    {
        subject: /^Niantic Wayspotの報告「.*」が決定しました$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ja",
    },
    //  ---------------------------------------- KOREAN [ko] ----------------------------------------
    {
        subject: /^감사합니다! .*에 대한 Niantic Wayspot 후보 신청이 완료되었습니다!$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ko",
    },
    {
        subject: /에 대한 Niantic Wayspot 후보 결정이 완료됨$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ko",
    },
    {
        subject: /^감사합니다! .*에 대한 Niantic Wayspot Photo 제출 완료$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ko",
    },
    {
        subject: /에 대한 Niantic Wayspot 미디어 제안 결정 완료$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ko",
    },
    {
        subject: /^감사합니다! .*에 대한 Niantic Wayspot 수정이 제안되었습니다!$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ko",
    },
    {
        subject: /에 대한 Niantic Wayspot 수정 제안 결정 완료$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ko",
    },
    {
        subject: /^감사합니다! .*에 대한 Niantic Wayspot 보고 접수$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ko",
    },
    {
        subject: /에 대한 Niantic Wayspot 보고 결정 완료$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ko",
    },
    //  ---------------------------------------- MARATHI [mr] ----------------------------------------
    {
        subject: /^धन्यवाद! Niantic वेस्पॉट नामांकन .* साठी प्राप्त झाले!$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /^Niantic वेस्पॉट नामांकन .* साठी निश्चित केले$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /^धन्यवाद! Niantic वेस्पॉट आवाहन .* साठी प्राप्त झाले!$/,
        type: EmailType.NOMINATION_APPEAL_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /^तुमचे Niantic वेस्पॉट आवाहन .* साठी निश्चित करण्यात आले आहे$/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /^धन्यवाद! .* साठी Niantic वेस्पॉट Photo प्राप्त झाले!$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /साठी Niantic वेस्पॉट मीडिया सबमिशनचा निर्णय घेतला$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /^धन्यवाद! Niantic वेस्पॉट संपादन सूचना .* साठी प्राप्त झाली!$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /^Niantic वेस्पॉट संपादन सूचना .* साठी निश्चित केली$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /^धन्यवाद! .* साठी Niantic वेस्पॉट अहवाल प्राप्त झाला!$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    {
        subject: /साठी Niantic वेस्पॉट अहवाल निश्चित केला$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "mr",
    },
    //  ---------------------------------------- DUTCH [nl] ----------------------------------------
    {
        subject: /^Bedankt! Niantic Wayspot-nominatie ontvangen voor/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "nl",
    },
    {
        subject: /^Besluit over Niantic Wayspot-nominatie voor/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "nl",
    },
    {
        subject: /^Bedankt! Niantic Wayspot-Photo ontvangen voor/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "nl",
    },
    {
        subject: /^Besluit over Niantic Wayspot-media-inzending voor/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "nl",
    },
    {
        subject: /^Bedankt! Niantic Wayspot-bewerksuggestie ontvangen voor/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "nl",
    },
    {
        subject: /^Besluit over Niantic Wayspot-bewerksuggestie voor/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "nl",
    },
    {
        subject: /^Bedankt! Melding van Niantic Wayspot .* ontvangen!$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "nl",
    },
    {
        subject: /^Besluit over Niantic Wayspot-melding voor/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "nl",
    },
    //  ---------------------------------------- NORWEGIAN [no] ----------------------------------------
    {
        subject: /^Takk! Vi har mottatt Niantic Wayspot-nominasjonen for/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^En avgjørelse er tatt for Niantic Wayspot-nominasjonen for/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^Takk! Vi har mottatt Niantic Wayspot-klagen for/,
        type: EmailType.NOMINATION_APPEAL_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^En avgjørelse er tatt for Niantic Wayspot-klagen for/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^Takk! Vi har mottatt Photo for Niantic-Wayspot-en/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^Takk! Vi har mottatt endringsforslaget for Niantic Wayspot-en/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^Takk! Vi har mottatt Niantic Wayspot-rapporten for/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^En avgjørelse er tatt for Niantic Wayspot-medieinnholdet som er sendt inn for/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^En avgjørelse er tatt for endringsforslaget for Niantic Wayspot-en/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    {
        subject: /^En avgjørelse er tatt for Niantic Wayspot-rapporten for/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "no",
    },
    //  ---------------------------------------- POLISH [pl] ----------------------------------------
    {
        subject: /^Dziękujemy! Odebrano nominację Wayspotu/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "pl",
    },
    {
        subject: /^Podjęto decyzję na temat nominacji Wayspotu/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "pl",
    },
    {
        subject: /^Dziękujemy! Odebrano materiały Photo Wayspotu Niantic/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "pl",
    },
    {
        subject: /^Decyzja na temat zgłoszenia materiałów do Wayspotu Niantic/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "pl",
    },
    {
        subject: /^Dziękujemy! Odebrano sugestię zmiany Wayspotu Niantic/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "pl",
    },
    {
        subject: /^Podjęto decyzję na temat sugestii edycji Wayspotu Niantic/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "pl",
    },
    {
        subject: /^Dziękujemy! Odebrano raport dotyczący Wayspotu Niantic/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "pl",
    },
    {
        subject: /^Podjęto decyzję odnośnie raportu dotyczącego Wayspotu Niantic/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "pl",
    },
    //  ---------------------------------------- PORTUGUESE [pt] ----------------------------------------
    {
        subject: /^Agradecemos a sua indicação para o Niantic Wayspot/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "pt",
    },
    {
        subject: /^Decisão sobre a indicação do Niantic Wayspot/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "pt",
    },
    {
        subject: /^Agradecemos o envio de Photo para o Niantic Wayspot/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "pt",
    },
    {
        subject: /^Decisão sobre o envio de mídia para o Niantic Wayspot/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "pt",
    },
    {
        subject: /^Agradecemos a sua sugestão de edição para o Niantic Wayspot/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "pt",
    },
    {
        subject: /^Decisão sobre a sugestão de edição do Niantic Wayspot/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "pt",
    },
    {
        subject: /^Agradecemos o envio da denúncia referente ao Niantic Wayspot/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "pt",
    },
    {
        subject: /^Decisão sobre a denúncia referente ao Niantic Wayspot/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "pt",
    },
    //  ---------------------------------------- RUSSIAN [ru] ----------------------------------------
    {
        subject: /^Спасибо! Номинация Niantic Wayspot для .* получена!$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ru",
    },
    {
        subject: /^Вынесено решение по номинации Niantic Wayspot для/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ru",
    },
    {
        subject: /^Спасибо! Получено: Photo Niantic Wayspot для/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ru",
    },
    {
        subject: /^Вынесено решение по предложению по файлу для/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ru",
    },
    {
        subject: /^Спасибо! Предложение по изменению Niantic Wayspot для/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ru",
    },
    {
        subject: /^Вынесено решение по предложению по изменению Niantic Wayspot для/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ru",
    },
    {
        subject: /^Спасибо! Жалоба на Niantic Wayspot для/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ru",
    },
    {
        subject: /^Вынесено решение по жалобе на Niantic Wayspot для/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ru",
    },
    //  ---------------------------------------- SWEDISH [sv] ----------------------------------------
    {
        subject: /^Tack! Niantic Wayspot-nominering har tagits emot för/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    {
        subject: /^Niantic Wayspot-nominering har beslutats om för/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    {
        subject: /^Din Niantic Wayspot-överklagan har beslutats om för/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    {
        subject: /^Tack! Niantic Wayspot Photo togs emot för/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    {
        subject: /^Niantic Wayspot-medieinlämning har beslutats om för/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    {
        subject: /^Tack! Niantic Wayspot-redigeringsförslag har tagits emot för/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    {
        subject: /^Niantic Wayspot-redigeringsförslag har beslutats om för/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    {
        subject: /^Tack! Niantic Wayspot-rapport har tagits emot för/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    {
        subject: /^Niantic Wayspot-rapport har beslutats om för/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "sv",
    },
    //  ---------------------------------------- TAMIL [ta] ----------------------------------------
    {
        subject: /^நன்றி! .* -க்கான Niantic Wayspot பரிந்துரை பெறப்பட்டது!!$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ta",
    },
    {
        subject: /-க்கான Niantic Wayspot பணிந்துரை பரிசீலிக்கப்பட்டது.$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ta",
    },
    {
        subject: /^நன்றி! .* -க்கான Niantic Wayspot Photo பெறப்பட்டது!$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ta",
    },
    {
        subject: /-க்கான Niantic Wayspot மீடியா சமர்ப்பிப்பு பரிசீலிக்கப்பட்டது.$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ta",
    },
    {
        subject: /^நன்றி! .* -க்கான Niantic Wayspot திருத்த பரிந்துரை பெறப்பட்டது!$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ta",
    },
    {
        subject: /-க்கான Niantic Wayspot திருத்த பரிந்துரை பரிசீலிக்கப்பட்டது$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ta",
    },
    {
        subject: /^நன்றி! .* -க்கான Niantic Wayspot புகார் பெறப்பட்டது!$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "ta",
    },
    {
        subject: /-க்கான Niantic Wayspot புகார் பரிசீலிக்கப்பட்டது!$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "ta",
    },
    //  ---------------------------------------- TELUGU [te] ----------------------------------------
    {
        subject: /^ధన్యవాదాలు! .* కు Niantic Wayspot నామినేషన్ అందుకున్నాము!$/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "te",
    },
    {
        subject: /కొరకు Niantic వేస్పాట్ నామినేషన్‌‌పై నిర్ణయం$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "te",
    },
    {
        subject: /^ధన్యవాదాలు! .* కొరకు Niantic Wayspot Photo అందుకున్నాము!$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "te",
    },
    {
        subject: /కొరకు Niantic వేస్పాట్ మీడియా సమర్పణపై నిర్ణయం$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "te",
    },
    {
        subject: /^ధన్యవాదాలు! మీ వేస్పాట్ .* ఎడిట్ సూచనకై ధన్యవాదాలు!$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "te",
    },
    {
        subject: /కొరకు నిర్ణయించబడిన Niantic వేస్పాట్ సూచన$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "te",
    },
    {
        subject: /^ధన్యవాదాలు! .* కొరకు Niantic వేస్పాట్ నామినేషన్ అందుకున్నాము!$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "te",
    },
    {
        subject: /కొరకు నిర్ణయించబడిన Niantic వేస్పాట్ రిపోర్ట్$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "te",
    },
    //  ---------------------------------------- THAI [th] ----------------------------------------
    {
        subject: /^ขอบคุณ! เราได้รับการเสนอสถานที่ Niantic Wayspot สำหรับ/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "th",
    },
    {
        subject: /^ผลการตัดสินการเสนอสถานที่ Niantic Wayspot สำหรับ/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "th",
    },
    {
        subject: /^ขอบคุณ! ได้รับ Niantic Wayspot Photo สำหรับ/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "th",
    },
    {
        subject: /^ผลการตัดสินการส่งมีเดีย Niantic Wayspot สำหรับ/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "th",
    },
    {
        subject: /^ขอบคุณ! เราได้รับคำแนะนำการแก้ไข Niantic Wayspot สำหรับ/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "th",
    },
    {
        subject: /^ผลการตัดสินคำแนะนำการแก้ไข Niantic Wayspot สำหรับ/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "th",
    },
    {
        subject: /^ขอบคุณ! เราได้รับการรายงาน Niantic Wayspot สำหรับ/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "th",
    },
    {
        subject: /^ผลตัดสินการรายงาน Niantic Wayspot สำหรับ/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "th",
    },
    //  ---------------------------------------- CHINESE [zh] ----------------------------------------
    {
        subject: /^感謝你！ 我們已收到 Niantic Wayspot 候選/,
        type: EmailType.NOMINATION_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "zh",
    },
    {
        subject: /^社群已對 Niantic Wayspot 候選 .* 做出決定$/,
        type: EmailType.NOMINATION_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "zh",
    },
    {
        subject: /^感謝你！ 我們已收到 .* 的 Niantic Wayspot Photo！$/,
        type: EmailType.PHOTO_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "zh",
    },
    {
        subject: /^社群已對你為 .* 提交的 Niantic Wayspot 媒體做出決定$/,
        type: EmailType.PHOTO_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "zh",
    },
    {
        subject: /^感謝你！ 我們已收到 .* 的 Niantic Wayspot 編輯建議！$/,
        type: EmailType.EDIT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "zh",
    },
    {
        subject: /^社群已對 .* 的 Niantic Wayspot 編輯建議做出決定$/,
        type: EmailType.EDIT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "zh",
    },
    {
        subject: /^感謝你！ 我們已收到 .* 的 Niantic Wayspot 報告！$/,
        type: EmailType.REPORT_RECEIVED,
        style: EmailStyle.WAYFARER,
        language: "zh",
    },
    {
        subject: /^Niantic 已對 .* 的 Wayspot 報告做出決定$/,
        type: EmailType.REPORT_DECIDED,
        style: EmailStyle.WAYFARER,
        language: "zh",
    },
];var _EmailAPI_instances, _EmailAPI_openIDB, _EmailAPI_listeners, _EmailAPI_logger, _EmailAPI_put, _Email_instances, _Email_cache, _Email_parseContentType, _WayfarerEmail_dbObject;
const SUPPORTED_SENDERS = [
    "notices@wayfarer.nianticlabs.com",
    "nominations@portals.ingress.com",
    "hello@pokemongolive.com",
    "ingress-support@nianticlabs.com",
    "ingress-support@google.com",
];
class EmailAPI {
    constructor(idbConn) {
        _EmailAPI_instances.add(this);
        _EmailAPI_openIDB.set(this, void 0);
        _EmailAPI_listeners.set(this, void 0);
        _EmailAPI_logger.set(this, void 0);
        __classPrivateFieldSet(this, _EmailAPI_openIDB, idbConn, "f");
        __classPrivateFieldSet(this, _EmailAPI_listeners, [], "f");
        __classPrivateFieldSet(this, _EmailAPI_logger, new Logger("api:email"), "f");
    }
    /**
     * Retrieves the email represented by the given Message-ID.
     * @param id The Message-ID of the email to fetch
     * @throws {KeyNotFoundError} if no email was found by this ID
     * @returns The requested email
     */
    async get(id) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const idb = __addDisposableResource(env_1, await __classPrivateFieldGet(this, _EmailAPI_openIDB, "f").call(this, "readonly"), false);
            return new WayfarerEmail(await idb.get(id));
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    async import(iterator, report) {
        __classPrivateFieldGet(this, _EmailAPI_logger, "f").info("Now importing emails from generator!");
        __classPrivateFieldGet(this, _EmailAPI_logger, "f").info(`Invoking ${__classPrivateFieldGet(this, _EmailAPI_listeners, "f").length} email listeners...`);
        const listeners = [];
        for (const listener of __classPrivateFieldGet(this, _EmailAPI_listeners, "f")) {
            listeners.push(await listener());
        }
        __classPrivateFieldGet(this, _EmailAPI_logger, "f").info("All email listeners were invoked.");
        const counters = {
            inserted: 0,
            replaced: 0,
            retained: 0,
            ignored: 0,
        };
        {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
                __classPrivateFieldGet(this, _EmailAPI_logger, "f").info("Opening email object store for writing...");
                const idb = __addDisposableResource(env_2, await __classPrivateFieldGet(this, _EmailAPI_openIDB, "f").call(this, "readwrite"), false);
                __classPrivateFieldGet(this, _EmailAPI_logger, "f").info(`Email store opened; iterating handlers from ${listeners.length} email listeners...`);
                const handlers = [];
                for (const listener of listeners) {
                    handlers.push((await listener.next()).value);
                }
                __classPrivateFieldGet(this, _EmailAPI_logger, "f").info("All email listeners were iterated.");
                const dispatcher = async (e, r) => {
                    for (const handler of handlers) {
                        try {
                            await handler(e, r);
                        }
                        catch (ex) {
                            __classPrivateFieldGet(this, _EmailAPI_logger, "f").error("Email event listener threw an exception", e, r, ex);
                        }
                    }
                };
                __classPrivateFieldGet(this, _EmailAPI_logger, "f").info("Now iterating emails...");
                for await (const file of iterator) {
                    const result = await __classPrivateFieldGet(this, _EmailAPI_instances, "m", _EmailAPI_put).call(this, file, idb, dispatcher);
                    counters[result]++;
                    if (typeof report !== "undefined")
                        report(result);
                }
                __classPrivateFieldGet(this, _EmailAPI_logger, "f").info("Email iteration complete; closing object store...");
            }
            catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
            }
            finally {
                __disposeResources(env_2);
            }
        }
        __classPrivateFieldGet(this, _EmailAPI_logger, "f").info("Successfully imported emails", counters);
        __classPrivateFieldGet(this, _EmailAPI_logger, "f").info(`Finally iterating ${listeners.length} email listeners...`);
        for (const listener of listeners) {
            const result = await listener.next();
            if (!result.done) {
                __classPrivateFieldGet(this, _EmailAPI_logger, "f").error("Email event listener did not return", result);
            }
        }
        __classPrivateFieldGet(this, _EmailAPI_logger, "f").info("All email listeners were finally iterated.");
        return counters;
    }
    async getProcessedIDs() {
        const env_3 = { stack: [], error: void 0, hasError: false };
        try {
            const pids = new Set();
            const idb = __addDisposableResource(env_3, await __classPrivateFieldGet(this, _EmailAPI_openIDB, "f").call(this, "readonly"), false);
            __classPrivateFieldGet(this, _EmailAPI_logger, "f").debug("Iterating emails to find processed IDs");
            for await (const email of idb.iterate()) {
                for (const pid of email.pids) {
                    pids.add(pid);
                }
            }
            __classPrivateFieldGet(this, _EmailAPI_logger, "f").debug("Email iteration completed.");
            return pids;
        }
        catch (e_3) {
            env_3.error = e_3;
            env_3.hasError = true;
        }
        finally {
            __disposeResources(env_3);
        }
    }
    /**
     * Returns an asynchronous generator that iterates over all emails that have been imported to the
     * local database. The generator must be fully iterated, otherwise the database will not be
     * closed!
     */
    async *iterate() {
        const env_4 = { stack: [], error: void 0, hasError: false };
        try {
            const idb = __addDisposableResource(env_4, await __classPrivateFieldGet(this, _EmailAPI_openIDB, "f").call(this, "readonly"), false);
            __classPrivateFieldGet(this, _EmailAPI_logger, "f").debug("Starting email iterator");
            for await (const email of idb.iterate()) {
                __classPrivateFieldGet(this, _EmailAPI_logger, "f").debug("Yielding email from iterator");
                yield new WayfarerEmail(email);
            }
            __classPrivateFieldGet(this, _EmailAPI_logger, "f").debug("Exhausted email iterator");
        }
        catch (e_4) {
            env_4.error = e_4;
            env_4.hasError = true;
        }
        finally {
            __disposeResources(env_4);
        }
    }
    listen(listener) {
        __classPrivateFieldGet(this, _EmailAPI_listeners, "f").push(listener);
    }
    /**
     * Niantic will often strip diacritic marks from Wayspot titles/descriptions when they are sent in
     * emails to end users. This can make title matching difficult, because the Wayfarer website does
     * not strip diacritics. Strings passed to this function will be returned with their diacritic marks
     * removed, to emulate the process applied by Niantic's email system. This can make it easier to
     * match Wayfarer-sourced wayspot data against data sourced from imported emails.
     * @param text The Wayspot title/description to strip
     * @returns A normalized string representation of the given text
     */
    static stripDiacritics(text) {
        for (const [k, v] of iterObject(diacritics)) {
            text = text.replace(new RegExp(`[${v}]`, "g"), k);
        }
        return text.normalize("NFD");
    }
}
_EmailAPI_openIDB = new WeakMap(), _EmailAPI_listeners = new WeakMap(), _EmailAPI_logger = new WeakMap(), _EmailAPI_instances = new WeakSet(), _EmailAPI_put = async function _EmailAPI_put(file, idb, dispatch) {
    const email = parseMIME(file.contents);
    const emailAddress = extractEmail(email.getFirstHeaderValue("From"));
    if (!SUPPORTED_SENDERS.includes(emailAddress)) {
        return "ignored";
        /*throw new UnsupportedSenderError(
          `Sender ${emailAddress} was not recognized as a valid Wayfarer-related email address.`,
        );*/
    }
    const emailDate = new Date(email.getFirstHeaderValue("Date"));
    if (emailAddress === "hello@pokemongolive.com" && emailDate.getUTCFullYear() <= 2018) {
        // Newsletters used this email address for some time up until late 2018, which was before this game got Wayfarer access.
        return "ignored";
    }
    const toSave = {
        id: email.getFirstHeaderValue("Message-ID"),
        pids: typeof file.processingID !== "undefined" ? [file.processingID] : [],
        filename: file.filename,
        ts: Date.now(),
        headers: email.headers,
        body: email.body,
    };
    try {
        const existing = await idb.get(toSave.id);
        const joinedPids = new Set([...toSave.pids, ...existing.pids]);
        const existingHops = new Email(existing.headers, existing.body).getHeaderValues("Received").length;
        const proposedHops = new Email(toSave.headers, toSave.body).getHeaderValues("Received").length;
        if (proposedHops < existingHops) {
            const hybrid = {
                ...toSave,
                pids: [...joinedPids],
            };
            idb.put(hybrid);
            idb.commit();
            await dispatch(new WayfarerEmail(hybrid), "replaced");
            return "replaced";
        }
        else {
            idb.put({
                ...existing,
                pids: [...joinedPids],
            });
            idb.commit();
            return "retained";
        }
    }
    catch (ex) {
        if (ex instanceof KeyNotFoundError) {
            idb.put(toSave);
            idb.commit();
            await dispatch(new WayfarerEmail(toSave), "inserted");
            return "inserted";
        }
        else {
            throw ex;
        }
    }
};
class Email {
    constructor(headers, body) {
        _Email_instances.add(this);
        Object.defineProperty(this, "headers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "body", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        _Email_cache.set(this, void 0);
        this.headers = headers;
        this.body = body;
        __classPrivateFieldSet(this, _Email_cache, {}, "f");
    }
    getHeaderValues(name) {
        return this.headers
            .filter((h) => h.name.toLowerCase() === name.toLowerCase())
            .map((h) => h.value);
    }
    getFirstHeaderValue(name, defaultValue) {
        const hvs = this.getHeaderValues(name);
        if (hvs.length)
            return hvs[0];
        if (typeof defaultValue !== "undefined")
            return defaultValue;
        throw new HeaderNotFoundError(`Could not find any headers with name ${name}`);
    }
    getBody(contentType) {
        var _a;
        const alts = this.getMultipartAlternatives();
        return (_a = alts[contentType.toLowerCase()]) !== null && _a !== void 0 ? _a : null;
    }
    getMultipartAlternatives() {
        var _a, _b;
        const alts = {};
        const ct = __classPrivateFieldGet(this, _Email_instances, "m", _Email_parseContentType).call(this, this.getFirstHeaderValue("Content-Type"));
        if (ct.type === "multipart/alternative") {
            const parts = this.body.split(`--${ct.params.boundary}`).filter(part => part !== "");
            for (const part of parts) {
                if (!part.startsWith("\r\n") || !part.endsWith("\r\n"))
                    continue;
                const partMime = parseMIME(part.substring(2, part.length - 2));
                if (partMime.body.trim().length === 0)
                    continue;
                const partCTHdr = partMime.getFirstHeaderValue("Content-Type", null);
                if (partCTHdr === null)
                    continue;
                const partCT = __classPrivateFieldGet(this, _Email_instances, "m", _Email_parseContentType).call(this, partCTHdr);
                const partCTE = partMime.getFirstHeaderValue("Content-Transfer-Encoding", null);
                const partCharset = ((_a = partCT.params.charset) !== null && _a !== void 0 ? _a : "utf-8").toLowerCase();
                alts[partCT.type] = decodeBodyUsingCTE(partMime.body, partCTE, partCharset);
            }
        }
        else {
            const cte = this.getFirstHeaderValue("Content-Transfer-Encoding", null);
            const charset = ((_b = ct.params.charset) !== null && _b !== void 0 ? _b : "utf-8").toLowerCase();
            alts[ct.type] = decodeBodyUsingCTE(this.body, cte, charset);
        }
        return alts;
    }
    getDocument() {
        if (typeof __classPrivateFieldGet(this, _Email_cache, "f").document !== "undefined") {
            return __classPrivateFieldGet(this, _Email_cache, "f").document;
        }
        else {
            const html = this.getBody("text/html");
            if (!html)
                return null;
            const dp = new DOMParser();
            __classPrivateFieldGet(this, _Email_cache, "f").document = dp.parseFromString(html, "text/html");
            return __classPrivateFieldGet(this, _Email_cache, "f").document;
        }
    }
    display() {
        let emlUri = "data:text/plain,";
        const alts = this.getMultipartAlternatives();
        for (const [k, v] of iterObject(alts)) {
            const b = new Blob([v], { type: k });
            alts[k] = URL.createObjectURL(b);
        }
        if ("text/html" in alts)
            emlUri = alts["text/html"];
        else if ("text/plain" in alts)
            emlUri = alts["text/plain"];
        const doc = document.createElement("html");
        const head = makeChildNode(doc, "head");
        makeChildNode(head, "meta").setAttribute("charset", "utf-8");
        makeChildNode(head, "title", this.getFirstHeaderValue("Subject"));
        makeChildNode(head, "style", `
body {
    margin: 0;
    font-family: sans-serif;
}
#outer {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    position: absolute;
    display: flex;
    flex-flow: column;
}
#headers {
    flex: 0 1 auto;
    padding: 10px;
}
#variants span::after {
    content: ', ';
}
#variants span:last-child::after {
    content: '';
}
iframe {
    flex: 1 1 auto;
    border: none;
}
td:first-child {
    font-weight: bold;
    padding-right: 15px;
}
@media (prefers-color-scheme: dark) {
    #headers {
        background-color: #1b1b1b;
        color: #fff;
    }
    a {
        color: lightblue;
    }
}
`);
        const body = makeChildNode(doc, "body");
        const outer = makeChildNode(body, "div");
        outer.id = "outer";
        const headers = makeChildNode(outer, "div");
        headers.id = "headers";
        const table = makeChildNode(headers, "table");
        for (const header of ["From", "To", "Subject", "Date"]) {
            const row = makeChildNode(table, "tr");
            makeChildNode(row, "td", header);
            makeChildNode(row, "td", this.getFirstHeaderValue(header, ""));
        }
        const row = makeChildNode(table, "tr");
        makeChildNode(row, "td", "Variants");
        const vcell = makeChildNode(row, "td");
        vcell.id = "variants";
        for (const [variant, dataUri] of iterObject(alts)) {
            const typeSpan = makeChildNode(vcell, "span");
            const typeAnchor = makeChildNode(typeSpan, "a");
            typeAnchor.target = "emailFrame";
            typeAnchor.href = dataUri;
            typeAnchor.textContent = variant;
        }
        const ifr = makeChildNode(outer, "iframe");
        ifr.name = "emailFrame";
        ifr.src = emlUri;
        const data = `<!DOCTYPE html>\n${doc.outerHTML}`;
        const blob = new Blob([data], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank", "popup");
    }
    classify() {
        if (typeof __classPrivateFieldGet(this, _Email_cache, "f").classification !== "undefined") {
            if (__classPrivateFieldGet(this, _Email_cache, "f").classification === null) {
                throw new DisambiguationFailedError("Disambiguation of ambiguous email template failed");
            }
            return __classPrivateFieldGet(this, _Email_cache, "f").classification;
        }
        else {
            const subject = this.getFirstHeaderValue("Subject");
            for (const template of TEMPLATES) {
                if (subject.match(template.subject)) {
                    if ("disambiguate" in template && typeof template.disambiguate !== "undefined") {
                        __classPrivateFieldGet(this, _Email_cache, "f").classification = template.disambiguate(this);
                    }
                    else if ("type" in template) {
                        __classPrivateFieldGet(this, _Email_cache, "f").classification = {
                            type: template.type,
                            style: template.style,
                            language: template.language,
                        };
                    }
                    else {
                        __classPrivateFieldGet(this, _Email_cache, "f").classification = null;
                    }
                    return this.classify();
                }
            }
        }
        throw new NoMatchingTemplateError("This email does not appear to match any styles of Niantic emails currently known to Email API.");
    }
}
_Email_cache = new WeakMap(), _Email_instances = new WeakSet(), _Email_parseContentType = function _Email_parseContentType(ctHeader) {
    const m = ctHeader.match(/^(?<type>[^/]+\/[^/;\s]+)(?=($|(?<params>(;[^;]*)*)))/);
    if (m === null)
        throw new InvalidContentTypeError(`Unrecognized Content-Type ${ctHeader}`);
    const { type, params } = m.groups;
    const paramMap = {};
    if (params) {
        const paramList = params.substring(1).split(";");
        for (const param of paramList) {
            const [attr, value] = param.trim().split("=");
            paramMap[attr.toLowerCase()] = (value.startsWith("\"") && value.endsWith("\"")
                ? value.substring(1, value.length - 1)
                : value);
        }
    }
    return {
        type: type.toLowerCase(),
        params: paramMap,
    };
};
class WayfarerEmail extends Email {
    /**
     * @deprecated For internal use only!
     */
    createDebugBundle() {
        return __classPrivateFieldGet(this, _WayfarerEmail_dbObject, "f");
    }
    constructor(dbObject) {
        super(dbObject.headers, dbObject.body);
        _WayfarerEmail_dbObject.set(this, void 0);
        __classPrivateFieldSet(this, _WayfarerEmail_dbObject, dbObject, "f");
    }
    /**
     * Returns the filename of the email at the time it was imported. For *.eml imports, this will be
     * the real name of the file. For emails imported from third-party APIs that do not provide a
     * filename, the name will be generated, based on some identifier if one is available. In either
     * case, filenames returned by this property are NOT guaranteed to be unique.
     */
    get originatingFilename() {
        return __classPrivateFieldGet(this, _WayfarerEmail_dbObject, "f").filename;
    }
    /**
     * Returns the ID of this email. The ID can be passed to API.get() to return this email. The ID
     * is based on the Message-ID header of the email and is globally unique.
     */
    get messageID() {
        return __classPrivateFieldGet(this, _WayfarerEmail_dbObject, "f").id;
    }
    /**
     * Returns a Date object representing the exact time this email was last imported to the local
     * database.
     */
    get importedDate() {
        return new Date(__classPrivateFieldGet(this, _WayfarerEmail_dbObject, "f").ts);
    }
}
_WayfarerEmail_dbObject = new WeakMap();var uwfToolsCore = () => {
    register()({
        id: "uwt-core",
        name: "Unified Wayfarer Tools Core",
        authors: ["bilde2910"],
        description: "Unified Wayfarer Tools plugin loader and core utilities",
        url: "https://github.com/bilde2910/Wayfarer-Tools",
        defaultConfig: {
            activePlugins: [],
            externCompat: false,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("externCompat", {
                label: "External addon compatibility",
                help: "Exposes UWT APIs to the browser, allowing external userscripts not part of UWT to interact with addons in UWT that expose an API",
                editor: new CheckboxEditor(),
            });
            let reloadNotified = false;
            // redesign: the old settings page (app-settings) is gone. The list of active plugins is now the
            // first section of the settings window opened with the gear button (bottom left).
            const renderActivePlugins = (box) => {
                const activeAddonsBox = makeChildNode(box, "div");
                activeAddonsBox.classList.add("settings__item");
                activeAddonsBox.classList.add("settings-item");
                const activeAddonsHeader = makeChildNode(activeAddonsBox, "div");
                activeAddonsHeader.classList.add("settings-item__header");
                makeChildNode(activeAddonsHeader, "div", "Active Plugins");
                const activeAddonsBody = makeChildNode(activeAddonsBox, "div");
                activeAddonsBody.classList.add("settings-item__description");
                const refreshReminder = makeChildNode(activeAddonsBody, "p", "Please refresh the page for changes in active addons to take effect.");
                refreshReminder.classList.add("uwftcore-refresh-reminder");
                for (const addon of toolbox.listAvailableAddons().sort((a, b) => a.name.localeCompare(b.name))) {
                    const addonRow = makeChildNode(activeAddonsBody, "div");
                    addonRow.classList.add("uwftcore-plugin");
                    const titleRow = makeChildNode(addonRow, "p");
                    titleRow.classList.add("uwftcore-plugin-title");
                    const label = makeChildNode(titleRow, "label");
                    label.classList.add("uwftcore-checkbox");
                    const checkbox = makeChildNode(label, "input");
                    checkbox.setAttribute("type", "checkbox");
                    makeChildNode(label, "span", addon.name);
                    if (addon.id === "uwt-core") {
                        checkbox.setAttribute("checked", "checked");
                        checkbox.setAttribute("disabled", "disabled");
                    }
                    else {
                        const isAddonEnabled = config.get("activePlugins").includes(addon.id);
                        if (isAddonEnabled)
                            checkbox.setAttribute("checked", "checked");
                        checkbox.addEventListener("change", () => {
                            let plugins = config.get("activePlugins");
                            const newState = !plugins.includes(addon.id);
                            if (newState)
                                plugins.push(addon.id);
                            else
                                plugins = plugins.filter(n => n !== addon.id);
                            config.set("activePlugins", plugins);
                            logger.info(addon.id, "was", newState ? "enabled" : "disabled");
                            if (!reloadNotified) {
                                reloadNotified = true;
                                const msg = document.createElement("span");
                                msg.textContent = "To apply changes to active plugins, a reload is required. ";
                                makeChildNode(msg, "a", "Click here to reload now.")
                                    .addEventListener("click", () => location.reload());
                                toolbox.notify({
                                    color: "red",
                                    message: msg,
                                    dismissable: false,
                                });
                            }
                        });
                    }
                    makeChildNode(addonRow, "p", `Authors: ${addon.authors.join(", ")}`)
                        .classList.add("uwftcore-authors");
                    makeChildNode(addonRow, "p", addon.description)
                        .classList.add("uwftcore-description");
                    if (addon.depends) {
                        makeChildNode(addonRow, "p", "This addon requires the following extra userscripts to be installed:")
                            .classList.add("uwftcore-depends");
                        const ul = makeChildNode(addonRow, "ul");
                        ul.classList.add("uwftcore-depend-line");
                        for (const k in addon.depends) {
                            const a = makeChildNode(makeChildNode(ul, "li"), "a", k);
                            a.href = addon.depends[k];
                            a.target = "_blank";
                        }
                    }
                }
            };
            const setupEmailIDB = async () => {
                const env_1 = { stack: [], error: void 0, hasError: false };
                try {
                    // This scope triggers an open of the database, which in turn makes sure that the email
                    // object store exists. Not performing this check here may lead to deadlocks down the
                    // line. We don't need to actually use the database for anything; simply opening it and
                    // closing it will suffice.
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const _ = __addDisposableResource(env_1, await toolbox.openIDB("email", "readonly"), false);
                }
                catch (e_1) {
                    env_1.error = e_1;
                    env_1.hasError = true;
                }
                finally {
                    __disposeResources(env_1);
                }
            };
            toolbox.addSettingsSection(renderActivePlugins);
            if (config.get("externCompat")) {
                const publicApi = {
                    getAddonAPI: toolbox.getAddonAPI,
                };
                const w = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
                w.UWTApi = publicApi;
            }
            let emailAPI = null;
            return {
                email: async () => {
                    if (emailAPI !== null)
                        return emailAPI;
                    await setupEmailIDB();
                    emailAPI = new EmailAPI((mode) => toolbox.openIDB("email", mode));
                    return emailAPI;
                },
            };
        },
    });
};var ContributionType;
(function (ContributionType) {
    ContributionType["NOMINATION"] = "NOMINATION";
    ContributionType["EDIT_LOCATION"] = "EDIT_LOCATION";
    ContributionType["EDIT_DESCRIPTION"] = "EDIT_DESCRIPTION";
    ContributionType["EDIT_TITLE"] = "EDIT_TITLE";
    ContributionType["PHOTO"] = "PHOTO";
})(ContributionType || (ContributionType = {}));
var ContributionStatus;
(function (ContributionStatus) {
    ContributionStatus["ACCEPTED"] = "ACCEPTED";
    ContributionStatus["APPEALED"] = "APPEALED";
    ContributionStatus["DUPLICATE"] = "DUPLICATE";
    ContributionStatus["HELD"] = "HELD";
    ContributionStatus["NIANTIC_REVIEW"] = "NIANTIC_REVIEW";
    ContributionStatus["NOMINATED"] = "NOMINATED";
    ContributionStatus["REJECTED"] = "REJECTED";
    ContributionStatus["VOTING"] = "VOTING";
    ContributionStatus["WITHDRAWN"] = "WITHDRAWN";
})(ContributionStatus || (ContributionStatus = {}));
var OriginalPoiState;
(function (OriginalPoiState) {
    OriginalPoiState["LIVE"] = "LIVE";
    OriginalPoiState["RETIRED"] = "RETIRED";
})(OriginalPoiState || (OriginalPoiState = {}));// Copyright 2025 tehstone, Tntnnbltn, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var nominationStats = () => {
    register()({
        id: "nomination-stats",
        name: "Nomination Stats",
        authors: ["tehstone", "Thtnnbltn", "bilde2910"],
        description: "Add extended Wayfarer Profile stats",
        defaultConfig: {},
        sessionData: {},
        initialize: (toolbox, logger, _config) => {
            // ---- redesign: the Nominations page (app-submissions-list) and the header (wf-logo) the stats
            // panel and export buttons used to hook into are gone. A button at the bottom left (next to the
            // Nomination map button) now opens a window with the stats and the export buttons.
            let nominations = null;
            const openStatsWindow = async () => {
                const { container, dismiss } = await toolbox.createModal("uwtns-modal");
                if (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")) {
                    container.classList.add("uwt-dark");
                }
                const close = makeChildNode(container, "button", "\u00d7");
                close.className = "uwtns-x";
                close.addEventListener("click", dismiss);
                makeChildNode(container, "h2", "Nomination stats");
                const body = makeChildNode(container, "div");
                if (nominations === null) {
                    makeChildNode(body, "p", "Loading nominations...");
                    try {
                        const data = await toolbox.makeRequest("GET", "/api/v1/vault/manage");
                        if (data && data.submissions)
                            nominations = data.submissions;
                    }
                    catch (e) {
                        logger.error(e);
                    }
                    body.innerHTML = "";
                }
                if (nominations === null) {
                    makeChildNode(body, "p", "Could not load your nominations.");
                    return;
                }
                body.innerHTML = buildStatsHtml(nominations);
                addExportButtons(makeChildNode(container, "div"), nominations);
            };
            // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
            toolbox.addMenuItem("nomination-stats", {
                label: "Nomination stats",
                icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"11\"/><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"4\"/><line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"14\"/></svg>",
                callback: () => { void openStatsWindow(); },
            });
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", (data) => {
                if (data && data.submissions)
                    nominations = data.submissions;
            });
        },
    });
};
const buildStatsHtml = (subs) => {
    var _a, _b;
    const counts = {
        "EDIT": {},
        "TOTAL": {},
    };
    const decidedStatuses = [
        ContributionStatus.ACCEPTED,
        ContributionStatus.REJECTED,
        ContributionStatus.DUPLICATE,
    ];
    const submittedStatuses = [
        ...decidedStatuses,
        ContributionStatus.VOTING,
        ContributionStatus.NOMINATED,
        ContributionStatus.NIANTIC_REVIEW,
        ContributionStatus.APPEALED,
        ContributionStatus.WITHDRAWN,
        ContributionStatus.HELD,
    ];
    for (let i = 0; i < subs.length; i++) {
        const { type, status, upgraded } = subs[i];
        if (!counts[type])
            counts[type] = {};
        if (!counts[type][status])
            counts[type][status] = 0;
        counts[type][status]++;
        if (status === ContributionStatus.NOMINATED && upgraded) {
            counts[type]["NOMINATION_UPGRADED"] = (counts[type]["NOMINATION_UPGRADED"] || 0) + 1;
        }
        else if (status === ContributionStatus.VOTING && upgraded) {
            counts[type]["VOTING_UPGRADED"] = (counts[type]["VOTING_UPGRADED"] || 0) + 1;
        }
        if (decidedStatuses.includes(status)) {
            counts[type]["DECIDED"] = (counts[type]["DECIDED"] || 0) + 1;
        }
        if (submittedStatuses.includes(status)) {
            counts[type]["SUBMITTED"] = (counts[type]["SUBMITTED"] || 0) + 1;
        }
    }
    // Sum the stats for the different types of edits
    const statusTypes = ["SUBMITTED", "DECIDED", ...submittedStatuses];
    for (const typ of statusTypes) {
        counts["EDIT"][typ] = 0;
        for (const editType of [
            ContributionType.EDIT_TITLE,
            ContributionType.EDIT_DESCRIPTION,
            ContributionType.EDIT_LOCATION,
        ]) {
            counts["EDIT"][typ] += (_a = counts[editType][typ]) !== null && _a !== void 0 ? _a : 0;
        }
    }
    // Sum the total stats
    for (const typ of statusTypes) {
        counts["TOTAL"][typ] = 0;
        for (const editType of [
            "EDIT",
            ContributionType.NOMINATION,
            ContributionType.PHOTO,
        ]) {
            counts["TOTAL"][typ] += (_b = counts[editType][typ]) !== null && _b !== void 0 ? _b : 0;
        }
    }
    let html = "<table class='uwtns-stats-table'>";
    html += "<colgroup>";
    html += "<col style='width: 20%;'>".repeat(4);
    html += "</colgroup>";
    html += "<tr><th></th><th>Nominations</th><th>Edits</th><th>Photos</th><th>Total</th></tr>";
    const statusLabels = ["Submitted", "Decided", "Accepted", "Rejected", "Duplicates", "In Voting", "In Queue", "NIA Review", "Appealed", "Withdrawn", "On Hold"];
    const columnTypes = ["NOMINATION", "EDIT", "PHOTO", "TOTAL"];
    for (let i = 0; i < statusLabels.length; i++) {
        const status = statusTypes[i];
        html += "<tr><td>" + statusLabels[i] + "</td>";
        for (let j = 0; j < columnTypes.length; j++) {
            const columnType = columnTypes[j];
            let count = 0;
            const decidedCount = counts[columnType]["DECIDED"] || 0;
            count += counts[columnType][status] || 0;
            if ([...submittedStatuses, "ACCEPTED"].includes(status)) {
                const finePercentage = Math.round((count / decidedCount) * 10000) / 100;
                const percentage = Math.round((count / decidedCount) * 100);
                const fineLabel = isNaN(finePercentage) ? "—%" : `${finePercentage}%`;
                const label = isNaN(percentage) ? "—%" : `${percentage}%`;
                html += "<td id='" + columnType + "-" + status.replace(/ /g, "-") + "'>";
                html += count + "&nbsp;<span title='" + fineLabel + "' style='font-size: smaller'>(" + label + ")</span></td>";
            }
            else {
                html += "<td id='" + columnType + "-" + status.replace(/ /g, "-") + "'>" + count + "</td>";
            }
        }
        html += "</tr>";
    }
    html += "</table>";
    return html;
};
const addExportButtons = (div, subs) => {
    div.id = "uwftns-export";
    const exportButton = makeChildNode(div, "button", "Export JSON");
    exportButton.addEventListener("click", () => exportNominationsJson(subs));
    exportButton.classList.add("uwftcore-ui-button");
    const exportCsvButton = makeChildNode(div, "button", "Export CSV");
    exportCsvButton.addEventListener("click", () => exportNominationsCsv(subs));
    exportCsvButton.classList.add("uwftcore-ui-button");
};
const exportNominationsJson = (subs) => {
    const dataStr = JSON.stringify(subs);
    downloadAsFile(dataStr, "applications/json", "contributions.json");
};
const exportNominationsCsv = (subs) => {
    var _a, _b, _c;
    const separator = ".";
    const headers = [];
    for (const item of subs) {
        for (const [k, v] of iterObject(item)) {
            if (Array.isArray(v)) {
                if (k === "rejectReasons") {
                    if (!headers.includes(k))
                        headers.push(k);
                    for (const reject of v) {
                        const reasonKey = k + separator + reject.reason;
                        if (!headers.includes(reasonKey))
                            headers.push(reasonKey);
                    }
                }
                else if (k === "supportingImageUrls") {
                    if (!headers.includes(k))
                        headers.push(k);
                    for (let i = 0; i < v.length; i++) {
                        const urlKey = k + separator + i;
                        if (!headers.includes(urlKey))
                            headers.push(urlKey);
                    }
                }
            }
            else if (k === "poiData") {
                if (item.type !== ContributionType.NOMINATION) {
                    for (const poiKey of iterKeys(v)) {
                        const pdKey = k + separator + poiKey;
                        if (!headers.includes(pdKey))
                            headers.push(pdKey);
                    }
                }
            }
            else {
                if (!headers.includes(k))
                    headers.push(k);
            }
        }
    }
    // Generate CSV headers dynamically from headers
    let csv = headers.join(",") + "\r\n";
    for (const item of subs) {
        let row = "";
        for (const header of headers) {
            const sep = header.indexOf(separator);
            if (sep >= 0) {
                const itemKey = header.substring(0, sep);
                const subKey = header.substring(sep + 1);
                if (itemKey === "poiData" && item.type !== ContributionType.NOMINATION) {
                    const tsKey = subKey;
                    row += `"${String((_a = item.poiData[tsKey]) !== null && _a !== void 0 ? _a : "").replace(/"/g, "\"\"")}",`;
                }
                else if (Array.isArray(item[itemKey]) && itemKey === "rejectReasons") {
                    row += item[itemKey].map(r => r.reason).includes(subKey) ? "1," : "0,";
                }
                else if (Array.isArray(item[itemKey]) && itemKey === "supportingImageUrls") {
                    const iSubKey = parseInt(subKey);
                    row += iSubKey < item[itemKey].length ? item[itemKey][iSubKey] : "";
                    row += ",";
                }
                else {
                    row += ",";
                }
            }
            else {
                const tHdr = header;
                if (tHdr === "rejectReasons") {
                    row += `"${((_b = item[tHdr]) !== null && _b !== void 0 ? _b : []).map(r => r.reason).join(",").replace(/"/g, "\"\"")}",`;
                }
                else {
                    row += `"${String((_c = item[tHdr]) !== null && _c !== void 0 ? _c : "").replace(/"/g, "\"\"")}",`;
                }
            }
        }
        // Remove trailing comma
        csv += row.slice(0, -1) + "\r\n";
    }
    downloadAsFile(csv, "text/csv; charset=utf-8", "contributions.csv");
};// Copyright 2025 tehstone, bilde2910, Tntnnbltn
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
const GRIDS = [
    {
        level: 14,
        color: "red",
        thickness: 2,
    },
    {
        level: 17,
        color: "green",
    },
];
var nominationMap = () => {
    register()({
        id: "nomination-map",
        name: "Nomination Map",
        authors: ["tehstone", "bilde2910", "Tntnnblth"],
        description: "Add map of all nominations",
        defaultConfig: {
            loadFirst: true,
            maxClusteringZoom: 10,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("maxClusteringZoom", {
                label: "Max zoom level for marker clustering",
                help: "Value from 0-20, where higher numbers equal closer zoom. When the map is zoomed in beyond this level, markers will no longer cluster together.",
                editor: new NumericInputEditor({ min: 0, max: 20 }),
            });
            // ---- redesign: the Nominations page markup (list, search box, sort dialog) is gone, so the map no
            // longer hooks into it. A button at the bottom left (above the settings gear) opens the map of all
            // nominations in a window, on any Wayfarer page. Data comes from the /manage request.
            let nominations = null;
            let nominationMap = null;
            let nominationCluster = null;
            let nominationMarkers = [];
            let infoWindow = null;
            const hiddenStatuses = new Set();
            let redraw = null;
            const parseContributions = (data) => {
                if (!data || !data.submissions)
                    return;
                nominations = data.submissions;
                if (redraw)
                    void redraw(true);
            };
            const STATUS_COLORS = {
                [ContributionStatus.ACCEPTED]: "green",
                [ContributionStatus.APPEALED]: "purple",
                [ContributionStatus.NOMINATED]: "blue",
                [ContributionStatus.WITHDRAWN]: "grey",
                [ContributionStatus.VOTING]: "yellow",
                [ContributionStatus.DUPLICATE]: "orange",
                [ContributionStatus.REJECTED]: "red",
            };
            const getIconUrl = (nomination) => `https://maps.google.com/mapfiles/ms/icons/${STATUS_COLORS[nomination.status] || "blue"}.png`;
            const prettyStatus = (st) => String(st || "UNKNOWN").toLowerCase().replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
            const ensureStyle = () => {
                if (document.getElementById("uwtnm-style2"))
                    return;
                const st = document.createElement("style");
                st.id = "uwtnm-style2";
                st.textContent = `

        .uwtnm-modal{background:#fff !important;color:#111827 !important;max-width:none !important;max-height:none !important;
        width:calc(100vw - 50px);height:calc(100vh - 50px);overflow:hidden !important;display:flex;flex-direction:column;box-sizing:border-box}
        .uwtnm-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}
        .uwtnm-head{display:flex;align-items:center;gap:12px;margin-bottom:8px}
        .uwtnm-head h2{font-size:1.3rem;font-weight:bold;margin:0}
        .uwtnm-head .uwtnm-count{opacity:.7}
        .uwtnm-head button.uwtnm-x{margin-left:auto;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}
        .uwtnm-head button.uwtnm-x:hover{opacity:1}
        .uwtnm-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
        .uwtnm-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(128,128,128,.55);border-radius:999px;
        padding:2px 10px;font-size:13px;cursor:pointer;background:transparent;color:inherit}
        .uwtnm-chip.uwtnm-off{opacity:.4;text-decoration:line-through}
        .uwtnm-chip img{width:12px;height:20px;object-fit:contain}
        .uwtnm-mapbox{flex:1 1 auto;min-height:200px;border-radius:8px;overflow:hidden;background:#ddd}
        .uwtnm-mapbox .uwtnm-msg{padding:16px}
        .uwtnm-iw{max-width:220px;color:#111}
        .uwtnm-iw img{max-width:100%;border-radius:6px;margin:6px 0}
        .uwtnm-iw button{margin-top:4px;padding:2px 8px;border:1px solid #9ca3af;border-radius:4px;background:#f3f4f6;cursor:pointer}`;
                document.head.appendChild(st);
            };
            const openMapWindow = async () => {
                ensureStyle();
                const { container, dismiss } = await toolbox.createModal("uwtnm-modal");
                if (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")) {
                    container.classList.add("uwt-dark");
                }
                const head = makeChildNode(container, "div");
                head.className = "uwtnm-head";
                makeChildNode(head, "h2", "Nomination map");
                const countEl = makeChildNode(head, "span");
                countEl.className = "uwtnm-count";
                const reload = makeChildNode(head, "button", "Reload");
                reload.className = "uwtnm-chip";
                const close = makeChildNode(head, "button", "\u00d7");
                close.className = "uwtnm-x";
                const chips = makeChildNode(container, "div");
                chips.className = "uwtnm-chips";
                const mapBox = makeChildNode(container, "div");
                mapBox.className = "uwtnm-mapbox";
                const message = (text) => {
                    mapBox.innerHTML = "";
                    makeChildNode(mapBox, "p", text).className = "uwtnm-msg";
                };
                const closeAll = () => {
                    redraw = null;
                    nominationMap = null;
                    nominationCluster = null;
                    nominationMarkers = [];
                    infoWindow = null;
                    dismiss();
                };
                close.addEventListener("click", closeAll);
                const load = async () => {
                    message("Loading nominations...");
                    try {
                        const data = await toolbox.makeRequest("GET", "/api/v1/vault/manage");
                        if (data && data.submissions)
                            nominations = data.submissions;
                    }
                    catch (e) {
                        logger.error(e);
                        if (!nominations) {
                            message("Could not load your nominations.");
                            return false;
                        }
                    }
                    return true;
                };
                const buildChips = () => {
                    chips.innerHTML = "";
                    const counts = {};
                    for (const n of nominations)
                        counts[n.status] = (counts[n.status] || 0) + 1;
                    for (const [status, count] of Object.entries(counts).sort((x, y) => y[1] - x[1])) {
                        const chip = makeChildNode(chips, "button");
                        chip.type = "button";
                        chip.className = "uwtnm-chip" + (hiddenStatuses.has(status) ? " uwtnm-off" : "");
                        const icon = document.createElement("img");
                        icon.src = getIconUrl({ status });
                        chip.appendChild(icon);
                        chip.appendChild(document.createTextNode(`${prettyStatus(status)} (${count})`));
                        chip.addEventListener("click", () => {
                            if (hiddenStatuses.has(status))
                                hiddenStatuses.delete(status);
                            else
                                hiddenStatuses.add(status);
                            chip.classList.toggle("uwtnm-off");
                            void draw(true);
                        });
                    }
                };
                const draw = async (reset) => {
                    if (!nominations || nominationMap === null)
                        return;
                    const map = nominationMap;
                    const G = uwtGoogle();
                    if (nominationCluster !== null)
                        nominationCluster.clearMarkers();
                    for (const m of nominationMarkers)
                        m.setMap(null);
                    const shown = nominations.filter(n => !hiddenStatuses.has(n.status) && Number.isFinite(n.lat) && Number.isFinite(n.lng));
                    countEl.textContent = `${shown.length} of ${nominations.length} shown`;
                    const bounds = new G.maps.LatLngBounds();
                    nominationMarkers = shown.map(n => {
                        const ll = { lat: n.lat, lng: n.lng };
                        const marker = new G.maps.Marker({
                            map,
                            position: ll,
                            title: n.title,
                            icon: { url: getIconUrl(n) },
                        });
                        marker.addListener("click", () => {
                            if (!infoWindow)
                                infoWindow = new G.maps.InfoWindow();
                            const box = document.createElement("div");
                            box.className = "uwtnm-iw";
                            const t = document.createElement("strong");
                            t.textContent = n.title || "(untitled)";
                            box.appendChild(t);
                            box.appendChild(document.createElement("br"));
                            box.appendChild(document.createTextNode(prettyStatus(n.status)));
                            if (typeof n.imageUrl === "string" && /^https:\/\//.test(n.imageUrl)) {
                                box.appendChild(document.createElement("br"));
                                const img = document.createElement("img");
                                img.src = n.imageUrl;
                                box.appendChild(img);
                            }
                            if (n.id) {
                                box.appendChild(document.createElement("br"));
                                const copy = document.createElement("button");
                                copy.textContent = "Copy ID";
                                copy.addEventListener("click", () => { void navigator.clipboard.writeText(String(n.id)); copy.textContent = "Copied"; });
                                box.appendChild(copy);
                            }
                            infoWindow.setContent(box);
                            infoWindow.open({ map, anchor: marker });
                        });
                        bounds.extend(ll);
                        return marker;
                    });
                    nominationCluster = new markerclusterer.MarkerClusterer({
                        map,
                        markers: nominationMarkers,
                        renderer: new NominationMapClusterRenderer(),
                        algorithmOptions: { maxZoom: config.get("maxClusteringZoom") },
                    });
                    if (reset && nominationMarkers.length)
                        map.fitBounds(bounds);
                };
                const build = async () => {
                    for (let i = 0; i < 40 && !(uwtPageWin.google && uwtPageWin.google.maps); i++)
                        await new Promise(r => setTimeout(r, 250));
                    if (!(uwtPageWin.google && uwtPageWin.google.maps)) {
                        message("Google Maps is not loaded on this page. Open a Wayfarer page that shows a map (for example a review), then try again.");
                        return;
                    }
                    mapBox.innerHTML = "";
                    const G = uwtGoogle();
                    nominationMap = new G.maps.Map(mapBox, {
                        zoom: 8,
                        center: { lat: 0, lng: 0 },
                        scrollwheel: true,
                        gestureHandling: "greedy",
                    });
                    redraw = draw;
                    buildChips();
                    await draw(true);
                    await addS2Overlay(nominationMap, GRIDS);
                };
                reload.addEventListener("click", async () => {
                    if (await load()) {
                        buildChips();
                        await draw(true);
                    }
                });
                if (nominations === null && !(await load()))
                    return;
                await build();
            };
            // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
            toolbox.addMenuItem("nomination-map", {
                label: "Nomination map",
                icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.5\"></circle></svg>",
                callback: () => { void openMapWindow(); },
            });
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", parseContributions);
        },
    });
};
class NominationMapClusterRenderer {
    render(cluster, _stats, _map) {
        const gradient = [
            {
                count: 1,
                color: [68, 185, 0], // rgba(68, 185, 0, 1)
            }, {
                count: 10,
                color: [255, 183, 0], // rgba(255, 183, 0, 1)
            }, {
                count: 100,
                color: [224, 0, 0], // rgba(224, 0, 0, 1)
            }, {
                count: 1000,
                color: [186, 0, 233], // rgba(186, 0, 233, 1)
            }, {
                count: 10000,
                color: [48, 168, 224], // rgb(48, 168, 224)
            },
        ];
        let nextStop = 0;
        while ((++nextStop) < gradient.length - 1 && gradient[nextStop].count < cluster.count)
            ;
        const colorComponents = (cluster.count > gradient[nextStop].count)
            ? gradient[nextStop].color
            : weightNumericArray(gradient[nextStop - 1].color, gradient[nextStop].color, 1 - ((cluster.count - gradient[nextStop - 1].count) /
                (gradient[nextStop].count - gradient[nextStop - 1].count)));
        const color = `rgb(${colorComponents.map(c => c.toString()).join(", ")})`;
        const svg = `<svg fill="${color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="50" height="50">
<circle cx="120" cy="120" opacity=".6" r="70" />
<circle cx="120" cy="120" opacity=".3" r="90" />
<circle cx="120" cy="120" opacity=".2" r="110" />
<text x="50%" y="50%" style="fill: #fff; font-family: sans-serif; font-weight: bold;" text-anchor="middle" font-size="50" dominant-baseline="middle">${cluster.count}</text>
</svg>`;
        const title = `Cluster of ${cluster.count} contributions`;
        // Adjust zIndex to be above other markers
        const zIndex = Number(uwtGoogle().maps.Marker.MAX_ZINDEX) + cluster.count;
        const clusterOptions = {
            position: cluster.position,
            zIndex,
            title,
            icon: {
                url: `data:image/svg+xml;base64,${btoa(svg)}`,
                anchor: new (uwtGoogle().maps.Point)(25, 25),
            },
        };
        return new (uwtGoogle().maps.Marker)(clusterOptions);
    }
}// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
const REJECTION_MAP = {
    PHOTO_BAD_BLURRY: "Blurry Photo",
    PHOTO_FACE: "Face or body parts",
    PHOTO_PLATE: "License plate",
    PHOTO_DIR: "Orientation",
    PHOTO_TAG: "Submitter identifiable",
    PHOTO_3P: "Third party photo",
    PHOTO_WATERMARK: "Watermark",
    PHOTO_BAD: "Low quality or inaccurate photo",
    EMOJI_TITLE: "Emoji or emoticon",
    MARKUP_TITLE: "URL or markup",
    TEXT_BAD_TITLE: "Low quality or inaccurate title",
    EMOJI_DESCRIPTION: "Emoji or emoticon in description",
    MARKUP_DESCRIPTION: "URL or markup in description",
    TEXT_BAD_DESCRIPTION: "Low quality or inaccurate description",
    ACCURACY_FAKE: "Fake nomination",
    ACCURACY_EXPLICIT: "Explicit Content",
    ACCURACY_PERSONAL: "Influencing Reviewers",
    ACCURACY_OFFENSIVE: "Offensive",
    ACCURACY_ABUSE: "Other abuse-related reasons",
    MISMATCH: "Inaccurate Location",
    PRIVATE: "Private property",
    INAPPROPRIATE: "Adult location",
    SCHOOL: "Schools",
    SENSITIVE: "Sensitive location",
    EMERGENCY: "Obstructs emergency operations",
    GENERIC: "Generic business",
    "": "(Blank)",
};
const FLOW_CHANGE_TIME = 1698674400000;
const BASE_COLUMNS = ["type", "id", "title", "description", "lat", "lng"];
const NEW_COLUMNS = [...BASE_COLUMNS, "imageUrl", "statement", "supportingImageUrls"];
const EDIT_COLUMNS = [...BASE_COLUMNS, "descriptionEdits", "titleEdits", "locationEdits"];
const PHOTO_COLUMNS = [...BASE_COLUMNS, "newPhotos"];
var reviewHistory = () => {
    register()({
        id: "review-history",
        name: "Review History",
        authors: ["tehstone", "bilde2910"],
        description: "Add local review history storage to Wayfarer",
        defaultConfig: {
            importAfter: 0,
            importAround: {
                lat: 0,
                lng: 0,
            },
            importWithin: 0,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("importAfter", {
                label: "Import after date",
                help: "Any reviews in the import file prior to the selected date will not be imported.",
                editor: new UnixTimestampDateOnlyEditor(),
            });
            const handleIncomingReview = async (review) => {
                logger.info("handleIncomingReview");
                let filtered = null;
                switch (review.type) {
                    case "NEW":
                        filtered = filterObject(review, NEW_COLUMNS);
                        break;
                    case "EDIT":
                        filtered = filterObject(review, EDIT_COLUMNS);
                        break;
                    case "PHOTO":
                        filtered = filterObject(review, PHOTO_COLUMNS);
                        break;
                }
                if (filtered !== null) {
                    const env_1 = { stack: [], error: void 0, hasError: false };
                    try {
                        const saveData = { ...filtered, ts: Date.now(), review: null };
                        const idb = __addDisposableResource(env_1, await toolbox.openIDB("history", "readwrite"), false);
                        idb.put(saveData);
                        idb.commit();
                    }
                    catch (e_1) {
                        env_1.error = e_1;
                        env_1.hasError = true;
                    }
                    finally {
                        __disposeResources(env_1);
                    }
                }
                else {
                    logger.error("Unknown review type: " + review.type);
                }
            };
            const handleSubmittedReview = async (review, result) => {
                logger.info("handleSubmittedReview");
                if (result === "api.review.post.accepted" && !!review.id) {
                    const env_2 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_2, await toolbox.openIDB("history", "readwrite"), false);
                        const assigned = await idb.get(review.id);
                        if (assigned.type === "NEW" && review.type === "NEW") {
                            idb.put({ ...assigned, review });
                        }
                        else if (assigned.type === "EDIT" && review.type === "EDIT") {
                            idb.put({ ...assigned, review });
                        }
                        else if (assigned.type === "PHOTO" && review.type === "PHOTO") {
                            idb.put({ ...assigned, review });
                        }
                        else {
                            idb.commit();
                            const msg = `Attempted to submit a ${review.type} review for a ${assigned.type} assignment`;
                            logger.warn();
                            logger.warn("Submitted review:", review);
                            logger.warn("Assigned review:", assigned);
                            alert(`${msg}. This should not be possbile. Please see the developer console for more details.`);
                            return;
                        }
                        idb.commit();
                    }
                    catch (e_2) {
                        env_2.error = e_2;
                        env_2.hasError = true;
                    }
                    finally {
                        __disposeResources(env_2);
                    }
                }
            };
            // ---- redesign: the profile page (wf-credibility-card) the export/import buttons and history tables
            // used to be added to is gone. A button at the bottom left (next to the Nomination stats button)
            // opens the review history in a window instead. Recording reviews is unchanged (API based).
            let openGrids = [];
            const openHistoryWindow = async () => {
                const { container, dismiss } = await toolbox.createModal("uwtrh-modal");
                if (isDarkMode())
                    container.classList.add("uwt-dark");
                const close = makeChildNode(container, "button", "\u00d7");
                close.className = "uwtrh-x";
                close.addEventListener("click", () => {
                    for (const api of openGrids)
                        api.destroy();
                    openGrids = [];
                    dismiss();
                });
                makeChildNode(container, "h2", "Review history");
                addRHButtons(makeChildNode(container, "div"));
                await renderReviewHistory(container);
            };
            const addRHButtons = (outer) => {
                outer.classList.add("uwtrh-idb");
                makeChildNode(outer, "p", "Review history:");
                makeChildNode(outer, "button", "Export")
                    .addEventListener("click", async () => {
                    const env_3 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_3, await toolbox.openIDB("history", "readonly"), false);
                        const result = await idb.getAll();
                        downloadAsFile(JSON.stringify(result), "application/json", `reviewHistory-${toolbox.username}.json`);
                    }
                    catch (e_3) {
                        env_3.error = e_3;
                        env_3.hasError = true;
                    }
                    finally {
                        __disposeResources(env_3);
                    }
                });
                makeChildNode(outer, "button", "Import")
                    .addEventListener("click", async () => {
                    if (!confirm("Importing will overwrite all currently stored data, " +
                        "are you sure you want to clear your currently saved review history?"))
                        return;
                    const contents = await readFile(".json", "application/json");
                    const jsonData = JSON.parse(await contents.text());
                    const toStore = [];
                    let imported = 0, failed = 0, filtered = 0;
                    try {
                        const env_4 = { stack: [], error: void 0, hasError: false };
                        try {
                            for (const review of jsonData) {
                                let found = false;
                                if (!("id" in review)) {
                                    if ("review" in review) {
                                        if (review.review !== false && review.review != "skipped") {
                                            if ("id" in review.review) {
                                                review.id = review.review.id;
                                                found = true;
                                                if (applyFilters(review)) {
                                                    toStore.push(review);
                                                    imported++;
                                                }
                                                else {
                                                    filtered++;
                                                }
                                            }
                                        }
                                    }
                                }
                                else {
                                    found = true;
                                    if (applyFilters(review)) {
                                        toStore.push(review);
                                        imported++;
                                    }
                                    else {
                                        filtered++;
                                    }
                                }
                                if (!found) {
                                    failed++;
                                }
                            }
                            const idb = __addDisposableResource(env_4, await toolbox.openIDB("history", "readwrite"), false);
                            await idb.clear();
                            idb.put(...toStore);
                            idb.commit();
                        }
                        catch (e_4) {
                            env_4.error = e_4;
                            env_4.hasError = true;
                        }
                        finally {
                            __disposeResources(env_4);
                        }
                    }
                    catch (error) {
                        alert(`Failed to import data with error:\n${error}`);
                        location.reload();
                        return;
                    }
                    let alertText = `Cleared all saved review history.\nImported ${imported} review history item(s).`;
                    if (filtered > 0)
                        alertText += `\nFiltered ${filtered} item(s) from import.`;
                    if (failed > 0)
                        alertText += `\nFailed to import ${failed} item(s).`;
                    alert(alertText);
                    location.reload();
                });
                makeChildNode(outer, "button", "Clear")
                    .addEventListener("click", async () => {
                    if (confirm("Are you sure you want to clear your review history?")) {
                        const env_5 = { stack: [], error: void 0, hasError: false };
                        try {
                            const idb = __addDisposableResource(env_5, await toolbox.openIDB("history", "readwrite"), false);
                            await idb.clear();
                            alert("Cleared all saved review history.");
                            location.reload();
                        }
                        catch (e_5) {
                            env_5.error = e_5;
                            env_5.hasError = true;
                        }
                        finally {
                            __disposeResources(env_5);
                        }
                    }
                });
            };
            const applyFilters = (review) => {
                const dateAfter = config.get("importAfter");
                if (dateAfter !== 0 && review.ts < dateAfter) {
                    return false;
                }
                const { lat, lng } = config.get("importAround");
                const range = config.get("importWithin");
                if (!(lat === 0 && lng === 0) && range !== 0) {
                    const reviewDistance = haversine(lat, lng, review["lat"], review["lng"]);
                    if (reviewDistance > range * 1000) {
                        return false;
                    }
                }
                return true;
            };
            const renderReviewHistory = async (parent) => {
                var _a;
                const env_6 = { stack: [], error: void 0, hasError: false };
                try {
                    const rhNew = [];
                    const rhEdits = [];
                    const rhPhotos = [];
                    const idb = __addDisposableResource(env_6, await toolbox.openIDB("history", "readonly"), false);
                    const reviews = await idb.getAll();
                    for (const review of reviews) {
                        if (review.type === "NEW")
                            rhNew.push(review);
                        else if (review.type === "EDIT")
                            rhEdits.push(review);
                        else if (review.type === "PHOTO")
                            rhPhotos.push(review);
                    }
                    makeChildNode(parent, "p", `${reviews.length} review(s) stored locally`).classList.add("uwtrh-count");
                    const searchBox = document.createElement("input");
                    searchBox.classList.add("uwftcore-fix", "uwftcore-ui-large-input");
                    searchBox.placeholder = "Search...";
                    const tables = [
                        {
                            label: "Nomination Reviews",
                            table: renderNewTable(searchBox, rhNew),
                        }, {
                            label: "Edit Reviews",
                            table: renderEditsTable(searchBox, rhEdits),
                        }, {
                            label: "Photo Reviews",
                            table: renderPhotosTable(searchBox, rhPhotos),
                        },
                    ];
                    const selector = renderTableSelector(searchBox, tables);
                    parent.appendChild(selector);
                    for (const table of tables) {
                        parent.appendChild(table.table);
                    }
                    // show the nomination reviews first
                    (_a = selector.querySelector("button")) === null || _a === void 0 ? void 0 : _a.click();
                }
                catch (e_6) {
                    env_6.error = e_6;
                    env_6.hasError = true;
                }
                finally {
                    __disposeResources(env_6);
                }
            };
            const renderTableSelector = (searchBox, tables) => {
                const container = document.createElement("div");
                const btns = [];
                for (const { label, table } of tables) {
                    const btn = makeChildNode(container, "button", label);
                    btn.addEventListener("click", () => toggleTableDisplay(table, tables.map(t => t.table)));
                    btn.classList.add("uwftcore-ui-button");
                    btns.push(btn);
                }
                for (const btn of btns) {
                    btn.addEventListener("click", (ev) => {
                        for (const b of btns)
                            b.classList.remove("uwftcore-ui-button-active");
                        const e = ev.target;
                        e.classList.add("uwftcore-ui-button-active");
                    });
                }
                container.appendChild(searchBox);
                return container;
            };
            const toggleTableDisplay = (table, hide) => {
                for (const other of hide)
                    other.style.display = "none";
                table.style.display = "block";
            };
            const locationRenderer = (params) => `
          <a href="https://intel.ingress.com/?ll=${parseFloat(params.value.lat.toString())},${parseFloat(params.value.lng.toString())}&z=16" target="_blank">
            ${parseFloat(params.value.lat.toString()).toFixed(6)}, ${parseFloat(params.value.lng.toString()).toFixed(6)}
          </a>`;
            const renderNewTable = (searchBox, data) => {
                const l10n = toolbox.l10n;
                return makeDataTable(searchBox, {
                    rowData: data.map(review => {
                        const rText = (() => {
                            if (review.review !== null && typeof review.review !== "undefined") {
                                if (review.ts < FLOW_CHANGE_TIME) {
                                    const oldType = review.review;
                                    if (typeof oldType.quality !== "undefined") {
                                        return oldType.quality.toString();
                                    }
                                    else if (typeof oldType.rejectReason !== "undefined") {
                                        return l10n[`reject.reason.${oldType.rejectReason.toLowerCase()}.short`];
                                    }
                                    else if ("duplicate" in oldType) {
                                        return "Duplicate";
                                    }
                                    else {
                                        logger.warn("Unknown old-type review", review.review);
                                    }
                                }
                                else {
                                    if ("quality" in review.review) {
                                        return "Accepted";
                                    }
                                    else if ("rejectReasons" in review.review) {
                                        const rejections = [];
                                        for (const r of review.review.rejectReasons) {
                                            const rjText = l10n[`reject.reason.${r.toLowerCase()}.short`];
                                            rejections.push(rjText || REJECTION_MAP[r] || r);
                                        }
                                        return rejections.join(", ");
                                    }
                                    else if ("duplicate" in review.review) {
                                        return "Duplicate";
                                    }
                                    else {
                                        logger.warn("Unknown new-type review", review.review);
                                    }
                                }
                            }
                            else {
                                return "Skipped/Timed Out";
                            }
                        })();
                        return {
                            ...review,
                            date: new Date(review.ts),
                            review: rText,
                            location: {
                                lat: review.lat,
                                lng: review.lng,
                            },
                        };
                    }),
                    columnDefs: [
                        { field: "date", headerName: "Date" },
                        { field: "title", headerName: "Title" },
                        { field: "description", headerName: "Description" },
                        { field: "review", headerName: "Review" },
                        { field: "location", headerName: "Location", cellRenderer: locationRenderer },
                    ],
                });
            };
            const renderEditsTable = (searchBox, data) => {
                return makeDataTable(searchBox, {
                    rowData: data.map(review => {
                        const editType = (() => {
                            const types = [];
                            if (review.locationEdits.length > 1)
                                types.push("Location");
                            if (review.descriptionEdits.length > 0)
                                types.push("Description");
                            if (review.titleEdits.length > 0)
                                types.push("Title");
                            return types.join(", ");
                        })();
                        return {
                            ...review,
                            date: new Date(review.ts),
                            title: review.titleEdits.length > 0 ? review.titleEdits.map(t => t.value).join(" / ") : review.title,
                            editType,
                            location: {
                                lat: review.lat,
                                lng: review.lng,
                            },
                        };
                    }),
                    columnDefs: [
                        { field: "date", headerName: "Date" },
                        { field: "title", headerName: "Title" },
                        { field: "editType", headerName: "Type" },
                        { field: "location", headerName: "Location", cellRenderer: locationRenderer },
                    ],
                });
            };
            const renderPhotosTable = (searchBox, data) => {
                return makeDataTable(searchBox, {
                    rowData: data.map(review => {
                        return {
                            ...review,
                            date: new Date(review.ts),
                            photoCount: review.newPhotos.length,
                            accepted: review.review === null ? "N/A" : `${review.review.acceptPhotos.length} / ${review.newPhotos.length}`,
                            location: {
                                lat: review.lat,
                                lng: review.lng,
                            },
                        };
                    }),
                    columnDefs: [
                        { field: "date", headerName: "Date" },
                        { field: "title", headerName: "Title" },
                        { field: "photoCount", headerName: "Photo Count" },
                        { field: "accepted", headerName: "Accepted" },
                        { field: "location", headerName: "Location", cellRenderer: locationRenderer },
                    ],
                });
            };
            const makeDataTable = (searchBox, gridOptions) => {
                logger.info(gridOptions);
                const container = document.createElement("div");
                container.classList.add("uwtrh-table");
                const api = agGrid.createGrid(container, {
                    ...gridOptions,
                    theme: agGrid.themeQuartz.withPart(isDarkMode() ? agGrid.colorSchemeDark : agGrid.colorSchemeLight),
                    pagination: true,
                });
                openGrids.push(api);
                searchBox.addEventListener("input", () => {
                    api.setGridOption("quickFilterText", searchBox.value);
                });
                return container;
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/review", handleIncomingReview);
            toolbox.interceptSendJson("/api/v1/vault/review", handleSubmittedReview);
            // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
            toolbox.addMenuItem("review-history", {
                label: "Review history",
                icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><polyline points=\"12 7 12 12 15 14\"/></svg>",
                callback: () => { void openHistoryWindow(); },
            });
            return {
                async getAllReviews() {
                    let result = [];
                    {
                        const env_7 = { stack: [], error: void 0, hasError: false };
                        try {
                            const idb = __addDisposableResource(env_7, await toolbox.openIDB("history", "readonly"), false);
                            result = await idb.getAll();
                        }
                        catch (e_7) {
                            env_7.error = e_7;
                            env_7.hasError = true;
                        }
                        finally {
                            __disposeResources(env_7);
                        }
                    }
                    return result;
                },
            };
        },
    });
};// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
class InvalidContextError extends Error {
    constructor() {
        super("Invalid context type");
    }
}
class ThumbCard {
    constructor(id, opens) {
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "opens", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.id = id;
        this.opens = opens;
    }
    isDialogOpen() {
        return isDialogOpen(this.opens);
    }
}
const ThumbCards = {
    APPROPRIATE: new ThumbCard("appropriate-card", "app-appropriate-rejection-flow-modal"),
    SAFE: new ThumbCard("safe-card", "app-safe-rejection-flow-modal"),
    ACCURATE: new ThumbCard("accurate-and-high-quality-card", "app-accuracy-rejection-flow-modal"),
    PERMANENT: new ThumbCard("permanent-location-card", "app-location-permanent-rejection-flow-modal"),
};
var RenderContextType;
(function (RenderContextType) {
    RenderContextType["NULL"] = "NULL";
    RenderContextType["NEW"] = "NEW";
    RenderContextType["EDIT"] = "EDIT";
    RenderContextType["PHOTO"] = "PHOTO";
})(RenderContextType || (RenderContextType = {}));
var keyboardReview = () => {
    register()({
        id: "keyboard-review",
        name: "Keyboard Review",
        authors: ["tehstone", "bilde2910"],
        description: "Add keyboard review to Wayfarer",
        defaultConfig: {
            autoScrollCards: true,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("autoScrollCards", {
                label: "Auto-scroll cards when reviewing",
                help: "Whether to automatically scroll to the focused card when you press keyboard buttons during review",
                editor: new CheckboxEditor(),
            });
            let kdEvent = null;
            let keySequence = null;
            let context = {
                type: RenderContextType.NULL,
                navigable: false,
                draw: () => { },
            };
            (() => {
                document.addEventListener("keyup", e => {
                    if (e.key === "Shift") {
                        keySequence = null;
                        redrawUI();
                    }
                });
            })();
            const initKeyboardCtrl = (candidate) => {
                if (kdEvent) {
                    logger.warn("Keydown event was not freed!");
                    freeHandler();
                }
                if (candidate.type === "NEW")
                    initForNew(candidate);
                else if (candidate.type === "EDIT")
                    initForEdit(candidate);
                else if (candidate.type === "PHOTO")
                    void initForPhoto();
            };
            const makeKeyMap = (map) => (e) => {
                let inputActive = false;
                const ae = document.activeElement;
                if ((ae === null || ae === void 0 ? void 0 : ae.tagName) == "TEXTAREA")
                    inputActive = true;
                if ((ae === null || ae === void 0 ? void 0 : ae.tagName) == "INPUT" && !["radio", "checkbox"].includes(ae.type.toLowerCase()))
                    inputActive = true;
                if (inputActive && (e.code.startsWith("Numpad") || e.code.startsWith("Key") || e.code.startsWith("Digit")))
                    return;
                if (e.shiftKey && e.code.startsWith("Digit"))
                    keySequence = "+" + e.code.substring(5);
                else if (e.shiftKey && e.code.startsWith("Numpad"))
                    keySequence = "+" + e.code.substring(6);
                let idx = keySequence ? keySequence + "," : "";
                if (!keySequence && e.shiftKey)
                    idx += "+";
                if (e.ctrlKey)
                    idx += "^";
                if (e.altKey)
                    idx += "[";
                if (e.code.startsWith("Key"))
                    idx += e.code.substring(3);
                else if (!keySequence && e.code.startsWith("Digit"))
                    idx += e.code.substring(5);
                else if (!keySequence && e.code.startsWith("Numpad"))
                    idx += e.code.substring(6);
                else if (keySequence)
                    idx = keySequence;
                else if (["Shift", "Control", "Alt"].includes(e.key))
                    return;
                else
                    idx += e.code;
                if (idx in map) {
                    map[idx](e);
                    e.preventDefault();
                    e.stopPropagation();
                }
                redrawUI();
            };
            const initForNew = (candidate) => {
                const drawThumbCard = (card) => {
                    var _a;
                    const idkBtn = card.querySelector(".dont-know-button");
                    if (idkBtn)
                        restyle(idkBtn, "btn-key", "key-bracket-3");
                    const helpBtn = card.querySelector(".question-subtitle-tooltip");
                    if (helpBtn)
                        restyle(helpBtn, "btn-key", "key-bracket-H");
                    const btns = card.querySelectorAll("button.thumbs-button");
                    for (const btn of btns) {
                        restyle(btn, "btn-key", "btn-key-pad");
                        const btnIcon = (_a = btn.querySelector("mat-icon")) === null || _a === void 0 ? void 0 : _a.textContent;
                        if (btnIcon === "thumb_up")
                            restyle(btn, "key-bracket-1");
                        else if (btnIcon === "thumb_down")
                            restyle(btn, "key-bracket-2");
                    }
                    const boxes = card.querySelectorAll("label > *:last-child");
                    for (let i = 0; i < boxes.length; i++) {
                        const btnKey = (i + 4).toString();
                        const label = drawNew("span");
                        label.classList.add("uwtkr2-key-label");
                        label.classList.add(`uwtkr2-data-key-${btnKey}`);
                        label.textContent = `[${btnKey}]`;
                        if (boxes[i].classList.contains("mat-radio-label-content")) {
                            const textNode = boxes[i].querySelector("div");
                            textNode.insertBefore(label, textNode.firstChild);
                        }
                        else {
                            boxes[i].parentNode.insertBefore(label, boxes[i]);
                        }
                    }
                    restyle(card.querySelector(".title-and-subtitle-row"), "thumb-card-tassr");
                    restyle(card.querySelector(".action-buttons-row"), "thumb-card-btnr");
                };
                const findKeyBtnInCard = (key) => {
                    if (context.type !== RenderContextType.NEW)
                        throw new InvalidContextError();
                    return document.querySelector(`#${context.cards[context.currentCard].id} .uwtkr2-eds-key-bracket-${key}`);
                };
                const clickThumbCardBox = (key) => {
                    if (context.type !== RenderContextType.NEW)
                        throw new InvalidContextError();
                    if (!context.type)
                        return;
                    const btn = document.querySelector(`#${context.cards[context.currentCard].id} .uwtkr2-data-key-${key}`);
                    if (btn)
                        btn.closest("label").click();
                };
                const thumbCardKeys = (dialog) => () => ({
                    "1": () => {
                        if (context.type !== RenderContextType.NEW)
                            throw new InvalidContextError();
                        if (isDialogOpen())
                            return;
                        findKeyBtnInCard("1").click();
                        context.nextCard();
                    },
                    "2": () => {
                        if (context.type !== RenderContextType.NEW)
                            throw new InvalidContextError();
                        if (isDialogOpen())
                            return;
                        findKeyBtnInCard("2").click();
                        if (!dialog)
                            context.nextCard();
                        else
                            waitForDialog().then(() => redrawUI()).catch(logger.error);
                    },
                    "3": () => {
                        if (context.type !== RenderContextType.NEW)
                            throw new InvalidContextError();
                        if (isDialogOpen())
                            return;
                        findKeyBtnInCard("3").click();
                        context.nextCard();
                    },
                    "4": () => clickThumbCardBox("4"),
                    "5": () => clickThumbCardBox("5"),
                    "6": () => clickThumbCardBox("6"),
                    "7": () => clickThumbCardBox("7"),
                    "8": () => clickThumbCardBox("8"),
                    "9": () => clickThumbCardBox("9"),
                    "H": () => {
                        if (isDialogOpen())
                            return;
                        const help = findKeyBtnInCard("H");
                        if (help)
                            help.click();
                        waitForDialog().then(() => redrawUI()).catch(logger.error);
                    },
                });
                const dupImgs = document.querySelectorAll("#check-duplicates-card nia-map ~ * div.overflow-x-auto img.cursor-pointer");
                context = {
                    type: RenderContextType.NEW,
                    navigable: true,
                    draw: () => {
                        var _a, _b, _c, _d, _e, _f, _g;
                        if (context.type !== RenderContextType.NEW)
                            throw new InvalidContextError();
                        if (isDialogOpen()) {
                            if (isDialogClosing()) {
                                untilTruthy(() => !isDialogClosing()).then(() => redrawUI()).catch(logger.error);
                                return;
                            }
                            else if (ThumbCards.APPROPRIATE.isDialogOpen()) {
                                const btns = document.querySelectorAll("mat-dialog-container mat-radio-button");
                                for (const btn of btns) {
                                    let btnKey = "";
                                    switch ((_a = btn.querySelector("input[type=radio]")) === null || _a === void 0 ? void 0 : _a.value) {
                                        case "PRIVATE":
                                            btnKey = "P";
                                            break;
                                        case "INAPPROPRIATE":
                                            btnKey = "I";
                                            break;
                                        case "SCHOOL":
                                            btnKey = "K";
                                            break;
                                        case "SENSITIVE":
                                            btnKey = "S";
                                            break;
                                        case "EMERGENCY":
                                            btnKey = "E";
                                            break;
                                        case "GENERIC":
                                            btnKey = "G";
                                            break;
                                        default: continue;
                                    }
                                    const label = drawNew("span");
                                    label.classList.add("uwtkr2-key-label");
                                    label.textContent = `[\u{1f879}${btnKey}] `;
                                    const textNode = btn.querySelector(".mat-radio-label-content > div");
                                    textNode.insertBefore(label, textNode.firstChild);
                                }
                            }
                            else if (isDialogOpen("app-report-modal")) {
                                const aahqrl10n = toolbox.i18nPrefixResolver("review.report.modal.");
                                const btns = document.querySelectorAll("mat-dialog-container wf-checkbox");
                                let btnKey = "";
                                for (const btn of btns) {
                                    const lbl = (_c = (_b = btn.querySelector(".mat-checkbox-label")) === null || _b === void 0 ? void 0 : _b.textContent) === null || _c === void 0 ? void 0 : _c.trim();
                                    switch (lbl) {
                                        case aahqrl10n("fake"):
                                            btnKey = "+5,F";
                                            break;
                                        case aahqrl10n("explicit"):
                                            btnKey = "+5,X";
                                            break;
                                        case aahqrl10n("influencing"):
                                            btnKey = "+5,I";
                                            break;
                                        case aahqrl10n("offensive"):
                                            btnKey = "+5,O";
                                            break;
                                        case aahqrl10n("abuse"):
                                            btnKey = "+5,A";
                                            break;
                                        default: continue;
                                    }
                                    const label = keyLabel(btnKey);
                                    const eLbl = btn.querySelector(".mat-checkbox-label");
                                    eLbl.parentNode.insertBefore(label, eLbl);
                                }
                            }
                            else if (ThumbCards.ACCURATE.isDialogOpen()) {
                                const aahqrl10n = toolbox.i18nPrefixResolver("review.new.question.accurateandhighquality.reject.");
                                const btns = document.querySelectorAll("mat-dialog-container wf-checkbox");
                                for (const btn of btns) {
                                    const lbl = (_d = btn.querySelector(".mat-checkbox-label").textContent) === null || _d === void 0 ? void 0 : _d.trim();
                                    const panel = btn.closest("mat-expansion-panel");
                                    const pnl = panel ? (_e = panel.querySelector("mat-panel-title > div > div").textContent) === null || _e === void 0 ? void 0 : _e.trim() : null;
                                    let btnKey = "";
                                    switch (pnl) {
                                        case null:
                                            switch (lbl) {
                                                case aahqrl10n("inaccuratelocation"):
                                                    btnKey = "L";
                                                    break;
                                                default: continue;
                                            }
                                            break;
                                        case aahqrl10n("photos"):
                                            switch (lbl) {
                                                case aahqrl10n("photos.blurry"):
                                                    btnKey = "1,B";
                                                    break;
                                                case aahqrl10n("photos.face"):
                                                    btnKey = "1,F";
                                                    break;
                                                case aahqrl10n("photos.license"):
                                                    btnKey = "1,L";
                                                    break;
                                                case aahqrl10n("photos.orientation"):
                                                    btnKey = "1,O";
                                                    break;
                                                case aahqrl10n("photos.identifiable"):
                                                    btnKey = "1,I";
                                                    break;
                                                case aahqrl10n("photos.thirdparty"):
                                                    btnKey = "1,T";
                                                    break;
                                                case aahqrl10n("photos.watermark"):
                                                    btnKey = "1,W";
                                                    break;
                                                case aahqrl10n("photos.lowquality"):
                                                    btnKey = "1,Q";
                                                    break;
                                                default: continue;
                                            }
                                            break;
                                        case aahqrl10n("title"):
                                            switch (lbl) {
                                                case aahqrl10n("title.emoji"):
                                                    btnKey = "2,E";
                                                    break;
                                                case aahqrl10n("title.url"):
                                                    btnKey = "2,U";
                                                    break;
                                                case aahqrl10n("title.quality"):
                                                    btnKey = "2,Q";
                                                    break;
                                                default: continue;
                                            }
                                            break;
                                        case aahqrl10n("description"):
                                            switch (lbl) {
                                                case aahqrl10n("description.emoji"):
                                                    btnKey = "3,E";
                                                    break;
                                                case aahqrl10n("description.url"):
                                                    btnKey = "3,U";
                                                    break;
                                                case aahqrl10n("description.quality"):
                                                    btnKey = "3,Q";
                                                    break;
                                                default: continue;
                                            }
                                            break;
                                        case aahqrl10n("abuse"):
                                            switch (lbl) {
                                                case aahqrl10n("abuse.fakenomination"):
                                                    btnKey = "4,F";
                                                    break;
                                                case aahqrl10n("abuse.explicit"):
                                                    btnKey = "4,X";
                                                    break;
                                                case aahqrl10n("abuse.influencing"):
                                                    btnKey = "4,I";
                                                    break;
                                                case aahqrl10n("abuse.offensive"):
                                                    btnKey = "4,O";
                                                    break;
                                                case aahqrl10n("abuse.other"):
                                                    btnKey = "4,A";
                                                    break;
                                                default: continue;
                                            }
                                            break;
                                    }
                                    const label = keyLabel(btnKey);
                                    const eLbl = btn.querySelector(".mat-checkbox-label");
                                    eLbl.parentNode.insertBefore(label, eLbl);
                                }
                                const panels = document.querySelectorAll("mat-dialog-container mat-accordion mat-expansion-panel");
                                for (let i = 0; i < panels.length; i++) {
                                    const lbl = panels[i].querySelector("mat-panel-title");
                                    let btnKey = "";
                                    switch ((_g = (_f = lbl.querySelector("div > div")) === null || _f === void 0 ? void 0 : _f.textContent) === null || _g === void 0 ? void 0 : _g.trim()) {
                                        case aahqrl10n("photos"):
                                            btnKey = "1";
                                            break;
                                        case aahqrl10n("title"):
                                            btnKey = "2";
                                            break;
                                        case aahqrl10n("description"):
                                            btnKey = "3";
                                            break;
                                        case aahqrl10n("abuse"):
                                            btnKey = "4";
                                            break;
                                        default: continue;
                                    }
                                    const label = keyLabel(btnKey);
                                    lbl.parentNode.insertBefore(label, lbl);
                                }
                            }
                            else if (isDialogOpen("app-confirm-duplicate-modal")) {
                                const cancelBtn = document.querySelector("mat-dialog-container .mat-dialog-actions button.wf-button");
                                if (cancelBtn)
                                    restyle(cancelBtn, "btn-key", "btn-key-pad", "key-bracket-Esc");
                            }
                            const l10n = toolbox.l10n;
                            const actions = document.querySelectorAll("mat-dialog-container .mat-dialog-actions button.wf-button");
                            for (let i = 0; i < actions.length; i++) {
                                if (actions[i].textContent == l10n["modal.close"]) {
                                    restyle(actions[i], "btn-key", "btn-key-pad", "key-bracket-Esc");
                                    break;
                                }
                            }
                            const submitBtn = document.querySelector("mat-dialog-container .mat-dialog-actions button.wf-button--primary");
                            if (submitBtn)
                                restyle(submitBtn, "btn-key", "btn-key-pad", "key-bracket-Enter");
                        }
                        else {
                            const cc = context.cards[context.currentCard];
                            const card = document.getElementById(cc.id);
                            if (card) {
                                restyle(card, "highlighted");
                                cc.draw(card);
                                if (config.get("autoScrollCards")) {
                                    card.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                    });
                                }
                            }
                            else {
                                untilTruthy(() => document.getElementById(cc.id)).then(() => redrawUI()).catch(logger.error);
                            }
                        }
                    },
                    cards: [
                        {
                            id: "check-duplicates-card",
                            draw: (card) => {
                                if (dupImgs.length > 0) {
                                    const dupImgBox = card.querySelector("#check-duplicates-card nia-map ~ * div.overflow-x-auto");
                                    const dupeHelp = drawNew("p");
                                    const dhK1 = document.createElement("span");
                                    dhK1.classList.add("uwtkr2-key-span");
                                    dhK1.textContent = "[Alt]+[";
                                    const dhK2 = document.createElement("span");
                                    dhK2.classList.add("uwtkr2-key-span");
                                    dhK2.classList.add("uwtkr2-key-span-wildcard");
                                    dhK2.textContent = "letter";
                                    const dhK3 = document.createElement("span");
                                    dhK3.classList.add("uwtkr2-key-span");
                                    dhK3.textContent = "]";
                                    const dhK4 = document.createElement("span");
                                    dhK4.classList.add("uwtkr2-key-span");
                                    dhK4.textContent = "[Alt]+[Shift]+[";
                                    const dhK5 = document.createElement("span");
                                    dhK5.classList.add("uwtkr2-key-span");
                                    dhK5.classList.add("uwtkr2-key-span-wildcard");
                                    dhK5.textContent = "letter";
                                    const dhK6 = document.createElement("span");
                                    dhK6.classList.add("uwtkr2-key-span");
                                    dhK6.textContent = "]";
                                    dupeHelp.appendChild(document.createTextNode("Press "));
                                    dupeHelp.appendChild(dhK1);
                                    dupeHelp.appendChild(dhK2);
                                    dupeHelp.appendChild(dhK3);
                                    dupeHelp.appendChild(document.createTextNode(" to pick a duplicate, or "));
                                    dupeHelp.appendChild(dhK4);
                                    dupeHelp.appendChild(dhK5);
                                    dupeHelp.appendChild(dhK6);
                                    dupeHelp.appendChild(document.createTextNode(" to open its photo in full screen"));
                                    dupImgBox.parentNode.insertBefore(dupeHelp, dupImgBox);
                                    for (let i = 0; i < dupImgs.length && i < 26; i++) {
                                        const dpbox = drawNew("div");
                                        dpbox.classList.add("uwtkr2-dupe-key-box");
                                        dupImgs[i].parentNode.insertBefore(dpbox, dupImgs[i]);
                                        const inner = document.createElement("div");
                                        inner.textContent = String.fromCharCode(65 + i);
                                        dpbox.appendChild(inner);
                                    }
                                    const dupeBtn = card.querySelectorAll(".agm-info-window-content button.wf-button--primary");
                                    for (let i = 0; i < dupeBtn.length; i++) {
                                        if (dupeBtn[i] && dupeBtn[i].closest("body")) {
                                            restyle(dupeBtn[i], "btn-key", "key-bracket-Enter");
                                            break;
                                        }
                                    }
                                }
                            },
                            extraKeys: () => {
                                const dupKeys = {
                                    "Enter": () => {
                                        if (!isDialogOpen()) {
                                            const dupeBtns = document.querySelectorAll("#check-duplicates-card .agm-info-window-content button.wf-button--primary");
                                            for (const dupeBtn of dupeBtns) {
                                                if (dupeBtn && dupeBtn.closest("body")) {
                                                    dupeBtn.click();
                                                    untilTruthy(() => document.querySelector("mat-dialog-container > *")).then(() => redrawUI()).catch(logger.error);
                                                    break;
                                                }
                                            }
                                        }
                                        else {
                                            handleEnterNew();
                                        }
                                    },
                                    "Escape": () => {
                                        if (isDialogOpen("app-confirm-duplicate-modal")) {
                                            const cancelBtn = document.querySelector("mat-dialog-container .mat-dialog-actions button.wf-button");
                                            cancelBtn.click();
                                            untilTruthy(() => !isDialogOpen()).then(() => redrawUI()).catch(logger.error);
                                        }
                                    },
                                };
                                for (let i = 0; i < dupImgs.length && i < 26; i++) {
                                    const key = String.fromCharCode(65 + i);
                                    const img = dupImgs[i];
                                    dupKeys[`[${key}`] = () => {
                                        img.click();
                                        untilTruthy(() => document.activeElement.tagName === "IMG").then(() => {
                                            document.activeElement.blur();
                                            redrawUI();
                                        }).catch(logger.error);
                                    };
                                    dupKeys[`+[${key}`] = () => window.open(`${img.src}=s0`);
                                }
                                return dupKeys;
                            },
                        }, {
                            id: "appropriate-card",
                            draw: drawThumbCard,
                            extraKeys: thumbCardKeys(true),
                        }, {
                            id: "safe-card",
                            draw: drawThumbCard,
                            extraKeys: thumbCardKeys(true),
                        }, {
                            id: "accurate-and-high-quality-card",
                            draw: drawThumbCard,
                            extraKeys: thumbCardKeys(true),
                        }, {
                            id: "permanent-location-card",
                            draw: drawThumbCard,
                            extraKeys: thumbCardKeys(true),
                        }, {
                            id: "socialize-card",
                            draw: drawThumbCard,
                            extraKeys: thumbCardKeys(false),
                        }, {
                            id: "exercise-card",
                            draw: drawThumbCard,
                            extraKeys: thumbCardKeys(false),
                        }, {
                            id: "explore-card",
                            draw: drawThumbCard,
                            extraKeys: thumbCardKeys(false),
                        }, {
                            id: "categorization-card",
                            draw: card => {
                                const labels = card.querySelectorAll("mat-button-toggle-group > div");
                                for (let i = 0; i < labels.length; i++) {
                                    restyle(labels[i], "btn-key", `key-bracket-${i + 1}`, "btn-key-no-highlight", "btn-key-pad");
                                }
                                const catBox = card.querySelector("mat-button-toggle-group");
                                if (catBox) {
                                    const catHelp = drawNew("p");
                                    const noAllKey = document.createElement("span");
                                    noAllKey.classList.add("uwtkr2-key-span");
                                    noAllKey.textContent = "[Tab]";
                                    catHelp.appendChild(document.createTextNode("Press "));
                                    catHelp.appendChild(noAllKey);
                                    catHelp.appendChild(document.createTextNode(" set all options to \"No\""));
                                    catBox.parentNode.insertBefore(catHelp, catBox);
                                }
                            },
                            extraKeys: () => {
                                const setAllNo = (evenIfYes) => {
                                    const rows = document.querySelectorAll("#categorization-card mat-button-toggle-group");
                                    for (let i = 0; i < rows.length; i++) {
                                        if (evenIfYes || !rows[i].querySelector("mat-button-toggle.mat-button-toggle-checked")) {
                                            rows[i].querySelector("mat-button-toggle:last-of-type button").click();
                                        }
                                    }
                                };
                                const toggleYN = (key) => {
                                    setAllNo(false);
                                    const label = document.querySelector(`#categorization-card .uwtkr2-eds-key-bracket-${key}`);
                                    const opts = label.closest("mat-button-toggle-group").querySelectorAll("mat-button-toggle");
                                    for (let i = 0; i < opts.length; i++) {
                                        if (!opts[i].classList.contains("mat-button-toggle-checked")) {
                                            opts[i].querySelector("button").click();
                                            break;
                                        }
                                    }
                                };
                                const keys = {
                                    "Tab": () => setAllNo(true),
                                };
                                let i = 1;
                                while (i <= candidate.categoryIds.length) {
                                    const key = (i++).toString();
                                    keys[key] = () => toggleYN(key);
                                }
                                return keys;
                            },
                        },
                    ],
                    currentCard: 1,
                    nextCard: () => {
                        if (context.type !== RenderContextType.NEW)
                            throw new InvalidContextError();
                        if (context.currentCard < context.cards.length - 1) {
                            context.currentCard++;
                            context.extraKeys = context.cards[context.currentCard].extraKeys;
                            updateKeybindsNew(candidate);
                        }
                    },
                    prevCard: () => {
                        if (context.type !== RenderContextType.NEW)
                            throw new InvalidContextError();
                        if (context.currentCard > 0) {
                            context.currentCard--;
                            context.extraKeys = context.cards[context.currentCard].extraKeys;
                            updateKeybindsNew(candidate);
                        }
                    },
                };
                if (context.type !== RenderContextType.NEW)
                    throw new InvalidContextError();
                context.extraKeys = context.cards[context.currentCard].extraKeys;
                updateKeybindsNew(candidate);
            };
            const initForEdit = (candidate) => {
                const drawTextEdit = (card) => {
                    if (!card.classList.contains("uwtkr2-card"))
                        card.classList.add("uwtkr2-card");
                    const btns = card.querySelectorAll("mat-radio-button");
                    for (let i = 0; i < btns.length && i < 9; i++) {
                        const btnKey = (i + 1).toString();
                        const label = drawNew("span");
                        label.classList.add("uwtkr2-key-label");
                        label.textContent = `[${btnKey}] `;
                        const textNode = btns[i].querySelector(".mat-radio-label-content");
                        textNode.insertBefore(label, textNode.firstChild);
                    }
                };
                const handleTextEditKeys = (selector) => () => {
                    const keys = {};
                    const btns = document.querySelectorAll(`${selector} mat-radio-button label`);
                    for (let i = 0; i < btns.length && i < 9; i++) {
                        const btn = btns[i];
                        keys[(i + 1).toString()] = () => {
                            if (context.type !== RenderContextType.EDIT)
                                throw new InvalidContextError();
                            btn.click();
                            context.nextCard();
                        };
                    }
                    return keys;
                };
                context = {
                    type: RenderContextType.EDIT,
                    navigable: true,
                    draw: () => {
                        if (context.type !== RenderContextType.EDIT)
                            throw new InvalidContextError();
                        while (context.markers.length) {
                            context.markers.pop().setMap(null);
                        }
                        const cc = context.cards[context.currentCard];
                        const card = document.querySelector(cc.selector);
                        restyle(card, "highlighted");
                        cc.draw(card);
                    },
                    cards: [
                        {
                            selector: "app-select-title-edit wf-review-card",
                            draw: drawTextEdit,
                            extraKeys: handleTextEditKeys("app-select-title-edit wf-review-card"),
                        }, {
                            selector: "app-select-description-edit wf-review-card",
                            draw: drawTextEdit,
                            extraKeys: handleTextEditKeys("app-select-description-edit wf-review-card"),
                        }, {
                            selector: "app-select-location-edit wf-review-card",
                            draw: (card) => {
                                const gmap = card.querySelector("nia-map");
                                const map = gmap.__ngContext__[gmap.__ngContext__.length - 1].componentRef.map;
                                if (!map) {
                                    setTimeout(redrawUI, 50);
                                }
                                else {
                                    candidate.locationEdits.forEach((marker, i) => {
                                        if (context.type !== RenderContextType.EDIT)
                                            throw new InvalidContextError();
                                        if (i >= 26)
                                            return;
                                        const labelMarker = new google.maps.Marker({
                                            position: {
                                                lat: parseFloat(marker.lat),
                                                lng: parseFloat(marker.lng),
                                            },
                                            label: {
                                                text: String.fromCharCode(65 + i),
                                                fontWeight: "bold",
                                            },
                                            clickable: false,
                                            zIndex: 1000,
                                            map: map,
                                        });
                                        context.markers.push(labelMarker);
                                    });
                                }
                            },
                            extraKeys: () => {
                                const keys = {};
                                for (let i = 0; i < candidate.locationEdits.length && i < 26; i++) {
                                    const idx = i;
                                    keys[String.fromCharCode(65 + idx)] = () => {
                                        const gmap = document.querySelector("app-select-location-edit wf-review-card nia-map");
                                        const { markers } = gmap.__ngContext__[gmap.__ngContext__.length - 1].componentRef;
                                        // TODO: Type checking
                                        const defaultMarker = markers.default.markers.filter((m /*TODO*/) => m.id == candidate.locationEdits[idx].hash)[0];
                                        markers.default.markerOnClick(defaultMarker);
                                    };
                                }
                                return keys;
                            },
                        },
                    ].filter(ch => !!document.querySelector(ch.selector)),
                    markers: [],
                    currentCard: 0,
                    nextCard: () => {
                        if (context.type !== RenderContextType.EDIT)
                            throw new InvalidContextError();
                        if (context.currentCard < context.cards.length - 1) {
                            context.currentCard++;
                            context.extraKeys = context.cards[context.currentCard].extraKeys;
                            updateKeybindsEdit();
                        }
                    },
                    prevCard: () => {
                        if (context.type !== RenderContextType.EDIT)
                            throw new InvalidContextError();
                        if (context.currentCard > 0) {
                            context.currentCard--;
                            context.extraKeys = context.cards[context.currentCard].extraKeys;
                            updateKeybindsEdit();
                        }
                    },
                };
                if (context.cards.length > 0) {
                    context.extraKeys = context.cards[context.currentCard].extraKeys;
                    updateKeybindsEdit();
                }
                else {
                    setTimeout(() => initForEdit(candidate), 250);
                }
            };
            const initForPhoto = async (_candidate) => {
                const acceptAll = await untilTruthy(() => document.querySelector("app-review-photo app-accept-all-photos-card .photo-card"));
                context = {
                    type: RenderContextType.PHOTO,
                    navigable: false,
                    draw: () => {
                        if (context.type !== RenderContextType.PHOTO)
                            throw new InvalidContextError();
                        const infoCard = document.querySelector("app-review-photo .review-photo__info div");
                        logger.info(infoCard);
                        if (infoCard === null) {
                            setTimeout(() => redrawUI(), 250);
                            return;
                        }
                        const photoHelp = drawNew("p");
                        photoHelp.style.marginTop = "10px";
                        const phK1 = document.createElement("span");
                        phK1.classList.add("uwtkr2-key-span");
                        phK1.textContent = "[";
                        const phK2 = document.createElement("span");
                        phK2.classList.add("uwtkr2-key-span");
                        phK2.classList.add("uwtkr2-key-span-wildcard");
                        phK2.textContent = "letter";
                        const phK3 = document.createElement("span");
                        phK3.classList.add("uwtkr2-key-span");
                        phK3.textContent = "]";
                        const phK4 = document.createElement("span");
                        phK4.classList.add("uwtkr2-key-span");
                        phK4.textContent = "[Shift]+[";
                        const phK5 = document.createElement("span");
                        phK5.classList.add("uwtkr2-key-span");
                        phK5.classList.add("uwtkr2-key-span-wildcard");
                        phK5.textContent = "letter";
                        const phK6 = document.createElement("span");
                        phK6.classList.add("uwtkr2-key-span");
                        phK6.textContent = "]";
                        photoHelp.appendChild(document.createTextNode("Press "));
                        photoHelp.appendChild(phK1);
                        photoHelp.appendChild(phK2);
                        photoHelp.appendChild(phK3);
                        photoHelp.appendChild(document.createTextNode(" reject a photo, or "));
                        photoHelp.appendChild(phK4);
                        photoHelp.appendChild(phK5);
                        photoHelp.appendChild(phK6);
                        photoHelp.appendChild(document.createTextNode(" to open it in full screen"));
                        infoCard.appendChild(photoHelp);
                        for (let i = 0; i < context.cards.length; i++) {
                            const actions = context.cards[i].querySelector(".photo-card__actions");
                            const label = drawNew("span");
                            label.classList.add("uwtkr2-key-label");
                            label.classList.add("uwtkr2-photo-card-label");
                            label.textContent = String.fromCharCode(65 + i);
                            actions.insertBefore(label, actions.firstChild);
                        }
                        const label = drawNew("span");
                        label.classList.add("uwtkr2-key-label");
                        label.textContent = "[Tab]";
                        const acceptAllText = acceptAll.querySelector("span");
                        acceptAllText.insertBefore(label, acceptAllText.firstChild);
                    },
                    cards: document.querySelectorAll("app-review-photo app-photo-card .photo-card"),
                };
                if (context.type !== RenderContextType.PHOTO)
                    throw new InvalidContextError();
                const keys = {
                    "Tab": () => acceptAll.click(),
                    "Enter": () => handleEnterNew(),
                    "+Space": () => skip(),
                };
                for (let i = 0; i < context.cards.length; i++) {
                    const card = context.cards[i];
                    keys[String.fromCharCode(65 + i)] = () => card.click();
                    keys["+" + String.fromCharCode(65 + i)] = () => window.open(card.querySelector(".photo-card__photo img").src + "=s0");
                }
                setHandler(makeKeyMap(keys));
            };
            const handleEnterNew = () => {
                let btn = null;
                logger.info("handleEnterNew");
                if (isDialogOpen() && !isDialogClosing()) {
                    btn = document.getElementById("uwftmr-ssmb-r");
                    if (!btn)
                        btn = document.getElementById("uwftmr-ssmb-d");
                    if (!btn)
                        btn = document.querySelector("mat-dialog-container .mat-dialog-actions button.wf-button--primary");
                }
                else {
                    btn = document.getElementById("uwftmr-ssb-0");
                    if (!btn)
                        btn = document.querySelector("app-submit-review-split-button button.wf-button--primary");
                }
                if (btn)
                    btn.click();
            };
            const skip = () => {
                const aahqrl10n = toolbox.i18nPrefixResolver("submission.");
                const xpath = `//button[contains(text(),'${aahqrl10n("skiptonext")}')]`;
                const matchingElement = document
                    .evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                    .singleNodeValue;
                if (matchingElement)
                    matchingElement.click();
            };
            const thumbDownOpen = (card) => new Promise((resolve, reject) => {
                if (isDialogOpen()) {
                    if (!card.opens) {
                        reject();
                        return;
                    }
                    else if (isDialogOpen(card.opens)) {
                        resolve();
                        return;
                    }
                    else {
                        closeDialog();
                    }
                }
                const btns = document.getElementById(card.id).querySelectorAll("button.thumbs-button");
                for (const btn of btns) {
                    if (btn.querySelector("mat-icon").textContent === "thumb_down") {
                        btn.click();
                        untilTruthy(() => document.querySelector("mat-dialog-container > *")).then(() => {
                            redrawUI();
                            resolve();
                        }).catch(logger.error);
                        return;
                    }
                }
                reject();
            });
            const closeDialog = () => {
                const l10n = toolbox.l10n;
                const actions = document.querySelectorAll("mat-dialog-container .mat-dialog-actions button.wf-button");
                for (let i = 0; i < actions.length; i++) {
                    if (actions[i].textContent === l10n["modal.close"]) {
                        actions[i].click();
                        return;
                    }
                }
            };
            const report = () => new Promise((resolve, reject) => {
                if (isDialogOpen()) {
                    resolve();
                    return;
                }
                const aahqrl10n = toolbox.i18nPrefixResolver("submission.");
                const xpath = `//button[contains(text(),'${aahqrl10n("report")}')]`;
                const matchingElement = document
                    .evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                    .singleNodeValue;
                if (matchingElement) {
                    matchingElement.click();
                    resolve();
                    return;
                }
                reject();
            });
            const getMap = () => {
                var _a, _b, _c;
                const gmap = document.querySelector("nia-map");
                return (_c = (_b = (_a = gmap === null || gmap === void 0 ? void 0 : gmap.__ngContext__) === null || _a === void 0 ? void 0 : _a[gmap.__ngContext__.length - 1]) === null || _b === void 0 ? void 0 : _b.componentRef) === null || _c === void 0 ? void 0 : _c.map;
            };
            const zoomMap = (change) => {
                const map = getMap();
                map === null || map === void 0 ? void 0 : map.setZoom(map.getZoom() + change);
            };
            const panHandlers = {};
            const panMapTowards = (key, x, y) => {
                if (key in panHandlers)
                    return;
                const panFactor = 50;
                const panInterval = 130;
                const map = getMap();
                if (map) {
                    const doPan = () => map.panBy(x * panFactor, y * panFactor);
                    const interval = setInterval(doPan, panInterval);
                    doPan();
                    panHandlers[key] = (e) => {
                        if (e.code === `Key${key}`) {
                            clearInterval(interval);
                            document.removeEventListener("keyup", panHandlers[key]);
                            delete panHandlers[key];
                        }
                    };
                    document.addEventListener("keyup", panHandlers[key]);
                }
            };
            const updateKeybindsNew = (candidate) => {
                const aahqrl10n = toolbox.i18nPrefixResolver("review.new.question.accurateandhighquality.reject.");
                const aahqrl10nReport = toolbox.i18nPrefixResolver("review.report.modal.");
                setHandler(makeKeyMap({
                    "+P": () => thumbDownOpen(ThumbCards.APPROPRIATE).then(() => selectDialogRadio("PRIVATE")),
                    "+I": () => thumbDownOpen(ThumbCards.APPROPRIATE).then(() => selectDialogRadio("INAPPROPRIATE")),
                    "+K": () => thumbDownOpen(ThumbCards.APPROPRIATE).then(() => selectDialogRadio("SCHOOL")),
                    "+S": () => thumbDownOpen(ThumbCards.APPROPRIATE).then(() => selectDialogRadio("SENSITIVE")),
                    "+E": () => thumbDownOpen(ThumbCards.APPROPRIATE).then(() => selectDialogRadio("EMERGENCY")),
                    "+G": () => thumbDownOpen(ThumbCards.APPROPRIATE).then(() => selectDialogRadio("GENERIC")),
                    "+U": () => thumbDownOpen(ThumbCards.SAFE),
                    "+1": () => thumbDownOpen(ThumbCards.ACCURATE).then(() => expandDialogAccordionPanel(aahqrl10n("photos"))),
                    "+1,B": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("photos")), aahqrl10n("photos.blurry")),
                    "+1,F": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("photos")), aahqrl10n("photos.face")),
                    "+1,L": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("photos")), aahqrl10n("photos.license")),
                    "+1,O": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("photos")), aahqrl10n("photos.orientation")),
                    "+1,I": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("photos")), aahqrl10n("photos.identifiable")),
                    "+1,T": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("photos")), aahqrl10n("photos.thirdparty")),
                    "+1,W": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("photos")), aahqrl10n("photos.watermark")),
                    "+1,Q": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("photos")), aahqrl10n("photos.lowquality")),
                    "+2": () => thumbDownOpen(ThumbCards.ACCURATE).then(() => expandDialogAccordionPanel(aahqrl10n("title"))),
                    "+2,E": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("title")), aahqrl10n("title.emoji")),
                    "+2,U": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("title")), aahqrl10n("title.url")),
                    "+2,Q": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("title")), aahqrl10n("title.quality")),
                    "+3": () => thumbDownOpen(ThumbCards.ACCURATE).then(() => expandDialogAccordionPanel(aahqrl10n("description"))),
                    "+3,E": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("description")), aahqrl10n("description.emoji")),
                    "+3,U": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("description")), aahqrl10n("description.url")),
                    "+3,Q": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("description")), aahqrl10n("description.quality")),
                    "+4": () => thumbDownOpen(ThumbCards.ACCURATE).then(() => expandDialogAccordionPanel(aahqrl10n("abuse"))),
                    "+4,F": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("abuse")), aahqrl10n("abuse.fakenomination")),
                    "+4,X": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("abuse")), aahqrl10n("abuse.explicit")),
                    "+4,I": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("abuse")), aahqrl10n("abuse.influencing")),
                    "+4,O": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("abuse")), aahqrl10n("abuse.offensive")),
                    "+4,A": () => checkDialogBox(getDialogAccordionPanel(aahqrl10n("abuse")), aahqrl10n("abuse.other")),
                    "+R": () => report(),
                    "+5,F": () => getDialogReportCheckbox(aahqrl10nReport("fake")),
                    "+5,X": () => getDialogReportCheckbox(aahqrl10nReport("explicit")),
                    "+5,I": () => getDialogReportCheckbox(aahqrl10nReport("influencing")),
                    "+5,O": () => getDialogReportCheckbox(aahqrl10nReport("offensive")),
                    "+5,A": () => getDialogReportCheckbox(aahqrl10nReport("abuse")),
                    "+L": () => thumbDownOpen(ThumbCards.ACCURATE).then(() => checkDialogBox(null, aahqrl10n("inaccuratelocation"))),
                    "+O": () => thumbDownOpen(ThumbCards.ACCURATE).then(() => checkDialogBox(null, null)),
                    "+T": () => thumbDownOpen(ThumbCards.PERMANENT),
                    "Q": () => window.open(candidate.imageUrl + "=s0"),
                    "E": () => window.open(candidate.supportingImageUrls[0] + "=s0"),
                    "R": () => zoomMap(1),
                    "F": () => zoomMap(-1),
                    "W": () => panMapTowards("W", 0, -1),
                    "A": () => panMapTowards("A", -1, 0),
                    "S": () => panMapTowards("S", 0, 1),
                    "D": () => panMapTowards("D", 1, 0),
                    "+Space": () => !isDialogOpen() && skip(),
                    "Tab": () => !isDialogOpen() && context.navigable && context.nextCard(),
                    "+Tab": () => !isDialogOpen() && context.navigable && context.prevCard(),
                    "ArrowDown": () => !isDialogOpen() && context.navigable && context.nextCard(),
                    "ArrowUp": () => !isDialogOpen() && context.navigable && context.prevCard(),
                    "ArrowRight": () => !isDialogOpen() && context.navigable && context.nextCard(),
                    "ArrowLeft": () => !isDialogOpen() && context.navigable && context.prevCard(),
                    "Enter": () => handleEnterNew(),
                    ...context.extraKeys(),
                }));
            };
            const updateKeybindsEdit = (_candidate) => {
                setHandler(makeKeyMap({
                    "Tab": () => context.navigable && context.nextCard(),
                    "+Tab": () => context.navigable && context.prevCard(),
                    "ArrowDown": () => context.navigable && context.nextCard(),
                    "ArrowUp": () => context.navigable && context.prevCard(),
                    "ArrowRight": () => context.navigable && context.nextCard(),
                    "ArrowLeft": () => context.navigable && context.prevCard(),
                    "Enter": () => handleEnterNew(),
                    "+Space": () => skip(),
                    ...context.extraKeys(),
                }));
            };
            const keyLabel = (btnKey) => {
                const label = drawNew("span");
                label.classList.add("uwtkr2-key-label");
                logger.info(keySequence, btnKey);
                if (btnKey.includes(",")) {
                    if (keySequence && `+${btnKey}`.startsWith(keySequence)) {
                        label.textContent = "\u2026" + btnKey.substring(keySequence.length)
                            .split(",").map(key => `[${key}]`).join("") + " ";
                    }
                    else {
                        label.textContent = `\u{1f879}${btnKey}`
                            .split(",").map(key => `[${key}]`).join("") + " ";
                    }
                }
                else {
                    label.textContent = `[\u{1f879}${btnKey}]`;
                }
                return label;
            };
            const redrawUI = () => {
                const ephemeral = document.getElementsByClassName("uwtkr2-ephemeral");
                for (let i = ephemeral.length - 1; i >= 0; i--) {
                    ephemeral[i].parentNode.removeChild(ephemeral[i]);
                }
                const touched = document.getElementsByClassName("uwtkr2-touched");
                for (let i = touched.length - 1; i >= 0; i--) {
                    for (let j = touched[i].classList.length - 1; j >= 0; j--) {
                        if (touched[i].classList[j].startsWith("uwtkr2-eds-")) {
                            touched[i].classList.remove(touched[i].classList[j]);
                        }
                    }
                    touched[i].classList.remove("uwtkr2-touched");
                }
                if (context.draw)
                    context.draw();
            };
            const restyle = (e, ...clss) => {
                if (!e.classList.contains("uwtkr2-touched")) {
                    e.classList.add("uwtkr2-touched");
                }
                for (const cls of clss) {
                    if (!e.classList.contains(`uwtkr2-eds-${cls}`)) {
                        e.classList.add(`uwtkr2-eds-${cls}`);
                    }
                }
            };
            const drawNew = (tag) => {
                const e = document.createElement(tag);
                e.classList.add("uwtkr2-ephemeral");
                return e;
            };
            const freeHandler = () => {
                if (kdEvent)
                    document.removeEventListener("keydown", kdEvent);
                kdEvent = null;
                keySequence = null;
            };
            const setHandler = (handler) => {
                if (kdEvent)
                    freeHandler();
                document.addEventListener("keydown", kdEvent = handler);
                redrawUI();
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/review", initKeyboardCtrl);
        },
    });
};
const isDialogOpen = (diag) => {
    return !!document.querySelector("mat-dialog-container" + (diag ? ` > ${diag}` : ""));
};
const isDialogClosing = (diag) => {
    return !!document.querySelector("mat-dialog-container.ng-animating" + (""));
};
const waitForDialog = () => untilTruthy(() => document.querySelector("mat-dialog-container > *"));
const checkDialogBox = (parent, text) => new Promise((resolve, reject) => {
    var _a;
    const btns = parent ? parent.querySelectorAll("wf-checkbox") : document.querySelectorAll("mat-dialog-container wf-checkbox");
    for (let i = 0; i < btns.length; i++) {
        const label = btns[i].querySelector(".mat-checkbox-label");
        const input = btns[i].querySelector(".mat-checkbox-label app-text-input-review-b input");
        if (text && ((_a = label.textContent) === null || _a === void 0 ? void 0 : _a.trim()) == text) {
            label.click();
            resolve();
            return;
        }
        else if (!text && input) {
            label.click();
            setTimeout(() => input.focus(), 0);
            const stopInstantBlur = () => {
                setTimeout(() => input.focus(), 0);
                input.removeEventListener("blur", stopInstantBlur);
            };
            input.addEventListener("blur", stopInstantBlur);
            return;
        }
    }
    reject();
});
const selectDialogRadio = (value) => new Promise((resolve, reject) => {
    const btns = document.querySelectorAll("mat-dialog-container mat-radio-button");
    for (const btn of btns) {
        if (btn.querySelector("input[type=radio]").value == value) {
            btn.querySelector(".mat-radio-container").click();
            resolve();
            return;
        }
    }
    reject();
});
const getDialogAccordionPanel = (text) => {
    var _a;
    const panels = document.querySelectorAll("mat-dialog-container mat-accordion mat-expansion-panel");
    for (let i = 0; i < panels.length; i++) {
        const label = panels[i].querySelector("mat-panel-title > div > div");
        if (((_a = label === null || label === void 0 ? void 0 : label.textContent) === null || _a === void 0 ? void 0 : _a.trim()) == text) {
            return panels[i];
        }
    }
    return null;
};
const expandDialogAccordionPanel = (text) => new Promise((resolve, reject) => {
    const panel = getDialogAccordionPanel(text);
    if (panel) {
        if (!panel.classList.contains("mat-expanded")) {
            panel.querySelector("mat-panel-title").click();
        }
        resolve();
        return;
    }
    reject();
});
const getDialogReportCheckbox = (text) => {
    var _a;
    const reportModal = document.querySelector("[class*='report-modal-content']");
    for (let i = 0; i < reportModal.childNodes.length; i++) {
        const checkbox = reportModal.childNodes[i].childNodes[0];
        if ((_a = checkbox.textContent) === null || _a === void 0 ? void 0 : _a.trim().includes(text)) {
            checkbox.querySelector("span").click();
            return;
        }
    }
};// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var openIn = () => {
    register()({
        id: "open-in",
        name: "Open In",
        authors: ["tehstone", "bilde2910"],
        description: "Add open-in buttons to Wayfarer",
        defaultConfig: {},
        sessionData: {},
        initialize: (toolbox, _logger, _config) => {
            registerProjections();
            toolbox.interceptOpenJson("GET", "/api/v1/vault/home", injectShowcase);
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", injectNominations);
            toolbox.interceptOpenJson("GET", "/api/v1/vault/review", injectReview);
        },
    });
};
const projections = {
    "EPSG:2039": "+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-48,55,52,0,0,0,0 +units=m +no_defs",
    "EPSG:2056": "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs",
    "EPSG:2180": "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:3006": "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:3057": "+proj=lcc +lat_1=64.25 +lat_2=65.75 +lat_0=65 +lon_0=-19 +x_0=500000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:3059": "+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9996 +x_0=500000 +y_0=-6000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:3301": "+proj=lcc +lat_1=59.33333333333334 +lat_2=58 +lat_0=57.51755393055556 +lon_0=24 +x_0=500000 +y_0=6375000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:3346": "+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9998 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:3812": "+proj=lcc +lat_1=49.83333333333334 +lat_2=51.16666666666666 +lat_0=50.797815 +lon_0=4.359215833333333 +x_0=649328 +y_0=665262 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:3857": "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs",
    "EPSG:3908": "+proj=tmerc +lat_0=0 +lon_0=18 +k=0.9999 +x_0=6500000 +y_0=0 +ellps=bessel +towgs84=682,-203,480,0,0,0,0 +units=m +no_defs",
    "EPSG:5048": "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:5650": "+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=33500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:5972": "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +vunits=m +no_defs",
    "EPSG:5973": "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +vunits=m +no_defs",
    "EPSG:25832": "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:25833": "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    "EPSG:28992": "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs",
    "EPSG:31255": "+proj=tmerc +lat_0=0 +lon_0=13.33333333333333 +k=1 +x_0=0 +y_0=-5000000 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs",
    "EPSG:32740": "+proj=utm +zone=40 +south +datum=WGS84 +units=m +no_defs",
};
const providers = [
    {
        label: "Google",
        url: "https://maps.google.com/maps?q=%lat%,%lng%",
    },
    {
        label: "OpenStreetMap",
        url: "https://www.openstreetmap.org/?mlat=%lat%&mlon=%lng%#map=18/%lat%/%lng%",
    },
    {
        label: "Intel",
        url: "https://intel.ingress.com/intel?ll=%lat%,%lng%&z=18",
    },
    {
        label: "Bing",
        url: "https://www.bing.com/maps?cp=%lat%~%lng%&lvl=17&style=h",
    },
    {
        label: "Yandex",
        url: "https://yandex.ru/maps/?l=sat%2Cskl&ll=%lng%%2C%lat%&mode=whatshere&whatshere%5Bpoint%5D=%lng%%2C%lat%&whatshere%5Bzoom%5D=17&z=17",
    },
    {
        // Austria
        label: "eBOD",
        url: "https://bodenkarte.at/#/center/%lng%,%lat%/zoom/19",
        regions: ["AT"],
    },
    {
        // Australia (New South Wales)
        label: "NSW Imagery",
        url: "https://www.arcgis.com/home/webmap/viewer.html?url=http%3A%2F%2Fmaps.six.nsw.gov.au%2Farcgis%2Frest%2Fservices%2Fpublic%2FNSW_Imagery%2FMapServer&source=sd&center=%lng%,%lat%&level=20&mapOnly=true",
        regions: ["AU_NSW"],
    },
    {
        // Australia (South Australia)
        label: "Location SA Viewer",
        url: "https://location.sa.gov.au/viewer/?map=hybrid&x=%lng%&y=%lat%&z=18&uids=&pinx=%lng%&piny=%lat%&pinTitle=%title%&pinText=%desc%",
        regions: ["AU_SA"],
    },
    {
        // Australia (Western Australia)
        label: "Landgate Map Viewer Plus",
        url: "https://map-viewer-plus.app.landgate.wa.gov.au/index.html?center=%lng%,%lat%&level=15",
        regions: ["AU_WA"],
    },
    {
        // Belgium
        label: "NGI/IGN",
        url: "https://topomapviewer.ngi.be/?l=en&baselayer=ngi.ortho&x=%lng%&y=%lat%&zoom=12",
        projection: "EPSG:3812",
        regions: ["BE"],
    },
    {
        // Switzerland
        label: "Admin.ch",
        url: "https://map.geo.admin.ch/?lang=en&topic=ech&bgLayer=ch.swisstopo.swissimage&layers=ch.swisstopo.zeitreihen,ch.bfs.gebaeude_wohnungs_register,ch.bav.haltestellen-oev,ch.swisstopo.swisstlm3d-wanderwege,ch.astra.wanderland-sperrungen_umleitungen&layers_opacity=1,1,1,0.8,0.8&layers_visibility=false,false,false,false,false&layers_timestamp=18641231,,,,&E=%lng%&N=%lat%&zoom=17",
        projection: "EPSG:2056",
        regions: ["CH", "LI"],
    },
    {
        // China (PRC)
        label: "高德",
        url: "https://uri.amap.com/marker?position=%lng%,%lat%&coordinate=wgs84&name=%title%",
        regions: ["CN"],
    },
    {
        // China (PRC)
        label: "百度",
        url: "http://api.map.baidu.com/marker?location=%lat%,%lng%&title=%title%&content=.&output=html&coord_type=wgs84",
        regions: ["CN"],
    },
    {
        // Czech Republic and Slovakia
        label: "Mapy.com",
        url: "https://mapy.com/en/zakladni?source=coor&id=%lng%%2C%lat%&x=%lng%&y=%lat%&z=18&base=ophoto",
        regions: ["CZ", "SK"],
    },
    {
        // Germany (Bavaria)
        label: "BayernAtlas",
        url: "https://geoportal.bayern.de/bayernatlas/?lang=de&topic=ba&bgLayer=atkis&catalogNodes=11&E=%lng%&N=%lat%&zoom=14&layers=luftbild,luftbild_parz,tk_by,d0e7d4ea-62d8-46a0-a54a-09654530beed,bcce5127-a233-4bea-ad08-c0e4c376bccf,e528a2a8-44e7-46e9-9069-1a8295b113b5,6e2f5825-4a89-4942-a464-c88ec41bb734,86e82390-1739-4d21-bf78-e8b189c1a35d,22a00a49-82fc-4562-8176-00bf4a41e587&layers_visibility=false,true,false,true,true,true,true,true,true&crosshair=marker",
        projection: "EPSG:25832",
        regions: ["DE_BY"],
    },
    {
        // Germany (Berlin)
        label: "FIS-Broker",
        url: "https://fbinter.stadt-berlin.de/fb/index.jsp?loginkey=zoomStart&mapId=k_luftbild2011_20@senstadt&bbox=%lng%,%lat%,%lng%,%lat%",
        projection: "EPSG:25833",
        regions: ["DE_BE"],
    },
    {
        // Germany (Bremen)
        label: "GeoPortal Bremen",
        url: "https://geoportal.bremen.de/geoportal/?layerIDs=410_1,400_1,11,17_1&visibility=true,true,true,true&transparency=0,0,0,0&center=%lng%,%lat%&zoomlevel=11",
        projection: "EPSG:25832",
        regions: ["DE_HB"],
    },
    {
        // Germany (Schleswig-Holstein)
        label: "DigitalAtlasNord",
        url: "https://danord.gdi-sh.de/viewer/resources/apps/Anonym/index.html?lang=de&c=%lng%%2C%lat%&vm=2D&s=1500&bm=DOP20&r=0&#/",
        projection: "EPSG:25832",
        regions: ["DE_HB", "DE_HH", "DE_SH"],
    },
    {
        // Germany (Bremen, Hamburg, Schleswig-Holstein)
        label: "Hamburg Geo-Online",
        url: "https://geoportal-hamburg.de/geo-online/?Map/layerIds=12883,12884,16101,19968,94&visibility=true,true,true,true,true&transparency=0,0,0,0,0&Map/center=[%lng%,%lat%]&Map/zoomLevel=9",
        projection: "EPSG:25832",
        regions: ["DE_HB", "DE_HH", "DE_SH"],
    },
    {
        // Germany (Bremen, Hamburg)
        label: "Geoportal der Metropolregion Hamburg",
        url: "https://geoportal.metropolregion.hamburg.de/mrhportal/index.html?Map/layerIds=19101,8012&visibility=true,true&transparency=0,0&Map/center=[%lng%,%lat%]&Map/zoomLevel=11",
        projection: "EPSG:25832",
        regions: ["DE_HB", "DE_HH"],
    },
    {
        // Germany (Mecklenburg-Western Pomerania)
        label: "ORKa.MV",
        url: "https://www.orka-mv.de/app/#!/map=8/%lng%/%lat%/EPSG:25833/S",
        projection: "EPSG:25833",
        regions: ["DE_MV"],
    },
    {
        // Germany (Mecklenburg-Western Pomerania)
        label: "GAIA-MV",
        url: "https://www.gaia-mv.de/gaia/login.php?page=gaia.php&profil=inet_basis&mapext=%lnga%%20%lata%%20%lngb%%20%latb%&target_prj=epsg:5650&target_prj_display_koords=epsg:5650&target_prj_display_koords_format=m&layers=dopmv%20copyright",
        projection: "EPSG:5650",
        cornerOffsets: 10,
        regions: ["DE_MV"],
    },
    {
        // Germany (Lower Saxony)
        label: "GeobasisdatenViewer Niedersachsen",
        url: "https://www.geobasis.niedersachsen.de/?x=%lng%&y=%lat%&z=14&m=lglnDop",
        regions: ["DE_NI"],
    },
    {
        // Germany (Rhineland-Palatinate)
        label: "GeoBasisViewer RLP",
        url: "https://maps.rlp.de/?layerIDs=7&visibility=true&transparency=0&center=%lng%,%lat%&zoomlevel=11",
        projection: "EPSG:25832",
        regions: ["DE_RP"],
    },
    {
        // Germany (Saxony-Anhalt)
        label: "Sachsen-Anhalt-Viewer",
        url: "https://www.geodatenportal.sachsen-anhalt.de/mapapps/resources/apps/viewer_v40/index.html?lang=de&vm=2D&s=500&r=0&c=%lng%%2C%lat%&bm=orthophotos&l=~bauleit(~6%7Bt%3A50%7D%2C~7%7Bt%3A50%7D)",
        projection: "EPSG:25832",
        regions: ["DE_ST"],
    },
    {
        // Germany (Thuringia)
        label: "Thüringen Viewer",
        url: "https://thueringenviewer.thueringen.de/thviewer/?layerIDs=2800&visibility=true&transparency=0&center=%lng%,%lat%&zoomlevel=13",
        projection: "EPSG:25832",
        regions: ["DE_TH"],
    },
    {
        // Denmark
        label: "SDFE Skråfoto",
        url: "https://skraafoto.kortforsyningen.dk/oblivisionjsoff/index.aspx?project=Denmark&lon=%lng%&lat=%lat%",
        regions: ["DK"],
    },
    {
        // Denmark
        label: "Krak",
        url: "https://map.krak.dk/?c=%lat%,%lng%&z=18&l=aerial&g=%lat%,%lng%",
        regions: ["DK"],
    },
    {
        // Denmark
        label: "Find vej",
        url: "https://findvej.dk/%lat%,%lng%",
        regions: ["DK"],
    },
    {
        // Estonia
        label: "Maainfo",
        url: "https://xgis.maaamet.ee/maps/XGis?app_id=UU82A&user_id=at&LANG=1&WIDTH=959&HEIGHT=1305&zlevel=11,%lng%,%lat%",
        projection: "EPSG:3301",
        regions: ["EE"],
    },
    {
        // Estonia
        label: "Maa-amet Fotoladu",
        url: "https://fotoladu.maaamet.ee/?basemap=hybriidk&zlevel=15,%lng%,%lat%&overlay=tyhi",
        regions: ["EE"],
    },
    {
        // Spain
        label: "Iberpix",
        url: "https://www.ign.es/iberpix2/visor/?center=%lng%,%lat%&zoom=20",
        regions: ["ES", "GI", "EA", "IC"],
    },
    {
        // Spain
        label: "Fototeca Digital",
        url: "https://fototeca.cnig.es/fototeca/?center=%lng%,%lat%&zoom=20",
        regions: ["ES", "GI", "EA", "IC"],
    },
    {
        // Finland
        label: "Maanmittauslaitos",
        url: "https://asiointi.maanmittauslaitos.fi/karttapaikka/?lang=fi&share=customMarker&n=%lat%&e=%lng%&title=%title%&desc=%desc%&zoom=13&layers=%5B%7B%22id%22:4,%22opacity%22:35%7D,%7B%22id%22:3,%22opacity%22:100%7D%5D",
        projection: "EPSG:5048",
        regions: ["FI", "AX"],
    },
    {
        // Finland
        label: "Paikkatietoikkuna",
        url: "https://kartta.paikkatietoikkuna.fi/?zoomLevel=13&coord=%lng%_%lat%&mapLayers=24+100+default&markers=2|1|ff4712|%lng%_%lat%|%title%&noSavedState=true&showIntro=false",
        projection: "EPSG:5048",
        regions: ["FI", "AX"],
    },
    {
        // Faroe Islands
        label: "Føroyakort",
        url: "https://kort.foroyakort.fo/kort/?center=%lng%,%lat%&zoom=13",
        regions: ["FO"],
    },
    {
        // Faroe Islands
        label: "Flogmyndir",
        url: "https://umhvorvi.maps.arcgis.com/apps/webappviewer/index.html?id=4c79f18f83c045e181ac87858cb11641&center=%lng%,%lat%&zoom=13",
        regions: ["FO"],
    },
    {
        // France with overseas territories
        label: "Mappy",
        url: "https://fr.mappy.com/plan#/%lat%,%lng%",
        regions: ["FR", "PM", "BL", "SX", "MF", "GP", "MQ", "GF", "YT", "RE", "WF", "MC"],
    },
    {
        // Croatia
        label: "Geoportal DGU",
        url: "https://geoportal.dgu.hr/#/?lng=%lng%&lat=%lat%&zoom=11",
        regions: ["HR"],
    },
    {
        // Indonesia
        label: "Badan Informasi Geospasial",
        url: "https://geoservices.big.go.id/portal/apps/webappviewer/index.html?id=e3509402ccf34c61a44d0f06f952af96&center=%lng%,%lat%&level=18",
        regions: ["ID"],
    },
    {
        // Israel, West Bank
        label: "Govmap",
        url: "https://www.govmap.gov.il/?c=%lng%,%lat%&z=10&b=2",
        projection: "EPSG:2039",
        regions: ["IL", "PS_WB"],
    },
    {
        // Iceland - street view
        label: "Já.is Götusýn",
        url: "https://ja.is/kort/?x=%lng%&y=%lat%&nz=17.00&type=aerial&ja360=1",
        projection: "EPSG:3057",
        regions: ["IS"],
    },
    {
        // Iceland
        label: "Map.is",
        url: "https://map.is/base/@%lng%,%lat%,z10,2",
        projection: "EPSG:3057",
        regions: ["IS"],
    },
    {
        // Iceland
        label: "Landupplýsingagátt LMÍ",
        url: "https://kort.lmi.is/?zoomLevel=15&coord=%lng%_%lat%&mapLayers=396+100+&markers=2|1|ff4712|%lng%_%lat%|%title%&noSavedState=true&showIntro=false",
        projection: "EPSG:3857",
        regions: ["IS"],
    },
    {
        // Iceland
        label: "Samsýn",
        url: "https://kort.samsyn.is/gagnavefsja/?center=%lng%,%lat%&level=11",
        regions: ["IS"],
    },
    {
        // South Korea
        label: "Kakao",
        url: "https://map.kakao.com/?map_type_skyview&map_hybrid=true&q=%lat%%2C%lng%",
        regions: ["KR"],
    },
    {
        // South Korea
        label: "Naver",
        url: "http://map.naver.com/?menu=location&lat=%lat%&lng=%lng%&dLevel=14&title=%title%",
        regions: ["KR"],
    },
    {
        // Liechtenstein
        label: "Geodatenportal der LLV",
        url: "https://geodaten.llv.li/geoportal/public.html?zoombox=%lng%,%lat%,%lng%,%lat%",
        projection: "EPSG:2056",
        regions: ["LI"],
    },
    {
        // Lithuania
        label: "Maps.lt",
        url: "https://maps.lt/map/?lang=en#obj=%lng%;%lat%;%title%;&xy=%lng%,%lat%&z=1000&lrs=orthophoto,hybrid_overlay,vector_2_5d,stops,zebra",
        projection: "EPSG:3346",
        regions: ["LT"],
    },
    {
        // Lithuania
        label: "Geoportal.lt",
        url: "https://www.geoportal.lt/map/mapgen/map2.html#x=%lng%&y=%lat%&l=13&olid=ORT10_2020",
        projection: "EPSG:3346",
        regions: ["LT"],
    },
    {
        // Luxembourg
        label: "Geoportal Luxembourg",
        url: "https://map.geoportail.lu/theme/main?version=3&zoom=19&X=%lng%&Y=%lat%&lang=fr&rotation=0&layers=&opacities=&bgLayer=streets_jpeg&crosshair=true",
        projection: "EPSG:3857",
        regions: ["LU"],
    },
    {
        // Latvia
        label: "LĢIA Kartes",
        url: "https://kartes.lgia.gov.lv/karte/?x=%lat%&y=%lng%&zoom=11&basemap=hibridkarte&bookmark=true",
        projection: "EPSG:3059",
        regions: ["LV"],
    },
    {
        // Latvia and Estonia
        label: "BalticMaps",
        url: "https://www.balticmaps.eu/en/c___%lat%-%lng%-18/w___driving-%lat%,%lng%/bl___pl/labels",
        regions: ["LV", "EE"],
    },
    {
        // Netherlands
        label: "Kaarten van Nederland",
        url: "https://www.kaartenvannederland.nl/#?geometry.x=%lng%&geometry.y=%lat%&zoomlevel=14",
        projection: "EPSG:28992",
        regions: ["NL"],
    },
    {
        // Netherlands
        label: "Map5 NLTopo",
        url: "https://app.map5.nl/nltopo/#rd/openlufo/14/%lng%/%lat%",
        projection: "EPSG:28992",
        regions: ["NL"],
    },
    {
        // Norway
        label: "Finn.no kart",
        url: "https://kart.finn.no/?lng=%lng%&lat=%lat%&zoom=18&mapType=norortho&showPin=1",
        regions: ["NO"],
    },
    {
        // Norway
        label: "1881.no",
        url: "https://kart.1881.no/?lat=%lat%&lon=%lng%&z=18&v=1&r=&o=&layer=",
        regions: ["NO"],
    },
    {
        // Norway
        label: "Gule Sider",
        url: "https://kart.gulesider.no/?c=%lat%,%lng%&z=18&l=aerial&g=%lat%,%lng%",
        regions: ["NO"],
    },
    {
        // Norway
        label: "Norgeskart",
        url: "https://www.norgeskart.no/#!?project=norgeskart&layers=1003&zoom=17&lat=%lat%&lon=%lng%&markerLat=%lat%&markerLon=%lng%",
        projection: "EPSG:5973",
        regions: ["NO"],
    },
    {
        // Norway
        label: "Se eiendom",
        url: "https://www.norgeskart.no/#!?project=seeiendom&layers=1003,1013,1014,1015&zoom=17&lat=%lat%&lon=%lng%&markerLat=%lat%&markerLon=%lng%&panel=Seeiendom&showSelection=true&p=Seeiendom",
        projection: "EPSG:5973",
        regions: ["NO"],
    },
    {
        // Norway
        label: "Norge i bilder",
        url: "https://www.norgeibilder.no/?x=%lng%&y=%lat%&level=17&utm=32",
        projection: "EPSG:5972",
        regions: ["NO"],
    },
    {
        // Norway
        label: "UT.no",
        url: "https://ut.no/kart#17/%lat%/%lng%",
        regions: ["NO"],
    },
    {
        // Norway
        label: "Kommunekart",
        url: "https://www.kommunekart.com/?funksjon=Vispunkt&x=%lat%&y=%lng%&zoom=17&markering=1",
        regions: ["NO"],
    },
    {
        // New Zealand
        label: "Land Information NZ",
        url: "https://basemaps.linz.govt.nz/#@%lat%,%lng%,z19",
        regions: ["NZ_1", "NZ_2"],
    },
    {
        // Poland
        label: "Geoportal",
        url: "https://mapy.geoportal.gov.pl/mobile/?bbox=%lng%,%lat%,%lng%,%lat%#composition=ortofoto",
        projection: "EPSG:2180",
        regions: ["PL"],
    },
    {
        // Serbia
        label: "МРЕ Србије",
        url: "https://gis.mre.gov.rs/smartPortal/Srbija?extent=xmin=%lng%,ymin=%lat%,xmax=%lng%,ymax=%lat%",
        projection: "EPSG:3857",
        regions: ["RS", "XK"],
    },
    {
        // Sweden
        label: "Lantmäteriet",
        url: "https://minkarta.lantmateriet.se/?e=%lng%&n=%lat%&z=14&profile=fastighetskarta&background=1&boundaries=true",
        projection: "EPSG:3006",
        regions: ["SE"],
    },
    {
        // Sweden
        label: "Eniro",
        url: "https://kartor.eniro.se/?c=%lat%,%lng%&z=18&l=aerial&g=%lat%,%lng%",
        regions: ["SE"],
    },
    {
        // Svalbard
        label: "TopoSvalbard",
        url: "https://toposvalbard.npolar.no/?lat=%lat%&long=%lng%&zoom=13&layer=aerial",
        regions: ["SJ_SV"],
    },
];
const registerProjections = () => {
    for (const [epsg, def] of iterObject(projections)) {
        proj4.defs(epsg, def);
    }
};
const injectShowcase = async (result) => {
    await readGeofences();
    await untilTruthy(() => document.querySelector(".showcase-item"));
    const showcase = result.showcase;
    const count = showcase.length;
    let index = 0;
    let box = null;
    const renderRef = () => document.getElementsByClassName("showcase-item__map")[0];
    const render = () => untilTruthy(renderRef).then(async (rref) => {
        const nBox = await addOpenButtons(rref, showcase[index]);
        if (box)
            box.parentElement.removeChild(box);
        box = nBox;
    });
    await render();
    const paginators = document.getElementsByClassName("showcase-gallery__button");
    if (paginators.length === 2) {
        paginators[0].addEventListener("click", () => {
            index = (index - 1 + count) % count;
            void render();
        });
        paginators[1].addEventListener("click", () => {
            index = (index + 1 + count) % count;
            void render();
        });
    }
};
const injectNominations = async (result) => {
    const ref = await untilTruthy(() => document.querySelector("app-submissions-list"));
    const nomCache = {};
    let box = null;
    for (const contribution of result.submissions) {
        if (contribution.imageUrl.length > 0) {
            nomCache[contribution.imageUrl] = contribution;
        }
        if (contribution.type !== ContributionType.NOMINATION) {
            nomCache[contribution.poiData.imageUrl] = contribution;
        }
    }
    ref.addEventListener("click", async (e) => {
        const item = e.target.closest("app-submissions-list-item");
        if (item) {
            const nom = nomCache[item.querySelector(".object-cover").src];
            const rref = await untilTruthy(() => document.querySelector("app-details-pane .details-pane__map"));
            const nBox = await addOpenButtons(rref, nom);
            if (box)
                box.parentElement.removeChild(box);
            box = nBox;
        }
    });
};
// redesign: the review maps are found through Wayfarer's data-testid markers (as Map Mods does),
// and the buttons go below the map's whole box (climbing out of clipping / row layouts).
// The selectors themselves live in utils.ts because review-map-mods uses them as well.
const uwtFindReviewMapBox = (type) => {
    const el = document.querySelector(uwtReviewMapSelectors[type] || "[data-testid=\"base-map-container\"]")
        || document.querySelector("[data-testid=\"base-map-container\"]");
    if (!el)
        return null;
    let anchor = el.closest("[data-testid=\"base-map-root\"]") || el;
    for (let i = 0; i < 6; i++) {
        const parent = anchor.parentElement;
        if (!parent || parent === document.body)
            break;
        const cs = getComputedStyle(parent);
        const clips = [cs.overflow, cs.overflowX, cs.overflowY].some(v => v && v !== "visible");
        const mapSized = parent.offsetHeight <= anchor.offsetHeight + 24;
        if (!clips && !mapSized)
            break;
        anchor = parent;
    }
    for (let i = 0; i < 5; i++) {
        const parent = anchor.parentElement;
        if (!parent || parent === document.body)
            break;
        const cs = getComputedStyle(parent);
        const isRow = /flex/.test(cs.display) && /^row/.test(cs.flexDirection);
        if (!isRow && cs.display !== "grid")
            break;
        anchor = parent;
    }
    return anchor;
};
const injectReview = async (candidate) => {
    for (const old of document.querySelectorAll(".uwtoi-review-box"))
        old.remove();
    const ref = await untilTruthy(() => uwtFindReviewMapBox(candidate.type));
    const box = await addOpenButtons(ref, candidate);
    box.classList.add("uwtoi-review-box");
    // a newer review may have inserted its own box meanwhile -- keep only this (newest) one
    for (const old of document.querySelectorAll(".uwtoi-review-box")) {
        if (old !== box)
            old.remove();
    }
};
const addOpenButtons = async (before, portal) => {
    const box = document.createElement("div");
    box.classList.add("uwtoi-container");
    const globalBox = document.createElement("p");
    makeChildNode(globalBox, "span", "Open in: ").classList.add("uwtoi-label");
    const membership = await getGeofenceMemberships(portal.lat, portal.lng);
    const regionBoxes = {};
    for (const [zone, member] of iterObject(membership)) {
        if (member) {
            const flag = getFlag(zone);
            regionBoxes[flag] = document.createElement("p");
            makeChildNode(regionBoxes[flag], "span", `Local maps (${flag}): `)
                .classList.add("uwtoi-label");
        }
    }
    //let experimental = false;
    providers.forEach(e => {
        if (e.regions && !e.regions.some(region => (membership[region])))
            return;
        const linkSpan = document.createElement("span");
        linkSpan.classList.add("uwtoi-linkspan");
        const link = document.createElement("a");
        let nLat = portal.lat, nLng = portal.lng;
        if (e.projection) {
            [nLng, nLat] = proj4(e.projection, [nLng, nLat]);
        }
        let nLatA = nLat, nLatB = nLat, nLngA = nLng, nLngB = nLng;
        if (e.cornerOffsets) {
            nLatA -= e.cornerOffsets;
            nLngA -= e.cornerOffsets;
            nLatB += e.cornerOffsets;
            nLngB += e.cornerOffsets;
        }
        link.href = e.url
            .split("%lat%").join(nLat.toString())
            .split("%lng%").join(nLng.toString())
            .split("%title%").join(encodeURIComponent(portal.title))
            .split("%desc%").join(encodeURIComponent(portal.description))
            .split("%lata%").join(nLatA.toString())
            .split("%lnga%").join(nLngA.toString())
            .split("%latb%").join(nLatB.toString())
            .split("%lngb%").join(nLngB.toString());
        link.target = "uwtoi-provider-site";
        link.textContent = e.label;
        linkSpan.appendChild(link);
        /*if (e.hasOwnProperty("onload")) {
          experimental = true;
          const ast = document.createElement("span");
          ast.classList.add("uwtoi-experimental");
          ast.textContent = "*";
          const tooltip = document.createElement("span");
          tooltip.classList.add("uwtoi-tooltip");
          const ttTitle = document.createElement("span");
          ttTitle.textContent = "OPEN IN: EXPERIMENTAL PROVIDER";
          ttTitle.classList.add("uwtoi-tttitle");
          const ttBody = document.createElement("span");
          ttBody.textContent = "Open In uses JavaScript injection to make this map provider focus on the Wayspot's location. This is not supported by the map provider, and as such is considered an experimental feature of Open In and indicated as such with an orange star. Use at your own responsibility.";
          tooltip.appendChild(ttTitle);
          tooltip.appendChild(document.createElement("br"));
          tooltip.appendChild(ttBody);
          ast.appendChild(tooltip);
          linkSpan.appendChild(ast);
        }*/
        if (typeof e.regions !== "undefined") {
            for (const [zone, member] of iterObject(membership)) {
                if (member && e.regions.includes(zone)) {
                    regionBoxes[getFlag(zone)].appendChild(linkSpan);
                }
            }
        }
        else {
            globalBox.appendChild(linkSpan);
        }
        // Needed for postMessage:
        // dataCache = { latLng: { lat: nLat, lng: nLng }, title, description };
    });
    if ("guid" in portal && portal.guid !== null && typeof portal.guid !== "undefined") {
        const linkSpan = document.createElement("span");
        linkSpan.classList.add("uwtoi-linkspan");
        const link = document.createElement("a");
        link.href = `https://link.ingress.com/portal/${portal.guid}`;
        link.target = "_blank";
        link.textContent = "Ingress Prime";
        linkSpan.appendChild(link);
        globalBox.appendChild(linkSpan);
    }
    box.appendChild(globalBox);
    for (const zoneBox of Object.values(regionBoxes)) {
        box.appendChild(zoneBox);
    }
    insertAfter(before, box);
    return box;
};
const getGeofenceMemberships = async (lat, lng) => {
    const geofences = await readGeofences();
    const membership = {};
    for (const [zone, points] of iterObject(geofences)) {
        membership[zone] = isWithinBounds(points, lat, lng);
    }
    return membership;
};
const isWithinBounds = (geofence, lat, lng) => {
    let inside = false;
    const count = geofence.length;
    for (let b = 0, a = count - 1; b < count; a = b++) {
        const [aLat, aLng] = geofence[a], [bLat, bLng] = geofence[b];
        if (aLng > lng != bLng > lng && lat > (aLat - bLat) * (lng - bLng) / (aLng - bLng) + bLat) {
            inside = !inside;
        }
    }
    return inside;
};
const getFlag = (countryCode) => {
    const regionalIndicatorOffset = 127397;
    const c1 = String.fromCodePoint(countryCode.codePointAt(0) + regionalIndicatorOffset);
    const c2 = String.fromCodePoint(countryCode.codePointAt(1) + regionalIndicatorOffset);
    return c1 + c2;
};// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
const REVIEW_EXPIRES_SECS = 1200;
var reviewTimer = () => {
    register()({
        id: "review-timer",
        name: "Review Timer",
        authors: ["tehstone", "bilde2910"],
        description: "Add a review timer to Wayfarer. Also adds an optional Smart Submit function that delays your submissions to prevent getting cooldowns.",
        defaultConfig: {
            smartSubmit: false,
            minDelay: 20,
            maxDelay: 30,
        },
        sessionData: {},
        initialize: (toolbox, _logger, config) => {
            config.setUserEditable("smartSubmit", {
                label: "Enable Smart Submit",
                help: "Smart Submit helps you avoid cooldowns by delaying your submission if you are reviewing quickly.",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("minDelay", {
                label: "Smart Submit minimum delay",
                editor: new NumericInputEditor({ min: 0 }),
            });
            config.setUserEditable("maxDelay", {
                label: "Smart Submit maximum delay",
                editor: new NumericInputEditor({ min: 0 }),
            });
            let submitButtonClicked = false;
            let expireTime = 0;
            let interval = 0;
            const ensureTimerStyle = () => {
                if (document.getElementById("uwftmr-style"))
                    return;
                const st = document.createElement("style");
                st.id = "uwftmr-style";
                st.textContent = `
          #uwftmr-outer.uwftmr-div{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:100000;
            display:flex;align-items:center;gap:.6em;margin:0;padding:.25em .9em;border-radius:999px;
            background:rgba(17,24,39,.92);color:#f9fafb;box-shadow:0 2px 8px rgba(0,0,0,.4);
            font-size:14px;line-height:1.2;pointer-events:none}
          #uwftmr-outer p{margin:0}
          #uwftmr-outer .uwftmr-counter{font-size:18px;font-weight:bold;color:#20b8e3;font-variant-numeric:tabular-nums}
          #uwftmr-outer .uwftmr-counter.uwftmr-warn{color:#f2a134}
          #uwftmr-outer .uwftmr-counter.uwftmr-expired{color:#f87171}
          .uwftmr-ssb{cursor:pointer}`;
                document.head.appendChild(st);
            };
            const injectTimer = async (candidate) => {
                console.log("[I]", "[unified-wf-tools]", "[patch]", "review-timer received review data; expires =", candidate && candidate.expires, "; keys =", candidate ? Object.keys(candidate).slice(0, 12).join(",") : "none");
                submitButtonClicked = false;
                expireTime = candidate.expires;
                // redesign: wf-logo no longer exists; the timer is a small fixed badge on <body>
                ensureTimerStyle();
                const container = await untilTruthy(() => document.body);
                let counter = document.getElementById("uwftmr-counter");
                if (counter === null) {
                    const div = document.createElement("div");
                    div.id = "uwftmr-outer";
                    div.classList.add("uwftmr-div");
                    const countLabel = document.createElement("p");
                    countLabel.id = "uwftmr-counter-label";
                    countLabel.textContent = "Time remaining:";
                    counter = document.createElement("p");
                    counter.id = "uwftmr-counter";
                    counter.classList.add("uwftmr-counter");
                    div.appendChild(countLabel);
                    div.appendChild(counter);
                    container.appendChild(div);
                    if (interval)
                        clearInterval(interval);
                    interval = setInterval(() => updateTime(counter, expireTime), 1000);
                    updateTime(counter, expireTime);
                    addSmartSubmitButton();
                }
                else {
                    counter.style.display = "block";
                }
            };
            const removeTimer = () => {
                if (interval) {
                    clearInterval(interval);
                    interval = 0;
                }
                const timer = document.getElementById("uwftmr-outer");
                if (timer !== null)
                    timer.remove();
            };
            const updateTime = (counter, expiry) => {
                const outer = document.getElementById("uwftmr-outer");
                if (outer)
                    outer.style.display = /\/review(\/|$)/.test(location.pathname) ? "flex" : "none";
                const diff = Math.ceil((expiry - new Date().getTime()) / 1000);
                counter.classList.toggle("uwftmr-warn", diff >= 0 && diff < 120);
                counter.classList.toggle("uwftmr-expired", diff < 0);
                if (diff < 0) {
                    counter.textContent = "Expired";
                    return;
                }
                const minutes = Math.floor(diff / 60).toString().padStart(2, "0");
                const seconds = Math.abs(diff % 60).toString().padStart(2, "0");
                counter.textContent = `${minutes}:${seconds}`;
            };
            // redesign: the Submit button is found by its label instead of .wf-split-button
            const findSubmitButton = () => Array.from(document.querySelectorAll("button"))
                .find(b => b.id !== "uwftmr-ssb-0" && b.textContent.trim() === "Submit" && !b.closest("[role=dialog]"));
            let ssbTries = 0;
            const addSmartSubmitButton = () => {
                const sButton = findSubmitButton();
                const existing = document.getElementById("uwftmr-ssb-0");
                if (!sButton && !existing) {
                    if (++ssbTries < 40)
                        setTimeout(addSmartSubmitButton, 400);
                    return;
                }
                ssbTries = 0;
                if (!config.get("smartSubmit")) {
                    if (existing)
                        existing.style.display = "none";
                    if (sButton)
                        sButton.style.display = "";
                    return;
                }
                let ssButton = existing;
                if (ssButton === null) {
                    ssButton = document.createElement("button");
                    ssButton.id = "uwftmr-ssb-0";
                    ssButton.type = "button";
                    ssButton.textContent = "Smart Submit";
                    ssButton.addEventListener("click", () => checkSubmitReview());
                    sButton.parentNode.insertBefore(ssButton, sButton);
                }
                ssButton.style.display = "";
                const real = findSubmitButton();
                const mirror = () => {
                    if (!real)
                        return;
                    const cls = real.className + " uwftmr-ssb";
                    if (ssButton.className !== cls)
                        ssButton.className = cls;
                    if (ssButton.disabled !== real.disabled)
                        ssButton.disabled = real.disabled;
                    if (real.style.display !== "none")
                        real.style.display = "none";
                };
                mirror();
                if (real && !real.__uwtObserved) {
                    real.__uwtObserved = true;
                    // keep Smart Submit looking enabled/disabled like the real button (only that one element is watched)
                    new MutationObserver(mirror).observe(real, { attributes: true, attributeFilter: ["disabled", "class"] });
                }
            };
            const checkSubmitReview = (rejection = false) => {
                if (submitButtonClicked)
                    return;
                submitButtonClicked = true;
                const diff = Math.ceil((expireTime - new Date().getTime()) / 1000);
                const delay = randomIntFromInterval(config.get("minDelay"), config.get("maxDelay"));
                if (diff + delay > REVIEW_EXPIRES_SECS) {
                    updateButtonText(`Submitting in ${Math.abs(REVIEW_EXPIRES_SECS - delay - diff)}`, Math.abs(REVIEW_EXPIRES_SECS - delay - diff));
                }
                waitToSubmit(delay, rejection);
            };
            const waitToSubmit = (delay, rejection) => {
                const diff = Math.ceil((expireTime - new Date().getTime()) / 1000);
                if (diff + delay < REVIEW_EXPIRES_SECS) {
                    let btn;
                    if (rejection) {
                        const parent = document.getElementsByClassName("mat-dialog-container")[0];
                        btn = parent.querySelector("[class*='wf-button--primary'][style*='display: none;']");
                    }
                    else {
                        btn = findSubmitButton();
                    }
                    btn.click();
                }
                else {
                    updateButtonText(`Submitting in ${Math.abs(REVIEW_EXPIRES_SECS - delay - diff)}`, Math.abs(REVIEW_EXPIRES_SECS - delay - diff));
                    setTimeout(() => waitToSubmit(delay, rejection), 1000);
                }
            };
            const updateButtonText = (message, timeRemaining) => {
                let button;
                for (let i = 0; i < 5; i++) {
                    button = document.getElementById(`uwftmr-ssb-${i}`);
                    if (button === null)
                        break;
                    button.textContent = message;
                }
                button = document.getElementById("uwftmr-ssmb-r");
                if (button !== null)
                    button.textContent = message;
                button = document.getElementById("uwftmr-ssmb-d");
                if (button !== null)
                    button.textContent = message;
                const timerText = document.getElementById("uwftmr-counter");
                timerText.style.display = "none";
                let counter = document.getElementById("uwftmr-subcounter");
                if (counter === null) {
                    counter = document.createElement("p");
                    counter.textContent = timeRemaining.toString();
                    counter.id = "uwftmr-subcounter";
                    counter.classList.add("uwftmr-counter");
                    timerText.parentNode.appendChild(counter);
                }
                else {
                    counter.textContent = timeRemaining.toString();
                }
                const counterLabel = document.getElementById("uwftmr-counter-label");
                counterLabel.textContent = "Submitting in:";
                counterLabel.style.fontWeight = "bold";
            };
            const randomIntFromInterval = (min, max) => {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/review", injectTimer);
            toolbox.interceptSendJson("/api/v1/vault/review", removeTimer);
        },
    });
};// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
const WDD_LINK_PRIVACY_POLICY = "Membership in the Wayfarer Discussion Discord (WDD) is required to use this function."
    + "\n\nPRIVACY NOTICE\nBy using this function, your stats will be automatically submitted to WDD and King Clippy. "
    + "Whenever such a submission occurs, the submission will be logged in WDD alongside your Discord ID and the exact timestamp "
    + "of the submission. The submission log is visible to WDD administrators, who may access these logs at any time, for any purpose. "
    + "Additionally, all stats submissions are publicly visible to everyone in the #clippys-corner channel in WDD."
    + "\n\nSubmissions are processed through a third-party web service operated by the WDD administrators. When you authenticate "
    + "your Discord account through WF Extended Stats, this web service will validate your Discord credentials and verify your membership "
    + "in WDD. If successful, your browser is issued an encrypted token (ticket) that identifies your Discord account. "
    + "The token is used by the web service to connect your submitted statistics to your Discord account. The web service will "
    + "NEVER have access to your Discord password."
    + "\n\nClicking OK in this dialog box indicates your consent to data processing in accordance with these terms. "
    + "If you do not consent to these terms, please press Cancel now. If you wish to withdraw your consent in the future, "
    + "please contact WDD staff, who will assist you in purging your data from WDD.";
var extendedStats = () => {
    register()({
        id: "extended-stats",
        name: "Extended Stats",
        authors: ["tehstone", "bilde2910"],
        description: "Add extended Wayfarer Profile stats",
        defaultConfig: {
            agreementCountType: "simple",
            pogoMedalCount: 0,
            bonusUpgrades: 0,
            offsetAgreements: 0,
            wddClippyLink: null,
            lastImport: 0,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("agreementCountType", {
                label: "Agreement Count Type",
                help: "How the extended stats should be calculated",
                editor: new SelectBoxEditor({
                    "badgestat": "Medal Stat",
                    "upgradecount": "Upgrade Count",
                    "simple": "Simple",
                }),
            });
            config.setUserEditable("pogoMedalCount", {
                label: "Pokemon Go Medal Count",
                editor: new NumericInputEditor({
                    min: 0,
                }),
            });
            config.setUserEditable("bonusUpgrades", {
                label: "Bonus Upgrades Earned",
                editor: new NumericInputEditor({
                    min: 0,
                }),
            });
            config.setUserEditable("offsetAgreements", {
                label: "Agreements Offset",
                editor: new NumericInputEditor(),
            });
            config.setUserEditable("wddClippyLink", {
                label: "Auto-submit to WDD",
                editor: new DiscordUserLinkEditor({
                    authWindowUrl: "https://apps.varden.info/wfptools/wdd/",
                    confirmationText: WDD_LINK_PRIVACY_POLICY,
                    connectCallback: () => {
                        alert("Connection successful! Please note that stats are only submitted to WDD when you visit the Profile page in Wayfarer. If you do not visit this page, your statistics will not be submitted.");
                    },
                }),
            });
            // ---- redesign: the Profile page (wf-profile-stats__section-title, wf-credibility-card) the extra stats and
            // the Copy Stats button used to be added to is gone. They are now shown in a window opened from the
            // Wayfarer Tools menu. Auto-submitting to WDD no longer waits for the page, only for the profile data.
            let profile = null;
            const handleProfile = (p) => {
                profile = p;
                const wddLink = config.get("wddClippyLink");
                if (wddLink)
                    sendToKingClippy(p, wddLink);
            };
            const openStatsWindow = async () => {
                const { container, dismiss } = await toolbox.createModal("uwtes-modal");
                if (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")) {
                    container.classList.add("uwt-dark");
                }
                const close = makeChildNode(container, "button", "\u00d7");
                close.className = "uwtes-x";
                close.addEventListener("click", dismiss);
                makeChildNode(container, "h2", "Extended stats");
                const body = makeChildNode(container, "div");
                if (profile === null) {
                    makeChildNode(body, "p", "Loading profile...");
                    try {
                        profile = await toolbox.makeRequest("GET", "/api/v1/vault/profile");
                    }
                    catch (e) {
                        logger.error(e);
                    }
                    body.innerHTML = "";
                }
                const p = profile;
                if (p === null) {
                    makeChildNode(body, "p", "Could not load your profile.");
                    return;
                }
                const allAgreements = getTotalAgreementCount(p) || p.accepted + p.rejected + p.duplicated;
                const percent = p.finished > 0 ? ((allAgreements / p.finished) * 100).toFixed(1) : "-";
                const otherAgreements = allAgreements - p.accepted - p.rejected - p.duplicated;
                const table = makeChildNode(body, "table");
                table.className = "uwtes-table";
                const rows = [
                    ["Processed", p.finished.toString(), false],
                    ["Accepted", p.accepted.toString(), false],
                    ["Rejected", p.rejected.toString(), false],
                    ["Duplicates", p.duplicated.toString(), false],
                    ["Processed & Agreement", `${allAgreements} (${percent}%)`, true],
                    ["Other Agreements", otherAgreements.toString(), true],
                ];
                for (const [label, value, extended] of rows) {
                    const row = makeChildNode(table, "tr");
                    makeChildNode(row, "td", label).classList.add("uwftes-text");
                    makeChildNode(row, "td", value).classList.add("uwftes-count");
                    if (extended)
                        row.classList.add("uwtes-extended");
                }
                const exportButton = makeChildNode(body, "button", "Copy Stats");
                exportButton.classList.add("uwftcore-ui-button", "uwtes-copy");
                exportButton.addEventListener("click", async () => {
                    await navigator.clipboard.writeText(JSON.stringify(makeStats(p)));
                    exportButton.textContent = "Stats copied to clipboard!";
                    setTimeout(() => { exportButton.textContent = "Copy Stats"; }, 2000);
                });
            };
            const getTotalAgreementCount = (stats) => {
                switch (config.get("agreementCountType")) {
                    case "upgradecount":
                        return (stats.total + stats.available - config.get("bonusUpgrades")) * 100
                            + stats.progress + config.get("offsetAgreements");
                    case "badgestat":
                        return config.get("pogoMedalCount");
                    case "simple":
                        return stats.accepted + stats.rejected + stats.duplicated;
                }
            };
            const makeStats = (stats) => {
                const { performance, finished, accepted, rejected, duplicated, available, progress, total } = stats;
                const total_agreements = getTotalAgreementCount(stats);
                const base_agreements = accepted + rejected + duplicated;
                let other = total_agreements - base_agreements;
                let count_type = config.get("agreementCountType");
                if (count_type === "badgestat") {
                    count_type = "facts";
                }
                else if (count_type === "upgradecount") {
                    count_type = "aprox";
                }
                else {
                    count_type = "simple";
                    other = 0;
                }
                const exportData = {
                    "current_rating": performance,
                    "total_nominations": finished,
                    "total_agreements": total_agreements,
                    "accepted": accepted,
                    "rejected": rejected,
                    "duplicates": duplicated,
                    "other": other,
                    "upgrades_available": available,
                    "current_progress": progress,
                    "upgrades_redeemed": total,
                    "extended_type": count_type,
                    "badge_count": config.get("pogoMedalCount"),
                    "bonus_upgrades": config.get("bonusUpgrades"),
                    "agreement_offset": config.get("offsetAgreements"),
                };
                return exportData;
            };
            const sendToKingClippy = (stats, link) => {
                logger.info("Checking if data should be sent to WDD...");
                const now = Date.now();
                const lastImport = config.get("lastImport");
                if (now - lastImport < 3600000) {
                    logger.info("WDD data was sent in the past hour; skipping");
                    return;
                }
                config.set("lastImport", now);
                logger.info("Sending data to WDD...");
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "https://apps.varden.info/wfptools/wdd/post-stats.php", true);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(JSON.stringify({
                    id: link.id,
                    data: makeStats(stats),
                }));
            };
            // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
            toolbox.addMenuItem("extended-stats", {
                label: "Extended stats",
                icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"/></svg>",
                callback: () => { void openStatsWindow(); },
            });
            toolbox.interceptOpenJson("GET", "/api/v1/vault/profile", handleProfile);
        },
    });
};var ImportIcon = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20%20%20width%3D%22571.414%22%20%20%20height%3D%22437.86945%22%20%20%20version%3D%221.1%22%20%20%20viewBox%3D%220%200%20151.18471%20115.8515%22%20%20%20id%3D%22svg3%22%20%20%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20%20%20xmlns%3Asvg%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%20%20%3Cdefs%20%20%20%20%20id%3D%22defs3%22%20%2F%3E%20%20%3Cpath%20%20%20%20%20d%3D%22m%202.8482365%2C52.50375%2018.2619995%2C18.82%2018.262%2C-18.82%22%20%20%20%20%20fill%3D%22none%22%20%20%20%20%20stroke%3D%22%234d4d4d%22%20%20%20%20%20stroke-linecap%3D%22butt%22%20%20%20%20%20stroke-linejoin%3D%22miter%22%20%20%20%20%20stroke-miterlimit%3D%224%22%20%20%20%20%20stroke-width%3D%227.9375%22%20%20%20%20%20id%3D%22path1%22%20%20%20%20%20style%3D%22stroke%3A%23808080%3Bstroke-opacity%3A1%22%20%2F%3E%20%20%3Cg%20%20%20%20%20transform%3D%22translate%28-65.773364%2C-74.36625%29%22%20%20%20%20%20fill%3D%22none%22%20%20%20%20%20stroke-width%3D%227.9375%22%20%20%20%20%20id%3D%22g3%22%3E%20%20%20%20%3Cpath%20%20%20%20%20%20%20d%3D%22m%20140.38%2C95.555%20v%2036.737%20l%2018.518%2C18.152%22%20%20%20%20%20%20%20stroke%3D%22%230573e1%22%20%20%20%20%20%20%20stroke-linecap%3D%22butt%22%20%20%20%20%20%20%20stroke-linejoin%3D%22miter%22%20%20%20%20%20%20%20stroke-miterlimit%3D%224%22%20%20%20%20%20%20%20id%3D%22path2%22%20%20%20%20%20%20%20style%3D%22stroke%3A%23df471c%3Bstroke-opacity%3A1%22%20%2F%3E%20%20%20%20%3Cpath%20%20%20%20%20%20%20d%3D%22m%2087.842%2C145.09%20a%2054.085%2C53.957%200%200%201%20-1.5433%2C-12.798%2054.085%2C53.957%200%200%201%2054.085%2C-53.957%2054.085%2C53.957%200%200%201%2054.085%2C53.957%2054.085%2C53.957%200%200%201%20-54.085%2C53.957%2054.085%2C53.957%200%200%201%20-38.244%2C-15.804%22%20%20%20%20%20%20%20stroke%3D%22%234d4d4d%22%20%20%20%20%20%20%20style%3D%22stroke%3A%23808080%3Bstroke-opacity%3A1%3Bpaint-order%3Astroke%20markers%20fill%22%20%20%20%20%20%20%20id%3D%22path3%22%20%2F%3E%20%20%3C%2Fg%3E%3C%2Fsvg%3E";var LoadingWheel = "data:image/svg+xml,%3Csvg%20width%3D%2238%22%20height%3D%2238%22%20viewBox%3D%220%200%2038%2038%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%20%20%20%20%3Cdefs%3E%20%20%20%20%20%20%20%20%3ClinearGradient%20x1%3D%228.042%25%22%20y1%3D%220%25%22%20x2%3D%2265.682%25%22%20y2%3D%2223.865%25%22%20id%3D%22a%22%3E%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%220%22%20offset%3D%220%25%22%2F%3E%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.631%22%20offset%3D%2263.146%25%22%2F%3E%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20stop-color%3D%22%23fff%22%20offset%3D%22100%25%22%2F%3E%20%20%20%20%20%20%20%20%3C%2FlinearGradient%3E%20%20%20%20%3C%2Fdefs%3E%20%20%20%20%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%20%20%20%20%20%20%20%20%3Cg%20transform%3D%22translate%281%201%29%22%3E%20%20%20%20%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M36%2018c0-9.94-8.06-18-18-18%22%20id%3D%22Oval-2%22%20stroke%3D%22url%28%23a%29%22%20stroke-width%3D%222%22%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3CanimateTransform%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20attributeName%3D%22transform%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20type%3D%22rotate%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20from%3D%220%2018%2018%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20to%3D%22360%2018%2018%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20dur%3D%220.9s%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20repeatCount%3D%22indefinite%22%20%2F%3E%20%20%20%20%20%20%20%20%20%20%20%20%3C%2Fpath%3E%20%20%20%20%20%20%20%20%20%20%20%20%3Ccircle%20fill%3D%22%23fff%22%20cx%3D%2236%22%20cy%3D%2218%22%20r%3D%221%22%3E%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3CanimateTransform%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20attributeName%3D%22transform%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20type%3D%22rotate%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20from%3D%220%2018%2018%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20to%3D%22360%2018%2018%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20dur%3D%220.9s%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20repeatCount%3D%22indefinite%22%20%2F%3E%20%20%20%20%20%20%20%20%20%20%20%20%3C%2Fcircle%3E%20%20%20%20%20%20%20%20%3C%2Fg%3E%20%20%20%20%3C%2Fg%3E%3C%2Fsvg%3E";var IconNomination = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%20512%20512%22%20xml%3Aspace%3D%22preserve%22%3E%20%20%3Cg%20transform%3D%22matrix%285.5202%200%200%205.5202%207.5948%207.5921%29%22%3E%20%20%20%20%3Cpath%20%20%20%20%20%20d%3D%22m45%200c-19.537%200-35.375%2015.838-35.375%2035.375%200%208.722%203.171%2016.693%208.404%2022.861l26.971%2031.764%2026.97-31.765c5.233-6.167%208.404-14.139%208.404-22.861%201e-3%20-19.536-15.837-35.374-35.374-35.374zm0%2048.705c-8.035%200-14.548-6.513-14.548-14.548s6.513-14.548%2014.548-14.548%2014.548%206.513%2014.548%2014.548-6.513%2014.548-14.548%2014.548z%22%20%20%20%20%20%20fill%3D%22%23ffffff%22%20%20%20%20%20%20stroke-linecap%3D%22round%22%20%2F%3E%20%20%3C%2Fg%3E%3C%2Fsvg%3E";var IconPhoto = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%20512%20512%22%20xml%3Aspace%3D%22preserve%22%3E%20%20%3Cpath%20%20%20%20d%3D%22m190.39%2084.949c-6.6975%205.26e-4%20-12.661%204.2407-14.861%2010.566l-16.951%2048.736h-86.783c-16.463%208e-5%20-29.807%2013.346-29.807%2029.809v221.27c-1.31e-4%2017.518%2014.201%2031.719%2031.719%2031.719h360.38c19.84%201.8e-4%2035.922-16.084%2035.922-35.924v-215.54c5.2e-4%20-17.307-14.029-31.337-31.336-31.338h-86.865l-16.549-48.605c-2.1787-6.3967-8.1858-10.698-14.943-10.697h-129.92zm224.45%20102.69c12.237%205.2e-4%2022.156%209.8009%2022.156%2021.889%203.9e-4%2012.088-9.9185%2021.888-22.156%2021.889-12.238%205.4e-4%20-22.161-9.7994-22.16-21.889%207e-4%20-12.088%209.9224-21.889%2022.16-21.889zm-158.85%2030.947c37.042-8.9e-4%2067.071%2030.028%2067.07%2067.07-1.9e-4%2037.042-30.029%2067.069-67.07%2067.068-37.041-1.8e-4%20-67.07-30.028-67.07-67.068-8.9e-4%20-37.041%2030.029-67.07%2067.07-67.07z%22%20%20%20%20fill%3D%22%23ffffff%22%20%2F%3E%3C%2Fsvg%3E";var IconEditLocation = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%20512%20512%22%20xml%3Aspace%3D%22preserve%22%3E%20%20%3Cpath%20%20%20%20d%3D%22m275.28%20191.57-37.927%20265.39-182.75-401.92zm182.12%2046.046-274.31%2038.177-128.26-220.75z%22%20%20%20%20stroke-linecap%3D%22round%22%20%20%20%20stroke-linejoin%3D%22round%22%20%20%20%20fill%3D%22%23ffffff%22%20%20%20%20stroke%3D%22%23ffffff%22%20%20%20%20stroke-width%3D%2226.07%22%20%2F%3E%3C%2Fsvg%3E";var IconEditTitle = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%20512%20512%22%20xml%3Aspace%3D%22preserve%22%3E%20%20%3Cpath%20d%3D%22m15.116%20412.39v84.373h84.373%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%2230%22%20%2F%3E%20%20%3Cpath%20d%3D%22m496.66%20412.24v84.373h-84.373%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%2230%22%20%2F%3E%20%20%3Cpath%20d%3D%22m14.915%20100.07v-84.373h84.373%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%2230%22%20%2F%3E%20%20%3Cpath%20d%3D%22m496.46%20100.22v-84.373h-84.373%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%2230%22%20%2F%3E%20%20%3Cpath%20%20%20%20d%3D%22m81.232%2082.633v142.8l29.4%201.4004c1.2444-20.844%203.4221-38.112%206.5332-51.801%203.4222-14%207.7775-25.044%2013.066-33.133%205.6-8.4%2012.291-14.156%2020.068-17.268%207.7778-3.4222%2016.955-5.1328%2027.533-5.1328h42.467v261.33c0%2014.311-13.844%2021.467-41.533%2021.467v27.066h155.4v-27.066c-28%200-42-7.1557-42-21.467v-261.33h42c10.578%200%2019.755%201.7106%2027.533%205.1328%207.7778%203.1111%2014.313%208.8676%2019.602%2017.268%205.6%208.0889%209.9553%2019.133%2013.066%2033.133%203.4222%2013.689%205.7556%2030.956%207%2051.801l29.4-1.4004v-142.8h-349.54z%22%20%20%20%20fill%3D%22%23ffffff%22%20%2F%3E%3C%2Fsvg%3E";var IconEditDescription = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%20512%20512%22%20xml%3Aspace%3D%22preserve%22%3E%20%20%3Cpath%20d%3D%22m15.116%20412.39v84.373h84.373%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%2230%22%20%2F%3E%20%20%3Cpath%20d%3D%22m496.66%20412.24v84.373h-84.373%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%2230%22%20%2F%3E%20%20%3Cpath%20d%3D%22m14.915%20100.07v-84.373h84.373%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%2230%22%20%2F%3E%20%20%3Cpath%20d%3D%22m496.46%20100.22v-84.373h-84.373%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%2230%22%20%2F%3E%20%20%3Cpath%20%20%20%20d%3D%22m79.133%2082.633v27.533c27.689%200%2041.533%207.1557%2041.533%2021.467v249.2c0%2014.311-13.844%2021.467-41.533%2021.467v27.066h182c28.311%200%2053.201-2.9561%2074.668-8.8672s39.355-15.867%2053.666-29.867c14.622-14%2025.51-32.667%2032.666-56%207.1556-23.333%2010.734-52.577%2010.734-87.732%200-34.533-3.5788-62.533-10.734-84-7.1556-21.467-18.044-38.111-32.666-49.934-14.311-11.822-32.199-19.756-53.666-23.801-21.467-4.3556-46.357-6.5332-74.668-6.5332h-182zm112.93%2036.867h76.533c17.422%200%2031.889%202.489%2043.4%207.4668%2011.822%204.6667%2021.156%2012.134%2028%2022.4%207.1556%2010.267%2012.134%2023.644%2014.934%2040.133%202.8%2016.178%204.1992%2035.779%204.1992%2058.801%200%2023.022-1.3992%2043.555-4.1992%2061.6s-7.778%2033.288-14.934%2045.732c-6.8444%2012.133-16.178%2021.467-28%2028-11.511%206.2222-25.978%209.334-43.4%209.334h-76.533v-273.47z%22%20%20%20%20fill%3D%22%23ffffff%22%20%2F%3E%3C%2Fsvg%3E";// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
const EMAIL_PROCESSING_VERSION = 2;
const FILTER_COLUMNS = ["id", "type", "day", "upgraded", "status", "isNianticControlled", "canAppeal", "isClosed", "canHold", "canReleaseHold"];
const SUPPORTED_EMAIL_TYPES = [
    EmailType.NOMINATION_RECEIVED,
    EmailType.NOMINATION_DECIDED,
    EmailType.NOMINATION_APPEAL_RECEIVED,
    EmailType.NOMINATION_APPEAL_DECIDED,
    EmailType.PHOTO_RECEIVED,
    EmailType.PHOTO_DECIDED,
    /*EmailType.EDIT_RECEIVED,
    EmailType.EDIT_DECIDED,*/
];
const STATE_MAP = {
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    VOTING: "Entered voting",
    DUPLICATE: "Rejected as duplicate",
    WITHDRAWN: "Withdrawn",
    NOMINATED: "Submitted",
    APPEALED: "Appealed",
    NIANTIC_REVIEW: "Entered Niantic review",
    HELD: "Held",
    UPGRADE: "Upgraded",
};
var EmailProcessingResult;
(function (EmailProcessingResult) {
    EmailProcessingResult["SUCCESS"] = "success";
    EmailProcessingResult["SKIPPED"] = "skipped";
    EmailProcessingResult["UNSUPPORTED"] = "unsupported";
    EmailProcessingResult["AMBIGUOUS"] = "ambiguous";
    EmailProcessingResult["FAILURE"] = "failure";
    EmailProcessingResult["UNCHANGED"] = "unchanged";
})(EmailProcessingResult || (EmailProcessingResult = {}));
var nominationStatusHistory = () => {
    register()({
        id: "nomination-status-history",
        name: "Nomination Status History",
        authors: ["tehstone", "bilde2910", "Tntnnbltn"],
        description: "Track changes to contribution status, and receive alerts when a contribution has changed status.",
        defaultConfig: {
            askAboutCrashReports: true,
            showImportButton: true,
            notifyNewContributions: true,
            expandedByDefault: false,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            var _EmailProcessor_instances, _EmailProcessor_submissions, _EmailProcessor_statusHistoryMap, _EmailProcessor_alreadyProcessed, _EmailProcessor_stats, _EmailProcessor_errors, _EmailProcessor_dismissNotification, _EmailProcessor_mergeEmailChange, _EmailProcessor_deduplicateHistoryArray, _EmailProcessor_importChangeIntoDatabase, _EmailProcessor_reportErrors;
            config.setUserEditable("askAboutCrashReports", {
                label: "Prompt to send crash reports",
                help: "Enable this to be asked to send crash reports if Nomination Status History crashes while trying to parse an email",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("showImportButton", {
                label: "Enable backup data import",
                help: "Adds a sidebar button to import old data from Nomination Status History",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("notifyNewContributions", {
                label: "Notify about new contributions",
                help: "Create popup notifications whenever new contributions are detected in the contributions list",
                editor: new CheckboxEditor(),
            });
            let ready = false;
            class EmailProcessor {
                constructor(submissions) {
                    _EmailProcessor_instances.add(this);
                    _EmailProcessor_submissions.set(this, void 0);
                    _EmailProcessor_statusHistoryMap.set(this, void 0);
                    _EmailProcessor_alreadyProcessed.set(this, void 0);
                    _EmailProcessor_stats.set(this, void 0);
                    _EmailProcessor_errors.set(this, void 0);
                    _EmailProcessor_dismissNotification.set(this, void 0);
                    __classPrivateFieldSet(this, _EmailProcessor_submissions, submissions, "f");
                    __classPrivateFieldSet(this, _EmailProcessor_statusHistoryMap, {}, "f");
                    __classPrivateFieldSet(this, _EmailProcessor_alreadyProcessed, new Set(), "f");
                    __classPrivateFieldSet(this, _EmailProcessor_errors, [], "f");
                    __classPrivateFieldSet(this, _EmailProcessor_dismissNotification, () => { }, "f");
                    __classPrivateFieldSet(this, _EmailProcessor_stats, {
                        success: 0,
                        skipped: 0,
                        unsupported: 0,
                        ambiguous: 0,
                        failure: 0,
                        unchanged: 0,
                    }, "f");
                }
                async prepare() {
                    logger.info("Preparing email processor...");
                    __classPrivateFieldSet(this, _EmailProcessor_dismissNotification, () => toolbox.notify({
                        color: "dark-gray",
                        message: "Processing Email API data, please wait...",
                        icon: LoadingWheel,
                        dismissable: false,
                    }).dismiss(), "f");
                    {
                        const env_1 = { stack: [], error: void 0, hasError: false };
                        try {
                            const idb = __addDisposableResource(env_1, await toolbox.openIDB("history", "readonly"), false);
                            const history = await idb.getAll();
                            __classPrivateFieldSet(this, _EmailProcessor_statusHistoryMap, assignAll({}, ...history.map(e => ({ [e.id]: e.statusHistory }))), "f");
                        }
                        catch (e_1) {
                            env_1.error = e_1;
                            env_1.hasError = true;
                        }
                        finally {
                            __disposeResources(env_1);
                        }
                    }
                    {
                        const env_2 = { stack: [], error: void 0, hasError: false };
                        try {
                            const idb = __addDisposableResource(env_2, await toolbox.openIDB("emails", "readonly"), false);
                            const records = await idb.getAll();
                            __classPrivateFieldGet(this, _EmailProcessor_alreadyProcessed, "f").clear();
                            for (const record of records) {
                                if (
                                // Reprocess
                                record.version < EMAIL_PROCESSING_VERSION ||
                                    // Reprocess old failures due to bugfixes and template additions
                                    record.result === EmailProcessingResult.UNSUPPORTED ||
                                    record.result === EmailProcessingResult.FAILURE
                                //||record.result===EmailProcessingResult.AMBIGUOUS//DEBUG
                                ) {
                                    continue;
                                }
                                __classPrivateFieldGet(this, _EmailProcessor_alreadyProcessed, "f").add(record.id);
                            }
                        }
                        catch (e_2) {
                            env_2.error = e_2;
                            env_2.hasError = true;
                        }
                        finally {
                            __disposeResources(env_2);
                        }
                    }
                    for (const k of iterKeys(__classPrivateFieldGet(this, _EmailProcessor_stats, "f"))) {
                        __classPrivateFieldGet(this, _EmailProcessor_stats, "f")[k] = 0;
                    }
                    logger.info("Email processor fully prepared.");
                }
                async import(email, dbHistory, dbEmails) {
                    var _a;
                    if (__classPrivateFieldGet(this, _EmailProcessor_alreadyProcessed, "f").has(email.messageID))
                        return;
                    logger.debug(`Processing email ${email.messageID}`);
                    const result = processEmail(logger, email, __classPrivateFieldGet(this, _EmailProcessor_submissions, "f"), __classPrivateFieldGet(this, _EmailProcessor_statusHistoryMap, "f"));
                    __classPrivateFieldGet(this, _EmailProcessor_alreadyProcessed, "f").add(email.messageID);
                    let status = result.status;
                    if (status === EmailProcessingResult.SUCCESS && result.change && result.id) {
                        const merged = __classPrivateFieldGet(this, _EmailProcessor_instances, "m", _EmailProcessor_mergeEmailChange).call(this, result.id, result.change);
                        if (merged) {
                            await __classPrivateFieldGet(this, _EmailProcessor_instances, "m", _EmailProcessor_importChangeIntoDatabase).call(this, dbHistory, result.id, merged.updates);
                        }
                        else {
                            status = EmailProcessingResult.UNCHANGED;
                        }
                    }
                    if (status === EmailProcessingResult.UNSUPPORTED || status === EmailProcessingResult.FAILURE) {
                        const err = {
                            email: email.createDebugBundle(),
                            error: JSON.parse(JSON.stringify(result.error, Object.getOwnPropertyNames(result.error))),
                        };
                        if ((_a = result.error) === null || _a === void 0 ? void 0 : _a.stack) {
                            err.stack = result.error.stack.split("\n").filter(n => n.length);
                        }
                        __classPrivateFieldGet(this, _EmailProcessor_errors, "f").push(err);
                    }
                    __classPrivateFieldGet(this, _EmailProcessor_stats, "f")[status]++;
                    logger.debug(`Putting result of processing ${email.messageID} into NSH emails database`);
                    dbEmails.put({
                        id: email.messageID,
                        ts: Date.now(),
                        result: status,
                        version: EMAIL_PROCESSING_VERSION,
                    });
                    dbEmails.commit();
                    logger.debug(`Finished processing email ${email.messageID}.`);
                }
                finalize(withNotification) {
                    logger.info("Finalizing email processor...");
                    const total = Object.values(__classPrivateFieldGet(this, _EmailProcessor_stats, "f")).reduce((p, c) => p + c, 0);
                    const cUpdated = __classPrivateFieldGet(this, _EmailProcessor_stats, "f")[EmailProcessingResult.SUCCESS];
                    const cUnchanged = __classPrivateFieldGet(this, _EmailProcessor_stats, "f")[EmailProcessingResult.UNCHANGED];
                    const cSkipped = __classPrivateFieldGet(this, _EmailProcessor_stats, "f")[EmailProcessingResult.SKIPPED];
                    const cAmbiguous = __classPrivateFieldGet(this, _EmailProcessor_stats, "f")[EmailProcessingResult.AMBIGUOUS];
                    const cErrors = __classPrivateFieldGet(this, _EmailProcessor_stats, "f")[EmailProcessingResult.FAILURE] + __classPrivateFieldGet(this, _EmailProcessor_stats, "f")[EmailProcessingResult.UNSUPPORTED];
                    if (withNotification || cUpdated || cAmbiguous) {
                        toolbox.notify({
                            color: "gray",
                            message: `${total} emails from Email API were processed by Nomination Status History ` +
                                `(of which ${cUpdated} change(s), ${cUnchanged} unchanged, ${cSkipped} skipped, ` +
                                `${cAmbiguous} unmatched, and ${cErrors} error(s).`,
                        });
                    }
                    __classPrivateFieldGet(this, _EmailProcessor_dismissNotification, "f").call(this);
                    if (__classPrivateFieldGet(this, _EmailProcessor_errors, "f").length > 0 && config.get("askAboutCrashReports")) {
                        __classPrivateFieldGet(this, _EmailProcessor_instances, "m", _EmailProcessor_reportErrors).call(this);
                    }
                    logger.info("Email processor finalized.");
                }
            }
            _EmailProcessor_submissions = new WeakMap(), _EmailProcessor_statusHistoryMap = new WeakMap(), _EmailProcessor_alreadyProcessed = new WeakMap(), _EmailProcessor_stats = new WeakMap(), _EmailProcessor_errors = new WeakMap(), _EmailProcessor_dismissNotification = new WeakMap(), _EmailProcessor_instances = new WeakSet(), _EmailProcessor_mergeEmailChange = function _EmailProcessor_mergeEmailChange(id, change) {
                const storedHistory = __classPrivateFieldGet(this, _EmailProcessor_statusHistoryMap, "f")[id];
                const joined = [...change.updates, ...storedHistory];
                joined.sort((a, b) => a.timestamp - b.timestamp);
                __classPrivateFieldGet(this, _EmailProcessor_instances, "m", _EmailProcessor_deduplicateHistoryArray).call(this, joined);
                // It should not be possible for the stored history to have duplicates,
                // but this line of code exists because it did somehow happen to someone
                __classPrivateFieldGet(this, _EmailProcessor_instances, "m", _EmailProcessor_deduplicateHistoryArray).call(this, storedHistory);
                const diffs = [];
                if (storedHistory.length) {
                    for (let i = 0, j = 0; i < storedHistory.length && j < joined.length; i++, j++) {
                        while (storedHistory[i].status !== joined[j].status)
                            diffs.push({ ...joined[j++], previously: null });
                        if (storedHistory[i].timestamp !== joined[j].timestamp ||
                            !!storedHistory[i].verified !== !!joined[j].verified ||
                            storedHistory[i].email !== joined[j].email)
                            diffs.push({ ...joined[j], previously: storedHistory[i].timestamp });
                    }
                }
                else {
                    for (let j = 0; j < joined.length; j++) {
                        diffs.push({ ...joined[j++], previously: null });
                    }
                }
                if (diffs.length)
                    return { ...change, updates: joined, diffs };
                return null;
            }, _EmailProcessor_deduplicateHistoryArray = function _EmailProcessor_deduplicateHistoryArray(arr) {
                for (let i = arr.length - 2; i >= 0; i--) {
                    if (arr[i].status == arr[i + 1].status) {
                        // Duplicate status
                        const curDate = new Date(arr[i].timestamp);
                        if (!(curDate.getUTCMilliseconds() || curDate.getUTCSeconds() || curDate.getUTCMinutes() || curDate.getUTCHours())) {
                            // All of the above are 0 means this was with extreme likelihood a WFES import that is less accurate.
                            // Thus we keep the email date instead for this one even though it happened "in the future".
                            arr.splice(i, 1);
                        }
                        else {
                            arr.splice(i + 1, 1);
                        }
                    }
                }
            }, _EmailProcessor_importChangeIntoDatabase = async function _EmailProcessor_importChangeIntoDatabase(idb, id, statusHistory) {
                // Import changes to IDB
                try {
                    // Get existing from IDB (we can't store an "empty" object)
                    logger.debug(`Trying to get ${id} from database for merging`);
                    const stored = await idb.get(id);
                    logger.debug(`Success; putting ${id} back into database`);
                    idb.put({
                        ...stored,
                        statusHistory,
                    });
                }
                catch (ex) {
                    if (!(ex instanceof KeyNotFoundError)) {
                        throw ex;
                    }
                    logger.debug(`${id} did not exist in the database.`);
                }
                idb.commit();
            }, _EmailProcessor_reportErrors = function _EmailProcessor_reportErrors() {
                const errors = {
                    errors: __classPrivateFieldGet(this, _EmailProcessor_errors, "f"),
                    version: scriptInfo.version,
                };
                const stopAsking = () => config.set("askAboutCrashReports", false);
                const doSubmit = () => {
                    if (confirm("Thank you for helping further the development of the Nomination Status History plugin!\n\n" +
                        "The crash report contains a copy of the email(s) that resulted in parsing errors in the script. These emails may contain identifying information such as your username and email address. Error tracing information included with the report may also include a list of other Wayfarer userscripts you may be using.\n\n" +
                        "All data is sent directly to a server under the developer's control, and will be treated confidentially. Crash reports may be archived for future testing.\n\n" +
                        "Under the terms of the GDPR, you are entitled to a copy of your stored data, as well as deletion of said data, upon request. GDPR inquiries should be directed by email to post(at)varden(dot)info.\n\n" +
                        "Do you wish to continue?\n\n")) {
                        const xhr = new XMLHttpRequest();
                        xhr.open("POST", "https://api.varden.info/wft/nsh/submit-crash.php", true);
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.onload = () => alert(xhr.response);
                        xhr.send(JSON.stringify(errors));
                    }
                    else {
                        alert("Crash report has been discarded, and no data was submitted.");
                    }
                };
                const eNotify = document.createElement("div");
                makeChildNode(eNotify, "p", "Errors occurred during processing of some Wayfarer emails by Nomination Status History. Do you wish to report these errors to the script developer?");
                const anchorPara = makeChildNode(eNotify, "p");
                makeChildNode(anchorPara, "a", "Submit report").addEventListener("click", doSubmit);
                makeChildNode(anchorPara, "span", " - ");
                makeChildNode(anchorPara, "a", "No thanks");
                makeChildNode(anchorPara, "span", " - ");
                makeChildNode(anchorPara, "a", "Don't ask again").addEventListener("click", stopAsking);
                toolbox.notify({
                    color: "red",
                    message: eNotify,
                });
            };
            const handleNominations = async (result) => {
                latestSubmissions = result.submissions;
                changeCheckStarted = true;
                await checkNominationChanges(result.submissions);
                void importEmails(result.submissions);
            };
            let lastLoadSubmissions = [];
            let emailListenerAttached = false;
            const importEmails = async (submissions) => {
                logger.info("Starting to process stored emails for history events");
                const emailAPI = await toolbox.getAddonAPI("uwt-core").email();
                const start = Date.now();
                const epInstance = new EmailProcessor(submissions);
                await epInstance.prepare();
                {
                    const env_3 = { stack: [], error: void 0, hasError: false };
                    try {
                        logger.info("Opening history and email object stores");
                        const dbHistory = __addDisposableResource(env_3, await toolbox.openIDB("history", "readwrite"), false);
                        const dbEmails = __addDisposableResource(env_3, await toolbox.openIDB("emails", "readwrite"), false);
                        for await (const email of emailAPI.iterate()) {
                            await epInstance.import(email, dbHistory, dbEmails);
                        }
                        logger.info("Closing history and email object stores");
                    }
                    catch (e_3) {
                        env_3.error = e_3;
                        env_3.hasError = true;
                    }
                    finally {
                        __disposeResources(env_3);
                    }
                }
                epInstance.finalize(false);
                lastLoadSubmissions = submissions;
                if (!emailListenerAttached) {
                    attachEmailListener(emailAPI);
                    emailListenerAttached = true;
                }
                logger.info(`Imported stored history events from email cache in ${Date.now() - start} msec.`);
            };
            const attachEmailListener = (emailAPI) => {
                logger.info("Attaching Email API listener");
                emailAPI.listen(async () => {
                    logger.info("Email API listener was invoked");
                    const epInstance = new EmailProcessor(lastLoadSubmissions);
                    await epInstance.prepare();
                    return (async function* () {
                        {
                            const env_4 = { stack: [], error: void 0, hasError: false };
                            try {
                                logger.info("Opening history and email object stores within generator");
                                const dbHistory = __addDisposableResource(env_4, await toolbox.openIDB("history", "readwrite"), false);
                                const dbEmails = __addDisposableResource(env_4, await toolbox.openIDB("emails", "readwrite"), false);
                                logger.info("Yielding importer function from generator");
                                yield async (email) => {
                                    await epInstance.import(email, dbHistory, dbEmails);
                                };
                                logger.info("Generator import done; closing object stores");
                            }
                            catch (e_4) {
                                env_4.error = e_4;
                                env_4.hasError = true;
                            }
                            finally {
                                __disposeResources(env_4);
                            }
                        }
                        epInstance.finalize(true);
                    })();
                });
            };
            // ---- redesign: the Contribution Management page (app-submissions-list, the details pane and Angular's
            // internal data) the history dropdown was added to is gone. Tracking changes and processing emails
            // work as before; the history is now shown in a window opened with a button at the bottom left.
            const TYPE_LABELS = {
                [ContributionType.NOMINATION]: "Nomination",
                [ContributionType.PHOTO]: "Photo",
                [ContributionType.EDIT_LOCATION]: "Location edit",
                [ContributionType.EDIT_TITLE]: "Title edit",
                [ContributionType.EDIT_DESCRIPTION]: "Description edit",
            };
            let latestSubmissions = null;
            let changeCheckStarted = false;
            const describeEntry = (current, prevStatus) => {
                var _a;
                let statusText;
                if (current.status === "NOMINATED" && prevStatus !== null) {
                    statusText = prevStatus === "HELD" ? "Hold released" : "Returned to queue";
                }
                else {
                    statusText = (_a = STATE_MAP[current.status]) !== null && _a !== void 0 ? _a : "Unknown";
                }
                // Format the date as UTC as this is what Wayfarer uses to display the nomination date.
                // Maybe make this configurable to user's local time later?
                return { prefix: `${toUtcIsoDate(new Date(current.timestamp))} - `, statusText };
            };
            const renderHistory = (target, sub, saved) => {
                var _a, _b;
                const history = (_a = saved === null || saved === void 0 ? void 0 : saved.statusHistory) !== null && _a !== void 0 ? _a : [];
                // The initial nomination may not be stored in the IDB history, so it is a special case here.
                if (history.length === 0 || history[0].status !== ContributionStatus.NOMINATED) {
                    makeChildNode(target, "p", `${(_b = saved === null || saved === void 0 ? void 0 : saved.day) !== null && _b !== void 0 ? _b : sub.day} - Nominated`);
                }
                let previous = null;
                for (const entry of history) {
                    const { prefix, statusText } = describeEntry(entry, previous);
                    const line = makeChildNode(target, "p");
                    line.appendChild(document.createTextNode(prefix));
                    if (typeof entry.email !== "undefined") {
                        const aDisplay = makeChildNode(line, "a", statusText);
                        aDisplay.addEventListener("click", async () => {
                            const emailAPI = await toolbox.getAddonAPI("uwt-core").email();
                            const email = await emailAPI.get(entry.email);
                            email.display();
                        });
                    }
                    else {
                        line.appendChild(document.createTextNode(statusText));
                    }
                    if (entry.verified)
                        line.classList.add("uwtnsh-verified");
                    previous = entry.status;
                }
            };
            const openHistoryWindow = async () => {
                var _a, _b, _c, _d;
                const { container, dismiss } = await toolbox.createModal("uwtnsh-modal");
                if (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")) {
                    container.classList.add("uwt-dark");
                }
                const close = makeChildNode(container, "button", "\u00d7");
                close.className = "uwtnsh-x";
                close.addEventListener("click", dismiss);
                makeChildNode(container, "h2", "Contribution status history");
                const body = makeChildNode(container, "div");
                body.className = "uwtnsh-body";
                makeChildNode(body, "p", "Loading contributions...");
                let subs = latestSubmissions;
                if (subs === null) {
                    try {
                        const data = await toolbox.makeRequest("GET", "/api/v1/vault/manage");
                        if (data && data.submissions)
                            subs = data.submissions;
                    }
                    catch (e) {
                        logger.error(e);
                    }
                }
                if (subs === null) {
                    body.textContent = "Could not load your contributions.";
                    return;
                }
                // Don't read the history while the change detection (which writes to it) is still running.
                if (changeCheckStarted)
                    await untilTruthy(() => ready);
                let stored = {};
                {
                    const env_5 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_5, await toolbox.openIDB("history", "readonly"), false);
                        stored = indexToMap(await idb.getAll(), "id");
                    }
                    catch (e_5) {
                        env_5.error = e_5;
                        env_5.hasError = true;
                    }
                    finally {
                        __disposeResources(env_5);
                    }
                }
                body.innerHTML = "";
                const list = [...subs].sort((a, b) => b.order - a.order);
                if (list.length === 0) {
                    makeChildNode(body, "p", "You have no contributions yet.");
                    return;
                }
                const side = makeChildNode(body, "div");
                side.className = "uwtnsh-side";
                const search = makeChildNode(side, "input");
                search.type = "text";
                search.placeholder = "Search contributions";
                const listBox = makeChildNode(side, "div");
                listBox.className = "uwtnsh-list";
                const detail = makeChildNode(body, "div");
                detail.className = "uwtnsh-detail";
                const items = [];
                for (const sub of list) {
                    const title = sub.title || ((_a = sub.poiData) === null || _a === void 0 ? void 0 : _a.title) || "(untitled)";
                    const button = makeChildNode(listBox, "button");
                    button.className = "uwtnsh-item";
                    makeChildNode(button, "span", title);
                    makeChildNode(button, "small", `${(_b = TYPE_LABELS[sub.type]) !== null && _b !== void 0 ? _b : sub.type} - ${sub.day} - ${(_c = STATE_MAP[sub.status]) !== null && _c !== void 0 ? _c : sub.status}`);
                    button.addEventListener("click", () => {
                        var _a, _b;
                        for (const item of items)
                            item.button.classList.toggle("uwtnsh-active", item.button === button);
                        detail.innerHTML = "";
                        makeChildNode(detail, "h3", title);
                        makeChildNode(detail, "p", `${(_a = TYPE_LABELS[sub.type]) !== null && _a !== void 0 ? _a : sub.type} submitted ${sub.day}. Current status: ${(_b = STATE_MAP[sub.status]) !== null && _b !== void 0 ? _b : sub.status}`)
                            .classList.add("uwtnsh-summary");
                        renderHistory(makeChildNode(detail, "div"), sub, stored[sub.id]);
                    });
                    items.push({ button, text: `${title} ${sub.day} ${(_d = TYPE_LABELS[sub.type]) !== null && _d !== void 0 ? _d : ""}`.toLowerCase() });
                }
                search.addEventListener("input", () => {
                    const q = search.value.trim().toLowerCase();
                    for (const item of items)
                        item.button.style.display = item.text.includes(q) ? "" : "none";
                });
                items[0].button.click();
            };
            // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
            toolbox.addMenuItem("nomination-status-history", {
                label: "Contribution status history",
                icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"8\" y1=\"6\" x2=\"21\" y2=\"6\"/><line x1=\"8\" y1=\"12\" x2=\"21\" y2=\"12\"/><line x1=\"8\" y1=\"18\" x2=\"21\" y2=\"18\"/><line x1=\"3\" y1=\"6\" x2=\"3.01\" y2=\"6\"/><line x1=\"3\" y1=\"12\" x2=\"3.01\" y2=\"12\"/><line x1=\"3\" y1=\"18\" x2=\"3.01\" y2=\"18\"/></svg>",
                callback: () => { void openHistoryWindow(); },
            });
            const checkNominationChanges = async (submissions) => {
                const env_6 = { stack: [], error: void 0, hasError: false };
                try {
                    const start = Date.now();
                    const idb = __addDisposableResource(env_6, await toolbox.openIDB("history", "readwrite"), false);
                    idb.on("complete", () => {
                        logger.info(`Contribution changes processed in ${Date.now() - start} msec.`);
                        ready = true;
                    });
                    const saved = await idb.getAll();
                    const savedMap = indexToMap(saved, "id");
                    if (submissions.length < saved.length) {
                        toolbox.notify({
                            color: "red",
                            message: `${saved.length - submissions.length} of ${saved.length} contributions are missing!`,
                        });
                    }
                    const newCount = {
                        NOMINATION: 0,
                        EDIT_TITLE: 0,
                        EDIT_DESCRIPTION: 0,
                        EDIT_LOCATION: 0,
                        PHOTO: 0,
                    };
                    for (const nom of submissions) {
                        let history;
                        if (nom.id in savedMap) {
                            // Nomination ALREADY EXISTS in IDB
                            const saved = savedMap[nom.id];
                            history = saved.statusHistory;
                            const title = nom.title || (nom.type !== ContributionType.NOMINATION && nom.poiData.title) || "[Title]";
                            // Add upgrade change status if the nomination was upgraded.
                            if (nom.upgraded && !saved.upgraded) {
                                history.push({ timestamp: Date.now(), status: "UPGRADE" });
                                toolbox.notify({
                                    color: "blue",
                                    message: `${title} was upgraded!`,
                                    icon: createNotificationIcon(nom.type),
                                });
                            }
                            // Add status change if the current status is different to the stored one.
                            if (nom.status !== saved.status) {
                                history.push({ timestamp: Date.now(), status: nom.status });
                                // For most status updates, it's also desired to send a notification to the user.
                                if (nom.status !== "HELD" && !(nom.status === "NOMINATED" && saved.status === "HELD")) {
                                    const { message, color } = getStatusNotificationText(nom.status);
                                    toolbox.notify({
                                        color,
                                        message: title + message,
                                        icon: createNotificationIcon(nom.type),
                                    });
                                }
                            }
                        }
                        else {
                            // Nomination DOES NOT EXIST in IDB yet
                            newCount[nom.type]++;
                            history = [];
                            // Add current status to the history array if it isn't
                            // NOMINATED, which is the initial status
                            if (nom.status !== ContributionStatus.NOMINATED) {
                                history.push({ timestamp: Date.now(), status: nom.status });
                            }
                        }
                        // Filter out irrelevant fields that we don't need store.
                        // Only retain fields from FILTER_COLUMNS before we put it in IDB.
                        const toSave = {
                            ...filterObject(nom, FILTER_COLUMNS),
                            statusHistory: history,
                        };
                        if (nom.type !== ContributionType.NOMINATION) {
                            toSave.poiData = nom.poiData;
                        }
                        idb.put(toSave);
                    }
                    // Commit all changes.
                    idb.commit();
                    if (config.get("notifyNewContributions")) {
                        const messageTypeMapping = {
                            NOMINATION: (c) => `Found ${c} new nomination${c > 1 ? "s" : ""} in the list!`,
                            EDIT_TITLE: (c) => `Found ${c} new title edit${c > 1 ? "s" : ""} in the list!`,
                            EDIT_DESCRIPTION: (c) => `Found ${c} new description edit${c > 1 ? "s" : ""} in the list!`,
                            EDIT_LOCATION: (c) => `Found ${c} new location edit${c > 1 ? "s" : ""} in the list!`,
                            PHOTO: (c) => `Found ${c} new photo${c > 1 ? "s" : ""} in the list!`,
                        };
                        for (const [type, messageGenerator] of iterObject(messageTypeMapping)) {
                            if (newCount[type] > 0) {
                                const message = messageGenerator(newCount[type]);
                                toolbox.notify({
                                    color: "gray",
                                    message,
                                    icon: createNotificationIcon(type),
                                });
                            }
                        }
                    }
                }
                catch (e_6) {
                    env_6.error = e_6;
                    env_6.hasError = true;
                }
                finally {
                    __disposeResources(env_6);
                }
            };
            const getStatusNotificationText = (status) => {
                switch (status) {
                    case ContributionStatus.ACCEPTED: return {
                        color: "green",
                        message: " was accepted!",
                    };
                    // This is only generated when it used to have a status other than hold
                    case ContributionStatus.NOMINATED: return {
                        color: "brown",
                        message: " returned to the queue!",
                    };
                    case ContributionStatus.REJECTED: return {
                        color: "red",
                        message: " was rejected!",
                    };
                    case ContributionStatus.DUPLICATE: return {
                        color: "red",
                        message: " was rejected as duplicate!",
                    };
                    case ContributionStatus.VOTING: return {
                        color: "gold",
                        message: " entered voting!",
                    };
                    case ContributionStatus.NIANTIC_REVIEW: return {
                        color: "blue",
                        message: " went into Niantic review!",
                    };
                    case ContributionStatus.APPEALED: return {
                        color: "purple",
                        message: " was appealed!",
                    };
                    default: return {
                        color: "red",
                        message: `: unknown status: ${status}`,
                    };
                }
            };
            const createNotificationIcon = (type) => {
                switch (type) {
                    case ContributionType.NOMINATION:
                        return IconNomination;
                    case ContributionType.PHOTO:
                        return IconPhoto;
                    case ContributionType.EDIT_LOCATION:
                        return IconEditLocation;
                    case ContributionType.EDIT_TITLE:
                        return IconEditTitle;
                    case ContributionType.EDIT_DESCRIPTION:
                        return IconEditDescription;
                }
            };
            const simplePostHandler = (status) => async (request, response) => {
                if (response === "DONE") {
                    await addManualStatusChange(request.id, status);
                }
            };
            const addManualStatusChange = async (id, status, historyOnly = false, extras = {}) => {
                const env_7 = { stack: [], error: void 0, hasError: false };
                try {
                    const idb = __addDisposableResource(env_7, await toolbox.openIDB("history", "readwrite"), false);
                    const nom = await idb.get(id);
                    const history = nom.statusHistory;
                    const timestamp = Date.now();
                    const newStatus = historyOnly ? nom.status : status;
                    const newEntry = {
                        timestamp,
                        status,
                        // Verified, because we caught the reponse from the API that
                        // this event literally just happened right now
                        verified: true,
                    };
                    history.push(newEntry);
                    idb.put({
                        ...nom,
                        ...extras,
                        status: newStatus,
                        statusHistory: history,
                    });
                    idb.commit();
                }
                catch (e_7) {
                    env_7.error = e_7;
                    env_7.hasError = true;
                }
                finally {
                    __disposeResources(env_7);
                }
            };
            const importNSH = async () => {
                if (!confirm("Importing will overwrite all currently stored data, " +
                    "are you sure you want to clear your current nomination status history?"))
                    return;
                const contents = await readFile(".json", "application/json");
                const jsonData = JSON.parse(await contents.text());
                try {
                    const env_8 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_8, await toolbox.openIDB("history", "readwrite"), false);
                        await idb.clear();
                        idb.put(...jsonData);
                        idb.commit();
                    }
                    catch (e_8) {
                        env_8.error = e_8;
                        env_8.hasError = true;
                    }
                    finally {
                        __disposeResources(env_8);
                    }
                }
                catch (error) {
                    alert(`Failed to import data with error:\n${error}`);
                    location.reload();
                    return;
                }
                alert(`Cleared all saved review history.\nImported ${jsonData.length} status history item(s).`);
                location.reload();
            };
            if (config.get("showImportButton")) {
                toolbox.addImporter({
                    title: "Import Nomination Status History",
                    description: "Import data previously exported from Nomination Status History. Warning: This will overwrite all current data!",
                    callback: importNSH,
                    icon: ImportIcon,
                });
            }
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", handleNominations);
            toolbox.interceptSendJson("/api/v1/vault/manage/hold", simplePostHandler(ContributionStatus.HELD));
            toolbox.interceptSendJson("/api/v1/vault/manage/releasehold", simplePostHandler(ContributionStatus.NOMINATED));
            // TODO:
            // toolbox.interceptSendJson("/api/v1/vault/manage/withdraw", simplePostHandler(ContributionStatus.WITHDRAWN));
            toolbox.interceptSendJson("/api/v1/vault/manage/appeal", simplePostHandler(ContributionStatus.APPEALED));
        },
    });
};
class UnresolvableProcessingError extends Error {
    constructor(message) {
        super(message);
        this.name = "UnresolvableProcessingError";
    }
}
class NominationMatchingError extends UnresolvableProcessingError {
    constructor(message) {
        super(message);
        this.name = "NominationMatchingError";
    }
}
class AmbiguousRejectionError extends UnresolvableProcessingError {
    constructor(message) {
        super(message);
        this.name = "AmbiguousRejectionError";
    }
}
class EmailParsingError extends Error {
    constructor(message) {
        super(message);
        this.name = "EmailParsingError";
    }
}
class UnknownTemplateError extends EmailParsingError {
    constructor(message) {
        super(message);
        this.name = "UnknownTemplateError";
    }
}
class MissingDataError extends EmailParsingError {
    constructor(message) {
        super(message);
        this.name = "MissingDataError";
    }
}
const determineRejectType = (history, email) => {
    const [appealed] = history.filter(e => e.status === ContributionStatus.APPEALED);
    if (appealed) {
        const appealDate = new Date(appealed.timestamp);
        const emailDate = new Date(email.getFirstHeaderValue("Date"));
        // Niantic doesn't send the correct email when they reject something as duplicate on appeal.
        // We catch this here to prevent errors.
        if (appealDate < emailDate) {
            return determineAppealRejectType(history);
        }
    }
    for (const entry of history) {
        switch (entry.status) {
            case ContributionStatus.REJECTED:
            case ContributionStatus.DUPLICATE:
                return entry.status;
            case ContributionStatus.APPEALED:
                {
                    throw new AmbiguousRejectionError("This email was rejected because determining the former status of this nomination after " +
                        "appealing it is impossible if it was appealed prior to the installation of this script.");
                }
        }
    }
    throw new AmbiguousRejectionError("This email was rejected because it was not possible to determine how this nomination was " +
        "rejected (expected status REJECTED or DUPLICATE, but observed " +
        `${history[history.length - 1].status}).`);
};
const determineAppealRejectType = (history) => {
    const start = history.map(h => h.status).indexOf(ContributionStatus.APPEALED) + 1;
    for (let i = start; i < history.length; i++) {
        switch (history[i].status) {
            case ContributionStatus.REJECTED:
            case ContributionStatus.DUPLICATE:
                return history[i].status;
        }
    }
    {
        throw new AmbiguousRejectionError("This email was not processed because it was not possible to determine how Niantic rejected " +
            "the appeal (expected status REJECTED or DUPLICATE, but observed " +
            `${history[history.length - 1].status}).`);
    }
};
const MONTHS = {
    ENGLISH: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    BENGALI: ["জানু", "ফেব", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"],
    SPANISH: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"],
    FRENCH: ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"],
    HINDI: ["जन॰", "फ़र॰", "मार्च", "अप्रैल", "मई", "जून", "जुल॰", "अग॰", "सित॰", "अक्तू॰", "नव॰", "दिस॰"],
    ITALIAN: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
    DUTCH: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
    MARATHI: ["जाने", "फेब्रु", "मार्च", "एप्रि", "मे", "जून", "जुलै", "ऑग", "सप्टें", "ऑक्टो", "नोव्हें", "डिसें"],
    NORWEGIAN: ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"],
    POLISH: ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
    PORTUGUESE: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
    RUSSIAN: ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."],
    SWEDISH: ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
    TAMIL: ["ஜன.", "பிப்.", "மார்.", "ஏப்.", "மே", "ஜூன்", "ஜூலை", "ஆக.", "செப்.", "அக்.", "நவ.", "டிச."],
    TELUGU: ["జన", "ఫిబ్ర", "మార్చి", "ఏప్రి", "మే", "జూన్", "జులై", "ఆగ", "సెప్టెం", "అక్టో", "నవం", "డిసెం"],
    THAI: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
    NUMERIC: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    ZERO_PREFIXED: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
};
class ImageQuery {
}
Object.defineProperty(ImageQuery, "imageAny", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc) => { var _a; return (_a = doc.querySelector("img")) === null || _a === void 0 ? void 0 : _a.src; }
});
Object.defineProperty(ImageQuery, "imageAlt", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (alt) => (doc) => { var _a; return (_a = doc.querySelector(`img[alt='${alt}']`)) === null || _a === void 0 ? void 0 : _a.src; }
});
Object.defineProperty(ImageQuery, "imageLh3", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc) => {
        var _a, _b;
        return (_b = ((_a = doc.querySelector("img[src^='https://lh3.googleusercontent.com/']")) !== null && _a !== void 0 ? _a : doc.querySelector("img[src^='http://lh3.googleusercontent.com/']"))) === null || _b === void 0 ? void 0 : _b.src;
    }
});
Object.defineProperty(ImageQuery, "ingType1", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc) => { var _a, _b, _c; return (_c = (_b = (_a = doc.querySelector("h2 ~ p:last-of-type")) === null || _a === void 0 ? void 0 : _a.lastChild) === null || _b === void 0 ? void 0 : _b.textContent) === null || _c === void 0 ? void 0 : _c.trim(); }
});
Object.defineProperty(ImageQuery, "ingType2", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc) => { var _a; return (_a = doc.querySelector("h2 ~ p:last-of-type img")) === null || _a === void 0 ? void 0 : _a.src; }
});
Object.defineProperty(ImageQuery, "ingType3", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (status, regex, tooClose) => (doc, submissions, email) => {
        var _a;
        const match = email.getFirstHeaderValue("Subject").match(regex);
        if (match === null)
            throw new Error("Unable to extract the name of the Wayspot from this email.");
        const text = (_a = doc.querySelector("p")) === null || _a === void 0 ? void 0 : _a.textContent.trim();
        if (tooClose && (text === null || text === void 0 ? void 0 : text.includes(tooClose)))
            status = ContributionStatus.ACCEPTED;
        const candidates = submissions.filter(e => e.title == match.groups.title && e.status == status);
        if (!candidates.length)
            throw new NominationMatchingError(`Unable to find a nomination with status ${status} that matches the title "${match.groups.title}" on this Wayfarer account.`);
        if (candidates.length > 1)
            throw new NominationMatchingError(`Multiple nominations with status ${status} on this Wayfarer account match the title "${match.groups.title}" specified in the email.`);
        return candidates[0].imageUrl;
    }
});
Object.defineProperty(ImageQuery, "ingType4", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc, submissions) => {
        const query = doc.querySelector("h2 ~ p:last-of-type");
        if (!query)
            return;
        const [title, desc] = query.textContent.split("\n");
        if (!title || !desc)
            return;
        const candidates = submissions.filter(e => e.title == title);
        if (!candidates.length)
            throw new Error(`Unable to find a nomination that matches the title "${title}" on this Wayfarer account.`);
        if (candidates.length > 1) {
            const cand2 = candidates.filter(e => e.description == desc);
            if (!cand2.length)
                throw new NominationMatchingError(`Unable to find a nomination that matches the title "${title}" and description "${desc}" on this Wayfarer account.`);
            if (cand2.length > 1)
                throw new NominationMatchingError(`Multiple nominations on this Wayfarer account match the title "${title}" and description "${desc}" specified in the email.`);
            return cand2[0].imageUrl;
        }
        return candidates[0].imageUrl;
    }
});
Object.defineProperty(ImageQuery, "ingType5", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc, submissions, email) => {
        const a = doc.querySelector("a[href^=\"https://www.ingress.com/intel?ll=\"]");
        if (a === null)
            return;
        const match = a.href.match(/\?ll=(?<lat>-?\d{1,2}(\.\d{1,6})?),(?<lng>-?\d{1,3}(\.\d{1,6})?)/);
        if (match === null)
            return;
        const candidates = submissions.filter(e => e.lat == parseFloat(match.groups.lat) && e.lng == parseFloat(match.groups.lng));
        if (candidates.length != 1) {
            const m2 = email.getFirstHeaderValue("Subject").match(/^(Ingress Portal Live|Portal review complete): ?(?<title>.*)$/);
            if (m2 === null)
                throw new Error("Unable to extract the name of the Wayspot from this email.");
            const cand2 = (candidates.length ? candidates : submissions).filter(e => e.title == m2.groups.title);
            if (!cand2.length)
                throw new NominationMatchingError(`Unable to find a nomination that matches the title "${m2.groups.title}" or is located at ${match.groups.lat},${match.groups.lng} on this Wayfarer account.`);
            if (cand2.length > 1)
                throw new NominationMatchingError(`Multiple nominations on this Wayfarer account match the title "${m2.groups.title}" and/or are located at ${match.groups.lat},${match.groups.lng} as specified in the email.`);
            return cand2[0].imageUrl;
        }
        return candidates[0].imageUrl;
    }
});
Object.defineProperty(ImageQuery, "ingType6", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (regex) => (doc, submissions, email) => {
        const match = email.getFirstHeaderValue("Subject").match(regex);
        if (match === null)
            throw new Error("Unable to extract the name of the Wayspot from this email.");
        const date = new Date(email.getFirstHeaderValue("Date"));
        // Wayfarer is in UTC, but emails are in local time. Work around this by also matching against
        // the preceding and following dates from the one specified in the email.
        const dateCur = toUtcIsoDate(date);
        const dateNext = toUtcIsoDate(shiftDays(date, 1));
        const datePrev = toUtcIsoDate(shiftDays(date, -1));
        const dates = [datePrev, dateCur, dateNext];
        const candidates = submissions.filter(e => dates.includes(e.day) && e.title.trim() == match.groups.title);
        if (!candidates.length)
            throw new NominationMatchingError(`Unable to find a nomination that matches the title "${match.groups.title}" and submission date ${dateCur} on this Wayfarer account.`);
        if (candidates.length > 1)
            throw new NominationMatchingError(`Multiple nominations on this Wayfarer account match the title "${match.groups.title}" and submission date ${dateCur} specified in the email.`);
        return candidates[0].imageUrl;
    }
});
Object.defineProperty(ImageQuery, "pgoType1", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc) => { var _a, _b; return (_b = (_a = doc.querySelector("h2 ~ p:last-of-type")) === null || _a === void 0 ? void 0 : _a.previousElementSibling) === null || _b === void 0 ? void 0 : _b.textContent.trim(); }
});
Object.defineProperty(ImageQuery, "pgoType2", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc) => { var _a, _b, _c; return (_c = (_b = (_a = doc.querySelector("h2 ~ p:last-of-type")) === null || _a === void 0 ? void 0 : _a.previousElementSibling) === null || _b === void 0 ? void 0 : _b.querySelector("img")) === null || _c === void 0 ? void 0 : _c.src; }
});
Object.defineProperty(ImageQuery, "wfDecidedNomination", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (regex, monthNames) => (doc, submissions) => {
        var _a, _b, _c;
        const header = (_c = (_b = (doc.querySelector(".em_font_20") || ((_a = doc.querySelector(".em_org_u")) === null || _a === void 0 ? void 0 : _a.firstChild))) === null || _b === void 0 ? void 0 : _b.textContent) === null || _c === void 0 ? void 0 : _c.trim();
        let month = null;
        let match = null;
        for (let i = 0; i < monthNames.length; i++) {
            const months = monthNames[i];
            const mr = new RegExp(regex.source.split("(?<month>)").join(`(?<month>${months.join("|")})`));
            match = header === null || header === void 0 ? void 0 : header.match(mr);
            if (match) {
                month = months.indexOf(match.groups.month) + 1;
                break;
            }
        }
        if (!match || month === null)
            return;
        const date = `${match.groups.year}-${month.toString().padStart(2, "0")}-${match.groups.day.padStart(2, "0")}`;
        // Wayfarer is in UTC, but emails are in local time. Work around this by also matching against
        // the preceding and following dates from the one specified in the email.
        const dateNext = toUtcIsoDate(shiftDays(new Date(date), 1));
        const datePrev = toUtcIsoDate(shiftDays(new Date(date), -1));
        const dates = [datePrev, date, dateNext];
        const candidates = submissions.filter(e => dates.includes(e.day) &&
            (EmailAPI.stripDiacritics(e.title) == match.groups.title ||
                e.title == match.groups.title) &&
            [
                ContributionStatus.ACCEPTED,
                ContributionStatus.REJECTED,
                ContributionStatus.DUPLICATE,
                ContributionStatus.APPEALED,
                ContributionStatus.NIANTIC_REVIEW,
            ].includes(e.status));
        if (!candidates.length) {
            throw new NominationMatchingError(`Unable to find a nomination that matches the title "${match.groups.title}" ` +
                `and submission date ${date} on this Wayfarer account.`);
        }
        if (candidates.length > 1) {
            throw new NominationMatchingError(`Multiple nominations on this Wayfarer account match the title "${match.groups.title}" ` +
                `and submission date ${date} specified in the email.`);
        }
        return candidates[0].imageUrl;
    }
});
Object.defineProperty(ImageQuery, "ingPhoto1", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc) => {
        var _a, _b;
        const url = (_b = (_a = doc.querySelector("h2 ~ p:last-of-type")) === null || _a === void 0 ? void 0 : _a.childNodes[2].textContent) === null || _b === void 0 ? void 0 : _b.trim();
        if (url === null || url === void 0 ? void 0 : url.match(/^https?:\/\/lh3.googleusercontent.com\//))
            return url;
    }
});
Object.defineProperty(ImageQuery, "ingPhoto2", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (status, dateRegex, monthNames) => (doc, submissions) => {
        var _a, _b, _c, _d;
        const title = (_b = (_a = doc.querySelector("h2")) === null || _a === void 0 ? void 0 : _a.textContent.trim().split("\n")[1]) === null || _b === void 0 ? void 0 : _b.trim();
        const dateText = (_d = (_c = doc.querySelector("table.container:last-of-type th p:last-of-type")) === null || _c === void 0 ? void 0 : _c.textContent.trim().split("\n")[1]) === null || _d === void 0 ? void 0 : _d.trim();
        let month = null;
        let dateMatch = null;
        for (let i = 0; i < monthNames.length; i++) {
            const months = monthNames[i];
            const mr = new RegExp(dateRegex.source.split("(?<month>)").join(`(?<month>${months.join("|")})`));
            dateMatch = dateText === null || dateText === void 0 ? void 0 : dateText.match(mr);
            if (dateMatch) {
                month = months.indexOf(dateMatch.groups.month) + 1;
                break;
            }
        }
        if (!dateMatch || month === null)
            return;
        const date = `${dateMatch.groups.year}-${month.toString().padStart(2, "0")}-${dateMatch.groups.day.padStart(2, "0")}`;
        // Wayfarer is in UTC, but emails are in local time. Work around this by also matching against
        // the preceding and following dates from the one specified in the email.
        const dateNext = toUtcIsoDate(shiftDays(new Date(date), 1));
        const datePrev = toUtcIsoDate(shiftDays(new Date(date), -1));
        const dates = [datePrev, date, dateNext];
        const candidates = submissions.filter(e => dates.includes(e.day) && e.poiData.title.trim() === title && e.status === status);
        if (!candidates.length)
            throw new NominationMatchingError(`Unable to find a photo that matches the Wayspot title "${title}" and submission date ${date} on this Wayfarer account.`);
        if (candidates.length > 1)
            throw new NominationMatchingError(`Multiple photos on this Wayfarer account match the Wayspot title "${title}" and submission date ${date} specified in the email.`);
        return candidates[0].imageUrl;
    }
});
Object.defineProperty(ImageQuery, "pgoPhotoDecided1", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (status, titleRegex, dateRegex, monthNames) => (doc, submissions) => {
        var _a, _b, _c;
        const text = (_b = (_a = doc.querySelector(".em_green")) === null || _a === void 0 ? void 0 : _a.textContent.split("\n")[0]) === null || _b === void 0 ? void 0 : _b.replace(/\s+/g, " ").trim();
        const titleMatch = text === null || text === void 0 ? void 0 : text.match(titleRegex);
        if (!titleMatch)
            throw new Error("Unable to extract the name of the Wayspot from this email.");
        const dateText = (_c = doc.querySelectorAll(".em_defaultlink")[2]) === null || _c === void 0 ? void 0 : _c.textContent.trim();
        let month = null;
        let dateMatch = null;
        for (let i = 0; i < monthNames.length; i++) {
            const months = monthNames[i];
            const mr = new RegExp(dateRegex.source.split("(?<month>)").join(`(?<month>${months.join("|")})`));
            dateMatch = dateText === null || dateText === void 0 ? void 0 : dateText.match(mr);
            if (dateMatch) {
                month = months.indexOf(dateMatch.groups.month) + 1;
                break;
            }
        }
        if (!dateMatch || month === null)
            return;
        const date = `${dateMatch.groups.year}-${month.toString().padStart(2, "0")}-${dateMatch.groups.day.padStart(2, "0")}`;
        // Wayfarer is in UTC, but emails are in local time. Work around this by also matching against
        // the preceding and following dates from the one specified in the email.
        const dateNext = toUtcIsoDate(shiftDays(new Date(date), 1));
        const datePrev = toUtcIsoDate(shiftDays(new Date(date), -1));
        const dates = [datePrev, date, dateNext];
        const candidates = submissions.filter(e => dates.includes(e.day) && e.poiData.title.trim() === titleMatch.groups.title && e.status === status);
        if (!candidates.length)
            throw new NominationMatchingError(`Unable to find a photo that matches the Wayspot title "${titleMatch.groups.title}" and submission date ${date} on this Wayfarer account.`);
        if (candidates.length > 1)
            throw new NominationMatchingError(`Multiple photos on this Wayfarer account match the Wayspot title "${titleMatch.groups.title}" and submission date ${date} specified in the email.`);
        return candidates[0].imageUrl;
    }
});
Object.defineProperty(ImageQuery, "pgoPhotoTextUrl", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: () => (doc) => {
        var _a, _b;
        const url = (_b = (_a = doc.querySelector("tr:nth-child(10)")) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim();
        if (url === null || url === void 0 ? void 0 : url.match(/^https?:\/\/lh3.googleusercontent.com\//))
            return url;
    }
});
class StatusQuery {
}
Object.defineProperty(StatusQuery, "wfDecided", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (acceptText, rejectText) => (doc, history, email) => {
        var _a, _b, _c;
        const text = (_c = (_b = (_a = doc.querySelector(".em_font_20")) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.nextElementSibling) === null || _c === void 0 ? void 0 : _c.textContent.replace(/\s+/g, " ").trim();
        if (acceptText && (text === null || text === void 0 ? void 0 : text.includes(acceptText)))
            return ContributionStatus.ACCEPTED;
        if (rejectText && (text === null || text === void 0 ? void 0 : text.includes(rejectText)))
            return determineRejectType(history, email);
    }
});
Object.defineProperty(StatusQuery, "wfDecidedNia", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (acceptText, rejectText) => (doc, history, email) => {
        var _a;
        const text = (_a = doc.querySelector(".em_org_u")) === null || _a === void 0 ? void 0 : _a.textContent.replace(/\s+/g, " ").trim();
        if (acceptText && (text === null || text === void 0 ? void 0 : text.includes(acceptText)))
            return ContributionStatus.ACCEPTED;
        if (rejectText && (text === null || text === void 0 ? void 0 : text.includes(rejectText)))
            return determineRejectType(history, email);
    }
});
Object.defineProperty(StatusQuery, "wfDecidedNia2", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (acceptText, rejectText) => (doc, history, email) => {
        var _a, _b;
        const text = (_b = (_a = doc.querySelector(".em_font_20")) === null || _a === void 0 ? void 0 : _a.textContent.split("\n")[2]) === null || _b === void 0 ? void 0 : _b.replace(/\s+/g, " ").trim();
        if (acceptText && (text === null || text === void 0 ? void 0 : text.includes(acceptText)))
            return ContributionStatus.ACCEPTED;
        if (rejectText && (text === null || text === void 0 ? void 0 : text.includes(rejectText)))
            return determineRejectType(history, email);
    }
});
Object.defineProperty(StatusQuery, "wfAppealDecided", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (acceptText, rejectText) => (doc, history) => {
        var _a, _b, _c;
        const text = (_c = (_b = (_a = doc.querySelector(".em_font_20")) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.nextElementSibling) === null || _c === void 0 ? void 0 : _c.textContent.replace(/\s+/g, " ").trim();
        if (acceptText && (text === null || text === void 0 ? void 0 : text.includes(acceptText)))
            return ContributionStatus.ACCEPTED;
        if (rejectText && (text === null || text === void 0 ? void 0 : text.includes(rejectText)))
            return determineAppealRejectType(history);
    }
});
Object.defineProperty(StatusQuery, "ingDecided", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (acceptText1, acceptText2, rejectText, dupText1, tooCloseText, dupText2) => (doc) => {
        var _a;
        const text = (_a = (doc.querySelector("h2 + p") || doc.querySelector("p"))) === null || _a === void 0 ? void 0 : _a.textContent.trim();
        if (acceptText1 && (text === null || text === void 0 ? void 0 : text.startsWith(acceptText1)))
            return ContributionStatus.ACCEPTED;
        if (acceptText2 && (text === null || text === void 0 ? void 0 : text.startsWith(acceptText2)))
            return ContributionStatus.ACCEPTED;
        if (rejectText && (text === null || text === void 0 ? void 0 : text.includes(rejectText)))
            return ContributionStatus.REJECTED;
        if (dupText1 && (text === null || text === void 0 ? void 0 : text.includes(dupText1)))
            return ContributionStatus.DUPLICATE;
        if (tooCloseText && (text === null || text === void 0 ? void 0 : text.includes(tooCloseText)))
            return ContributionStatus.ACCEPTED;
        const query2 = doc.querySelector("p:nth-child(2)");
        if (query2 && dupText2 && query2.textContent.trim().includes(dupText2))
            return ContributionStatus.DUPLICATE;
    }
});
Object.defineProperty(StatusQuery, "wfDecidedPhoto", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: (acceptText, rejectText) => (doc) => {
        var _a;
        const text = (_a = doc.querySelector("tr:nth-child(4) .em_org_u")) === null || _a === void 0 ? void 0 : _a.textContent.replace(/\s+/g, " ").trim();
        if (acceptText && (text === null || text === void 0 ? void 0 : text.includes(acceptText)))
            return ContributionStatus.ACCEPTED;
        if (rejectText && (text === null || text === void 0 ? void 0 : text.includes(rejectText)))
            return ContributionStatus.REJECTED;
    }
});
const processEmail = (logger, email, submissions, history) => {
    var _a, _b;
    let change = null;
    let id = null;
    let returnStatus = EmailProcessingResult.SUCCESS;
    let reason = null;
    let except = null;
    try {
        const emlClass = email.classify();
        if (!SUPPORTED_EMAIL_TYPES.includes(emlClass.type) || emlClass.style === EmailStyle.LIGHTSHIP) {
            returnStatus = EmailProcessingResult.SKIPPED;
            reason = ("This email is either for a type of contribution that is not trackable in Wayfarer, " +
                "or for content that is unrelated to Wayfarer.");
        }
        else {
            const doc = email.getDocument();
            if (doc === null) {
                throw new EmailParsingError("Email does not have a text/html alternative");
            }
            // TODO: Edits/photos
            let template = null;
            if ((emlClass.type === EmailType.NOMINATION_RECEIVED) &&
                (emlClass.style === EmailStyle.WAYFARER)) {
                template = {
                    type: emlClass.type,
                    status: [() => ContributionStatus.NOMINATED],
                    image: [ImageQuery.imageAlt("Submission Photo")],
                };
            }
            else if ((emlClass.type === EmailType.NOMINATION_APPEAL_RECEIVED) &&
                (emlClass.style === EmailStyle.WAYFARER)) {
                template = {
                    type: emlClass.type,
                    status: [() => ContributionStatus.APPEALED],
                    image: [ImageQuery.imageAlt("Submission Photo")],
                };
            }
            else if ((emlClass.type === EmailType.PHOTO_RECEIVED) &&
                (emlClass.style === EmailStyle.WAYFARER)) {
                template = {
                    type: emlClass.type,
                    status: [() => ContributionStatus.NOMINATED],
                    image: [ImageQuery.imageLh3()],
                };
            }
            else {
                const subject = email.getFirstHeaderValue("Subject");
                for (const parser of EMAIL_PARSERS) {
                    if (emlClass.type === parser.type && subject.match(parser.subject)) {
                        template = parser;
                    }
                }
            }
            if (template === null) {
                throw new UnknownTemplateError("This email does not appear to match any styles of Niantic " +
                    "emails currently known to Nomination Status History.");
            }
            // TODO: Edit/photo handling
            let sub = null;
            switch (template.type) {
                case EmailType.NOMINATION_APPEAL_DECIDED:
                case EmailType.NOMINATION_APPEAL_RECEIVED:
                case EmailType.NOMINATION_DECIDED:
                case EmailType.NOMINATION_RECEIVED:
                    sub = processNominationEmail(doc, submissions.filter(s => s.type === ContributionType.NOMINATION), email, template);
                    break;
                case EmailType.PHOTO_DECIDED:
                case EmailType.PHOTO_RECEIVED:
                    sub = processPhotoEmail(doc, submissions.filter(s => s.type === ContributionType.PHOTO), email, template);
                    break;
                default:
                    throw new UnknownTemplateError("Failed to find a valid contribution resolver function!");
            }
            let status = null;
            for (const sr of template.status) {
                status = (_b = sr(doc, (_a = history[sub.id]) !== null && _a !== void 0 ? _a : [], email)) !== null && _b !== void 0 ? _b : null;
                if (status !== null)
                    break;
            }
            if (status === null) {
                throw new MissingDataError("Unable to determine the status change that this email represents.");
            }
            change = {
                type: sub.type,
                title: sub.title,
                updates: [{
                        timestamp: new Date(email.getFirstHeaderValue("Date")).getTime(),
                        verified: true,
                        email: email.messageID,
                        status,
                    }],
            };
            id = sub.id;
        }
    }
    catch (e) {
        except = e;
        if (e instanceof UnresolvableProcessingError) {
            logger.warn(e);
            returnStatus = EmailProcessingResult.AMBIGUOUS;
        }
        else if (e instanceof EmailParsingError) {
            logger.error(e, email);
            returnStatus = EmailProcessingResult.UNSUPPORTED;
        }
        else {
            logger.error(e, email);
            returnStatus = EmailProcessingResult.FAILURE;
        }
        reason = except.message;
    }
    return {
        status: returnStatus,
        reason,
        change,
        id,
        error: except,
    };
};
const processNominationEmail = (doc, nominations, email, template) => {
    var _a;
    let url = null;
    for (const ir of template.image) {
        url = (_a = ir(doc, nominations, email)) !== null && _a !== void 0 ? _a : null;
        if (url !== null) {
            const match = url.match(/^https?:\/\/lh3.googleusercontent.com\/(.*)$/);
            if (!match)
                url = null;
            else
                url = match[1];
        }
        if (url !== null)
            break;
    }
    if (url === null) {
        throw new MissingDataError("Could not determine which nomination this email references.");
    }
    const [nom] = nominations.filter(n => n.imageUrl.endsWith(`/${url}`));
    if (!nom) {
        throw new NominationMatchingError("The nomination that this email refers to cannot be found " +
            `on this Wayfarer account (failed to match LH3 URL ${url}).`);
    }
    return nom;
};
const processPhotoEmail = (doc, photos, email, template) => {
    var _a;
    let url = null;
    for (const ir of template.image) {
        url = (_a = ir(doc, photos, email)) !== null && _a !== void 0 ? _a : null;
        if (url !== null) {
            const match = url.match(/^https?:\/\/lh3.googleusercontent.com\/(.*)$/);
            if (!match)
                url = null;
            else
                url = match[1];
        }
        if (url !== null)
            break;
    }
    if (url === null) {
        throw new MissingDataError("Could not determine which photo submission this email references.");
    }
    const [nom] = photos.filter(n => n.imageUrl.endsWith(`/${url}`));
    if (!nom) {
        throw new NominationMatchingError("The photo submission that this email refers to cannot be found " +
            `on this Wayfarer account (failed to match LH3 URL ${url}).`);
    }
    return nom;
};
const EMAIL_PARSERS = [
    //  ---------------------------------------- ENGLISH [en] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Niantic Wayspot nomination decided for/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("has decided to accept your Wayspot nomination.", "has decided not to accept your Wayspot nomination."),
            StatusQuery.wfDecidedNia("Congratulations, our team has decided to accept your Wayspot nomination", "did not meet the criteria required to be accepted and has been rejected"),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Thank you for your Wayspot nomination (?<title>.*) on (?<month>) (?<day>\d+), (?<year>\d+)!$/, [MONTHS.ENGLISH]),
            ImageQuery.wfDecidedNomination(/^Thank you for taking the time to nominate (?<title>.*) on (?<month>) (?<day>\d+), (?<year>\d+)\./, [MONTHS.ENGLISH]),
        ],
    },
    {
        // Nomination decided (Wayfarer, NIA)
        subject: /^Decision on your? Wayfarer Nomination,/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecidedNia(undefined, // Accepted - this email template was never used for acceptances
            "did not meet the criteria required to be accepted and has been rejected"),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Thank you for taking the time to nominate (?<title>.*) on (?<month>) (?<day>\d+), (?<year>\d+)\./, [MONTHS.ENGLISH]),
        ],
    },
    {
        // Appeal decided
        subject: /^Your Niantic Wayspot appeal has been decided for/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        status: [
            StatusQuery.wfAppealDecided("Niantic has decided that your nomination should be added as a Wayspot", "Niantic has decided that your nomination should not be added as a Wayspot"),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Thank you for your Wayspot nomination appeal for (?<title>.*) on (?<month>) (?<day>\d+), (?<year>\d+).$/, [MONTHS.ENGLISH]),
        ],
    },
    {
        // Photo decided (Wayfarer)
        subject: /^Niantic Wayspot media submission decided for/,
        type: EmailType.PHOTO_DECIDED,
        status: [
            StatusQuery.wfDecidedPhoto("has decided to accept your Wayspot Photo submission.", "has decided not to accept your Wayspot Photo submission."),
        ],
        image: [
            ImageQuery.imageLh3(),
        ],
    },
    {
        // Nomination received (Ingress)
        subject: /^Portal submission confirmation:/,
        type: EmailType.NOMINATION_RECEIVED,
        status: [() => ContributionStatus.NOMINATED],
        image: [
            ImageQuery.imageAlt("Nomination Photo"),
            ImageQuery.ingType1(),
            ImageQuery.ingType6(/^Portal submission confirmation: (?<title>.*)$/),
        ],
    },
    {
        // Nomination decided (Ingress)
        subject: /^Portal review complete:/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.ingDecided("Good work, Agent:", "Excellent work, Agent.", "we have decided not to accept this candidate.", "your candidate is a duplicate of an existing Portal.", "this candidate is too close to an existing Portal", "Your candidate is a duplicate of either an existing Portal"),
        ],
        image: [
            ImageQuery.imageAlt("Nomination Photo"),
            ImageQuery.ingType1(),
            ImageQuery.ingType2(),
            ImageQuery.ingType5(),
            ImageQuery.ingType4(),
        ],
    },
    {
        // Photo received (Ingress)
        subject: /^Portal photo submission confirmation$/,
        type: EmailType.PHOTO_RECEIVED,
        status: [() => ContributionStatus.NOMINATED],
        image: [
            ImageQuery.ingPhoto1(),
            ImageQuery.imageLh3(),
        ],
    },
    {
        // Photo decided (Ingress)
        subject: /^Portal photo review complete/,
        type: EmailType.PHOTO_DECIDED,
        status: [
            StatusQuery.ingDecided("Good work, Agent:", undefined, "decided not to accept it at this time"),
        ],
        image: [
            ImageQuery.ingPhoto1(),
            ImageQuery.imageLh3(),
            ImageQuery.ingPhoto2(ContributionStatus.REJECTED, /^(?<month>) (?<day>\d+), (?<year>\d+)$/, [MONTHS.ENGLISH]),
        ],
    },
    {
        // Nomination received (Ingress Redacted)
        subject: /^Ingress Portal Submitted:/,
        type: EmailType.NOMINATION_RECEIVED,
        status: [() => ContributionStatus.NOMINATED],
        image: [
            ImageQuery.ingType6(/^Ingress Portal Submitted: (?<title>.*)$/),
        ],
    },
    {
        // Nomination duplicated (Ingress Redacted)
        subject: /^Ingress Portal Duplicate:/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.DUPLICATE],
        image: [
            ImageQuery.ingType3(ContributionStatus.DUPLICATE, /^Ingress Portal Duplicate: (?<title>.*)$/),
        ],
    },
    {
        // Nomination accepted (Ingress Redacted)
        subject: /^Ingress Portal Live:/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.ACCEPTED],
        image: [
            ImageQuery.ingType5(),
        ],
    },
    {
        // Nomination rejected (Ingress Redacted)
        subject: /^Ingress Portal Rejected:/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.REJECTED],
        image: [
            ImageQuery.ingType3(ContributionStatus.REJECTED, /^Ingress Portal Rejected: (?<title>.*)$/, "Unfortunately, this Portal is too close to another existing Portal"),
        ],
    },
    {
        // Nomination received (PoGo)
        subject: /^Trainer [^:]+: Thank You for Nominating a PokéStop for Review.$/,
        type: EmailType.NOMINATION_RECEIVED,
        status: [() => ContributionStatus.NOMINATED],
        image: [
            ImageQuery.pgoType1(),
        ],
    },
    {
        // Nomination accepted (PoGo)
        subject: /^Trainer [^:]+: Your PokéStop Nomination Is Eligible!$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.ACCEPTED],
        image: [
            ImageQuery.pgoType1(),
            ImageQuery.pgoType2(),
        ],
    },
    {
        // Nomination rejected (PoGo)
        subject: /^Trainer [^:]+: Your PokéStop Nomination Is Ineligible$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.REJECTED],
        image: [
            ImageQuery.pgoType1(),
            ImageQuery.pgoType2(),
        ],
    },
    {
        // Nomination duplicated (PoGo)
        subject: /^Trainer [^:]+: Your PokéStop Nomination Review Is Complete:/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.DUPLICATE],
        image: [
            ImageQuery.pgoType1(),
            ImageQuery.pgoType2(),
        ],
    },
    {
        // Photo received (PoGo)
        subject: /^Photo Submission Received$/,
        type: EmailType.PHOTO_RECEIVED,
        status: [() => ContributionStatus.NOMINATED],
        image: [
            ImageQuery.pgoPhotoTextUrl(),
        ],
    },
    {
        // Photo accepted (PoGo)
        subject: /^Photo Submission Accepted$/,
        type: EmailType.PHOTO_DECIDED,
        status: [() => ContributionStatus.ACCEPTED],
        image: [
            ImageQuery.pgoPhotoTextUrl(),
        ],
    },
    {
        // Photo rejected (PoGo)
        subject: /^Photo Submission Rejected$/,
        type: EmailType.PHOTO_DECIDED,
        status: [() => ContributionStatus.REJECTED],
        image: [
            ImageQuery.pgoPhotoDecided1(ContributionStatus.REJECTED, /^Photo review complete: (?<title>.*)$/, /^Submission Date: (?<month>) (?<day>\d+), (?<year>\d+)$/, [MONTHS.ENGLISH]),
        ],
    },
    //  ---------------------------------------- BENGALI [bn] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /-এর জন্য Niantic Wayspot মনোনয়নের সিদ্ধান্ত নেওয়া হয়েছে/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("অনুসারে আপনার Wayspot মনোনয়ন স্বীকার করতে চানদ", "অনুসারে আপনার Wayspot মনোনয়ন স্বীকার করতে স্বীকার করতে চান না"),
            StatusQuery.wfDecidedNia2("অভিনন্দন, আমাদের দল আপনার Wayspot-এর মনোনয়ন গ্রহণ করার সিদ্ধান্ত নিয়েছেন।", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^(?<month>) (?<day>\d+), (?<year>\d+)-এ আপনার Wayspot মনোনয়ন (?<title>.*) করার জন্য আপনাকে ধন্যবাদ জানাই!$/, [MONTHS.ENGLISH, MONTHS.BENGALI]),
            ImageQuery.wfDecidedNomination(/^(?<title>.*)-কে(?<day>\d+) (?<month>), (?<year>\d+) -তে মনোয়ন করতে সময় দেওয়ার জন্য আপনাকে ধন্যবাদ।/, [MONTHS.BENGALI]),
        ],
    },
    //  ---------------------------------------- CZECH [cs] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Rozhodnutí o nominaci na Niantic Wayspot pro/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("se rozhodla přijmout vaši nominaci na Wayspot", "se rozhodla nepřijmout vaši nominaci na Wayspot"),
            StatusQuery.wfDecidedNia("Gratulujeme, náš tým se rozhodl vaši nominaci na Wayspot přijmout.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^děkujeme za vaši nominaci na Wayspot (?<title>.*) ze dne (?<day>\d+)\. ?(?<month>)\. ?(?<year>\d+)!$/, [MONTHS.NUMERIC]),
            ImageQuery.wfDecidedNomination(/^děkujeme za vaši nominaci (?<title>.*) ze dne (?<day>\d+)\. ?(?<month>)\. ?(?<year>\d+)\./, [MONTHS.NUMERIC]),
        ],
    },
    {
        // Appeal decided
        subject: /^Rozhodnutí o odvolání proti nominaci na Niantic Wayspot pro/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        status: [
            StatusQuery.wfAppealDecided("Niantic se rozhodla, že vaše nominace ACCEPT by měla/by neměla být přidána jako Wayspot", "Niantic se rozhodla, že vaše nominace REJECT by měla/by neměla být přidána jako Wayspot"),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^děkujeme za vaše odvolání proti odmítnutí nominace na Wayspot (?<title>.*) ze dne (?<day>\d+)\. (?<month>)\. (?<year>\d+)\.$/, [MONTHS.NUMERIC]),
        ],
    },
    //  ---------------------------------------- GERMAN [de] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Entscheidung zum Wayspot-Vorschlag/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("hat entschieden, deinen Wayspot-Vorschlag zu akzeptieren.", "hat entschieden, deinen Wayspot-Vorschlag nicht zu akzeptieren."),
            StatusQuery.wfDecidedNia2("Glückwunsch, unser Team hat entschieden, deinen Wayspot-Vorschlag zu akzeptieren.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^danke, dass du den Wayspot-Vorschlag (?<title>.*) am (?<day>\d+)\.(?<month>)\.(?<year>\d+) eingereicht hast\.$/, [MONTHS.ZERO_PREFIXED]),
            ImageQuery.wfDecidedNomination(/^Danke, dass du dir die Zeit genommen hast, (?<title>.*) am (?<day>\d+)\.(?<month>)\.(?<year>\d+) vorzuschlagen\./, [MONTHS.ZERO_PREFIXED]),
        ],
    },
    {
        // Appeal decided
        subject: /^Entscheidung zum Einspruch für den Wayspot/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        status: [
            StatusQuery.wfAppealDecided("Niantic hat entschieden, dass dein Vorschlag ein Wayspot werden sollte.", "Niantic hat entschieden, dass dein Vorschlag kein Wayspot werden sollte."),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^danke, dass du am (?<day>\d+)\.(?<month>)\.(?<year>\d+) einen Einspruch für den Wayspot (?<title>.*) eingereicht hast.$/, [MONTHS.ZERO_PREFIXED]),
        ],
    },
    {
        // Nomination received (Ingress)
        subject: /^Empfangsbestätigung deines eingereichten Portalvorschlags:/,
        type: EmailType.NOMINATION_RECEIVED,
        status: [() => ContributionStatus.NOMINATED],
        image: [
            ImageQuery.imageAlt("Nomination Photo"),
            ImageQuery.ingType1(),
        ],
    },
    {
        // Nomination decided (Ingress)
        subject: /^Überprüfung des Portals abgeschlossen:/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.ingDecided("Gute Arbeit, Agent!", "Hervorragende Arbeit, Agent.", "konnten wir deinen Vorschlag jedoch nicht annehmen.", "Leider ist dieses Portal bereits vorhanden", undefined),
        ],
        image: [
            ImageQuery.imageAlt("Nomination Photo"),
            ImageQuery.ingType1(),
            ImageQuery.ingType2(),
        ],
    },
    {
        // Nomination received (PoGo)
        subject: /^Trainer [^:]+: Danke, dass du einen PokéStop zur Überprüfung vorgeschlagen hast$/,
        type: EmailType.NOMINATION_RECEIVED,
        status: [() => ContributionStatus.NOMINATED],
        image: [
            ImageQuery.pgoType1(),
        ],
    },
    {
        // Nomination accepted (PoGo)
        subject: /^Trainer [^:]+: Dein vorgeschlagener PokéStop ist zulässig!$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.ACCEPTED],
        image: [
            ImageQuery.pgoType1(),
            ImageQuery.pgoType2(),
        ],
    },
    {
        // Nomination rejected (PoGo)
        subject: /^Trainer [^:]+: Dein vorgeschlagener PokéStop ist nicht zulässig$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.REJECTED],
        image: [
            ImageQuery.pgoType1(),
            ImageQuery.pgoType2(),
        ],
    },
    {
        // Nomination duplicated (PoGo)
        subject: /^Trainer [^:]+: Die Prüfung deines PokéStop-Vorschlags wurde abgeschlossen:/,
        type: EmailType.NOMINATION_DECIDED,
        status: [() => ContributionStatus.DUPLICATE],
        image: [
            ImageQuery.pgoType1(),
            ImageQuery.pgoType2(),
        ],
    },
    //  ---------------------------------------- SPANISH [es] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Decisión tomada sobre la propuesta de Wayspot de Niantic/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("ha decidido aceptartu propuesta de Wayspot.", "ha decidido no aceptar tu propuesta de Wayspot."),
            StatusQuery.wfDecidedNia2("Enhorabuena, nuestro equipo ha decidido aceptar tu propuesta de Wayspot.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^¡Gracias por tu propuesta de Wayspot (?<title>.*) enviada el (?<day>\d+)[- ](?<month>)(-|\. )(?<year>\d+)!$/, [MONTHS.SPANISH]),
            ImageQuery.wfDecidedNomination(/^Gracias por dedicar algo de tiempo para realizar tu propuesta de (?<title>.*) el (?<day>\d+) (?<month>)\. (?<year>\d+)\./, [MONTHS.SPANISH]),
        ],
    },
    //  ---------------------------------------- FRENCH [fr] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Résultat concernant la proposition du Wayspot Niantic/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("a décidé d’accepter votre proposition de Wayspot.", "a décidé de ne pas accepter votre proposition de Wayspot."),
            StatusQuery.wfDecidedNia2("Félicitations, notre équipe a décidé d’accepter votre proposition de Wayspot.", "Malheureusement, l’équipe a décidé de ne pas accepter votre proposition de Wayspot."),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Merci pour votre proposition de Wayspot (?<title>.*) le (?<day>\d+) (?<month>)\.? (?<year>\d+)\u2009!$/, [MONTHS.FRENCH]),
            ImageQuery.wfDecidedNomination(/^Merci d’avoir pris le temps de nous envoyer votre proposition (?<title>.*) le (?<day>\d+) (?<month>)\. (?<year>\d+)\./, [MONTHS.FRENCH]),
        ],
    },
    //  ---------------------------------------- HINDI [hi] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Niantic Wayspot का नामांकन .* के लिए तय किया गया$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("ने को आपके Wayspot नामांकन को स्वीकार करने का निर्णय लिया है", "ने को आपके Wayspot नामांकन को अस्वीकार करने का निर्णय लिया है"),
            StatusQuery.wfDecidedNia2("बधाई हो, हमारी टीम ने आपके Wayspot नामांकन को मंज़ूरी दे दी है.", "खेद है कि हमारी टीम ने आपका Wayspot नामांकन नामंज़ूर कर दिया है."),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^(?<month>) (?<day>\d+), (?<year>\d+) पर Wayspot नामांकन (?<title>.*) के लिए धन्यवाद!$/, [MONTHS.ENGLISH, MONTHS.HINDI]),
            ImageQuery.wfDecidedNomination(/^(?<day>\d+) (?<month>) (?<year>\d+) पर Wayspot नामांकन (?<title>.*) के लिए धन्यवाद!$/, [MONTHS.ENGLISH, MONTHS.HINDI]),
            ImageQuery.wfDecidedNomination(/^(?<day>\d+) (?<month>) (?<year>\d+) को (?<title>.*) {2}के नामांकन के लिए आपने समय निकाला, उसके लिए आपका धन्यवाद\./, [MONTHS.HINDI]),
        ],
    },
    //  ---------------------------------------- ITALIAN [it] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Proposta di Niantic Wayspot decisa per/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("Congratulazioni, la tua proposta di Wayspot è stata accettata", "Sfortunatamente, la tua proposta di Wayspot è stata respinta"),
            StatusQuery.wfDecidedNia2("Congratulazioni, il nostro team ha deciso di accettare la tua proposta di Wayspot.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Grazie per la proposta di Wayspot (?<title>.*) in data (?<day>\d+)[ -](?<month>)[ -](?<year>\d+)\.$/, [MONTHS.ITALIAN]),
            ImageQuery.wfDecidedNomination(/^grazie per aver trovato il tempo di inviare la tua proposta (?<title>.*) in data (?<day>\d+) (?<month>) (?<year>\d+)\./, [MONTHS.ITALIAN]),
        ],
    },
    //  ---------------------------------------- JAPANESE [ja] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Niantic Wayspotの申請「.*」が決定しました。$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("コミュニティはあなたのWayspot候補を承認しました。", "不幸にも コミュニティはあなたのWayspot候補を承認しませんでした。"),
            StatusQuery.wfDecidedNia2("チームでの検討の結果、あなたのお送りいただいたWayspot候補が採用されましたので、お知らせいたします。", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^(?<year>\d+)\/(?<month>)\/(?<day>\d+)にWayspot申請「(?<title>.*)」をご提出いただき、ありがとうございました。$/, [MONTHS.ZERO_PREFIXED]),
            ImageQuery.wfDecidedNomination(/^(?<year>\d+)\/(?<month>)\/(?<day>\d+)に「(?<title>.*)」を候補としてお送りいただき、ありがとうございました。/, [MONTHS.ZERO_PREFIXED]),
        ],
    },
    {
        // Appeal decided
        subject: /^Niantic Wayspot「.*」に関する申し立てが決定しました。$/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        status: [
            StatusQuery.wfAppealDecided("Nianticはあなたが申請された候補をWayspotに追加する定しました。", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^(?<year>\d+)\/(?<month>)\/(?<day>\d+)にWayspot「(?<title>.*)」に関する申し立てをご提出いただき、ありがとうございました。$/, [MONTHS.ZERO_PREFIXED]),
        ],
    },
    //  ---------------------------------------- KOREAN [ko] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /에 대한 Niantic Wayspot 후보 결정이 완료됨$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("제안한 Wayspot 후보를 승인했습니다", "제안한 Wayspot 후보를 승인하지않았습니다 ."),
            StatusQuery.wfDecidedNia2("축하합니다, 귀하께서 추천하신 Wayspot 후보가 승인되었습니다.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^(?<year>\d+)\. (?<month>)\. (?<day>\d+)\.?에 Wayspot 후보 (?<title>.*)을\(를\) 제출해 주셔서 감사드립니다!$/, [MONTHS.NUMERIC]),
            ImageQuery.wfDecidedNomination(/^(?<year>\d+)\. (?<month>)\. (?<day>\d+)\.?에 시간을 내어 (?<title>.*) \(을\)를 추천해 주셔서 감사합니다\./, [MONTHS.NUMERIC]),
        ],
    },
    //  ---------------------------------------- MARATHI [mr] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Niantic वेस्पॉट नामांकन .* साठी निश्चित केले$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("तुमचे Wayspot नामांकन स्वीकारण्याचा निर्णय घेतला आहे", "तुमचे Wayspot नामांकन न स्वीकारण्याचा निर्णय घेतला आहे"),
            StatusQuery.wfDecidedNia2("अभिनंदन, आमच्या टीमने तुमचे Wayspot नामांकन स्वीकारण्याचा निर्णय घेतला आहे.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^तुमच्या (?<month>) (?<day>\d+), (?<year>\d+) रोजी वेस्पॉट नामांकन (?<title>.*) साठी धन्यवाद!$/, [MONTHS.ENGLISH]),
            ImageQuery.wfDecidedNomination(/^तुमच्या (?<day>\d+) (?<month>), (?<year>\d+) रोजी वेस्पॉट नामांकन (?<title>.*) साठी धन्यवाद!$/, [MONTHS.MARATHI]),
            ImageQuery.wfDecidedNomination(/^(?<day>\d+) (?<month>), (?<year>\d+) तारखेला (?<title>.*) {2}वर नामांकन करण्यासाठी वेळ दिल्याबद्दल धन्यवाद\./, [MONTHS.MARATHI]),
        ],
    },
    {
        // Appeal decided
        subject: /^तुमचे Niantic वेस्पॉट आवाहन .* साठी निश्चित करण्यात आले आहे$/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        status: [
            StatusQuery.wfAppealDecided("Niantic ने ठरवले आहे की तुमचे नामांकन ACCEPT वेस्पॉट म्हणून जोडले जाऊ नये/नसावे", "Niantic ने ठरवले आहे की तुमचे नामांकन REJECT वेस्पॉट म्हणून जोडले जाऊ नये/नसावे"),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^(?<month>) (?<day>\d+), (?<year>\d+) रोजी (?<title>.*) साठी तुमच्या वेस्पॉट नामांकन आवाहनाबद्दल धन्यवाद.$/, [MONTHS.ENGLISH, MONTHS.MARATHI]),
            ImageQuery.wfDecidedNomination(/^(?<day>\d+) (?<month>), (?<year>\d+) रोजी (?<title>.*) साठी तुमच्या वेस्पॉट नामांकन आवाहनाबद्दल धन्यवाद.$/, [MONTHS.ENGLISH, MONTHS.MARATHI]),
        ],
    },
    //  ---------------------------------------- DUTCH [nl] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Besluit over Niantic Wayspot-nominatie voor/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("heeft besloten om je Wayspot-nominatie wel te accepteren.", "heeft besloten om je Wayspot-nominatie niet te accepteren."),
            StatusQuery.wfDecidedNia2("Gefeliciteerd, ons team heeft besloten je Wayspot-nominatie te accepteren.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Bedankt voor je Wayspot-nominatie (?<title>.*) op (?<day>\d+)[- ](?<month>)(-|\. )(?<year>\d+)!$/, [MONTHS.DUTCH]),
            ImageQuery.wfDecidedNomination(/^Bedankt dat je de tijd hebt genomen om (?<title>.*) te nomineren op (?<day>\d+) (?<month>)\. (?<year>\d+)\./, [MONTHS.DUTCH]),
        ],
    },
    //  ---------------------------------------- NORWEGIAN [no] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^En avgjørelse er tatt for Niantic Wayspot-nominasjonen for/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("har valgt å godta Wayspot-nominasjonen din.", "har valgt å avvise Wayspot-nominasjonen din."),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Takk for Wayspot-nominasjonen (?<title>.*), som du sendte inn (?<day>\d+)\.(?<month>)\.(?<year>\d+)!$/, [MONTHS.NORWEGIAN]),
        ],
    },
    {
        // Appeal decided
        subject: /^En avgjørelse er tatt for Niantic Wayspot-klagen for/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        status: [
            StatusQuery.wfAppealDecided("Niantic har valgt å legge til nominasjonen som en Wayspot", "Niantic har valgt ikke legge til nominasjonen som en Wayspot"),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Takk for klagen i forbindelse med Wayspot-nominasjonen (?<title>.*), som du sendte inn (?<day>\d+)\.(?<month>)\.(?<year>\d+).$/, [MONTHS.NORWEGIAN]),
        ],
    },
    //  ---------------------------------------- POLISH [pl] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Podjęto decyzję na temat nominacji Wayspotu/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("zdecydowała zaakceptować nominacji Wayspotu.", "zdecydowała nie przyjąć nominacji Wayspotu."),
            StatusQuery.wfDecidedNia2("Gratulację, nasz zespół zaakceptował Twoją nominację Punktu trasy.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Dziękujemy za nominowanie Wayspotu „(?<title>.*)” (?<year>\d+)-(?<month>)-(?<day>\d+).$/, [MONTHS.ZERO_PREFIXED, MONTHS.POLISH]),
            ImageQuery.wfDecidedNomination(/^Dziękujemy za nominowanie Wayspotu „(?<title>.*)” (?<day>\d+) (?<month>) (?<year>\d+).$/, [MONTHS.POLISH]),
            ImageQuery.wfDecidedNomination(/^Dziękujemy za poświęcenie czasu na przesłanie nominacji (?<title>.*) {2}(?<day>\d+) (?<month>) (?<year>\d+)\./, [MONTHS.POLISH]),
        ],
    },
    //  ---------------------------------------- PORTUGUESE [pt] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Decisão sobre a indicação do Niantic Wayspot/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("a comunidade decidiu aceitar a sua indicação de Wayspot.", "a comunidade decidiu recusar a sua indicação de Wayspot."),
            StatusQuery.wfDecidedNia2("Parabéns! Nossa equipe aceitou sua indicação de Wayspot.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Agradecemos a sua indicação do Wayspot (?<title>.*) em (?<day>\d+)(\/| de )(?<month>)(\/| de )(?<year>\d+).$/, [MONTHS.PORTUGUESE]),
            ImageQuery.wfDecidedNomination(/^Agradecemos por indicar (?<title>.*) em (?<day>\d+) de (?<month>) de (?<year>\d+)\./, [MONTHS.PORTUGUESE]),
        ],
    },
    //  ---------------------------------------- RUSSIAN [ru] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Вынесено решение по номинации Niantic Wayspot для/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("решило принять вашу номинацию Wayspot.", "решило отклонить вашу номинацию Wayspot."),
            StatusQuery.wfDecidedNia2("Поздравляем, наша команда решила принять вашу номинацию Wayspot.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Благодарим за то, что отправили номинацию Wayfarer (?<title>.*) (?<day>\d+)[. ](?<month>)[. ](?<year>\d+)( г)?!$/, [MONTHS.ZERO_PREFIXED, MONTHS.RUSSIAN]),
            ImageQuery.wfDecidedNomination(/^Благодарим вас за то, что нашли время выдвинуть номинацию (?<title>.*) {2}(?<day>\d+) (?<month>) (?<year>\d+) г\./, [MONTHS.RUSSIAN]),
        ],
    },
    //  ---------------------------------------- SWEDISH [sv] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^Niantic Wayspot-nominering har beslutats om för/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("har beslutat att accepteradin Wayspot-nominering.", "har beslutat att inte acceptera din Wayspot-nominering."),
            StatusQuery.wfDecidedNia2("Grattis, vårt team har beslutat att acceptera din Wayspot-nominering.", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Tack för din Wayspot-nominering (?<title>.*) den (?<year>\d+)-(?<month>)-(?<day>\d+)!$/, [MONTHS.SWEDISH]),
            ImageQuery.wfDecidedNomination(/^Tack för din Wayspot-nominering (?<title>.*) den (?<day>\d+) (?<month>)\. (?<year>\d+)!$/, [MONTHS.SWEDISH]),
            ImageQuery.wfDecidedNomination(/^Tack för att du tog dig tiden att nominera (?<title>.*) den (?<day>\d+) (?<month>)\. (?<year>\d+)\./, [MONTHS.SWEDISH]),
        ],
    },
    {
        // Appeal decided
        subject: /^Din Niantic Wayspot-överklagan har beslutats om för/,
        type: EmailType.NOMINATION_APPEAL_DECIDED,
        status: [
            StatusQuery.wfAppealDecided("Niantic har beslutat att din nominering ACCEPT ska/inte ska läggas till som en Wayspot", "Niantic har beslutat att din nominering REJECT ska/inte ska läggas till som en Wayspot"),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^Tack för överklagan för din Wayspot-nominering för (?<title>.*) den (?<year>\d+)-(?<month>)-(?<day>\d+)\.$/, [MONTHS.SWEDISH]),
            ImageQuery.wfDecidedNomination(/^Tack för överklagan för din Wayspot-nominering för (?<title>.*) den (?<day>\d+) (?<month>)\. (?<year>\d+)\.$/, [MONTHS.SWEDISH]),
        ],
    },
    //  ---------------------------------------- TAMIL [ta] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /-க்கான Niantic Wayspot பணிந்துரை பரிசீலிக்கப்பட்டது.$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("உங்கள் Wayspot பரிந்துரையை ஏற்றுக்கொள்வதாக முடிவு செய்திருக்கிறது", "உங்கள் Wayspot பரிந்துரையை நிராகரிப்பதாக முடிவு செய்திருக்கிறது"),
            StatusQuery.wfDecidedNia("did not meet the criteria required to be accepted and has been rejected", // Actually acceptance, bugged template
            undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^நாளது தேதியில் (?<month>) (?<day>\d+), (?<year>\d+), (?<title>.*) -க்கான Wayspot பரிந்துரைக்கு நன்றி!$/, [MONTHS.ENGLISH]),
            ImageQuery.wfDecidedNomination(/^நாளது தேதியில் (?<day>\d+) (?<month>), (?<year>\d+), (?<title>.*) -க்கான Wayspot பரிந்துரைக்கு நன்றி!$/, [MONTHS.TAMIL]),
            ImageQuery.wfDecidedNomination(/^Thank you for taking the time to nominate (?<title>.*) on (?<day>\d+) (?<month>), (?<year>\d+)\./, [MONTHS.TAMIL]),
        ],
    },
    //  ---------------------------------------- TELUGU [te] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /కొరకు Niantic వేస్పాట్ నామినేషన్‌‌పై నిర్ణయం$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("మీ వేస్పాట్ నామినేషన్‌ను అంగీకరించడానికి ఉండటానికి", undefined),
            StatusQuery.wfDecidedNia2("శుభాకాంక్షలు, మీ Wayspot నామినేషన్‌ ఆమోదించాలని మా టీమ్ నిర్ణయించింది", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^(?<month>) (?<day>\d+), (?<year>\d+) తేదీన మీరు అందించిన వేస్పాట్ నామినేషన్ (?<title>.*) ను బట్టి ధన్యవాదాలు!$/, [MONTHS.ENGLISH]),
            ImageQuery.wfDecidedNomination(/^(?<day>\d+) (?<month>), (?<year>\d+) తేదీన మీరు అందించిన వేస్పాట్ నామినేషన్ (?<title>.*) ను బట్టి ధన్యవాదాలు!$/, [MONTHS.TELUGU]),
            ImageQuery.wfDecidedNomination(/^నామినేట్ చేయడానికి సమయం వెచ్చించినందుకు ధన్యవాదాలు (?<title>.*) on (?<day>\d+) (?<month>), (?<year>\d+)\./, [MONTHS.TELUGU]),
        ],
    },
    //  ---------------------------------------- THAI [th] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^ผลการตัดสินการเสนอสถานที่ Niantic Wayspot สำหรับ/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("ชุมชนได้ตัดสินใจ ยอมรับ Wayspot ของคุณ", "ชุมชนได้ตัดสินใจ ไม่ยอมรับการ Wayspot ของคุณ"),
            StatusQuery.wfDecidedNia2("ขอแสดงความยินดีด้วย ทีมงานของเราได้ตัดสินใจยอมรับการเสนอ Wayspot ของคุณแล้ว", "ขออภัย ทีมงานของเราได้ตัดสินใจที่จะไม่ยอมรับการเสนอ Wayspot ของคุณ"),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^ขอบคุณสำหรับการเสนอสถานที่ Wayspot ของคุณ เรื่อง (?<title>.*) เมื่อวันที่ (?<day>\d+) (?<month>) (?<year>\d+)!$/, [MONTHS.THAI]),
            ImageQuery.wfDecidedNomination(/^ขอบคุณที่สละเวลาเสนอ (?<title>.*) ในวันที่ (?<day>\d+) (?<month>) (?<year>\d+)/, [MONTHS.THAI]),
        ],
    },
    //  ---------------------------------------- CHINESE [zh] ----------------------------------------
    {
        // Nomination decided (Wayfarer)
        subject: /^社群已對 Niantic Wayspot 候選 .* 做出決定$/,
        type: EmailType.NOMINATION_DECIDED,
        status: [
            StatusQuery.wfDecided("社群已決定 接受 Wayspot 候選地。", "社群已決定 不接受你的 Wayspot 候選地。"),
            StatusQuery.wfDecidedNia2("您的Wayspot提名地點已通過團隊審查，在此誠摯恭喜您！", undefined),
        ],
        image: [
            ImageQuery.wfDecidedNomination(/^感謝你在 (?<year>\d+)-(?<month>)-(?<day>\d+) 提交 Wayspot 候選 (?<title>.*)！$/, [MONTHS.NUMERIC]),
            ImageQuery.wfDecidedNomination(/^感謝你在 (?<year>\d+)年(?<month>)月(?<day>\d+)日 提交 Wayspot 候選 (?<title>.*)！$/, [MONTHS.NUMERIC]),
            ImageQuery.wfDecidedNomination(/^感謝您於(?<year>\d+)年(?<month>)月(?<day>\d+)日提交提名地點：(?<title>.*)。 為了構築獨一無二的AR世界地圖，並且打造所有人都能身歷其境的冒險體驗，像您這樣的探索者是不可或缺的關鍵之一。/, [MONTHS.NUMERIC]),
        ],
    },
];// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var reviewMapMods = () => {
    register()({
        id: "review-map-mods",
        name: "Review Map Mods",
        authors: ["tehstone", "bilde2910"],
        description: "Add map mods to the Wayfarer Review Page",
        defaultConfig: {
            display: "map",
            renderCloseCircle: true,
            renderMoveCircle: true,
            s2Grid1Enabled: true,
            s2Grid1Color: "#FF0000",
            s2Grid1Level: 17,
            s2Grid1Opacity: 1,
            s2Grid1Thickness: 1,
            s2Grid2Enabled: true,
            s2Grid2Color: "#0000FF",
            s2Grid2Level: 14,
            s2Grid2Opacity: 1,
            s2Grid2Thickness: 2,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("display", {
                label: "Default map view",
                editor: new SelectBoxEditor({
                    map: "Map",
                    satellite: "Satellite",
                    streetview: "Street View",
                }),
            });
            config.setUserEditable("renderCloseCircle", {
                label: "Render minimum Powerspot proximity circle",
                help: "New Powerspots will not show up if they are within 22 meters of another Wayspot. Enabling this will make Review Map Mods draw a blue circle around the proposed location that corresponds to this minimum distance.",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("renderMoveCircle", {
                label: "Render minimum move distance circle",
                help: "If a new Wayspot is misplaced, you can move it during review, but only if the new location is more than 2 meters away from the submitter's proposal. Enable this option to make Review Map Mods draw a red circle to highlight this movement deadzone when suggesting a new location for the Wayspot.",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("s2Grid1Enabled", {
                label: "Primary S2 cell grid enabled",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("s2Grid1Level", {
                label: "Primary S2 cell grid level",
                editor: new NumericInputEditor({ min: 0, max: 20 }),
            });
            config.setUserEditable("s2Grid1Color", {
                label: "Primary S2 cell grid color",
                editor: new ColorInputEditor(),
            });
            config.setUserEditable("s2Grid1Opacity", {
                label: "Primary S2 cell grid opacity",
                editor: new NumericInputEditor({ min: 0, max: 1, step: 0.01 }),
            });
            config.setUserEditable("s2Grid1Thickness", {
                label: "Primary S2 cell grid thickness",
                editor: new NumericInputEditor({ min: 0 }),
            });
            config.setUserEditable("s2Grid2Enabled", {
                label: "Secondary S2 cell grid enabled",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("s2Grid2Level", {
                label: "Secondary S2 cell grid level",
                editor: new NumericInputEditor({ min: 0, max: 20 }),
            });
            config.setUserEditable("s2Grid2Color", {
                label: "Secondary S2 cell grid color",
                editor: new ColorInputEditor(),
            });
            config.setUserEditable("s2Grid2Opacity", {
                label: "Secondary S2 cell grid opacity",
                editor: new NumericInputEditor({ min: 0, max: 1, step: 0.01 }),
            });
            config.setUserEditable("s2Grid2Thickness", {
                label: "Secondary S2 cell grid thickness",
                editor: new NumericInputEditor({ min: 0 }),
            });
            // ---- redesign: Wayfarer's review pages are React now. The Google Map is read from the
            // map container's React fiber (the same way Map Mods does it); the Angular internals this
            // addon used (__ngContext__, nia-map, marker drag hooks) no longer exist.
            let pano = null;
            let rmmToken = 0;
            const rmm = { circles: [], overlay: null, idleListener: null, mapDiv: null, watcher: null };
            const pdoc = () => uwtPageWin.document;
            const rmmFindFiber = (el) => {
                const key = Object.getOwnPropertyNames(el || {}).find(k => k.startsWith("__reactFiber$"));
                return key ? el[key] : null;
            };
            const rmmRef = (ref) => (ref && typeof ref === "object" && "current" in ref) ? ref.current : null;
            const rmmLooksLikeMap = (v) => !!(v && typeof v.getCenter === "function" && typeof v.addListener === "function" && typeof v.getDiv === "function");
            const rmmResolveMap = (container) => {
                let fiber = rmmFindFiber(container);
                for (let depth = 0; fiber && depth < 16; depth++, fiber = fiber.return) {
                    const candidates = [
                        rmmRef(fiber.ref),
                        rmmRef(fiber.memoizedProps && fiber.memoizedProps.ref),
                        rmmRef(fiber.alternate && fiber.alternate.ref),
                        rmmRef(fiber.alternate && fiber.alternate.memoizedProps && fiber.alternate.memoizedProps.ref),
                    ];
                    const handle = candidates.find(h => !!h && typeof h.getMap === "function");
                    if (handle) {
                        const m = handle.getMap();
                        return rmmLooksLikeMap(m) ? m : null;
                    }
                }
                return null;
            };
            // Tried in order. Edit reviews: the location edit card's map, then the "live map" slot (the one Open In
            // places its buttons below), then any map in the edit flow.
            const rmmSelectors = {
                NEW: [uwtReviewMapSelectors.NEW],
                EDIT: [
                    "[data-testid=\"review-edit-flow\"] .wf-review-card--map [data-testid=\"base-map-container\"]",
                    uwtReviewMapSelectors.EDIT,
                    "[data-testid=\"review-edit-flow\"] [data-testid=\"base-map-container\"]",
                ],
            };
            const rmmFindMapNow = (type) => {
                const list = rmmSelectors[type];
                for (let i = 0; i < list.length; i++) {
                    const container = pdoc().querySelector(list[i]);
                    if (container) {
                        const map = rmmResolveMap(container);
                        if (map)
                            return { container, map, selectorIndex: i };
                    }
                }
                return null;
            };
            const rmmWaitForMap = async (type) => {
                for (let i = 0; i < 120; i++) { // about 30 seconds
                    const found = rmmFindMapNow(type);
                    if (found)
                        return found;
                    await new Promise(r => setTimeout(r, 250));
                }
                return null;
            };
            const unloadPano = () => {
                if (pano !== null) {
                    // Street View panorama must be unloaded to avoid it remaining alive in the background
                    // after each review is submitted (browser memory / tab crashes).
                    try {
                        pano.setVisible(false);
                    }
                    catch ( /* ignore */_a) { /* ignore */ }
                    pano = null;
                }
            };
            // the map object is reused between reviews, so everything drawn is removed first
            const rmmCleanup = () => {
                for (const c of rmm.circles) {
                    try {
                        c.setMap(null);
                    }
                    catch ( /* ignore */_a) { /* ignore */ }
                }
                rmm.circles = [];
                if (rmm.overlay) {
                    rmm.overlay.polyLines.forEach(l => { try {
                        l.setMap(null);
                    }
                    catch ( /* ignore */_a) { /* ignore */ } });
                    rmm.overlay.polyLines = [];
                    rmm.overlay = null;
                }
                if (rmm.idleListener) {
                    try {
                        rmm.idleListener.remove();
                    }
                    catch ( /* ignore */_b) { /* ignore */ }
                    rmm.idleListener = null;
                }
                if (rmm.watcher !== null) {
                    window.clearInterval(rmm.watcher);
                    rmm.watcher = null;
                }
                rmm.mapDiv = null;
                for (const el of pdoc().querySelectorAll(".uwtrmm-warning-box, .uwtrmm-close-warning"))
                    el.remove();
                unloadPano();
            };
            const drawCircle = (map, ll, color, radius) => {
                const G = uwtGoogle();
                const c = new G.maps.Circle({
                    map,
                    center: new G.maps.LatLng(ll.lat, ll.lng),
                    radius,
                    strokeColor: color,
                    fillColor: color,
                    strokeOpacity: 0.8,
                    strokeWeight: 1,
                    fillOpacity: 0.2,
                    clickable: false,
                });
                rmm.circles.push(c);
                return c;
            };
            const bearing = (from, to) => {
                const rad = (x) => x * Math.PI / 180;
                const y = Math.sin(rad(to.lng() - from.lng())) * Math.cos(rad(to.lat()));
                const x = Math.cos(rad(from.lat())) * Math.sin(rad(to.lat())) -
                    Math.sin(rad(from.lat())) * Math.cos(rad(to.lat())) * Math.cos(rad(to.lng() - from.lng()));
                return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
            };
            const insertBeforeMapBox = (container, node) => {
                const box = container.closest("[data-testid=\"base-map-root\"]") || container;
                box.parentElement.insertBefore(node, box);
            };
            const modifyNewReviewMap = async (container, map, candidate) => {
                logger.info("Modifying new review map");
                const G = uwtGoogle();
                const nomLocation = new G.maps.LatLng(candidate.lat, candidate.lng);
                map.setZoom(17);
                map.setCenter(nomLocation);
                const displayType = config.get("display");
                if (displayType === "satellite") {
                    // hybrid includes labels as well as satellite imagery
                    map.setMapTypeId("hybrid");
                }
                else if (displayType === "streetview") {
                    // do this here as well as a fallback if no SV image available
                    map.setMapTypeId("hybrid");
                    const sv = map.getStreetView();
                    sv.setOptions({
                        motionTracking: false,
                        imageDateControl: true,
                    });
                    const svClient = new G.maps.StreetViewService;
                    try {
                        const result = await svClient.getPanorama({ location: nomLocation, radius: 50 });
                        const svLocation = result.data.location.latLng;
                        const heading = bearing(svLocation, nomLocation);
                        pano = sv;
                        logger.info(`Setting Street View POV heading to ${heading}`);
                        pano.setPov({ heading, pitch: 0 });
                        pano.setPosition(svLocation);
                        pano.setVisible(true);
                    }
                    catch (_a) {
                        const warningBox = document.createElement("p");
                        warningBox.classList.add("uwtrmm-warning-box");
                        warningBox.textContent = "No Street View found within a close radius";
                        insertBeforeMapBox(container, warningBox);
                    }
                }
            };
            const addMapMods = async (candidate) => {
                // Every new review invalidates the previous one, also reviews that get no map mods: a skipped review does not
                // submit anything, and the map object is reused, so its grid and circles (and a wait for its map that is
                // still running) must not carry over to this review.
                const myToken = ++rmmToken;
                rmmCleanup();
                if (candidate.type !== "NEW" && !(candidate.type === "EDIT" && candidate.locationEdits && candidate.locationEdits.length > 0))
                    return;
                for (let i = 0; i < 100 && !(uwtPageWin.google && uwtPageWin.google.maps); i++) {
                    await new Promise(r => setTimeout(r, 200));
                }
                if (!(uwtPageWin.google && uwtPageWin.google.maps)) {
                    logger.warn("Google Maps never became available; Review Map Mods skipped");
                    return;
                }
                const found = await rmmWaitForMap(candidate.type);
                if (!found) {
                    logger.warn("Could not find the review map (no map container with a React map handle)");
                    return;
                }
                if (myToken !== rmmToken)
                    return; // a newer review has started
                const { container, map, selectorIndex } = found;
                logger.info(`Review Map Mods: found the ${candidate.type} review map (selector ${selectorIndex + 1} of ${rmmSelectors[candidate.type].length})`);
                rmmCleanup();
                rmm.mapDiv = map.getDiv();
                if (candidate.type === "NEW")
                    await modifyNewReviewMap(container, map, candidate);
                if (myToken !== rmmToken)
                    return;
                const grids = [];
                if (config.get("s2Grid1Enabled"))
                    grids.push({
                        level: config.get("s2Grid1Level"),
                        color: config.get("s2Grid1Color"),
                        opacity: config.get("s2Grid1Opacity"),
                        thickness: config.get("s2Grid1Thickness"),
                    });
                if (config.get("s2Grid2Enabled"))
                    grids.push({
                        level: config.get("s2Grid2Level"),
                        color: config.get("s2Grid2Color"),
                        opacity: config.get("s2Grid2Opacity"),
                        thickness: config.get("s2Grid2Thickness"),
                    });
                if (grids.length) {
                    const overlay = new S2Overlay();
                    grids.sort((x, y) => y.level - x.level);
                    for (const grid of grids)
                        await overlay.drawCellGrid(map, grid);
                    if (myToken !== rmmToken) {
                        overlay.polyLines.forEach(l => l.setMap(null));
                        return;
                    }
                    rmm.overlay = overlay;
                    rmm.idleListener = map.addListener("idle", async () => {
                        await overlay.updateGrid(map, grids);
                    });
                }
                // The page may create a new map object while the review is open (for example when it switches between
                // steps of an edit review). The one we decorated is then gone, so apply everything again to the new one.
                rmm.watcher = window.setInterval(() => {
                    if (myToken !== rmmToken)
                        return;
                    const live = rmmFindMapNow(candidate.type);
                    if (live && rmm.mapDiv && live.map.getDiv() !== rmm.mapDiv) {
                        logger.info("Review Map Mods: the review map was re-created; applying the mods again");
                        void addMapMods(candidate);
                    }
                }, 1500);
                if (Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng)) {
                    // 22 m: new Powerspots within this distance of another Wayspot are rejected
                    if (config.get("renderCloseCircle"))
                        drawCircle(map, candidate, "blue", 22);
                    // 2 m: a moved location must be at least this far from the submitter's proposal
                    // (not for edit reviews: there the reviewer picks one of the suggested locations, nothing is moved)
                    if (config.get("renderMoveCircle") && candidate.type === "NEW")
                        drawCircle(map, candidate, "red", 2);
                    // only NEW reviews declare nearbyPortals in the types, but read it defensively for any review
                    const nearbyPortals = candidate.nearbyPortals;
                    const nearby = Array.isArray(nearbyPortals) ? nearbyPortals : [];
                    const tooClose = nearby.some(n => Number.isFinite(Number(n.lat)) && Number.isFinite(Number(n.lng))
                        && haversine(candidate.lat, candidate.lng, Number(n.lat), Number(n.lng)) <= 20);
                    if (tooClose) {
                        const warn = document.createElement("p");
                        warn.className = "uwtrmm-close-warning";
                        warn.style.cssText = "color:red;font-weight:bold;margin:6px 0";
                        warn.textContent = "There is at least one waypoint within 20 meters of this nomination, check closely for duplicates!";
                        insertBeforeMapBox(container, warn);
                    }
                }
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/review", addMapMods);
            toolbox.interceptSendJson("/api/v1/vault/review", rmmCleanup);
        },
    });
};// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var reviewCounter = () => {
    register()({
        id: "review-counter",
        name: "Review Counter",
        authors: ["tehstone", "bilde2910"],
        description: "Add review conuter to Wayfarer",
        defaultConfig: {},
        sessionData: {
            reviews: 0,
        },
        initialize: (toolbox, _logger, _config) => {
            const injectCounter = async () => {
                // redesign: wf-logo (and the header it sat in) no longer exists; the counter is a small badge fixed
                // to the bottom left, above the Nomination map and settings buttons (see review-counter.css)
                const container = await untilTruthy(() => document.body);
                if (document.getElementById("uwtrct-counter") === null) {
                    const div = makeChildNode(container, "div");
                    div.classList.add("uwtrct-outer");
                    div.title = "Click to reset the review count";
                    const countLabel = makeChildNode(div, "p", "Review count:");
                    const counter = makeChildNode(div, "p", toolbox.session.get("reviews").toString());
                    counter.id = "uwtrct-counter";
                    const confirmReset = () => {
                        if (confirm("Reset review count?")) {
                            toolbox.session.clear("reviews");
                            counter.textContent = "0";
                        }
                    };
                    countLabel.addEventListener("click", confirmReset);
                    counter.addEventListener("click", confirmReset);
                }
            };
            const incrementCounter = (_review, result) => {
                if (result === "api.review.post.accepted") {
                    const count = toolbox.session.get("reviews") + 1;
                    toolbox.session.set("reviews", count);
                    const counter = document.getElementById("uwtrct-counter");
                    if (counter !== null) {
                        counter.textContent = count.toString();
                    }
                }
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/home", injectCounter);
            toolbox.interceptOpenJson("GET", "/api/v1/vault/review", injectCounter);
            toolbox.interceptSendJson("/api/v1/vault/review", incrementCounter);
        },
    });
};var EmlImportIcon = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20%20%20version%3D%221.1%22%20%20%20id%3D%22Layer_1%22%20%20%20x%3D%220px%22%20%20%20y%3D%220px%22%20%20%20width%3D%222834.938%22%20%20%20height%3D%222902.1931%22%20%20%20viewBox%3D%220%200%202834.9379%202902.1931%22%20%20%20enable-background%3D%22new%200%200%205356.929%205014.997%22%20%20%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20%20%20xmlns%3Asvg%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%20%20%3Cdefs%20id%3D%22defs43%22%20%2F%3E%20%20%3Cg%20id%3D%22g38%22%20transform%3D%22translate%28-1315.464%2C-946.912%29%22%3E%20%20%20%20%3Cg%20id%3D%22g36%22%3E%20%20%20%20%20%20%3Cpath%20fill%3D%22%23f3705b%22%20d%3D%22m%204035.47%2C2049.879%20c%20-30.163%2C-18.321%20-64.172%2C-29.587%20-100.802%2C-29.587%20H%201531.117%20c%20-48.45%2C0%20-92.635%2C18.767%20-128.694%2C49.462%20l%201218.765%2C932.779%204.479%2C1.378%20-4.479%2C2.706%20106.813%2C81.754%20108.353%2C-85.838%20-4.288%2C-2.729%204.288%2C-1.257%20z%22%20id%3D%22path6%22%20%2F%3E%20%20%20%20%20%20%3Cpath%20fill%3D%22%23f3705b%22%20d%3D%22m%201402.42%2C2073.796%20c%200%2C0%201164.511%2C-1126.884%201335.501%2C-1126.884%20171.067%2C0%201297.553%2C1106.98%201297.553%2C1106.98%20z%22%20id%3D%22path8%22%20%2F%3E%20%20%20%20%20%20%3Cg%20id%3D%22g24%22%3E%20%20%20%20%20%20%20%20%3Crect%20x%3D%221902.078%22%20y%3D%221754.7271%22%20fill%3D%22%23ffffff%22%20width%3D%221693.751%22%20height%3D%221976.052%22%20id%3D%22rect10%22%20%2F%3E%20%20%20%20%20%20%20%20%3Crect%20x%3D%222021.764%22%20y%3D%221926.0439%22%20fill%3D%22%23ffd066%22%20width%3D%221454.308%22%20height%3D%2288.404999%22%20id%3D%22rect12%22%20%2F%3E%20%20%20%20%20%20%20%20%3Crect%20x%3D%222021.764%22%20y%3D%222330.9741%22%20fill%3D%22%23ffd066%22%20width%3D%221454.308%22%20height%3D%2288.361%22%20id%3D%22rect14%22%20%2F%3E%20%20%20%20%20%20%20%20%3Crect%20x%3D%222021.764%22%20y%3D%222128.5139%22%20fill%3D%22%23ffd066%22%20width%3D%221454.308%22%20height%3D%2288.391998%22%20id%3D%22rect16%22%20%2F%3E%20%20%20%20%20%20%20%20%3Crect%20x%3D%222021.764%22%20y%3D%222533.4341%22%20fill%3D%22%23ffd066%22%20width%3D%221454.308%22%20height%3D%2288.330002%22%20id%3D%22rect18%22%20%2F%3E%20%20%20%20%20%20%20%20%3Crect%20x%3D%222021.764%22%20y%3D%222722.71%22%20fill%3D%22%23ffd066%22%20width%3D%221454.308%22%20height%3D%2288.404999%22%20id%3D%22rect20%22%20%2F%3E%20%20%20%20%20%20%20%20%3Crect%20x%3D%222021.764%22%20y%3D%222925.208%22%20fill%3D%22%23ffd066%22%20width%3D%221454.308%22%20height%3D%2288.323997%22%20id%3D%22rect22%22%20%2F%3E%20%20%20%20%20%20%3C%2Fg%3E%20%20%20%20%20%20%3Cg%20id%3D%22g34%22%3E%20%20%20%20%20%20%20%20%3Cpolygon%20fill%3D%22%2366bbc9%22%20points%3D%222552.634%2C2954.069%202552.84%2C2954.231%202516.121%2C2926.082%20%22%20id%3D%22polygon26%22%20%2F%3E%20%20%20%20%20%20%20%20%3Cpath%20fill%3D%22%23f7ba1d%22%20d%3D%22m%202552.84%2C2954.231%20-0.206%2C-0.162%20-36.513%2C-27.987%20-341.892%2C-261.549%20-771.806%2C-590.736%20c%20-52.401%2C44.762%20-86.959%2C115.382%20-86.959%2C195.616%20v%201334.569%20c%200%2C69.935%2026.069%2C132.551%2067.376%2C177.189%20l%20959.125%2C-599.928%20279.224%2C-174.621%20z%22%20id%3D%22path28%22%20%2F%3E%20%20%20%20%20%20%20%20%3Cpath%20fill%3D%22%23f7ba1d%22%20d%3D%22m%204035.47%2C2053.896%20-896.785%2C709.585%20v%200%20l%20-189.621%2C150.074%20-96.624%2C76.366%20-16.093%2C12.608%20339.785%2C216.432%20897.269%2C571.412%20c%2046.706%2C-44.951%2077.001%2C-111.282%2077.001%2C-186.395%20V%202269.41%20c%200%2C-93.815%20-46.913%2C-174.32%20-114.932%2C-215.514%20z%22%20id%3D%22path30%22%20%2F%3E%20%20%20%20%20%20%20%20%3Cpath%20fill%3D%22%23e4a33a%22%20d%3D%22m%203176.14%2C3218.964%20-339.786%2C-216.432%2016.093%2C-12.608%20c%20-0.985%2C0.634%20-89.633%2C55.635%20-133.589%2C55.635%20-43.792%2C0%20-165.248%2C-90.684%20-166.014%2C-91.328%20l%2068.352%2C52.386%20-279.224%2C174.62%20-959.128%2C599.93%20c%2038.526%2C41.851%2090.697%2C67.938%20148.284%2C67.938%20h%202403.549%20c%2053.16%2C0%20101.081%2C-22.629%20138.735%2C-58.735%20z%22%20id%3D%22path32%22%20%2F%3E%20%20%20%20%20%20%3C%2Fg%3E%20%20%20%20%3C%2Fg%3E%20%20%3C%2Fg%3E%3C%2Fsvg%3E";// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var emlImporter = () => {
    register()({
        id: "eml-importer",
        name: "EML Email Importer",
        authors: ["tehstone", "bilde2910"],
        description: "Adds the capability to import emails to Wayfarer to enrich other plugins, such as Nomination Status History",
        defaultConfig: {},
        sessionData: {},
        initialize: (toolbox, _logger, _config) => {
            const createEmailLoader = async (title, body) => {
                const modal = await toolbox.createModal("uwtemli-modal");
                const header = makeChildNode(modal.container, "h2", title);
                const status = makeChildNode(modal.container, "p", body);
                return {
                    setTitle: (text) => header.textContent = text,
                    setStatus: (text) => status.textContent = text,
                    destroy: () => modal.dismiss(),
                };
            };
            const importEmails = async () => {
                const emailAPI = await toolbox.getAddonAPI("uwt-core").email();
                const files = await readFiles("message/rfc822", "*.eml");
                const loader = await createEmailLoader("Importing...", "Please wait");
                const iterator = async function* () {
                    for (const file of files) {
                        yield {
                            filename: file.name,
                            contents: await file.text(),
                        };
                    }
                };
                let count = 1;
                await emailAPI.import(iterator(), () => {
                    loader.setStatus(`Processing email ${count} of ${files.length}`);
                    count++;
                });
                loader.destroy();
            };
            toolbox.addImporter({
                title: "Import *.eml files",
                description: "Import email files saved and exported from an email client, such as Thunderbird",
                callback: importEmails,
                icon: EmlImportIcon,
            });
        },
    });
};var GASImportIcon = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20%20%20version%3D%221.1%22%20%20%20width%3D%22456.13925%22%20%20%20height%3D%22360.8085%22%20%20%20id%3D%22svg22%22%20%20%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20%20%20xmlns%3Asvg%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%20%20%3Cdefs%20%20%20%20%20id%3D%22defs26%22%20%2F%3E%20%20%3Crect%20%20%20%20%20fill%3D%22%23ea4335%22%20%20%20%20%20x%3D%220%22%20%20%20%20%20y%3D%22253.53038%22%20%20%20%20%20width%3D%22373%22%20%20%20%20%20height%3D%22107%22%20%20%20%20%20rx%3D%2253.5%22%20%20%20%20%20id%3D%22rect2%22%20%2F%3E%20%20%3Crect%20%20%20%20%20fill%3D%22%23fbbc04%22%20%20%20%20%20x%3D%22-492.90594%22%20%20%20%20%20y%3D%22-114.04733%22%20%20%20%20%20width%3D%22373%22%20%20%20%20%20height%3D%22107%22%20%20%20%20%20rx%3D%2253.5%22%20%20%20%20%20transform%3D%22rotate%28-144%29%22%20%20%20%20%20id%3D%22rect4%22%20%2F%3E%20%20%3Crect%20%20%20%20%20fill%3D%22%2334a853%22%20%20%20%20%20x%3D%2271.084625%22%20%20%20%20%20y%3D%22-263.68692%22%20%20%20%20%20width%3D%22373%22%20%20%20%20%20height%3D%22107%22%20%20%20%20%20rx%3D%2253.5%22%20%20%20%20%20transform%3D%22rotate%2872%29%22%20%20%20%20%20id%3D%22rect6%22%20%2F%3E%20%20%3Crect%20%20%20%20%20fill%3D%22%234285f4%22%20%20%20%20%20x%3D%22-246.0011%22%20%20%20%20%20y%3D%22345.94373%22%20%20%20%20%20width%3D%22373%22%20%20%20%20%20height%3D%22107%22%20%20%20%20%20rx%3D%2253.5%22%20%20%20%20%20transform%3D%22rotate%28-72%29%22%20%20%20%20%20id%3D%22rect8%22%20%2F%3E%20%20%3Cg%20%20%20%20%20fill%3D%22%23ffffff%22%20%20%20%20%20id%3D%22g20%22%20%20%20%20%20transform%3D%22translate%28-27.530001%2C-75.369613%29%22%3E%20%20%20%20%3Ccircle%20%20%20%20%20%20%20cx%3D%22265.84%22%20%20%20%20%20%20%20cy%3D%22129.28%22%20%20%20%20%20%20%20r%3D%2226.700001%22%20%20%20%20%20%20%20id%3D%22circle10%22%20%2F%3E%20%20%20%20%3Ccircle%20%20%20%20%20%20%20cx%3D%22131.44%22%20%20%20%20%20%20%20cy%3D%22225.44%22%20%20%20%20%20%20%20r%3D%2226.700001%22%20%20%20%20%20%20%20id%3D%22circle12%22%20%2F%3E%20%20%20%20%3Ccircle%20%20%20%20%20%20%20cx%3D%2281.360001%22%20%20%20%20%20%20%20cy%3D%22382.60001%22%20%20%20%20%20%20%20r%3D%2226.700001%22%20%20%20%20%20%20%20id%3D%22circle14%22%20%2F%3E%20%20%20%20%3Ccircle%20%20%20%20%20%20%20cx%3D%22348.22%22%20%20%20%20%20%20%20cy%3D%22381.64001%22%20%20%20%20%20%20%20r%3D%2226.700001%22%20%20%20%20%20%20%20id%3D%22circle16%22%20%2F%3E%20%20%20%20%3Ccircle%20%20%20%20%20%20%20cx%3D%22430.67001%22%20%20%20%20%20%20%20cy%3D%22127.89%22%20%20%20%20%20%20%20r%3D%2226.700001%22%20%20%20%20%20%20%20id%3D%22circle18%22%20%2F%3E%20%20%3C%2Fg%3E%3C%2Fsvg%3E";var GASUserManual = "data:text/html;base64,PCFET0NUWVBFIGh0bWw+DQo8aHRtbD4NCg0KPGhlYWQ+DQogIDx0aXRsZT5HQVMgU2V0dXAgR3VpZGU8L3RpdGxlPg0KICA8c3R5bGU+DQogICAgKiB7DQogICAgICBmb250LWZhbWlseTogc2Fucy1zZXJpZjsNCiAgICB9DQoNCiAgICBjb2RlLA0KICAgIHRleHRhcmVhIHsNCiAgICAgIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7DQogICAgfQ0KDQogICAgaW1nIHsNCiAgICAgIGJveC1zaGFkb3c6IDAgMCAxMHB4IGJsYWNrOw0KICAgIH0NCg0KICAgIGJvZHkgew0KICAgICAgYmFja2dyb3VuZDogI2NjYzsNCiAgICB9DQoNCiAgICAjY29udGVudCB7DQogICAgICBtYXgtd2lkdGg6IDgwMHB4Ow0KICAgICAgbWFyZ2luOiBhdXRvOw0KICAgICAgcGFkZGluZzogMCAzMHB4IDMwcHggMzBweDsNCiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIGJsYWNrOw0KICAgICAgYmFja2dyb3VuZDogI2ZmZjsNCiAgICB9DQoNCiAgICBpbWcgew0KICAgICAgbWF4LXdpZHRoOiAxMDAlOw0KICAgIH0NCg0KICAgIHRleHRhcmVhIHsNCiAgICAgIHdpZHRoOiAxMDAlOw0KICAgICAgaGVpZ2h0OiAxMDBweDsNCiAgICB9DQogIDwvc3R5bGU+DQo8L2hlYWQ+DQoNCjxib2R5Pg0KICA8ZGl2IGlkPSJjb250ZW50Ij4NCiAgICA8aDE+RW1haWwgSW1wb3J0ZXI6IEdBUyBTZXR1cCBHdWlkZTwvaDE+DQogICAgPHA+VGhpcyB1c2VyIG1hbnVhbCB3aWxsIGV4cGxhaW4gaG93IHRvIHNldCB1cCBzZW1pLWF1dG9tYXRpYyBlbWFpbCBpbXBvcnRzIGZyb20gR21haWwgdXNpbmcgR29vZ2xlIEFwcHMgU2NyaXB0LiBJZg0KICAgICAgeW91IGhhdmUgcHJldmlvdXNseSBzZXQgdXAgdGhlIFdheWZhcmVyIFBsYW5uZXIgYWRkb24sIHRoZSBzdGVwcyBhcmUgc2ltaWxhci48L3A+DQogICAgPHA+Tm90ZTogVGhlIGxheW91dCBvZiB0aGUgR29vZ2xlIEFwcHMgU2NyaXB0IHdlYnNpdGUgaXMgc3ViamVjdCB0byBjaGFuZ2UuIFBsZWFzZSByZWFjaCBvdXQgdG8gdGhlIGRldmVsb3BlciBvZiB0aGUNCiAgICAgIHNjcmlwdCBpZiB5b3UgYXJlIHVuc3VyZSBob3cgdG8gcHJvY2VlZCB3aXRoIHRoZSBzZXR1cCwgb3IgaWYgdGhlIGd1aWRlIGJlbG93IGlzIG5vIGxvbmdlciBhY2N1cmF0ZS48L3A+DQogICAgPGgyPlN0ZXAgMTogQ3JlYXRlIGEgR29vZ2xlIEFwcHMgU2NyaXB0IHByb2plY3Q8L2gyPg0KICAgIDxwPjxhIGhyZWY9Imh0dHBzOi8vc2NyaXB0Lmdvb2dsZS5jb20vaG9tZSIgdGFyZ2V0PSJfYmxhbmsiPkNsaWNrIGhlcmU8L2E+IHRvIG9wZW4gR29vZ2xlIEFwcHMgU2NyaXB0LiBTaWduIGluIHRvDQogICAgICB5b3VyIEdvb2dsZSBhY2NvdW50LCBpZiB5b3UgYXJlbid0IGFscmVhZHkuPC9wPg0KICAgIDxwPkNsaWNrIG9uIHRoZSAiTmV3IFByb2plY3QiIGJ1dHRvbiBpbiB0aGUgdG9wIGxlZnQgY29ybmVyOjwvcD4NCiAgICA8aW1nIHNyYz0iaHR0cHM6Ly9pLmltZ3VyLmNvbS9hOENpY05yLnBuZyI+DQogICAgPHA+VGhlIG5ldyBwcm9qZWN0IHdpbGwgbG9vayBsaWtlIHRoaXM6PC9wPg0KICAgIDxpbWcgc3JjPSJodHRwczovL2kuaW1ndXIuY29tLzk4bWxteGoucG5nIj4NCiAgICA8cD5DbGljayBvbiAiVW50aXRsZWQgcHJvamVjdCIgYXQgdGhlIHRvcCwgYW5kIGdpdmUgaXQgYSBuYW1lIHNvIHRoYXQgeW91IGNhbiBlYXNpbHkgcmVjb2duaXplIGl0IGxhdGVyLiBJIHN1Z2dlc3QNCiAgICAgICJXYXlmYXJlciBFbWFpbCBJbXBvcnRlciIuPC9wPg0KICAgIDxocj4NCiAgICA8aDI+U3RlcCAyOiBDb3B5IGFuZCBwYXN0ZSB0aGUgaW1wb3J0ZXIgY29kZTwvaDI+DQogICAgPHA+Q29weSB0aGUgY3VycmVudCBJbXBvcnRlciBTY3JpcHQgc291cmNlIGNvZGUgYmVsb3c6PC9wPg0KICAgIDx0ZXh0YXJlYSBpZD0iZ2FzLWltcG9ydGVyLXNjcmlwdCIgcmVhZG9ubHk+PC90ZXh0YXJlYT4NCiAgICA8cD5UaGUgR29vZ2xlIEFwcHMgU2NyaXB0IHBhZ2UgaGFzIGEgbGFyZ2UgdGV4dCBhcmVhIHRoYXQgY3VycmVudGx5IGNvbnRhaW5zIDxjb2RlPmZ1bmN0aW9uIG15RnVuY3Rpb24oKTwvY29kZT4gYW5kDQogICAgICBzb21lIGJyYWNrZXRzLiBTZWxlY3QgYWxsIG9mIHRoaXMgdGV4dCwgZGVsZXRlIGl0LCBhbmQgcHJlc3MgPGNvZGU+Q3RybCtWPC9jb2RlPiB0byByZXBsYWNlIGl0IHdpdGggdGhlIGNvZGUgeW91DQogICAgICBqdXN0IGNvcGllZCBhYm92ZS48L3A+DQogICAgPHA+VGhlbiBzYXZlIHRoZSBmaWxlIGJ5IHByZXNzaW5nIDxjb2RlPkN0cmwrUzwvY29kZT4uPC9wPg0KICAgIDxocj4NCiAgICA8aDI+U3RlcCAzOiBMaW1pdCB0aGUgc2NyaXB0J3MgcGVybWlzc2lvbnM8L2gyPg0KICAgIDxwPkJ5IGRlZmF1bHQsIHRoZSBzY3JpcHQgeW91IGhhdmUgcGFzdGVkIHdpbGwgdHJ5IHRvIGdldCBmdWxsIHJlYWQgYW5kIHdyaXRlIGFjY2VzcyB0byB5b3VyIEdtYWlsIGFjY291bnQuIFRoaXMNCiAgICAgIGxldmVsIG9mIHBlcm1pc3Npb24gaXMgbm90IG5lY2Vzc2FyeSwgYW5kIGZvciB0aGUgc2FmZXR5IG9mIHlvdXIgYWNjb3VudCwgaXQgaXMgcmVjb21tZW5kZWQgdGhhdCB5b3UgbGltaXQgdGhlDQogICAgICBwZXJtaXNzaW9ucyBvZiB0aGUgc2NyaXB0IHNvIHRoYXQgaXQgY2Fubm90IHdyaXRlIG9yIGRlbGV0ZSBlbWFpbHMuIFRoaXMgc3RlcCBpcyA8dT5vcHRpb25hbDwvdT4sIGJ1dCBpdCBpcw0KICAgICAgPHU+aGlnaGx5IHJlY29tbWVuZGVkPC91Pi48L3A+DQogICAgPHA+Q2xpY2sgb24gdGhlIGNvZyB3aGVlbCBpY29uICgxKSB0byBhY2Nlc3MgcHJvamVjdCBzZXR0aW5ncywgdGhlbiBlbnN1cmUgdGhhdCAiU2hvdyBhcHBzc2NyaXB0Lmpzb24gbWFuaWZlc3QgZmlsZSINCiAgICAgIGlzIDx1PmNoZWNrZWQ8L3U+LCBsaWtlIGluIHRoaXMgcGljdHVyZTo8L3A+DQogICAgPGltZyBzcmM9Imh0dHBzOi8vaS5pbWd1ci5jb20vUTdoMjAwTS5wbmciPg0KICAgIDxwPk5leHQsIHJldHVybiB0byB0aGUgc2NyaXB0IGVkaXRvciBieSBwcmVzc2luZyB0aGUgIkVkaXRvciIgYnV0dG9uICgxKSwgYW5kIGNsaWNrIG9uIHRoZSBuZXcgImFwcHNzY3JpcHQuanNvbiINCiAgICAgIGZpbGUgdGhhdCBhcHBlYXJzIGluIHRoZSBmaWxlIGxpc3QgKDIpOjwvcD4NCiAgICA8aW1nIHNyYz0iaHR0cHM6Ly9pLmltZ3VyLmNvbS9lQjVocmVkLnBuZyI+DQogICAgPHA+Q29weSB0aGUgY29ycmVjdCBtYW5pZmVzdCBjb250ZW50cyBmcm9tIGJlbG93OjwvcD4NCiAgICA8dGV4dGFyZWEgcmVhZG9ubHk+ew0KICAidGltZVpvbmUiOiAiRXRjL1VUQyIsDQogICJkZXBlbmRlbmNpZXMiOiB7fSwNCiAgImV4Y2VwdGlvbkxvZ2dpbmciOiAiU1RBQ0tEUklWRVIiLA0KICAicnVudGltZVZlcnNpb24iOiAiVjgiLA0KICAib2F1dGhTY29wZXMiOiBbDQogICAgImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZ21haWwucmVhZG9ubHkiDQogIF0NCn08L3RleHRhcmVhPg0KICAgIDxwPlRoZW4sIG92ZXJ3cml0ZSB0aGUgY29udGVudHMgb2YgdGhlIGZpbGUgYnkgZGVsZXRpbmcgYWxsIHRoZSBjb250ZW50cywgdGhlbiBwcmVzc2luZyA8Y29kZT5DdHJsK1Y8L2NvZGU+IHRvIHBhc3RlDQogICAgICB0aGUgY29udGVudHMgeW91IGp1c3QgY29waWVkLiBTYXZlIHRoZSBmaWxlIHVzaW5nIDxjb2RlPkN0cmwrUzwvY29kZT4uPC9wPg0KICAgIDxocj4NCiAgICA8aDI+U3RlcCA0OiBBdXRob3JpemluZyB0aGUgc2NyaXB0IHRvIGFjY2VzcyBlbWFpbHM8L2gyPg0KICAgIDxwPlJldHVybiB0byB0aGUgIkNvZGUuZ3MiIGZpbGUgKDEpLiBJbiB0aGUgZnVuY3Rpb24gZHJvcGRvd24sIGVuc3VyZSAic2V0dXAiIGlzIHNlbGVjdGVkICgyKSwgdGhlbiBwcmVzcyAiUnVuIiAoMyk6DQogICAgPC9wPg0KICAgIDxpbWcgc3JjPSJodHRwczovL2kuaW1ndXIuY29tL1ZGeDlXZ3MucG5nIj4NCiAgICA8cD5Zb3Ugd2lsbCBzZWUgYW4gYXV0aG9yaXphdGlvbiBwcm9tcHQsIGxpa2UgdGhlIHNjcmVlbnNob3QgYmVsb3cuIENsaWNrIG9uICJSZXZpZXcgcGVybWlzc2lvbnMiIHdoZW4gaXQgYXBwZWFycy4NCiAgICA8L3A+DQogICAgPGltZyBzcmM9Imh0dHBzOi8vaS5pbWd1ci5jb20vc1JlU3R0eC5wbmciPg0KICAgIDxwPkEgcG9wdXAgd2lsbCBhcHBlYXIuIENsaWNrIG9uICJBZHZhbmNlZCIgKDEpLCB0aGVuICJHbyB0byBXYXlmYXJlciBFbWFpbCBJbXBvcnRlciAodW5zYWZlKSIgKG9yIHRoZSBuYW1lIG9mIHlvdXINCiAgICAgIHNjcmlwdCkgKDIpLiBUaGlzIHdhcm5pbmcgc2NyZWVuIHNob3dzIGJlY2F1c2UgdGhlIHNjcmlwdCB1c2VkIGJ5IHRoZSBlbWFpbCBpbXBvcnRlciBoYXMgbm90IGJlZW4gdmVyaWZpZWQgYnkNCiAgICAgIEdvb2dsZS4gSXQgaXMgY29tcGxldGVseSBzYWZlIHRvIHVzZSAtIHRoZSBzb3VyY2UgY29kZSBvZiB0aGUgc2NyaXB0IGlzIHdoYXQgeW91IGp1c3QgcGFzdGVkIGVhcmxpZXIuPC9wPg0KICAgIDxpbWcgc3JjPSJodHRwczovL2kuaW1ndXIuY29tLzN3U1RqUHkucG5nIj4NCiAgICA8cD5UaGUgZm9sbG93aW5nIHNjcmVlbiB3aWxsIHRoZW4gYXBwZWFyLCBhc2tpbmcgcGVybWlzc2lvbiB0byB2aWV3IHlvdXIgZW1haWxzLiBDbGljayBvbiBBbGxvdy48L3A+DQogICAgPGltZyBzcmM9Imh0dHBzOi8vaS5pbWd1ci5jb20vUUhpWkxjNC5wbmciPg0KICAgIDxocj4NCiAgICA8aDI+U3RlcCA1OiBDb3B5IHRoZSBhY2Nlc3MgdG9rZW48L2gyPg0KICAgIDxwPllvdSB3aWxsIGJlIHJldHVybmVkIHRvIHRoZSBtYWluIEFwcHMgU2NyaXB0IHdpbmRvdywgd2hlcmUgYSBuZXcgIkV4ZWN1dGlvbiBsb2ciIHdpbGwgYXBwZWFyLiBBZnRlciBhIGZldw0KICAgICAgc2Vjb25kcywgYW4gYWNjZXNzIHRva2VuIHdpbGwgYXBwZWFyIGluIHRoaXMgcGFuZS48L3A+DQogICAgPGltZyBzcmM9Imh0dHBzOi8vaS5pbWd1ci5jb20vV1VBTUdMUi5wbmciPg0KICAgIDxwPkNvcHkgdGhpcyB2YWx1ZSwgYW5kIHBhc3RlIGl0IGluIHRoZSAiQWNjZXNzIHRva2VuIiBib3ggdGhhdCB5b3UgYXJlIGFza2VkIGZvciBvbiB0aGUgIkltcG9ydCB1c2luZyBHb29nbGUgQXBwcw0KICAgICAgU2NyaXB0IiB3aW5kb3cgb24gV2F5ZmFyZXIuPC9wPg0KICAgIDxwPjxiPkl0IGlzIHZlcnkgaW1wb3J0YW50IHRoYXQgeW91IGRvIG5vdCBzaGFyZSB0aGlzIHRva2VuIHdpdGggPHU+YW55b25lPC91Pi4gS2VlcCBpdCBjb21wbGV0ZWx5IHNlY3JldC48L2I+PC9wPg0KICAgIDxwPlAuUy4gVGhlIGlucHV0IGJveCBmb3IgdGhlIGFjY2VzcyB0b2tlbiB3aWxsIGhpZGUgaXRzIGNvbnRlbnRzIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBsZWFrYWdlIHRocm91Z2ggc2NyZWVuc2hvdHMuDQogICAgICBJZiB5b3UgZXZlciBuZWVkIGl0IGFnYWluLCBmb3IgZXhhbXBsZSBvbiBhbm90aGVyIGRldmljZSwgeW91IGNhbiByZXR1cm4gdG8gdGhlIEdvb2dsZSBBcHBzIFNjcmlwdCBhbmQgY2xpY2sgIlJ1biINCiAgICAgIHVzaW5nIHRoZSAic2V0dXAiIGZ1bmN0aW9uIGFnYWluLiBJZiB5b3VyIHRva2VuIGlzIGV2ZXIgYWNjaWRlbnRhbGx5IGRpc2Nsb3NlZCwgeW91IGNhbiByZXNldCBpdCBieSBydW5uaW5nIHRoZQ0KICAgICAgInJlc2V0U2NyaXB0RGF0YSIgZnVuY3Rpb24sIGFuZCB0aGUgInNldHVwIiBhZ2FpbiB0byBnZW5lcmF0ZSBhIG5ldyB0b2tlbi48L3A+DQogICAgPGhyPg0KICAgIDxoMj5TdGVwIDY6IERlcGxveSB0aGUgc2NyaXB0PC9oMj4NCiAgICA8cD5JbiB0aGUgdG9wIHJpZ2h0IGNvcm5lciBvZiB0aGUgR29vZ2xlIEFwcHMgU2NyaXB0IHBhZ2UsIHRoZXJlIGlzIGEgYmx1ZSAiRGVwbG95IiBidXR0b24uIENsaWNrIG9uIGl0LCBhbmQgdGhlbg0KICAgICAgY2xpY2sgIk5ldyBkZXBsb3ltZW50Ii48L3A+DQogICAgPGltZyBzcmM9Imh0dHBzOi8vaS5pbWd1ci5jb20vV05pSU13Zi5wbmciPg0KICAgIDxwPkluIHRoZSB3aW5kb3cgdGhhdCBhcHBlYXJzLCBjbGljayB0aGUgZ2VhciBpY29uLCB0aGVuIHNlbGVjdCAiV2ViIGFwcCIuPC9wPg0KICAgIDxpbWcgc3JjPSJodHRwczovL2kuaW1ndXIuY29tL3RtdkJxM0UucG5nIj4NCiAgICA8cD5Tb21lIHNldHRpbmdzIHdpbGwgYXBwZWFyLiBMZWF2ZSAiRXhlY3V0ZSBhcyIgc2V0IHRvICJNZSIsIGJ1dCBtYWtlIHN1cmUgdGhhdCAiV2hvIGhhcyBhY2Nlc3MiIGlzIHNldCB0byAiQW55b25lIg0KICAgICAgKDEpLiBUaGVuLCBjbGljayAiRGVwbG95IiAoMikuPC9wPg0KICAgIDxpbWcgc3JjPSJodHRwczovL2kuaW1ndXIuY29tL2E4TFBGYU0ucG5nIj4NCiAgICA8cD5XaGVuIHRoZSBkZXBsb3ltZW50IGhhcyBjb21wbGV0ZWQsIHlvdSB3aWxsIGJlIHNob3duIGEgd2ViIGFwcCBVUkwuIENvcHkgdGhpcyBVUkwsIGFuZCBwYXN0ZSBpdCBpbnRvIHRoZSAiU2NyaXB0DQogICAgICBVUkwiIGJveCBpbiB0aGUgIkltcG9ydCB1c2luZyBHb29nbGUgQXBwcyBTY3JpcHQiIHdpbmRvdyBvbiBXYXlmYXJlci48L3A+DQogICAgPGltZyBzcmM9Imh0dHBzOi8vaS5pbWd1ci5jb20vMnlkS2c5SC5wbmciPg0KICAgIDxocj4NCiAgICA8aDI+U3RlcCA3OiBGaXJzdCBpbXBvcnQ8L2gyPg0KICAgIDxwPkNvbmdyYXR1bGF0aW9ucywgdGhlIHNldHVwIGlzIG5vdyBjb21wbGV0ZSEgSGVyZSBhcmUgYSBmZXcgdGhpbmdzIHRvIGtlZXAgaW4gbWluZCB0aGF0IHNwZWNpZmljYWxseSBhcHBseSB0byB0aGUNCiAgICAgIDx1PmZpcnN0IHRpbWU8L3U+IHlvdSB1c2UgdGhlIGltcG9ydGVyOjwvcD4NCiAgICA8dWw+DQogICAgICA8bGk+VGhlIGZpcnN0IHRpbWUgeW91IGltcG9ydCBlbWFpbHMsIHRoZSBwcm9jZXNzIGNhbiB0YWtlIGEgdmVyeSBsb25nIHRpbWUsIGFzIGl0IGhhcyB0byBpbXBvcnQgYWxsIG9mIHlvdXINCiAgICAgICAgZW1haWxzLiBUaGlzIGNhbiB0YWtlIG1hbnkgbWludXRlcy48L2xpPg0KICAgICAgPGxpPklmIHlvdSBoYXZlIHByZXZpb3VzbHkgYW5kIHJlY2VudGx5IHVzZWQgdGhlIG1hbnVhbCAqLmVtbCBmaWxlIGltcG9ydGVyIGZ1bmN0aW9uLCB5b3UgbWF5IG5vdCBoYXZlIGFueSBjaGFuZ2VzDQogICAgICAgIGRldGVjdGVkLiBJdCBpcyB2ZXJ5IGltcG9ydGFudCB0aGF0IGV2ZW4gaWYgeW91IGhhdmUgbm8gY2hhbmdlcyBkZXRlY3RlZCwgeW91IGNsaWNrIG9uICJJbXBvcnQgMCBjaGFuZ2UocykiIHRoaXMNCiAgICAgICAgdGltZSwgYmVjYXVzZSB0aGlzIHdpbGwgbWFyayBhbGwgdGhlIGVtYWlscyB5b3UganVzdCBpbXBvcnRlZCBhcyBwcm9jZXNzZWQsIHNvIHRoYXQgaXQgZG9lcyBub3QgaGF2ZSB0byBwcm9jZXNzDQogICAgICAgIGV2ZXJ5IHNpbmdsZSBvbmUgb2YgdGhlbSBhZ2FpbiB0aGUgbmV4dCB0aW1lIHlvdSBydW4gdGhlIGltcG9ydGVyLjwvbGk+DQogICAgPC91bD4NCiAgPC9kaXY+DQo8L2JvZHk+DQoNCjwvaHRtbD4NCg==";var GASContent = "data:null;base64,ZnVuY3Rpb24gc2V0dXAoKSB7DQogIGNvbnN0IHByb3BzID0gUHJvcGVydGllc1NlcnZpY2UuZ2V0U2NyaXB0UHJvcGVydGllcygpOw0KICBpZiAoIXByb3BzLmdldFByb3BlcnR5KCJhY2Nlc3NUb2tlbiIpKSBwcm9wcy5zZXRQcm9wZXJ0eSgiYWNjZXNzVG9rZW4iLCByYW5kb21CYXNlNjQoMTI4KSk7DQogIGNvbnNvbGUubG9nKA0KICAgICJTY3JpcHQgY29uZmlndXJlZCFcblxuVEhJUyBJUyBZT1VSIEFDQ0VTUyBUT0tFTjpcbiINCiAgICArIHByb3BzLmdldFByb3BlcnR5KCJhY2Nlc3NUb2tlbiIpDQogICAgKyAiXG5cbktlZXAgaXQgc2VjcmV0LCBhbmQgbmV2ZXIgc2hhcmUgaXQgd2l0aCBhbnlvbmUgZWxzZS4iKTsNCn0NCg0KZnVuY3Rpb24gcmVzZXRTY3JpcHREYXRhKCkgew0KICBjb25zdCBwcm9wcyA9IFByb3BlcnRpZXNTZXJ2aWNlLmdldFNjcmlwdFByb3BlcnRpZXMoKTsNCiAgcHJvcHMuZGVsZXRlQWxsUHJvcGVydGllcygpOw0KICBjb25zb2xlLmxvZygiU2NyaXB0IGRhdGEgc3VjY2Vzc2Z1bGx5IHJlc2V0LiBQbGVhc2UgcmVtZW1iZXIgdG8gcmVnZW5lcmF0ZSBhbiBhY2Nlc3MgdG9rZW4gYnkgcnVubmluZyBzZXR1cC4iKTsNCn0NCg0KZnVuY3Rpb24gcmFuZG9tQmFzZTY0KGxlbmd0aCkgew0KICBsZXQgcmVzdWx0ID0gJyc7DQogIGNvbnN0IGNoYXJhY3RlcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7DQogIGNvbnN0IGNoYXJhY3RlcnNMZW5ndGggPSBjaGFyYWN0ZXJzLmxlbmd0aDsNCiAgbGV0IGNvdW50ZXIgPSAwOw0KICB3aGlsZSAoY291bnRlciA8IGxlbmd0aCkgew0KICAgIHJlc3VsdCArPSBjaGFyYWN0ZXJzLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFyYWN0ZXJzTGVuZ3RoKSk7DQogICAgY291bnRlciArPSAxOw0KICB9DQogIHJldHVybiByZXN1bHQ7DQp9DQoNCmZ1bmN0aW9uIGRvUG9zdChlKSB7DQogIGNvbnN0IHJlcSA9IEpTT04ucGFyc2UoZS5wb3N0RGF0YS5jb250ZW50cyk7DQogIGNvbnN0IHByb3BzID0gUHJvcGVydGllc1NlcnZpY2UuZ2V0U2NyaXB0UHJvcGVydGllcygpOw0KICBjb25zdCB0b2tlbiA9IHByb3BzLmdldFByb3BlcnR5KCJhY2Nlc3NUb2tlbiIpOw0KICBjb25zdCBvdXRwdXQgPSB7IHZlcnNpb246IDIgfTsNCg0KICBpZiAoIXRva2VuIHx8IHJlcS50b2tlbiAhPT0gdG9rZW4pIHsNCiAgICBvdXRwdXQuc3RhdHVzID0gIkVSUk9SIjsNCiAgICBvdXRwdXQucmVzdWx0ID0gInVuYXV0aG9yaXplZCI7DQogIH0gZWxzZSB7DQogICAgbGV0IGNhbGxiYWNrID0gbnVsbDsNCiAgICBzd2l0Y2ggKHJlcS5yZXF1ZXN0KSB7DQogICAgICBjYXNlICJsaXN0IjogY2FsbGJhY2sgPSBmaW5kRW1haWxzOyBicmVhazsNCiAgICAgIGNhc2UgImZldGNoIjogY2FsbGJhY2sgPSBnZXRFbWFpbHM7IGJyZWFrOw0KICAgICAgY2FzZSAidGVzdCI6IGNhbGxiYWNrID0gdmFsaWRhdGU7IGJyZWFrOw0KICAgIH0NCiAgICBpZiAoY2FsbGJhY2spIHsNCiAgICAgIG91dHB1dC5zdGF0dXMgPSAiT0siOw0KICAgICAgb3V0cHV0LnJlc3VsdCA9IGNhbGxiYWNrKHJlcS5vcHRpb25zKTsNCiAgICB9IGVsc2Ugew0KICAgICAgb3V0cHV0LnN0YXR1cyA9ICJFUlJPUiI7DQogICAgICBvdXRwdXQucmVzdWx0ID0gInVua25vd25fcm91dGUiOw0KICAgIH0NCiAgfQ0KICB2YXIgY29udGVudFN2YyA9IENvbnRlbnRTZXJ2aWNlLmNyZWF0ZVRleHRPdXRwdXQoSlNPTi5zdHJpbmdpZnkob3V0cHV0KSk7DQogIGNvbnRlbnRTdmMuc2V0TWltZVR5cGUoQ29udGVudFNlcnZpY2UuTWltZVR5cGUuSlNPTik7DQogIHJldHVybiBjb250ZW50U3ZjOw0KfQ0KDQpmdW5jdGlvbiBmaW5kRW1haWxzKHsgc2luY2UsIG9mZnNldCwgc2l6ZSB9KSB7DQogIGNvbnN0IHNlbmRlcnMgPSBbDQogICAgIm5vdGljZXNAd2F5ZmFyZXIubmlhbnRpY2xhYnMuY29tIiwNCiAgICAibm9taW5hdGlvbnNAcG9ydGFscy5pbmdyZXNzLmNvbSIsDQogICAgImhlbGxvQHBva2Vtb25nb2xpdmUuY29tIiwNCiAgICAiaW5ncmVzcy1zdXBwb3J0QG5pYW50aWNsYWJzLmNvbSIsDQogICAgImluZ3Jlc3Mtc3VwcG9ydEBnb29nbGUuY29tIg0KICBdLm1hcChlID0+ICJmcm9tOiIgKyBlKTsNCiAgaWYgKHNpbmNlID09ICIiKSBzaW5jZSA9ICIxOTcwLTAxLTAxIjsNCiAgaWYgKCFzaW5jZS5tYXRjaCgvXlxkezR9LVxkezJ9LVxkezJ9JC8pKSByZXR1cm4gW107DQogIGNvbnN0IGVtYWlscyA9IFtdOw0KICBjb25zdCB0aHJlYWRzID0gR21haWxBcHAuc2VhcmNoKCIoIiArIHNlbmRlcnMuam9pbigiIHwgIikgKyAiKSBhZnRlcjoiICsgc2luY2UsIG9mZnNldCwgc2l6ZSk7DQogIGZvciAoaiA9IDA7IGogPCB0aHJlYWRzLmxlbmd0aDsgaisrKSBlbWFpbHMucHVzaCh0aHJlYWRzW2pdLmdldElkKCkpOw0KICByZXR1cm4gZW1haWxzOw0KfQ0KDQpmdW5jdGlvbiBnZXRFbWFpbHMoeyBpZHMgfSkgew0KICBjb25zdCBlbWxzID0ge307DQogIGZvciAobGV0IGkgPSAwOyBpIDwgaWRzLmxlbmd0aDsgaSsrKSB7DQogICAgZW1sc1tpZHNbaV1dID0gR21haWxBcHAuZ2V0VGhyZWFkQnlJZChpZHNbaV0pLmdldE1lc3NhZ2VzKClbMF0uZ2V0UmF3Q29udGVudCgpOw0KICB9DQogIHJldHVybiBlbWxzOw0KfQ0KDQpmdW5jdGlvbiB2YWxpZGF0ZSgpIHsNCiAgcmV0dXJuICJzdWNjZXNzIjsNCn0NCg==";// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
const DEFAULT_CONFIG = {
    url: "",
    token: "",
    since: "",
};
const GAS_MIN_VERSION = 2;
const LIST_BATCH_SIZE = 500;
const FETCH_BATCH_SIZE = 20;
var gmailGasImporter = () => {
    register()({
        id: "gmail-gas-importer",
        name: "Gmail Importer",
        authors: ["tehstone", "bilde2910"],
        description: "Adds the capability to import emails from Gmail into Wayfarer to enrich other plugins through usage of a Google Apps Script",
        defaultConfig: DEFAULT_CONFIG,
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            const createEmailLoader = async (title, body) => {
                const modal = await toolbox.createModal("uwtemli-modal");
                const header = makeChildNode(modal.container, "h2", title);
                const status = makeChildNode(modal.container, "p", body);
                return {
                    setTitle: (text) => header.textContent = text,
                    setStatus: (text) => status.textContent = text,
                    getStatus: () => status.textContent,
                    destroy: () => modal.dismiss(),
                };
            };
            const showGASManual = async () => {
                const html = await fetch(GASUserManual).then(resp => resp.text());
                const gasContent = await fetch(GASContent).then(resp => resp.text());
                const dp = new DOMParser();
                const doc = dp.parseFromString(html, "text/html");
                doc.getElementById("gas-importer-script").textContent = gasContent;
                const xmls = new XMLSerializer();
                const blob = new Blob([xmls.serializeToString(doc)], { type: "text/html" });
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, "_blank", "popup");
            };
            const showImportModal = async () => {
                var _a;
                const modal = await toolbox.createModal("uwftcore-modal-common", "uwtegas-options-modal");
                makeChildNode(modal.container, "h1", "Import using Google Apps Script");
                const helpText = makeChildNode(modal.container, "p");
                makeChildNode(helpText, "span", "Please enter your Importer Script details below. New to the Importer Script? ");
                makeChildNode(helpText, "a", "Please click here").addEventListener("click", showGASManual);
                makeChildNode(helpText, "span", " for detailed setup instructions.");
                const form = makeChildNode(modal.container, "form");
                const tbl = makeChildNode(form, "table");
                tbl.classList.add("uwtegas-table");
                const inputs = [
                    {
                        id: "url",
                        type: "text",
                        label: "Script URL",
                        placeholder: "https://script.google.com/macros/.../exec",
                        required: true,
                    },
                    {
                        id: "token",
                        type: "password",
                        label: "Access token",
                        required: true,
                    },
                    {
                        id: "since",
                        type: "date",
                        label: "Search emails starting from",
                        required: false,
                    },
                ];
                for (const input of inputs) {
                    const row = makeChildNode(tbl, "tr");
                    makeChildNode(row, "td", input.label);
                    const col2 = makeChildNode(row, "td");
                    input.field = makeChildNode(col2, "input");
                    input.field.type = input.type;
                    input.field.required = input.required;
                    input.field.placeholder = (_a = input.placeholder) !== null && _a !== void 0 ? _a : "";
                    input.field.value = config.get(input.id);
                }
                const btn1 = makeChildNode(form, "input");
                btn1.type = "submit";
                btn1.classList.add("uwftcore-ui-button");
                btn1.value = "Start import";
                const btn2 = makeChildNode(form, "input");
                btn2.type = "button";
                btn2.classList.add("uwftcore-ui-button", "uwtegas-cancel-btn");
                btn2.value = "Cancel import";
                btn2.addEventListener("click", () => modal.dismiss());
                form.addEventListener("submit", (ev) => {
                    ev.preventDefault();
                    for (const input of inputs)
                        config.set(input.id, input.field.value);
                    modal.dismiss();
                    void importEmails();
                });
            };
            const getGasApi = (url, token, loader) => {
                const fetchGAS = (request, options, errDelay = 30) => new Promise((resolve, reject) => {
                    fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain" },
                        body: JSON.stringify({ request, token, options }),
                    }).then(resp => {
                        resp.json().then(data => resolve(data)).catch(reject);
                    }).catch(() => {
                        // Most likely a 429 error, so we need to slow down/wait a little bit before
                        // retrying. Unfortunately GAS does not return CORS headers on 429, so it is returned
                        // to us as a generic NetworkError. We can catch it, of course, but not distinguish
                        // it from other errors, such as HTTP 403 (setup not run/GAS not authorized on Google
                        // account) or an actual network connection error, which is unfortunate, because such
                        // errors will then be trapped here in an infinite retry loop.
                        let counter = errDelay;
                        const origStatus = loader.getStatus();
                        loader.setStatus(`Error! Retrying in ${counter}s...`);
                        const i = setInterval(() => {
                            counter--;
                            if (counter > 0) {
                                loader.setStatus(`Error! Retrying in ${counter}s...`);
                            }
                            else {
                                clearInterval(i);
                                loader.setStatus(origStatus);
                                fetchGAS(request, options, errDelay + 30).then(resolve).catch(reject);
                            }
                        }, 1000);
                    });
                });
                return fetchGAS;
            };
            const importEmails = async () => {
                const emailAPI = await toolbox.getAddonAPI("uwt-core").email();
                const loader = await createEmailLoader("Connecting...", "Validating script credentials");
                const url = config.get("url");
                const token = config.get("token");
                const since = config.get("since");
                const fetchGAS = getGasApi(url, token, loader);
                try {
                    const data = await fetchGAS("test", undefined);
                    if (data.status !== "OK") {
                        alert("Credential validation failed. Please double check your access token and script URL.");
                        loader.destroy();
                    }
                    else if (data.version < GAS_MIN_VERSION) {
                        alert("Your script is out of date. Please update your script with the latest code provided in the setup guide.");
                        loader.destroy();
                    }
                    else {
                        const startTime = new Date();
                        loader.setStatus("Searching for new emails");
                        const oldIDs = new Set([...await emailAPI.getProcessedIDs()]
                            .filter(pid => pid.startsWith("G-"))
                            .map(pid => pid.substring(2)));
                        const newIDs = [];
                        let count = 0;
                        const size = LIST_BATCH_SIZE;
                        let offset = 0;
                        do {
                            const batch = await fetchGAS("list", { since, offset, size });
                            if (batch.status !== "OK")
                                throw new Error("Email listing failed");
                            count = batch.result.length;
                            offset += count;
                            for (const pid of batch.result) {
                                if (!oldIDs.has(pid))
                                    newIDs.push(pid);
                            }
                            loader.setStatus(`Searching for new emails (${newIDs.length}/${offset})`);
                        } while (count === size);
                        const totalCount = newIDs.length;
                        loader.setTitle("Downloading...");
                        loader.setTitle("Please wait");
                        offset = 0;
                        let iterSuccess = true;
                        const iterator = async function* () {
                            try {
                                let batch = [];
                                while (newIDs.length > 0) {
                                    while (batch.length < FETCH_BATCH_SIZE && newIDs.length > 0)
                                        batch.push(newIDs.shift());
                                    loader.setTitle("Downloading...");
                                    loader.setStatus(`Downloading ${offset + 1}-${offset + batch.length} of ${totalCount}`);
                                    const emlMap = await fetchGAS("fetch", { ids: batch });
                                    if (emlMap.status !== "OK")
                                        throw new Error("Email fetching failed");
                                    loader.setTitle("Parsing...");
                                    for (const [id, text] of iterObject(emlMap.result)) {
                                        yield {
                                            filename: `${id}.eml`,
                                            contents: text,
                                            processingID: `G-${id}`,
                                        };
                                    }
                                    offset += batch.length;
                                    batch = [];
                                }
                            }
                            catch (ex) {
                                iterSuccess = false;
                                logger.error(ex);
                                alert("An error occurred fetching emails from Google. You may have to continue importing from the same date again to ensure all emails are downloaded.");
                            }
                        };
                        count = 1;
                        await emailAPI.import(iterator(), () => {
                            loader.setStatus(`Processing email ${count} of ${totalCount}`);
                            count++;
                        });
                        if (iterSuccess) {
                            const newSince = toUtcIsoDate(shiftDays(startTime, -1));
                            config.set("since", newSince);
                        }
                    }
                }
                catch (ex) {
                    logger.error(ex);
                    alert("The Importer Script returned an invalid response. Please see the console for more information.");
                }
                loader.destroy();
            };
            toolbox.addImporter({
                title: "Import from Gmail",
                description: "Import emails directly from Gmail, using a Google Apps Script",
                callback: showImportModal,
                icon: GASImportIcon,
            });
        },
    });
};// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
/**
 * redesign: the header the status badges used to sit in (next to wf-logo) no longer exists. Badges
 * (skip count, appeal timer) are put in this shared stack, fixed to the bottom left above the review
 * counter. Style it with the .uwt-pill class (see scripts/uwt-core.css).
 */
const uwtStatusStack = async () => {
    const body = await untilTruthy(() => document.body);
    let stack = document.getElementById("uwt-status-stack");
    if (stack === null) {
        stack = document.createElement("div");
        stack.id = "uwt-status-stack";
        body.appendChild(stack);
    }
    return stack;
};// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
const MAX_APPEALS = 2;
const APPEAL_COUNTDOWN_MSEC = 15 * 86400 * 1000;
const AVAILABLE_LABEL = "Appeals available:";
const UNAVAILABLE_LABEL = "Next appeal in:";
var appealTimer = () => {
    register()({
        id: "appeal-timer",
        name: "Appeal Timer",
        authors: ["tehstone", "bilde2910"],
        description: "Save when appeals are done, and add a timer that counts down to the next available appeal.",
        defaultConfig: {},
        sessionData: {},
        initialize: (toolbox, logger, _config) => {
            const updateTimer = async (result) => {
                const container = await uwtStatusStack();
                const now = Date.now();
                let counter = document.getElementById("uwftat-counter");
                let label = document.getElementById("uwftat-label");
                if (counter === null) {
                    const div = makeChildNode(container, "div");
                    div.classList.add("uwftat-outer", "uwt-pill");
                    label = makeChildNode(div, "p", (result === null || result === void 0 ? void 0 : result.canAppeal) ? AVAILABLE_LABEL : UNAVAILABLE_LABEL);
                    label.id = "uwftat-label";
                    counter = makeChildNode(div, "p", "Loading…");
                    counter.id = "uwftat-counter";
                }
                {
                    const env_1 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_1, await toolbox.openIDB("appeals", "readonly"), false);
                        const appeals = await idb.getAll();
                        const recent = appeals
                            .filter(a => a.ts >= now - APPEAL_COUNTDOWN_MSEC)
                            .sort((a, b) => a.ts - b.ts);
                        if (recent.length >= MAX_APPEALS || !(result === null || result === void 0 ? void 0 : result.canAppeal)) {
                            const ttl = recent.length ? ((recent[0].ts + APPEAL_COUNTDOWN_MSEC) - now) / 1000 : NaN;
                            if (ttl / 86400 >= 1) {
                                counter.textContent = `~${Math.round(ttl / 86400)} days`;
                            }
                            else if (ttl / 3600 >= 1) {
                                counter.textContent = `~${Math.round(ttl / 3600)} hours`;
                            }
                            else if (ttl >= 0) {
                                counter.textContent = `~${Math.round(ttl / 60)} minutes`;
                            }
                            else {
                                counter.textContent = "Unknown";
                            }
                            label.textContent = UNAVAILABLE_LABEL;
                        }
                        else if (typeof result !== "undefined" && !result.canAppeal) {
                            counter.textContent = "Unknown";
                            label.textContent = UNAVAILABLE_LABEL;
                        }
                        else {
                            counter.textContent = (MAX_APPEALS - recent.length).toString();
                            label.textContent = AVAILABLE_LABEL;
                        }
                    }
                    catch (e_1) {
                        env_1.error = e_1;
                        env_1.hasError = true;
                    }
                    finally {
                        __disposeResources(env_1);
                    }
                }
            };
            const handleSubmittedAppeal = async (sent, received) => {
                logger.info("Appeal submitted with status", received);
                if (received === "DONE") {
                    logger.info("Storing appeal");
                    {
                        const env_2 = { stack: [], error: void 0, hasError: false };
                        try {
                            const idb = __addDisposableResource(env_2, await toolbox.openIDB("appeals", "readwrite"), false);
                            idb.put({ ...sent, ts: Date.now() });
                            idb.commit();
                        }
                        catch (e_2) {
                            env_2.error = e_2;
                            env_2.hasError = true;
                        }
                        finally {
                            __disposeResources(env_2);
                        }
                    }
                    void updateTimer();
                }
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", updateTimer);
            toolbox.interceptSendJson("/api/v1/vault/manage/appeal", handleSubmittedAppeal);
        },
    });
};// Copyright 2025 Tntnnbltn, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
const STATUS_MAP = {
    [ContributionStatus.ACCEPTED]: {
        style: "accepted",
        label: "Accepted",
    },
    [ContributionStatus.APPEALED]: {
        style: "queue",
        label: "Appealed",
    },
    [ContributionStatus.DUPLICATE]: {
        style: "rejected",
        label: "Duplicate",
    },
    [ContributionStatus.HELD]: {
        style: "queue",
        label: "Held",
    },
    [ContributionStatus.NIANTIC_REVIEW]: {
        style: "queue",
        label: "NIA Voting",
    },
    [ContributionStatus.NOMINATED]: {
        style: "queue",
        label: "In Queue",
    },
    [ContributionStatus.REJECTED]: {
        style: "rejected",
        label: "Rejected",
    },
    [ContributionStatus.VOTING]: {
        style: "queue",
        label: "In Voting",
    },
    [ContributionStatus.WITHDRAWN]: {
        style: "rejected",
        label: "Withdrawn",
    },
};
const TAG_COLORS = {
    accepted: "#08CA00",
    queue: "#1E88E5",
    rejected: "#E53935",
};
var contributionManagementLayout = () => {
    register()({
        id: "contribution-management-layout",
        name: "Contribution Management Layout",
        authors: ["Tntnnbltn", "bilde2910"],
        description: "Improves the layout of the Contribution Management page",
        defaultConfig: {
            showCurrentWayspotInfobox: true,
            showSummaryOfEdits: true,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("showCurrentWayspotInfobox", {
                label: "Display current Wayspot details and interactive map for edits",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("showSummaryOfEdits", {
                label: "Display a summary of all edits for a given Wayspot",
                editor: new CheckboxEditor(),
            });
            // ---- redesign: the Contribution Management page markup (app-submissions-list-item and Angular's
            // internal data) this addon used to rewrite is gone. The same information is now shown in a window
            // opened with a button at the bottom left (next to the Review history button): all Wayspots you have
            // edits or photos for, with the Wayspot's current details, a map, and a summary of your edits.
            let nominations = null;
            let mapSession = 0;
            const makeTag = (tag) => {
                const span = document.createElement("span");
                span.className = `uwtcml-tag uwtcml-tag--${tag.style}`;
                span.textContent = tag.label;
                return span;
            };
            const tagFor = (data) => wasOverturned(data)
                ? { style: "accepted", label: "Overturned" }
                : STATUS_MAP[data.status];
            const generateEditSummaryTable = (edits, type) => {
                // Sort edits by date in descending order (most recent to oldest)
                const sorted = [...edits].sort((a, b) => b.order - a.order);
                const table = document.createElement("table");
                table.classList.add("uwtcml-edit-summary-table");
                for (const edit of sorted) {
                    const content = (() => {
                        switch (type) {
                            case ContributionType.EDIT_TITLE: return edit.title;
                            case ContributionType.EDIT_DESCRIPTION: return edit.description;
                            case ContributionType.EDIT_LOCATION: return `${edit.lat}, ${edit.lng}`;
                            default: return undefined;
                        }
                    })();
                    const row = table.insertRow();
                    makeChildNode(row, "td", edit.day);
                    makeChildNode(row, "td", content);
                    makeChildNode(row, "td").appendChild(makeTag(tagFor(edit)));
                }
                return table;
            };
            const addSatMap = async (mapDiv, poi, edits, session) => {
                var _a;
                // the page's own Google Maps API (not the userscript sandbox's view of the window) must be loaded
                for (let i = 0; i < 40 && !((_a = uwtGoogle()) === null || _a === void 0 ? void 0 : _a.maps); i++)
                    await new Promise(r => setTimeout(r, 250));
                if (session !== mapSession)
                    return;
                const G = uwtGoogle();
                if (!(G === null || G === void 0 ? void 0 : G.maps)) {
                    mapDiv.textContent = "Google Maps is not loaded on this page. Open a Wayfarer page that shows a map (for example a review), then reopen this window.";
                    return;
                }
                const { lat, lng } = poi;
                const svMap = new G.maps.Map(mapDiv, {
                    center: { lat, lng },
                    mapTypeId: "hybrid",
                    zoom: 17,
                    scaleControl: true,
                    scrollwheel: true,
                    gestureHandling: "greedy",
                    mapTypeControl: true,
                    tiltInteractionEnabled: true,
                });
                const bounds = new G.maps.LatLngBounds();
                bounds.extend({ lat, lng });
                // every suggested location that differs from the Wayspot's current one, coloured by its status
                let drawn = 0;
                for (const edit of edits) {
                    if (edit.type !== ContributionType.EDIT_LOCATION || (edit.lat === lat && edit.lng === lng))
                        continue;
                    const color = TAG_COLORS[tagFor(edit).style];
                    const suggested = { lat: edit.lat, lng: edit.lng };
                    new G.maps.Marker({
                        map: svMap,
                        position: suggested,
                        icon: generateSvgMapMarker(color),
                        title: `${edit.day}: ${tagFor(edit).label}`,
                        zIndex: 4,
                    });
                    const polylineOptions = {
                        map: svMap,
                        path: [{ lat, lng }, suggested],
                        strokeOpacity: 1,
                        geodesic: true,
                    };
                    new G.maps.Polyline({
                        ...polylineOptions,
                        strokeColor: color,
                        strokeWeight: 2,
                        zIndex: 2,
                        icons: [{ icon: {
                                    path: "M 0,0 3,6 M 0,0 -3,6",
                                } }],
                    });
                    new G.maps.Polyline({
                        ...polylineOptions,
                        strokeColor: "#ffffff",
                        strokeWeight: 6,
                        zIndex: 1,
                        icons: [{ icon: {
                                    path: "M 0,0 1,2 M 0,0 -1,2",
                                } }],
                    });
                    bounds.extend(suggested);
                    drawn++;
                }
                new G.maps.Marker({
                    map: svMap,
                    position: { lat, lng },
                    icon: generateSvgMapMarker("#000000"),
                    title: "Current Wayspot location",
                    zIndex: 3,
                });
                if (drawn > 0) {
                    G.maps.event.addListenerOnce(svMap, "bounds_changed", function () {
                        var _a;
                        if (((_a = this.getZoom()) !== null && _a !== void 0 ? _a : 20) > 17)
                            this.setZoom(17);
                    });
                    svMap.fitBounds(bounds);
                }
            };
            const renderDetail = (detail, wayspotEdits) => {
                detail.innerHTML = "";
                const session = ++mapSession;
                const latest = [...wayspotEdits].sort((a, b) => b.order - a.order)[0];
                const poi = latest.poiData;
                const head = makeChildNode(detail, "div");
                head.className = "uwtcml-head";
                makeChildNode(head, "h3", poi.title || "(untitled)");
                if (poi.state === "LIVE") {
                    makeChildNode(head, "span", "Live").className = "uwtcml-tag uwtcml-tag--accepted";
                }
                else if (poi.state === "RETIRED") {
                    const retired = makeChildNode(head, "span", "Retired");
                    retired.className = "uwtcml-tag uwtcml-tag--rejected";
                    retired.title = `Wayspot retired on ${poi.lastUpdateDate}`;
                }
                if (config.get("showCurrentWayspotInfobox")) {
                    const info = makeChildNode(detail, "div");
                    info.className = "uwtcml-info";
                    const details = makeChildNode(info, "div");
                    details.className = "uwtcml-wayspot-details";
                    if (typeof poi.imageUrl === "string" && /^https:\/\//.test(poi.imageUrl)) {
                        const image = makeChildNode(details, "img");
                        image.className = "uwtcml-wd-image";
                        image.src = poi.imageUrl;
                        image.title = "Click to open the full-size image";
                        image.addEventListener("click", () => {
                            window.open(`${poi.imageUrl}=s0`, "_blank");
                        });
                    }
                    makeChildNode(details, "div", poi.description || "<No Description>").className = "uwtcml-wd-description";
                    const mapDiv = makeChildNode(info, "div");
                    mapDiv.className = "uwtcml-satmap";
                    void addSatMap(mapDiv, poi, wayspotEdits, session);
                }
                if (config.get("showSummaryOfEdits")) {
                    const summary = makeChildNode(detail, "div");
                    summary.className = "uwtcml-edits-summary";
                    const editTypes = [
                        {
                            type: ContributionType.EDIT_TITLE,
                            label: "Your Title Edits",
                        }, {
                            type: ContributionType.EDIT_DESCRIPTION,
                            label: "Your Description Edits",
                        }, {
                            type: ContributionType.EDIT_LOCATION,
                            label: "Your Location Edits",
                        },
                    ];
                    let any = false;
                    for (const editType of editTypes) {
                        const edits = wayspotEdits.filter(n => n.type === editType.type);
                        if (edits.length === 0)
                            continue;
                        any = true;
                        const editsContainer = makeChildNode(summary, "div");
                        editsContainer.classList.add("uwtcml-edits-container");
                        makeChildNode(editsContainer, "div", editType.label).classList.add("uwtcml-edits-summary-header");
                        editsContainer.appendChild(generateEditSummaryTable(edits, editType.type));
                    }
                    if (!any)
                        makeChildNode(summary, "p", "No title, description or location edits for this Wayspot.");
                }
            };
            const renderOverview = (body, all) => {
                body.innerHTML = "";
                const edits = all.filter((n) => n.type !== ContributionType.NOMINATION && !!n.poiData && !!n.poiData.id);
                const byWayspot = new Map();
                for (const edit of edits) {
                    let group = byWayspot.get(edit.poiData.id);
                    if (!group) {
                        group = [];
                        byWayspot.set(edit.poiData.id, group);
                    }
                    group.push(edit);
                }
                const latestOrder = (g) => Math.max(...g.map(e => e.order));
                const groups = Array.from(byWayspot.values()).sort((a, b) => latestOrder(b) - latestOrder(a));
                if (groups.length === 0) {
                    makeChildNode(body, "p", "You have no edits or photo submissions yet.");
                    return;
                }
                const side = makeChildNode(body, "div");
                side.className = "uwtcml-side";
                const search = makeChildNode(side, "input");
                search.type = "text";
                search.placeholder = "Search Wayspots";
                const list = makeChildNode(side, "div");
                list.className = "uwtcml-list";
                const detail = makeChildNode(body, "div");
                detail.className = "uwtcml-detail";
                const items = [];
                for (const group of groups) {
                    const poi = [...group].sort((a, b) => b.order - a.order)[0].poiData;
                    const button = makeChildNode(list, "button", `${poi.title || "(untitled)"} (${group.length})`);
                    button.className = "uwtcml-item";
                    button.addEventListener("click", () => {
                        for (const item of items)
                            item.button.classList.toggle("uwtcml-active", item.button === button);
                        renderDetail(detail, group);
                    });
                    items.push({ button, title: (poi.title || "").toLowerCase() });
                }
                search.addEventListener("input", () => {
                    const q = search.value.trim().toLowerCase();
                    for (const item of items)
                        item.button.style.display = item.title.includes(q) ? "" : "none";
                });
                items[0].button.click();
            };
            const openOverview = async () => {
                const { container, dismiss } = await toolbox.createModal("uwtcml-modal");
                if (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")) {
                    container.classList.add("uwt-dark");
                }
                const close = makeChildNode(container, "button", "\u00d7");
                close.className = "uwtcml-x";
                close.addEventListener("click", () => {
                    mapSession++;
                    dismiss();
                });
                makeChildNode(container, "h2", "Edits by Wayspot");
                const body = makeChildNode(container, "div");
                body.className = "uwtcml-body";
                if (nominations === null) {
                    makeChildNode(body, "p", "Loading contributions...");
                    try {
                        const data = await toolbox.makeRequest("GET", "/api/v1/vault/manage");
                        if (data && data.submissions)
                            nominations = data.submissions;
                    }
                    catch (e) {
                        logger.error(e);
                    }
                    body.innerHTML = "";
                }
                if (nominations === null) {
                    makeChildNode(body, "p", "Could not load your contributions.");
                    return;
                }
                renderOverview(body, nominations);
            };
            // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
            toolbox.addMenuItem("contribution-management-layout", {
                label: "Edits by Wayspot",
                icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z\"/></svg>",
                callback: () => { void openOverview(); },
            });
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", (data) => {
                if (data && data.submissions)
                    nominations = data.submissions;
            });
        },
    });
};
const wasOverturned = (data) => data.status === ContributionStatus.REJECTED &&
    ((data.type === ContributionType.EDIT_TITLE && data.title.trim() === data.poiData.title.trim()) ||
        (data.type === ContributionType.EDIT_DESCRIPTION && data.description.trim() === data.poiData.description.trim()) ||
        (data.type === ContributionType.EDIT_LOCATION && data.lat === data.poiData.lat && data.lng === data.poiData.lng) ||
        (data.type === ContributionType.PHOTO && data.imageUrl === data.poiData.imageUrl));
const generateSvgMapMarker = (fillColor) => {
    const icon = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg"
  width="24" height="24" viewBox="0 0 24 24"
  fill="${fillColor}" stroke="#FFFFFF"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  class="feather feather-map-pin">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
</svg>`;
    return `data:image/svg+xml;base64,${btoa(icon)}`;
};// Copyright 2025 bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
const COLUMNS = [
    "id",
    "title",
    "description",
    "lat",
    "lng",
    "status",
    "nickname",
    "submitteddate",
    "responsedate",
    "candidateimageurl",
];
const NOMINATION_STATUS_MAP = {
    [ContributionStatus.ACCEPTED]: "accepted",
    [ContributionStatus.APPEALED]: "appealed",
    [ContributionStatus.DUPLICATE]: "rejected",
    [ContributionStatus.HELD]: "held",
    [ContributionStatus.NIANTIC_REVIEW]: "voting",
    [ContributionStatus.NOMINATED]: "submitted",
    [ContributionStatus.REJECTED]: "rejected",
    [ContributionStatus.VOTING]: "voting",
    [ContributionStatus.WITHDRAWN]: "rejected",
};
var totalReconExporter = () => {
    register()({
        id: "total-recon-exporter",
        name: "Total Recon Exporter",
        authors: ["bilde2910"],
        description: "Automatically send and update data stored in a Total Recon spreadsheet",
        defaultConfig: {
            totalReconUrl: "",
            acceptedStatus: "accepted",
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("totalReconUrl", {
                label: "Apps Script URL",
                help: "The Total Recon script execution URL that you also use in IITC",
                editor: new TextInputEditor({
                    placeholder: "https://script.google.com/macros/s/.../exec",
                }),
            });
            config.setUserEditable("acceptedStatus", {
                label: "When a contribution is accepted",
                editor: new SelectBoxEditor({
                    "accepted": "Mark it as accepted",
                    "delete": "Delete it (requires Total Recon v2/WayFarer Planner)",
                }),
            });
            const handleNominations = async (result) => {
                NOMINATION_STATUS_MAP[ContributionStatus.ACCEPTED] = config.get("acceptedStatus");
                const url = config.get("totalReconUrl");
                if (url === "") {
                    toolbox.notify({
                        color: "red",
                        message: "Total Recon Exporter is not configured and will not work yet. " +
                            "Please enter your script URL in the settings page to enable the exporter.",
                    });
                }
                else {
                    const notification = toolbox.notify({
                        color: "dark-gray",
                        message: "Synchronizing Total Recon data...",
                        icon: LoadingWheel,
                        dismissable: false,
                    });
                    const start = Date.now();
                    try {
                        const trData = await getSheetData(url);
                        const updates = checkUpdates(result.submissions, trData);
                        if (updates.length > 0) {
                            let successes = 0;
                            for (let i = 0; i < updates.length; i++) {
                                logger.info(`Sending entry ${updates[i].entry.id} ` +
                                    `(${updates[i].update ? "updated" : "new"} entry matching ` +
                                    `${updates[i].contribution.title} to ${updates[i].entry.title})...`, updates[i]);
                                notification.updateContents(`Sending ${i + 1}/${updates.length} updates to Total Recon...`);
                                successes += await sendSheetData(url, updates[i].entry) ? 1 : 0;
                            }
                            const stop = Date.now();
                            toolbox.notify({
                                color: "green",
                                message: `Successfully sent ${successes} of ${updates.length} updates to Total Recon in ${(stop - start) / 1000} seconds!`,
                            });
                        }
                    }
                    catch (ex) {
                        logger.error(ex);
                        if (ex instanceof Error) {
                            toolbox.notify({
                                color: "red",
                                message: `Error occurred when processing Total Recon data: ${ex.message}`,
                            });
                        }
                    }
                    finally {
                        notification.dismiss();
                    }
                }
            };
            const getSheetData = async (url) => {
                const resp = await fetch(url);
                const data = await resp.json();
                if (Array.isArray(data)) {
                    return data.map(e => ({
                        ...filterObject(e, COLUMNS),
                        lat: parseFloat(e.lat),
                        lng: parseFloat(e.lng),
                    }));
                }
                else {
                    throw new Error(JSON.stringify(data));
                }
            };
            const sendSheetData = async (url, entry, retries = 3) => {
                // Expects FormData, not JSON, ref.:
                // https://github.com/Wintervorst/iitc/blob/master/plugins/totalrecon/totalrecon.user.js#L453
                const data = new FormData();
                for (const [k, v] of iterObject(entry)) {
                    data.append(k, v.toString());
                }
                try {
                    const resp = await fetch(url, {
                        method: "POST",
                        body: data,
                    });
                    if (!resp.ok) {
                        throw Error(`Response status: ${resp.status}`);
                    }
                    return true;
                }
                catch (ex) {
                    retries--;
                    if (retries > 0) {
                        logger.warn(`Failed to send entry ${entry.id}, retrying ${retries} more time(s)...`, ex);
                        await sleep(30000);
                        return await sendSheetData(url, entry, retries);
                    }
                    else {
                        logger.error(`Failed to send entry ${entry.id}, giving up.`);
                        return false;
                    }
                }
            };
            const checkUpdates = (uwtData, trData) => {
                const updates = [];
                const nominations = uwtData.filter(n => n.type === ContributionType.NOMINATION);
                for (const nomination of nominations) {
                    let entry = findExactMatch(nomination, trData);
                    if (typeof entry !== "undefined") {
                        // Exact match - update status
                        const expected = buildEntry(nomination, entry);
                        if (!deepEquals(entry, expected)) {
                            updates.push({
                                entry: expected,
                                contribution: nomination,
                                update: true,
                            });
                        }
                    }
                    else if (!hasResolved(nomination)) {
                        entry = findNearbyMatch(nomination, trData);
                        // Nearby match - add new entry
                        const newEntry = buildEntry(nomination, entry);
                        updates.push({
                            entry: newEntry,
                            contribution: nomination,
                            update: false,
                        });
                    }
                }
                return updates;
            };
            const buildEntry = (nomination, extend) => {
                var _a, _b;
                return ({
                    id: (_a = extend === null || extend === void 0 ? void 0 : extend.id) !== null && _a !== void 0 ? _a : nomination.id,
                    title: nomination.title,
                    description: nomination.description,
                    lat: nomination.lat,
                    lng: nomination.lng,
                    status: NOMINATION_STATUS_MAP[nomination.status],
                    nickname: toolbox.username,
                    submitteddate: nomination.day,
                    responsedate: (_b = extend === null || extend === void 0 ? void 0 : extend.responsedate) !== null && _b !== void 0 ? _b : "",
                    candidateimageurl: nomination.imageUrl,
                });
            };
            const findExactMatch = (nom, trData) => {
                if (nom.type === ContributionType.NOMINATION) {
                    for (const trEntry of trData) {
                        if (trEntry.candidateimageurl === nom.imageUrl) {
                            return trEntry;
                        }
                    }
                }
            };
            const findNearbyMatch = (nom, trData) => {
                let relevant = trData
                    // Remove already matched entries
                    .filter(n => n.candidateimageurl.trim().length === 0)
                    // Remove wayspots not within a ballpark distance (~1km lat, lng varies)
                    .filter(n => Math.abs(nom.lat - n.lat) < 0.01 && Math.abs(nom.lng - n.lng) < 0.01);
                // Filter away mismatching entry types
                if (nom.type === ContributionType.NOMINATION) {
                    relevant = relevant.filter(n => n.status !== "potentialedit" && n.status !== "sentedit");
                }
                else if (nom.type === ContributionType.EDIT_LOCATION) {
                    relevant = relevant.filter(n => n.status === "potentialedit" || n.status === "sentedit");
                }
                // Sort by shortest distance
                relevant.sort((a, b) => haversine(nom.lat, nom.lng, a.lat, a.lng) - haversine(nom.lat, nom.lng, b.lat, b.lng));
                // Grab the closest one if it's within 20 meter
                if (relevant.length > 0) {
                    const cand = relevant[0];
                    if (haversine(nom.lat, nom.lng, cand.lat, cand.lng) <= 20) {
                        return cand;
                    }
                }
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", handleNominations);
        },
    });
};
const hasResolved = (contribution) => [
    ContributionStatus.ACCEPTED,
    ContributionStatus.REJECTED,
    ContributionStatus.DUPLICATE,
    ContributionStatus.WITHDRAWN,
].includes(contribution.status);// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
const TIMEOUT = 2500;
var autoHold = () => {
    register()({
        id: "auto-hold",
        name: "Auto Hold",
        authors: ["AlterTobi", "bilde2910"],
        description: "Put nomination on hold automatically when supporting statement contains a given text",
        defaultConfig: {
            autoHoldText: "#hold",
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("autoHoldText", {
                label: "Search text (case-insensitve)",
                help: "If this text is found in the supporting statement, automatically hold the nomination",
                editor: new TextInputEditor(),
            });
            const handleNominations = async (result) => {
                const searchFor = config.get("autoHoldText").toLowerCase();
                const toHold = result.submissions
                    .filter(n => n.type === ContributionType.NOMINATION)
                    .filter(n => n.status === ContributionStatus.NOMINATED)
                    .filter(n => n.statement.toLowerCase().includes(searchFor));
                if (toHold.length > 0) {
                    const notification = await toolbox.notify({
                        color: "dark-gray",
                        message: "AutoHold: Processing nominations...",
                        icon: LoadingWheel,
                        dismissable: false,
                    });
                    try {
                        for (let i = 0; i < toHold.length; i++) {
                            logger.info(`Holding "${toHold[i].title}"`);
                            notification.updateContents(`AutoHold: Holding ${i + 1} of ${toHold.length} nomination(s)...`);
                            await sleep(TIMEOUT);
                            await toolbox.makeRequest("POST", "/api/v1/vault/manage/hold", {
                                id: toHold[i].id,
                            });
                        }
                        await toolbox.notify({
                            color: "green",
                            message: "AutoHold: All nominations processed! Please reload the page now.",
                        });
                    }
                    catch (ex) {
                        logger.error(ex);
                        if (ex instanceof Error) {
                            await toolbox.notify({
                                color: "red",
                                message: `AutoHold: Failed to hold nominations: ${ex.message}`,
                            });
                        }
                    }
                    finally {
                        notification.dismiss();
                    }
                }
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", handleNominations);
        },
    });
};// Copyright 2025 bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
// redesign: the static maps are no longer necessarily <nia-google-static-map> elements. A static map is
// recognised by its image URL instead, whether it is an <img> or a background image on any element.
const STATIC_MAP_PATH = "/maps/api/staticmap";
const STATIC_MAP_SELECTOR = `nia-google-static-map, img[src*="${STATIC_MAP_PATH}"], [style*="${STATIC_MAP_PATH}"]`;
const getStaticMapUrl = (el) => {
    var _a, _b;
    const raw = el instanceof HTMLImageElement
        ? (el.currentSrc || el.src)
        : (_b = (_a = el.style.backgroundImage.match(/url\(["']?(?<url>[^"')]+)["']?\)/)) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.url;
    if (!raw || !raw.includes(STATIC_MAP_PATH))
        return;
    try {
        return new URL(raw, location.href);
    }
    catch (_c) {
        return;
    }
};
var dynamicMapsEverywhere = () => {
    register()({
        id: "dynamic-maps-everywhere",
        name: "Interactive Maps Everywhere",
        authors: ["bilde2910"],
        description: "Replaces all static maps with interactive ones, with automatic loading of Street View if desired",
        defaultConfig: {
            mapType: "auto",
            autoLoadStreetView: false,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("mapType", {
                label: "Default map type",
                help: "The type of map to render by default",
                editor: new SelectBoxEditor({
                    "auto": "Determine automatically",
                    "roadmap": "Roadmap",
                    "terrain": "Terrain",
                    "satellite": "Satellite",
                    "hybrid": "Hybrid",
                }),
            });
            config.setUserEditable("autoLoadStreetView", {
                label: "Automatically load Street View if available",
                help: "If Street View is unavailable, the map falls back to the default map type specified above",
                editor: new CheckboxEditor(),
            });
            const replaceMap = (staticMap) => {
                const url = getStaticMapUrl(staticMap);
                if (typeof url !== "undefined") {
                    // the page is scanned repeatedly; skip maps that are already showing this exact static map
                    if (staticMap.__uwtTools_DME_url === url.href) {
                        if (typeof staticMap.__uwtTools_DME !== "undefined") {
                            if (staticMap.__uwtTools_DME.container.isConnected) {
                                // the page may have reset the element's classes, which would show the static map again
                                staticMap.classList.add("uwtdme-hidden");
                                return;
                            }
                            // the page removed our interactive map (it re-rendered the parent); build it again
                            delete staticMap.__uwtTools_DME;
                        }
                        else {
                            return;
                        }
                    }
                    staticMap.__uwtTools_DME_url = url.href;
                    const mapConfig = parseStaticMapUrl(url);
                    if (typeof mapConfig === "undefined")
                        return;
                    if (mapConfig.height === 0 || mapConfig.width === 0)
                        return;
                    logger.info("Replacing static map", mapConfig);
                    let chosenMapType = config.get("mapType");
                    if (chosenMapType === "auto")
                        chosenMapType = mapConfig.mapType;
                    staticMap.classList.add("uwtdme-hidden");
                    if (typeof staticMap.__uwtTools_DME === "undefined") {
                        const node = document.createElement("div");
                        node.classList.add("uwtdme-container");
                        node.__uwtTools_static = staticMap;
                        staticMap.parentElement.insertBefore(node, staticMap);
                        staticMap.__uwtTools_DME = createDynamicMap(node, mapConfig, chosenMapType);
                    }
                    else {
                        reconfigureDynamicMap(staticMap.__uwtTools_DME, mapConfig, chosenMapType);
                    }
                    addDynamicMapMarkers(staticMap.__uwtTools_DME, mapConfig.markers);
                    if (config.get("autoLoadStreetView")) {
                        loadStreetView(staticMap.__uwtTools_DME, mapConfig.markers[0].position)
                            .catch((ex) => {
                            logger.warn("Failed to load Street View", ex);
                        });
                    }
                }
            };
            // the page's own Google Maps API (not the userscript sandbox's view of the window) must be loaded
            untilTruthy(() => { var _a; return (_a = uwtGoogle()) === null || _a === void 0 ? void 0 : _a.maps; }).then(() => {
                const scan = () => {
                    var _a;
                    // remove interactive maps whose static map is gone (the page replaced it, for example for the next review)
                    for (const c of document.querySelectorAll(".uwtdme-container")) {
                        if (!((_a = c.__uwtTools_static) === null || _a === void 0 ? void 0 : _a.isConnected))
                            c.remove();
                    }
                    for (const map of document.querySelectorAll(STATIC_MAP_SELECTOR)) {
                        try {
                            replaceMap(map);
                        }
                        catch (ex) {
                            logger.error(ex);
                        }
                    }
                };
                scan();
                let timer;
                new MutationObserver((mutations) => {
                    // ignore changes inside the interactive maps themselves
                    if (mutations.every(m => m.target instanceof Element && m.target.closest(".uwtdme-container")))
                        return;
                    if (typeof timer === "undefined") {
                        timer = window.setTimeout(() => {
                            timer = undefined;
                            scan();
                        }, 300);
                    }
                }).observe(document.documentElement, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ["style", "src"],
                });
            }).catch(logger.error);
        },
    });
};
const createDynamicMap = (container, mapConfig, chosenMapType) => {
    container.style.width = "100%";
    container.style.height = `${mapConfig.height}px`;
    const G = uwtGoogle();
    const map = new G.maps.Map(container, {
        mapTypeId: chosenMapType,
        scaleControl: true,
        scrollwheel: true,
        gestureHandling: "greedy",
        mapTypeControl: true,
        tiltInteractionEnabled: true,
        styles: mapConfig.styles,
    });
    const pano = map.getStreetView();
    pano.setOptions({
        motionTracking: false,
        imageDateControl: true,
    });
    const markers = [];
    return { container, map, markers, pano };
};
const reconfigureDynamicMap = (dMap, mapConfig, chosenMapType) => {
    var _a;
    dMap.container.style.height = `${mapConfig.height}px`;
    dMap.map.setMapTypeId(chosenMapType);
    dMap.pano.setVisible(false);
    while (dMap.markers.length > 0) {
        (_a = dMap.markers.pop()) === null || _a === void 0 ? void 0 : _a.setMap(null);
    }
};
const addDynamicMapMarkers = (dMap, markers) => {
    const G = uwtGoogle();
    const bounds = new G.maps.LatLngBounds();
    for (const marker of markers) {
        bounds.extend(marker.position);
        dMap.markers.push(new G.maps.Marker({
            map: dMap.map,
            ...marker,
        }));
    }
    G.maps.event.addListenerOnce(dMap.map, "bounds_changed", function () {
        var _a;
        if (((_a = this.getZoom()) !== null && _a !== void 0 ? _a : 20) > 17) {
            this.setZoom(17);
        }
    });
    dMap.map.fitBounds(bounds);
};
const toLiteral = (p) => typeof p.lat === "function" ? { lat: p.lat(), lng: p.lng() } : p;
// Initial compass bearing from one point to another; the Maps "geometry" library may not be loaded on the page.
const bearing = (from, to) => {
    const rad = (x) => x * Math.PI / 180;
    const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat));
    const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
        Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const loadStreetView = async (dMap, position) => {
    const svClient = new (uwtGoogle().maps.StreetViewService);
    const result = await svClient.getPanorama({ location: position, radius: 50 });
    const svLocation = result.data.location.latLng;
    const heading = bearing(toLiteral(svLocation), toLiteral(position));
    dMap.pano.setPov({ heading, pitch: 0 });
    dMap.pano.setPosition(svLocation);
    dMap.pano.setVisible(true);
};
const parseStaticMapUrl = (url) => {
    var _a, _b, _c;
    const size = (_b = (_a = url.searchParams.get("size")) === null || _a === void 0 ? void 0 : _a.match(/^(\d+)x(\d+)$/)) === null || _b === void 0 ? void 0 : _b.slice(1);
    if (!size || size.length < 2)
        return;
    const [width, height] = size;
    const markers = url.searchParams.getAll("markers");
    if (!markers.length)
        return;
    const styles = url.searchParams.getAll("style");
    const mapType = (_c = url.searchParams.get("maptype")) !== null && _c !== void 0 ? _c : "hybrid";
    return {
        width: parseInt(width),
        height: parseInt(height),
        mapType,
        styles: styles
            .map(spc => parseStyle(spc)),
        markers: markers
            .map(spc => parseMarker(spc))
            .reduce((p, c) => { p.push(...c); return p; }, []),
    };
};
const parseStyle = (style) => {
    const styleSpec = style.split("|");
    const mapsStyle = {
        stylers: [],
    };
    for (const arg of styleSpec) {
        const key = arg.substring(0, arg.indexOf(":"));
        const value = arg.substring(arg.indexOf(":") + 1);
        if (key === "element")
            mapsStyle.elementType = value;
        else if (key === "feature")
            mapsStyle.featureType = value;
        else
            mapsStyle.stylers.push({ [key]: convertStaticStyles(value) });
    }
    return mapsStyle;
};
const convertStaticStyles = (value) => {
    if (value.startsWith("0x"))
        return `#${value.substring(2)}`;
    else if (value.match(/^-?\d+$/))
        return parseInt(value);
    else if (value.match(/^-?\d+\.\d+$/))
        return parseFloat(value);
    else
        return value;
};
const parseMarker = (marker) => {
    if (marker.indexOf("|") <= 0)
        return [];
    const markerSpec = marker.split("|");
    const style = {};
    while (markerSpec.length > 0 && markerSpec[0].includes(":")) {
        const s = markerSpec.shift();
        style[s.substring(0, s.indexOf(":"))] = s.substring(s.indexOf(":") + 1);
    }
    return markerSpec
        .filter(spc => spc.includes(","))
        .map(spc => spc.split(",").map(coord => parseFloat(coord)))
        .map(([lat, lng]) => {
        var _a;
        return ({
            position: { lat, lng },
            icon: (_a = style.icon) === null || _a === void 0 ? void 0 : _a.replace(/^(https?:)(?!\/\/)/, "$1//"),
        });
    });
};// Copyright 2025 bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var widescreenReview = () => {
    register()({
        id: "widescreen-review",
        name: "Widescreen Review",
        authors: ["bilde2910"],
        description: "Improves the review interface to be more comfortable on desktop by switching to a three-column layout",
        defaultConfig: {},
        sessionData: {},
        initialize: (toolbox, logger, _config) => {
            const updateView = (ref) => {
                var _a, _b;
                (_a = ref.closest("mat-sidenav-content > .max-w-7xl")) === null || _a === void 0 ? void 0 : _a.classList.remove("max-w-7xl");
                ref.classList.add("uwtwsr-root-new");
                logger.info("ref", ref);
                console.log(ref.querySelectorAll("div"));
                const columns = [...ref.children].filter(node => node.tagName === "DIV").map(node => node);
                logger.info(columns);
                columns.push(makeChildNode(ref, "div"));
                const [c1, c2, c3] = columns;
                for (const col of columns) {
                    for (let i = col.children.length - 1; i >= 0; i--) {
                        if (["P", "H4"].includes(col.children[i].tagName)) {
                            col.children[i].remove();
                        }
                    }
                }
                c1.classList.add("flex", "gap-3");
                c2.classList.remove("review-questions");
                c3.classList.add("flex", "flex-col", "gap-3", "review-questions");
                const supportingBox = document.createElement("div");
                c2.insertAdjacentElement("afterbegin", supportingBox);
                c2.insertAdjacentElement("afterbegin", c1.querySelector("app-title-and-description-b"));
                const supportingCard = makeChildNode(supportingBox, "wf-review-card");
                supportingCard.classList.add("wf-review-card", "card");
                supportingCard.appendChild(c1.querySelector("app-supporting-info-b .wf-review-card__header").cloneNode(true));
                const cardBody = makeChildNode(supportingCard, "div");
                cardBody.classList.add("wf-review-card__body");
                cardBody.appendChild((_b = c1.querySelector("app-supporting-info-b .wf-review-card__body .wf-image-modal + div")) !== null && _b !== void 0 ? _b : c1.querySelector("app-supporting-info-b .wf-review-card__body div"));
                for (const question of c2.querySelectorAll("app-question-card")) {
                    c3.appendChild(question);
                    const thumbsRow = document.createElement("div");
                    thumbsRow.classList.add("uwtwsr-thumbs-row");
                    question.querySelector(".action-buttons-row").insertAdjacentElement("afterbegin", thumbsRow);
                    for (const thumb of question.querySelectorAll(".thumbs-button")) {
                        thumbsRow.appendChild(thumb);
                    }
                    const title = question.querySelector(".question-title");
                    //const helpText = question.querySelector(".title-and-subtitle-row > div")!;
                    const tooltip = question.querySelector(".question-subtitle-tooltip");
                    if (tooltip)
                        title.appendChild(tooltip);
                    /*
                    const container = title.closest(".main-section-container")!;
                    container.parentElement!.insertAdjacentElement("afterbegin", helpText);*/
                }
                c3.appendChild(c2.querySelector("app-review-categorization-b"));
            };
            toolbox.observeAddedNodes("APP-REVIEW-NEW-B", (node) => updateView(node.children[0]));
        },
    });
};// Copyright 2025 bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var betterDiff = () => {
    register()({
        id: "better-diff",
        name: "Better Diffs",
        authors: ["bilde2910"],
        description: "Improves the text difference display for text edits",
        defaultConfig: {
            threshold: 85,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("threshold", {
                label: "Similarity threshold (0-100%)",
                help: "How similar edits must be to each other before diffs are shown",
                editor: new NumericInputEditor({ min: 0, max: 100, step: 0.1 }),
            });
            let review = null;
            const handleReview = (result) => {
                if (result.type === "EDIT")
                    review = result;
            };
            const updateDiff = (node) => {
                var _a, _b;
                const radio = (_a = node.closest("mat-radio-button")) === null || _a === void 0 ? void 0 : _a.querySelector("input[type=\"radio\"]");
                if (!review || !radio) {
                    logger.warn("No edit review and/or radio button found for diff node", node);
                    return;
                }
                const hash = radio.value;
                let options = [];
                if (review.titleEdits.some(v => v.hash === hash))
                    options = review.titleEdits;
                else if (review.descriptionEdits.some(v => v.hash === hash))
                    options = review.descriptionEdits;
                if (options.length === 0) {
                    logger.warn("No text candidates found in the current review for diff item", hash, node);
                    return;
                }
                const analysis = analyzeOptions(options, config.get("threshold") / 100);
                logger.info("Calculated diff analysis", analysis);
                if (typeof analysis[hash] === "undefined") {
                    logger.warn("Cannot find analysis entry for hash", hash, review);
                    return;
                }
                (_b = node.querySelector("fragment")) === null || _b === void 0 ? void 0 : _b.remove();
                const display = makeChildNode(node, "span");
                for (const part of analysis[hash]) {
                    const span = makeChildNode(display, "span", part.contents);
                    if (part.differs)
                        span.classList.add("uwftbdiff-differs");
                }
            };
            toolbox.observeAddedNodes("APP-REVIEW-TEXT-DIFF", updateDiff);
            toolbox.interceptOpenJson("GET", "/api/v1/vault/review", handleReview);
        },
    });
};
const analyzeOptions = (opts, threshold) => {
    const l = opts.length;
    const grid = matrix(l);
    for (let i = 0; i < l; i++) {
        const opt_i = opts[i].value;
        for (let j = i + 1; j < l; j++) {
            const opt_j = opts[j].value;
            const maxLen = Math.max(opt_i.length, opt_j.length);
            const dist = maxLen > 0 ? levDist(opt_i, opt_j) / maxLen : 0;
            const sim = 1 - dist;
            grid[i][j] = sim;
        }
    }
    const pooled = [];
    const pools = [];
    for (let i = 0; i < l; i++) {
        if (pooled.includes(i))
            continue;
        const visited = [];
        const queue = [i];
        const pool = [i];
        while (queue.length) {
            const cur = queue.pop();
            visited.push(cur);
            for (let j = cur + 1; j < l; j++) {
                if (grid[cur][j] > threshold) {
                    if (!pool.includes(j))
                        pool.push(j);
                    if (!pooled.includes(j))
                        pooled.push(j);
                    if (!visited.includes(j))
                        queue.push(j);
                }
            }
        }
        if (pool.length > 1) {
            pools.push(pool);
        }
    }
    const results = {};
    for (let i = 0; i < pools.length; i++) {
        let base = opts[pools[i][0]].value;
        for (let j = 1; j < pools[i].length; j++) {
            const diff$1 = diff.diffChars(base, opts[pools[i][j]].value);
            base = "";
            for (let k = 0; k < diff$1.length; k++) {
                if (diff$1[k].added || diff$1[k].removed)
                    continue;
                base += diff$1[k].value;
            }
        }
        for (let j = 0; j < pools[i].length; j++) {
            results[opts[pools[i][j]].hash] = [];
            let add = false;
            const diff$1 = diff.diffChars(base, opts[pools[i][j]].value);
            for (let k = 0; k < diff$1.length; k++) {
                if (diff$1[k].added) {
                    add = true;
                }
                else if (!diff$1[k].removed) {
                    add = false;
                }
                results[opts[pools[i][j]].hash].push({
                    contents: diff$1[k].value,
                    differs: add,
                });
            }
        }
    }
    return results;
};
// The following function is sourced from James Westgate on Stack Overflow:
// https://stackoverflow.com/a/11958496/1955334
const levDist = (s, t) => {
    const d = []; //2d matrix
    // Step 1
    const n = s.length;
    const m = t.length;
    if (n == 0)
        return m;
    if (m == 0)
        return n;
    // Create an array of arrays in javascript (a descending loop is quicker)
    for (let i = n; i >= 0; i--)
        d[i] = [];
    // Step 2
    for (let i = n; i >= 0; i--)
        d[i][0] = i;
    for (let j = m; j >= 0; j--)
        d[0][j] = j;
    // Step 3
    for (let i = 1; i <= n; i++) {
        const s_i = s.charAt(i - 1);
        // Step 4
        for (let j = 1; j <= m; j++) {
            // Check the jagged ld total so far
            if (i == j && d[i][j] > 4)
                return n;
            const t_j = t.charAt(j - 1);
            const cost = (s_i == t_j) ? 0 : 1; // Step 5
            // Calculate the minimum
            let mi = d[i - 1][j] + 1;
            const b = d[i][j - 1] + 1;
            const c = d[i - 1][j - 1] + cost;
            if (b < mi)
                mi = b;
            if (c < mi)
                mi = c;
            d[i][j] = mi; // Step 6
            // Damerau transposition
            if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }
    // Step 7
    return d[n][m];
};
const matrix = (size) => {
    const m = [];
    for (let i = size; i >= 0; i--)
        m[i - 1] = [];
    return m;
};// Copyright 2025 bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
const STATUS_LABELS = {
    [ContributionStatus.NOMINATED]: "In Queue",
    [ContributionStatus.VOTING]: "In Voting",
    [ContributionStatus.HELD]: "On Hold",
    [ContributionStatus.ACCEPTED]: "Accepted",
    [ContributionStatus.REJECTED]: "Rejected",
    [ContributionStatus.DUPLICATE]: "Duplicate",
    [ContributionStatus.WITHDRAWN]: "Withdrawn",
    [ContributionStatus.APPEALED]: "Appealed",
    [ContributionStatus.NIANTIC_REVIEW]: "Niantic Review",
};
var proximityBlock = () => {
    register()({
        id: "proximity-block",
        name: "Proximity Block",
        authors: ["bilde2910"],
        description: "Find other nearby nominations that are blocking, or would be blocked by, each nomination",
        defaultConfig: {},
        sessionData: {},
        initialize: (toolbox, logger, _config) => {
            // ---- redesign: the Contribution Management page (app-submissions-list-item tags, the details pane and
            // Angular's internal data) this addon used to add labels and tables to is gone. The same information is
            // now shown in a window opened from the Wayfarer Tools menu.
            let nominations = [];
            let loaded = false;
            const handleNominations = (result) => {
                nominations = result.submissions.filter(s => s.type === ContributionType.NOMINATION);
                loaded = true;
            };
            const getConflictingS2L17Cells = (lat, lng) => {
                const center = s2Geometry.S2.S2Cell.FromLatLng(s2Geometry.S2.L.LatLng(lat, lng), 17);
                const neighbors = center.getNeighbors();
                const conflicting = [center, ...neighbors];
                for (const neighbor of neighbors) {
                    const possibleCorners = neighbor.getNeighbors()
                        .filter(c => !conflicting.some(n => n.toString() === c.toString()));
                    for (const cand of possibleCorners) {
                        const cornerNeighbors = cand.getNeighbors().filter(c => neighbors.some(n => n.toString() === c.toString())).length;
                        // A candidate is a corner if two of the corner's neighbors are also neighbors of the center cell
                        if (cornerNeighbors === 2)
                            conflicting.push(cand);
                    }
                }
                return conflicting;
            };
            const proximityBlockingFor = (nom) => {
                const conflicting = getConflictingS2L17Cells(nom.lat, nom.lng).map(c => c.toString());
                const blockingNoms = nominations
                    .filter(n => !n.upgraded &&
                    (n.status === ContributionStatus.NOMINATED ||
                        n.status === ContributionStatus.VOTING ||
                        n.status === ContributionStatus.HELD))
                    .filter(n => n.id !== nom.id)
                    .filter(n => conflicting.includes(s2Geometry.S2.S2Cell.FromLatLng(n, 17).toString()));
                return blockingNoms;
            };
            const isActive = (n) => !n.upgraded && (n.status === ContributionStatus.NOMINATED ||
                n.status === ContributionStatus.VOTING ||
                n.status === ContributionStatus.HELD);
            // If the current Wayspot data is blocked by another in-voting nomination, it is "proximity blocked".
            const isProximityBlocked = (nom, blocking) => nom.status === ContributionStatus.NOMINATED && !nom.upgraded &&
                blocking.some(n => n.status === ContributionStatus.VOTING);
            const makeTag = (label, style) => {
                const span = document.createElement("span");
                span.className = `uwtpb-tag uwtpb-tag--${style}`;
                span.textContent = label;
                return span;
            };
            const makeTable = (title, nominations) => {
                var _a;
                const container = document.createElement("div");
                container.classList.add("uwftpb-container");
                const header = makeChildNode(container, "div", title);
                header.classList.add("uwftpb-header");
                const table = makeChildNode(container, "table");
                table.classList.add("uwftpb-table");
                // Sort nominations by date in descending order (most recent to oldest)
                nominations.sort((a, b) => b.order - a.order);
                // Populate table with nomination data
                for (const nom of nominations) {
                    const row = table.insertRow();
                    makeChildNode(row, "td", nom.day);
                    makeChildNode(row, "td", nom.title);
                    makeChildNode(makeChildNode(row, "td"), "span").replaceWith(makeTag((_a = STATUS_LABELS[nom.status]) !== null && _a !== void 0 ? _a : "Unknown", "queue"));
                }
                return container;
            };
            const renderDetail = (detail, data, blocking) => {
                var _a;
                detail.innerHTML = "";
                const head = makeChildNode(detail, "div");
                head.className = "uwtpb-head";
                makeChildNode(head, "h3", data.title || "(untitled)");
                head.appendChild(makeTag((_a = STATUS_LABELS[data.status]) !== null && _a !== void 0 ? _a : data.status, "queue"));
                if (isProximityBlocked(data, blocking))
                    head.appendChild(makeTag("Proximity Blocked", "blocked"));
                const blockedBy = [];
                const willBlock = [];
                for (const other of blocking) {
                    if (other.status === ContributionStatus.VOTING) {
                        blockedBy.push(other);
                    }
                    else {
                        willBlock.push(other);
                    }
                }
                if (blockedBy.length && data.status !== ContributionStatus.VOTING) {
                    const header = `Currently proximity blocked by (${blockedBy.length})`;
                    detail.appendChild(makeTable(header, blockedBy));
                }
                if (willBlock.length) {
                    const header = data.status === ContributionStatus.VOTING
                        ? `Currently proximity blocking (${willBlock.length})`
                        : `Will proximity block or be blocked by (${willBlock.length})`;
                    detail.appendChild(makeTable(header, willBlock));
                }
                if (!detail.querySelector(".uwftpb-container")) {
                    makeChildNode(detail, "p", "No other nominations currently block or are blocked by this one.");
                }
            };
            const openProximityWindow = async () => {
                const { container, dismiss } = await toolbox.createModal("uwtpb-modal");
                if (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")) {
                    container.classList.add("uwt-dark");
                }
                const close = makeChildNode(container, "button", "\u00d7");
                close.className = "uwtpb-x";
                close.addEventListener("click", dismiss);
                makeChildNode(container, "h2", "Proximity blocks");
                const body = makeChildNode(container, "div");
                body.className = "uwtpb-body";
                if (!loaded) {
                    makeChildNode(body, "p", "Loading nominations...");
                    try {
                        const data = await toolbox.makeRequest("GET", "/api/v1/vault/manage");
                        if (data && data.submissions)
                            handleNominations(data);
                    }
                    catch (e) {
                        logger.error(e);
                    }
                    body.innerHTML = "";
                }
                if (!loaded) {
                    makeChildNode(body, "p", "Could not load your nominations.");
                    return;
                }
                const side = makeChildNode(body, "div");
                side.className = "uwtpb-side";
                const allLabel = makeChildNode(side, "label");
                allLabel.className = "uwtpb-all";
                const allBox = makeChildNode(allLabel, "input");
                allBox.type = "checkbox";
                allLabel.appendChild(document.createTextNode(" Include nominations that are no longer active"));
                const list = makeChildNode(side, "div");
                list.className = "uwtpb-list";
                const detail = makeChildNode(body, "div");
                detail.className = "uwtpb-detail";
                const cache = new Map();
                const relationsFor = (nom) => {
                    let r = cache.get(nom.id);
                    if (!r) {
                        r = proximityBlockingFor(nom);
                        cache.set(nom.id, r);
                    }
                    return r;
                };
                const rebuild = () => {
                    var _a;
                    list.innerHTML = "";
                    detail.innerHTML = "";
                    const related = nominations
                        .filter(n => allBox.checked || isActive(n))
                        .map(n => ({ nom: n, blocking: relationsFor(n) }))
                        .filter(e => e.blocking.length > 0)
                        .sort((a, b) => b.nom.order - a.nom.order);
                    if (related.length === 0) {
                        makeChildNode(list, "p", "None of your nominations are currently affected by proximity blocking.");
                        return;
                    }
                    const buttons = [];
                    for (const { nom, blocking } of related) {
                        const button = makeChildNode(list, "button");
                        button.className = "uwtpb-item";
                        makeChildNode(button, "span", nom.title || "(untitled)");
                        const blocked = isProximityBlocked(nom, blocking);
                        makeChildNode(button, "small", `${(_a = STATUS_LABELS[nom.status]) !== null && _a !== void 0 ? _a : nom.status}${blocked ? " - Proximity Blocked" : ""}`);
                        button.addEventListener("click", () => {
                            for (const b of buttons)
                                b.classList.toggle("uwtpb-active", b === button);
                            renderDetail(detail, nom, blocking);
                        });
                        buttons.push(button);
                    }
                    buttons[0].click();
                };
                allBox.addEventListener("change", rebuild);
                rebuild();
            };
            // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
            toolbox.addMenuItem("proximity-block", {
                label: "Proximity blocks",
                icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"22\" y1=\"12\" x2=\"18\" y2=\"12\"/><line x1=\"6\" y1=\"12\" x2=\"2\" y2=\"12\"/><line x1=\"12\" y1=\"6\" x2=\"12\" y2=\"2\"/><line x1=\"12\" y1=\"22\" x2=\"12\" y2=\"18\"/></svg>",
                callback: () => { void openProximityWindow(); },
            });
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", handleNominations);
        },
    });
};// Copyright 2025 bilde2910
// This file is part of the Unified Wayfarer Tools collection.
var showcaseTracker = () => {
    register()({
        id: "showcase-tracker",
        name: "Showcase Tracker",
        authors: ["bilde2910"],
        description: "Tracks history of showcased nominations, and highlights showcased nominations on the Contributions page.",
        defaultConfig: {},
        sessionData: {},
        initialize: (toolbox, logger, _config) => {
            const getLatestStoredShowcase = async () => {
                var _a, _b;
                const env_1 = { stack: [], error: void 0, hasError: false };
                try {
                    const idb = __addDisposableResource(env_1, await toolbox.openIDB("showcases", "readonly"), false);
                    const keys = (await idb.keys()).sort((a, b) => b - a);
                    for (const k of keys) {
                        const sc = await idb.get(k);
                        return {
                            matchedShowcase: sc,
                            latestKey: (_a = keys[0]) !== null && _a !== void 0 ? _a : -1,
                        };
                    }
                    return {
                        matchedShowcase: null,
                        latestKey: (_b = keys[0]) !== null && _b !== void 0 ? _b : -1,
                    };
                }
                catch (e_1) {
                    env_1.error = e_1;
                    env_1.hasError = true;
                }
                finally {
                    __disposeResources(env_1);
                }
            };
            const storeShowcase = async (id, showcase) => {
                const env_2 = { stack: [], error: void 0, hasError: false };
                try {
                    const idb = __addDisposableResource(env_2, await toolbox.openIDB("showcases", "readwrite"), false);
                    idb.put({
                        id,
                        storedAt: Date.now(),
                        showcase,
                    });
                    idb.commit();
                }
                catch (e_2) {
                    env_2.error = e_2;
                    env_2.hasError = true;
                }
                finally {
                    __disposeResources(env_2);
                }
            };
            const handleShowcase = async (sc) => {
                const s2cell = getShowcaseS2Cell(sc.showcase);
                const result = await getLatestStoredShowcase();
                if (result.matchedShowcase !== null) {
                    const guid1 = sc.showcase.map(n => n.guid);
                    const guid2 = result.matchedShowcase.showcase.map(n => n.guid);
                    if (deepEquals(guid1, guid2))
                        return;
                }
                logger.info("Found new showcase for S2 cell", s2cell);
                await storeShowcase(result.latestKey + 1, sc.showcase);
            };
            const detectAppListItems = async () => {
                // Build dataset
                const allShowcasedWayspots = [];
                {
                    const env_3 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_3, await toolbox.openIDB("showcases", "readonly"), false);
                        const showcases = await idb.getAll();
                        for (const sc of showcases) {
                            for (const n of sc.showcase) {
                                allShowcasedWayspots.push({
                                    ...n,
                                    _scId: sc.id,
                                    _scAt: sc.storedAt,
                                });
                            }
                        }
                    }
                    catch (e_3) {
                        env_3.error = e_3;
                        env_3.hasError = true;
                    }
                    finally {
                        __disposeResources(env_3);
                    }
                }
                // Wait for element
                const parentContainer = await untilTruthy(() => document.querySelector(".submissions"));
                // Scan existing elements
                const existingItems = parentContainer.querySelectorAll("app-submissions-list-item");
                for (const item of existingItems)
                    formatItem(item, allShowcasedWayspots);
                // Set up MutationObserver for new elements
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeName === "APP-SUBMISSIONS-LIST-ITEM") {
                                formatItem(node, allShowcasedWayspots);
                            }
                        }
                    }
                });
                observer.observe(parentContainer, {
                    childList: true,
                    subtree: true,
                });
            };
            const formatItem = (item, allShowcasedWayspots) => {
                renderShowcaseLabel(item);
                const data = item.__ngContext__[22];
                if (data.type !== ContributionType.NOMINATION)
                    return;
                const filtered = allShowcasedWayspots.filter(n => n.imageUrl === data.imageUrl);
                if (filtered.length > 0) {
                    renderShowcaseLabel(item, filtered[0]);
                    //item.addEventListener("click", () => interceptDetailsPane(data));
                }
            };
            const renderShowcaseLabel = (item, showcase) => {
                // Remove uwtsct-star class if already present
                const starTags = item.querySelectorAll(".uwtsct-star");
                for (let i = starTags.length - 1; i >= 0; i--)
                    starTags[i].remove();
                if (typeof showcase === "undefined")
                    return;
                // Add a new star
                const nominationTagSet = item.querySelector("app-submission-tag-set");
                if (nominationTagSet) {
                    const newTag = makeChildNode(nominationTagSet, "app-submission-tag");
                    newTag.classList.add("mr-1", "uwtsct-star");
                    newTag.title = `Seen on showcase on ${toUtcIsoDate(new Date(showcase._scAt))}`;
                    const newTagContent = makeChildNode(newTag, "div", "\u2b50");
                    newTagContent.classList.add("submission-tag", "ng-star-inserted");
                }
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/home", handleShowcase);
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", detectAppListItems);
        },
    });
};
const getShowcaseS2Cell = (showcase) => {
    const cellSet = new Set();
    for (const n of showcase) {
        const cell = s2Geometry.S2.S2Cell.FromLatLng(s2Geometry.S2.L.LatLng(n.lat, n.lng), 6).toString();
        cellSet.add(cell);
    }
    return cellSet;
};var SidebarIcon = "data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20viewBox%3D%220%200%2075.117706%2057.754716%22%20version%3D%221.1%22%20width%3D%2275.117706%22%20height%3D%2257.754719%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Asvg%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%20%20%3Cpath%20d%3D%22m%2037.614709%2C0%20c%20-20.712%2C0%20-37.50299954%2C11.264%20-37.50299954%2C25.166%200%2C7.494%204.88500004%2C14.218%2012.62799954%2C18.828%20-1.648%2C3.054%20-4.9049995%2C6.951%20-11.6399995%2C12.234%20-1.10000003673%2C0.862%20-2.474%2C2.11%201.974%2C1.221%207.4479995%2C-1.49%2015.3959995%2C-5.288%2021.4549995%2C-8.693%204.075%2C1.019%208.482%2C1.577%2013.087%2C1.577%2020.711%2C0%2037.502%2C-11.264%2037.502%2C-25.166%200%2C-13.902%20-16.792%2C-25.167%20-37.503%2C-25.167%20z%22%20%2F%3E%3C%2Fsvg%3E";// Copyright 2026 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
const HELPSHIFT_HELPER_UUID = "de5a619c-2de7-4b1e-8eef-190397c0ad62";
var ticketSaver = () => {
    register()({
        id: "ticket-saver",
        name: "Ticket Saver",
        authors: ["tehstone", "bilde2910"],
        description: "Saves interactions with Niantic Support initiated through Wayfarer.",
        depends: {
            "Helpshift Helper for UWT": "https://static.varden.info/wayfarer-tools/dist/uwt-helpshift-helper.user.js",
        },
        defaultConfig: {
            showImportButton: true,
        },
        sessionData: {},
        initialize: (toolbox, logger, config) => {
            config.setUserEditable("showImportButton", {
                label: "Enable backup data import",
                help: "Adds a sidebar button to import old data from Wayfarer Ticket Saver",
                editor: new CheckboxEditor(),
            });
            const processUpdate = async (update) => {
                var _a;
                if ((_a = update === null || update === void 0 ? void 0 : update.issues) === null || _a === void 0 ? void 0 : _a.length) {
                    const updates = update.issues.map(raw => filterIssue(raw));
                    await importChanges(updates);
                }
            };
            const importChanges = async (issues) => {
                const env_1 = { stack: [], error: void 0, hasError: false };
                try {
                    const idb = __addDisposableResource(env_1, await toolbox.openIDB("tickets", "readwrite"), false);
                    for (const issue of issues) {
                        if (issue.type === "issue") {
                            try {
                                const existing = await idb.get(issue.id);
                                const msgs = existing.messages;
                                const storedMsgIDs = msgs.map(msg => msg.id);
                                for (const msg of issue.messages) {
                                    if (!storedMsgIDs.includes(msg.id)) {
                                        msgs.push(msg);
                                    }
                                }
                                logger.info(`Logged new message(s) for support ticket #${issue.id}`);
                                idb.put({ ...issue, messages: msgs });
                            }
                            catch (ex) {
                                if (ex instanceof KeyNotFoundError) {
                                    logger.info(`New support ticket #${issue.id} was logged`);
                                    idb.put(issue);
                                }
                                else {
                                    logger.error(ex);
                                }
                            }
                        }
                    }
                }
                catch (e_1) {
                    env_1.error = e_1;
                    env_1.hasError = true;
                }
                finally {
                    __disposeResources(env_1);
                }
            };
            const filterIssue = (issue) => {
                const cast = issue;
                cast.id = issue.publish_id;
                delete cast.publish_id;
                cast.messages.forEach(msg => {
                    if (msg.author)
                        msg.author.emails = undefined;
                });
                return cast;
            };
            window.addEventListener("message", async (ev) => {
                try {
                    const { uuid, data } = ev.data;
                    if (uuid === HELPSHIFT_HELPER_UUID) {
                        await processUpdate(data);
                    }
                }
                catch (ex) {
                    logger.error(ex);
                }
            });
            const getHTMLSearchRegex = (query) => {
                // Generate a regex that ensures our match (query) is not part
                // of an XML start tag or entity using a negative lookahead.
                // Adapted from the spec at https://www.w3.org/TR/xml/
                // (but not guaranteed to be accurate).
                const nameStartChars = ":A-Za-z_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF" +
                    "\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F" +
                    "\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
                const nameChars = nameStartChars +
                    "\\-\\.0-9\u00B7\u0300-\u036F\u203F-\u2040";
                const name = `([${nameStartChars}][${nameChars}]*)`;
                const entityFragment = `&(${name}|#([Xx]?(0-9A-Fa-f)*|(0-9)*))?`;
                const attrFragmentDQ = `"([^<&"]|${entityFragment};)*`;
                const attrFragmentSQ = `'([^<&']|${entityFragment};)*`;
                const attribute = `${name}\\s*=\\s*(${attrFragmentDQ}"|${attrFragmentSQ}')`;
                const attrFragment = `${name}?\\s*=?\\s*(${attrFragmentDQ}|${attrFragmentSQ})?`;
                const sTagFragment = `<${name}(\\s*${attribute})*(\\s*${attrFragment})?`;
                return new RegExp(`(?<!(${entityFragment}|${sTagFragment}))` + query.replaceAll(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"), "gi");
            };
            const humanSize = (size) => {
                const prefixes = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
                let tmp = size;
                let index = 0;
                while (tmp > 1024) {
                    index++;
                    tmp /= 1024;
                }
                return (index == 0 ? tmp : tmp.toFixed(tmp < 100 ? 2 : 1)) + " " + prefixes[index];
            };
            const showTicketHistoryModal = async () => {
                const outer = document.createElement("div");
                outer.classList.add("uwtSTH-bg");
                document.querySelector("body").appendChild(outer);
                const inner = makeChildNode(outer, "div");
                inner.classList.add("uwtSTH-popup");
                makeChildNode(inner, "h1", "Support ticket history");
                const closeBtn = makeChildNode(inner, "div", "❌");
                closeBtn.title = "Close";
                closeBtn.classList.add("uwtSTH-close");
                closeBtn.addEventListener("click", () => {
                    outer.parentNode.removeChild(outer);
                });
                const searchBtn = makeChildNode(inner, "div", "🔍");
                const searchBox = makeChildNode(inner, "input");
                searchBtn.title = "Search";
                searchBtn.classList.add("uwtSTH-close");
                searchBtn.addEventListener("click", () => {
                    inner.removeChild(searchBtn);
                    searchBox.style.display = "block";
                    searchBox.focus();
                });
                const searchCache = [];
                searchBox.placeholder = "Search...";
                searchBox.classList.add("uwtSTH-search");
                searchBox.addEventListener("input", () => {
                    const query = searchBox.value.toLowerCase();
                    const dummy = document.createElement("div");
                    searchCache.forEach(({ issue, e, refresh }) => {
                        if (!query.length) {
                            e.style.display = "block";
                        }
                        else {
                            let matches = false;
                            for (let i = 0; i < issue.messages.length; i++) {
                                if ([
                                    "Bot Started",
                                    "Bot Ended",
                                    "Confirmation Accepted",
                                ].includes(issue.messages[i].type))
                                    continue;
                                dummy.textContent = query;
                                const queryHTML = dummy.innerHTML;
                                dummy.innerHTML = issue.messages[i].body.toLowerCase();
                                if (dummy.innerHTML.match(getHTMLSearchRegex(queryHTML))) {
                                    matches = true;
                                    break;
                                }
                            }
                            e.style.display = matches ? "block" : "none";
                        }
                        if ([...e.classList].includes("wfSTH-selected"))
                            refresh();
                    });
                });
                const exportBtn = makeChildNode(inner, "div", "📤");
                exportBtn.title = "Export";
                exportBtn.classList.add("uwtSTH-close");
                exportBtn.addEventListener("click", async () => {
                    const env_3 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_3, await toolbox.openIDB("tickets", "readonly"), false);
                        const allTickets = await idb.getAll();
                        const blob = new Blob([JSON.stringify(allTickets)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.setAttribute("download", "wayfarer-ticket-saver.json");
                        anchor.href = url;
                        anchor.setAttribute("target", "_blank");
                        anchor.click();
                        URL.revokeObjectURL(url);
                    }
                    catch (e_3) {
                        env_3.error = e_3;
                        env_3.hasError = true;
                    }
                    finally {
                        __disposeResources(env_3);
                    }
                });
                const box = makeChildNode(inner, "div");
                box.classList.add("uwtSTH-box");
                const list = makeChildNode(box, "div");
                list.classList.add("uwtSTH-list");
                const chat = makeChildNode(box, "div");
                chat.classList.add("uwtSTH-chat");
                const showTicket = (listItem, issue, refresh) => {
                    document.querySelectorAll(".uwtSTH-selected").forEach(e => e.classList.remove("uwtSTH-selected"));
                    listItem.classList.add("uwtSTH-selected");
                    if (!refresh)
                        chat.scrollTop = 0;
                    chat.innerHTML = "";
                    logger.info("Displaying issue ticket", issue);
                    issue.messages.sort((a, b) => a.created_at - b.created_at);
                    issue.messages.forEach(msg => {
                        switch (msg.type) {
                            case "Bot Started":
                            case "Bot Ended":
                            case "Confirmation Accepted":
                                return;
                        }
                        const direction = msg.author.roles.length == 1 && msg.author.roles[0] == "user" ? "sent" : "received";
                        const msgBox = makeChildNode(chat, "div");
                        msgBox.classList.add("uwtSTH-message");
                        msgBox.classList.add("uwtSTH-msgState-" + direction);
                        makeChildNode(msgBox, "p", new Date(msg.created_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "medium",
                        }));
                        const bubble = makeChildNode(msgBox, "div");
                        bubble.classList.add("uwtSTH-chatBubble");
                        const highlightSearch = (html) => {
                            if (!searchBox.value.length)
                                return html;
                            const dummy = document.createElement("div");
                            dummy.textContent = searchBox.value.toLowerCase();
                            const query = dummy.innerHTML;
                            dummy.innerHTML = html;
                            return dummy.innerHTML.replaceAll(getHTMLSearchRegex(query), "<span class=\"uwtSTH-searchMatch\">$&</span>");
                        };
                        switch (msg.type) {
                            case "Option Input Response":
                            case "Text Input Response":
                            case "Text Message with Text Input":
                            case "Text":
                                bubble.innerHTML = highlightSearch(msg.body);
                                break;
                            case "Text Message with Option Input":
                                bubble.innerHTML = highlightSearch(msg.body);
                                if (msg.input && msg.input.options) {
                                    msg.input.options.forEach(opt => {
                                        const eOpt = makeChildNode(bubble, "div", opt.title);
                                        eOpt.classList.add("uwtSTH-mt-option");
                                    });
                                }
                                break;
                            case "Attachment":
                                msg.attachments.forEach(file => {
                                    const head = makeChildNode(bubble, "p", "📎 Attachment");
                                    head.style.fontWeight = "bold";
                                    const nameA = makeChildNode(makeChildNode(bubble, "p"), "a", file.file_name);
                                    nameA.href = file.url;
                                    nameA.target = "_blank";
                                    const data = makeChildNode(bubble, "p", `${humanSize(file.size)} (${file.content_type})`);
                                    data.style.opacity = "0.6";
                                });
                                break;
                            default:
                                (() => {
                                    bubble.innerHTML = highlightSearch(msg.body);
                                    const errMsg = makeChildNode(msgBox, "p", `Unknown message type ${msg.type}, please report to addon developer!`);
                                    errMsg.style.color = "red";
                                })();
                        }
                    });
                };
                {
                    const env_2 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_2, await toolbox.openIDB("tickets", "readonly"), false);
                        const allTickets = await idb.getAll();
                        allTickets.sort((a, b) => b.created_at - a.created_at);
                        allTickets.forEach(issue => {
                            const listItem = makeChildNode(list, "div");
                            listItem.classList.add("uwtSTH-listitem");
                            makeChildNode(listItem, "h3", `Ticket #${issue.id}`);
                            makeChildNode(listItem, "p", new Date(issue.created_at).toLocaleString(undefined, {
                                dateStyle: "long",
                                timeStyle: "long",
                            }));
                            listItem.addEventListener("click", () => showTicket(listItem, issue, false));
                            searchCache.push({ issue, e: listItem, refresh: () => showTicket(listItem, issue, true) });
                        });
                    }
                    catch (e_2) {
                        env_2.error = e_2;
                        env_2.hasError = true;
                    }
                    finally {
                        __disposeResources(env_2);
                    }
                }
            };
            const importBackup = async () => {
                const contents = await readFile(".json", "application/json");
                const jsonData = JSON.parse(await contents.text());
                await importChanges(jsonData);
                alert(`Successfully imported ${jsonData.length} support ticket(s).`);
            };
            if (config.get("showImportButton")) {
                toolbox.addImporter({
                    title: "Import Support Tickets",
                    description: "Import data previously exported from Ticket Saver.",
                    callback: importBackup,
                    icon: ImportIcon,
                });
            }
            toolbox.addSidebarItem("open", {
                imageUrl: SidebarIcon,
                label: "Tickets",
                callback: showTicketHistoryModal,
            });
        },
    });
};// Copyright 2026 bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var nominationCoordinates = () => {
    register()({
        id: "nomination-coordinates",
        name: "Nomination Coordinates",
        authors: ["bilde2910"],
        description: "Adds coordinates on the contribution screen for all contributions, clickable to copy them to the clipboard",
        defaultConfig: {},
        sessionData: {},
        initialize: (toolbox, logger, _config) => {
            // ---- redesign: the details pane (app-submissions app-details-pane) whose location line used to get the
            // coordinates is gone. A button at the bottom left opens a window listing all contributions with their
            // location and coordinates; clicking the coordinates copies them to the clipboard.
            let nominations = null;
            const coordinatesOf = (data) => {
                const lat = "lat" in data.poiData ? data.poiData.lat : data.lat;
                const lng = "lng" in data.poiData ? data.poiData.lng : data.lng;
                return `${lat},${lng}`;
            };
            const openWindow = async () => {
                const { container, dismiss } = await toolbox.createModal("uwtnc-modal");
                if (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")) {
                    container.classList.add("uwt-dark");
                }
                const close = makeChildNode(container, "button", "\u00d7");
                close.className = "uwtnc-x";
                close.addEventListener("click", dismiss);
                makeChildNode(container, "h2", "Contribution coordinates");
                const body = makeChildNode(container, "div");
                body.className = "uwtnc-body";
                if (nominations === null) {
                    makeChildNode(body, "p", "Loading contributions...");
                    try {
                        const data = await toolbox.makeRequest("GET", "/api/v1/vault/manage");
                        if (data && data.submissions)
                            nominations = data.submissions;
                    }
                    catch (e) {
                        logger.error(e);
                    }
                    body.innerHTML = "";
                }
                if (nominations === null) {
                    makeChildNode(body, "p", "Could not load your contributions.");
                    return;
                }
                makeChildNode(body, "p", "Click the coordinates of a contribution to copy them to the clipboard. For edits and photos, the coordinates are those of the Wayspot.")
                    .className = "uwtnc-help";
                const search = makeChildNode(body, "input");
                search.type = "text";
                search.placeholder = "Search by title or location";
                const scroller = makeChildNode(body, "div");
                scroller.className = "uwtnc-scroll";
                const table = makeChildNode(scroller, "table");
                table.className = "uwtnc-table";
                const headRow = makeChildNode(makeChildNode(table, "thead"), "tr");
                for (const label of ["Title", "Type", "Date", "Location", "Coordinates"])
                    makeChildNode(headRow, "th", label);
                const tbody = makeChildNode(table, "tbody");
                const rows = [];
                for (const data of [...nominations].sort((a, b) => b.order - a.order)) {
                    const title = data.title || ("title" in data.poiData ? data.poiData.title : "") || "(untitled)";
                    const coordinates = coordinatesOf(data);
                    const row = makeChildNode(tbody, "tr");
                    makeChildNode(row, "td", title);
                    makeChildNode(row, "td", data.type.replace(/_/g, " ").toLowerCase());
                    makeChildNode(row, "td", data.day);
                    const location = `${data.city} ${data.state}`.trim();
                    makeChildNode(row, "td", location);
                    const cell = makeChildNode(row, "td", coordinates);
                    cell.className = "uwtnc-coordinates";
                    cell.title = "Copy coordinates to clipboard";
                    cell.addEventListener("click", () => {
                        void navigator.clipboard.writeText(coordinates);
                        cell.textContent = "Copied!";
                        setTimeout(() => { cell.textContent = coordinates; }, 1200);
                    });
                    rows.push({ row, text: `${title} ${location}`.toLowerCase() });
                }
                search.addEventListener("input", () => {
                    const q = search.value.trim().toLowerCase();
                    for (const r of rows)
                        r.row.style.display = r.text.includes(q) ? "" : "none";
                });
            };
            // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
            toolbox.addMenuItem("nomination-coordinates", {
                label: "Contribution coordinates",
                icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/></svg>",
                callback: () => { void openWindow(); },
            });
            toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", (data) => {
                if (data && data.submissions)
                    nominations = data.submissions;
            });
        },
    });
};// Copyright 2026 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
const MAX_SKIPS = 100;
const SKIP_EXPIRY_MSEC = 86400 * 1000;
var skipCount = () => {
    register()({
        id: "skip-count",
        name: "Skip Counter",
        authors: ["tehstone", "bilde2910"],
        description: "Count your skip usage in the last 24 hours",
        defaultConfig: {},
        sessionData: {
            skipNotified: false,
        },
        initialize: (toolbox, logger, _config) => {
            const updateCounter = async () => {
                const container = await uwtStatusStack();
                const now = Date.now();
                let counter = document.getElementById("uwftsc-counter");
                let label = document.getElementById("uwftsc-label");
                if (counter === null) {
                    const div = makeChildNode(container, "div");
                    div.classList.add("uwftsc-outer", "uwt-pill");
                    label = makeChildNode(div, "p", "Skip Count:");
                    label.id = "uwftsc-label";
                    counter = makeChildNode(div, "p", "Loading…");
                    counter.id = "uwftsc-counter";
                }
                {
                    const env_1 = { stack: [], error: void 0, hasError: false };
                    try {
                        const idb = __addDisposableResource(env_1, await toolbox.openIDB("skips", "readonly"), false);
                        const skips = await idb.getAll();
                        const skipCount = skips
                            .filter(a => a.ts >= now - SKIP_EXPIRY_MSEC)
                            .sort((a, b) => a.ts - b.ts)
                            .length;
                        const skipRatio = skipCount / MAX_SKIPS;
                        counter.textContent = skipCount.toString();
                        if (skipRatio < 0.1) {
                            counter.className = "uwftsc-normal";
                        }
                        else if (skipRatio < 0.25) {
                            counter.className = "uwftsc-low";
                        }
                        else if (skipRatio < 0.45) {
                            counter.className = "uwftsc-mid";
                        }
                        else if (skipRatio < 0.65) {
                            counter.className = "uwftsc-med";
                        }
                        else if (skipRatio < 0.85) {
                            counter.className = "uwftsc-high";
                            toolbox.session.set("skipNotified", false);
                        }
                        else {
                            counter.className = "uwftsc-extreme";
                        }
                        if ((skipRatio >= 0.95 || MAX_SKIPS - skipCount == 1) && !toolbox.session.get("skipNotified")) {
                            alert(`Careful using skips! Currently at ${skipCount}/${MAX_SKIPS} skips!`);
                            toolbox.session.set("skipNotified", true);
                        }
                    }
                    catch (e_1) {
                        env_1.error = e_1;
                        env_1.hasError = true;
                    }
                    finally {
                        __disposeResources(env_1);
                    }
                }
            };
            const handleSkip = async (sent, received) => {
                if (received) {
                    logger.info("Storing skip");
                    {
                        const env_2 = { stack: [], error: void 0, hasError: false };
                        try {
                            const idb = __addDisposableResource(env_2, await toolbox.openIDB("skips", "readwrite"), false);
                            idb.put({ ...sent, ts: Date.now() });
                            idb.commit();
                        }
                        catch (e_2) {
                            env_2.error = e_2;
                            env_2.hasError = true;
                        }
                        finally {
                            __disposeResources(env_2);
                        }
                    }
                    void updateCounter();
                }
            };
            toolbox.interceptOpenJson("GET", "/api/v1/vault/review", updateCounter);
            toolbox.interceptSendJson("/api/v1/vault/review/skip", handleSkip);
        },
    });
};// Copyright 2026 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.
// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.
var versionDisplay = () => {
    register()({
        id: "version-display",
        name: "Version Display",
        authors: ["tehstone", "bilde2910"],
        description: "Displays the current Wayfarer version",
        defaultConfig: {
            displayMode: "version",
            alertNewVersion: true,
            flashVersion: true,
        },
        sessionData: {},
        initialize: (_toolbox, _logger, config) => {
            config.setUserEditable("displayMode", {
                label: "Version display mode",
                editor: new SelectBoxEditor({
                    "full": "Full",
                    "most": "Exclude prefix",
                    "version": "Version number only",
                    "versionHash": "Version number and commit hash",
                    "dateOnly": "Date only",
                    "dateTime": "Date and time",
                    "commitOnly": "Commit hash only",
                }),
            });
            config.setUserEditable("alertNewVersion", {
                label: "Prompt to reload on update",
                help: "Show a message prompt asking you if you want to refresh the page if a new version of Wayfarer is detected.",
                editor: new CheckboxEditor(),
            });
            config.setUserEditable("flashVersion", {
                label: "Flash version number on update",
                help: "Flash the version number in red if a new version of Wayfarer is detected.",
                editor: new CheckboxEditor(),
            });
            let seenVersion = null;
            let looking = false;
            function parseResponse() {
                try {
                    const json = JSON.parse(this.response);
                    if (!json)
                        return;
                    if (json.version)
                        void setVersion(json.version);
                }
                catch (_a) {
                    // Pass
                }
            }
            const getContainer = async () => {
                if (looking)
                    return;
                looking = true;
                let box = document.getElementById("uwtvd-display");
                let span;
                if (box === null) {
                    // redesign: wf-logo no longer exists; the version is a small label fixed to the bottom left
                    const body = await untilTruthy(() => document.body);
                    box = makeChildNode(body, "div");
                    box.id = "uwtvd-display";
                    span = makeChildNode(box, "span");
                }
                else {
                    span = box.querySelector("span");
                }
                looking = false;
                return span;
            };
            const cleanVersion = (version) => {
                var _a;
                const mode = config.get("displayMode");
                if (mode == "full")
                    return version;
                const def = version.replace(/[A-Za-z-]*/, "");
                if (mode == "most")
                    return def;
                const pattern = /^release-wayfarer-web-(?<version>[0-9-]+)-(?<commit>[0-9a-f]{8})-(?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(?<day>[0-9]+)-(?<hour>[0-9]+)-(?<minute>[0-9]+)$/g;
                const g = (_a = pattern.exec(version)) === null || _a === void 0 ? void 0 : _a.groups;
                if (!g)
                    return def;
                switch (mode) {
                    case "version":
                        return `v${g.version.replaceAll("-", ".")}`;
                    case "versionHash":
                        return `v${g.version.replaceAll("-", ".")}-${g.commit}`;
                    case "dateOnly":
                        return `${g.month} ${parseInt(g.day)}`;
                    case "dateTime":
                        return `${g.month} ${parseInt(g.day)} ${g.hour}:${g.minute}`;
                    case "commitOnly":
                        return g.commit;
                }
            };
            const setVersion = async (version) => {
                const span = await getContainer();
                if (!span)
                    return;
                span.textContent = cleanVersion(version);
                span.title = version;
                if (!seenVersion)
                    seenVersion = version;
                else if (seenVersion !== version) {
                    const body = document.querySelector("body");
                    if (config.get("flashVersion") && !body.classList.contains("uwtvd-update-available"))
                        body.classList.add("uwtvd-update-available");
                    if (config.get("alertNewVersion")) {
                        const reload = confirm(`Addon message: The Wayfarer API appears to have just updated from version ${seenVersion} to version ${version}. It is highly recommended that you reload the page now to avoid unexpected Wayfarer behavior. Reload now?`);
                        seenVersion = version;
                        if (reload)
                            location.reload();
                    }
                }
            };
            // the page's own XHR and fetch (not the userscript sandbox's copies) carry Wayfarer's API traffic
            (function (open) {
                uwtPageXHR.prototype.open = function (_m, _u) {
                    this.addEventListener("load", parseResponse, false);
                    const args = arguments;
                    open.apply(this, args);
                };
            })(uwtPageXHR.prototype.open);
            const originalFetch = uwtPageWin.fetch;
            if (typeof originalFetch === "function") {
                uwtPageWin.fetch = async function (input) {
                    const response = await originalFetch.apply(this, arguments);
                    try {
                        const url = input instanceof Request ? input.url : String(input);
                        if (/\/api\/v1\//.test(url)) {
                            void response.clone().json().then((json) => {
                                if (json && json.version)
                                    void setVersion(json.version);
                            }).catch(() => { });
                        }
                    }
                    catch (_a) {
                        // Pass
                    }
                    return response;
                };
            }
        },
    });
};const availableAddons = [
    uwfToolsCore,
    nominationStats,
    nominationMap,
    reviewHistory,
    keyboardReview,
    openIn,
    reviewTimer,
    extendedStats,
    nominationStatusHistory,
    reviewMapMods,
    reviewCounter,
    emlImporter,
    gmailGasImporter,
    appealTimer,
    contributionManagementLayout,
    totalReconExporter,
    autoHold,
    dynamicMapsEverywhere,
    widescreenReview,
    betterDiff,
    proximityBlock,
    showcaseTracker,
    ticketSaver,
    nominationCoordinates,
    skipCount,
    versionDisplay,
];
/** Runs when the userscript is loaded initially */
function init() {
    if (domLoaded)
        run();
    else
        document.addEventListener("DOMContentLoaded", run);
}
/** Runs after the DOM is available */
function run() {
    const logger = new Logger("setup");
    try {
        logger.info(`Initializing ${scriptInfo.name} v${scriptInfo.version}...`);
        initializeUserHash().then((userHash) => {
            logger.info(`Initializing Wayfarer Tools for user hash ${userHash}`);
            for (const addon of availableAddons) {
                try {
                    addon();
                }
                catch (err) {
                    logger.error("Addon registration failed:", err);
                }
            }
            logger.info("Addons registered.");
            initializeAllAddons();
            setTimeout(uwtMarkAddonsReady, 15000);
        }).catch((err) => logger.error("Initialization failed:", err));
    }
    catch (err) {
        logger.error("Fatal error:", err);
        return;
    }
}
init();})(window,markerClusterer,agGrid,proj4,Diff);

(() => {
  const addStyle = () => {
    const elem = document.createElement("style");
    elem.innerHTML = (`.uwftcore-checkbox{display:grid;grid-template-columns:1em auto;gap:.5em;line-height:1.1;margin-bottom:.5em;cursor:pointer}.uwftcore-checkbox input[type=checkbox]{appearance:none;font:inherit;color:currentColor;width:1.15em;height:1.15em;border:.15em solid currentColor;border-radius:.15em;display:grid;place-content:center}.uwftcore-checkbox input[type=checkbox]::before{content:"";width:.65em;height:.65em;transform:scale(0);transition:120ms transform ease-in-out;box-shadow:inset 1em 1em #ff6d38}.uwftcore-checkbox input[type=checkbox]:checked::before{transform:scale(1)}.uwftcore-checkbox input[type=checkbox]:disabled::before{box-shadow:inset 1em 1em hsl(16,0%,61%)}.uwftcore-plugin{margin-bottom:1em}.uwftcore-plugin-title{font-weight:bold}.uwftcore-authors{font-size:.8em}.uwftcore-description{font-size:.8em;opacity:.5}.uwftcore-depends{font-size:.8em}.uwftcore-depend-line{font-size:.8em}.uwftcore-refresh-reminder{margin-bottom:1em}.uwftcore-help-available{cursor:context-menu;text-decoration:underline dotted #7f7f7f}.uwftcore-discord-link-box{font-weight:bold}.uwftcore-discord-link-box img{height:1em;display:inline-block;margin-right:5px;margin-top:-4px}.uwftcore-option-line{margin-bottom:1rem}.dark input.uwftcore-fix,.dark select.uwftcore-fix,.dark span.uwftcore-fix{background-color:#333}input.uwftcore-fix,select.uwftcore-fix,span.uwftcore-fix{padding:2px 5px}input.uwftcore-ui-large-input{padding:10px 10px;margin:10px 10px 10px 0;border-radius:.375rem;font-size:16px}.uwftcore-ui-button{background-color:#e5e5e5;border:none;color:#ff4713;padding:10px 10px;margin:10px 10px 10px 0;border-radius:.375rem;text-align:center;text-decoration:none;display:inline-block;font-size:16px;cursor:pointer}.uwftcore-ui-button:hover{background-color:hsl(0,1%,75%);transition:.2s}.dark .uwftcore-ui-button{background-color:hsl(0,1%,25%);color:#20b8e3}.dark .uwftcore-ui-button:hover{background-color:#707070;transition:.2s}.uwftcore-ui-button-active{background-color:hsl(0,1%,67%)}.dark .uwftcore-ui-button-active{background-color:hsl(0,1%,33%)}#uwftcore-notifications{position:absolute;bottom:1em;right:1em;width:30em;z-index:100}.uwftcore-notification{font-weight:bold;border-radius:1em;padding:1em;margin-top:1.5em;color:#fff}.uwftcore-notify-content-wrapper{display:flex;align-items:center}.uwftcore-notify-icon-wrapper{width:30px}.uwftcore-notify-icon-wrapper>img{width:20px;height:20px}.uwftcore-nbg-red{background-color:#c00}.uwftcore-nbg-red a{color:#fcc}.uwftcore-nbg-green{background-color:hsl(153,90%,36%)}.uwftcore-nbg-blue{background-color:hsl(227,74%,39%)}.uwftcore-nbg-purple{background-color:hsl(258,90%,66%)}.uwftcore-nbg-gold{background-color:hsl(43,74%,49%)}.uwftcore-nbg-gray{background-color:hsl(0,0%,50%)}.uwftcore-nbg-brown{background-color:hsl(30,38%,33%)}.uwftcore-nbg-dark-gray{background-color:#666}.uwftcore-sidebar-icon{width:24px}.uwftcore-fullscreen-overlay{position:fixed;top:0;left:0;height:100dvh;width:100dvw;background-color:rgba(0,0,0,.5);z-index:100000}.uwftcore-fullscreen-inner{position:absolute;top:50%;left:50%;transform:translateX(-50%) translateY(-50%);overflow-x:hidden;overflow-y:scroll;background-color:#fff;padding:20px;max-width:900px;max-height:500px}.uwftcore-modal-common{width:calc(100vw - 50px);height:calc(100vh - 50px)}.uwftcore-modal-common h3{font-weight:bold;margin:10px auto}.uwftcore-modal-common>p{margin:10px auto}.dark .uwftcore-fullscreen-inner{background-color:#333}.uwftcore-import-options{max-width:550px;height:initial}.uwftcore-import-method{background-color:#e5e5e5;border:none;padding:10px 10px;cursor:pointer;width:100%;background-size:30px;background-position:15px;background-repeat:no-repeat;margin-bottom:10px}.uwftcore-import-method .uwftcore-import-method-title{color:#ff4713;font-size:16px}.uwftcore-import-method .uwftcore-import-method-desc{font-size:12px}.dark .uwftcore-import-method{background-color:#404040}.dark .uwftcore-import-method .uwftcore-import-method-title{color:#20b8e3}#uwt-status-stack{position:fixed;left:16px;bottom:102px;z-index:99990;display:flex;flex-direction:column;align-items:flex-start;gap:6px}.uwt-pill{display:flex;align-items:center;gap:.5em;margin:0;padding:.25em .8em;border-radius:999px;background:rgba(17,24,39,.92);color:#f9fafb;box-shadow:0 2px 8px rgba(0,0,0,.4);font-size:14px;line-height:1.2;white-space:nowrap;user-select:none}.uwt-pill p{margin:0}.uwt-pill p:nth-child(2){font-size:18px;font-weight:bold;font-variant-numeric:tabular-nums}#uwt-menu-button{position:fixed;left:16px;bottom:16px;z-index:99990;width:40px;height:40px;border-radius:50%;border:1px solid rgba(128,128,128,.5);background:#111827;color:#f9fafb;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35);padding:0;opacity:.75}#uwt-menu-button:hover,#uwt-menu-button.uwt-open{opacity:1}#uwt-menu{position:fixed;left:16px;bottom:64px;z-index:99995;min-width:240px;max-height:calc(100vh - 90px);overflow-y:auto;padding:6px;border-radius:10px;border:1px solid rgba(128,128,128,.4);background:#111827;color:#f9fafb;box-shadow:0 4px 16px rgba(0,0,0,.45)}#uwt-menu[hidden]{display:none}.uwt-menu-item{display:flex;align-items:center;gap:10px;width:100%;padding:7px 10px;border:0;border-radius:6px;background:rgba(0,0,0,0);color:inherit;font-size:14px;text-align:left;cursor:pointer}.uwt-menu-item:hover{background:hsla(0,0%,100%,.12)}.uwt-menu-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px;width:20px;height:20px}.uwt-menu-icon img{width:20px;height:20px;filter:brightness(0) invert(1)}.uwt-menu-sep{height:1px;margin:4px 6px;background:rgba(128,128,128,.4)}.uwt-report-modal{position:relative;background:#fff !important;color:#111827 !important;font-size:15px;width:min(900px,100vw - 50px);max-height:none !important}.uwt-report-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.6rem}.uwt-report-modal .uwt-report-close{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}.uwt-report-modal .uwt-report-text{width:100%;height:min(480px,100vh - 260px);margin:.6rem 0;padding:6px;border:1px solid #9ca3af;border-radius:4px;background:#f9fafb;color:#111827;font-family:monospace;font-size:12px;white-space:pre}.uwtkr2-eds-highlighted{border-width:1px;border-color:#df471c}.dark .uwtkr2-eds-highlighted{border-color:#20b8e3}.uwtkr2-eds-btn-key::before,.uwtkr2-key-label,.uwtkr2-key-span{color:#ff6d38;font-family:monospace;text-transform:none;display:inline-block}.uwtkr2-key-span-wildcard{color:#20b8e3}.uwtkr2-eds-btn-key-no-highlight::before{color:#000}.dark .uwtkr2-eds-btn-key-no-highlight::before{color:#fff}.uwtkr2-eds-btn-key-pad::before,.uwtkr2-key-label{margin-right:5px}.uwtkr2-eds-btn-key.is-selected::before,.uwtkr2-eds-btn-key.wf-button--primary::before{color:#000}.uwtkr2-photo-card-label{font-size:1.9em;display:inline-block;padding:0 .5em}.uwtkr2-eds-key-bracket-A::before{content:"A"}.uwtkr2-eds-key-bracket-B::before{content:"B"}.uwtkr2-eds-key-bracket-C::before{content:"C"}.uwtkr2-eds-key-bracket-D::before{content:"D"}.uwtkr2-eds-key-bracket-E::before{content:"E"}.uwtkr2-eds-key-bracket-F::before{content:"F"}.uwtkr2-eds-key-bracket-G::before{content:"G"}.uwtkr2-eds-key-bracket-H::before{content:"H"}.uwtkr2-eds-key-bracket-I::before{content:"I"}.uwtkr2-eds-key-bracket-J::before{content:"J"}.uwtkr2-eds-key-bracket-K::before{content:"K"}.uwtkr2-eds-key-bracket-L::before{content:"L"}.uwtkr2-eds-key-bracket-M::before{content:"M"}.uwtkr2-eds-key-bracket-N::before{content:"N"}.uwtkr2-eds-key-bracket-O::before{content:"O"}.uwtkr2-eds-key-bracket-P::before{content:"P"}.uwtkr2-eds-key-bracket-Q::before{content:"Q"}.uwtkr2-eds-key-bracket-R::before{content:"R"}.uwtkr2-eds-key-bracket-S::before{content:"S"}.uwtkr2-eds-key-bracket-T::before{content:"T"}.uwtkr2-eds-key-bracket-U::before{content:"U"}.uwtkr2-eds-key-bracket-V::before{content:"V"}.uwtkr2-eds-key-bracket-W::before{content:"W"}.uwtkr2-eds-key-bracket-X::before{content:"X"}.uwtkr2-eds-key-bracket-Y::before{content:"Y"}.uwtkr2-eds-key-bracket-Z::before{content:"Z"}.uwtkr2-eds-key-bracket-0::before{content:"0"}.uwtkr2-eds-key-bracket-1::before{content:"1"}.uwtkr2-eds-key-bracket-2::before{content:"2"}.uwtkr2-eds-key-bracket-3::before{content:"3"}.uwtkr2-eds-key-bracket-4::before{content:"4"}.uwtkr2-eds-key-bracket-5::before{content:"5"}.uwtkr2-eds-key-bracket-6::before{content:"6"}.uwtkr2-eds-key-bracket-7::before{content:"7"}.uwtkr2-eds-key-bracket-8::before{content:"8"}.uwtkr2-eds-key-bracket-9::before{content:"9"}.uwtkr2-eds-key-bracket-Esc::before{content:"Esc"}.uwtkr2-eds-key-bracket-Tab::before{content:"Tab"}.uwtkr2-eds-key-bracket-Enter::before{content:"Enter"}.uwtkr2-dupe-key-box{width:0;z-index:10}.uwtkr2-dupe-key-box>div{width:1.7em;margin:5px;text-align:center;font-weight:bold;font-size:1.3em;border:1px solid #000;pointer-events:none;background:rgba(0,0,0,.5);color:#ff6d38}.uwtkr2-card app-review-text-diff{display:inline-block}.uwftmr-div{color:#333;margin-left:2em;padding-top:.3em;text-align:center;display:block}.dark .uwftmr-div{color:#ddd}.uwftmr-counter{font-size:20px;color:#20b8e3}.uwftmr-sbb{color:#20b8e3}.uwtns-modal{position:relative;background:#fff !important;color:#111827 !important;font-size:15px;width:min(760px,100vw - 50px)}.uwtns-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}.uwtns-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.8rem}.uwtns-modal .uwtns-x{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}.uwtns-modal .uwtns-x:hover{opacity:1}#uwftns-export{display:flex;gap:.5rem;margin-top:1rem}.uwtns-stats-table th,.uwtns-stats-table td{border:1px solid rgba(128,128,128,.6);padding:1pt 5pt}.uwtns-stats-table{width:100%}.uwtns-stats-table th:first-child,.uwtns-stats-table td:first-child{text-align:left}.uwtns-stats-table th:not(:first-child),.uwtns-stats-table td:not(:first-child){text-align:center}.uwtnm-text{font-size:18px}.uwtnm-toggle{display:none}.uwtnm-wrap-collapsible{margin-bottom:1.2rem}#uwtnm-collapsed-map{display:none}.uwtnm-lbl-toggle{display:block;font-weight:bold;font-family:monospace;font-size:1.2rem;text-transform:uppercase;text-align:center;padding:1rem;color:#fff;background:#df471c;cursor:pointer;border-radius:7px;transition:all .25s ease-out}.uwtnm-lbl-toggle:hover{color:#d3d3d3}.uwtnm-lbl-toggle::before{content:" ";display:inline-block;border-top:5px solid rgba(0,0,0,0);border-bottom:5px solid rgba(0,0,0,0);border-left:5px solid currentColor;vertical-align:middle;margin-right:.7rem;transform:translateY(-2px);transition:transform .2s ease-out}.uwtnm-toggle:checked+.uwtnm-lbl-toggle::before{transform:rotate(90deg) translateX(-3px)}.uwtnm-collapsible-content{max-height:0px;overflow:hidden;transition:max-height .25s ease-in-out}.uwtnm-toggle:checked+.uwtnm-lbl-toggle+.uwtnm-collapsible-content{max-height:9999999pt}.uwtnm-toggle:checked+.uwtnm-lbl-toggle{border-bottom-right-radius:0;border-bottom-left-radius:0}.uwtnm-map{height:400px}.uwtoi-label{font-weight:bold}.uwtoi-container{margin-bottom:10px}.uwtoi-dupe-map{padding:0 1rem;margin-top:-1rem}.uwtoi-linkspan::before{content:" · "}.uwtoi-linkspan:nth-child(2)::before{content:""}.uwtoi-experimental{color:#ff8c00;position:relative;display:inline-block}.uwtoi-tttitle{color:#ff8c00;font-weight:bold}.uwtoi-experimental .uwtoi-tooltip{visibility:hidden;width:320px;background-color:rgba(0,0,0,.8);color:#fff;text-align:center;padding:12px;position:absolute;z-index:1;bottom:150%;left:50%;margin-left:-160px;border-radius:10px;pointer-events:none}.uwtoi-experimental .uwtoi-tooltip::after{content:"";position:absolute;top:100%;left:50%;z-index:1;margin-left:-10px;border-width:10px;border-style:solid;border-color:rgba(0,0,0,.8) rgba(0,0,0,0) rgba(0,0,0,0) rgba(0,0,0,0)}.uwtoi-experimental:hover .uwtoi-tooltip{visibility:visible}.uwtoi-address{font-size:1.1em;font-weight:bold;color:#000}.dark .uwtoi-address{color:#fff}.uwtes-modal{position:relative;background:#fff !important;color:#111827 !important;font-size:15px;width:min(560px,100vw - 50px)}.uwtes-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}.uwtes-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.8rem}.uwtes-modal .uwtes-x{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}.uwtes-modal .uwtes-x:hover{opacity:1}.uwtes-table{width:100%;border-collapse:collapse}.uwtes-table td{padding:6px 4px;border-bottom:1px solid rgba(128,128,128,.3)}.uwftes-text{font-size:16px}.uwftes-count{font-size:16px;text-align:right;font-variant-numeric:tabular-nums}.uwtes-extended td{font-weight:bold}.uwtes-copy{margin-top:16px}.uwftat-outer p:nth-child(2){color:#20b8e3}.uwtrct-outer{position:fixed;left:16px;bottom:64px;z-index:99990;display:flex;align-items:center;gap:.5em;margin:0;padding:.25em .8em;border-radius:999px;background:rgba(17,24,39,.92);color:#f9fafb;box-shadow:0 2px 8px rgba(0,0,0,.4);font-size:14px;line-height:1.2;cursor:pointer;user-select:none}.uwtrct-outer p{margin:0}.uwtrct-outer p:nth-child(2){font-size:18px;font-weight:bold;color:#20b8e3;font-variant-numeric:tabular-nums}.uwtrh-modal{position:relative;display:flex;flex-direction:column;background:#fff !important;color:#111827 !important;font-size:15px;width:min(1100px,100vw - 50px);height:min(760px,100vh - 50px);max-width:none !important;max-height:none !important}.uwtrh-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}.uwtrh-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.6rem}.uwtrh-modal .uwtrh-x{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}.uwtrh-modal .uwtrh-x:hover{opacity:1}.uwtrh-modal .uwtrh-count{margin:.4rem 0}.uwtrh-modal .uwtrh-table{flex:1 1 auto;height:auto;min-height:320px}.uwtrh-idb{display:flex;align-items:center;flex-wrap:wrap;gap:.25rem}.uwtrh-idb button{background-color:#e5e5e5;border:none;color:#ff4713;padding:2px 6px;margin:3px;text-align:center;text-decoration:none;display:inline-block;font-size:14px}.dark .uwtrh-idb button{background-color:#404040;color:#20b8e3}.uwtrh-table{display:none;height:500px}.uwtemli-modal{text-align:center}.uwtemli-modal h2{margin-bottom:10px}.uwtegas-options-modal{max-width:700px;height:initial}.uwtegas-table{width:100%}.uwtegas-table td{border:none}.uwtegas-table input{background-color:#ddd;width:100%;padding:5px}.dark .uwtegas-table input{background-color:#222}.uwtegas-cancel-btn{color:#000}.dark .uwtegas-cancel-btn{color:red}.uwtwsr-root-new{margin-top:-1rem;grid-gap:1rem !important}.uwtwsr-root-new app-photo-b img{margin:auto}.uwtwsr-root-new .wf-review-card{height:initial;max-height:380px}.uwtwsr-root-new #check-duplicates-card{max-height:initial}.uwtwsr-root-new .wf-image-modal img{max-height:calc((100dvh - 440px)/2)}@media(max-width: 2000px){.uwtwsr-root-new .action-buttons-row{flex-direction:column !important;justify-content:initial !important}}.uwtwsr-thumbs-row{display:flex;flex-direction:row}.uwtwsr-root-new .dont-know-button{margin-left:0 !important;padding:.375rem !important}.uwtwsr-root-new .question-title .question-subtitle-tooltip{margin-left:.5rem;line-height:1.6rem}.uwtwsr-root-new app-question-card .main-section-container{justify-content:space-between}.uwtcml-modal{position:relative;display:flex;flex-direction:column;background:#fff !important;color:#111827 !important;font-size:15px;width:min(1100px,100vw - 50px);height:min(760px,100vh - 50px);max-width:none !important;max-height:none !important}.uwtcml-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}.uwtcml-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.6rem}.uwtcml-modal .uwtcml-x{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}.uwtcml-modal .uwtcml-x:hover{opacity:1}.uwtcml-body{display:flex;flex:1 1 auto;min-height:0;gap:16px}.uwtcml-side{display:flex;flex-direction:column;flex:0 0 280px;min-height:0;gap:8px}.uwtcml-side input{border:1px solid #9ca3af;border-radius:4px;padding:4px 8px;background:#fff;color:#111827}.uwtcml-list{overflow-y:auto;display:flex;flex-direction:column;gap:2px}.uwtcml-item{text-align:left;padding:6px 8px;border:0;border-radius:6px;background:rgba(0,0,0,0);color:inherit;cursor:pointer}.uwtcml-item:hover{background:rgba(128,128,128,.2)}.uwtcml-item.uwtcml-active{background:rgba(32,184,227,.25);font-weight:bold}.uwtcml-detail{flex:1 1 auto;min-width:0;overflow-y:auto}.uwtcml-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}.uwtcml-head h3{font-size:1.15rem;font-weight:bold;margin:0}.uwtcml-tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:bold;color:#fff;white-space:nowrap}.uwtcml-tag--accepted{background:#08ca00;color:#000}.uwtcml-tag--queue{background:#1e88e5}.uwtcml-tag--rejected{background:#e53935}.uwtcml-info{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px}.uwtcml-wayspot-details{flex:1 1 260px;min-width:220px;background-color:#e4e4e4;border-radius:10px;padding:10px}.uwtcml-modal.uwt-dark .uwtcml-wayspot-details{background-color:#444}.uwtcml-wd-image{width:100%;border-radius:10px;margin-bottom:6px;cursor:pointer}.uwtcml-wd-description{text-align:left;white-space:pre-wrap}.uwtcml-satmap{flex:1 1 320px;min-width:260px;min-height:300px;border-radius:10px;overflow:hidden}.uwtcml-edits-container{margin-bottom:20px}.uwtcml-edits-summary-header{font-weight:bold;margin-bottom:4px}.uwtcml-edit-summary-table{width:100%;border-collapse:collapse}.uwtcml-edit-summary-table td{padding:3px 6px;border:none;border-bottom:1px solid rgba(128,128,128,.3)}.uwtcml-edit-summary-table td:first-child{width:100px;white-space:nowrap}.uwtcml-edit-summary-table td:last-child{width:95px;text-align:right}.uwtnsh-modal{position:relative;display:flex;flex-direction:column;background:#fff !important;color:#111827 !important;font-size:15px;width:min(1000px,100vw - 50px);height:min(720px,100vh - 50px);max-width:none !important;max-height:none !important}.uwtnsh-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}.uwtnsh-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.6rem}.uwtnsh-modal .uwtnsh-x{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}.uwtnsh-modal .uwtnsh-x:hover{opacity:1}.uwtnsh-body{display:flex;flex:1 1 auto;min-height:0;gap:16px}.uwtnsh-side{display:flex;flex-direction:column;flex:0 0 320px;min-height:0;gap:8px}.uwtnsh-side input{border:1px solid #9ca3af;border-radius:4px;padding:4px 8px;background:#fff;color:#111827}.uwtnsh-list{overflow-y:auto;display:flex;flex-direction:column;gap:2px}.uwtnsh-item{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:6px 8px;border:0;border-radius:6px;background:rgba(0,0,0,0);color:inherit;cursor:pointer}.uwtnsh-item small{opacity:.7}.uwtnsh-item:hover{background:rgba(128,128,128,.2)}.uwtnsh-item.uwtnsh-active{background:rgba(32,184,227,.25)}.uwtnsh-item.uwtnsh-active span{font-weight:bold}.uwtnsh-detail{flex:1 1 auto;min-width:0;overflow-y:auto}.uwtnsh-detail h3{font-size:1.15rem;font-weight:bold;margin:0 0 4px 0}.uwtnsh-detail .uwtnsh-summary{opacity:.8;margin-bottom:10px}.uwtnsh-detail p{margin:2px 0}.uwtnsh-detail a{cursor:pointer;text-decoration:underline}.uwtnsh-verified::after{content:" ✓";color:green;font-family:initial}.dark .uwtnsh-verified::after,.uwt-dark .uwtnsh-verified::after{color:lime}.uwftbdiff-differs{border-bottom:2px solid #ff6d38;background-color:rgba(255,109,56,.3)}.uwtdme-hidden{display:none !important}.uwtnc-modal{position:relative;display:flex;flex-direction:column;background:#fff !important;color:#111827 !important;font-size:15px;width:min(1000px,100vw - 50px);height:min(720px,100vh - 50px);max-width:none !important;max-height:none !important}.uwtnc-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}.uwtnc-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.6rem}.uwtnc-modal .uwtnc-x{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}.uwtnc-modal .uwtnc-x:hover{opacity:1}.uwtnc-body{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;gap:8px}.uwtnc-help{opacity:.8}.uwtnc-body input{border:1px solid #9ca3af;border-radius:4px;padding:4px 8px;background:#fff;color:#111827}.uwtnc-scroll{flex:1 1 auto;min-height:0;overflow:auto}.uwtnc-table{width:100%;border-collapse:collapse}.uwtnc-table th{position:sticky;top:0;text-align:left;background:inherit;border-bottom:2px solid rgba(128,128,128,.6);padding:4px 6px}.uwtnc-modal .uwtnc-table th{background:#fff}.uwtnc-modal.uwt-dark .uwtnc-table th{background:#1f2937}.uwtnc-table td{padding:4px 6px;border-bottom:1px solid rgba(128,128,128,.3)}.uwtnc-coordinates{cursor:pointer;font-family:monospace;white-space:nowrap}.uwtnc-coordinates:hover{text-decoration:underline}.uwtSTH-bg{position:fixed;top:0;left:0;height:100vh;width:100vw;background-color:rgba(0,0,0,.5);z-index:100000}.uwtSTH-popup{position:absolute;top:50%;left:50%;transform:translateX(-50%) translateY(-50%);width:calc(100vw - 50px);height:calc(100vh - 50px);overflow-x:hidden;overflow-y:scroll;background-color:#fff;padding:20px;max-width:900px}.dark .uwtSTH-popup{background-color:#333}.uwtSTH-popup h1{margin-bottom:20px;width:calc(70% - 70px);float:left}.uwtSTH-search{width:30%;padding:.7em;font-size:1.1em;background-color:#ddd;float:right;display:none}.dark .uwtSTH-search{background-color:#222}.uwtSTH-searchMatch{background-color:#ff0;color:#000;display:inline-block;box-shadow:0 0 4px rgba(0,0,0,.5);white-space:pre}.uwtSTH-close{z-index:2;font-size:2em;cursor:pointer;opacity:.5;float:right;margin-left:14px}.uwtSTH-close:hover{opacity:1}.uwtSTH-box{height:calc(100% - 60px);display:flex;background-color:#ddd;clear:both}.dark .uwtSTH-box{background-color:#222}.uwtSTH-box>div{height:100%}.uwtSTH-list{width:40%;background-color:#eee;overflow-y:scroll;border-right:3px solid #fff}.dark .uwtSTH-list{background-color:#2a2a2a;border-right:3px solid #333}.uwtSTH-chat{width:60%;overflow-y:scroll;padding-bottom:15px}.uwtSTH-listitem{padding:10px;border-bottom:3px solid #fff;cursor:pointer;white-space:nowrap}.uwtSTH-listitem p{overflow:hidden;text-overflow:ellipsis}.dark .uwtSTH-listitem{border-bottom:3px solid #333}.uwtSTH-selected{background-color:#ddd;cursor:default}.dark .uwtSTH-selected{background-color:#222}.uwtSTH-message{padding:15px;clear:both}.uwtSTH-chatBubble{border-radius:8px;max-width:270px;padding:10px}.uwtSTH-chatBubble a{text-decoration:underline}.uwtSTH-msgState-sent .uwtSTH-chatBubble a{color:#fff}.uwtSTH-msgState-received .uwtSTH-chatBubble a{color:#000}.uwtSTH-msgState-sent .uwtSTH-chatBubble{background-color:#d85813;color:#fff;float:right}.uwtSTH-msgState-received .uwtSTH-chatBubble{background-color:#fff;color:#000;float:left}.uwtSTH-message>p{font-size:.8em;opacity:.8;margin:3px}.uwtSTH-msgState-received>p{text-align:left}.uwtSTH-msgState-sent>p{text-align:right}.uwtSTH-mt-option{background-color:#eee;padding:5px;margin-top:5px;border:1px solid #ccc}.uwftpb-header{font-weight:bold;margin-top:12px;margin-bottom:4px}.uwftpb-table{width:100%;border-collapse:collapse}.uwftpb-table td{padding:3px 6px;border:none;border-bottom:1px solid rgba(128,128,128,.3)}.uwftpb-table td:first-child{width:100px;white-space:nowrap}.uwftpb-table td:last-child{width:95px;text-align:right}.uwtpb-modal{position:relative;display:flex;flex-direction:column;background:#fff !important;color:#111827 !important;font-size:15px;width:min(1000px,100vw - 50px);height:min(720px,100vh - 50px);max-width:none !important;max-height:none !important}.uwtpb-modal.uwt-dark{background:#1f2937 !important;color:#f9fafb !important}.uwtpb-modal h2{font-size:1.4rem;font-weight:bold;margin-bottom:.6rem}.uwtpb-modal .uwtpb-x{position:absolute;top:8px;right:14px;font-size:26px;cursor:pointer;opacity:.6;background:none;border:0;color:inherit}.uwtpb-modal .uwtpb-x:hover{opacity:1}.uwtpb-body{display:flex;flex:1 1 auto;min-height:0;gap:16px}.uwtpb-side{display:flex;flex-direction:column;flex:0 0 300px;min-height:0;gap:8px}.uwtpb-all{font-size:13px;cursor:pointer}.uwtpb-list{overflow-y:auto;display:flex;flex-direction:column;gap:2px}.uwtpb-item{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:6px 8px;border:0;border-radius:6px;background:rgba(0,0,0,0);color:inherit;cursor:pointer}.uwtpb-item small{opacity:.7}.uwtpb-item:hover{background:rgba(128,128,128,.2)}.uwtpb-item.uwtpb-active{background:rgba(32,184,227,.25)}.uwtpb-item.uwtpb-active span{font-weight:bold}.uwtpb-detail{flex:1 1 auto;min-width:0;overflow-y:auto}.uwtpb-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:8px}.uwtpb-head h3{font-size:1.15rem;font-weight:bold;margin:0}.uwtpb-tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:bold;color:#fff;white-space:nowrap}.uwtpb-tag--queue{background:#1e88e5}.uwtpb-tag--blocked{background:#e53935}.uwftsc-normal{color:#20b8e3}.uwftsc-low{color:#44ce1b}.uwftsc-mid{color:#bbdb44}.uwftsc-med{color:#f7e379}.uwftsc-high{color:#f2a134}.uwftsc-extreme{color:#e51f1f}#uwtvd-display{position:fixed;left:64px;bottom:26px;z-index:99990;padding:.1em .7em;border-radius:999px;background:rgba(17,24,39,.85);font-size:12px;line-height:1.3;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:none}#uwtvd-display span{white-space:nowrap;font-weight:bold;color:#20b8e3}.uwtvd-update-available #uwtvd-display{animation:blink-animation 2s steps(2, start) infinite}.uwtvd-update-available #uwtvd-display span{color:red}@keyframes blink-animation{to{visibility:hidden}}`);
    document.querySelector("head")?.appendChild(elem);
    return elem;
  };
  if (document.readyState === "complete" || document.readyState === "interactive") addStyle();
  else document.addEventListener("DOMContentLoaded", addStyle);
})();
  //# sourceMappingURL=https://raw.githubusercontent.com/Frankmans/Wayfarer-Tools/redesign-port/unified-wayfarer-tools.user.js.map

