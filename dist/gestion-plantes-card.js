class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return { name: "Ma Plante", plant_image: "/local/fleurdelune.png", sensors: [] };
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    // Force la création du tableau sensors s'il n'existe pas
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
    const img = c.plant_image || "";
    const battState = (c.battery_sensor && this._hass.states[c.battery_sensor]) ? this._hass.states[c.battery_sensor].state : null;

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
        .bar-bg { background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden; }
        .bar-fill { background: linear-gradient(90deg, #4caf50, #81c784); height: 100%; border-radius: 4px; transition: width 1s ease; }
        .val { font-weight: bold; color: #fff; }
        .unit { font-size: 0.8em; color: #aaa; margin-left: 2px; }
      </style>
      <div class="card">
        <div class="header-container">
          <div class="header">${c.name || "Ma Plante"}</div>
          ${battState ? `<div class="battery"><ha-icon icon="mdi:battery"></ha-icon>${battState}%</div>` : ''}
        </div>
        ${img ? `<img class="plant-img" src="${img}">` : ''}
        <div id="sensors-list">
          ${c.sensors.map(s => {
            const stateObj = this._hass.states[s.entity];
            const val = stateObj ? stateObj.state : "--";
            const num = parseFloat(val) || 0;
            return `
              <div class="sensor-row">
                <div class="info">
                  <ha-icon icon="${s.icon || 'mdi:sprout'}"></ha-icon>
                  <span class="label-text">${s.name || "Capteur"}</span>
                  <span><span class="val">${val}</span><span class="unit">${s.unit || ""}</span></span>
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

class PlantCardEditor extends HTMLElement {
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
    if (!this._hass) return;
    
    this.innerHTML = `
      <div style="padding: 10px;">
        <ha-textfield label="Nom de la plante" id="name" .value="${this._config.name || ""}" style="width:100%; margin-bottom:15px;"></ha-textfield>
        <ha-textfield label="URL Image" id="img" .value="${this._config.plant_image || ""}" style="width:100%; margin-bottom:15px;"></ha-textfield>
        
        <label style="display:block; font-size:12px; margin-bottom:5px; color: var(--secondary-text-color);">Capteur Batterie</label>
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.battery_sensor}" .includeDomains='["sensor"]' id="batt" style="margin-bottom:20px;"></ha-entity-picker>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong>Capteurs</strong>
            <ha-button raised id="add" style="--mdc-theme-primary: #4caf50;">+ Ajouter</ha-button>
        </div>
        
        <div id="s-list">
          ${this._config.sensors.map((s, i) => `
            <div style="border: 1px solid #444; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: rgba(255,255,255,0.05);">
              <ha-textfield label="Nom (ex: Humidité)" class="n" data-i="${i}" .value="${s.name || ""}" style="width:100%; margin-bottom:10px;"></ha-textfield>
              <label style="display:block; font-size:12px; margin-bottom:5px;">Entité</label>
              <ha-entity-picker .hass="${this._hass}" .value="${s.entity || ""}" class="e" data-i="${i}" .includeDomains='["sensor"]' style="margin-bottom:10px;"></ha-entity-picker>
              <div style="display:flex; gap:10px; margin-bottom:10px;">
                <ha-textfield label="Icône (mdi:xxx)" class="ic" data-i="${i}" .value="${s.icon || 'mdi:sprout'}" style="flex:1;"></ha-textfield>
                <ha-textfield label="Unité" class="u" data-i="${i}" .value="${s.unit || '%'}" style="flex:1;"></ha-textfield>
              </div>
              <ha-button class="del" data-i="${i}" style="--mdc-theme-primary: #ff5252;">Supprimer</ha-button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this._setupEvents();
  }

  _setupEvents() {
    const fire = () => {
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    };

    this.querySelector("#name").addEventListener("input", (e) => { this._config.name = e.target.value; fire(); });
    this.querySelector("#img").addEventListener("input", (e) => { this._config.plant_image = e.target.value; fire(); });
    this.querySelector("#batt").addEventListener("value-changed", (e) => { this._config.battery_sensor = e.detail.value; fire(); });

    this.querySelectorAll(".n").forEach(el => el.addEventListener("input", (e) => {
      this._config.sensors[el.dataset.i].name = e.target.value;
      fire();
    }));

    this.querySelectorAll(".e").forEach(el => el.addEventListener("value-changed", (e) => {
      this._config.sensors[el.dataset.i].entity = e.detail.value;
      fire();
    }));

    this.querySelectorAll(".ic").forEach(el => el.addEventListener("input", (e) => {
      this._config.sensors[el.dataset.i].icon = e.target.value;
      fire();
    }));

    this.querySelectorAll(".u").forEach(el => el.addEventListener("input", (e) => {
      this._config.sensors[el.dataset.i].unit = e.target.value;
      fire();
    }));

    this.querySelector("#add").onclick = () => {
      this._config.sensors.push({name: "Nouveau", entity: "", icon: "mdi:sprout", unit: "%"});
      fire();
      this._render();
    };

    this.querySelectorAll(".del").forEach(el => el.onclick = (e) => {
      this._config.sensors.splice(e.target.dataset.i, 1);
      fire();
      this._render();
    });
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
