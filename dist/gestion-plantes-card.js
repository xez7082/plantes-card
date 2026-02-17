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
    const imgPlante = c.plant_image || "/local/community/plantes-card/fleurdelune.png";
    const battery = c.battery_sensor ? getS(c.battery_sensor) : null;

    this.shadowRoot.innerHTML = `
      <style>
        .bg{position:relative;border-radius:24px;overflow:hidden;color:white;font-family:sans-serif;background:#222}
        .bg-img{width:100%;height:100%;object-fit:cover;filter:blur(8px) brightness(.5);position:absolute;inset:0}
        .card{position:relative;padding:20px;backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,0.3);border-radius:24px}
        .header{display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:15px}
        h1{margin:0;font-size:22px;text-align:center}
        .batt{font-size:12px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px}
        .plant-img{display:block;margin:0 auto 15px;max-height:160px;filter:drop-shadow(0 8px 8px rgba(0,0,0,0.5))}
        .row{margin:12px 0}
        .lbl{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}
        .val{color:#5ce1e6;font-weight:bold}
        .bar{height:6px;background:rgba(255,255,255,.2);border-radius:10px;overflow:hidden}
        .fill{height:100%;background:linear-gradient(90deg,#4fd1c5,#63b3ed);transition:width .5s}
      </style>
      <div class="bg">
        ${c.image ? `<img class="bg-img" src="${c.image}">` : ""}
        <div class="card">
          <div class="header">
            <h1>${c.name || "Ma Plante"}</h1>
            ${battery && battery !== "unknown" ? `<span class="batt">🔋 ${battery}%</span>` : ""}
          </div>
          <img class="plant-img" src="${imgPlante}">
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
// ÉDITEUR STABILISÉ
// ============================================================
class PlantCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.custom_sensors) this._config.custom_sensors = [];
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const pickers = this.querySelectorAll("ha-entity-picker");
    pickers.forEach(p => { p.hass = hass; });
  }

  _render() {
    if (this._rendered) {
        this._updateValues();
        return;
    }

    this.innerHTML = `
      <style>
        .editor{padding:10px; font-family: sans-serif; color: var(--primary-text-color)}
        .sect{background: var(--secondary-background-color); padding:12px; margin-bottom:10px; border-radius:8px; border: 1px solid var(--divider-color)}
        label{display:block; font-weight:bold; font-size:12px; margin: 10px 0 5px}
        input, ha-entity-picker{display:block; width:100%; margin-bottom:10px}
        input{padding:10px; box-sizing:border-box; background: var(--card-background-color); color: var(--primary-text-color); border:1px solid var(--divider-color); border-radius:6px}
        .btn{cursor:pointer; padding:10px; width:100%; border-radius:6px; border:none; font-weight:bold}
        .btn-add{background: #4caf50; color:white; margin-top:10px}
        .btn-del{background: #f44336; color:white; font-size:11px; padding:5px; margin-top:5px}
        .cust-row{border-left: 4px solid #4caf50; padding: 10px; margin-bottom:15px; background: rgba(0,0,0,0.05)}
      </style>
      <div class="editor">
        <div class="sect">
          <label>Infos Générales</label>
          <input id="in-name" placeholder="Nom de la plante">
          <input id="in-plant-image" placeholder="URL Image Plante">
          <label>Batterie</label>
          <ha-entity-picker id="p-battery" allow-custom-entity></ha-entity-picker>
        </div>

        <div class="sect">
          <label>Capteurs Standards</label>
          <ha-entity-picker id="p-moisture" label="Humidité"></ha-entity-picker>
          <ha-entity-picker id="p-temp" label="Température"></ha-entity-picker>
          <ha-entity-picker id="p-light" label="Lumière"></ha-entity-picker>
        </div>

        <div class="sect">
          <label>Capteurs Supplémentaires</label>
          <div id="custom-list"></div>
          <button class="btn btn-add" id="add-btn">+ Ajouter un capteur</button>
        </div>
      </div>`;

    this._rendered = true;
    this._updateValues();
    this._attachEvents();
  }

  _updateValues() {
    this.querySelector("#in-name").value = this._config.name || "";
    this.querySelector("#in-plant-image").value = this._config.plant_image || "";
    this.querySelector("#p-battery").value = this._config.battery_sensor || "";
    this.querySelector("#p-moisture").value = this._config.moisture_sensor || "";
    this.querySelector("#p-temp").value = this._config.temperature_sensor || "";
    this.querySelector("#p-light").value = this._config.light_sensor || "";
    this.querySelector("#p-battery").hass = this._hass;
    this.querySelector("#p-moisture").hass = this._hass;
    this.querySelector("#p-temp").hass = this._hass;
    this.querySelector("#p-light").hass = this._hass;

    const list = this.querySelector("#custom-list");
    list.innerHTML = "";
    this._config.custom_sensors.forEach((s, i) => {
        const div = document.createElement("div");
        div.className = "cust-row";
        div.innerHTML = `
            <input class="cust-n" data-idx="${i}" placeholder="Titre (ex: PH)" value="${s.name || ""}">
            <ha-entity-picker class="cust-p" data-idx="${i}" value="${s.entity || ""}"></ha-entity-picker>
            <input class="cust-u" data-idx="${i}" placeholder="Unité" value="${s.unit || ""}">
            <button class="btn btn-del" data-idx="${i}">Supprimer</button>
        `;
        list.appendChild(div);
        div.querySelector("ha-entity-picker").hass = this._hass;
    });
    this._attachEvents();
  }

  _attachEvents() {
    const fire = (key, val) => {
        this._config[key] = val;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    };

    this.querySelector("#in-name").onchange = (e) => fire("name", e.target.value);
    this.querySelector("#in-plant-image").onchange = (e) => fire("plant_image", e.target.value);
    
    ["#p-battery", "#p-moisture", "#p-temp", "#p-light"].forEach(id => {
        const el = this.querySelector(id);
        const key = id === "#p-battery" ? "battery_sensor" : 
                    id === "#p-moisture" ? "moisture_sensor" :
                    id === "#p-temp" ? "temperature_sensor" : "light_sensor";
        el.addEventListener("value-changed", (e) => fire(key, e.detail.value));
    });

    this.querySelectorAll(".cust-n").forEach(el => el.onchange = (e) => {
        this._config.custom_sensors[e.target.dataset.idx].name = e.target.value;
        fire("custom_sensors", this._config.custom_sensors);
    });

    this.querySelectorAll(".cust-p").forEach(el => el.addEventListener("value-changed", (e) => {
        this._config.custom_sensors[el.dataset.idx].entity = e.detail.value;
        fire("custom_sensors", this._config.custom_sensors);
    }));

    this.querySelectorAll(".cust-u").forEach(el => el.onchange = (e) => {
        this._config.custom_sensors[e.target.dataset.idx].unit = e.target.value;
        fire("custom_sensors", this._config.custom_sensors);
    });

    this.querySelector("#add-btn").onclick = () => {
        this._config.custom_sensors.push({name: "", entity: "", unit: ""});
        fire("custom_sensors", this._config.custom_sensors);
        this._rendered = false; this._render();
    };

    this.querySelectorAll(".btn-del").forEach(btn => btn.onclick = (e) => {
        this._config.custom_sensors.splice(e.target.dataset.idx, 1);
        fire("custom_sensors", this._config.custom_sensors);
        this._rendered = false; this._render();
    });
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
