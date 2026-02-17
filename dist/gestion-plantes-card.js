class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return {
      name: "Ma Plante",
      plant_image: "/local/fleurdelune.png",
      sensors: []
    };
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

    this.shadowRoot.innerHTML = `
      <style>
        .card { background: #1c1c1c; border-radius: 15px; padding: 15px; color: white; font-family: Segoe UI, Roboto; border: 1px solid #333; }
        .header { text-align: center; font-size: 1.2em; margin-bottom: 15px; font-weight: 500; color: #4caf50; }
        .plant-img { display: block; width: 100px; height: 100px; object-fit: cover; margin: 0 auto 15px; border-radius: 50%; border: 2px solid #4caf50; }
        .sensor-row { margin-bottom: 12px; }
        .info { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
        .bar-bg { background: #333; height: 6px; border-radius: 3px; }
        .bar-fill { background: #4caf50; height: 100%; border-radius: 3px; transition: width 0.6s ease; }
        .val { font-weight: bold; }
      </style>
      <div class="card">
        <div class="header">${c.name}</div>
        <img class="plant-img" src="${img}">
        ${c.sensors.map(s => {
          const stateObj = this._hass.states[s.entity];
          const val = stateObj ? stateObj.state : "--";
          const num = parseFloat(val) || 0;
          return `
            <div class="sensor-row">
              <div class="info"><span>${s.name}</span><span><span class="val">${val}</span> ${s.unit}</span></div>
              <div class="bar-bg"><div class="bar-fill" style="width: ${Math.min(num, 100)}%"></div></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

// ==========================================
// ÉDITEUR MANUEL SANS PICKER (ANTI-BUG)
// ==========================================
class PlantCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = [];
    this._render();
  }

  _render() {
    this.innerHTML = `
      <div style="padding: 10px;">
        <div style="margin-bottom: 15px;">
          <label style="display:block; font-size: 12px; color: grey;">Nom de la plante</label>
          <input id="name" style="width:100%; padding: 8px;" value="${this._config.name || ""}">
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display:block; font-size: 12px; color: grey;">Chemin de l'image</label>
          <input id="img" style="width:100%; padding: 8px;" value="${this._config.plant_image || ""}">
        </div>

        <div id="list">
          ${this._config.sensors.map((s, i) => `
            <div style="background: #f0f0f0; padding: 10px; margin-bottom: 10px; border-radius: 5px; color: black;">
              <input class="n" data-i="${i}" placeholder="Titre (ex: Humidité)" value="${s.name}" style="width:90%; margin-bottom:5px;">
              <input class="e" data-i="${i}" placeholder="sensor.votre_entite" value="${s.entity}" style="width:90%; margin-bottom:5px;">
              <input class="u" data-i="${i}" placeholder="Unité (ex: %)" value="${s.unit}" style="width:40%;">
              <button class="del" data-i="${i}" style="background:red; color:white; border:none; padding:5px;">X</button>
            </div>
          `).join('')}
        </div>
        
        <button id="add" style="width:100%; padding: 10px; background: #4caf50; color: white; border: none; cursor: pointer;">
          + AJOUTER UN CAPTEUR
        </button>
      </div>
    `;

    this._setupEvents();
  }

  _setupEvents() {
    this.querySelector("#name").onchange = (e) => this._upd("name", e.target.value);
    this.querySelector("#img").onchange = (e) => this._upd("plant_image", e.target.value);
    
    this.querySelectorAll(".n").forEach(el => el.onchange = (e) => {
      this._config.sensors[e.target.dataset.i].name = e.target.value;
      this._upd("sensors", this._config.sensors);
    });
    this.querySelectorAll(".e").forEach(el => el.onchange = (e) => {
      this._config.sensors[e.target.dataset.i].entity = e.target.value;
      this._upd("sensors", this._config.sensors);
    });
    this.querySelectorAll(".u").forEach(el => el.onchange = (e) => {
      this._config.sensors[e.target.dataset.i].unit = e.target.value;
      this._upd("sensors", this._config.sensors);
    });

    this.querySelector("#add").onclick = () => {
      this._config.sensors.push({name: "", entity: "", unit: ""});
      this._upd("sensors", this._config.sensors);
    };

    this.querySelectorAll(".del").forEach(el => el.onclick = (e) => {
      this._config.sensors.splice(e.target.dataset.i, 1);
      this._upd("sensors", this._config.sensors);
    });
  }

  _upd(key, val) {
    this._config[key] = val;
    const event = new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true });
    this.dispatchEvent(event);
    this._render();
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
