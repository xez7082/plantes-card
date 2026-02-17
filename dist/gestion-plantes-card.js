class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return {
      name: "Fleur de Lune",
      plant_image: "/local/community/plantes-card/fleurdelune.png",
      custom_sensors: []
    };
  }

  setConfig(config) { 
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.custom_sensors) this._config.custom_sensors = [];
    this._render(); 
  }
  
  set hass(hass) { this._hass = hass; this._render(); }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const getS = (eid) => this._hass.states[eid]?.state || "--";
    
    // Correction du chemin d'image dynamique
    const imgPlante = c.plant_image || "/local/community/plantes-card/fleurdelune.png";
    const battery = c.battery_sensor ? getS(c.battery_sensor) : null;

    this.shadowRoot.innerHTML = `
      <style>
        .bg{position:relative;border-radius:24px;overflow:hidden;color:white;font-family:sans-serif;background:#1a1a1a;min-height:200px}
        .card{position:relative;padding:20px;background:rgba(0,0,0,0.4);backdrop-filter:blur(8px);border-radius:24px;border:1px solid rgba(255,255,255,0.1)}
        .header{display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:15px}
        h1{margin:0;font-size:22px;text-shadow: 0 2px 4px rgba(0,0,0,0.5)}
        .batt{font-size:12px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px}
        .plant-img{display:block;margin:0 auto 15px;max-height:180px;object-fit:contain;filter:drop-shadow(0 10px 10px rgba(0,0,0,0.6))}
        .row{margin:12px 0}
        .lbl{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}
        .val{color:#5ce1e6;font-weight:bold}
        .bar{height:8px;background:rgba(255,255,255,0.1);border-radius:10px;overflow:hidden}
        .fill{height:100%;background:linear-gradient(90deg,#4fd1c5,#63b3ed);transition:width 0.8s ease-in-out}
      </style>
      <div class="bg">
        <div class="card">
          <div class="header">
            <h1>${c.name || "Ma Plante"}</h1>
            ${battery && battery !== "unknown" ? `<span class="batt">🔋 ${battery}%</span>` : ""}
          </div>
          <img class="plant-img" src="${imgPlante}" onerror="this.style.display='none'">
          
          ${this._row("💧 Humidité", getS(c.moisture_sensor), "%", 100)}
          ${this._row("🌡️ Température", getS(c.temperature_sensor), "°C", 45)}
          ${this._row("☀️ Lumière", getS(c.light_sensor), " lx", 10000)}
          ${(c.custom_sensors || []).map(s => this._row(s.name, getS(s.entity), s.unit, 100)).join('')}
        </div>
      </div>`;
  }

  _row(label, val, unit, max) {
    if (!val || val === "--" || val === "unknown") return "";
    const v = parseFloat(val);
    const w = isNaN(v) ? 0 : Math.min(Math.max((v / max) * 100, 0), 100);
    return `<div class="row">
      <div class="lbl"><span>${label}</span><span class="val">${val}${unit}</span></div>
      <div class="bar"><div class="fill" style="width:${w}%"></div></div>
    </div>`;
  }
}

// ============================================================
// ÉDITEUR ROBUSTE (SANS DEPENDANCE)
// ============================================================
class PlantCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.custom_sensors) this._config.custom_sensors = [];
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll("ha-entity-picker").forEach(p => { p.hass = hass; });
  }

  _render() {
    this.innerHTML = `
      <style>
        .editor-container{padding:15px; font-family: system-ui; color: var(--primary-text-color)}
        .box{background: var(--secondary-background-color); padding:15px; margin-bottom:15px; border-radius:10px; border: 1px solid var(--divider-color)}
        label{display:block; font-weight:bold; font-size:13px; margin-bottom:8px; color: var(--secondary-text-color)}
        input, ha-entity-picker{display:block; width:100%; margin-bottom:12px}
        input{padding:10px; box-sizing:border-box; background: var(--card-background-color); color: var(--primary-text-color); border:1px solid var(--divider-color); border-radius:6px}
        .btn{cursor:pointer; padding:12px; width:100%; border-radius:8px; border:none; font-weight:bold; transition: background 0.3s}
        .btn-add{background: #2e7d32; color:white; margin-top:10px}
        .btn-del{background: #c62828; color:white; font-size:11px; padding:6px; margin-top:5px}
        .custom-item{border-left: 4px solid #2e7d32; padding: 10px; margin-bottom:15px; background: rgba(0,0,0,0.03)}
      </style>
      <div class="editor-container">
        <div class="box">
          <label>Configuration Générale</label>
          <input data-key="name" placeholder="Nom de la plante" value="${this._config.name || ""}">
          <input data-key="plant_image" placeholder="Chemin image (ex: /local/fleur.png)" value="${this._config.plant_image || ""}">
          <label>Batterie</label>
          <ha-entity-picker data-key="battery_sensor" .value="${this._config.battery_sensor}" .hass="${this._hass}"></ha-entity-picker>
        </div>

        <div class="box">
          <label>Capteurs de base</label>
          <ha-entity-picker label="Humidité" data-key="moisture_sensor" .value="${this._config.moisture_sensor}" .hass="${this._hass}"></ha-entity-picker>
          <ha-entity-picker label="Température" data-key="temperature_sensor" .value="${this._config.temperature_sensor}" .hass="${this._hass}"></ha-entity-picker>
          <ha-entity-picker label="Lumière" data-key="light_sensor" .value="${this._config.light_sensor}" .hass="${this._hass}"></ha-entity-picker>
        </div>

        <div class="box">
          <label>Capteurs Additionnels</label>
          <div id="custom-zone">
            ${this._config.custom_sensors.map((s, i) => `
              <div class="custom-item">
                <input class="c-name" data-idx="${i}" placeholder="Titre" value="${s.name || ""}">
                <ha-entity-picker class="c-entity" data-idx="${i}" .value="${s.entity}" .hass="${this._hass}"></ha-entity-picker>
                <input class="c-unit" data-idx="${i}" placeholder="Unité" value="${s.unit || ""}">
                <button class="btn btn-del" data-idx="${i}">Supprimer</button>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-add" id="add-btn">+ Ajouter un capteur</button>
        </div>
      </div>`;

    this._setupEvents();
  }

  _setupEvents() {
    const fire = () => {
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    };

    // Inputs standards
    this.querySelectorAll("input[data-key]").forEach(i => {
      i.onchange = (e) => { this._config[e.target.dataset.key] = e.target.value; fire(); };
    });

    // Pickers standards
    this.querySelectorAll("ha-entity-picker[data-key]").forEach(p => {
      p.addEventListener("value-changed", (e) => { this._config[p.dataset.key] = e.detail.value; fire(); });
    });

    // Inputs custom
    this.querySelectorAll(".custom-item").forEach(item => {
      const idx = item.querySelector(".btn-del").dataset.idx;
      item.querySelector(".c-name").onchange = (e) => { this._config.custom_sensors[idx].name = e.target.value; fire(); };
      item.querySelector(".c-unit").onchange = (e) => { this._config.custom_sensors[idx].unit = e.target.value; fire(); };
      item.querySelector(".c-entity").addEventListener("value-changed", (e) => { 
        this._config.custom_sensors[idx].entity = e.detail.value; 
        fire(); 
      });
      item.querySelector(".btn-del").onclick = () => {
        this._config.custom_sensors.splice(idx, 1);
        fire();
        this._render();
      };
    });

    this.querySelector("#add-btn").onclick = () => {
      this._config.custom_sensors.push({name: "", entity: "", unit: ""});
      fire();
      this._render();
    };
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
