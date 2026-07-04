import { CONFIG } from "../config.ts";
import type { AdvisorMessage } from "../sim/advisor.ts";

/**
 * Toast stack for advisor messages, top-center under the HUD. Newest at the
 * bottom; oldest evicted beyond MAX_TOASTS; each auto-dismisses after
 * TOAST_MS with a fade. Clicking a toast dismisses it early.
 */
export class Toasts {
  private container: HTMLElement;

  constructor(appEl: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className = "toasts";
    appEl.appendChild(this.container);
  }

  push(msg: AdvisorMessage): void {
    // Never show the same advice twice at once, whatever the sim speed.
    if (this.container.querySelector(`[data-id="${msg.id}"]`)) return;
    while (this.container.children.length >= CONFIG.MAX_TOASTS) {
      this.container.firstElementChild!.remove();
    }
    const el = document.createElement("div");
    el.className = `toast toast-${msg.kind}`;
    el.dataset.id = msg.id;
    el.textContent = msg.text;
    el.addEventListener("click", () => el.remove());
    this.container.appendChild(el);

    window.setTimeout(() => {
      el.classList.add("toast-out");
      window.setTimeout(() => el.remove(), 400);
    }, CONFIG.TOAST_MS);
  }
}
