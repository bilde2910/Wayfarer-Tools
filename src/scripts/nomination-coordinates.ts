// Copyright 2026 bilde2910
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

import { register } from "../core";
import { untilTruthy } from "../utils";
import { AnyContribution } from "../types";
import { AppSubmissionsListItemElement } from "../unsafe";

import "./nomination-coordinates.css";

export default () => {
  register()({
    id: "nomination-coordinates",
    name: "Nomination Coordinates",
    authors: ["bilde2910"],
    description: "Adds coordinates on the contribution screen for all contributions, clickable to copy them to the clipboard",
    defaultConfig: {},
    sessionData: {},
    initialize: (toolbox, _logger, _config) => {
      const detectAppListItems = async () => {
        const parentContainer = await untilTruthy(() => document.querySelector(".submissions"));
        // Scan existing elements
        const existingItems = parentContainer.querySelectorAll<AppSubmissionsListItemElement>("app-submissions-list-item");
        for (const item of existingItems) addListItemListener(item);
        // Set up MutationObserver for new elements
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeName === "APP-SUBMISSIONS-LIST-ITEM") {
                addListItemListener(node as AppSubmissionsListItemElement);
              }
            }
          }
        });
        observer.observe(parentContainer, {
          childList: true,
          subtree: true,
        });
      };

      const addListItemListener = (item: AppSubmissionsListItemElement) => {
        const data = item.__ngContext__[22];
        item.addEventListener("click", () => {
          void addCoordinates(data);
        });
      };

      const addCoordinates = async (data: AnyContribution) => {
        const lat = "lat" in data.poiData ? data.poiData.lat : data.lat;
        const lng = "lng" in data.poiData ? data.poiData.lng : data.lng;
        const locationP = await untilTruthy(() => document.querySelector<HTMLParagraphElement>("app-submissions app-details-pane p"));
        const coordinates = `${lat},${lng}`;
        const newText = `${data.city} ${data.state} (${coordinates})`;
        locationP.textContent = newText;
        locationP.style.cursor = "pointer";
        locationP.title = "Copy coordinates to clipboard";
        locationP.addEventListener("click", () => {
          void navigator.clipboard.writeText(coordinates);
        });
      };

      toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", detectAppListItems);
    },
  });
};
