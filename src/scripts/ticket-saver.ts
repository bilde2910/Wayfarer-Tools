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

import { CheckboxEditor, register } from "../core";
import { makeChildNode, readFile } from "../utils";
import { KeyNotFoundError } from "../idb";

import "./ticket-saver.css";
import SidebarIcon from "../../assets/tickets.svg";
import ImportIcon from "../../assets/import-backup.svg";

const HELPSHIFT_HELPER_UUID = "de5a619c-2de7-4b1e-8eef-190397c0ad62";

interface SearchCacheItem {
  issue: FilteredIssue,
  e: HTMLElement,
  refresh: () => void,
}

interface IssueMessage {
  author: {
    name: string,
    id: string,
    roles: string[],
    role: string,
    emails?: unknown,
  },
  body: string,
  created_at: number,
  id: string,
  origin: string,
  state: string,
}

interface GenericMessage extends IssueMessage {
  // Have more fields, but they are uninteresting
  type:
    "Bot Started"
    | "Bot Ended"
    | "Confirmation Accepted"
    | "Option Input Response"
    | "Text Input Response"
    | "Text",
}

interface TextMessageWithOptionInput extends IssueMessage {
  type: "Text Message with Option Input",
  input: {
    label: string,
    placeholder: string,
    required: boolean,
    options: {
      title: string,
    }[],
  },
}

interface TextMessageWithTextInput extends IssueMessage {
  type: "Text Message with Text Input",
  input: {
    label: string,
    placeholder: string,
    required: boolean,
  },
}

interface Attachment extends IssueMessage {
  type: "Attachment",
  attachments: {
    size: number,
    content_type: string,
    file_name: string,
    url: string,
  }[],
}

type AnyMessageType =
  GenericMessage
  | TextMessageWithOptionInput
  | TextMessageWithTextInput
  | Attachment;

interface Issue {
  created_at: number,
  issue_id: string,
  publish_id: string,
  messages: AnyMessageType[],
  title: string,
  type: string,
}

type FilteredIssue = Omit<Issue, "publish_id"> & {
  id: string,
};

interface IssueUpdate {
  cursor: number,
  issue_exists: boolean,
  issues: Issue[],
}

interface IdbStores {
  tickets: FilteredIssue,
}

