import {
  ADMIN_SETTING_CATEGORIES,
  ADMIN_SETTING_DEFS,
  ADMIN_SETTING_ORDER,
  DEFAULT_ADMIN_SETTINGS,
  clampAdminSetting,
  type AdminSettingCategory
} from "../shared/config/adminSettings";
import type { AdminSettings, AdminSettingsPatch, AdminState } from "../shared/model/types";

interface AdminControlElements {
  range: HTMLInputElement;
  number: HTMLInputElement;
  value: HTMLSpanElement;
}

type UpdateHandler = (patch: AdminSettingsPatch) => void;
type CloseHandler = () => void;

const formatSettingValue = (key: keyof AdminSettings, value: number): string => {
  const definition = ADMIN_SETTING_DEFS[key];
  if (definition.format === "battery") {
    return `${Math.round(value)}`;
  }
  return `${value.toFixed(1)}x`;
};

export class AdminMenu {
  private readonly backdrop: HTMLDivElement;
  private readonly statusEl: HTMLParagraphElement;
  private readonly groupsEl: HTMLDivElement;
  private readonly detailEl: HTMLDivElement;
  private readonly detailLabelEl: HTMLParagraphElement;
  private readonly detailDescriptionEl: HTMLParagraphElement;
  private readonly detailContentEl: HTMLDivElement;
  private readonly controls = new Map<keyof AdminSettings, AdminControlElements>();
  private readonly categorySections = new Map<AdminSettingCategory, HTMLElement>();
  private updateHandler: UpdateHandler | null = null;
  private closeHandler: CloseHandler | null = null;
  private open = false;
  private selectedCategory: AdminSettingCategory | null = null;
  private state: AdminState = {
    canEdit: false,
    adminPlayerId: null,
    settings: { ...DEFAULT_ADMIN_SETTINGS }
  };

  constructor() {
    this.backdrop = document.createElement("div");
    this.backdrop.className = "admin-backdrop";

    const panel = document.createElement("section");
    panel.className = "admin-panel";

    const header = document.createElement("div");
    header.className = "admin-panel__header";

    const titleWrap = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "admin-panel__eyebrow";
    eyebrow.textContent = "Live Session Controls";
    const title = document.createElement("h2");
    title.textContent = "Dispatch Admin";
    titleWrap.append(eyebrow, title);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "admin-close";
    closeButton.textContent = "Esc";
    closeButton.addEventListener("click", () => this.closeHandler?.());

    header.append(titleWrap, closeButton);

    this.statusEl = document.createElement("p");
    this.statusEl.className = "admin-status";

    this.groupsEl = document.createElement("div");
    this.groupsEl.className = "admin-groups";

    for (const category of ADMIN_SETTING_CATEGORIES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-group-button";
      button.addEventListener("click", () => this.selectCategory(category.id));

      const label = document.createElement("strong");
      label.className = "admin-group-button__label";
      label.textContent = category.label;

      const description = document.createElement("span");
      description.className = "admin-group-button__description";
      description.textContent = category.description;

      button.append(label, description);
      this.groupsEl.appendChild(button);
    }

    const detailToolbar = document.createElement("div");
    detailToolbar.className = "admin-panel__toolbar";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "admin-back";
    backButton.textContent = "Zurueck";
    backButton.addEventListener("click", () => this.selectCategory(null));

    const detailMeta = document.createElement("div");
    this.detailLabelEl = document.createElement("p");
    this.detailLabelEl.className = "admin-section__eyebrow";
    this.detailDescriptionEl = document.createElement("p");
    this.detailDescriptionEl.className = "admin-section__description";
    detailMeta.append(this.detailLabelEl, this.detailDescriptionEl);

    detailToolbar.append(backButton, detailMeta);

    this.detailContentEl = document.createElement("div");
    this.detailContentEl.className = "admin-detail__content";

    this.detailEl = document.createElement("div");
    this.detailEl.className = "admin-detail";
    this.detailEl.append(detailToolbar, this.detailContentEl);

    for (const category of ADMIN_SETTING_CATEGORIES) {
      const section = document.createElement("section");
      section.className = "admin-section";

      const grid = document.createElement("div");
      grid.className = "admin-grid";
      section.appendChild(grid);
      this.categorySections.set(category.id, section);
    }

    for (const key of ADMIN_SETTING_ORDER) {
      const definition = ADMIN_SETTING_DEFS[key];
      const row = document.createElement("label");
      row.className = "admin-row";

      const meta = document.createElement("div");
      meta.className = "admin-row__meta";
      const name = document.createElement("strong");
      name.textContent = definition.label;
      const description = document.createElement("span");
      description.textContent = definition.description;
      meta.append(name, description);

      const range = document.createElement("input");
      range.type = "range";
      range.min = String(definition.min);
      range.max = String(definition.max);
      range.step = String(definition.step);

      const number = document.createElement("input");
      number.type = "number";
      number.min = String(definition.min);
      number.max = String(definition.max);
      number.step = String(definition.step);
      number.className = "admin-row__number";

      const value = document.createElement("span");
      value.className = "admin-row__value";

      range.addEventListener("input", () => {
        this.handleControlChange(key, range.value);
      });
      number.addEventListener("change", () => {
        this.handleControlChange(key, number.value);
      });

      const controls = document.createElement("div");
      controls.className = "admin-row__controls";
      controls.append(range, number, value);

      row.append(meta, controls);
      this.categorySections.get(definition.category)?.firstElementChild?.appendChild(row);
      this.controls.set(key, { range, number, value });
    }

    const hint = document.createElement("p");
    hint.className = "admin-hint";
    hint.textContent = "Escape schliesst das Panel. Aenderungen werden sofort auf dem Server uebernommen.";

    panel.append(header, this.statusEl, this.groupsEl, this.detailEl, hint);
    this.backdrop.appendChild(panel);
    (document.querySelector(".shell") ?? document.body).appendChild(this.backdrop);

    this.backdrop.addEventListener("click", (event) => {
      if (event.target === this.backdrop) {
        this.closeHandler?.();
      }
    });

    this.refresh();
  }

