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

import { CheckboxEditor, NumericInputEditor, register } from "../core";
import { insertAfter } from "../utils";
import { uwtStatusStack } from "../status-stack";
import { AnyReview } from "../types";

import "./review-timer.css";

const REVIEW_EXPIRES_SECS = 1200;

export default () => {
  register()({
    id: "review-timer",
    name: "Review Timer",
    authors: ["tehstone", "bilde2910"],
    description: "Add a review timer to Wayfarer. Also adds an optional Smart Submit function that delays your submissions to prevent getting cooldowns.",
    defaultConfig: {
      smartSubmit: false,
      minDelay: 20,
      maxDelay: 30,
    },
    sessionData: {},
    initialize: (toolbox, _logger, config) => {
      config.setUserEditable("smartSubmit", {
        label: "Enable Smart Submit",
        help: "Smart Submit helps you avoid cooldowns by delaying your submission if you are reviewing quickly.",
        editor: new CheckboxEditor(),
      });
      config.setUserEditable("minDelay", {
        label: "Smart Submit minimum delay",
        editor: new NumericInputEditor({ min: 0 }),
      });
      config.setUserEditable("maxDelay", {
        label: "Smart Submit maximum delay",
        editor: new NumericInputEditor({ min: 0 }),
      });

      let submitButtonClicked = false;
      let expireTime = 0;

      let interval: any = 0;
      let rejectModalCheckTimer: any = 0;

      const ensureTimerStyle = () => {
        if (document.getElementById("uwftmr-style")) return;
        const st = document.createElement("style");
        st.id = "uwftmr-style";
        st.textContent = `
          #uwftmr-outer.uwftmr-div{display:flex;align-items:center;gap:.6em;margin:0;padding:.25em .9em;border-radius:999px;
            background:rgba(17,24,39,.92);color:#f9fafb;box-shadow:0 2px 8px rgba(0,0,0,.4);
            font-size:14px;line-height:1.2;white-space:nowrap;pointer-events:none}
          [data-placement="header"] > #uwftmr-outer.uwftmr-div{background:rgba(255,255,255,.12);box-shadow:none;font-size:13px;padding:.2em .8em}
          [data-placement="header"] > #uwftmr-outer .uwftmr-counter{font-size:16px}
          #uwftmr-outer p{margin:0}
          #uwftmr-outer .uwftmr-counter{font-size:18px;font-weight:bold;color:#20b8e3;font-variant-numeric:tabular-nums}
          #uwftmr-outer .uwftmr-counter.uwftmr-warn{color:#f2a134}
          #uwftmr-outer .uwftmr-counter.uwftmr-expired{color:#f87171}
          .uwftmr-ssb{cursor:pointer}`;
        document.head.appendChild(st);
      };

      const injectTimer = async (candidate: AnyReview) => {
        console.log("[I]", "[unified-wf-tools]", "[patch]", "review-timer received review data; expires =", candidate && candidate.expires, "; keys =", candidate ? Object.keys(candidate).slice(0, 12).join(",") : "none");
        submitButtonClicked = false;
        expireTime = candidate.expires;
        // redesign: wf-logo no longer exists; the timer is a pill in the shared status container, which sits
        // in Wayfarer's top bar (see status-stack.ts)
        ensureTimerStyle();
        const container = await uwtStatusStack();
        let counter = document.getElementById("uwftmr-counter");
        if (counter === null) {
          const div = document.createElement("div");
          div.id = "uwftmr-outer";
          div.classList.add("uwftmr-div");
          div.title = "Time remaining";
          const countLabel = document.createElement("p");
          countLabel.id = "uwftmr-counter-label";
          countLabel.textContent = "Time remaining:";
          counter = document.createElement("p");
          counter.id = "uwftmr-counter";
          counter.classList.add("uwftmr-counter");
          div.appendChild(countLabel);
          div.appendChild(counter);
          container.appendChild(div);

          if (interval) clearInterval(interval);
          interval = setInterval(() => updateTime(counter!, expireTime), 1000);
          updateTime(counter!, expireTime);
          addSmartSubmitButton();
        } else {
          counter.style.display = "block";
        }
      };

      const removeTimer = () => {
        if (interval) {
          clearInterval(interval);
          interval = 0;
        }
        if (rejectModalCheckTimer) {
          clearInterval(rejectModalCheckTimer);
          rejectModalCheckTimer = 0;
        }
        const timer = document.getElementById("uwftmr-outer");
        if (timer !== null) timer.remove();
      };

      const updateTime = (counter: HTMLElement, expiry: number) => {
        const outer = document.getElementById("uwftmr-outer");
        if (outer) outer.style.display = /\/review(\/|$)/.test(location.pathname) ? "flex" : "none";
        const diff = Math.ceil((expiry - new Date().getTime()) / 1000);
        counter.classList.toggle("uwftmr-warn", diff >= 0 && diff < 120);
        counter.classList.toggle("uwftmr-expired", diff < 0);
        if (diff < 0) {
          counter!.textContent = "Expired";
          return;
        }
        const minutes = Math.floor(diff / 60).toString().padStart(2, "0");
        const seconds = Math.abs(diff % 60).toString().padStart(2, "0");
        counter!.textContent = `${minutes}:${seconds}`;
      };

      // redesign: the Submit button is found by its label instead of .wf-split-button
      const findSubmitButton = () => Array.from(document.querySelectorAll("button"))
        .find(b => b.id !== "uwftmr-ssb-0" && b.textContent!.trim() === "Submit" && !b.closest("[role=dialog]"));

      let ssbTries = 0;
      const addSmartSubmitButton = () => {
        const sButton = findSubmitButton();
        const existing = document.getElementById("uwftmr-ssb-0") as HTMLButtonElement | null;
        if (!sButton && !existing) {
          if (++ssbTries < 40) setTimeout(addSmartSubmitButton, 400);
          return;
        }
        ssbTries = 0;

        if (!config.get("smartSubmit")) {
          if (existing) existing.style.display = "none";
          if (sButton) sButton.style.display = "";
          return;
        }

        let ssButton = existing;
        if (ssButton === null) {
          ssButton = document.createElement("button");
          ssButton.id = "uwftmr-ssb-0";
          ssButton.type = "button";
          ssButton.textContent = "Smart Submit";
          ssButton.addEventListener("click", () => checkSubmitReview());
          sButton!.parentNode!.insertBefore(ssButton, sButton!);
        }
        ssButton.style.display = "";

        const real = findSubmitButton();
        const mirror = () => {
          if (!real) return;
          const cls = real.className + " uwftmr-ssb";
          if (ssButton!.className !== cls) ssButton!.className = cls;
          if (ssButton!.disabled !== real.disabled) ssButton!.disabled = real.disabled;
          if (real.style.display !== "none") real.style.display = "none";
        };
        mirror();
        if (real && !(real as any).__uwtObserved) {
          (real as any).__uwtObserved = true;
          // keep Smart Submit looking enabled/disabled like the real button (only that one element is watched)
          new MutationObserver(mirror).observe(real, { attributes: true, attributeFilter: ["disabled", "class"] });
        }
      };

      const addRejectModalCheck = () => {
        if (rejectModalCheckTimer) clearInterval(rejectModalCheckTimer);
        rejectModalCheckTimer = setInterval(() => {
          const rejectModal = document.querySelector("[id^=mat-dialog]");
          if (!rejectModal || rejectModal.childElementCount < 1) return;

          const isDupModal = rejectModal.children[0].tagName === "APP-CONFIRM-DUPLICATE-MODAL";
          const buttonId = `uwftmr-ssmb-${isDupModal ? "d" : "r"}`;
          const parent = document.getElementsByClassName("mat-dialog-actions");
          const selectionRequired = [
            "APP-APPROPRIATE-REJECTION-FLOW-MODAL",
            "APP-ACCURACY-REJECTION-FLOW-MODAL",
          ].includes(rejectModal.children[0].tagName);
          let ssButton = document.getElementById(buttonId) as HTMLButtonElement;
          if (ssButton === null) {
            const buttons = parent[0].getElementsByTagName("button");
            ssButton = document.createElement("button");
            ssButton.classList.add("wf-button", "wf-split-button__main", "wf-button--primary", "uwftmr-ssb");
            ssButton.style.marginLeft = "1.5rem";
            ssButton.id = buttonId;
            ssButton.textContent = "Smart Submit";
            ssButton.addEventListener("click", () => checkSubmitReview(true));
            insertAfter(buttons[1], ssButton);
            buttons[1].style.display = "none";
            if (selectionRequired) {
              addModalSubmitButtonObserver(buttonId, buttons[1]);
            }
          }
        }, 500);
      };

      const addSubmitButtonObserver = () => {
        const buttonWrapper = document.getElementsByTagName("wf-split-button");
        if (buttonWrapper.length < 1) {
          setTimeout(addSubmitButtonObserver, 250);
          return;
        }
        const button = buttonWrapper[0].querySelector<HTMLButtonElement>("button.wf-button--primary")!;
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName == "disabled") {
              for (let i = 0; i < buttonWrapper.length; i++) {
                const smartButton = document.getElementById(`uwftmr-ssb-${i}`) as HTMLButtonElement;
                toggleButtonClasses(smartButton, button);
              }
            }
          }
        });
        observer.observe(button, {
          attributes: true,
          attributeFilter: ["disabled"],
        });
      };

      const toggleButtonClasses = (smartButton: HTMLButtonElement, button: HTMLButtonElement) => {
        smartButton.disabled = button.disabled;
        smartButton.classList.toggle("wf-button--disabled", button.disabled);
        smartButton.classList.toggle("wf-button--primary", !button.disabled);
      };

      const addModalSubmitButtonObserver = (buttonId: string, button: HTMLButtonElement) => {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName === "disabled") {
              const smartButton = document.getElementById(buttonId) as HTMLButtonElement;
              toggleButtonClasses(smartButton, button);
            }
          }
        });

        observer.observe(button, {
          attributes: true,
          attributeFilter: ["disabled"],
        });
      };

      const checkSubmitReview = (rejection = false) => {
        if (submitButtonClicked) return;
        submitButtonClicked = true;
        const diff = Math.ceil((expireTime - new Date().getTime()) / 1000);
        const delay = randomIntFromInterval(config.get("minDelay"), config.get("maxDelay"));
        if (diff + delay > REVIEW_EXPIRES_SECS) {
          updateButtonText(
            `Submitting in ${Math.abs(REVIEW_EXPIRES_SECS - delay - diff)}`,
            Math.abs(REVIEW_EXPIRES_SECS - delay - diff),
          );
        }
        waitToSubmit(delay, rejection);
      };

      const waitToSubmit = (delay: number, rejection: boolean) => {
        const diff = Math.ceil((expireTime - new Date().getTime()) / 1000);
        if (diff + delay < REVIEW_EXPIRES_SECS) {
          let btn;
          if (rejection) {
            const parent = document.getElementsByClassName("mat-dialog-container")[0];
            btn = parent.querySelector<HTMLButtonElement>("[class*='wf-button--primary'][style*='display: none;']");
          } else {
            btn = findSubmitButton();
          }
          btn!.click();
        } else {
          updateButtonText(
            `Submitting in ${Math.abs(REVIEW_EXPIRES_SECS - delay - diff)}`,
            Math.abs(REVIEW_EXPIRES_SECS - delay - diff),
          );
          setTimeout(() => waitToSubmit(delay, rejection), 1000);
        }
      };

      const updateButtonText = (message: string, timeRemaining: number) => {
        let button;
        for (let i = 0; i < 5; i++) {
          button = document.getElementById(`uwftmr-ssb-${i}`);
          if (button === null) break;
          button.textContent = message;
        }
        button = document.getElementById("uwftmr-ssmb-r");
        if (button !== null) button.textContent = message;
        button = document.getElementById("uwftmr-ssmb-d");
        if (button !== null) button.textContent = message;

        const timerText = document.getElementById("uwftmr-counter");
        timerText!.style.display = "none";

        let counter = document.getElementById("uwftmr-subcounter");
        if (counter === null) {
          counter = document.createElement("p");
          counter.textContent = timeRemaining.toString();
          counter.id = "uwftmr-subcounter";
          counter.classList.add("uwftmr-counter");
          timerText!.parentNode!.appendChild(counter);
        } else {
          counter.textContent = timeRemaining.toString();
        }

        const counterLabel = document.getElementById("uwftmr-counter-label");
        counterLabel!.textContent = "Submitting in:";
        counterLabel!.style.fontWeight = "bold";
      };

      const randomIntFromInterval = (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };

      toolbox.interceptOpenJson("GET", "/api/v1/vault/review", injectTimer);
      toolbox.interceptSendJson("/api/v1/vault/review", removeTimer);
    },
  });
};
