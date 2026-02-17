// PLANT CARD – Éditeur avec ha-entity-picker natif, stable et performant

class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  static getConfigElement() {
    return document.createElement("plant-card-editor");
  }

  static getStubConfig() {
    return {
      name: "Ma plante",
      subtitle: "Monstera Deliciosa",
      image: "",
      plant_image: "",
      moisture_sensor: "",
      temperature_sensor: "",
      conductivity_sensor: "",
      light_sensor: "",
      battery_sensor: "",
    };
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() { return 4; }

  render() {
    const config = this._config;
    if (!config || !this._hass) return;

    const getVal = (eid) => {
      if (!eid) return null;
      const s = this._hass.states[eid];
      if (!s || isNaN(parseFloat(s.state))) return null;
      return parseFloat(s.state);
    };

    const moisture = getVal(config.moisture_sensor);
    const temp     = getVal(config.temperature_sensor);
    const cond     = getVal(config.conductivity_sensor);
    const light    = getVal(config.light_sensor);
    const battery  = getVal(config.battery_sensor);

    const bar = (pct) => {
      const w = (pct == null || isNaN(pct)) ? 0 : Math.min(Math.max(pct, 0), 100);
      return `<div class="bar"><div class="fill" style="width:${w}%"></div></div>`;
    };

    const tempDanger = temp != null && temp > 30
      ? `<span class="danger">&#9888; CHALEUR</span>` : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { background: none; border: none; box-shadow: none; }
        .bg { position:relative; border-radius:24px; overflow:hidden; color:white; font-family:var(--primary-font-family, sans-serif); background: #222; }
        .bg-img { width:100%; height:100%; object-fit:cover; filter:blur(6px) brightness(0.5); position:absolute; inset:0; z-index: 0; }
        .card { position:relative; z-index: 1; padding:24px; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.2); border-radius:24px; background:rgba(0,0,0,0.2); box-shadow:0 10px 40px rgba(0,0,0,0.4); }
        h1 { margin:0; font-size:26px; font-weight:700; text-align:center; }
        h2 { margin:4px 0 20px; font-size:15px; opacity:0.7; font-style:italic; text-align:center; }
        .plant-img { display:block; margin:0 auto 20px; max-height:160px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.3)); }
        .row { margin:16px 0; }
        .label { display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:6px; opacity:0.9; }
        .value { color:#5ce1e6; font-weight:700; display:flex; align-items:center; gap:6px; }
        .bar { height:6px; background:rgba(255,255,255,0.2); border-radius:10px; overflow:hidden; }
        .fill { height:100%; background: linear-gradient(90deg, #4fd1c5, #63b3ed); border-radius:10px; transition:width 0.8s ease-in-out; }
        .danger { color:#ff5a5a; font-weight:800; font-size:10px; background: rgba(255,0,0,0.1); padding: 2px 6px; border-radius: 4px; }
      </style>
      <ha-card>
        <div class="bg">
          ${config.image ? `<img class="bg-img" src="${config.image}" alt="">` : ""}
          <div class="card">
            <h1>${config.name || "Ma plante"}</h1>
            <h2>${config.subtitle || ""}</h2>
            ${config.plant_image ? `<img class="plant-img" src="${config.plant_image}" alt="Plante">` : ""}
            
            ${config.moisture_sensor ? `
              <div class="row">
                <div class="label"><span>💧 Humidité</span><span class="value">${moisture != null ? moisture+"%" : "--"}</span></div>
                ${bar(moisture)}
              </div>` : ""}
            
            ${config.conductivity_sensor ? `
              <div class="row">
                <div class="label"><span>🌱 Engrais</span><span class="value">${cond != null ? cond+" µS/cm" : "--"}</span></div>
                ${bar(cond != null ? cond/20 : null)}
              </div>` : ""}
            
            ${config.light_sensor ? `
              <div class="row">
                <div class="label"><span>☀️ Lumière</span><span class="value">${light != null ? light+" lx" : "--"}</span></div>
                ${bar(light != null ? light/100 : null)}
              </div>` : ""}
            
            ${config.temperature_sensor ? `
              <div class="row">
                <div class="label"><span>🌡️ Température</span><span class="value">${temp != null ? temp+"°C" : "--"} ${tempDanger}</span></div>
                ${bar(temp != null ? (temp / 40) * 100 : null)}
              </div>` : ""}
            
            ${config.battery_sensor ? `
              <div class="row">
                <div class="label"><span>🔋 Batterie</span><span class="value">${battery != null ? battery+"%" : "--"}</span></div>
                ${bar(battery)}
              </div>` : ""}
          </div>
        </div>
      </ha-card>
    `;
  }
}

// ============================================================
// EDITEUR — DOM stable
// ============================================================

class PlantCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass   = null;
    this._ready  = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._ready) {
      this.querySelectorAll("ha-entity-picker").forEach(p => { p.hass = hass; });
    }
  }

  setConfig(config) {
    this._config = { ...config };
    if (!this._ready) {
      this._buildDOM();
      this._ready = true;
    }
    this._syncValues();
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _buildDOM() {
    this.innerHTML = `
      <style>
        .editor { padding:16px; font-family:var(--primary-font-family, sans-serif); color: var(--primary-text-color); }
        .section { background: var(--secondary-background-color); border-radius:8px; padding:16px; margin-bottom:16px; border: 1px solid var(--divider-color); }
        .section-title { font-size:15px; font-weight:bold; margin-bottom:12px; }
        .field { margin-bottom:14px; }
        .field label { display:block; font-size:13px; font-weight:500; margin-bottom:4px; opacity: 0.8; }
        .field input { width:100%; padding:8px 12px; border:1px solid var(--divider-color); border-radius:6px; font-size:14px; box-sizing:border-box; background: var(--card-background-color); color: var(--primary-text-color); }
        ha-entity-picker { display:block; }
      </style>
      <div class="editor">
        <div class="section">
          <div class="section-title">Informations</div>
          <div class="field"><label>Nom de la plante</label>
            <input data-key="name" />
          </div>
          <div class="field"><label>Sous-titre</label>
            <input data-key="subtitle" />
          </div>
        </div>
        <div class="section">
          <div class="section-title">Images</div>
          <div class="field"><label>Image de fond (URL)</label>
            <input data-key="image" />
          </div>
          <div class="field"><label>Image de la plante (URL)</label>
            <input data-key="plant_image" />
          </div>
        </div>
        <div class="section">
          <div class="section-title">Capteurs</div>
          ${['moisture_sensor', 'conductivity_sensor', 'light_sensor', 'temperature_sensor', 'battery_sensor'].map(key => `
            <div class="field"><label>${key.replace('_', ' ')}</label>
              <ha-entity-picker data-key="${key}" include-domains='["sensor"]' allow-custom-entity></ha-entity-picker>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.querySelectorAll("input[data-key]").forEach(input => {
      input.addEventListener("input", (e) => {
        clearTimeout(input._t);
        input._t = setTimeout(() => {
          this._config[e.target.dataset.key] = e.target.value;
          this._fire();
        }, 400);
      });
    });

    this.querySelectorAll("ha-entity-picker[data-key]").forEach(picker => {
      picker.addEventListener("value-changed", (e) => {
        this._config[picker.dataset.key] = e.detail.value;
        this._fire();
      });
    });
  }

  _syncValues() {
    this.querySelectorAll("input[data-key]").forEach(input => {
      if (document.activeElement !== input) {
        input.value = this._config[input.dataset.key] || "";
      }
    });
    this.querySelectorAll("ha-entity-picker[data-key]").forEach(picker => {
      picker.value = this._config[picker.dataset.key] || "";
      if (this._hass) picker.hass = this._hass;
    });
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plant-card",
  name: "Plant Card",
  preview: true,
});
