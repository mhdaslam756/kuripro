import { describe, expect, it, vi } from "vitest";

import { getPwaState, initPwa, promptInstall } from "@/lib/pwa-runtime";

/** The install-prompt state machine: capture beforeinstallprompt, expose canInstall, fire the prompt. */
describe("PWA runtime install flow", () => {
  it("captures beforeinstallprompt then appinstalled", () => {
    initPwa();
    expect(getPwaState().canInstall).toBe(false);

    const event = new Event("beforeinstallprompt") as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
    expect(getPwaState().canInstall).toBe(true);

    window.dispatchEvent(new Event("appinstalled"));
    expect(getPwaState().installed).toBe(true);
    expect(getPwaState().canInstall).toBe(false);
  });

  it("promptInstall triggers the deferred native prompt and reports acceptance", async () => {
    const event = new Event("beforeinstallprompt") as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    const prompt = vi.fn().mockResolvedValue(undefined);
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);

    const accepted = await promptInstall();
    expect(prompt).toHaveBeenCalledOnce();
    expect(accepted).toBe(true);
  });

  it("promptInstall returns false when there is nothing to prompt", async () => {
    expect(await promptInstall()).toBe(false);
  });
});
