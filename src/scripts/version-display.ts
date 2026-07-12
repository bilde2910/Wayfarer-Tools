// Copyright 2026 tehstone, bilde2910
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

import { CheckboxEditor, register, SelectBoxEditor } from "../core";
import { untilTruthy, makeChildNode } from "../utils";
import { ApiResult } from "../types";

import "./version-display.css";

export default () => {
  register()({
    id: "version-display",
    name: "Version Display",
    authors: ["tehstone", "bilde2910"],
    description: "Displays the current Wayfarer version",
    defaultConfig: {
      displayMode: "version" as "full" | "most" | "version" | "versionHash" | "dateOnly" | "dateTime" | "commitOnly",
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

      let seenVersion: string | null = null;
      let looking = false;

      function parseResponse() {
        try {
          const json = JSON.parse(this.response) as ApiResult<any>;
          if (!json) return;
          if (json.version) void setVersion(json.version);
        } catch {
          // Pass
        }
      }

      const getContainer = async () => {
        if (looking) return;
        looking = true;
        let box = document.getElementById("uwtvd-display");
        let span;
        if (box === null) {
          const container = await untilTruthy(() => document.querySelector("wf-logo"));
          if (!container.classList.contains("uwtvd-touched")) container.classList.add("uwtvd-touched");
          box = makeChildNode(container, "div");
          box.id = "uwtvd-display";
          span = makeChildNode(box, "span");
          container.parentElement!.style.width = "150px";
        } else {
          span = box.querySelector("span")!;
        }
        looking = false;
        return span;
      };

      const cleanVersion = (version: string) => {
        const mode = config.get("displayMode");
        if (mode == "full") return version;
        const def = version.replace(/[A-Za-z-]*/, "");
        if (mode == "most") return def;

        const pattern = /^release-wayfarer-web-(?<version>[0-9-]+)-(?<commit>[0-9a-f]{8})-(?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(?<day>[0-9]+)-(?<hour>[0-9]+)-(?<minute>[0-9]+)$/g;
        const g = pattern.exec(version)?.groups;
        if (!g) return def;

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

      const setVersion = async (version: string) => {
        const span = await getContainer();
        if (!span) return;
        span.textContent = cleanVersion(version);
        span.title = version;

        if (!seenVersion) seenVersion = version;
        else if (seenVersion !== version) {
          const body = document.querySelector("body")!;
          if (config.get("flashVersion") && !body.classList.contains("uwtvd-update-available")) body.classList.add("uwtvd-update-available");
          if (config.get("alertNewVersion")) {
            const reload = confirm(`Addon message: The Wayfarer API appears to have just updated from version ${seenVersion} to version ${version}. It is highly recommended that you reload the page now to avoid unexpected Wayfarer behavior. Reload now?`);
            seenVersion = version;
            if (reload) location.reload();
          }
        }
      };

      (function (open) {
        XMLHttpRequest.prototype.open = function (_m, _u) {
          this.addEventListener("load", parseResponse, false);
          const args: any = arguments;
          open.apply(this, args);
        };
      })(XMLHttpRequest.prototype.open);
    },
  });
};
