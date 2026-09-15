// src/components/Sections/BackOffice/categories.ts - formulaires de rubriques, conflits et garde des modifications.
import { backofficeCopy } from "@i18n/backoffice";
type Category = { slug: string; sha: string; frontmatter: Record<string, unknown> };
function init() {
  const root = document.querySelector<HTMLElement>("[data-categories]");
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "1";
  const lang = root.dataset.locale === "fr" ? "fr" : "en", t = backofficeCopy[lang];
  const demo = root.dataset.demo === "true";
  const status = root.querySelector<HTMLElement>("[data-category-status]")!;
  const form = root.querySelector<HTMLFormElement>("[data-category-form]")!;
  const list = root.querySelector<HTMLTableSectionElement>("[data-category-list]")!;
  const remove = root.querySelector<HTMLButtonElement>("[data-category-delete]")!;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const endpoint = `/api/editorial-categories/${lang}`;
  let current: Category | null = null, dirty = false, busy = false;
  const canLeave = () => !dirty || confirm(t.discard);
  const open = (item: Category | null) => {
    if (busy || !canLeave()) return;
    current = item; form.reset(); field("slug").value = item?.slug ?? ""; field("slug").readOnly = !!item;
    for (const name of ["name", "description", "order", "accent"]) field(name).value = String(item?.frontmatter[name] ?? (name === "order" ? 0 : name === "accent" ? "coral" : ""));
    remove.hidden = !item; form.hidden = false; dirty = false; field("name").focus();
    if (demo) for (const control of form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("input,button,select,textarea")) control.disabled = true;
  };
  const load = async () => {
    const response = await fetch(demo ? "/secret-spot/demo.json" : endpoint, { cache: "no-store" }); if (!response.ok) throw new Error("load");
    const value = await response.json();
    const data = (demo ? { items: value[lang].categories } : value) as { items: Category[] }; list.replaceChildren();
    for (const item of data.items.sort((a, b) => Number(a.frontmatter.order) - Number(b.frontmatter.order) || String(a.frontmatter.name).localeCompare(String(b.frontmatter.name), lang))) {
      const row = list.insertRow(); row.className = "border-border border-b";
      for (const value of [item.frontmatter.name, item.frontmatter.order]) { const cell = row.insertCell(); cell.className = "px-4 py-3"; cell.textContent = String(value); }
      const cell = row.insertCell(); cell.className = "px-4 py-3";
      const button = document.createElement("button"); button.type = "button"; button.className = "border-border rounded-pill min-h-11 border px-4 font-semibold"; button.textContent = t.edit;
      button.setAttribute("aria-label", `${t.edit} : ${String(item.frontmatter.name)}`); button.addEventListener("click", () => open(item)); cell.append(button);
    }
    return data.items.length;
  };
  const submit = async (deleting: boolean) => {
    if (demo || busy || (deleting && (!current || !confirm(t.confirmCategoryDelete)))) return;
    busy = true;
    const controls = [...form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("input,button,select,textarea")];
    controls.forEach(control => { control.disabled = true; });
    let saved = false;
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(field("slug").value)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: current?.sha, ...(deleting ? { action: "delete" } : { frontmatter: { name: field("name").value, description: field("description").value, order: Number(field("order").value), accent: field("accent").value } }) }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) { status.textContent = response.status === 409 ? t.conflict : data.error === "category_in_use" ? t.categoryUsed : t.failed; return; }
      saved = true; dirty = false; current = null; form.hidden = true; status.textContent = deleting ? t.categoryDeleted : t.categorySaved;
      await load();
    } catch { if (!saved) status.textContent = t.failed; }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); }
  };
  form.addEventListener("submit", event => { event.preventDefault(); void submit(false); });
  remove.addEventListener("click", () => void submit(true));
  root.querySelector("[data-category-new]")!.addEventListener("click", () => open(null));
  if (demo) (root.querySelector("[data-category-new]") as HTMLButtonElement).disabled = true;
  form.addEventListener("input", () => { dirty = true; });
  window.addEventListener("beforeunload", event => { if (dirty && root.isConnected) event.preventDefault(); });
  document.addEventListener("click", event => { if (root.isConnected && event.target instanceof Element && event.target.closest("a,[data-admin-logout]") && !canLeave()) { event.preventDefault(); event.stopImmediatePropagation(); } }, { capture: true });
  void load().then(count => { status.textContent = count ? "" : t.noCategories; }).catch(() => { status.textContent = t.failed; });
}
init(); document.addEventListener("astro:page-load", init);
