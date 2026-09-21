const VERSION = "0.3.4";

class GarageDoorControlCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._doors = [];
  }

  set hass(hass) {
    this._hass = hass;
    for (const picker of this.shadowRoot.querySelectorAll("ha-entity-picker")) {
      picker.hass = hass;
    }
  }

  setConfig(config) {
    this._config = { ...config };
    delete this._config.name;
    const configured = config.entities ?? (config.entity ? [config.entity] : []);
    this._doors = configured.map((item) => typeof item === "string"
      ? { entity: item, name: "" }
      : { entity: item.entity || "", name: item.name || "" });
    this.render();
  }

  escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  emit() {
    const config = {
      ...this._config,
      entities: this._doors.filter((door) => door.entity).map((door) => ({
        entity: door.entity,
        ...(door.name ? { name: door.name } : {}),
      })),
    };
    delete config.entity;
    delete config.name;
    this._config = config;
    const event = new Event("config-changed", { bubbles: true, composed: true });
    event.detail = { config };
    this.dispatchEvent(event);
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `<style>
      :host{display:block}*{box-sizing:border-box}.field{display:block;width:100%;margin-bottom:18px}.text-field span{display:block;margin:0 0 6px;font-size:12px;color:var(--secondary-text-color)}.text-field input{display:block;width:100%;height:52px;padding:8px 12px;border:1px solid var(--divider-color);border-radius:8px;outline:none;color:var(--primary-text-color);background:var(--input-fill-color,var(--secondary-background-color));font:inherit}.text-field input:focus{border-color:var(--primary-color);box-shadow:0 0 0 1px var(--primary-color)}.section-label{margin:8px 0 10px;font-size:14px;font-weight:500}.doors{display:grid;gap:12px}.door-row{padding:14px;border:1px solid var(--divider-color);border-radius:12px;background:var(--card-background-color)}.door-row ha-entity-picker{display:block;width:100%}.door-row .text-field{margin-top:14px}.row-actions{display:flex;justify-content:flex-end;margin-top:8px}.remove,.add{appearance:none;padding:8px 12px;border:0;border-radius:18px;color:var(--primary-color);background:var(--secondary-background-color);font:inherit;cursor:pointer}.remove{color:var(--error-color)}.add{margin:12px 0 22px}.toggle{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:56px;border-top:1px solid var(--divider-color);font-size:14px}
    </style>
    <label class="field text-field"><span>Card title</span><input class="title" type="text" autocomplete="off"></label>
    <div class="section-label">Garage doors</div>
    <div class="doors">${this._doors.map((door, index) => `<div class="door-row" data-index="${index}"><ha-entity-picker></ha-entity-picker><label class="text-field"><span>Display name</span><input class="door-name" type="text" placeholder="Use Home Assistant name" autocomplete="off"></label><div class="row-actions"><button class="remove" type="button">Remove</button></div></div>`).join("")}</div>
    <button class="add" type="button">+ Add garage door</button>
    <label class="toggle"><span>Confirm every activation</span><ha-switch class="confirm"></ha-switch></label>
    <label class="toggle"><span>Show when each door last changed</span><ha-switch class="last-changed"></ha-switch></label>`;

    const title = this.shadowRoot.querySelector(".title");
    title.value = this._config.title || "";
    title.addEventListener("change", () => {
      this._config.title = title.value;
      this.emit();
    });

    for (const row of this.shadowRoot.querySelectorAll(".door-row")) {
      const index = Number(row.dataset.index);
      const picker = row.querySelector("ha-entity-picker");
      const name = row.querySelector(".door-name");
      picker.hass = this._hass;
      picker.value = this._doors[index].entity;
      picker.includeDomains = ["cover"];
      picker.label = "Garage door entity";
      picker.addEventListener("value-changed", (event) => {
        this._doors[index].entity = event.detail.value || "";
        this.emit();
      });
      name.value = this._doors[index].name;
      name.addEventListener("change", () => {
        this._doors[index].name = name.value.trim();
        this.emit();
      });
      row.querySelector(".remove").onclick = () => {
        this._doors.splice(index, 1);
        this.emit();
        this.render();
      };
    }

    this.shadowRoot.querySelector(".add").onclick = () => {
      this._doors.push({ entity: "", name: "" });
      this.render();
    };
    const confirm = this.shadowRoot.querySelector(".confirm");
    confirm.checked = this._config.confirm_actions !== false;
    confirm.addEventListener("change", () => {
      this._config.confirm_actions = confirm.checked;
      this.emit();
    });
    const changed = this.shadowRoot.querySelector(".last-changed");
    changed.checked = this._config.show_last_changed !== false;
    changed.addEventListener("change", () => {
      this._config.show_last_changed = changed.checked;
      this.emit();
    });
  }
}

class GarageDoorControlCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.confirming = "";
    this.pending = {};
    this.pointerActive = false;
  }

  static getStubConfig() {
    return { title: "Garage Doors", entities: [] };
  }

  static getConfigElement() {
    return document.createElement("garage-door-control-card-editor");
  }

  setConfig(config) {
    if (!config) throw new Error("Card configuration is required");
    const configured = config.entities ?? (config.entity ? [config.entity] : []);
    if (!Array.isArray(configured) || !configured.length) {
      throw new Error("Choose at least one garage-door cover entity");
    }
    this.config = {
      title: "Garage Doors",
      confirm_actions: true,
      show_last_changed: true,
      ...config,
      entities: configured,
    };
  }

  set hass(hass) {
    this._hass = hass;
    for (const item of this.items()) {
      const expected = this.pending[item.entity];
      const actual = this._hass.states[item.entity]?.state;
      const reachedTarget = (expected === "opening" && actual === "open")
        || (expected === "closing" && actual === "closed");
      if (expected && (actual === expected || reachedTarget)) {
        delete this.pending[item.entity];
      }
    }
    if (this.hassSignature() === this._lastHassSignature) return;
    if (!this.pointerActive) this.render();
  }

  getCardSize() {
    return Math.max(4, this.items().length * 4);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  items() {
    return (this.config?.entities || []).map((item) => typeof item === "string"
      ? { entity: item }
      : item).filter((item) => item?.entity);
  }

  hassSignature() {
    return this.items().map((item) => {
      const entity = this._hass?.states?.[item.entity];
      return [item.entity, entity?.state, entity?.last_changed, this.pending[item.entity] || ""].join("|");
    }).join(";");
  }

  escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  stateInfo(state) {
    const value = String(state || "unavailable").toLowerCase();
    if (value === "open") return { label: "Open", icon: "mdi:garage-open", tone: "open" };
    if (value === "opening") return { label: "Opening", icon: "mdi:garage-open-variant", tone: "moving" };
    if (value === "closing") return { label: "Closing", icon: "mdi:garage-alert-variant", tone: "moving" };
    if (value === "closed") return { label: "Closed", icon: "mdi:garage", tone: "closed" };
    return { label: value === "unknown" ? "Unknown" : "Unavailable", icon: "mdi:garage-alert", tone: "unavailable" };
  }

  relativeTime(dateText) {
    const timestamp = Date.parse(dateText);
    if (!Number.isFinite(timestamp)) return "";
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  async command(entityId, action) {
    const entity = this._hass?.states?.[entityId];
    if (!entity || ["unknown", "unavailable"].includes(entity.state)) return;
    if (this.config.confirm_actions) {
      this.confirming = `${entityId}|${action}`;
      this.render();
      return;
    }
    await this.execute(entityId, action);
  }

  async execute(entityId, action) {
    this.closeDialog();
    this.error = "";
    this.pending[entityId] = action === "open" ? "opening" : action === "close" ? "closing" : "";
    this.render();
    try {
      await this._hass.callService("cover", `${action}_cover`, { entity_id: entityId });
    } catch (error) {
      delete this.pending[entityId];
      this.error = error?.message || String(error) || "Home Assistant service call failed";
      this.render();
    }
  }

  closeDialog() {
    this.shadowRoot.querySelector(".confirm-dialog")?.close();
    this.confirming = "";
  }

  door(item) {
    const entity = this._hass.states[item.entity];
    const effectiveState = this.pending[item.entity] || entity?.state;
    const info = this.stateInfo(effectiveState);
    const displayName = item.name || entity?.attributes?.friendly_name || item.entity;
    const available = Boolean(entity) && !["unknown", "unavailable"].includes(entity.state);
    const state = String(effectiveState || "unavailable").toLowerCase();
    const moving = ["opening", "closing"].includes(state);
    const action = moving ? "stop" : state === "closed" ? "open" : "close";
    const actionLabel = action === "stop" ? "Stop" : action === "open" ? "Open" : "Close";
    const changed = this.config.show_last_changed && entity?.last_changed
      ? `<span class="changed">Updated ${this.escape(this.relativeTime(entity.last_changed))}</span>`
      : "";
    return `<section class="door ${info.tone}">
      <div class="door-main">
        <button class="door-icon" data-entity="${this.escape(item.entity)}" data-action="${action}" aria-label="${actionLabel} ${this.escape(displayName)}" title="${actionLabel} ${this.escape(displayName)}" ${available ? "" : "disabled"}><ha-icon icon="${info.icon}"></ha-icon></button>
        <div class="door-copy">
          <h3>${this.escape(displayName)}</h3>
          <div class="state"><span class="pulse"></span>${info.label}</div>
          ${changed}
        </div>
      </div>
    </section>`;
  }

  bindEvents() {
    for (const button of this.shadowRoot.querySelectorAll("button[data-action]")) {
      button.onpointerdown = () => {
        this.pointerActive = true;
        clearTimeout(this.pointerTimer);
        this.pointerTimer = setTimeout(() => {
          this.pointerActive = false;
          this.render();
        }, 5000);
      };
      button.onpointercancel = () => {
        this.pointerActive = false;
        clearTimeout(this.pointerTimer);
        this.render();
      };
      button.onclick = () => {
        this.pointerActive = false;
        clearTimeout(this.pointerTimer);
        this.command(button.dataset.entity, button.dataset.action);
      };
    }
    const cancel = this.shadowRoot.querySelector('[data-dialog="cancel"]');
    const confirm = this.shadowRoot.querySelector('[data-dialog="confirm"]');
    const dialog = this.shadowRoot.querySelector(".confirm-dialog");
    if (cancel) cancel.onclick = () => this.closeDialog();
    if (dialog) dialog.oncancel = (event) => {
      event.preventDefault();
      this.closeDialog();
    };
    if (confirm) confirm.onclick = () => {
      const [entityId, action] = this.confirming.split("|");
      if (entityId && action) this.execute(entityId, action);
    };
  }

  render() {
    if (!this.config || !this._hass) return;
    if (this.pointerActive || this.shadowRoot.querySelector(".confirm-dialog")?.open) return;
    this._lastHassSignature = this.hassSignature();
    const missing = this.items().filter((item) => !this._hass.states[item.entity]);
    const [confirmEntity, confirmAction] = this.confirming.split("|");
    const confirmName = this.items().find((item) => item.entity === confirmEntity)?.name
      || this._hass.states[confirmEntity]?.attributes?.friendly_name
      || confirmEntity;
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:#ecebe7;font-family:-apple-system,BlinkMacSystemFont,"Manrope",system-ui,sans-serif;-webkit-font-smoothing:antialiased}*{box-sizing:border-box}.card{position:relative;isolation:isolate;overflow:hidden;padding:20px 20px 16px;border:1px solid rgba(255,255,255,.10);border-radius:20px;background:linear-gradient(180deg,#1b1d22 0%,#181a1e 100%);box-shadow:0 18px 45px rgba(0,0,0,.28)}.card:before{content:"";position:absolute;z-index:-1;inset:auto -12% -22% -12%;height:58%;pointer-events:none;background:radial-gradient(ellipse at 50% 100%,rgba(47,148,218,.16),transparent 68%);filter:blur(10px)}header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.identity{display:flex;align-items:center;min-width:0}.hero{display:grid;place-items:center;width:40px;height:40px;margin-right:10px;flex:0 0 40px;border-radius:13px;color:#75c8ef;background:rgba(117,200,239,.08);box-shadow:inset 0 1px rgba(255,255,255,.05)}.hero ha-icon{--mdc-icon-size:21px}h2,h3{margin:0;overflow:hidden;color:#ecebe7;font-weight:700;white-space:nowrap;text-overflow:ellipsis}h2{font-size:17px}header small{display:block;margin-top:3px;color:#8a8884;font-size:10px}.doors{display:grid;gap:10px}.door{--accent:#9a9690;--glow:rgba(154,150,144,.13);position:relative;overflow:hidden;padding:14px;border:1px solid rgba(255,255,255,.06);border-radius:15px;background:linear-gradient(135deg,rgba(255,255,255,.025),rgba(255,255,255,.012))}.door.open{--accent:#f0a05f;--glow:rgba(230,112,49,.22)}.door.moving{--accent:#75c8ef;--glow:rgba(47,148,218,.22)}.door.closed{--accent:#74c69d;--glow:rgba(62,153,107,.17)}.door:after{content:"";position:absolute;right:-50px;top:-70px;width:170px;height:170px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,var(--glow),transparent 68%)}.door-main{position:relative;z-index:1;display:flex;align-items:center;min-width:0}.door-icon{appearance:none;display:grid;place-items:center;width:60px;height:60px;min-height:60px;margin-right:12px;padding:0;flex:0 0 60px;border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);border-radius:16px;color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,#232529);transition:transform .12s ease,border-color .12s ease}.door-icon ha-icon{margin:0;--mdc-icon-size:32px}.door-icon:not(:disabled):active{transform:scale(.94)}.door-copy{min-width:0}.door-copy h3{font-size:15px}.state{display:flex;align-items:center;gap:6px;margin-top:5px;color:var(--accent);font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}.pulse{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent)}.moving .pulse{animation:pulse 1.2s ease-in-out infinite}.changed{display:block;margin-top:4px;color:#5e5d59;font-size:9px}button{appearance:none;min-height:45px;padding:7px;color:#8a8884;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:#232529}button:not(:disabled){cursor:pointer;color:#c2c0bb}button:not(:disabled):hover{border-color:rgba(255,255,255,.16)}button:disabled{opacity:.24;cursor:not-allowed}.notice{margin-top:10px;padding:9px 10px;border:1px solid rgba(240,115,115,.18);border-radius:9px;color:#d7aaa8;background:rgba(240,115,115,.06);font-size:10px;line-height:1.5}.confirm-dialog{width:min(360px,calc(100vw - 32px));padding:20px;border:1px solid rgba(255,255,255,.12);border-radius:16px;color:#ecebe7;background:#1b1d22;box-shadow:0 24px 70px rgba(0,0,0,.55)}.confirm-dialog::backdrop{background:rgba(0,0,0,.66);backdrop-filter:blur(3px)}.confirm-dialog h3{font-size:17px}.confirm-dialog p{margin:9px 0 17px;color:#a6a39d;font-size:12px;line-height:1.5}.dialog-actions{display:flex;justify-content:flex-end;gap:8px}.dialog-actions button{min-width:82px;padding:10px 16px}.dialog-actions .confirm{color:#f0a05f;border-color:rgba(240,160,95,.42);background:rgba(230,112,49,.12)}@keyframes pulse{50%{opacity:.35;transform:scale(.75)}}@media(max-width:520px){.card{padding:16px}.hero{width:36px;height:36px;flex-basis:36px}.door{padding:12px}.door-icon{width:54px;height:54px;min-height:54px;flex-basis:54px}.door-icon ha-icon{--mdc-icon-size:29px}}
      .door.open{--glow:rgba(230,112,49,.40)}.door.moving{--glow:rgba(47,148,218,.38)}.door.closed{--glow:rgba(62,153,107,.34)}.door-icon{border-color:color-mix(in srgb,var(--accent) 48%,transparent);background:color-mix(in srgb,var(--accent) 22%,#232529)}.moving .pulse{animation:pulse 1.2s ease-in-out infinite}
    </style>
    <article class="card">
      <header><div class="identity"><div class="hero"><ha-icon icon="mdi:garage-variant"></ha-icon></div><div><h2>${this.escape(this.config.title)}</h2><small>${this.items().length} ${this.items().length === 1 ? "door" : "doors"} connected</small></div></div></header>
      <div class="doors">${this.items().map((item) => this.door(item)).join("")}</div>
      <dialog class="confirm-dialog"><h3>Activate garage door?</h3><p>This will activate <b>${this.escape(confirmName)}</b>.</p><div class="dialog-actions"><button data-dialog="cancel">No</button><button class="confirm" data-dialog="confirm">Yes</button></div></dialog>
      ${this.error ? `<div class="notice"><b>Control error:</b> ${this.escape(this.error)}</div>` : ""}
      ${missing.length ? `<div class="notice"><b>Check entity IDs:</b><br>${missing.map((item) => this.escape(item.entity)).join("<br>")}</div>` : ""}
    </article>`;
    this.bindEvents();
    if (this.confirming) this.shadowRoot.querySelector(".confirm-dialog")?.showModal();
  }
}

if (!customElements.get("garage-door-control-card-editor")) {
  customElements.define("garage-door-control-card-editor", GarageDoorControlCardEditor);
}

if (!customElements.get("garage-door-control-card")) {
  customElements.define("garage-door-control-card", GarageDoorControlCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "garage-door-control-card",
  name: "Garage Door Control Card",
  description: "A polished control card for one or more Home Assistant garage doors",
  preview: true,
});

console.info(`Garage Door Control Card v${VERSION}`);
