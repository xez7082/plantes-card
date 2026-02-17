(function() {
  // --- CARTE PRINCIPALE ---
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
      return document.createElement("gestion-plantes-card-editor");
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      
      const moisture = this._hass.states[this._config.moisture_sensor]?.state || '--';
      
      this.shadowRoot.innerHTML = `
        <ha-card style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 15px; color: white; padding: 16px;">
          <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">${this._config.name || 'Ma Plante'}</div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <ha-icon icon="mdi:water"></ha-icon>
            <div style="flex: 1; background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="width: ${parseInt(moisture) || 0}%; background: #42a5f5; height: 100%;"></div>
            </div>
            <span>${moisture}%</span>
          </div>
        </ha-card>
      `;
    }
  }

  // --- ÉDITEUR ULTRA-SIMPLIFIÉ (Sans composants complexes pour éviter les bugs) ---
  class GestionPlantesCardEditor extends HTMLElement {
    set hass(hass) {
      this._hass = hass;
    }

    setConfig(config) {
      this._config = config;
      this.render();
    }

    render() {
      this.innerHTML = `
        <div style="padding: 20px; color: var(--primary-text-color);">
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: bold;">Nom de la plante :</label>
            <input type="text" data-config="name" value="${this._config.name || ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: bold;">Sensor Humidité (ex: sensor.plant_moisture) :</label>
            <input type="text" data-config="moisture_sensor" value="${this._config.moisture_sensor || ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          </div>

          <p style="font-size: 12px; color: #666;">Tapez le nom de vos entités manuellement si la liste ne s'affiche pas.</p>
        </div>
      `;

      this.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (ev) => {
          const configValue = ev.target.dataset.config;
          const newConfig = { ...this._config, [configValue]: ev.target.value };
          
          const event = new CustomEvent("config-changed", {
            detail: { config: newConfig },
            bubbles: true,
            composed: true,
          });
          this.dispatchEvent(event);
        });
      });
    }
  }

  // Enregistrement
  customElements.define('gestion-plantes-card', GestionPlantesCard);
  customElements.define('gestion-plantes-card-editor', GestionPlantesCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "gestion-plantes-card",
    name: "Gestion des Plantes (xez7082)",
    preview: true
  });
})();
