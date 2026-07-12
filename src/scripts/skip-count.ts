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

import { register } from "../core";
import { untilTruthy, makeChildNode } from "../utils";
import { SkipReview } from "../types";

import "./skip-count.css";

const MAX_SKIPS = 100;
const SKIP_EXPIRY_MSEC = 86400 * 1000;

interface StoredSkip {
  id: string,
  ts: number,
};

interface IdbStores {
  skips: StoredSkip,
}

export default () => {
  register<IdbStores, void>()({
    id: "skip-count",
    name: "Skip Counter",
    authors: ["tehstone", "bilde2910"],
    description: "Count your skip usage in the last 24 hours",
    defaultConfig: {},
    sessionData: {
      skipNotified: false,
    },
    initialize: (toolbox, logger, _config) => {
      const updateCounter = async () => {
        const container = await untilTruthy(() => document.querySelector("wf-logo")?.parentElement?.parentElement);
        const now = Date.now();
        let counter = document.getElementById("uwftsc-counter");
        let label = document.getElementById("uwftsc-label");
        if (counter === null) {
          const div = makeChildNode(container, "div");
          div.classList.add("uwftsc-outer");
          label = makeChildNode(div, "p", "Skip Count:");
          label.id = "uwftsc-label";
          counter = makeChildNode(div, "p", "Loading…");
          counter.id = "uwftsc-counter";
        }
        {
          using idb = await toolbox.openIDB("skips", "readonly");
          const skips = await idb.getAll();
          const skipCount = skips
            .filter(a => a.ts >= now - SKIP_EXPIRY_MSEC)
            .sort((a, b) => a.ts - b.ts)
            .length;
          const skipRatio = skipCount / MAX_SKIPS;
          counter.textContent = skipCount.toString();
          if (skipRatio < 0.1) {
            counter.className = "uwftsc-normal";
          } else if (skipRatio < 0.25) {
            counter.className = "uwftsc-low";
          } else if (skipRatio < 0.45) {
            counter.className = "uwftsc-mid";
          } else if (skipRatio < 0.65) {
            counter.className = "uwftsc-med";
          } else if (skipRatio < 0.85) {
            counter.className = "uwftsc-high";
            toolbox.session.set("skipNotified", false);
          } else {
            counter.className = "uwftsc-extreme";
          }
          if ((skipRatio >= 0.95 || MAX_SKIPS - skipCount == 1) && !toolbox.session.get("skipNotified")) {
            alert(`Careful using skips! Currently at ${skipCount}/${MAX_SKIPS} skips!`);
            toolbox.session.set("skipNotified", true);
          }
        }
      };

      const handleSkip = async (sent: SkipReview, received: boolean) => {
        if (received) {
          logger.info("Storing skip");
          {
            using idb = await toolbox.openIDB("skips", "readwrite");
            idb.put({ ...sent, ts: Date.now() });
            idb.commit();
          }
          void updateCounter();
        }
      };

      toolbox.interceptOpenJson("GET", "/api/v1/vault/review", updateCounter);
      toolbox.interceptSendJson("/api/v1/vault/review/skip", handleSkip);
    },
  });
};
