// src/components/Sections/BackOffice/editor.ts - formulaire Aloha adapte aux articles et references Reef.
import { backofficeCopy } from "@i18n/backoffice";
import { apercu } from "../../../backoffice/presentation";
type Article = { slug: string; sha: string; frontmatter: Record<string, unknown>; body?: string };
type References = { auteurs: string[]; sujets: string[]; images: string[]; libelles?: Record<string, string> };
function init() {
  const root = document.querySelector<HTMLElement>("[data-editor]");
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "1";
  const lang = root.dataset.locale === "fr" ? "fr" : "en";
  const t = backofficeCopy[lang];
  const form = root.querySelector<HTMLFormElement>("[data-article-form]")!;
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const list = root.querySelector<HTMLUListElement>("[data-articles]")!;
  const preview = root.querySelector<HTMLElement>("[data-preview]")!;
  let current: Article | null = null;
  let dirty = false;
  let busy = false;
  let references: References | null = null;
  let pending: { slug: string; sha: string; draft: boolean } | null = null;
  let watch = 0;
  const publicationButton = root.querySelector<HTMLButtonElement>("[data-check-publication]")!;
  const verifyPublication = async () => {
    if (!pending) return false;
    const target = pending;
    try {
      const response = await fetch(`/api/editorial-status/${lang}/${encodeURIComponent(target.slug)}`, { cache: "no-store" });
      if (!response.ok) return false;
      const data = await response.json() as { sha?: string };
      if (pending !== target || dirty) return false;
      if (data.sha === target.sha) { status.textContent = target.draft ? t.draftBuilt : t.published; publicationButton.hidden = true; pending = null; return true; }
    } catch { /* Une panne de sonde ne remet pas en cause la sauvegarde GitHub. */ }
    return false;
  };
  publicationButton.addEventListener("click", async () => { publicationButton.disabled = true; if (!await verifyPublication()) status.textContent = t.publicationPending; publicationButton.disabled = false; });
  const watchPublication = async (id: number) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      if (!root.isConnected || id !== watch || !pending) return;
      if (await verifyPublication()) return;
    }
    if (!dirty && id === watch && pending) status.textContent = t.publicationPending;
  };
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const check = (name: string) => field(name) as HTMLInputElement;
  const canLeave = () => !dirty || confirm(t.discard);
  const renderPreview = () => { preview.innerHTML = apercu(field("body").value); };
  const populate = (article: Article | null) => {
    watch++; pending = null; publicationButton.hidden = true;
    current = article;
    form.reset();
    for (const name of ["title", "description", "pubDate", "author", "topic", "cover", "coverAlt"]) field(name).value = String(article?.frontmatter[name] ?? "");
    field("slug").value = article?.slug ?? "";
    check("slug").readOnly = article !== null;
    field("tags").value = Array.isArray(article?.frontmatter.tags) ? article.frontmatter.tags.join(", ") : "";
    field("body").value = article?.body ?? "";
    check("draft").checked = article ? article.frontmatter.draft === true : true;
    check("featured").checked = article?.frontmatter.featured === true;
    if (!article) field("pubDate").value = new Date().toISOString().slice(0, 10);
    form.hidden = false; dirty = false; renderPreview(); field("title").focus();
  };
  const load = async () => {
    const response = await fetch(`/api/editorial/${lang}`, { cache: "no-store" });
    if (!response.ok) throw new Error("load");
    const data = await response.json() as { items: Article[]; references: References };
    references = data.references;
    for (const [name, values] of [["author", references.auteurs], ["topic", references.sujets], ["cover", references.images]] as const) {
      const select = field(name) as HTMLSelectElement;
      select.replaceChildren(new Option(name === "cover" ? t.noCover : "", ""), ...values.map(value => new Option(references?.libelles?.[value] ?? value.split("/").pop()!.replace(/\.[a-z]+$/i, "").replace(/^reef-/, "").replace(/-/g, " "), value)));
    }
    list.replaceChildren();
    for (const article of data.items) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button"; button.className = "border-border rounded-card min-h-11 w-full border px-3 py-3 text-left";
      button.textContent = `${String(article.frontmatter.title)}${article.frontmatter.draft ? ` (${t.draft})` : ""}`;
      button.addEventListener("click", async () => {
        if (busy || !canLeave()) return;
        busy = true; button.disabled = true;
        try {
          const res = await fetch(`/api/editorial/${lang}/${encodeURIComponent(article.slug)}`, { cache: "no-store" });
          if (!res.ok) throw new Error("load");
          populate(await res.json() as Article); status.textContent = "";
        } catch { status.textContent = t.failed; }
        finally { busy = false; button.disabled = false; }
      });
      item.append(button); list.append(item);
    }
    return data.items.length;
  };
  root.querySelector("[data-new]")!.addEventListener("click", () => { if (!busy && references && canLeave()) { populate(null); status.textContent = ""; } });
  form.addEventListener("input", () => { dirty = true; renderPreview(); });
  window.addEventListener("beforeunload", event => { if (dirty && root.isConnected) event.preventDefault(); });
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target.closest("a, [data-admin-logout]") : null;
    if (root.isConnected && target && !canLeave()) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { capture: true });
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (busy) return;
    busy = true; status.textContent = t.saving;
    const controls = [...form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("input,button,select,textarea")];
    const fm: Record<string, unknown> = {};
    for (const name of ["title", "description", "pubDate", "author", "topic", "cover", "coverAlt"]) fm[name] = field(name).value;
    fm.tags = field("tags").value.split(",").map(tag => tag.trim()).filter(Boolean);
    fm.draft = check("draft").checked; fm.featured = check("featured").checked;
    const body = field("body").value;
    const slug = field("slug").value;
    const unset = fm.cover ? [] : ["cover", "coverAlt"];
    controls.forEach(control => { control.disabled = true; });
    try {
      const response = await fetch(`/api/editorial/${lang}/${encodeURIComponent(slug)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: current?.sha, frontmatter: fm, body, unset }) });
      const data = await response.json() as { sha?: string; fields?: string[] };
      if (!response.ok) { status.textContent = response.status === 409 ? t.conflict : data.fields ? t.invalid + data.fields.map(key => t[key as keyof typeof t] ?? key).join(", ") : t.failed; return; }
      current = { slug, sha: data.sha!, frontmatter: fm, body }; dirty = false;
      check("slug").readOnly = true; status.textContent = t.saved;
      pending = { slug, sha: data.sha!, draft: fm.draft === true }; publicationButton.hidden = false;
      void watchPublication(++watch);
      // Ne pas recharger le formulaire : GitHub peut encore propager le commit.
    } catch { status.textContent = t.failed; }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); }
  });
  void load().then(count => { status.textContent = count ? t.select : t.empty; }).catch(() => { status.textContent = t.failed; });
}
init(); document.addEventListener("astro:page-load", init);
