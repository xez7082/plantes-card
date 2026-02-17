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
      return document.createElement("xez-editor-final");
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const config = this._config;
      
      const getS = (eid) => {
        const state = this._hass.states[eid];
        return state ? state.state : null;
      };

      const sensors = [
        { label: "Humidité", val: getS(config.moisture_sensor), unit: "%", icon: "mdi:water" },
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
              <div style="font-size:10px; opacity:0.8;">${s.label}</div>
              <div style="display:flex; align-items:center; gap:10px;">
                <ha-icon icon="${s.icon}"></ha-icon>
                <div style="flex:1; background:rgba(0,0,0,0.2); height:6px; border-radius:3px; overflow:hidden;">
                  <div style="width:${Math.min(parseInt(s.val) || 0, 100)}%; background:#00d2ff; height:100%;"></div>
                </div>
                <span style="font-weight:bold;">${s.val}${s.unit}</span>
              </div>
            </div>
          ` : '').join('')}
        </ha-card>
      `;
    }
  }

  class GestionPlantesCardEditor extends HTMLElement {
    set hass(hass) { this._hass = hass; }
    
    setConfig(config) {
      this._config = config;
      if (!this._initialized) {
        this.render();
        this._initialized = true;
      }
    }

    render() {
      this.innerHTML = `
        <div style="padding: 15px; display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:5px;">Nom de la plante</label>
            <input type="text" id="name" value="${this._config.name || ''}" style="width:100%; padding:10px; border-radius:5px; border:1px solid #444; background:#222; color:white;">
          </div>
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:5px;">URL Image</label>
            <input type="text" id="image" value="${this._config.image || ''}" style="width:100%; padding:10px; border-radius:5px; border:1px solid #444; background:#222; color:white;">
          </div>
          
          <hr style="opacity:0.2">
          
          <div id="pickers"></div>
        </div>
      `;

      // Liste des sensors à configurer
      const sensors = [
        { key: 'moisture_sensor', label: 'Sensor Humidité' },
        { key: 'conductivity_sensor', label: 'Sensor Engrais' },
        { key: 'temperature_sensor', label: 'Sensor Température' },
        { key: 'illuminance_sensor', label: 'Sensor Lumière' }
      ];

      const container = this.querySelector('#pickers');
      sensors.forEach(s => {
        const picker = document.createElement('ha-entity-picker');
        picker.label = s.label;
        picker.hass = this._hass;
        picker.value = this._config[s.key];
        picker.setAttribute('data-config', s.key);
        picker.style.display = "block";
        picker.style.marginBottom = "15px";
        picker.addEventListener('value-changed', (ev) => this._updateConfig(s.key, ev.detail.value));
        container.appendChild(picker);
      });

      // Événements pour les inputs texte (on attend la fin de la saisie ou la perte de focus)
      ['name', 'image'].forEach(id => {
        const input = this.querySelector(`#${id}`);
        input.addEventListener('change', (ev) => this._updateConfig(id, ev.target.value));
      });
    }

    _updateConfig(key, value) {
      const newConfig = { ...this._config, [key]: value };
      this._config = newConfig; // Mise à jour locale pour éviter le saut
      this.dispatchEvent(new CustomEvent("config-changed", { 
        detail: { config: newConfig },
        bubbles: true, 
        composed: true 
      }));
    }
  }

  customElements.define('gestion-plantes-card', GestionPlantesCard);
  customElements.define('xez-editor-final', GestionPlantesCardEditor);
})();

window.customCards = window.customCards || [];
window.customCards.push({
  type: "gestion-plantes-card",
  name: "Gestion des Plantes (xez7082)",
  preview: true
});
