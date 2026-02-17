class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return {
      name: "Fleur de Lune",
      plant_image: "/local/community/plantes-card/fleurdelune.png",
      custom_sensors: []
    };
  }

  setConfig(config) { 
    this._config = { ...config };
    this._config.custom_sensors = config.custom_sensors || [];
    this._render(); 
  }
  
  set hass(hass) { this._hass = hass; this._render(); }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const getS = (eid) => this._hass.states[eid]?.state || "--";
    const imgPlante = c.plant_image || "/local/community/plantes-card/fleurdelune.png";
    const battery = c.battery_sensor ? getS(c.battery_sensor) : null;

    this.shadowRoot.innerHTML = `
      <style>
        .bg{position:relative;border-radius:24px;overflow:hidden;color:white;font-family:sans-serif;background:#222}
        .bg-img{width:100%;height:100%;object-fit:cover;filter:blur(8px) brightness(.5);position:absolute;inset:0}
        .card{position:relative;padding:20px;backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,0.3);border-radius:24px}
        .header{display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:15px}
        h1{margin:0;font-size:22px;text-align:center}
        .batt{font-size:12px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px}
        .plant-img{display:block;margin:0 auto 15px;max-height:160px;filter:drop-shadow(0 8px 8px rgba(0,0,0,0.5))}
        .row{margin:12px 0}
        .lbl{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}
        .val{color:#5ce1e6;font-weight:bold}
        .bar{height:6px;background:rgba(255,255,255,0.2);border-radius:10px;overflow:hidden}
        .fill{height:100%;background:linear-gradient(90deg,#4fd1c5,#63b3ed);transition:width .5s}
      </style>
      <div class="bg">
        ${c.image ? `<img class="bg-img" src="${c.image}">` : ""}
        <div class="card">
          <div class="header">
            <h1>${c.name || "Ma Plante"}</h1>
            ${battery ? `<span class="batt">🔋 ${battery}%</span>` : ""}
          </div>
          <img class="plant-img" src="${imgPlante}">
          ${this._row("💧 Humidité", getS(c.moisture_sensor), "%", 100)}
          ${this._row("🌡️ Température", getS(c.temperature_sensor), "°C", 40)}
          ${this._row("☀️ Lumière", getS(c.light_sensor), " lx", 10000)}
          ${c.custom_sensors.map(s => this._row(s.name, getS(s.entity), s.unit, 100)).join('')}
        </div>
      </div>`;
  }

  _row(label, val, unit, max) {
    if (!val || val === "--") return "";
    const v = parseFloat(val);
    const w = isNaN(v) ? 0 : Math.min(Math.max((v / max) * 100, 0), 100);
    return `<div class="row">
      <div class="lbl"><span>${label}</span><span class="val">${val}${unit}</span></div>
      <div class="bar"><div class="fill" style="width:${w}%"></div></div>
    </div>`;
  }
}

