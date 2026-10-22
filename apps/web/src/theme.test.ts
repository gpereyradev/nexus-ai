import { beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("document", { documentElement: { dataset: {}, style: {} } });
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
});
describe("appearance preference", () => {
  it("starts in purple dark mode before the app renders", async () => {
    const theme = await import("./theme");
    expect(theme.readTheme()).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
  it("restores a saved light preference and persists the next choice", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue("light");
    const theme = await import("./theme");
    expect(document.documentElement.dataset.theme).toBe("light");
    theme.saveTheme("dark");
    expect(localStorage.setItem).toHaveBeenCalledWith("nexus-theme", "dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("ignores an invalid saved value", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue("invalid");
    const theme = await import("./theme");
    expect(theme.readTheme()).toBe("dark");
  });
  it("still switches themes when browser storage is blocked", async () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error("blocked");
    });
    const theme = await import("./theme");
    expect(theme.readTheme()).toBe("dark");
    expect(() => theme.saveTheme("light")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
