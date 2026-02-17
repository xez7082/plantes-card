class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return { name: "Plante", plant_image: "/local/fleurdelune.png", sensors: [] };
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = [];
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const img = c.plant_image || "/local/fleurdelune.png";
    const battState = c.battery_sensor ? this._hass.states[c.battery_sensor] : null;

    this.shadowRoot.innerHTML = `
      <style>
        .card { background: var(--ha-card-background, #1c1c1c); border-radius: 15px; padding: 20px; color: white; border: 1px solid #333; }
        .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .header { font-size: 1.4em; font-weight: bold; color: #4caf50; }
        .battery { display: flex; align-items: center; gap: 4px; color: #888; font-size: 0.9em; }
        .plant-img { display: block; width: 120px; height: 120px; object-fit: cover; margin: 0 auto 20px; border-radius: 50%; border: 3px solid #4caf50; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        .sensor-row { margin-bottom: 15px; }
        .info { display: flex; align-items: center; font-size: 14px; margin-bottom: 6px; }
        .info ha-icon { margin-right: 10px; --mdc-icon-size: 20px; color: #4caf50; }
        .label-text { flex-grow: 1; opacity: 0.9; }
        .bar-bg { background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; }
        .bar-fill { background: linear-gradient(90deg, #4caf50, #81c784); height: 100%; border-radius: 4px; transition: width 1s ease; }
        .val { font-weight: bold; color: #fff; }
        .unit { font-size: 0.8em; color: #aaa; margin-left: 2px; }
      </style>
      <div class="card">
        <div class="header-container">
          <div class="header">${c.name}</div>
          ${battState ? `<div class="battery"><ha-icon icon="mdi:battery"></ha-icon>${battState.state}%</div>` : ''}
        </div>
        <img class="plant-img" src="${img}">
        <div id="sensors">
          ${c.sensors.map(s => {
            const stateObj = this._hass.states[s.entity];
            const val = stateObj ? stateObj.state : "--";
            const num = parseFloat(val) || 0;
            return `
              <div class="sensor-row">
                <div class="info">
                  <ha-icon icon="${s.icon || 'mdi:sprout'}"></ha-icon>
                  <span class="label-text">${s.name}</span>
                  <span><span class="val">${val}</span><span class="unit">${s.unit}</span></span>
                </div>
                <div class="bar-bg"><div class="bar-fill" style="width: ${Math.min(num, 100)}%"></div></div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

// ==========================================
// ÉDITEUR ROBUSTE (SANS COMPOSANTS FRAGILES)
// ==========================================
class PlantCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    this._render();
  }

  set hass(hass) { this._hass = hass; }

  _render() {
    this.innerHTML = `
      <style>
        .ed-container { padding: 10px; font-family: sans-serif; }
        .field { margin-bottom: 15px; }
        label { display: block; font-size: 12px; margin-bottom: 5px; color: var(--secondary-text-color); }
        input { width: 100%; padding: 10px; box-sizing: border-box; border-radius: 4px; border: 1px solid #444; background: var(--card-background-color); color: var(--primary-text-color); }
        .sensor-block { border: 1px solid #444; padding: 15px; border-radius: 8px; margin-bottom: 15px; background: rgba(0,0,0,0.2); }
        .btn { padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .btn-add { background: #4caf50; color: white; width: 100%; }
        .btn-del { background: #f44336; color: white; margin-top: 10px; }
        .grid { display: flex; gap: 10px; margin-top: 10px; }
      </style>
      <div class="ed-container">
        <div class="field">
          <label>Nom de la plante</label>
          <input id="name" value="${this._config.name || ""}">
        </div>
        <div class="field">
          <label>Image URL</label>
          <input id="img" value="${this._config.plant_image || ""}">
        </div>
        <div class="field">
          <label>Entité Batterie (ex: sensor.plant_batt)</label>
          <input id="batt" value="${this._config.battery_sensor || ""}">
        </div>

        <hr>
        <p><b>Capteurs</b></p>
        <div id="s-list">
          ${(this._config.sensors || []).map((s, i) => `
            <div class="sensor-block">
              <label>Nom du capteur</label>
              <input class="n" data-i="${i}" value="${s.name}">
              <label style="margin-top:10px">Entité (Copier/Coller l'ID)</label>
              <input class="e" data-i="${i}" value="${s.entity}">
              <div class="grid">
                <div style="flex:1"><label>Icône</label><input class="ic" data-i="${i}" value="${s.icon || ""}"></div>
                <div style="flex:1"><label>Unité</label><input class="u" data-i="${i}" value="${s.unit || ""}"></div>
              </div>
              <button class="btn btn-del" data-i="${i}">Supprimer</button>
            </div>
          `).join('')}
        </div>
        <button id="add" class="btn btn-add">+ Ajouter un capteur</button>
      </div>
    `;

    this._attach();
  }

  _attach() {
    const save = () => {
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    };

    this.querySelector("#name").onchange = (e) => { this._config.name = e.target.value; save(); };
    this.querySelector("#img").onchange = (e) => { this._config.plant_image = e.target.value; save(); };
    this.querySelector("#batt").onchange = (e) => { this._config.battery_sensor = e.target.value; save(); };

    this.querySelectorAll(".n").forEach(el => el.onchange = (e) => { this._config.sensors[e.target.dataset.i].name = e.target.value; save(); });
    this.querySelectorAll(".e").forEach(el => el.onchange = (e) => { this._config.sensors[e.target.dataset.i].entity = e.target.value; save(); });
    this.querySelectorAll(".ic").forEach(el => el.onchange = (e) => { this._config.sensors[e.target.dataset.i].icon = e.target.value; save(); });
    this.querySelectorAll(".u").forEach(el => el.onchange = (e) => { this._config.sensors[e.target.dataset.i].unit = e.target.value; save(); });

    this.querySelector("#add").onclick = () => {
      if (!this._config.sensors) this._config.sensors = [];
      this._config.sensors.push({name: "Nouveau", entity: "", icon: "mdi:water", unit: "%"});
      save();
      this._render();
    };

    this.querySelectorAll(".btn-del").forEach(el => el.onclick = (e) => {
      this._config.sensors.splice(e.target.dataset.i, 1);
      save();
      this._render();
    });
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