// ============================================================
// ÉDITEUR AVEC SÉLECTEUR NATIF (ha-entity-picker)
// ============================================================
class PlantCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (!this._config.custom_sensors) this._config.custom_sensors = [];
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // On transmet le hass aux sélecteurs d'entités
    this.querySelectorAll("ha-entity-picker").forEach(p => { p.hass = hass; });
  }

  _render() {
    this.innerHTML = `
      <style>
        .editor{padding:10px; font-family: sans-serif; color: var(--primary-text-color)}
        .sect{background: var(--secondary-background-color); padding:12px; margin-bottom:10px; border-radius:8px; border: 1px solid var(--divider-color)}
        label{display:block; font-weight:bold; font-size:12px; margin: 10px 0 5px}
        input, ha-entity-picker{display:block; width:100%; margin-bottom:8px}
        input{padding:10px; box-sizing:border-box; background: var(--card-background-color); color: var(--primary-text-color); border:1px solid var(--divider-color); border-radius:6px}
        button{cursor:pointer; padding:10px; width:100%; margin-top:10px; border-radius:6px; border:none; background:var(--primary-color); color:white; font-weight:bold}
        .btn-add{background: #4caf50; margin-top:20px}
        .btn-del{background: #f44336; font-size:11px; padding:5px; margin-top:10px}
        .cust-row{border-left: 3px solid #4caf50; padding-left:10px; margin-bottom:15px; padding-top:5px}
      </style>
      <div class="editor">
        <div class="sect">
          <label>Nom de la plante</label>
          <input data-key="name" value="${this._config.name || ""}">
          <label>Image de la plante (URL)</label>
          <input data-key="plant_image" value="${this._config.plant_image || ""}">
          <label>Batterie</label>
          <ha-entity-picker data-key="battery_sensor" .value="${this._config.battery_sensor}" .hass="${this._hass}" allow-custom-entity></ha-entity-picker>
        </div>

        <div class="sect">
          <label>Capteurs Standards</label>
          <ha-entity-picker label="Humidité" data-key="moisture_sensor" .value="${this._config.moisture_sensor}" .hass="${this._hass}"></ha-entity-picker>
          <ha-entity-picker label="Température" data-key="temperature_sensor" .value="${this._config.temperature_sensor}" .hass="${this._hass}"></ha-entity-picker>
          <ha-entity-picker label="Lumière" data-key="light_sensor" .value="${this._config.light_sensor}" .hass="${this._hass}"></ha-entity-picker>
        </div>

        <div class="sect">
          <label>Capteurs Supplémentaires</label>
          <div id="custom-container">
            ${this._config.custom_sensors.map((s, i) => `
              <div class="cust-row">
                <input class="cust-input" data-idx="${i}" data-field="name" placeholder="Nom (ex: PH)" value="${s.name || ""}">
                <ha-entity-picker class="cust-picker" data-idx="${i}" .value="${s.entity}" .hass="${this._hass}"></ha-entity-picker>
                <input class="cust-input" data-idx="${i}" data-field="unit" placeholder="Unité (ex: %)" value="${s.unit || ""}">
                <button class="btn-del" data-idx="${i}">Supprimer</button>
              </div>
            `).join('')}
          </div>
          <button class="btn-add" id="add-btn">+ Ajouter un capteur</button>
        </div>
      </div>`;

    this._setupListeners();
  }

  _setupListeners() {
    // Inputs texte classiques
    this.querySelectorAll("input[data-key]").forEach(input => {
      input.addEventListener("change", (e) => {
        this._fire({ [e.target.dataset.key]: e.target.value });
      });
    });

    // Pickers classiques
    this.querySelectorAll("ha-entity-picker[data-key]").forEach(picker => {
      picker.addEventListener("value-changed", (e) => {
        this._fire({ [e.target.dataset.key]: e.detail.value });
      });
    });

    // Inputs et Pickers personnalisés
    this.querySelectorAll(".cust-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const idx = e.target.dataset.idx;
        const field = e.target.dataset.field;
        const custom_sensors = [...this._config.custom_sensors];
        custom_sensors[idx][field] = e.target.value;
        this._fire({ custom_sensors });
      });
    });

    this.querySelectorAll(".cust-picker").forEach(picker => {
      picker.addEventListener("value-changed", (e) => {
        const idx = e.target.dataset.idx;
        const custom_sensors = [...this._config.custom_sensors];
        custom_sensors[idx].entity = e.detail.value;
        this._fire({ custom_sensors });
      });
    });

    // Boutons
    this.querySelector("#add-btn").addEventListener("click", () => {
      const custom_sensors = [...this._config.custom_sensors, { name: "", entity: "", unit: "" }];
      this._fire({ custom_sensors });
    });

    this.querySelectorAll(".btn-del").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.dataset.idx;
        const custom_sensors = [...this._config.custom_sensors];
        custom_sensors.splice(idx, 1);
        this._fire({ custom_sensors });
      });
    });
  }

  _fire(change) {
    this._config = { ...this._config, ...change };
    this.dispatchEvent(new CustomEvent("config-changed", { 
      detail: { config: this._config }, 
      bubbles: true, 
      composed: true 
    }));
    this._render();
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
