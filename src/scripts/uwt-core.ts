import { CheckboxEditor, register } from "../core";
import { untilTruthy, makeChildNode } from "../utils";
import { UserSettings } from "../types";
import { StoredEmail } from "../email/types";

import "./uwt-core.css";
import { EmailAPI } from "../email";

export interface CorePluginAPI {
  email: () => Promise<EmailAPI>,
}

interface IdbStores {
  email: StoredEmail,
}

export default () => {
  register<IdbStores, CorePluginAPI>()({
    id: "uwt-core",
    name: "Unified Wayfarer Tools Core",
    authors: ["bilde2910"],
    description: "Unified Wayfarer Tools plugin loader and core utilities",
    url: "https://github.com/bilde2910/Wayfarer-Tools",
    defaultConfig: {
      activePlugins: <string[]>[],
      externCompat: false,
    },
    sessionData: {},
    initialize: (toolbox, logger, config): CorePluginAPI => {
      config.setUserEditable("externCompat", {
        label: "External addon compatibility",
        help: "Exposes UWT APIs to the browser, allowing external userscripts not part of UWT to interact with addons in UWT that expose an API",
        editor: new CheckboxEditor(),
      });

      const renderOprtSettings = async (_data: UserSettings) => {
        const ref = await untilTruthy(() => document.querySelector("app-settings"));
        const box = document.createElement("div");
        box.classList.add("max-w-md");
        const mainSettings = document.getElementById("uwftoolsMainPluginSettingsPane");
        if (mainSettings) {
          ref.insertBefore(box, mainSettings);
        } else {
          ref.appendChild(box);
        }
        const header = makeChildNode(box, "h3", "Unified Wayfarer Tools");
        header.classList.add("wf-page-header");
        const activeAddonsBox = makeChildNode(box, "div");
        activeAddonsBox.classList.add("settings__item");
        activeAddonsBox.classList.add("settings-item");
        const activeAddonsHeader = makeChildNode(activeAddonsBox, "div");
        activeAddonsHeader.classList.add("settings-item__header");
        makeChildNode(activeAddonsHeader, "div", "Active Plugins");
        const activeAddonsBody = makeChildNode(activeAddonsBox, "div");
        activeAddonsBody.classList.add("settings-item__description");
        const refreshReminder = makeChildNode(activeAddonsBody, "p",
          "Please refresh the page for changes in active addons to take effect.",
        );
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
          } else {
            const isAddonEnabled = config.get("activePlugins").includes(addon.id);
            if (isAddonEnabled) checkbox.setAttribute("checked", "checked");
            checkbox.addEventListener("change", () => {
              let plugins = config.get("activePlugins");
              const newState = !plugins.includes(addon.id);
              if (newState) plugins.push(addon.id);
              else plugins = plugins.filter(n => n !== addon.id);
              config.set("activePlugins", plugins);
              logger.info(addon.id, "was", newState ? "enabled" : "disabled");
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
              const a = makeChildNode(makeChildNode(ul, "li"), "a", k) as HTMLAnchorElement;
              a.href = addon.depends[k];
              a.target = "_blank";
            }
          }
        }
      };

      const setupEmailIDB = async () => {
        // This scope triggers an open of the database, which in turn makes sure that the email
        // object store exists. Not performing this check here may lead to deadlocks down the
        // line. We don't need to actually use the database for anything; simply opening it and
        // closing it will suffice.

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        using _ = await toolbox.openIDB("email", "readonly");
      };

      toolbox.interceptOpenJson("GET", "/api/v1/vault/settings", renderOprtSettings);

      if (config.get("externCompat")) {
        const publicApi = {
          getAddonAPI: toolbox.getAddonAPI,
        };
        const w = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window) as Window & { UWTApi?: typeof publicApi };
        w.UWTApi = publicApi;
      }

      let emailAPI: EmailAPI | null = null;
      return {
        email: async () => {
          if (emailAPI !== null) return emailAPI;
          await setupEmailIDB();
          emailAPI = new EmailAPI((mode) => toolbox.openIDB("email", mode));
          return emailAPI;
        },
      };
    },
  });
};
