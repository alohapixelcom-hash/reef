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
  const demo = root.dataset.demo === "true";
  const form = root.querySelector<HTMLFormElement>("[data-article-form]")!;
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const list = root.querySelector<HTMLTableSectionElement>("[data-articles]")!;
  const preview = root.querySelector<HTMLElement>("[data-preview]")!;
  let items: Article[] = [];
  let sortKey = "pubDate";
  let direction = -1;
  const search = root.querySelector<HTMLInputElement>("[data-search]")!;
  const remove = root.querySelector<HTMLButtonElement>("[data-delete]")!;
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
    current = article; remove.hidden = !article;
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
    if (demo) for (const control of form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("input,button,select,textarea")) control.disabled = true;
  };
  const renderList = () => {
    list.replaceChildren();
    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-sort]")) {
      const active = button.dataset.sort === sortKey;
      button.closest("th")?.setAttribute("aria-sort", active ? direction === 1 ? "ascending" : "descending" : "none");
      button.querySelector("[data-sort-arrow]")!.textContent = active ? direction === 1 ? " ↑" : " ↓" : "";
    }
    const query = search.value.trim().toLocaleLowerCase(lang);
    const sorted = items.filter(item => String(item.frontmatter.title).toLocaleLowerCase(lang).includes(query)).sort((a, b) => {
      const left = a.frontmatter[sortKey], right = b.frontmatter[sortKey];
      const comparison = sortKey === "pubDate" ? Date.parse(String(left)) - Date.parse(String(right)) : sortKey === "draft" ? Number(left === true) - Number(right === true) : String(left).localeCompare(String(right), lang);
      return direction * comparison || a.slug.localeCompare(b.slug);
    });
    for (const article of sorted) {
      const item = document.createElement("tr"); item.className = "border-border border-b";
      for (const value of [String(article.frontmatter.title), String(article.frontmatter.pubDate), article.frontmatter.draft ? t.draft : t.publishedState]) {
        const cell = document.createElement("td"); cell.className = "px-4 py-3"; cell.textContent = value; item.append(cell);
      }
      const action = document.createElement("td"); action.className = "px-4 py-3";
      const button = document.createElement("button"); button.type = "button";
      button.className = "rounded-pill border-border min-h-11 border px-4 font-semibold"; button.textContent = t.edit;
      button.setAttribute("aria-label", `${t.edit} : ${String(article.frontmatter.title)}`);
      button.addEventListener("click", async () => {
        if (busy || !canLeave()) return;
        if (demo) { populate(article); status.textContent = t.demoHint; return; }
        busy = true; button.disabled = true;
        try {
          const res = await fetch(`/api/editorial/${lang}/${encodeURIComponent(article.slug)}`, { cache: "no-store" });
          if (!res.ok) throw new Error("load");
          populate(await res.json() as Article); status.textContent = "";
        } catch { status.textContent = t.failed; }
        finally { busy = false; button.disabled = false; }
      });
      action.append(button); item.append(action); list.append(item);
    }
    if (!sorted.length) { const row = list.insertRow(); const cell = row.insertCell(); cell.colSpan = 4; cell.className = "px-4 py-10 text-center text-muted-foreground"; cell.textContent = items.length ? t.noResults : t.empty; }
  };
  search.addEventListener("input", renderList);
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-sort]")) button.addEventListener("click", () => {
    direction = sortKey === button.dataset.sort ? -direction : 1; sortKey = button.dataset.sort!; renderList();
  });
  remove.addEventListener("click", async () => {
    if (demo || busy || !current || !confirm(t.confirmDelete)) return;
    busy = true;
    const controls = [...form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("input,button,select,textarea")];
    controls.forEach(control => { control.disabled = true; });
    try {
      const response = await fetch(`/api/editorial/${lang}/${encodeURIComponent(current.slug)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", sha: current.sha }) });
      if (!response.ok) { status.textContent = response.status === 409 ? t.conflict : t.failed; return; }
      items = items.filter(item => item.slug !== current!.slug); current = null; dirty = false; watch++; pending = null;
      form.hidden = true; renderList(); status.textContent = t.deleted;
    } catch { status.textContent = t.failed; }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); }
  });
  const load = async () => {
    const response = await fetch(demo ? "/secret-spot/demo.json" : `/api/editorial/${lang}`, { cache: "no-store" });
    if (!response.ok) throw new Error("load");
    const value = await response.json();
    const data = (demo ? value[lang] : value) as { items: Article[]; references: References };
    references = data.references;
    for (const [name, values] of [["author", references.auteurs], ["topic", references.sujets], ["cover", references.images]] as const) {
      const select = field(name) as HTMLSelectElement;
      select.replaceChildren(new Option(name === "cover" ? t.noCover : "", ""), ...values.map(value => new Option(references?.libelles?.[value] ?? value.split("/").pop()!.replace(/\.[a-z]+$/i, "").replace(/^reef-/, "").replace(/-/g, " "), value)));
    }
    items = data.items;
    renderList();
    return data.items.length;
  };
  root.querySelector("[data-new]")!.addEventListener("click", () => { if (!busy && references && canLeave()) { populate(null); status.textContent = ""; } });
  if (demo) (root.querySelector("[data-new]") as HTMLButtonElement).disabled = true;
  form.addEventListener("input", () => { dirty = true; renderPreview(); });
  window.addEventListener("beforeunload", event => { if (dirty && root.isConnected) event.preventDefault(); });
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target.closest("a, [data-admin-logout]") : null;
    if (root.isConnected && target && !canLeave()) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { capture: true });
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (demo || busy) return;
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
      items = [...items.filter(item => item.slug !== slug), current]; renderList(); remove.hidden = false;
      check("slug").readOnly = true; status.textContent = t.saved;
      pending = { slug, sha: data.sha!, draft: fm.draft === true }; publicationButton.hidden = false;
      void watchPublication(++watch);
      // Ne pas recharger le formulaire : GitHub peut encore propager le commit.
    } catch { status.textContent = t.failed; }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); }
  });
  void load().then(count => { status.textContent = count ? demo ? t.demoSelect : t.select : t.empty; }).catch(() => { status.textContent = t.failed; });
}
init(); document.addEventListener("astro:page-load", init);
