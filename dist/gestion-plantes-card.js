(function() {
  class GestionPlantesCard extends HTMLElement {
    set hass(hass) {
      this._hass = hass;
      if (!this._config) return;
      this.render();
    }

    setConfig(config) {
      this._config = config;
    }

    static getConfigElement() {
      return document.createElement("xez-editor-v4");
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const config = this._config;
      const getS = (eid) => {
        const state = this._hass.states[eid];
        return state ? state.state : null;
      };

      const sensors = [
        { label: "Humidité Sol", val: getS(config.moisture_sensor), unit: "%", icon: "mdi:water" },
        { label: "Engrais", val: getS(config.conductivity_sensor), unit: "µS/cm", icon: "mdi:leaf" },
        { label: "Lumière", val: getS(config.illuminance_sensor), unit: "lx", icon: "mdi:white-balance-sunny" },
        { label: "Température", val: getS(config.temperature_sensor), unit: "°C", icon: "mdi:thermometer" }
      ];

      this.shadowRoot.innerHTML = `
        <ha-card style="background: rgba(255,255,255,0.1); backdrop-filter: blur(15px); border-radius: 20px; color: white; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
          <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">${config.name || 'Ma Plante'}</div>
          ${config.image ? `<img src="${config.image}" style="width:100%; border-radius:10px; margin-bottom:15px; max-height: 200px; object-fit: cover;">` : ''}
          ${sensors.map(s => s.val !== null ? `
            <div style="margin-bottom:10px; background:rgba(255,255,255,0.05); padding:8px; border-radius:10px;">
              <div style="font-size:10px; opacity:0.8; text-transform: uppercase;">${s.label}</div>
              <div style="display:flex; align-items:center; gap:10px;">
                <ha-icon icon="${s.icon}"></ha-icon>
                <div style="flex:1; background:rgba(0,0,0,0.2); height:6px; border-radius:3px; overflow:hidden;">
                  <div style="width:${Math.min(parseInt(s.val) || 0, 100)}%; background:#00d2ff; height:100%;"></div>
                </div>
                <span style="font-weight:bold; min-width: 45px; text-align: right;">${s.val}${s.unit}</span>
              </div>
            </div>
          ` : '').join('')}
        </ha-card>
      `;
    }
  }

  // --- ÉDITEUR STABLE V4 ---
  class GestionPlantesCardEditor extends HTMLElement {
    set hass(hass) { this._hass = hass; }
    
    setConfig(config) { 
      this._config = config;
      this.render();
    }

    render() {
      if (this._rendered) return; // Empêche le re-rendu cyclique qui fait sauter le curseur
      this._rendered = true;

      this.innerHTML = `
        <div style="padding: 15px; display: flex; flex-direction: column; gap: 15px;">
          <ha-textfield label="Nom de la plante" .value="${this._config.name || ''}" .configValue="${"name"}"></ha-textfield>
          <ha-textfield label="URL de l'image" .value="${this._config.image || ''}" .configValue="${"image"}"></ha-textfield>
          
          <p style="margin-bottom: 0; font-weight: bold;">Capteurs (Sensors) :</p>
          <ha-entity-picker .hass="${this._hass}" .value="${this._config.moisture_sensor}" .configValue="${"moisture_sensor"}" label="Humidité" include-domains='["sensor"]'></ha-entity-picker>
          <ha-entity-picker .hass="${this._hass}" .value="${this._config.conductivity_sensor}" .configValue="${"conductivity_sensor"}" label="Engrais" include-domains='["sensor"]'></ha-entity-picker>
          <ha-entity-picker .hass="${this._hass}" .value="${this._config.temperature_sensor}" .configValue="${"temperature_sensor"}" label="Température" include-domains='["sensor"]'></ha-entity-picker>
          <ha-entity-picker .hass="${this._hass}" .value="${this._config.illuminance_sensor}" .configValue="${"illuminance_sensor"}" label="Luminosité" include-domains='["sensor"]'></ha-entity-picker>
        </div>
      `;

      // Gestion des événements
      this.querySelectorAll("ha-textfield, ha-entity-picker").forEach(el => {
        el.addEventListener("value-changed", (ev) => this._updateConfig(ev));
        el.addEventListener("change", (ev) => this._updateConfig(ev));
      });
    }

    _updateConfig(ev) {
      const configValue = ev.target.configValue;
      const value = ev.detail?.value || ev.target.value;

      if (!this._config || this._config[configValue] === value) return;

      const newConfig = { ...this._config, [configValue]: value };
      
      this.dispatchEvent(new CustomEvent("config-changed", { 
        detail: { config: newConfig },
        bubbles: true, 
        composed: true 
      }));
    }
  }

  customElements.define('gestion-plantes-card', GestionPlantesCard);
  customElements.define('xez-editor-v4', GestionPlantesCardEditor);
})();

window.customCards = window.customCards || [];
window.customCards.push({
  type: "gestion-plantes-card",
  name: "Gestion des Plantes (xez7082)",
  preview: true
});
