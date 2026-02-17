// PLANT CARD v1.3.1 — Batterie dans le titre & Sélecteur stable

class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return {
      name: "Ma plante", subtitle: "Monstera Deliciosa",
      moisture_sensor: "", temperature_sensor: "",
      conductivity_sensor: "", light_sensor: "", battery_sensor: "",
    };
  }

  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }

  _render() {
    const c = this._config;
    if (!c || !this._hass) return;

    const getVal = (eid) => {
      if (!eid || !this._hass.states[eid]) return null;
      return parseFloat(this._hass.states[eid].state);
    };

    const moisture = getVal(c.moisture_sensor);
    const temp     = getVal(c.temperature_sensor);
    const cond     = getVal(c.conductivity_sensor);
    const light    = getVal(c.light_sensor);
    const battery  = getVal(c.battery_sensor);

    const bar = (pct) => {
      const w = (pct == null || isNaN(pct)) ? 0 : Math.min(Math.max(pct, 0), 100);
      return `<div class="bar"><div class="fill" style="width:${w}%"></div></div>`;
    };

    const batteryDisplay = battery != null 
      ? `<span class="batt ${battery < 20 ? 'low' : ''}">&#128267; ${battery}%</span>` 
      : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block}
        .bg{position:relative;border-radius:24px;overflow:hidden;color:white;font-family:sans-serif;background:#222}
        .bg-img{width:100%;height:100%;object-fit:cover;filter:blur(6px) brightness(.6);position:absolute;inset:0}
        .card{position:relative;padding:24px;backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.3);border-radius:24px;background:rgba(255,255,255,.08);box-shadow:0 10px 40px rgba(0,0,0,.4)}
        .header{display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:4px}
        h1{margin:0;font-size:24px;font-weight:700}
        .batt{font-size:14px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;font-weight:400}
        .batt.low{background:rgba(255,80,80,0.4);color:#ff5a5a}
        h2{margin:0 0 20px;font-size:16px;opacity:.7;font-style:italic;text-align:center}
        .plant-img{display:block;margin:0 auto 20px;max-height:150px;filter:drop-shadow(0 10px 10px rgba(0,0,0,0.5))}
        .row{margin:14px 0}
        .lbl{display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-bottom:6px;opacity:.9}
        .val{color:#5ce1e6;font-weight:600}
        .bar{height:6px;background:rgba(255,255,255,.2);border-radius:10px;overflow:hidden}
        .fill{height:100%;background:linear-gradient(90deg,#4fd1c5,#63b3ed);border-radius:10px;transition:width .4s}
        .danger{color:#ff5a5a;font-weight:600;font-size:12px;margin-left:5px}
      </style>
      <div class="bg">
        ${c.image ? `<img class="bg-img" src="${c.image}">` : ""}
        <div class="card">
          <div class="header">
            <h1>${c.name || "Ma plante"}</h1>
            ${batteryDisplay}
          </div>
          <h2>${c.subtitle || ""}</h2>
          ${c.plant_image ? `<img class="plant-img" src="${c.plant_image}">` : ""}
          
          ${c.moisture_sensor ? `<div class="row"><div class="lbl"><span>💧 Humidité</span><span class="val">${moisture ?? "--"}%</span></div>${bar(moisture)}</div>` : ""}
          ${c.conductivity_sensor ? `<div class="row"><div class="lbl"><span>🌿 Engrais</span><span class="val">${cond ?? "--"} µS/cm</span></div>${bar(cond ? cond/20 : 0)}</div>` : ""}
          ${c.light_sensor ? `<div class="row"><div class="lbl"><span>☀️ Lumière</span><span class="val">${light ?? "--"} lx</span></div>${bar(light ? light/100 : 0)}</div>` : ""}
          ${c.temperature_sensor ? `<div class="row"><div class="lbl"><span>🌡️ Température</span><span class="val">${temp ?? "--"}°C ${temp > 30 ? '<span class="danger">⚠</span>' : ''}</span></div>${bar(temp ? temp*2.5 : 0)}</div>` : ""}
        </div>
      </div>`;
  }
}

// ============================================================
// ÉDITEUR
// ============================================================
class PlantCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._ready = false;
  }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = { ...config };
    if (!this._ready) { this._build(); this._ready = true; }
    this._sync();
  }

  _build() {
    this.innerHTML = `
      <style>
        .editor{padding:16px;font-family:sans-serif;background:#fff;color:#333}
        .section{background:#f4f4f4;border-radius:8px;padding:12px;margin-bottom:12px;border:1px solid #ddd}
        label{display:block;font-size:12px;font-weight:bold;margin-bottom:4px;color:#666}
        input{width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;margin-bottom:10px;box-sizing:border-box}
        .picker-wrap{position:relative}
        .suggestions{position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ccc;max-height:150px;overflow-y:auto;z-index:100;display:none;box-shadow:0 4px 8px rgba(0,0,0,0.1)}
        .item{padding:8px;cursor:pointer;border-bottom:1px solid #eee;font-size:12px}
        .item:hover{background:#f0f7ff}
      </style>
      <div class="editor">
        <div class="section">
          <label>Nom & Sous-titre</label>
          <input data-key="name" placeholder="Nom">
          <input data-key="subtitle" placeholder="Sous-titre">
        </div>
        <div class="section">
          <label>Images (URL)</label>
          <input data-key="image" placeholder="Image de fond">
          <input data-key="plant_image" placeholder="Image de la plante">
        </div>
        <div class="section">
          <label>Capteurs (Tapez pour chercher)</label>
          ${["moisture_sensor", "conductivity_sensor", "light_sensor", "temperature_sensor", "battery_sensor"].map(k => `
            <div class="picker-wrap">
              <label>${k.replace('_', ' ')}</label>
              <input class="pkr" data-key="${k}" autocomplete="off">
              <div class="suggestions" id="sug-${k}"></div>
            </div>
          `).join('')}
        </div>
      </div>`;

    this.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", (e) => {
        const key = e.target.dataset.key;
        const val = e.target.value;
        this._config[key] = val;

        if (e.target.classList.contains("pkr")) {
          this._showSug(e.target);
        }

        clearTimeout(this._timer);
        this._timer = setTimeout(() => this._fire(), 400);
      });

      input.addEventListener("focus", (e) => {
        if (e.target.classList.contains("pkr")) this._showSug(e.target);
      });

      input.addEventListener("blur", () => {
        setTimeout(() => { this.querySelectorAll(".suggestions").forEach(s => s.style.display="none"); }, 200);
      });
    });
  }

  _showSug(input) {
    const key = input.dataset.key;
    const list = this.querySelector(`#sug-${key}`);
    const query = input.value.toLowerCase();
    const entities = Object.keys(this._hass.states)
      .filter(id => id.includes("sensor.") && id.toLowerCase().includes(query))
      .slice(0, 20);

    if (entities.length > 0) {
      list.innerHTML = entities.map(id => `<div class="item" data-id="${id}">${id}</div>`).join("");
      list.style.display = "block";
      list.querySelectorAll(".item").forEach(item => {
        item.onclick = () => {
          input.value = item.dataset.id;
          this._config[key] = item.dataset.id;
          list.style.display = "none";
          this._fire();
        };
      });
    } else {
      list.style.display = "none";
    }
  }

  _sync() {
    this.querySelectorAll("input").forEach(input => {
      const key = input.dataset.key;
      if (document.activeElement !== input) input.value = this._config[key] || "";
    });
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card", preview: true });
