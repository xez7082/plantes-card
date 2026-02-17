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

  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const getS = (eid) => this._hass.states[eid]?.state || "--";

    // Image par défaut si vide
    const imgPlante = c.plant_image || "/local/community/plantes-card/fleurdelune.png";
    const battery = c.battery_sensor ? getS(c.battery_sensor) : null;

    const bar = (val, max = 100) => {
      const v = parseFloat(val);
      const w = isNaN(v) ? 0 : Math.min(Math.max((v / max) * 100, 0), 100);
      return `<div class="bar"><div class="fill" style="width:${w}%"></div></div>`;
    };

    this.shadowRoot.innerHTML = `
      <style>
        .bg{position:relative;border-radius:24px;overflow:hidden;color:white;font-family:sans-serif;background:#222}
        .bg-img{width:100%;height:100%;object-fit:cover;filter:blur(8px) brightness(.5);position:absolute;inset:0}
        .card{position:relative;padding:20px;backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,0.2);border-radius:24px}
        .header{display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:15px}
        h1{margin:0;font-size:22px}
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

          ${(c.custom_sensors || []).map(s => this._row(s.name, getS(s.entity), s.unit, 100)).join('')}
        </div>
      </div>`;
  }

  _row(label, val, unit, max) {
    if (val === "--") return "";
    const v = parseFloat(val);
    const w = isNaN(v) ? 0 : Math.min(Math.max((v / max) * 100, 0), 100);
    return `<div class="row">
      <div class="lbl"><span>${label}</span><span class="val">${val}${unit}</span></div>
      <div class="bar"><div class="fill" style="width:${w}%"></div></div>
    </div>`;
  }
}

// ============================================================
// ÉDITEUR AVEC AJOUT DE CAPTEURS DYNAMIQUES
// ============================================================
class PlantCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { custom_sensors: [], ...config };
    this._render();
  }

  set hass(hass) { this._hass = hass; }

  _render() {
    this.innerHTML = `
      <style>
        .editor{padding:10px; font-family: sans-serif; color: var(--primary-text-color)}
        .sect{border:1px solid #444; padding:10px; margin-bottom:10px; border-radius:8px}
        label{display:block; font-weight:bold; font-size:12px; margin: 10px 0 5px}
        input{width:100%; padding:8px; box-sizing:border-box; background: #222; color: white; border:1px solid #444; border-radius:4px}
        button{cursor:pointer; padding:8px; width:100%; margin-top:10px; border-radius:4px; border:none; background:#4caf50; color:white}
        .del{background:#f44336; margin-top:5px; padding:4px}
      </style>
      <div class="editor">
        <div class="sect">
          <label>Nom de la plante</label>
          <input data-key="name" value="${this._config.name || ""}">
          <label>Image de la plante (URL)</label>
          <input data-key="plant_image" value="${this._config.plant_image || ""}">
          <label>Capteur Batterie (Entité)</label>
          <input data-key="battery_sensor" value="${this._config.battery_sensor || ""}">
        </div>

        <div class="sect">
          <label>Capteurs de base (Entités)</label>
          <input data-key="moisture_sensor" placeholder="sensor.humidité" value="${this._config.moisture_sensor || ""}">
          <input data-key="temperature_sensor" placeholder="sensor.température" value="${this._config.temperature_sensor || ""}" style="margin-top:5px">
        </div>

        <div id="custom-zone">
          <label>Capteurs Personnalisés</label>
          ${this._config.custom_sensors.map((s, i) => `
            <div class="sect">
              <input placeholder="Nom (ex: PH)" oninput="this.getRootNode().host._updCust(${i}, 'name', this.value)" value="${s.name}">
              <input placeholder="Entité" oninput="this.getRootNode().host._updCust(${i}, 'entity', this.value)" value="${s.entity}" style="margin:5px 0">
              <input placeholder="Unité" oninput="this.getRootNode().host._updCust(${i}, 'unit', this.value)" value="${s.unit}">
              <button class="del" onclick="this.getRootNode().host._delCust(${i})">Supprimer</button>
            </div>
          `).join('')}
          <button onclick="this.getRootNode().host._addCust()">+ Ajouter un capteur</button>
        </div>
      </div>`;

    this.querySelectorAll("input[data-key]").forEach(i => {
      i.onchange = (e) => this._fire({ [e.target.dataset.key]: e.target.value });
    });
  }

  _addCust() {
    const custom_sensors = [...this._config.custom_sensors, { name: "", entity: "", unit: "" }];
    this._fire({ custom_sensors });
  }

  _delCust(i) {
    const custom_sensors = [...this._config.custom_sensors];
    custom_sensors.splice(i, 1);
    this._fire({ custom_sensors });
  }

  _updCust(i, key, val) {
    const custom_sensors = [...this._config.custom_sensors];
    custom_sensors[i][key] = val;
    this._fire({ custom_sensors });
  }

  _fire(change) {
    this._config = { ...this._config, ...change };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    this._render();
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