  public isOpen(): boolean {
    return this.open;
  }

  public setOpen(open: boolean): void {
    this.open = open;
    if (open) {
      this.selectedCategory = null;
    }
    this.backdrop.classList.toggle("is-visible", open);
    this.backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    this.renderLayout();
  }

  public onUpdate(handler: UpdateHandler): void {
    this.updateHandler = handler;
  }

  public onCloseRequest(handler: CloseHandler): void {
    this.closeHandler = handler;
  }

  public applyState(state: AdminState): void {
    this.state = {
      canEdit: state.canEdit,
      adminPlayerId: state.adminPlayerId,
      settings: { ...state.settings }
    };
    this.refresh();
  }

  private selectCategory(category: AdminSettingCategory | null): void {
    this.selectedCategory = category;
    this.renderLayout();
  }

  private handleControlChange(key: keyof AdminSettings, rawValue: string): void {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      this.refresh();
      return;
    }

    const nextValue = clampAdminSetting(key, numericValue);
    this.state.settings[key] = nextValue;
    this.refresh();

    if (!this.state.canEdit || !this.updateHandler) {
      return;
    }

    const patch: AdminSettingsPatch = {};
    patch[key] = nextValue;
    this.updateHandler(patch);
  }

  private renderLayout(): void {
    const category = ADMIN_SETTING_CATEGORIES.find((entry) => entry.id === this.selectedCategory) ?? null;
    const showDetail = category !== null;

    this.groupsEl.hidden = showDetail;
    this.detailEl.hidden = !showDetail;

    if (!category) {
      this.detailContentEl.replaceChildren();
      return;
    }

    this.detailLabelEl.textContent = category.label;
    this.detailDescriptionEl.textContent = category.description;
    const section = this.categorySections.get(category.id);
    if (section) {
      this.detailContentEl.replaceChildren(section);
    }
  }

  private refresh(): void {
    this.statusEl.textContent = this.state.canEdit
      ? "Du bist aktuell Admin. Waehle erst eine Gruppe und tune dann die Session live."
      : "Nur Ansicht. Der aktuelle Admin kann diese Gruppen per Escape oeffnen und live aendern.";

    for (const key of ADMIN_SETTING_ORDER) {
      const control = this.controls.get(key);
      if (!control) {
        continue;
      }

      const value = this.state.settings[key] ?? DEFAULT_ADMIN_SETTINGS[key];
      control.range.value = String(value);
      control.number.value = String(value);
      control.value.textContent = formatSettingValue(key, value);
      control.range.disabled = !this.state.canEdit;
      control.number.disabled = !this.state.canEdit;
    }

    this.renderLayout();
  }
}
