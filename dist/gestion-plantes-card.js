class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return {
      name: "Ma Nouvelle Plante",
      plant_image: "/local/fleurdelune.png",
      custom_sensors: [
        { name: "Humidité", entity: "sensor.votre_capteur_moisture", unit: "%" }
      ]
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
        .card { background: rgba(20,20,20,0.8); border-radius: 20px; padding: 20px; color: white; font-family: sans-serif; border: 1px solid #444; }
        .header { text-align: center; font-size: 22px; margin-bottom: 15px; letter-spacing: 1px; }
        .plant-img { display: block; width: 150px; margin: 0 auto 20px; border-radius: 15px; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.5)); }
        .sensor-row { margin-bottom: 15px; }
        .label { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
        .bar-bg { background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden; }
        .bar-fill { background: linear-gradient(90deg, #4caf50, #81c784); height: 100%; transition: width 1s ease-out; }
        .unit { color: #888; font-size: 12px; margin-left: 3px; }
        .val { font-weight: bold; color: #5ce1e6; }
      </style>
      <div class="card">
        <div class="header">${c.name || "Plante"}</div>
        <img class="plant-img" src="${img}" onerror="this.style.display='none'">
        
        <div id="sensors">
          ${(c.custom_sensors || []).map(s => this._drawRow(s.name, getS(s.entity), s.unit)).join('')}
        </div>
      </div>
    `;
  }

  _drawRow(label, val, unit) {
    if (val === "--" || val === "unknown") return "";
    const num = parseFloat(val) || 0;
    // On calcule un % arbitraire pour la barre (ici basé sur 100)
    const pct = Math.min(Math.max(num, 0), 100); 
    return `
      <div class="sensor-row">
        <div class="label"><span>${label}</span><span><span class="val">${val}</span><span class="unit">${unit}</span></span></div>
        <div class="bar-bg"><div class="bar-fill" style="width: ${pct}%"></div></div>
      </div>
    `;
  }
}

// ==========================================
// ÉDITEUR FLEXIBLE (SANS CAPTEURS FIGÉS)
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
      <style>
        .ed-card { padding: 12px; color: var(--primary-text-color); line-height: 1.6; }
        .ed-row { margin-bottom: 15px; padding: 10px; background: var(--secondary-background-color); border-radius: 8px; }
        label { display: block; font-weight: bold; font-size: 12px; text-transform: uppercase; color: var(--secondary-text-color); }
        input { width: 100%; padding: 8px; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc; background: var(--card-background-color); color: var(--primary-text-color); }
        .c-item { border: 1px solid #444; padding: 10px; margin-top: 10px; position: relative; border-radius: 6px; }
        .btn-add { background: #4caf50; color: white; border: none; padding: 10px; width: 100%; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .btn-del { background: #f44336; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-top: 8px; font-size: 10px; }
        .flex { display: flex; gap: 5px; margin-top: 5px; }
      </style>
      <div class="ed-card">
        <div class="ed-row">
          <label>Nom de la plante</label>
          <input id="name" value="${this._config.name || ""}">
          <label style="margin-top:10px">URL Image</label>
          <input id="img" value="${this._config.plant_image || ""}">
        </div>

        <p><b>Liste de vos capteurs :</b></p>
        <div id="custom-list">
          ${this._config.custom_sensors.map((s, i) => `
            <div class="c-item">
              <label>Titre (ex: Humidité)</label>
              <input class="c-n" data-idx="${i}" value="${s.name}">
              <div class="flex">
                <div style="flex:2">
                  <label>Entité (sensor.xxx)</label>
                  <input class="c-e" data-idx="${i}" value="${s.entity}">
                </div>
                <div style="flex:1">
                  <label>Unité</label>
                  <input class="c-u" data-idx="${i}" value="${s.unit}">
                </div>
              </div>
              <button class="btn-del" data-idx="${i}">Supprimer ce capteur</button>
            </div>
          `).join('')}
        </div>
        
        <button id="add" class="btn-add" style="margin-top:15px">+ Ajouter un capteur</button>
      </div>
    `;

    this._attach();
  }

  _attach() {
    this.querySelector("#name").onchange = (e) => this._save("name", e.target.value);
    this.querySelector("#img").onchange = (e) => this._save("plant_image", e.target.value);

    this.querySelectorAll(".c-n").forEach(el => el.onchange = (e) => {
      this._config.custom_sensors[e.target.dataset.idx].name = e.target.value;
      this._save("custom_sensors", this._config.custom_sensors);
    });
    this.querySelectorAll(".c-e").forEach(el => el.onchange = (e) => {
      this._config.custom_sensors[e.target.dataset.idx].entity = e.target.value;
      this._save("custom_sensors", this._config.custom_sensors);
    });
    this.querySelectorAll(".c-u").forEach(el => el.onchange = (e) => {
      this._config.custom_sensors[e.target.dataset.idx].unit = e.target.value;
      this._save("custom_sensors", this._config.custom_sensors);
    });

    this.querySelector("#add").onclick = () => {
      this._config.custom_sensors.push({name: "Nouveau", entity: "sensor.", unit: ""});
      this._save("custom_sensors", this._config.custom_sensors);
    };

    this.querySelectorAll(".btn-del").forEach(btn => btn.onclick = (e) => {
      this._config.custom_sensors.splice(e.target.dataset.idx, 1);
      this._save("custom_sensors", this._config.custom_sensors);
    });
  }

  _save(key, val) {
    this._config[key] = val;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    this._render();
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
