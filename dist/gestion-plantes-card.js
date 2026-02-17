class GestionPlantesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this.render();
  }

  setConfig(config) {
    this._config = config;
  }

  // Cette fonction permet à HA de trouver l'éditeur
  static getConfigElement() {
    return document.createElement("gestion-plantes-card-editor");
  }

  static getStubConfig() {
    return {
      name: "Ma Plante",
      moisture_sensor: "",
      temperature_sensor: "",
      conductivity_sensor: "",
      illuminance_sensor: "",
      dli_sensor: ""
    };
  }

  getValue(entityId) {
    if (!entityId || !this._hass.states[entityId]) return "--";
    return this._hass.states[entityId].state;
  }

  render() {
    const moisture = this.getValue(this._config.moisture_sensor);
    const conductivity = this.getValue(this._config.conductivity_sensor);
    const illuminance = this.getValue(this._config.illuminance_sensor);
    const temperature = this.getValue(this._config.temperature_sensor);
    const dli = this.getValue(this._config.dli_sensor);

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="glass-container">
          <div class="header">${this._config.name || 'Plante'}</div>
          ${this._config.image ? `<img src="${this._config.image}" class="img">` : ''}
          <div class="content">
            ${this.renderBar("Humidité Sol", moisture, "%", "mdi:water")}
            ${this.renderBar("Engrais", conductivity, "µS/cm", "mdi:leaf")}
            ${this.renderBar("Lumière", illuminance, "lx", "mdi:white-balance-sunny")}
            ${this.renderBar("Température", temperature, "°C", "mdi:thermometer")}
          </div>
        </div>
      </ha-card>
      <style>
        :host { --glass-bg: rgba(255, 255, 255, 0.1); }
        .glass-container { background: var(--glass-bg); backdrop-filter: blur(10px); border-radius: 15px; padding: 15px; border: 1px solid rgba(255,255,255,0.2); color: white; }
        .header { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
        .img { width: 100%; border-radius: 10px; margin-bottom: 10px; }
        .bar-row { margin-bottom: 8px; }
        .label { font-size: 10px; text-transform: uppercase; }
        .bar-bg { background: rgba(0,0,0,0.3); height: 8px; border-radius: 4px; overflow: hidden; display: flex; align-items: center; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #42a5f5, #00d2ff); }
      </style>
    `;
  }

  renderBar(label, value, unit, icon) {
    if (value === "--") return '';
    const pct = Math.min(Math.max(parseInt(value) || 0, 0), 100);
    return `
      <div class="bar-row">
        <div class="label">${label}</div>
        <div style="display:flex; align-items:center; gap:8px;">
          <ha-icon icon="${icon}"></ha-icon>
          <div class="bar-bg" style="flex:1;"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div style="font-size:12px; min-width:40px;">${value}${unit}</div>
        </div>
      </div>
    `;
  }
}

// --- CONFIGURATION DE L'ÉDITEUR ---
class GestionPlantesCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  configChanged(ev) {
    if (!this._config || !this._hass) return;
    const target = ev.target;
    const value = ev.detail ? ev.detail.value : target.value;
    
    const newConfig = { ...this._config };
    if (target.configValue) {
      newConfig[target.configValue] = value;
    }

    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this._hass || !this._config) return;
    
    // On utilise du HTML simple avec des composants HA
    this.innerHTML = `
      <div style="padding: 16px;">
        <ha-textfield label="Nom de la plante" .value="${this._config.name || ''}" .configValue="${"name"}" style="width:100%; margin-bottom:10px;"></ha-textfield>
        <ha-textfield label="URL Image" .value="${this._config.image || ''}" .configValue="${"image"}" style="width:100%; margin-bottom:20px;"></ha-textfield>
        
        <p><b>Sélectionnez vos Sensors :</b></p>
        
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.moisture_sensor}" .configValue="${"moisture_sensor"}" label="Capteur Humidité Sol" include-domains='["sensor"]'></ha-entity-picker>
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.temperature_sensor}" .configValue="${"temperature_sensor"}" label="Capteur Température" include-domains='["sensor"]'></ha-entity-picker>
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.conductivity_sensor}" .configValue="${"conductivity_sensor"}" label="Capteur Engrais" include-domains='["sensor"]'></ha-entity-picker>
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.illuminance_sensor}" .configValue="${"illuminance_sensor"}" label="Capteur Luminosité" include-domains='["sensor"]'></ha-entity-picker>
      </div>
    `;

    // On attache les événements manuellement pour plus de sécurité
    this.querySelectorAll("ha-entity-picker, ha-textfield").forEach(picker => {
      picker.addEventListener("value-changed", (ev) => this.configChanged(ev));
      picker.addEventListener("change", (ev) => this.configChanged(ev));
    });
  }
}

// Enregistrement final
customElements.define('gestion-plantes-card', GestionPlantesCard);
customElements.define('gestion-plantes-card-editor', GestionPlantesCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "gestion-plantes-card",
  name: "Gestion des Plantes (xez7082)",
  description: "Carte Glassmorphism avec éditeur visuel corrigé."
});
