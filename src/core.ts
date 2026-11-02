import { BaseSchema, IDBStoreConnection } from "./idb";
import { ApiResult, DiscordUserLink, PostBody, Responses } from "./types";
import { untilTruthy, cyrb53, iterObject, makeChildNode, Logger, uwtPageWin, uwtPageXHR } from "./utils";
import { CorePluginAPI } from "./scripts/uwt-core";

import ImportIcon from "../assets/import.svg";

const CORE_ADDON_ID = "uwt-core";
const ADDON_APIS: {
  [CORE_ADDON_ID]?: CorePluginAPI,
} = {};

let userHash = 0;
let userName = "Agent";
let language = "en";

type UnspecAddon = Addon<any, any, any, any>;
type IDBStoreDeclaration<T> = {
  [ P in keyof T ]: BaseSchema
};

const addons = <UnspecAddon[]>[];
let initialized = false;

const observerHandlers: MutationHandler<any>[] = [];

export const initializeUserHash = async () => {
  if (userHash !== 0) {
    throw Error("Cannot reconfigure user hash");
  } else {
    let props: Partial<Responses["GET"]["/api/v1/vault/properties"]> = {};
    try {
      props = (await makeRequest("GET", "/api/v1/vault/properties")) || {};
    } catch (e) {
      console.warn("[W]", "[unified-wf-tools]", "[patch]", "Could not read /api/v1/vault/properties; continuing with defaults:", e);
    }
    const email = props.socialProfile && props.socialProfile.email;
    // a non-zero fallback keeps per-user storage working when the profile cannot be read
    userHash = email ? cyrb53(email) : (userHash || 1);
    userName = props.socialProfile?.username ?? "Agent";
    language = props.language || "en";
    return userHash;
  }
};

interface MutationHandler<T extends Node> {
  nodeName: string,
  callback: (node: T) => void,
}

interface OptionMetadata {
  label: string,
  help?: string,
}

interface RendererOptions<T> extends OptionMetadata {
  value: T,
  parent: HTMLElement,
  save: (v: T) => void,
  clear: () => void,
  redraw: () => void,
}

interface OptionEditor<T> {
  render: (opts: RendererOptions<T>) => void,
}

export class CheckboxEditor implements OptionEditor<boolean> {
  render(opts: RendererOptions<boolean>) {
    const label = makeChildNode(opts.parent, "label");
    if (opts.help) {
      label.title = opts.help;
      label.classList.add("uwftcore-help-available");
    }
    const checkbox = document.createElement("input");
    label.appendChild(checkbox);
    checkbox.setAttribute("type", "checkbox");
    if (opts.value) checkbox.setAttribute("checked", "checked");
    checkbox.addEventListener("change", () => {
      opts.save(!!checkbox.checked);
    });
    makeChildNode(label, "span", ` ${opts.label} `);
  }
}

export class SelectBoxEditor<T extends string> implements OptionEditor<T> {
  options: Record<T, string>;
  constructor(options: Record<T, string>) {
    this.options = options;
  }

  render(opts: RendererOptions<T>) {
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
      opts.save(select.value as T);
    });
  }
}

export class UnixTimestampDateOnlyEditor implements OptionEditor<number> {
  render(opts: RendererOptions<number>) {
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
      if (input.value === "") opts.clear();
      else (opts.save(new Date(input.value).getTime()));
    });
  }
}

interface NumericInputEditorOptions {
  min?: number,
  max?: number,
  step?: number,
}

export class NumericInputEditor implements OptionEditor<number> {
  options?: NumericInputEditorOptions;
  constructor(options?: NumericInputEditorOptions) {
    this.options = options;
  }

  render(opts: RendererOptions<number>) {
    const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
    if (opts.help) {
      label.title = opts.help;
      label.classList.add("uwftcore-help-available");
    }
    const input = document.createElement("input");
    input.type = "number";
    if (typeof this.options?.min !== "undefined") input.min = this.options.min.toString();
    if (typeof this.options?.max !== "undefined") input.max = this.options.max.toString();
    if (typeof this.options?.step !== "undefined") input.step = this.options.step.toString();
    label.appendChild(input);
    input.classList.add("uwftcore-fix");
    input.value = opts.value.toString();
    input.addEventListener("change", () => {
      if (input.value === "") opts.clear();
      else if ((this.options?.step ?? 1) < 1) opts.save(parseFloat(input.value));
      else opts.save(parseInt(input.value));
    });
  }
}

interface TextInputEditorOptions {
  placeholder?: string,
}

export class TextInputEditor implements OptionEditor<string> {
  options?: TextInputEditorOptions;
  constructor(options?: TextInputEditorOptions) {
    this.options = options;
  }

