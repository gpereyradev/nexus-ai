import { afterEach, beforeEach, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());
const token = (value: string) =>
  new Response(JSON.stringify({ token: value, headerName: "X-CSRF-TOKEN" }));
it("rotates the client CSRF token after successful authentication", async () => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(token("before-login"))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "1", role: "ADMIN" })),
    )
    .mockResolvedValueOnce(token("after-login"))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "product" })));
  vi.stubGlobal("fetch", mock);
  const { login, save } = await import("./client");
  await login("admin@nexus.demo", "private-local-password");
  await save("/products", { name: "Demo" });
  expect(mock.mock.calls[1][1].headers.get("X-CSRF-TOKEN")).toBe(
    "before-login",
  );
  expect(mock.mock.calls[4][1].headers.get("X-CSRF-TOKEN")).toBe("after-login");
  expect(mock.mock.calls[1][1].body).toBeInstanceOf(URLSearchParams);
  expect(mock.mock.calls[1][1].credentials).toBe("same-origin");
});
it("does not automatically replay a rejected mutation", async () => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(token("token"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "FORBIDDEN" }), { status: 403 }),
    );
  vi.stubGlobal("fetch", mock);
  const { save, ApiError } = await import("./client");
  await expect(save("/products", {})).rejects.toBeInstanceOf(ApiError);
  expect(mock).toHaveBeenCalledTimes(2);
});
it("preserves server field errors without exposing request credentials", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(token("token"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "Revisa los campos",
            fields: { name: "No puede estar vacío" },
          }),
          { status: 400 },
        ),
      ),
  );
  const { save } = await import("./client");
  await expect(save("/customers", {})).rejects.toMatchObject({
    status: 400,
    fields: { name: "No puede estar vacío" },
  });
});
it("signals an expired session to the workspace", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "UNAUTHENTICATED" }), {
          status: 401,
        }),
      ),
  );
  const { request } = await import("./client");
  await expect(request("/products")).rejects.toMatchObject({ status: 401 });
  expect(window.dispatchEvent).toHaveBeenCalledOnce();
});
