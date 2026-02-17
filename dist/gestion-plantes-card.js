class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return {
      name: "Fleur de Lune",
      plant_image: "/local/fleurdelune.png",
      custom_sensors: []
    };
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.custom_sensors) this._config.custom_sensors = [];
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const getS = (eid) => this._hass.states[eid]?.state || "--";
    const img = c.plant_image || "/local/fleurdelune.png";

    this.shadowRoot.innerHTML = `
      <style>
        .card { background: #222; border-radius: 16px; padding: 16px; color: white; font-family: sans-serif; }
        .header { text-align: center; font-size: 20px; margin-bottom: 10px; font-weight: bold; }
        .plant-img { display: block; width: 120px; margin: 0 auto 15px; border-radius: 10px; }
        .sensor-row { margin-bottom: 10px; }
        .label { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 3px; }
        .bar-bg { background: #444; height: 8px; border-radius: 4px; overflow: hidden; }
        .bar-fill { background: #4caf50; height: 100%; transition: width 0.5s; }
        .unit { color: #aaa; margin-left: 4px; }
      </style>
      <div class="card">
        <div class="header">${c.name || "Ma Plante"}</div>
        <img class="plant-img" src="${img}">
        
        ${this._drawRow("💧 Humidité", getS(c.moisture_sensor), "%")}
        ${this._drawRow("🌡️ Température", getS(c.temperature_sensor), "°C")}
        ${this._drawRow("☀️ Lumière", getS(c.light_sensor), "lx")}
        
        ${(c.custom_sensors || []).map(s => this._drawRow(s.name, getS(s.entity), s.unit)).join('')}
      </div>
    `;
  }

  _drawRow(label, val, unit) {
    if (val === "--" || val === "unknown") return "";
    const num = parseFloat(val) || 0;
    const pct = Math.min(Math.max(num, 0), 100); // Simple % pour la barre
    return `
      <div class="sensor-row">
        <div class="label"><span>${label}</span><span>${val}<span class="unit">${unit}</span></span></div>
        <div class="bar-bg"><div class="bar-fill" style="width: ${pct}%"></div></div>
      </div>
    `;
  }
}

// ==========================================
// EDITEUR SANS COMPOSANTS ÉTRANGERS
// ==========================================
class PlantCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.custom_sensors) this._config.custom_sensors = [];
    this._render();
  }

  set hass(hass) { this._hass = hass; }

  _render() {
    this.innerHTML = `
      <div style="padding: 10px; color: var(--primary-text-color);">
        <label>Nom</label>
        <input style="width:100%; margin-bottom:10px" id="name" value="${this._config.name || ""}">
        
        <label>Image (Chemin)</label>
        <input style="width:100%; margin-bottom:10px" id="img" value="${this._config.plant_image || ""}">

        <hr>
        <p><b>Capteurs (écrire l'id sensor.votre_capteur) :</b></p>
        <input id="moist" placeholder="sensor.humidite" style="width:100%; margin-bottom:5px" value="${this._config.moisture_sensor || ""}">
        <input id="temp" placeholder="sensor.temperature" style="width:100%; margin-bottom:5px" value="${this._config.temperature_sensor || ""}">
        
        <div id="custom-container">
          ${this._config.custom_sensors.map((s, i) => `
            <div style="border: 1px solid #555; padding: 5px; margin-top: 5px;">
              <input class="c-n" data-idx="${i}" placeholder="Nom" value="${s.name}" style="width:30%">
              <input class="c-e" data-idx="${i}" placeholder="Entité" value="${s.entity}" style="width:40%">
              <input class="c-u" data-idx="${i}" placeholder="Unité" value="${s.unit}" style="width:20%">
            </div>
          `).join('')}
        </div>
        <button id="add" style="margin-top:10px; width:100%; padding:10px; background: #4caf50; color: white; border: none; border-radius: 5px;">
          + Ajouter un capteur
        </button>
      </div>
    `;

    // Attacher les événements manuellement pour éviter les erreurs SSL/ShadowDOM
    this.querySelector("#name").onchange = (e) => this._upd("name", e.target.value);
    this.querySelector("#img").onchange = (e) => this._upd("plant_image", e.target.value);
    this.querySelector("#moist").onchange = (e) => this._upd("moisture_sensor", e.target.value);
    this.querySelector("#temp").onchange = (e) => this._upd("temperature_sensor", e.target.value);

    this.querySelectorAll(".c-n").forEach(el => el.onchange = (e) => {
      this._config.custom_sensors[e.target.dataset.idx].name = e.target.value;
      this._upd("custom_sensors", this._config.custom_sensors);
    });
    this.querySelectorAll(".c-e").forEach(el => el.onchange = (e) => {
      this._config.custom_sensors[e.target.dataset.idx].entity = e.target.value;
      this._upd("custom_sensors", this._config.custom_sensors);
    });
    this.querySelectorAll(".c-u").forEach(el => el.onchange = (e) => {
      this._config.custom_sensors[e.target.dataset.idx].unit = e.target.value;
      this._upd("custom_sensors", this._config.custom_sensors);
    });

    this.querySelector("#add").onclick = () => {
      this._config.custom_sensors.push({name: "", entity: "", unit: ""});
      this._upd("custom_sensors", this._config.custom_sensors);
    };
  }

  _upd(key, val) {
    this._config[key] = val;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    this._render();
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
