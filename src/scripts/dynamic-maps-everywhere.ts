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

import { CheckboxEditor, register, SelectBoxEditor } from "../core";
import { untilTruthy, uwtGoogle } from "../utils";

import "./dynamic-maps-everywhere.css";

interface DynamicMap {
  container: HTMLElement,
  map: google.maps.Map,
  markers: google.maps.Marker[],
  pano: google.maps.StreetViewPanorama,
}

interface DynamicMapContainer extends HTMLElement {
  __uwtTools_static?: HTMLElement,
}

interface EnrichedStaticMapElement extends HTMLElement {
  __uwtTools_DME?: DynamicMap,
  __uwtTools_DME_url?: string,
}

// redesign: the static maps are no longer necessarily <nia-google-static-map> elements. A static map is
// recognised by its image URL instead, whether it is an <img> or a background image on any element.
const STATIC_MAP_PATH = "/maps/api/staticmap";
const STATIC_MAP_SELECTOR = `nia-google-static-map, img[src*="${STATIC_MAP_PATH}"], [style*="${STATIC_MAP_PATH}"]`;

const getStaticMapUrl = (el: HTMLElement): URL | undefined => {
  const raw = el instanceof HTMLImageElement
    ? (el.currentSrc || el.src)
    : el.style.backgroundImage.match(/url\(["']?(?<url>[^"')]+)["']?\)/)?.groups?.url;
  if (!raw || !raw.includes(STATIC_MAP_PATH)) return;
  try {
    return new URL(raw, location.href);
  } catch {
    return;
  }
};

interface StaticMapConfig {
  width: number,
  height: number,
  mapType: string,
  styles: google.maps.MapTypeStyle[],
  markers: google.maps.MarkerOptions[],
}

type ValidMapTypeID = "auto" | "hybrid" | "roadmap" | "satellite" | "terrain";

