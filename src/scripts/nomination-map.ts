// Copyright 2025 tehstone, bilde2910, Tntnnbltn
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

import { NumericInputEditor, register } from "../core";
import { weightNumericArray, DrawnS2Grid, addS2Overlay, makeChildNode, uwtGoogle, uwtPageWin } from "../utils";
import { AnyContribution, ContributionStatus, SubmissionsResult } from "../types";

import { Cluster, ClusterStats, Marker, MarkerClusterer, Renderer } from "@googlemaps/markerclusterer";

import "./nomination-map.css";

const GRIDS = <DrawnS2Grid[]>[
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

export default () => {
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
      let nominations: AnyContribution[] | null = null;
      let nominationMap: google.maps.Map | null = null;
      let nominationCluster: MarkerClusterer | null = null;
      let nominationMarkers: google.maps.Marker[] = [];
      let infoWindow: google.maps.InfoWindow | null = null;
      const hiddenStatuses = new Set<string>();
      let redraw: ((reset: boolean) => Promise<void>) | null = null;

      const parseContributions = (data: SubmissionsResult) => {
        if (!data || !data.submissions) return;
        nominations = data.submissions;
        if (redraw) void redraw(true);
      };

      const STATUS_COLORS = <Partial<Record<string, string>>>{
        [ContributionStatus.ACCEPTED]: "green",
        [ContributionStatus.APPEALED]: "purple",
        [ContributionStatus.NOMINATED]: "blue",
        [ContributionStatus.WITHDRAWN]: "grey",
        [ContributionStatus.VOTING]: "yellow",
        [ContributionStatus.DUPLICATE]: "orange",
        [ContributionStatus.REJECTED]: "red",
      };
      const getIconUrl = (nomination: { status: string }) =>
        `https://maps.google.com/mapfiles/ms/icons/${STATUS_COLORS[nomination.status] || "blue"}.png`;
      const prettyStatus = (st: string) =>
        String(st || "UNKNOWN").toLowerCase().replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

      const ensureStyle = () => {
        if (document.getElementById("uwtnm-style2")) return;
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

        const message = (text: string) => {
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
            if (data && data.submissions) nominations = data.submissions;
          } catch (e) {
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
          const counts: Record<string, number> = {};
          for (const n of nominations!) counts[n.status] = (counts[n.status] || 0) + 1;
          for (const [status, count] of Object.entries(counts).sort((x, y) => y[1] - x[1])) {
            const chip = makeChildNode(chips, "button") as HTMLButtonElement;
            chip.type = "button";
            chip.className = "uwtnm-chip" + (hiddenStatuses.has(status) ? " uwtnm-off" : "");
            const icon = document.createElement("img");
            icon.src = getIconUrl({ status });
            chip.appendChild(icon);
            chip.appendChild(document.createTextNode(`${prettyStatus(status)} (${count})`));
            chip.addEventListener("click", () => {
              if (hiddenStatuses.has(status)) hiddenStatuses.delete(status);
              else hiddenStatuses.add(status);
              chip.classList.toggle("uwtnm-off");
              void draw(true);
            });
          }
        };

        const draw = async (reset: boolean) => {
          if (!nominations || nominationMap === null) return;
          const map = nominationMap;
          const G = uwtGoogle()!;
          if (nominationCluster !== null) nominationCluster.clearMarkers();
          for (const m of nominationMarkers) m.setMap(null);

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
              if (!infoWindow) infoWindow = new G.maps.InfoWindow();
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

          nominationCluster = new MarkerClusterer({
            map,
            markers: nominationMarkers,
            renderer: new NominationMapClusterRenderer(),
            algorithmOptions: { maxZoom: config.get("maxClusteringZoom") },
          });

          if (reset && nominationMarkers.length) map.fitBounds(bounds);
        };

        const build = async () => {
          for (let i = 0; i < 40 && !(uwtPageWin.google && uwtPageWin.google.maps); i++) await new Promise(r => setTimeout(r, 250));
          if (!(uwtPageWin.google && uwtPageWin.google.maps)) {
            message("Google Maps is not loaded on this page. Open a Wayfarer page that shows a map (for example a review), then try again.");
            return;
          }
          mapBox.innerHTML = "";
          const G = uwtGoogle()!;
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

        if (nominations === null && !(await load())) return;
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

interface GradientStop {
  count: number,
  color: number[],
}

class NominationMapClusterRenderer implements Renderer {
  render(cluster: Cluster, _stats: ClusterStats, _map: google.maps.Map): Marker {
    const gradient: GradientStop[] = [
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
    while ((++nextStop) < gradient.length - 1 && gradient[nextStop].count < cluster.count);
    const colorComponents =
      (cluster.count > gradient[nextStop].count)
        ? gradient[nextStop].color
        : weightNumericArray(
          gradient[nextStop - 1].color,
          gradient[nextStop].color,
          1 - (
            (cluster.count - gradient[nextStop - 1].count) /
            (gradient[nextStop].count - gradient[nextStop - 1].count)
          ),
        );

    const color = `rgb(${colorComponents.map(c => c.toString()).join(", ")})`;
    const svg = `<svg fill="${color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="50" height="50">
<circle cx="120" cy="120" opacity=".6" r="70" />
<circle cx="120" cy="120" opacity=".3" r="90" />
<circle cx="120" cy="120" opacity=".2" r="110" />
<text x="50%" y="50%" style="fill: #fff; font-family: sans-serif; font-weight: bold;" text-anchor="middle" font-size="50" dominant-baseline="middle">${cluster.count}</text>
</svg>`;

    const title = `Cluster of ${cluster.count} contributions`;
    // Adjust zIndex to be above other markers
    const zIndex = Number(uwtGoogle()!.maps.Marker.MAX_ZINDEX) + cluster.count;

    const clusterOptions = {
      position: cluster.position,
      zIndex,
      title,
      icon: {
        url: `data:image/svg+xml;base64,${btoa(svg)}`,
        anchor: new (uwtGoogle()!.maps.Point)(25, 25),
      },
    };
    return new (uwtGoogle()!.maps.Marker)(clusterOptions);
  }
}