export default () => {
  register<IdbStores, void>()({
    id: "ticket-saver",
    name: "Ticket Saver",
    authors: ["tehstone", "bilde2910"],
    description: "Saves interactions with Niantic Support initiated through Wayfarer.",
    depends: {
      "Helpshift Helper for UWT": "https://static.varden.info/wayfarer-tools/dist/uwt-helpshift-helper.user.js",
    },
    defaultConfig: {
      showImportButton: true,
    },
    sessionData: {},
    initialize: (toolbox, logger, config) => {
      config.setUserEditable("showImportButton", {
        label: "Enable backup data import",
        help: "Adds a sidebar button to import old data from Wayfarer Ticket Saver",
        editor: new CheckboxEditor(),
      });

      const processUpdate = async (update: IssueUpdate) => {
        if (update?.issues?.length) {
          const updates = update.issues.map(raw => filterIssue(raw));
          await importChanges(updates);
        }
      };

      const importChanges = async (issues: FilteredIssue[]) => {
        using idb = await toolbox.openIDB("tickets", "readwrite");
        for (const issue of issues) {
          if (issue.type === "issue") {
            try {
              const existing = await idb.get(issue.id);
              const msgs = existing.messages;
              const storedMsgIDs = msgs.map(msg => msg.id);
              for (const msg of issue.messages) {
                if (!storedMsgIDs.includes(msg.id)) {
                  msgs.push(msg);
                }
              }
              logger.info(`Logged new message(s) for support ticket #${issue.id}`);
              idb.put({ ...issue, messages: msgs });
            } catch (ex) {
              if (ex instanceof KeyNotFoundError) {
                logger.info(`New support ticket #${issue.id} was logged`);
                idb.put(issue);
              } else {
                logger.error(ex);
              }
            }
          }
        }
      };

      const filterIssue = (issue: Issue) => {
        const cast = issue as Partial<Issue> & FilteredIssue;
        cast.id = issue.publish_id;
        delete cast.publish_id;
        cast.messages.forEach(msg => {
          if (msg.author) msg.author.emails = undefined;
        });
        return cast as FilteredIssue;
      };

      window.addEventListener("message", async ev => {
        try {
          const { uuid, data } = ev.data;
          if (uuid === HELPSHIFT_HELPER_UUID) {
            await processUpdate(data);
          }
        } catch (ex) {
          logger.error(ex);
        }
      });

      const getHTMLSearchRegex = (query: string) => {
        // Generate a regex that ensures our match (query) is not part
        // of an XML start tag or entity using a negative lookahead.
        // Adapted from the spec at https://www.w3.org/TR/xml/
        // (but not guaranteed to be accurate).
        const nameStartChars =
          ":A-Za-z_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF" +
          "\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F" +
          "\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
        const nameChars = nameStartChars +
          "\\-\\.0-9\u00B7\u0300-\u036F\u203F-\u2040";

        const name = `([${nameStartChars}][${nameChars}]*)`;
        const entityFragment = `&(${name}|#([Xx]?(0-9A-Fa-f)*|(0-9)*))?`;
        const attrFragmentDQ = `"([^<&"]|${entityFragment};)*`;
        const attrFragmentSQ = `'([^<&']|${entityFragment};)*`;
        const attribute = `${name}\\s*=\\s*(${attrFragmentDQ}"|${attrFragmentSQ}')`;
        const attrFragment = `${name}?\\s*=?\\s*(${attrFragmentDQ}|${attrFragmentSQ})?`;
        const sTagFragment = `<${name}(\\s*${attribute})*(\\s*${attrFragment})?`;
        return new RegExp(`(?<!(${entityFragment}|${sTagFragment}))` + query.replaceAll(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"), "gi");
      };

      const humanSize = (size: number) => {
        const prefixes = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
        let tmp = size;
        let index = 0;
        while (tmp > 1024) {
          index++;
          tmp /= 1024;
        }
        return (index == 0 ? tmp : tmp.toFixed(tmp < 100 ? 2 : 1)) + " " + prefixes[index];
      };

      const showTicketHistoryModal = async () => {
        const outer = document.createElement("div");
        outer.classList.add("uwtSTH-bg");
        document.querySelector("body")!.appendChild(outer);

        const inner = makeChildNode(outer, "div");
        inner.classList.add("uwtSTH-popup");
        makeChildNode(inner, "h1", "Support ticket history");

        const closeBtn = makeChildNode(inner, "div", "❌");
        closeBtn.title = "Close";
        closeBtn.classList.add("uwtSTH-close");
        closeBtn.addEventListener("click", () => {
          outer.parentNode!.removeChild(outer);
        });

        const searchBtn = makeChildNode(inner, "div", "🔍");
        const searchBox = makeChildNode(inner, "input") as HTMLInputElement;
        searchBtn.title = "Search";
        searchBtn.classList.add("uwtSTH-close");
        searchBtn.addEventListener("click", () => {
          inner.removeChild(searchBtn);
          searchBox.style.display = "block";
          searchBox.focus();
        });

        const searchCache: SearchCacheItem[] = [];
        searchBox.placeholder = "Search...";
        searchBox.classList.add("uwtSTH-search");
        searchBox.addEventListener("input", () => {
          const query = searchBox.value.toLowerCase();
          const dummy = document.createElement("div");
          searchCache.forEach(({ issue, e, refresh }) => {
            if (!query.length) {
              e.style.display = "block";
            } else {
              let matches = false;
              for (let i = 0; i < issue.messages.length; i++) {
                if ([
                  "Bot Started",
                  "Bot Ended",
                  "Confirmation Accepted",
                ].includes(issue.messages[i].type)) continue;
                dummy.textContent = query;
                const queryHTML = dummy.innerHTML;
                dummy.innerHTML = issue.messages[i].body.toLowerCase();
                if (dummy.innerHTML.match(getHTMLSearchRegex(queryHTML))) {
                  matches = true;
                  break;
                };
              }
              e.style.display = matches ? "block" : "none";
            }
            if ([...e.classList].includes("wfSTH-selected")) refresh();
          });
        });

        const exportBtn = makeChildNode(inner, "div", "📤");
        exportBtn.title = "Export";
        exportBtn.classList.add("uwtSTH-close");
        exportBtn.addEventListener("click", async () => {
          using idb = await toolbox.openIDB("tickets", "readonly");
          const allTickets = await idb.getAll();
          const blob = new Blob([JSON.stringify(allTickets)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.setAttribute("download", "wayfarer-ticket-saver.json");
          anchor.href = url;
          anchor.setAttribute("target", "_blank");
          anchor.click();
          URL.revokeObjectURL(url);
        });

        const box = makeChildNode(inner, "div");
        box.classList.add("uwtSTH-box");
        const list = makeChildNode(box, "div");
        list.classList.add("uwtSTH-list");
        const chat = makeChildNode(box, "div");
        chat.classList.add("uwtSTH-chat");

        const showTicket = (listItem: HTMLElement, issue: FilteredIssue, refresh: boolean) => {
          document.querySelectorAll(".uwtSTH-selected").forEach(e => e.classList.remove("uwtSTH-selected"));
          listItem.classList.add("uwtSTH-selected");
          if (!refresh) chat.scrollTop = 0;
          chat.innerHTML = "";
          logger.info("Displaying issue ticket", issue);

          issue.messages.sort((a, b) => a.created_at - b.created_at);
          issue.messages.forEach(msg => {
            switch (msg.type) {
              case "Bot Started":
              case "Bot Ended":
              case "Confirmation Accepted":
                return;
            }

            const direction = msg.author.roles.length == 1 && msg.author.roles[0] == "user" ? "sent" : "received";
            const msgBox = makeChildNode(chat, "div");
            msgBox.classList.add("uwtSTH-message");
            msgBox.classList.add("uwtSTH-msgState-" + direction);

            makeChildNode(msgBox, "p", new Date(msg.created_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "medium",
            }));

            const bubble = makeChildNode(msgBox, "div");
            bubble.classList.add("uwtSTH-chatBubble");

            const highlightSearch = (html: string) => {
              if (!searchBox.value.length) return html;
              const dummy = document.createElement("div");
              dummy.textContent = searchBox.value.toLowerCase();
              const query = dummy.innerHTML;
              dummy.innerHTML = html;
              return dummy.innerHTML.replaceAll(getHTMLSearchRegex(query), "<span class=\"uwtSTH-searchMatch\">$&</span>");
            };

            switch (msg.type) {
              case "Option Input Response":
              case "Text Input Response":
              case "Text Message with Text Input":
              case "Text":
                bubble.innerHTML = highlightSearch(msg.body);
                break;

              case "Text Message with Option Input":
                bubble.innerHTML = highlightSearch(msg.body);
                if (msg.input && msg.input.options) {
                  msg.input.options.forEach(opt => {
                    const eOpt = makeChildNode(bubble, "div", opt.title);
                    eOpt.classList.add("uwtSTH-mt-option");
                  });
                }
                break;

              case "Attachment":
                msg.attachments.forEach(file => {
                  const head = makeChildNode(bubble, "p", "📎 Attachment");
                  head.style.fontWeight = "bold";
                  const nameA = makeChildNode(makeChildNode(bubble, "p"), "a", file.file_name) as HTMLAnchorElement;
                  nameA.href = file.url;
                  nameA.target = "_blank";
                  const data = makeChildNode(bubble, "p", `${humanSize(file.size)} (${file.content_type})`);
                  data.style.opacity = "0.6";
                });
                break;

              default:
                (() => {
                  bubble.innerHTML = highlightSearch(msg.body);
                  const errMsg = makeChildNode(msgBox, "p", `Unknown message type ${msg.type}, please report to addon developer!`);
                  errMsg.style.color = "red";
                })();
            }
          });
        };

        {
          using idb = await toolbox.openIDB("tickets", "readonly");
          const allTickets = await idb.getAll();
          allTickets.sort((a, b) => b.created_at - a.created_at);
          allTickets.forEach(issue => {
            const listItem = makeChildNode(list, "div");
            listItem.classList.add("uwtSTH-listitem");
            makeChildNode(listItem, "h3", `Ticket #${issue.id}`);
            makeChildNode(listItem, "p", new Date(issue.created_at).toLocaleString(undefined, {
              dateStyle: "long",
              timeStyle: "long",
            }));
            listItem.addEventListener("click", () => showTicket(listItem, issue, false));
            searchCache.push({ issue, e: listItem, refresh: () => showTicket(listItem, issue, true) });
          });
        }
      };

      const importBackup = async () => {
        const contents = await readFile(".json", "application/json");
        const jsonData = JSON.parse(await contents.text()) as FilteredIssue[];
        await importChanges(jsonData);
        alert(`Successfully imported ${jsonData.length} support ticket(s).`);
      };

      if (config.get("showImportButton")) {
        toolbox.addImporter({
          title: "Import Support Tickets",
          description: "Import data previously exported from Ticket Saver.",
          callback: importBackup,
          icon: ImportIcon,
        });
      }

      toolbox.addSidebarItem("open", {
        imageUrl: SidebarIcon,
        label: "Tickets",
        callback: showTicketHistoryModal,
      });
    },
  });
};
