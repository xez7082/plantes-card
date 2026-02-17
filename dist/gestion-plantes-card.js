(function() {
  class GestionPlantesCard extends HTMLElement {
    set hass(hass) {
      this._hass = hass;
      if (this._config) this.render();
    }
    setConfig(config) { this._config = config; }
    static getConfigElement() { return document.createElement("gestion-plantes-card-editor"); }
    
    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const config = this._config;
      const getS = (eid) => this._hass.states[eid]?.state || '--';
      
      this.shadowRoot.innerHTML = `
        <ha-card style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 16px; color: white; border-radius: 15px; border: 1px solid rgba(255,255,255,0.2);">
          <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">${config.name || 'Ma Plante'}</div>
          ${config.image ? `<img src="${config.image}" style="width:100%; border-radius:10px; margin-bottom:10px;">` : ''}
          <div style="display:grid; gap:10px;">
            ${config.moisture_sensor ? `<div>💧 Humidité: <b>${getS(config.moisture_sensor)}%</b></div>` : ''}
            ${config.temperature_sensor ? `<div>🌡️ Température: <b>${getS(config.temperature_sensor)}°C</b></div>` : ''}
            ${config.conductivity_sensor ? `<div>🌿 Engrais: <b>${getS(config.conductivity_sensor)} µS/cm</b></div>` : ''}
          </div>
        </ha-card>
      `;
    }
  }

  // --- ÉDITEUR HAUTE COMPATIBILITÉ ---
  class GestionPlantesCardEditor extends HTMLElement {
    set hass(hass) {
      this._hass = hass;
    }

    setConfig(config) {
      this._config = config;
      this.render();
    }

    render() {
      if (!this._hass || !this._config) return;

      // Définition du schéma du formulaire Home Assistant
      const schema = [
        { name: "name", label: "Nom de la plante", selector: { text: {} } },
        { name: "image", label: "URL de l'image", selector: { text: {} } },
        { 
          name: "moisture_sensor", 
          label: "Capteur d'humidité", 
          selector: { entity: { domain: "sensor" } } 
        },
        { 
          name: "temperature_sensor", 
          label: "Capteur de température", 
          selector: { entity: { domain: "sensor" } } 
        },
        { 
          name: "conductivity_sensor", 
          label: "Capteur d'engrais (Conductivité)", 
          selector: { entity: { domain: "sensor" } } 
        }
      ];

      this.innerHTML = `
        <div style="padding: 10px;">
          <ha-form
            .hass=${this._hass}
            .data=${this._config}
            .schema=${schema}
            .computeLabel=${(s) => s.label}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      `;
    }

    _valueChanged(ev) {
      const config = ev.detail.value;
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true
      }));
    }
  }

  customElements.define('gestion-plantes-card', GestionPlantesCard);
  customElements.define('gestion-plantes-card-editor', GestionPlantesCardEditor);
})();

window.customCards = window.customCards || [];
window.customCards.push({
  type: "gestion-plantes-card",
  name: "Plante xez7082 (Mode Formulaire)",
  preview: true
});
