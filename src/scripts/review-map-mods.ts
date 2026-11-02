// Copyright 2025 tehstone, bilde2910
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

import { CheckboxEditor, ColorInputEditor, NumericInputEditor, register, SelectBoxEditor } from "../core";
import { haversine, DrawnS2Grid, S2Overlay, uwtGoogle, uwtPageWin, uwtReviewMapSelectors } from "../utils";
import { AnyReview, NewReview } from "../types";

import "./extended-stats.css";

type MapType = "map" | "satellite" | "streetview";
interface LatLngLiteral {
  lat: number,
  lng: number,
}

export default () => {
  register()({
    id: "review-map-mods",
    name: "Review Map Mods",
    authors: ["tehstone", "bilde2910"],
    description: "Add map mods to the Wayfarer Review Page",
    defaultConfig: {
      display: "map" as MapType,
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
      let pano: google.maps.StreetViewPanorama | null = null;
      let rmmToken = 0;
      const rmm: {
        circles: google.maps.Circle[],
        overlay: S2Overlay | null,
        idleListener: google.maps.MapsEventListener | null,
        mapDiv: HTMLElement | null,
        watcher: number | null,
      } = { circles: [], overlay: null, idleListener: null, mapDiv: null, watcher: null };

      const pdoc = () => uwtPageWin.document;

      const rmmFindFiber = (el: any): any => {
        const key = Object.getOwnPropertyNames(el || {}).find(k => k.startsWith("__reactFiber$"));
        return key ? el[key] : null;
      };
      const rmmRef = (ref: any) => (ref && typeof ref === "object" && "current" in ref) ? ref.current : null;
      const rmmLooksLikeMap = (v: any): v is google.maps.Map =>
        !!(v && typeof v.getCenter === "function" && typeof v.addListener === "function" && typeof v.getDiv === "function");

      const rmmResolveMap = (container: HTMLElement): google.maps.Map | null => {
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
      const rmmSelectors: Record<"NEW" | "EDIT", string[]> = {
        NEW: [uwtReviewMapSelectors.NEW],
        EDIT: [
          "[data-testid=\"review-edit-flow\"] .wf-review-card--map [data-testid=\"base-map-container\"]",
          uwtReviewMapSelectors.EDIT,
          "[data-testid=\"review-edit-flow\"] [data-testid=\"base-map-container\"]",
        ],
      };

      const rmmFindMapNow = (type: "NEW" | "EDIT") => {
        const list = rmmSelectors[type];
        for (let i = 0; i < list.length; i++) {
          const container = pdoc().querySelector<HTMLElement>(list[i]);
          if (container) {
            const map = rmmResolveMap(container);
            if (map) return { container, map, selectorIndex: i };
          }
        }
        return null;
      };

      const rmmWaitForMap = async (type: "NEW" | "EDIT") => {
        for (let i = 0; i < 120; i++) { // about 30 seconds
          const found = rmmFindMapNow(type);
          if (found) return found;
          await new Promise(r => setTimeout(r, 250));
        }
        return null;
      };

      const unloadPano = () => {
        if (pano !== null) {
          // Street View panorama must be unloaded to avoid it remaining alive in the background
          // after each review is submitted (browser memory / tab crashes).
          try { pano.setVisible(false); } catch { /* ignore */ }
          pano = null;
        }
      };

      // the map object is reused between reviews, so everything drawn is removed first
      const rmmCleanup = () => {
        for (const c of rmm.circles) {
          try { c.setMap(null); } catch { /* ignore */ }
        }
        rmm.circles = [];
        if (rmm.overlay) {
          rmm.overlay.polyLines.forEach(l => { try { l.setMap(null); } catch { /* ignore */ } });
          rmm.overlay.polyLines = [];
          rmm.overlay = null;
        }
        if (rmm.idleListener) {
          try { rmm.idleListener.remove(); } catch { /* ignore */ }
          rmm.idleListener = null;
        }
        if (rmm.watcher !== null) {
          window.clearInterval(rmm.watcher);
          rmm.watcher = null;
        }
        rmm.mapDiv = null;
        for (const el of pdoc().querySelectorAll(".uwtrmm-warning-box, .uwtrmm-close-warning")) el.remove();
        unloadPano();
      };

      const drawCircle = (map: google.maps.Map, ll: LatLngLiteral, color: string, radius: number) => {
        const G = uwtGoogle()!;
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

      const bearing = (from: google.maps.LatLng, to: google.maps.LatLng) => {
        const rad = (x: number) => x * Math.PI / 180;
        const y = Math.sin(rad(to.lng() - from.lng())) * Math.cos(rad(to.lat()));
        const x = Math.cos(rad(from.lat())) * Math.sin(rad(to.lat())) -
          Math.sin(rad(from.lat())) * Math.cos(rad(to.lat())) * Math.cos(rad(to.lng() - from.lng()));
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      };

      const insertBeforeMapBox = (container: HTMLElement, node: Node) => {
        const box = container.closest("[data-testid=\"base-map-root\"]") || container;
        box.parentElement!.insertBefore(node, box);
      };

      const modifyNewReviewMap = async (container: HTMLElement, map: google.maps.Map, candidate: AnyReview) => {
        logger.info("Modifying new review map");
        const G = uwtGoogle()!;

        const nomLocation = new G.maps.LatLng(candidate.lat, candidate.lng);
        map.setZoom(17);
        map.setCenter(nomLocation);

        const displayType = config.get("display");
        if (displayType === "satellite") {
          // hybrid includes labels as well as satellite imagery
          map.setMapTypeId("hybrid");
        } else if (displayType === "streetview") {
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
            const svLocation = result.data.location!.latLng!;
            const heading = bearing(svLocation, nomLocation);
            pano = sv;
            logger.info(`Setting Street View POV heading to ${heading}`);
            pano.setPov({ heading, pitch: 0 });
            pano.setPosition(svLocation);
            pano.setVisible(true);
          } catch {
            const warningBox = document.createElement("p");
            warningBox.classList.add("uwtrmm-warning-box");
            warningBox.textContent = "No Street View found within a close radius";
            insertBeforeMapBox(container, warningBox);
          }
        }
      };

      const addMapMods = async (candidate: AnyReview) => {
        // Every new review invalidates the previous one, also reviews that get no map mods: a skipped review does not
        // submit anything, and the map object is reused, so its grid and circles (and a wait for its map that is
        // still running) must not carry over to this review.
        const myToken = ++rmmToken;
        rmmCleanup();
        if (candidate.type !== "NEW" && !(candidate.type === "EDIT" && candidate.locationEdits && candidate.locationEdits.length > 0)) return;

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
        if (myToken !== rmmToken) return; // a newer review has started
        const { container, map, selectorIndex } = found;
        logger.info(`Review Map Mods: found the ${candidate.type} review map (selector ${selectorIndex + 1} of ${rmmSelectors[candidate.type].length})`);
        rmmCleanup();
        rmm.mapDiv = map.getDiv();

        if (candidate.type === "NEW") await modifyNewReviewMap(container, map, candidate);
        if (myToken !== rmmToken) return;

        const grids = <DrawnS2Grid[]>[];
        if (config.get("s2Grid1Enabled")) grids.push({
          level: config.get("s2Grid1Level"),
          color: config.get("s2Grid1Color"),
          opacity: config.get("s2Grid1Opacity"),
          thickness: config.get("s2Grid1Thickness"),
        });
        if (config.get("s2Grid2Enabled")) grids.push({
          level: config.get("s2Grid2Level"),
          color: config.get("s2Grid2Color"),
          opacity: config.get("s2Grid2Opacity"),
          thickness: config.get("s2Grid2Thickness"),
        });
        if (grids.length) {
          const overlay = new S2Overlay();
          grids.sort((x, y) => y.level - x.level);
          for (const grid of grids) await overlay.drawCellGrid(map, grid);
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
          if (myToken !== rmmToken) return;
          const live = rmmFindMapNow(candidate.type as "NEW" | "EDIT");
          if (live && rmm.mapDiv && live.map.getDiv() !== rmm.mapDiv) {
            logger.info("Review Map Mods: the review map was re-created; applying the mods again");
            void addMapMods(candidate);
          }
        }, 1500);

        if (Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng)) {
          // 22 m: new Powerspots within this distance of another Wayspot are rejected
          if (config.get("renderCloseCircle")) drawCircle(map, candidate, "blue", 22);
          // 2 m: a moved location must be at least this far from the submitter's proposal
          // (not for edit reviews: there the reviewer picks one of the suggested locations, nothing is moved)
          if (config.get("renderMoveCircle") && candidate.type === "NEW") drawCircle(map, candidate, "red", 2);

          // only NEW reviews declare nearbyPortals in the types, but read it defensively for any review
          const nearbyPortals = (candidate as Partial<NewReview>).nearbyPortals;
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
};


