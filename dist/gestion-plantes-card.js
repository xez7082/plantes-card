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

  getValue(entityId) {
    if (!entityId || !this._hass.states[entityId]) return null;
    return this._hass.states[entityId].state;
  }

  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    
    const sensors = [
      { label: "Humidité Sol", val: this.getValue(this._config.moisture_sensor), unit: "%", icon: "mdi:water" },
      { label: "Engrais", val: this.getValue(this._config.conductivity_sensor), unit: "µS/cm", icon: "mdi:leaf" },
      { label: "Lumière", val: this.getValue(this._config.illuminance_sensor), unit: "lx", icon: "mdi:white-balance-sunny" },
      { label: "Température", val: this.getValue(this._config.temperature_sensor), unit: "°C", icon: "mdi:thermometer" },
      { label: "DLI", val: this.getValue(this._config.dli_sensor), unit: "mol/m²/j", icon: "mdi:sun-clock" }
    ];

    this.shadowRoot.innerHTML = `
      <ha-card style="background: rgba(255,255,255,0.1); backdrop-filter: blur(15px); border-radius: 20px; color: white; border: 1px solid rgba(255,255,255,0.2); overflow: hidden;">
        <div style="padding: 20px 20px 10px;">
          <div style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${this._config.name || 'Ma Plante'}</div>
        </div>
        
        ${this._config.image ? `<div style="margin: 0 15px 15px; border-radius: 12px; overflow: hidden; height: 180px;"><img src="${this._config.image}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}

        <div style="padding: 0 15px 20px; display: flex; flex-direction: column; gap: 12px;">
          ${sensors.map(s => s.val !== null ? `
            <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; opacity: 0.8;">${s.label}</div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <ha-icon icon="${s.icon}"></ha-icon>
                <div style="flex: 1; background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${Math.min(parseInt(s.val) || 0, 100)}%; background: linear-gradient(90deg, #00d2ff, #3a7bd5); height: 100%; box-shadow: 0 0 10px #00d2ff;"></div>
                </div>
                <div style="font-weight: bold; min-width: 50px; text-align: right;">${s.val}${s.unit}</div>
              </div>
            </div>
          ` : '').join('')}
        </div>
      </ha-card>
    `;
  }
}

// --- ÉDITEUR VISUEL AVEC FORMULAIRE NATIF ---
class GestionPlantesCardEditor extends HTMLElement {
  set hass(hass) { this._hass = hass; }
  setConfig(config) { this._config = config; this.render(); }

  render() {
    if (!this._hass || !this._config) return;

    this.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 10px;">
        <ha-textfield label="Nom de la plante" .value="${this._config.name || ''}" .configValue="${"name"}"></ha-textfield>
        <ha-textfield label="URL de la photo" .value="${this._config.image || ''}" .configValue="${"image"}"></ha-textfield>
        
        <hr style="width: 100%; border: 0.5px solid #ccc; opacity: 0.3;">
        <p style="margin: 0; font-weight: bold;">Configuration des Capteurs :</p>

        <ha-entity-picker .hass="${this._hass}" .value="${this._config.moisture_sensor}" .configValue="${"moisture_sensor"}" label="Humidité du Sol" include-domains='["sensor"]'></ha-entity-picker>
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.conductivity_sensor}" .configValue="${"conductivity_sensor"}" label="Engrais / Conductivité" include-domains='["sensor"]'></ha-entity-picker>
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.illuminance_sensor}" .configValue="${"illuminance_sensor"}" label="Luminosité" include-domains='["sensor"]'></ha-entity-picker>
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.temperature_sensor}" .configValue="${"temperature_sensor"}" label="Température" include-domains='["sensor"]'></ha-entity-picker>
        <ha-entity-picker .hass="${this._hass}" .value="${this._config.dli_sensor}" .configValue="${"dli_sensor"}" label="DLI (Intégrale de lumière)" include-domains='["sensor"]'></ha-entity-picker>
      </div>
    `;

    this.querySelectorAll("ha-textfield, ha-entity-picker").forEach(element => {
      element.addEventListener("value-changed", (ev) => this._valueChanged(ev));
      element.addEventListener("input", (ev) => this._valueChanged(ev));
    });
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    const target = ev.target;
    const value = ev.detail?.value !== undefined ? ev.detail.value : target.value;
    
    if (this._config[target.configValue] === value) return;

    const newConfig = { ...this._config, [target.configValue]: value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig } }));
  }
}

customElements.define('gestion-plantes-card', GestionPlantesCard);
customElements.define('gestion-plantes-card-editor', GestionPlantesCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "gestion-plantes-card",
  name: "Gestion des Plantes (xez7082)",
  preview: true
});
