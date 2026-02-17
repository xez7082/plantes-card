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
    this._config = config;
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
    
    // Gestion de la batterie
    const battState = c.battery_sensor ? this._hass.states[c.battery_sensor] : null;
    const battVal = battState ? battState.state : null;

    this.shadowRoot.innerHTML = `
      <style>
        .card { background: var(--ha-card-background, #1c1c1c); border-radius: 15px; padding: 15px; color: white; border: 1px solid #333; position: relative; }
        .header-container { display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 15px; }
        .header { font-size: 1.2em; font-weight: 500; color: #4caf50; }
        .battery { display: flex; align-items: center; font-size: 0.8em; color: #888; }
        .plant-img { display: block; width: 100px; height: 100px; object-fit: cover; margin: 0 auto 15px; border-radius: 50%; border: 2px solid #4caf50; }
        .sensor-row { margin-bottom: 12px; }
        .info { display: flex; align-items: center; font-size: 13px; margin-bottom: 4px; }
        .info ha-icon { margin-right: 8px; --mdc-icon-size: 18px; color: #4caf50; }
        .label-text { flex-grow: 1; }
        .bar-bg { background: #333; height: 6px; border-radius: 3px; }
        .bar-fill { background: #4caf50; height: 100%; border-radius: 3px; transition: width 0.6s ease; }
        .val { font-weight: bold; margin-left: 5px; }
      </style>
      <div class="card">
        <div class="header-container">
          <div class="header">${c.name}</div>
          ${battVal ? `<div class="battery"><ha-icon icon="mdi:battery"></ha-icon>${battVal}%</div>` : ''}
        </div>
        <img class="plant-img" src="${img}">
        ${(c.sensors || []).map(s => {
          const stateObj = this._hass.states[s.entity];
          const val = stateObj ? stateObj.state : "--";
          const icon = s.icon || "mdi:sprout";
          const num = parseFloat(val) || 0;
          return `
            <div class="sensor-row">
              <div class="info">
                <ha-icon icon="${icon}"></ha-icon>
                <span class="label-text">${s.name}</span>
                <span><span class="val">${val}</span> ${s.unit}</span>
              </div>
              <div class="bar-bg"><div class="bar-fill" style="width: ${Math.min(num, 100)}%"></div></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

// ==========================================
// ÉDITEUR AVEC RECHERCHE AUTOMATIQUE
// ==========================================
class PlantCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass) return;
    this.innerHTML = `
      <div style="padding: 10px; display: flex; flex-direction: column; gap: 15px;">
        <paper-input label="Nom de la plante" id="name" value="${this._config.name || ""}"></paper-input>
        <paper-input label="URL de l'image" id="img" value="${this._config.plant_image || ""}"></paper-input>
        
        <div>
          <label>Capteur Batterie</label>
          <ha-entity-picker .hass="${this._hass}" .value="${this._config.battery_sensor}" id="batt" .includeDomains='["sensor"]' allow-custom-entity></ha-entity-picker>
        </div>

        <hr style="width:100%; border: 0.5px solid #555;">
        <strong>Capteurs personnalisés</strong>
        <div id="list">
          ${(this._config.sensors || []).map((s, i) => `
            <div style="border: 1px solid #555; padding: 10px; border-radius: 8px; margin-bottom: 10px; background: rgba(255,255,255,0.05);">
              <paper-input label="Nom (ex: Humidité)" class="n" data-i="${i}" value="${s.name}"></paper-input>
              <ha-entity-picker .hass="${this._hass}" .value="${s.entity}" class="e" data-i="${i}" .includeDomains='["sensor"]' allow-custom-entity></ha-entity-picker>
              <div style="display: flex; gap: 10px;">
                <paper-input label="Icône (mdi:xxx)" class="ic" data-i="${i}" value="${s.icon || "mdi:sprout"}" style="flex:1"></paper-input>
                <paper-input label="Unité" class="u" data-i="${i}" value="${s.unit}" style="flex:1"></paper-input>
              </div>
              <mwc-button class="del" data-i="${i}" style="--mdc-theme-primary: #ff5252;">Supprimer</mwc-button>
            </div>
          `).join('')}
        </div>
        <mwc-button raised id="add">+ Ajouter un capteur</mwc-button>
      </div>
    `;

    this._setupEvents();
  }

  _setupEvents() {
    const upd = (newConfig) => {
      this._config = newConfig;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
    };

    this.querySelector("#name").addEventListener("value-changed", (e) => upd({...this._config, name: e.detail.value}));
    this.querySelector("#img").addEventListener("value-changed", (e) => upd({...this._config, plant_image: e.detail.value}));
    this.querySelector("#batt").addEventListener("value-changed", (e) => upd({...this._config, battery_sensor: e.detail.value}));

    this.querySelectorAll(".n").forEach(el => el.addEventListener("value-changed", (e) => {
      const s = [...this._config.sensors];
      s[el.dataset.i].name = e.detail.value;
      upd({...this._config, sensors: s});
    }));

    this.querySelectorAll(".e").forEach(el => el.addEventListener("value-changed", (e) => {
      const s = [...this._config.sensors];
      s[el.dataset.i].entity = e.detail.value;
      upd({...this._config, sensors: s});
    }));

    this.querySelectorAll(".ic").forEach(el => el.addEventListener("value-changed", (e) => {
      const s = [...this._config.sensors];
      s[el.dataset.i].icon = e.detail.value;
      upd({...this._config, sensors: s});
    }));

    this.querySelectorAll(".u").forEach(el => el.addEventListener("value-changed", (e) => {
      const s = [...this._config.sensors];
      s[el.dataset.i].unit = e.detail.value;
      upd({...this._config, sensors: s});
    }));

    this.querySelector("#add").onclick = () => {
      const s = [...(this._config.sensors || []), {name: "Nouveau", entity: "", unit: "", icon: "mdi:sprout"}];
      upd({...this._config, sensors: s});
    };

    this.querySelectorAll(".del").forEach(el => el.onclick = () => {
      const s = [...this._config.sensors];
      s.splice(el.dataset.i, 1);
      upd({...this._config, sensors: s});
    });
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
