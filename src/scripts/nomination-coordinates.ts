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
import { makeChildNode } from "../utils";
import { AnyContribution, SubmissionsResult } from "../types";

import "./nomination-coordinates.css";

export default () => {
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
      let nominations: AnyContribution[] | null = null;

      const coordinatesOf = (data: AnyContribution) => {
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
            if (data && data.submissions) nominations = data.submissions;
          } catch (e) {
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
        const search = makeChildNode(body, "input") as HTMLInputElement;
        search.type = "text";
        search.placeholder = "Search by title or location";
        const scroller = makeChildNode(body, "div");
        scroller.className = "uwtnc-scroll";
        const table = makeChildNode(scroller, "table");
        table.className = "uwtnc-table";
        const headRow = makeChildNode(makeChildNode(table, "thead"), "tr");
        for (const label of ["Title", "Type", "Date", "Location", "Coordinates"]) makeChildNode(headRow, "th", label);
        const tbody = makeChildNode(table, "tbody");

        const rows: { row: HTMLElement, text: string }[] = [];
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
          for (const r of rows) r.row.style.display = r.text.includes(q) ? "" : "none";
        });
      };

      // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
      toolbox.addMenuItem("nomination-coordinates", {
        label: "Contribution coordinates",
        icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/></svg>",
        callback: () => { void openWindow(); },
      });

      toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", (data: SubmissionsResult) => {
        if (data && data.submissions) nominations = data.submissions;
      });
    },
  });
};
