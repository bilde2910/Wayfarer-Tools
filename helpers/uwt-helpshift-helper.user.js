// ==UserScript==
// @name         Helpshift Helper for UWT
// @version      0.1.0
// @description  Helper script for the Unified Wayfarer Tools
// @namespace    https://github.com/bilde2910/Wayfarer-Tools
// @downloadURL  https://github.com/bilde2910/Wayfarer-Tools/raw/refs/heads/main/helpers/uwt-helpshift-helper.user.js
// @homepageURL  https://github.com/bilde2910/Wayfarer-Tools
// @match        https://webchat.helpshift.com/*
// ==/UserScript==

// Copyright 2026 tehstone, bilde2910
// This file is part of the Wayfarer Addons collection.

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
// <https://github.com/tehstone/wayfarer-addons/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.

/* eslint-env es6 */
/* eslint no-var: "error" */
/* eslint indent: ['error', 4] */

(() => {
  const UUID = 'de5a619c-2de7-4b1e-8eef-190397c0ad62'; // randomly generated, unique to this userscript, please don't re-use in other scripts
  const ORIGIN_WAYFARER = 'https://wayfarer.nianticlabs.com';

  const send = msg => window.parent.postMessage({ uuid: UUID, data: msg }, ORIGIN_WAYFARER);

  // Overwrite the open method of the XMLHttpRequest.prototype to intercept the server calls
  (function (open) {
    XMLHttpRequest.prototype.open = function (method, url) {
      if (method == 'POST') {
        switch (url) {
          case 'https://api.helpshift.com/websdk/niantic/conversations/history':
          case 'https://api.helpshift.com/websdk/niantic/conversations/updates':
            this.addEventListener('load', parseResponse, false);
        }
      }
      open.apply(this, arguments);
    };
  })(XMLHttpRequest.prototype.open);

  function parseResponse(e) {
    try {
      const json = JSON.parse(this.responseText);
      if (!json) return;
      send(json);
    } catch (ex) {
    }
  }
})();
