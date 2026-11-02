// Copyright 2025 bilde2910
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
import { ContributionStatus, ContributionType, Nomination, SubmissionsResult } from "../types";

import "./proximity-block.css";

import { S2 } from "s2-geometry";

const STATUS_LABELS: Record<string, string> = {
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

export default () => {
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
      let nominations: Nomination[] = [];
      let loaded = false;

      const handleNominations = (result: SubmissionsResult) => {
        nominations = result.submissions.filter(s => s.type === ContributionType.NOMINATION);
        loaded = true;
      };

      const getConflictingS2L17Cells = (lat: number, lng: number) => {
        const center = S2.S2Cell.FromLatLng(S2.L.LatLng(lat, lng), 17);
        const neighbors = center.getNeighbors();
        const conflicting = [center, ...neighbors];
        for (const neighbor of neighbors) {
          const possibleCorners = neighbor.getNeighbors()
            .filter(c => !conflicting.some(n => n.toString() === c.toString()));
          for (const cand of possibleCorners) {
            const cornerNeighbors = cand.getNeighbors().filter(c => neighbors.some(n => n.toString() === c.toString())).length;
            // A candidate is a corner if two of the corner's neighbors are also neighbors of the center cell
            if (cornerNeighbors === 2) conflicting.push(cand);
          }
        }
        return conflicting;
      };

      const proximityBlockingFor = (nom: Nomination) => {
        const conflicting = getConflictingS2L17Cells(nom.lat, nom.lng).map(c => c.toString());
        const blockingNoms = nominations
          .filter(n => !n.upgraded &&
            (
              n.status === ContributionStatus.NOMINATED ||
              n.status === ContributionStatus.VOTING ||
              n.status === ContributionStatus.HELD
            ),
          )
          .filter(n => n.id !== nom.id)
          .filter(n => conflicting.includes(S2.S2Cell.FromLatLng(n, 17).toString()));
        return blockingNoms;
      };

      const isActive = (n: Nomination) => !n.upgraded && (
        n.status === ContributionStatus.NOMINATED ||
        n.status === ContributionStatus.VOTING ||
        n.status === ContributionStatus.HELD
      );

      // If the current Wayspot data is blocked by another in-voting nomination, it is "proximity blocked".
      const isProximityBlocked = (nom: Nomination, blocking: Nomination[]) =>
        nom.status === ContributionStatus.NOMINATED && !nom.upgraded &&
        blocking.some(n => n.status === ContributionStatus.VOTING);

      const makeTag = (label: string, style: "queue" | "blocked") => {
        const span = document.createElement("span");
        span.className = `uwtpb-tag uwtpb-tag--${style}`;
        span.textContent = label;
        return span;
      };

      const makeTable = (title: string, nominations: Nomination[]) => {
        const container = document.createElement("div");
        container.classList.add("uwftpb-container");
        const header = makeChildNode(container, "div", title);
        header.classList.add("uwftpb-header");
        const table = makeChildNode(container, "table") as HTMLTableElement;
        table.classList.add("uwftpb-table");

        // Sort nominations by date in descending order (most recent to oldest)
        nominations.sort((a, b) => b.order - a.order);
        // Populate table with nomination data
        for (const nom of nominations) {
          const row = table.insertRow();
          makeChildNode(row, "td", nom.day);
          makeChildNode(row, "td", nom.title);
          makeChildNode(makeChildNode(row, "td"), "span").replaceWith(makeTag(STATUS_LABELS[nom.status] ?? "Unknown", "queue"));
        }

        return container;
      };

      const renderDetail = (detail: HTMLElement, data: Nomination, blocking: Nomination[]) => {
        detail.innerHTML = "";
        const head = makeChildNode(detail, "div");
        head.className = "uwtpb-head";
        makeChildNode(head, "h3", data.title || "(untitled)");
        head.appendChild(makeTag(STATUS_LABELS[data.status] ?? data.status, "queue"));
        if (isProximityBlocked(data, blocking)) head.appendChild(makeTag("Proximity Blocked", "blocked"));

        const blockedBy: Nomination[] = [];
        const willBlock: Nomination[] = [];
        for (const other of blocking) {
          if (other.status === ContributionStatus.VOTING) {
            blockedBy.push(other);
          } else {
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
            if (data && data.submissions) handleNominations(data);
          } catch (e) {
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
        const allBox = makeChildNode(allLabel, "input") as HTMLInputElement;
        allBox.type = "checkbox";
        allLabel.appendChild(document.createTextNode(" Include nominations that are no longer active"));
        const list = makeChildNode(side, "div");
        list.className = "uwtpb-list";
        const detail = makeChildNode(body, "div");
        detail.className = "uwtpb-detail";

        const cache = new Map<string, Nomination[]>();
        const relationsFor = (nom: Nomination) => {
          let r = cache.get(nom.id);
          if (!r) {
            r = proximityBlockingFor(nom);
            cache.set(nom.id, r);
          }
          return r;
        };

        const rebuild = () => {
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
          const buttons: HTMLElement[] = [];
          for (const { nom, blocking } of related) {
            const button = makeChildNode(list, "button");
            button.className = "uwtpb-item";
            makeChildNode(button, "span", nom.title || "(untitled)");
            const blocked = isProximityBlocked(nom, blocking);
            makeChildNode(button, "small", `${STATUS_LABELS[nom.status] ?? nom.status}${blocked ? " - Proximity Blocked" : ""}`);
            button.addEventListener("click", () => {
              for (const b of buttons) b.classList.toggle("uwtpb-active", b === button);
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
};
