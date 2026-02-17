(function() {
  class GestionPlantesCard extends HTMLElement {
    set hass(hass) {
      this._hass = hass;
      if (this._config) this.render();
    }
    setConfig(config) { this._config = config; }
    static getConfigElement() { return document.createElement("xez-editor-ultra"); }
    
    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const config = this._config;
      const state = this._hass.states[config.moisture_sensor]?.state || '--';
      
      this.shadowRoot.innerHTML = `
        <ha-card style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 16px; color: white; border-radius: 15px;">
          <div style="font-size: 20px; margin-bottom: 10px;">${config.name || 'Plante'}</div>
          ${config.image ? `<img src="${config.image}" style="width:100%; border-radius:10px;">` : ''}
          <div style="margin-top:10px;">💧 Humidité: ${state}%</div>
        </ha-card>
      `;
    }
  }

  class GestionPlantesCardEditor extends HTMLElement {
    set hass(hass) { this._hass = hass; }
    setConfig(config) { this._config = config; this.render(); }

    render() {
      if (this._done) return;
      this.innerHTML = `
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 10px;">
          <label>Nom de la plante</label>
          <input type="text" id="n" style="padding:10px;">
          <label>URL Image</label>
          <input type="text" id="i" style="padding:10px;">
          <label>ID Sensor Humidité (ex: sensor.ma_plante_moisture)</label>
          <input type="text" id="m" style="padding:10px;">
          <button id="save" style="padding:10px; background: #4caf50; color: white; border: none; border-radius: 5px; cursor: pointer;">💾 SAUVEGARDER LA CONFIGURATION</button>
        </div>
      `;
      
      this.querySelector('#n').value = this._config.name || '';
      this.querySelector('#i').value = this._config.image || '';
      this.querySelector('#m').value = this._config.moisture_sensor || '';

      this.querySelector('#save').addEventListener('click', () => {
        const newConfig = {
          ...this._config,
          name: this.querySelector('#n').value,
          image: this.querySelector('#i').value,
          moisture_sensor: this.querySelector('#m').value,
        };
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
        alert("Configuration envoyée ! Cliquez sur ENREGISTRER en bas à droite de l'écran Lovelace.");
      });
      this._done = true;
    }
  }

  customElements.define('gestion-plantes-card', GestionPlantesCard);
  customElements.define('xez-editor-ultra', GestionPlantesCardEditor);
})();

window.customCards = window.customCards || [];
window.customCards.push({ type: "gestion-plantes-card", name: "Plante xez7082", preview: true });
