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

import { DiscordUserLinkEditor, NumericInputEditor, register, SelectBoxEditor } from "../core";
import { untilTruthy, insertAfter, makeChildNode } from "../utils";
import { DiscordUserLink, Profile } from "../types";

import "./extended-stats.css";

type AgreementCountType = "badgestat" | "upgradecount" | "simple";

const WDD_LINK_PRIVACY_POLICY =
  "Membership in the Wayfarer Discussion Discord (WDD) is required to use this function."
  + "\n\nPRIVACY NOTICE\nBy using this function, your stats will be automatically submitted to WDD and King Clippy. "
  + "Whenever such a submission occurs, the submission will be logged in WDD alongside your Discord ID and the exact timestamp "
  + "of the submission. The submission log is visible to WDD administrators, who may access these logs at any time, for any purpose. "
  + "Additionally, all stats submissions are publicly visible to everyone in the #clippys-corner channel in WDD."
  + "\n\nSubmissions are processed through a third-party web service operated by the WDD administrators. When you authenticate "
  + "your Discord account through WF Extended Stats, this web service will validate your Discord credentials and verify your membership "
  + "in WDD. If successful, your browser is issued an encrypted token (ticket) that identifies your Discord account. "
  + "The token is used by the web service to connect your submitted statistics to your Discord account. The web service will "
  + "NEVER have access to your Discord password."
  + "\n\nClicking OK in this dialog box indicates your consent to data processing in accordance with these terms. "
  + "If you do not consent to these terms, please press Cancel now. If you wish to withdraw your consent in the future, "
  + "please contact WDD staff, who will assist you in purging your data from WDD.";

export default () => {
  register()({
    id: "extended-stats",
    name: "Extended Stats",
    authors: ["tehstone", "bilde2910"],
    description: "Add extended Wayfarer Profile stats",
    defaultConfig: {
      agreementCountType: "upgradecount" as AgreementCountType,
      pogoMedalCount: 0,
      bonusUpgrades: 0,
      offsetAgreements: 0,
      wddClippyLink: null as DiscordUserLink | null,
      lastImport: 0,
    },
    sessionData: {},
    initialize: (toolbox, logger, config) => {
      config.setUserEditable("agreementCountType", {
        label: "Agreement Count Type",
        help: "How the extended stats should be calculated",
        editor: new SelectBoxEditor({
          "badgestat": "Medal Stat",
          "upgradecount": "Upgrade Count",
          "simple": "Simple",
        }),
      });

      config.setUserEditable("pogoMedalCount", {
        label: "Pokemon Go Medal Count",
        editor: new NumericInputEditor({
          min: 0,
        }),
      });

      config.setUserEditable("bonusUpgrades", {
        label: "Bonus Upgrades Earned",
        editor: new NumericInputEditor({
          min: 0,
        }),
      });

      config.setUserEditable("offsetAgreements", {
        label: "Agreements Offset",
        editor: new NumericInputEditor(),
      });

      config.setUserEditable("wddClippyLink", {
        label: "Auto-submit to WDD",
        editor: new DiscordUserLinkEditor({
          authWindowUrl: "https://apps.varden.info/wfptools/wdd/",
          confirmationText: WDD_LINK_PRIVACY_POLICY,
          connectCallback: () => {
            alert("Connection successful! Please note that stats are only submitted to WDD when you visit the Profile page in Wayfarer. If you do not visit this page, your statistics will not be submitted.");
          },
        }),
      });

      const parseStats = async (profile: Profile) => {
        const parentRef = await untilTruthy(() => document.querySelector(".wf-profile-stats__section-title"));

        const allAgreements = getTotalAgreementCount(profile) || profile.accepted + profile.rejected + profile.duplicated;
        const percent = ((allAgreements / profile.finished) * 100).toFixed(1);
        const otherAgreements = allAgreements - profile.accepted - profile.rejected - profile.duplicated;

        const totalParent = document.createElement("div");
        totalParent.classList.add("uwftes-parent");
        makeChildNode(totalParent, "div", "Processed & Agreement").classList.add("uwftes-text");
        makeChildNode(totalParent, "div", `${allAgreements} (${percent}%)`).classList.add("uwftes-count");
        insertAfter(parentRef, totalParent);

        const otherParent = document.createElement("div");
        otherParent.classList.add("uwftes-parent");
        makeChildNode(otherParent, "div", "Other Agreements").classList.add("uwftes-text");
        makeChildNode(otherParent, "div", otherAgreements.toString()).classList.add("uwftes-count");
        insertAfter(parentRef.parentElement!.lastChild!, otherParent);

        const exportParent = document.createElement("div");
        exportParent.classList.add("uwftes-parent");
        makeChildNode(exportParent, "br");
        const exportButton = makeChildNode(exportParent, "button", "Copy Stats");
        exportButton.classList.add("uwftcore-ui-button");
        exportButton.addEventListener("click", async () => {
          const exportData = makeStats(profile);
          await navigator.clipboard.writeText(JSON.stringify(exportData));
          alert("Stats copied to clipboard!");
        });

        const credCard = await untilTruthy(() => document.querySelector("wf-credibility-card"));
        credCard.parentNode!.appendChild(exportParent);

        const wddLink = config.get("wddClippyLink");
        if (wddLink) sendToKingClippy(profile, wddLink);
      };

      const getTotalAgreementCount = (stats: Profile) => {
        switch (config.get("agreementCountType")) {
          case "upgradecount":
            return (stats.total + stats.available - config.get("bonusUpgrades")) * 100
            + stats.progress + config.get("offsetAgreements");
          case "badgestat":
            return config.get("pogoMedalCount");
          case "simple":
            return stats.accepted + stats.rejected + stats.duplicated;
        }
      };

      const makeStats = (stats: Profile) => {
        const {performance, finished, accepted, rejected, duplicated, available, progress, total} = stats;
        const total_agreements = getTotalAgreementCount(stats);
        const base_agreements = accepted + rejected + duplicated;
        let other = total_agreements - base_agreements;

        let count_type: string = config.get("agreementCountType");
        if (count_type === "badgestat") {
          count_type = "facts";
        } else if (count_type === "upgradecount" ) {
          count_type = "aprox";
        } else {
          count_type = "simple";
          other = 0;
        }

        const exportData = {
          "current_rating": performance,
          "total_nominations": finished,
          "total_agreements": total_agreements,
          "accepted": accepted,
          "rejected": rejected,
          "duplicates": duplicated,
          "other": other,
          "upgrades_available": available,
          "current_progress": progress,
          "upgrades_redeemed": total,
          "extended_type": count_type,
          "badge_count": config.get("pogoMedalCount"),
          "bonus_upgrades": config.get("bonusUpgrades"),
          "agreement_offset": config.get("offsetAgreements"),
        };
        return exportData;
      };

      const sendToKingClippy = (stats: Profile, link: DiscordUserLink) => {
        logger.info("Checking if data should be sent to WDD...");
        const now = Date.now();
        const lastImport = config.get("lastImport");
        if (now - lastImport < 3600000) {
          logger.info("WDD data was sent in the past hour; skipping");
          return;
        }
        config.set("lastImport", now);
        logger.info("Sending data to WDD...");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://apps.varden.info/wfptools/wdd/post-stats.php", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({
          id: link.id,
          data: makeStats(stats),
        }));
      };

      toolbox.interceptOpenJson("GET", "/api/v1/vault/profile", parseStats);
    },
  });
};