  render(opts: RendererOptions<string>) {
    const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
    if (opts.help) {
      label.title = opts.help;
      label.classList.add("uwftcore-help-available");
    }
    const input = document.createElement("input");
    input.type = "text";
    if (typeof this.options?.placeholder !== "undefined") input.placeholder = this.options.placeholder;
    label.appendChild(input);
    input.classList.add("uwftcore-fix");
    input.value = opts.value.toString();
    input.addEventListener("change", () => {
      if (input.value === "") opts.clear();
      else opts.save(input.value);
    });
  }
}

export class ColorInputEditor implements OptionEditor<string> {
  constructor() {}

  render(opts: RendererOptions<string>) {
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
      if (input.value === "") opts.clear();
      else opts.save(input.value);
    });
  }
}

interface DiscordUserLinkEditorOptions {
  authWindowUrl: string,
  confirmationText: string,
  connectCallback?: () => void,
}

const DISCORD_AUTH_UUID = "04dae49a-ee23-4a62-a18e-bcfa2fbffaed";

export class DiscordUserLinkEditor implements OptionEditor<DiscordUserLink | null> {
  options: DiscordUserLinkEditorOptions;
  constructor(options: DiscordUserLinkEditorOptions) {
    this.options = options;
  }

  render(opts: RendererOptions<DiscordUserLink | null>) {
    const label = makeChildNode(opts.parent, "label", `${opts.label}: `);
    const box = makeChildNode(label, "span");
    box.classList.add("uwftcore-discord-link-box");
    box.classList.add("uwftcore-fix");
    if (opts.help) {
      label.title = opts.help;
      label.classList.add("uwftcore-help-available");
    }

    if (opts.value !== null) {
      const avatar = makeChildNode(box, "img") as HTMLImageElement;
      avatar.src = opts.value.avatar;
      makeChildNode(box, "span", opts.value.name);
      const dcButton = makeChildNode(box, "button");
      dcButton.innerHTML = "&#x274C;";
      dcButton.addEventListener("click", (e) => {
        // Somehow the whole box is clickable. This fixes that:
        if (e.offsetX < 0) return;
        if (confirm("Are you sure you want to unlink your Discord account?")) {
          opts.clear();
          opts.redraw();
        }
      });
      dcButton.style.marginLeft = "5px";
    } else {
      const authButton = document.createElement("button");
      authButton.textContent = "Authenticate";
      authButton.addEventListener("click", (e) => {
        // Somehow the whole box is clickable. This fixes that:
        if (e.offsetX < 0) return;
        if (confirm(this.options.confirmationText)) {
          const url = URL.parse(this.options.authWindowUrl);
          const authWindow = window.open(this.options.authWindowUrl);
          const listener = (e: MessageEvent) => {
            if (e.data.uuid !== DISCORD_AUTH_UUID) return;
            if (e.origin === url!.origin) {
              authWindow!.close();
              window.removeEventListener("message", listener);
              const data: DiscordUserLink = e.data.data;
              opts.save(data);
              box.removeChild(authButton);
              opts.redraw();
              setTimeout(() => {
                this.options.connectCallback?.();
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

interface UserEditableOption<T> extends OptionMetadata {
  editor: OptionEditor<T>,
}

interface InternalEditableOption<T, Ti> extends UserEditableOption<Ti> {
  iface: AddonSettings<T>,
}

type SetUserEditableCallable<T> = <Tk extends keyof T>(
  key: Tk,
  options: InternalEditableOption<T, T[Tk]>,
) => void;

class AddonSettings<T> {
  storage: Storage;
  key: string;
  defaults: T;
  addEditor: SetUserEditableCallable<T>;

  constructor(
    storage: Storage,
    key: string,
    defaults: T,
    addEditor: SetUserEditableCallable<T>,
  ) {
    this.storage = storage;
    this.key = key;
    this.defaults = defaults;
    this.addEditor = addEditor;
  }

  get<Tk extends keyof T>(key: Tk): T[Tk] {
    const data = this.storage.getItem(`uwt-tools-settings-${userHash}`) ?? "{}";
    const props: T = JSON.parse(data)[this.key] ?? {};
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      return props[key];
    } else {
      return this.defaults[key];
    }
  }

  set<Tk extends keyof T>(key: Tk, value: T[Tk]) {
    const data = this.storage.getItem(`uwt-tools-settings-${userHash}`) ?? "{}";
    const props = JSON.parse(data);
    if (!Object.prototype.hasOwnProperty.call(props, this.key)) {
      props[this.key] = {};
    }
    props[this.key][key] = value;
    const nData = JSON.stringify(props);
    this.storage.setItem(`uwt-tools-settings-${userHash}`, nData);
  }

  clear<Tk extends keyof T>(key: Tk) {
    const data = this.storage.getItem(`uwt-tools-settings-${userHash}`) ?? "{}";
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

  setUserEditable<Tk extends keyof T>(key: Tk, options: UserEditableOption<T[Tk]>) {
    this.addEditor(key, {...options, iface: this });
  }
}

/**
 * Opens an IDB database connection.
 * IT IS YOUR RESPONSIBILITY TO CLOSE THE RETURNED DATABASE CONNECTION WHEN YOU ARE DONE WITH IT.
 * THIS FUNCTION DOES NOT DO THIS FOR YOU - YOU HAVE TO CALL db.close()!
 * @param objectStoreName The name of the object store to open
 * @param version
 */
const getIDBInstance = (objectStoreName: string, version?: number) => new Promise<IDBDatabase>((resolve, reject) => {
  "use strict";

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
    } else {
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
export function uwtPath(u: string | URL): string {
  try {
    const x = new URL(String(u), location.href);
    const path = x.pathname.length > 1 && x.pathname.endsWith("/") ? x.pathname.slice(0, -1) : x.pathname;
    return x.origin === location.origin ? path : String(u);
  } catch {
    return String(u);
  }
}

// ---- redesign patch: remember API responses that arrive before the addons have registered ----
// The redesigned site requests its data very early (e.g. the review). Addons only register their
// listeners after the page has loaded, so without this they would never see the first response.
const uwtBuffered: Record<string, string> = {};
let uwtAddonsReady = false;
console.log("[I]", "[unified-wf-tools]", "[patch]", "BUILD redesign10 loaded; readyState =", document.readyState, "; time since page start (ms) =", Math.round(performance.now()));

/** Called by the entry point once all addons are registered; stops buffering and frees memory. */
export const uwtMarkAddonsReady = () => {
  uwtAddonsReady = true;
  for (const k of Object.keys(uwtBuffered)) delete uwtBuffered[k];
};

function uwtBufferResponse(method: string, url: string | URL, text: string | undefined) {
  if (uwtAddonsReady || String(method).toUpperCase() !== "GET") return;
  const path = uwtPath(url);
  if (!/^\/api\/v1\/vault\//.test(path) || typeof text !== "string" || text.length > 8000000) return;
  uwtBuffered["GET " + path] = text;
  console.log("[I]", "[unified-wf-tools]", "[patch]", "buffered early response:", path, text.length, "chars");
}

function uwtReplayBuffered(method: string, url: string, callback: (result: any) => void) {
  const text = uwtBuffered[String(method).toUpperCase() + " " + url];
  if (typeof text !== "string") return;
  console.log("[I]", "[unified-wf-tools]", "[patch]", "replaying early response to an addon:", method, url);
  setTimeout(() => {
    try {
      const json = JSON.parse(text);
      if (json && !json.captcha) callback(json.result);
    } catch (e) {
      new Logger("core:toolbox").error(e);
    }
  }, 0);
}

// ---- redesign patch: the new Wayfarer site may load data with fetch() instead of XHR ----
interface FetchHandler {
  method?: string,
  url: string,
  /** Return false to block the request. */
  filter?: (bodyText: string | undefined) => boolean,
  /** Rewrites the `result` of the response. */
  manipulate?: (result: any) => any,
  /** Observes the parsed response (and the request body, if any). */
  onResponse?: (json: ApiResult<any>, bodyText: string | undefined) => void,
}
const uwtFetchHandlers: FetchHandler[] = [];
let uwtFetchHookInstalled = false;
const uwtTransportSeen: Record<string, boolean> = {};

/** Logs once per transport (XHR / fetch) which one the site really uses. */
export const uwtTransportsSeen = () => Object.keys(uwtTransportSeen);

function uwtNoteTransport(kind: string, url: string | URL) {
  if (uwtTransportSeen[kind] || !/\/api\/v1\/vault\//.test(String(url))) return;
  uwtTransportSeen[kind] = true;
  console.log("[I]", "[unified-wf-tools]", "[patch]", `Wayfarer API traffic seen via ${kind}:`, String(url));
}

function uwtInstallFetchHook() {
  if (uwtFetchHookInstalled || typeof uwtPageWin.fetch !== "function") return;
  uwtFetchHookInstalled = true;
  const originalFetch = uwtPageWin.fetch;
  uwtPageWin.fetch = async function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    let url = "", method = "GET";
    let bodyText: string | undefined;
    try {
      const isReq = typeof Request !== "undefined" && input instanceof Request;
      url = isReq ? input.url : String(input);
      method = String((init && init.method) || (isReq && input.method) || "GET").toUpperCase();
      const u = new URL(url, location.href);
      url = u.origin === location.origin ? u.pathname : url;
      uwtNoteTransport("fetch", url);
      if (init && typeof init.body === "string") bodyText = init.body;
      else if (isReq && method !== "GET" && method !== "HEAD") bodyText = await input.clone().text();
    } catch { /* never break a request */ }
    const mine = uwtFetchHandlers.filter(h => h.url === url && (!h.method || h.method === method));
    for (const h of mine) {
      if (h.filter) {
        let allowed = true;
        try { allowed = h.filter(bodyText); } catch { allowed = true; }
        if (!allowed) {
          new Logger("core:toolbox").warn(`A Wayfarer Tools addon blocked a ${method} request to ${url}!`);
          throw new TypeError("Request blocked by Wayfarer Tools");
        }
      }
    }
    let response: Response = await originalFetch.apply(this, arguments as unknown as [RequestInfo | URL, RequestInit?]);
    if (!uwtAddonsReady && method === "GET" && /^\/api\/v1\/vault\//.test(url)) {
      try { uwtBufferResponse(method, url, await response.clone().text()); } catch { /* ignore */ }
    }
    const reading = mine.filter(h => !h.filter);
    if (!reading.length) return response;
    try {
      let text = await response.clone().text();
      for (const h of reading) {
        try {
          const json: ApiResult<any> = JSON.parse(text);
          if (!json || json.captcha) continue;
          if (h.manipulate) {
            json.result = h.manipulate(json.result);
            text = JSON.stringify(json);
            response = new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers });
          } else if (h.onResponse) {
            h.onResponse(json, bodyText);
          }
        } catch (e) {
          new Logger("core:toolbox").error(e);
        }
      }
    } catch { /* unreadable body -- leave the response alone */ }
    return response;
  };
}

(function (open) {
  // note which transport the site really uses (shown once in the console)
  const seenUrls = new Set<string>();
  uwtPageXHR.prototype.open = function (this: XMLHttpRequest, m: string, u: string | URL) {
    uwtNoteTransport("XMLHttpRequest", u);
    if (/\/api\/v1\/vault\//.test(String(u)) && !seenUrls.has(m + " " + u) && seenUrls.size < 60) {
      seenUrls.add(m + " " + u);
      console.log("[I]", "[unified-wf-tools]", "[patch]", "API request:", m, String(u));
    }
    if (!uwtAddonsReady && /\/api\/v1\/vault\//.test(String(u))) {
      this.addEventListener("load", function (this: XMLHttpRequest) {
        try {
          uwtBufferResponse(m, u, typeof this.response === "string" ? this.response : (this.responseType === "" || this.responseType === "text" ? this.responseText : undefined));
        } catch { /* ignore */ }
      }, false);
    }
    return open.apply(this, arguments as any);
  } as typeof XMLHttpRequest.prototype.open;
})(uwtPageXHR.prototype.open);
uwtInstallFetchHook();

const getNotificationDiv = () => {
  const div = document.getElementById("uwftcore-notifications");
  if (div) return div;
  const nc = makeChildNode(document.getElementsByTagName("body")[0], "div");
  nc.id = "uwftcore-notifications";
  return nc;
};

interface SidebarMenuItem {
  imageUrl: string,
  label: string,
  callback: () => void,
}

/** An entry in the Wayfarer Tools menu. `icon` is either SVG markup or an image URL. */
interface MenuItem {
  label: string,
  icon: string,
  callback: () => void,
}

interface Importer {
  title: string,
  description: string,
  callback: () => void,
  icon?: string,
}

// ---- redesign: addons can add sections (e.g. the list of active plugins) at the top of the settings window ----
const settingsSections: ((box: HTMLElement) => void)[] = [];

// ---- redesign: the old sidebar (app-sidebar-link) is gone. Sidebar items and addon menu items are all
// shown in the Wayfarer Tools menu, opened with the button at the bottom left (see uwtAddLauncher) ----
const menuItems: Record<string, MenuItem> = {};
const importers: Importer[] = [];

const addSidebarItem = (id: string, item: SidebarMenuItem) => {
  if (id in menuItems) {
    throw new Error(`Tried to add already existing menu item ${id}`);
  }
  menuItems[id] = { label: item.label, icon: item.imageUrl, callback: item.callback };
};

function makeRequest<Tm extends "GET", Tu extends keyof Responses[Tm] & string>(method: Tm, url: Tu): Promise<Responses[Tm][Tu]>;
function makeRequest<Tm extends "POST", Tu extends keyof Responses[Tm] & keyof PostBody & string>(method: Tm, url: Tu, body: PostBody[Tu]): Promise<Responses[Tm][Tu]>;
function makeRequest<Tm extends keyof Responses, Tu extends keyof Responses[Tm] & string>(method: Tm, url: Tu, body?: Tu extends keyof PostBody ? PostBody[Tu] : undefined): Promise<Responses[Tm][Tu]> {
  const logger = new Logger("core:toolbox");
  return new Promise<Responses[Tm][Tu]>((resolve, reject) => {
    const send = (xsrfCookie?: string) => {
      const req = new XMLHttpRequest();
      req.open(method, url, true);
      req.setRequestHeader("Content-Type", "application/json");
      req.setRequestHeader("Accept", "application/json, text/plain, */*");
      req.setRequestHeader("x-angular", "");
      if (xsrfCookie) req.setRequestHeader("X-CSRF-TOKEN", xsrfCookie);
      req.addEventListener("error", () => reject(new Error("Network error")));
      req.addEventListener("load", () => {
        try {
          const data = JSON.parse(req.responseText).result;
          if (req.status >= 200 && req.status < 400) {
            resolve(data);
          } else {
            reject(new Error(`Error response code ${req.status}: ${req.responseText}`));
          }
        } catch {
          reject(new Error(`Unreadable response (status ${req.status}): ${String(req.responseText).slice(0, 200)}`));
        }
      });
      if (typeof body !== "undefined") {
        req.send(JSON.stringify(body));
      } else {
        req.send();
      }
    };
    const parseDocumentCookie = () => {
      logger.debug("Using document.cookie to access XSRF cookie");
      const cookies = document.cookie.split(";").map(c => c.trim());
      for (const cookie of cookies) {
        const [k, v] = cookie.split("=", 2);
        if (k === "XSRF-TOKEN") return decodeURIComponent(v);
      }
    };
    if (method === "GET") {
      // No CSRF header for GET requests
      send();
    } else if (window.cookieStore) {
      logger.debug("Using cookieStore to access XSRF cookie");
      window.cookieStore.get("XSRF-TOKEN").then(cookie => {
        send(cookie?.value);
      }).catch(() => {
        send(parseDocumentCookie());
      });
    } else {
      send(parseDocumentCookie());
    }
  });
};

export interface SanitizedAddon {
  id: string,
  name: string,
  authors: string[],
  description: string,
  depends?: Record<string, string>,
  url?: string,
}

export type NotificationColor = "red" | "green" | "blue" | "purple" | "gold" | "gray" | "brown" | "dark-gray";

class AddonToolbox<Tcfg, Tidb extends IDBStoreDeclaration<Tidb>, Tsess> {
  #addon: Addon<Tcfg, Tidb, Tsess, unknown>;
  constructor(addon: Addon<Tcfg, Tidb, Tsess, unknown>) {
    this.#addon = addon;
  }

  public interceptOpen(method: string, url: string, callback: (e: Event) => void) {
    (function (open) {
      uwtPageXHR.prototype.open = function (m, u) {
        if (uwtPath(u) === url && String(m).toUpperCase() === String(method).toUpperCase()) {
          this.addEventListener("load", callback, false);
        }
        const args: any = arguments;
        open.apply(this, args);
      };
    })(uwtPageXHR.prototype.open);
  }

  public interceptOpenJson<Tm extends keyof Responses, Tu extends keyof Responses[Tm]>(method: Tm, url: Tu, callback: (obj: Responses[Tm][Tu]) => void) {
    if (typeof url !== "string") throw Error("Invalid URL type");
    function handle(_event: Event) {
      try {
        const resp = this.response;
        const json: ApiResult<Responses[Tm][Tu]> = JSON.parse(resp);
        if (!json) return;
        if (json.captcha) return;
        callback(json.result);
      } catch (e) {
        const logger = new Logger("core:toolbox");
        logger.error(e);
      }
    }
    this.interceptOpen(method, url, handle);
    uwtFetchHandlers.push({ method, url, onResponse: (json) => callback(json.result) });
    uwtReplayBuffered(method, url, callback);
  }

  public manipulateOpenJson<Tm extends keyof Responses, Tu extends keyof Responses[Tm]>(method: Tm, url: Tu, callback: (obj: Responses[Tm][Tu]) => Responses[Tm][Tu]) {
    if (typeof url !== "string") throw Error("Invalid URL type");
    function handle(_event: Event) {
      try {
        const resp = this.response;
        const json: ApiResult<Responses[Tm][Tu]> = JSON.parse(resp);
        if (!json) return;
        if (json.captcha) return;
        const nv = callback(json.result);
        json.result = nv;
        Object.defineProperty(this, "response", { writable: true });
        this.response = JSON.stringify(json);
        Object.defineProperty(this, "response", { writable: false });
      } catch (e) {
        const logger = new Logger("core:toolbox");
        logger.error(e);
      }
    }
    this.interceptOpen(method, url, handle);
    uwtFetchHandlers.push({ method, url, manipulate: (result) => callback(result) });
  }

  public interceptSend(url: string, callback: (data: string, request: XMLHttpRequest, response: Event) => void) {
    (function (send) {
      uwtPageXHR.prototype.send = function (body: string) {
        this.addEventListener("load", function (e: Event) {
          if (uwtPath(this.responseURL) === url) {
            callback(body, this, e);
          }
        }, false);
        const args: any = arguments;
        send.apply(this, args);
      };
    })(uwtPageXHR.prototype.send);
  }

  public filterSend(method: string, url: string, filter: (data: string, request: XMLHttpRequest) => boolean) {
    const addonId = this.#addon.id;
    (function (open) {
      uwtPageXHR.prototype.open = function (m, u) {
        this._uwtTools = {
          method: m,
          url: u,
        };
        const args: any = arguments;
        open.apply(this, args);
      };
    })(uwtPageXHR.prototype.open);
    (function (send) {
      uwtPageXHR.prototype.send = function (body: string) {
        if (!this._uwtTools || String(this._uwtTools.method).toUpperCase() !== String(method).toUpperCase() || uwtPath(this._uwtTools.url) !== url || filter(body, this)) {
          const args: any = arguments;
          send.apply(this, args);
        } else {
          const logger = new Logger("core:toolbox");
          logger.warn(`Wayfarer Tools addon ${addonId} blocked a ${method} request to ${url}!`);
        }
      };
    })(uwtPageXHR.prototype.send);
  }

  public interceptSendJson<Tu extends keyof PostBody & keyof Responses["POST"]>(url: Tu, callback: (sent: PostBody[Tu], received: Responses["POST"][Tu]) => void) {
    function handle(data: string, request: XMLHttpRequest, _event: Event) {
      try {
        const resp = request.response;
        const jSent: PostBody[Tu] = JSON.parse(data);
        const jRecv: ApiResult<Responses["POST"][Tu]> = JSON.parse(resp);
        if (!jRecv) return;
        if (jRecv.captcha) return;
        callback(jSent, jRecv.result);
      } catch (e) {
        const logger = new Logger("core:toolbox");
        logger.error(e);
      }
    }
    this.interceptSend(url, handle);
    uwtFetchHandlers.push({
      url,
      onResponse: (jRecv, bodyText) => {
        if (typeof bodyText !== "string") return;
        callback(JSON.parse(bodyText), jRecv.result);
      },
    });
  }

  public filterSendJson<Tm extends keyof Responses, Tu extends keyof PostBody & keyof Responses[Tm]>(method: Tm, url: Tu, callback: (sent: PostBody[Tu]) => boolean) {
    function handle(data: string) {
      try {
        const jSent: PostBody[Tu] = JSON.parse(data);
        return callback(jSent);
      } catch (e) {
        const logger = new Logger("core:toolbox");
        logger.error(e);
        return true;
      }
    }
    this.filterSend(method, url, handle);
    uwtFetchHandlers.push({ method, url, filter: (bodyText) => (typeof bodyText === "string" ? handle(bodyText) : true) });
  }

  public makeRequest = makeRequest;

  public observeAddedNodes<T extends Node>(nodeName: string, callback: (node: T) => void) {
    observerHandlers.push({ nodeName, callback });
  }

  public observeNodeAttributeChanges<T extends Node>(nodeName: string, attributeFilter: string[], callback: (node: T) => void) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target.nodeName === nodeName) {
          callback(mutation.target as T);
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
  public addSettingsSection(render: (box: HTMLElement) => void) {
    settingsSections.push(render);
  }

  public listAvailableAddons() {
    return addons.map((a: UnspecAddon) => {
      const copy = {...a} as Partial<UnspecAddon> & SanitizedAddon;
      delete copy.defaultConfig;
      delete copy.sessionData;
      delete copy.initialize;
      return copy as SanitizedAddon;
    });
  }

  public notify(options: {
    color: NotificationColor,
    message: string | Node,
    icon?: string,
    dismissable?: boolean,
  }) {
    const div = getNotificationDiv();
    const message = typeof options.message === "string" ? document.createTextNode(options.message) : options.message;

    const notification = makeChildNode(div, "div");
    notification.classList.add("uwftcore-notification", `uwftcore-nbg-${options.color}`);
    if (options.dismissable ?? true) {
      notification.addEventListener("click", () => notification.remove());
    }
    const contentWrapper = makeChildNode(notification, "div");
    contentWrapper.classList.add("uwftcore-notify-content-wrapper");

    if (typeof options.icon !== "undefined") {
      const iconWrapper = makeChildNode(contentWrapper, "div");
      iconWrapper.classList.add("uwftcore-notify-icon-wrapper");
      const img = makeChildNode(iconWrapper, "img") as HTMLImageElement;
      img.src = options.icon;
    }

    const content = makeChildNode(contentWrapper, "div");
    content.appendChild(message);
    return {
      dismiss: () => notification.remove(),
      updateContents: (message: string | Node) => {
        for (let i = content.childNodes.length - 1; i >= 0; i--) {
          content.childNodes[i].remove();
        }
        content.appendChild(
          typeof message === "string"
            ? document.createTextNode(message)
            : message,
        );
      },
    };
  }

  public addSidebarItem(id: string, item: SidebarMenuItem) {
    addSidebarItem(`addon-${this.#addon.id}-${id}`, item);
  }

  /** Adds an entry to the Wayfarer Tools menu (the button at the bottom left). */
  public addMenuItem(id: string, item: MenuItem) {
    menuItems[`addon-${this.#addon.id}-${id}`] = item;
  }

  public async createModal(...cssClasses: string[]) {
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

  public addImporter(importer: Importer) {
    importers.push(importer);
    if (!("core-importer" in menuItems)) {
      addSidebarItem("core-importer", {
        imageUrl: ImportIcon,
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

  public get username() {
    return userName;
  }

  public get l10n(): Record<string, string> {
    let i18n: Record<string, Record<string, string>> = {};
    try {
      i18n = JSON.parse(localStorage["@transloco/translations"] || "{}");
    } catch { /* fall back to empty translations */ }
    return i18n[language] || {};
  }

  public i18nPrefixResolver(prefix: string) {
    const l10n = this.l10n;
    return (id: string) => l10n[prefix + id];
  }

  public async openIDB<Tk extends keyof Tidb & string>(objectStoreName: Tk, mode: "readonly" | "readwrite") {
    const scopedOSN = `${this.#addon.id}-${objectStoreName}`;
    const db = await getIDBInstance(scopedOSN);
    return new IDBStoreConnection<Tidb[Tk]>(db, scopedOSN, mode);
  }

  public get session() {
    return new AddonSettings<Tsess>(
      sessionStorage,
      this.#addon.id,
      this.#addon.sessionData,
      () => {},
    );
  }

  public getAddonAPI<Ti extends keyof typeof ADDON_APIS>(addon: Ti): typeof ADDON_APIS[Ti] {
    return ADDON_APIS[addon];
  }
}

export interface Addon<Tcfg, Tidb extends IDBStoreDeclaration<Tidb>, Tsess, Tapi> extends SanitizedAddon {
  defaultConfig: Tcfg,
  sessionData: Tsess,
  initialize: (
    toolbox: AddonToolbox<Tcfg, Tidb, Tsess>,
    logger: Logger,
    config: AddonSettings<Tcfg>,
  ) => Tapi,
}

interface AddonOptionsEntry {
  addon: UnspecAddon,
  options: Record<PropertyKey, InternalEditableOption<any, any>>,
}

export const register = <Tidb extends IDBStoreDeclaration<Tidb>, Tapi>() => <Tcfg, Tsess>(addon: Addon<Tcfg, Tidb, Tsess, Tapi>) => addons.push(addon);
export const initializeAllAddons = () => {
  const logger = new Logger("core:init");
  if (initialized) {
    throw new Error("Addons have already been initialized!");
  }
  initialized = true;
  const coreSettings = new AddonSettings(
    localStorage,
    CORE_ADDON_ID,
    { activePlugins: <string[]>[] },
    () => {},
  );
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
  const options: Record<string, AddonOptionsEntry> = {};
  for (const addon of addons) {
    if (toInitialize.includes(addon.id)) {
      logger.info(`Initializing addon ${addon.id}...`);
      try {
        const api = addon.initialize(
          new AddonToolbox(addon),
          new Logger(`addon:${addon.id}`),
          new AddonSettings(
            localStorage,
            addon.id,
            addon.defaultConfig,
            (key, opts) => {
              if (!(addon.id in options)) {
                options[addon.id] = { addon, options: {} };
              }
              options[addon.id].options[key] = opts;
            },
          ),
        );
        if (api) {
          ADDON_APIS[addon.id as keyof typeof ADDON_APIS] = api;
        }
      } catch (err) {
        logger.error(`Addon ${addon.id} failed to initialize and was skipped:`, err);
      }
    }
  }
  if (Object.keys(options).length > 0) {
    logger.info("Hooking settings editor...");
    const toolbox = new AddonToolbox({} as any);
    toolbox.interceptOpenJson(
      "GET", "/api/v1/vault/settings",
      renderEditors(Object.values(options)),
    );
    uwtAddLauncher(Object.values(options));
  }
  logger.info("Addon initialization done.");
};

const renderEditors = (options: AddonOptionsEntry[]) => async () => {
  // old settings page only; the redesigned site has no <app-settings> (see uwtAddSettingsButton)
  const ref = document.querySelector("app-settings");
  if (!ref) return;
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

function uwtMakeMenuItem(parent: HTMLElement, item: MenuItem) {
  const button = makeChildNode(parent, "button") as HTMLButtonElement;
  button.type = "button";
  button.className = "uwt-menu-item";
  const icon = makeChildNode(button, "span");
  icon.className = "uwt-menu-icon";
  if (item.icon.trimStart().startsWith("<svg")) {
    icon.innerHTML = item.icon;
  } else {
    (makeChildNode(icon, "img") as HTMLImageElement).src = item.icon;
  }
  makeChildNode(button, "span", item.label);
  return button;
}

async function uwtOpenSettingsWindow(options: AddonOptionsEntry[]) {
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
  const { container, dismiss } = await new AddonToolbox({} as any).createModal("uwt-settings-modal");
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
    } catch (e) {
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

function uwtIsOwnUi(el: Element) {
  return /(^|\s)(uwt|uwf)/.test(el.id) || /(^|\s)(uwt|uwf)/.test(el.getAttribute("class") ?? "");
}

function uwtPageReport(): string {
  const MAX_LINES = 900;
  const lines: string[] = [];
  const testIds = new Map<string, number>();
  const customTags = new Map<string, number>();
  const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}...` : t);
  const labelText = (el: Element) => (el.textContent ?? "").trim().replace(/\s+/g, " ");

  const describe = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    const parts = [tag];
    const attr = (name: string, label = name) => {
      const v = el.getAttribute(name);
      if (v) parts.push(`${label}="${clip(v, 60)}"`);
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
    if ((el as HTMLButtonElement).disabled) parts.push("disabled");
    const cls = el.getAttribute("class");
    if (cls && el.tagName !== "svg") parts.push(`class="${clip(cls.trim().replace(/\s+/g, " "), 100)}"`);
    if (el instanceof HTMLImageElement && el.src) {
      try {
        parts.push(`src-host=${new URL(el.src, location.href).hostname}`);
      } catch { /* ignore */ }
    }
    const role = el.getAttribute("role") ?? "";
    if (UWT_REPORT_LABELLED.has(el.tagName) || UWT_REPORT_ROLES.has(role)) {
      const t = labelText(el);
      if (t) parts.push(`text="${clip(t, 50)}"`);
    } else {
      let own = 0;
      for (const n of Array.from(el.childNodes)) if (n.nodeType === Node.TEXT_NODE) own += (n.textContent ?? "").trim().length;
      if (own > 0) parts.push(`own-text(${own} chars)`);
    }
    return parts.join(" ");
  };

  const hasOwnText = (el: Element) =>
    Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim().length > 0);

  const interesting = (el: Element) =>
    el.hasAttribute("data-testid") || !!el.id || el.hasAttribute("role") || el.hasAttribute("aria-label") ||
    UWT_REPORT_STRUCT.has(el.tagName.toUpperCase()) || el.tagName.includes("-") || hasOwnText(el);

  const signature = (el: Element) =>
    `${el.tagName}|${el.getAttribute("data-testid") ?? ""}|${el.getAttribute("role") ?? ""}|${(el.getAttribute("class") ?? "").slice(0, 40)}`;

  const walk = (el: Element, depth: number) => {
    if (lines.length >= MAX_LINES || depth > 16) return;
    const upper = el.tagName.toUpperCase();
    if (UWT_REPORT_SKIP.has(upper) || uwtIsOwnUi(el)) return;
    const show = interesting(el);
    if (show) {
      lines.push(`${"  ".repeat(depth)}${describe(el)}`);
      const tid = el.getAttribute("data-testid");
      if (tid) testIds.set(tid, (testIds.get(tid) ?? 0) + 1);
      if (el.tagName.includes("-")) customTags.set(el.tagName.toLowerCase(), (customTags.get(el.tagName.toLowerCase()) ?? 0) + 1);
      if (upper === "SVG") return;
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
          while (j + 1 < children.length && signature(children[j + 1]) === sig) j++;
          if (j > i || repeats >= 2) {
            lines.push(`${"  ".repeat(depth + (show ? 1 : 0))}... (+${j - i + 1} similar ${child.tagName.toLowerCase()})`);
            i = j;
            continue;
          }
        }
      } else {
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
  const { container, dismiss } = await new AddonToolbox({} as any).createModal("uwt-report-modal");
  const close = makeChildNode(container, "button", "\u00d7");
  close.className = "uwt-report-close";
  close.addEventListener("click", dismiss);
  makeChildNode(container, "h2", "Page structure report");
  makeChildNode(container, "p", "An outline of the structure of the page you are on. It contains element names, test ids and the labels of buttons and headings, but no other page text and no input values. Copy it and share it so that addons can be adapted to this page.");
  const area = makeChildNode(container, "textarea") as HTMLTextAreaElement;
  area.className = "uwt-report-text";
  area.readOnly = true;
  area.value = report;
  const copy = makeChildNode(container, "button", "Copy to clipboard");
  copy.className = "uwftcore-ui-button";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(report);
      copy.textContent = "Copied!";
    } catch {
      area.select();
      copy.textContent = "Select the text and copy it";
    }
  });
}

function uwtAddLauncher(options: AddonOptionsEntry[]) {
  if (document.getElementById("uwt-menu-button")) return;
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
    if (items.length > 0) makeChildNode(menu, "div").className = "uwt-menu-sep";
    uwtMakeMenuItem(menu, { label: "Settings", icon: UWT_SETTINGS_ICON, callback: () => undefined }).addEventListener("click", () => {
      closeMenu();
      void uwtOpenSettingsWindow(options);
    });
    menu.hidden = false;
    btn.classList.add("uwt-open");
  };

  btn.addEventListener("click", () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target as Node) && !btn.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  document.body.append(menu, btn);
}

function uwtFillSettingsPane(box: HTMLElement, options: AddonOptionsEntry[]) {
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
        save(v: any) {
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
}
