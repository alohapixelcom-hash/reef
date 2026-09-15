// src/components/Sections/BackOffice/login.ts - connexion par code et Turnstile du service interne.
import { backofficeCopy } from "@i18n/backoffice";
type Turnstile = { render(el: HTMLElement, options: Record<string, unknown>): string; reset(id: string): void };
function init() {
  const root = document.querySelector<HTMLElement>("[data-admin-login]");
  if (!root || root.dataset.ready) return; root.dataset.ready = "1";
  const locale = root.dataset.locale === "fr" ? "fr" : "en";
  const t = backofficeCopy[locale];
  const status = root.querySelector<HTMLElement>("[data-login-status]")!;
  const requestForm = root.querySelector<HTMLFormElement>("[data-request-code]")!;
  const verifyForm = root.querySelector<HTMLFormElement>("[data-verify-code]")!;
  const send = requestForm.querySelector<HTMLButtonElement>("button")!;
  const email = requestForm.elements.namedItem("email") as HTMLInputElement;
  const turnstile = () => (window as unknown as { turnstile?: Turnstile }).turnstile;
  let token = ""; let widget = "";
  const post = (path: string, body: unknown) => fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const prepare = async () => {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) throw new Error("config");
    const config = await response.json() as { turnstileSiteKey?: string };
    if (!config.turnstileSiteKey) throw new Error("config");
    if (!turnstile()) await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.onload = () => resolve(); script.onerror = () => reject(new Error("challenge")); document.head.append(script);
    });
    widget = turnstile()!.render(root.querySelector<HTMLElement>("[data-challenge]")!, {
      sitekey: config.turnstileSiteKey, language: locale,
      callback: (value: string) => { token = value; send.disabled = false; },
      "expired-callback": () => { token = ""; send.disabled = true; },
      "error-callback": () => { token = ""; send.disabled = true; status.textContent = t.unavailable; },
    });
  };
  requestForm.addEventListener("submit", async event => {
    event.preventDefault(); if (!token) return; send.disabled = true;
    try {
      const response = await post("/api/auth/request", { email: email.value.trim(), locale, turnstile: token });
      if (!response.ok) throw new Error("request");
      email.readOnly = true; verifyForm.hidden = false; status.textContent = t.codeSent;
      (verifyForm.elements.namedItem("code") as HTMLInputElement).focus();
    } catch { status.textContent = t.loginFailed; }
    finally { token = ""; turnstile()?.reset(widget); }
  });
  verifyForm.addEventListener("submit", async event => {
    event.preventDefault(); const button = verifyForm.querySelector("button")!; button.disabled = true;
    try {
      const response = await post("/api/auth/verify", { email: email.value.trim(), code: (verifyForm.elements.namedItem("code") as HTMLInputElement).value });
      if (!response.ok) throw new Error("verify");
      // La destination est fournie par la page, jamais par une URL externe.
      location.href = root.dataset.target!;
    } catch { status.textContent = t.loginFailed; button.disabled = false; }
  });
  void prepare().catch(() => { status.textContent = t.unavailable; });
}
init(); document.addEventListener("astro:page-load", init);
