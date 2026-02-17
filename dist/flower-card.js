/**
 * Gestion des Plantes - xez7082 Custom Card
 * Style : Glassmorphism
 * Source : 100% OpenPlantbook
 */

class GestionPlantesCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;

    const entityId = this._config.entity;
    const state = hass.states[entityId];

    if (!state) {
      this.innerHTML = `<ha-card class="glass-error">Entité introuvable : ${entityId}</ha-card>`;
      return;
    }

    const attr = state.attributes;
    const name = this._config.name || attr.friendly_name || "Plante xez7082";
    const image = attr.image_url || attr.entity_picture || attr.image || "";

    this.innerHTML = `
      <ha-card class="glass-card">
        <div class="card-header">
            <div class="name">${name}</div>
            <div class="species">${attr.scientific_name || ''}</div>
        </div>
        
        <div class="card-content">
          ${image ? `<div class="img-container"><img src="${image}" class="plant-img"></div>` : ''}
          
          <div class="attributes-grid">
            ${this.renderBar("Humidité Sol", attr.moisture, "%", "mdi:water", attr.min_moisture, attr.max_moisture)}
            ${this.renderBar("Engrais", attr.conductivity, "µS/cm", "mdi:leaf", attr.min_conductivity, attr.max_conductivity)}
            ${this.renderBar("Lumière", attr.illuminance, "lx", "mdi:white-balance-sunny", attr.min_illuminance, attr.max_illuminance)}
            ${this.renderBar("Température", attr.temperature, "°C", "mdi:thermometer", attr.min_temperature, attr.max_temperature)}
            ${this.renderBar("DLI", attr.dli, "mol/m²/j", "mdi:sun-clock", attr.min_dli, attr.max_dli)}
          </div>
        </div>
      </ha-card>

      <style>
        /* Effet Glassmorphism */
        .glass-card {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(12px) saturate(150%);
          -webkit-backdrop-filter: blur(12px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 20px !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          color: white !important;
          overflow: hidden;
        }

        .card-header { padding: 20px 20px 10px; }
        .name { font-size: 24px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .species { font-size: 13px; opacity: 0.7; font-style: italic; }

        .img-container { margin: 0 15px 15px; position: relative; border-radius: 15px; overflow: hidden; }
        .plant-img { width: 100%; height: 180px; object-fit: cover; }

        .attributes-grid { display: flex; flex-direction: column; gap: 15px; padding: 0 15px 20px; }
        
        .attribute-item {
          background: rgba(255, 255, 255, 0.05);
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .attr-label { 
          font-size: 11px; 
          font-weight: bold; 
          text-transform: uppercase; 
          margin-bottom: 6px; 
          display: block;
          color: rgba(255, 255, 255, 0.9);
        }

        .bar-container { display: flex; align-items: center; gap: 12px; }

        /* Style des barres Glass */
        .progress-bar { 
          flex-grow: 1; 
          background: rgba(0, 0, 0, 0.2); 
          height: 8px; 
          border-radius: 4px; 
          overflow: hidden; 
        }

        .progress-fill { 
          height: 100%; 
          background: linear-gradient(90deg, #00d2ff, #3a7bd5); 
          box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
          transition: width 1s ease-in-out; 
        }

        .progress-fill.warning { 
          background: linear-gradient(90deg, #ff416c, #ff4b2b) !important;
          box-shadow: 0 0 10px rgba(255, 65, 108, 0.5);
        }

        .value-text { font-family: 'Roboto Mono', monospace; font-size: 13px; font-weight: bold; min-width: 60px; text-align: right; }
        
        ha-icon { color: white; --mdc-icon-size: 20px; opacity: 0.9; }
      </style>
    `;
  }

  renderBar(label, value, unit, icon, min, max) {
    if (value === undefined || value === null) return '';
    const isWarning = (min !== undefined && value < min) || (max !== undefined && value > max);
    const percentage = Math.min(Math.max((value / (max || 100)) * 100, 2), 100);

    return `
      <div class="attribute-item">
        <span class="attr-label">${label}</span>
        <div class="bar-container">
          <ha-icon icon="${icon}"></ha-icon>
          <div class="progress-bar">
            <div class="progress-fill ${isWarning ? 'warning' : ''}" style="width: ${percentage}%"></div>
          </div>
          <div class="value-text">${value}${unit}</div>
        </div>
      </div>
    `;
  }

  setConfig(config) {
    if (!config.entity) throw new Error("Sélectionnez une entité");
    this._config = config;
  }

  static getConfigElement() {
    return document.createElement("gestion-plantes-card-editor");
  }
}

/* --- L'ÉDITEUR (Même logique, design épuré) --- */
class GestionPlantesCardEditor extends HTMLElement {
  set hass(hass) { this._hass = hass; }
  setConfig(config) { this._config = config; this.render(); }

  render() {
    this.innerHTML = `
      <div style="padding: 10px; color: var(--primary-text-color);">
        <h3>Configuration Glass (xez7082)</h3>
        <ha-entity-picker
          .hass="${this._hass}"
          .value="${this._config.entity}"
          .configValue="${"entity"}"
          include-domains='["plant"]'
          @value-changed="${this.configChanged}"
          label="Choisir la plante"
        ></ha-entity-picker>
        <ha-textfield
          label="Nom personnalisé"
          .value="${this._config.name || ''}"
          .configValue="${"name"}"
          @input="${this.configChanged}"
          style="width: 100%; margin-top: 15px;"
        ></ha-textfield>
      </div>
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
  name: "Gestion des Plantes GLASS",
  description: "Design Glassmorphism par xez7082."
});