export default () => {
  register()({
    id: "dynamic-maps-everywhere",
    name: "Interactive Maps Everywhere",
    authors: ["bilde2910"],
    description: "Replaces all static maps with interactive ones, with automatic loading of Street View if desired",
    defaultConfig: {
      mapType: "auto" as ValidMapTypeID,
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

      const replaceMap = (staticMap: EnrichedStaticMapElement) => {
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
            } else {
              return;
            }
          }
          staticMap.__uwtTools_DME_url = url.href;
          const mapConfig = parseStaticMapUrl(url);
          if (typeof mapConfig === "undefined") return;
          if (mapConfig.height === 0 || mapConfig.width === 0) return;
          logger.info("Replacing static map", mapConfig);

          let chosenMapType = config.get("mapType");
          if (chosenMapType === "auto") chosenMapType = mapConfig.mapType as ValidMapTypeID;

          staticMap.classList.add("uwtdme-hidden");
          if (typeof staticMap.__uwtTools_DME === "undefined") {
            const node = document.createElement("div") as DynamicMapContainer;
            node.classList.add("uwtdme-container");
            node.__uwtTools_static = staticMap;
            staticMap.parentElement!.insertBefore(node, staticMap);
            staticMap.__uwtTools_DME = createDynamicMap(node, mapConfig, chosenMapType);
          } else {
            reconfigureDynamicMap(staticMap.__uwtTools_DME, mapConfig, chosenMapType);
          }

          addDynamicMapMarkers(staticMap.__uwtTools_DME, mapConfig.markers);
          if (config.get("autoLoadStreetView")) {
            loadStreetView(staticMap.__uwtTools_DME, mapConfig.markers[0].position!)
              .catch((ex) => {
                logger.warn("Failed to load Street View", ex);
              });
          }
        }
      };

      // the page's own Google Maps API (not the userscript sandbox's view of the window) must be loaded
      untilTruthy(() => uwtGoogle()?.maps).then(() => {
        const scan = () => {
          // remove interactive maps whose static map is gone (the page replaced it, for example for the next review)
          for (const c of document.querySelectorAll<DynamicMapContainer>(".uwtdme-container")) {
            if (!c.__uwtTools_static?.isConnected) c.remove();
          }
          for (const map of document.querySelectorAll<EnrichedStaticMapElement>(STATIC_MAP_SELECTOR)) {
            try {
              replaceMap(map);
            } catch (ex) {
              logger.error(ex);
            }
          }
        };
        scan();
        let timer: number | undefined;
        new MutationObserver((mutations) => {
          // ignore changes inside the interactive maps themselves
          if (mutations.every(m => m.target instanceof Element && m.target.closest(".uwtdme-container"))) return;
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

const createDynamicMap = (container: HTMLElement, mapConfig: StaticMapConfig, chosenMapType: string): DynamicMap => {
  container.style.width = "100%";
  container.style.height = `${mapConfig.height}px`;
  const G = uwtGoogle()!;
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
  const markers: google.maps.Marker[] = [];
  return { container, map, markers, pano };
};

const reconfigureDynamicMap = (dMap: DynamicMap, mapConfig: StaticMapConfig, chosenMapType: string) => {
  dMap.container.style.height = `${mapConfig.height}px`;
  dMap.map.setMapTypeId(chosenMapType);
  dMap.pano.setVisible(false);
  while (dMap.markers.length > 0) {
    dMap.markers.pop()?.setMap(null);
  }
};

const addDynamicMapMarkers = (dMap: DynamicMap, markers: google.maps.MarkerOptions[]) => {
  const G = uwtGoogle()!;
  const bounds = new G.maps.LatLngBounds();
  for (const marker of markers) {
    bounds.extend(marker.position!);
    dMap.markers.push(new G.maps.Marker({
      map: dMap.map,
      ...marker,
    }));
  }
  G.maps.event.addListenerOnce(dMap.map, "bounds_changed", function () {
    if ((this.getZoom() ?? 20) > 17) {
      this.setZoom(17);
    }
  });
  dMap.map.fitBounds(bounds);
};

const toLiteral = (p: google.maps.LatLng | google.maps.LatLngLiteral): google.maps.LatLngLiteral =>
  typeof p.lat === "function" ? { lat: p.lat(), lng: (p as google.maps.LatLng).lng() } : p as google.maps.LatLngLiteral;

// Initial compass bearing from one point to another; the Maps "geometry" library may not be loaded on the page.
const bearing = (from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral) => {
  const rad = (x: number) => x * Math.PI / 180;
  const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat));
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
    Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const loadStreetView = async (dMap: DynamicMap, position: google.maps.LatLng | google.maps.LatLngLiteral) => {
  const svClient = new (uwtGoogle()!.maps.StreetViewService);
  const result = await svClient.getPanorama({ location: position, radius: 50 });
  const svLocation = result.data.location!.latLng!;
  const heading = bearing(toLiteral(svLocation), toLiteral(position));
  dMap.pano.setPov({ heading, pitch: 0 });
  dMap.pano.setPosition(svLocation);
  dMap.pano.setVisible(true);
};

const parseStaticMapUrl = (url: URL): StaticMapConfig | undefined => {
  const size = url.searchParams.get("size")?.match(/^(\d+)x(\d+)$/)?.slice(1);
  if (!size || size.length < 2) return;
  const [width, height] = size;
  const markers = url.searchParams.getAll("markers");
  if (!markers.length) return;
  const styles = url.searchParams.getAll("style");
  const mapType = url.searchParams.get("maptype") ?? "hybrid";
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

const parseStyle = (style: string): google.maps.MapTypeStyle => {
  const styleSpec = style.split("|");
  const mapsStyle: google.maps.MapTypeStyle = {
    stylers: [],
  };
  for (const arg of styleSpec) {
    const key = arg.substring(0, arg.indexOf(":"));
    const value = arg.substring(arg.indexOf(":") + 1);
    if (key === "element") mapsStyle.elementType = value;
    else if (key === "feature") mapsStyle.featureType = value;
    else mapsStyle.stylers.push({ [key]: convertStaticStyles(value) });
  }
  return mapsStyle;
};

const convertStaticStyles = (value: string) => {
  if (value.startsWith("0x")) return `#${value.substring(2)}`;
  else if (value.match(/^-?\d+$/)) return parseInt(value);
  else if (value.match(/^-?\d+\.\d+$/)) return parseFloat(value);
  else return value;
};

const parseMarker = (marker: string): google.maps.MarkerOptions[] => {
  if (marker.indexOf("|") <= 0) return [];
  const markerSpec = marker.split("|");
  const style: Record<string, string> = {};
  while (markerSpec.length > 0 && markerSpec[0].includes(":")) {
    const s = markerSpec.shift()!;
    style[s.substring(0, s.indexOf(":"))] = s.substring(s.indexOf(":") + 1);
  }
  return markerSpec
    .filter(spc => spc.includes(","))
    .map(spc => spc.split(",").map(coord => parseFloat(coord)))
    .map(([ lat, lng ]) => ({
      position: { lat, lng },
      icon: style.icon?.replace(/^(https?:)(?!\/\/)/, "$1//"),
    }));
};
