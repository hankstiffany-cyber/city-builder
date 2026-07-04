import { TOOL_COST } from "../config.ts";
import { Game } from "../core/game.ts";
import type { Tool } from "../sim/build.ts";

interface ToolDef {
  tool: Tool;
  label: string;
  icon: string;
}

const TOOLS: ToolDef[] = [
  { tool: "pan", label: "Pan", icon: "✋" },
  { tool: "bulldoze", label: "Bulldoze", icon: "⛏️" },
  { tool: "road", label: "Road", icon: "🛣️" },
  { tool: "powerline", label: "Power line", icon: "⚡" },
  { tool: "zone_r", label: "Residential", icon: "🏠" },
  { tool: "zone_c", label: "Commercial", icon: "🏬" },
  { tool: "zone_i", label: "Industrial", icon: "🏭" },
  { tool: "power_plant", label: "Power plant", icon: "🔌" },
];

/**
 * Builds the tool palette and keeps the active button highlighted. Buttons are
 * large touch targets so the same UI works on a phone.
 */
export function createToolbar(container: HTMLElement, game: Game): void {
  const buttons = new Map<Tool, HTMLButtonElement>();

  const select = (tool: Tool) => {
    game.setTool(tool);
    for (const [t, btn] of buttons) btn.classList.toggle("active", t === tool);
  };

  for (const def of TOOLS) {
    const btn = document.createElement("button");
    btn.className = "tool-btn";
    btn.type = "button";
    const cost = TOOL_COST[def.tool];
    btn.innerHTML =
      `<span class="tool-icon">${def.icon}</span>` +
      `<span class="tool-label">${def.label}</span>` +
      (cost ? `<span class="tool-cost">$${cost.toLocaleString()}</span>` : "");
    btn.addEventListener("click", () => select(def.tool));
    container.appendChild(btn);
    buttons.set(def.tool, btn);
  }

  select(game.tool);
}
