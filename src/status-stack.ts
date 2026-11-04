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

import { untilTruthy } from "./utils";

/**
 * redesign: the old header the status badges used to sit in (next to wf-logo) is gone. All of our status
 * items (timer, review count, skip count, appeal timer, version label, and the Wayfarer Tools button) are
 * put in this one container. It is mounted in Wayfarer's top bar, between the navigation and the profile
 * button (placement "header"). Pages without that bar get it fixed to the bottom left (placement "corner").
 * Style items with the .uwt-pill class, and order them with the rules in scripts/uwt-core.css.
 */
const HEADER_SELECTOR = "header[data-testid=\"header-bar\"]";
const PROFILE_SELECTOR = "[data-testid=\"wayfarer-header-profile-visual\"]";

const placeStack = (stack: HTMLElement) => {
  const header = document.querySelector<HTMLElement>(HEADER_SELECTOR);
  if (header) {
    // right before the profile button; the page re-renders the bar now and then, so this is checked regularly
    let anchor: Element | null = document.querySelector(PROFILE_SELECTOR)?.closest("button") ?? null;
    if (anchor && anchor.parentElement !== header) anchor = null;
    if (stack.parentElement !== header || (anchor && stack.nextElementSibling !== anchor)) {
      header.insertBefore(stack, anchor);
    }
    stack.dataset.placement = "header";
  } else {
    if (stack.parentElement !== document.body) document.body.appendChild(stack);
    stack.dataset.placement = "corner";
  }
};

export const uwtStatusStack = async (): Promise<HTMLElement> => {
  const body = await untilTruthy(() => document.body);
  let stack = document.getElementById("uwt-status-stack");
  if (stack === null) {
    stack = document.createElement("div");
    stack.id = "uwt-status-stack";
    stack.dataset.placement = "corner";
    body.appendChild(stack);
    const mounted = stack;
    placeStack(mounted);
    window.setInterval(() => placeStack(mounted), 1000);
  }
  return stack;
};
