// Copyright 2025 Tntnnbltn, bilde2910
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

import { CheckboxEditor, register } from "../core";
import { makeChildNode, uwtGoogle } from "../utils";
import { AnyContribution, AnyEditContribution, ContributionStatus, ContributionType, EditContributionType, SubmissionsResult } from "../types";

import "./contribution-management-layout.css";

interface DisplayedTag {
  style: "queue" | "accepted" | "rejected",
  label: string,
}

const STATUS_MAP: Record<ContributionStatus, DisplayedTag> = {
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

const TAG_COLORS: Record<DisplayedTag["style"], string> = {
  accepted: "#08CA00",
  queue: "#1E88E5",
  rejected: "#E53935",
};

export default () => {
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
      let nominations: AnyContribution[] | null = null;
      let mapSession = 0;

      const makeTag = (tag: DisplayedTag) => {
        const span = document.createElement("span");
        span.className = `uwtcml-tag uwtcml-tag--${tag.style}`;
        span.textContent = tag.label;
        return span;
      };

      const tagFor = (data: AnyEditContribution): DisplayedTag => wasOverturned(data)
        ? { style: "accepted", label: "Overturned" }
        : STATUS_MAP[data.status];

      const generateEditSummaryTable = (edits: AnyEditContribution[], type: EditContributionType) => {
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

      const addSatMap = async (mapDiv: HTMLElement, poi: AnyEditContribution["poiData"], edits: AnyEditContribution[], session: number) => {
        // the page's own Google Maps API (not the userscript sandbox's view of the window) must be loaded
        for (let i = 0; i < 40 && !uwtGoogle()?.maps; i++) await new Promise(r => setTimeout(r, 250));
        if (session !== mapSession) return;
        const G = uwtGoogle();
        if (!G?.maps) {
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
          if (edit.type !== ContributionType.EDIT_LOCATION || (edit.lat === lat && edit.lng === lng)) continue;
          const color = TAG_COLORS[tagFor(edit).style];
          const suggested = { lat: edit.lat, lng: edit.lng };
          new G.maps.Marker({
            map: svMap,
            position: suggested,
            icon: generateSvgMapMarker(color),
            title: `${edit.day}: ${tagFor(edit).label}`,
            zIndex: 4,
          });
          const polylineOptions: google.maps.PolylineOptions = {
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
            }}],
          });
          new G.maps.Polyline({
            ...polylineOptions,
            strokeColor: "#ffffff",
            strokeWeight: 6,
            zIndex: 1,
            icons: [{ icon: {
              path: "M 0,0 1,2 M 0,0 -1,2",
            }}],
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
          G.maps.event.addListenerOnce(svMap, "bounds_changed", function (this: google.maps.Map) {
            if ((this.getZoom() ?? 20) > 17) this.setZoom(17);
          });
          svMap.fitBounds(bounds);
        }
      };

      const renderDetail = (detail: HTMLElement, wayspotEdits: AnyEditContribution[]) => {
        detail.innerHTML = "";
        const session = ++mapSession;
        const latest = [...wayspotEdits].sort((a, b) => b.order - a.order)[0];
        const poi = latest.poiData;

        const head = makeChildNode(detail, "div");
        head.className = "uwtcml-head";
        makeChildNode(head, "h3", poi.title || "(untitled)");
        if (poi.state === "LIVE") {
          makeChildNode(head, "span", "Live").className = "uwtcml-tag uwtcml-tag--accepted";
        } else if (poi.state === "RETIRED") {
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
            const image = makeChildNode(details, "img") as HTMLImageElement;
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
          const editTypes: { type: EditContributionType, label: string }[] = [
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
            if (edits.length === 0) continue;
            any = true;
            const editsContainer = makeChildNode(summary, "div");
            editsContainer.classList.add("uwtcml-edits-container");
            makeChildNode(editsContainer, "div", editType.label).classList.add("uwtcml-edits-summary-header");
            editsContainer.appendChild(generateEditSummaryTable(edits, editType.type));
          }
          if (!any) makeChildNode(summary, "p", "No title, description or location edits for this Wayspot.");
        }
      };

      const renderOverview = (body: HTMLElement, all: AnyContribution[]) => {
        body.innerHTML = "";
        const edits = all.filter((n): n is AnyEditContribution => n.type !== ContributionType.NOMINATION && !!n.poiData && !!n.poiData.id);
        const byWayspot = new Map<string, AnyEditContribution[]>();
        for (const edit of edits) {
          let group = byWayspot.get(edit.poiData.id);
          if (!group) {
            group = [];
            byWayspot.set(edit.poiData.id, group);
          }
          group.push(edit);
        }
        const latestOrder = (g: AnyEditContribution[]) => Math.max(...g.map(e => e.order));
        const groups = Array.from(byWayspot.values()).sort((a, b) => latestOrder(b) - latestOrder(a));
        if (groups.length === 0) {
          makeChildNode(body, "p", "You have no edits or photo submissions yet.");
          return;
        }

        const side = makeChildNode(body, "div");
        side.className = "uwtcml-side";
        const search = makeChildNode(side, "input") as HTMLInputElement;
        search.type = "text";
        search.placeholder = "Search Wayspots";
        const list = makeChildNode(side, "div");
        list.className = "uwtcml-list";
        const detail = makeChildNode(body, "div");
        detail.className = "uwtcml-detail";

        const items: { button: HTMLElement, title: string }[] = [];
        for (const group of groups) {
          const poi = [...group].sort((a, b) => b.order - a.order)[0].poiData;
          const button = makeChildNode(list, "button", `${poi.title || "(untitled)"} (${group.length})`);
          button.className = "uwtcml-item";
          button.addEventListener("click", () => {
            for (const item of items) item.button.classList.toggle("uwtcml-active", item.button === button);
            renderDetail(detail, group);
          });
          items.push({ button, title: (poi.title || "").toLowerCase() });
        }
        search.addEventListener("input", () => {
          const q = search.value.trim().toLowerCase();
          for (const item of items) item.button.style.display = item.title.includes(q) ? "" : "none";
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
        renderOverview(body, nominations);
      };

      // redesign: shown in the Wayfarer Tools menu (the button at the bottom left)
      toolbox.addMenuItem("contribution-management-layout", {
        label: "Edits by Wayspot",
        icon: "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z\"/></svg>",
        callback: () => { void openOverview(); },
      });

      toolbox.interceptOpenJson("GET", "/api/v1/vault/manage", (data: SubmissionsResult) => {
        if (data && data.submissions) nominations = data.submissions;
      });
    },
  });
};

const wasOverturned = (data: AnyEditContribution) =>
  data.status === ContributionStatus.REJECTED &&
  (
    (data.type === ContributionType.EDIT_TITLE && data.title.trim() === data.poiData.title.trim()) ||
    (data.type === ContributionType.EDIT_DESCRIPTION && data.description.trim() === data.poiData.description.trim()) ||
    (data.type === ContributionType.EDIT_LOCATION && data.lat === data.poiData.lat && data.lng === data.poiData.lng) ||
    (data.type === ContributionType.PHOTO && data.imageUrl === data.poiData.imageUrl)
  );

const generateSvgMapMarker = (fillColor: string) => {
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
};
