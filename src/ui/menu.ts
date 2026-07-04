import { CONFIG } from "../config.ts";
import { Game, type Difficulty } from "../core/game.ts";
import { isSaveData } from "../core/save.ts";

/**
 * The ⚙ system menu: city name, new game (with difficulty), and save
 * export/import as a .json file. Lives as an overlay panel; the button sits
 * at the end of the toolbar with the other big touch targets.
 */
export function createMenu(toolbarEl: HTMLElement, appEl: HTMLElement, game: Game): void {
  const btn = document.createElement("button");
  btn.className = "tool-btn";
  btn.type = "button";
  btn.innerHTML = `<span class="tool-icon">⚙️</span><span class="tool-label">Menu</span>`;
  toolbarEl.appendChild(btn);

  const panel = document.createElement("div");
  panel.className = "menu-panel";
  panel.hidden = true;
  panel.innerHTML =
    `<h2>City Hall</h2>` +
    `<label class="menu-row">City name` +
    `<input type="text" id="menu-name" maxlength="24" autocomplete="off"></label>` +
    `<div class="menu-row"><span>New game</span><span class="menu-actions">` +
    `<select id="menu-difficulty" aria-label="Difficulty">` +
    `<option value="easy">Easy ($${CONFIG.DIFFICULTY_MONEY.easy.toLocaleString()})</option>` +
    `<option value="normal">Normal ($${CONFIG.DIFFICULTY_MONEY.normal.toLocaleString()})</option>` +
    `<option value="hard">Hard ($${CONFIG.DIFFICULTY_MONEY.hard.toLocaleString()})</option>` +
    `</select>` +
    `<button type="button" id="menu-new">Start</button></span></div>` +
    `<div class="menu-row"><span>Save file</span><span class="menu-actions">` +
    `<button type="button" id="menu-export">Export</button>` +
    `<button type="button" id="menu-import">Import</button></span></div>` +
    `<p class="menu-note">Progress autosaves in this browser every ` +
    `${Math.round(CONFIG.AUTOSAVE_MS / 1000)}s.</p>` +
    `<button type="button" id="menu-close">Close</button>`;
  appEl.appendChild(panel);

  const nameInput = panel.querySelector<HTMLInputElement>("#menu-name")!;
  const difficultySel = panel.querySelector<HTMLSelectElement>("#menu-difficulty")!;

  const open = () => {
    nameInput.value = game.cityName;
    panel.hidden = false;
    game.setSpeed("paused"); // pause while the mayor is in a meeting
  };
  const close = () => {
    panel.hidden = true;
    if (game.speed === "paused") game.setSpeed("slow");
  };
  btn.addEventListener("click", () => (panel.hidden ? open() : close()));
  panel.querySelector("#menu-close")!.addEventListener("click", close);

  nameInput.addEventListener("input", () => {
    game.cityName = nameInput.value.trim() || CONFIG.DEFAULT_CITY_NAME;
    document.title = `${game.cityName} — City Builder`;
  });

  panel.querySelector("#menu-new")!.addEventListener("click", () => {
    if (!window.confirm("Start a new city? The current one is replaced.")) return;
    game.newGame(difficultySel.value as Difficulty);
    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(game.toSave()));
    document.title = `${game.cityName} — City Builder`;
    close();
  });

  panel.querySelector("#menu-export")!.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(game.toSave())], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${game.cityName.replace(/[^\w-]+/g, "_") || "city"}.city.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  panel.querySelector("#menu-import")!.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data: unknown = JSON.parse(await file.text());
        if (isSaveData(data) && game.loadSave(data)) {
          document.title = `${game.cityName} — City Builder`;
          close();
        } else {
          window.alert("That file isn't a valid save for this map size.");
        }
      } catch {
        window.alert("Couldn't read that file as a save.");
      }
    });
    input.click();
  });
}
