class GestionPlantesCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;

    // Récupération des valeurs des capteurs individuels ou de l'entité plant
    const moisture = this.getValue(this._config.moisture_sensor);
    const conductivity = this.getValue(this._config.conductivity_sensor);
    const illuminance = this.getValue(this._config.illuminance_sensor);
    const temperature = this.getValue(this._config.temperature_sensor);
    const dli = this.getValue(this._config.dli_sensor);

    const name = this._config.name || "Ma Plante";
    const image = this._config.image || "";

    this.innerHTML = `
      <ha-card class="glass-card">
        <div class="card-header">
            <div class="name">${name}</div>
        </div>
        
        <div class="card-content">
          ${image ? `<div class="img-container"><img src="${image}" class="plant-img"></div>` : ''}
          
          <div class="attributes-grid">
            ${this.renderBar("Humidité Sol", moisture, "%", "mdi:water")}
            ${this.renderBar("Engrais", conductivity, "µS/cm", "mdi:leaf")}
            ${this.renderBar("Lumière", illuminance, "lx", "mdi:white-balance-sunny")}
            ${this.renderBar("Température", temperature, "°C", "mdi:thermometer")}
            ${this.renderBar("DLI", dli, "mol/m²/j", "mdi:sun-clock")}
          </div>
        </div>
      </ha-card>

      <style>
        .glass-card {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 20px !important;
          color: white !important;
          padding-bottom: 10px;
        }
        .card-header { padding: 20px; font-size: 24px; font-weight: bold; }
        .img-container { margin: 0 15px 15px; border-radius: 15px; overflow: hidden; height: 180px; }
        .plant-img { width: 100%; height: 100%; object-fit: cover; }
        .attributes-grid { display: flex; flex-direction: column; gap: 10px; padding: 0 15px; }
        .attribute-item { background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 10px; }
        .attr-label { font-size: 10px; text-transform: uppercase; opacity: 0.8; }
        .bar-container { display: flex; align-items: center; gap: 10px; }
        .progress-bar { flex-grow: 1; background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #00d2ff, #3a7bd5); }
        .value-text { font-size: 12px; font-weight: bold; min-width: 50px; text-align: right; }
      </style>
    `;
  }

  getValue(entityId) {
    if (!entityId || !this._hass.states[entityId]) return undefined;
    return this._hass.states[entityId].state;
  }

  renderBar(label, value, unit, icon) {
    if (value === undefined || value === "unknown") return '';
    const percentage = Math.min(Math.max(parseInt(value) || 0, 0), 100);
    return `
      <div class="attribute-item">
        <span class="attr-label">${label}</span>
        <div class="bar-container">
          <ha-icon icon="${icon}"></ha-icon>
          <div class="progress-bar"><div class="progress-fill" style="width: ${percentage}%"></div></div>
          <div class="value-text">${value}${unit}</div>
        </div>
      </div>
    `;
  }

  setConfig(config) {
    this._config = config;
  }

  static getConfigElement() {
    return document.createElement("gestion-plantes-card-editor");
  }
}

// --- ÉDITEUR VISUEL MIS À JOUR ---
class GestionPlantesCardEditor extends HTMLElement {
  set hass(hass) { this._hass = hass; }
  setConfig(config) { this._config = config; this.render(); }

  render() {
    this.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px; padding: 10px;">
        <ha-textfield label="Nom de la plante" .value="${this._config.name || ''}" .configValue="${"name"}" @input="${this.configChanged}"></ha-textfield>
        <ha-textfield label="URL Image" .value="${this._config.image || ''}" .configValue="${"image"}" @input="${this.configChanged}"></ha-textfield>
        
        <p><b>Sélection des capteurs :</b></p>
        ${this.renderPicker("Humidité Sol", "moisture_sensor")}
        ${this.renderPicker("Conductivité", "conductivity_sensor")}
        ${this.renderPicker("Luminosité", "illuminance_sensor")}
        ${this.renderPicker("Température", "temperature_sensor")}
        ${this.renderPicker("DLI", "dli_sensor")}
      </div>
    `;
  }

  renderPicker(label, configValue) {
    return `
      <ha-entity-picker
        .hass="${this._hass}"
        .value="${this._config[configValue]}"
        .configValue="${configValue}"
        @value-changed="${this.configChanged}"
        label="${label}"
      ></ha-entity-picker>
    `;
  }

  configChanged(ev) {
    const target = ev.target;
    const value = target.value || ev.detail.value;
    this.dispatchEvent(new CustomEvent("config-changed", { 
      detail: { config: { ...this._config, [target.configValue]: value } } 
    }));
  }
}

customElements.define('gestion-plantes-card', GestionPlantesCard);
customElements.define('gestion-plantes-card-editor', GestionPlantesCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "gestion-plantes-card",
  name: "Gestion des Plantes (xez7082)",
  description: "Carte Glassmorphism avec sélection manuelle des capteurs."
});
