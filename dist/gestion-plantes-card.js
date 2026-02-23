// PLANT CARD PRO v3.4.0 - Version Compacte Glassmorphism
class PlantCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }
  static getConfigElement() { return document.createElement("plant-card-editor"); }
  static getStubConfig() { return { name: "Yucca", latin_name: "Yucca gloriosa", plant_image: "https://images.truffaut.com/v3/assets/blt9969649931070404/blt687a4195156688d0/5f3a677353986a4f2149b140/0114008_1.jpg", sensors: [] }; }
  setConfig(config) { this._config = JSON.parse(JSON.stringify(config)); this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const battObj = c.battery_sensor ? this._hass.states[c.battery_sensor] : null;
    const battVal = battObj ? parseFloat(battObj.state) : null;
    const batColor = battVal == null ? "#888" : battVal > 50 ? "#4caf50" : battVal > 20 ? "#ff9800" : "#f44336";

    this.shadowRoot.innerHTML = `
      <style>
        .card {
          background: rgba(140, 198, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 12px; /* Réduit */
          color: white;
          font-family: sans-serif;
          border: 1px solid rgba(140, 198, 255, 0.2);
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('${c.plant_image || ""}');
          background-size: cover; background-position: center;
          filter: blur(8px) brightness(0.6); opacity: 0.2; z-index: -1;
        }
        .hrow { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .title { font-size: 1.1em; font-weight: bold; color: #e0f7fa; line-height: 1; }
        .latin { font-size: 0.75em; font-style: italic; color: #a7d9f7; opacity: 0.8; }
        .bat { display: flex; align-items: center; gap: 3px; font-size: 11px; font-weight: bold; color: ${batColor}; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 8px; }
        
        .main-content { display: flex; align-items: center; gap: 10px; }
        .plant-main-img { width: 60px; height: 60px; object-fit: cover; border-radius: 10px; border: 2px solid rgba(255,255,255,0.3); flex-shrink: 0; }
        
        .sensor-grid { flex-grow: 1; display: flex; flex-direction: column; gap: 6px; }
        .srow { background: rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 6px 10px; border: 1px solid rgba(255, 255, 255, 0.1); }
        .info { display: flex; align-items: center; font-size: 12px; margin-bottom: 4px; }
        .info ha-icon { margin-right: 6px; --mdc-icon-size: 16px; color: #7dd3fc; }
        .lbl { flex-grow: 1; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .val { font-weight: bold; }
        .bar-bg { background: rgba(255, 255, 255, 0.1); height: 5px; border-radius: 3px; overflow: hidden; }
        .bar-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); height: 100%; transition: width 0.8s ease; }
        .bar-warn { background: #f59e0b; }
        .bar-danger { background: #ef4444; }
      </style>
      <div class="card">
        <div class="hrow">
          <div>
            <div class="title">${c.name || "Yucca"}</div>
            ${c.latin_name ? `<div class="latin">${c.latin_name}</div>` : ""}
          </div>
          ${battVal != null ? `<div class="bat"><ha-icon icon="mdi:battery"></ha-icon>${battVal}%</div>` : ""}
        </div>
        <div class="main-content">
          ${c.plant_image ? `<img class="plant-main-img" src="${c.plant_image}">` : ''}
          <div class="sensor-grid">
            ${(c.sensors || []).map(s => {
              const st = this._hass.states[s.entity];
              const val = st ? st.state : "--";
              const num = parseFloat(val);
              const isDng = s.danger_above != null && num > s.danger_above;
              const isWrn = s.warn_below != null && num < s.warn_below;
              const pct = s.max ? Math.min(Math.max((num / s.max) * 100, 0), 100) : Math.min(Math.max(num, 0), 100);
              return `<div class="srow">
                <div class="info"><ha-icon icon="${s.icon || "mdi:sprout"}"></ha-icon><span class="lbl">${s.name}</span><span class="val">${val}${s.unit||""}</span></div>
                <div class="bar-bg"><div class="${isDng?'bar-fill bar-danger':isWrn?'bar-fill bar-warn':'bar-fill'}" style="width:${isNaN(pct)?0:pct}%"></div></div>
              </div>`;
            }).join("")}
          </div>
        </div>
      </div>`;
  }
}

// L'éditeur reste identique pour garder la main sur les réglages
class PlantCardEditor extends HTMLElement {
  setConfig(config) { this._config = JSON.parse(JSON.stringify(config)); this._render(); }
  set hass(hass) { this._hass = hass; }
  _render() {
    if (this._initialRenderDone) return;
    this.innerHTML = `
      <style>
        .edit-wrap{padding:15px;font-family:sans-serif;color:white;background: #1c2a48; border-radius:12px;}
        .section{background:rgba(255,255,255,0.1);padding:10px;border-radius:10px;margin-bottom:10px;border:1px solid rgba(255,255,255,0.2);}
        input{width:100%;padding:8px;margin:5px 0;box-sizing:border-box;border-radius:6px;border:1px solid #3e5b99;background:#0d162a;color:white;}
        label{font-size:12px;font-weight:bold;color:#a5b4fc;}
        .scard{background:rgba(255,255,255,0.05);padding:10px;border-radius:10px;margin-bottom:8px;}
        .btn-add{width:100%;padding:10px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;}
        .del{color:#ff8a80;border:none;background:none;cursor:pointer;font-weight:bold;}
      </style>
      <div class="edit-wrap">
        <h3 style="margin:0 0 10px 0;font-size:16px;">Config Compacte</h3>
        <div class="section">
          <label>Nom</label><input id="n" data-conf="name" value="${this._config.name||""}">
          <label>Latin</label><input id="lat" data-conf="latin_name" value="${this._config.latin_name||""}">
          <label>Image</label><input id="img" data-conf="plant_image" value="${this._config.plant_image||""}">
          <label>Batterie</label><input id="bat" data-conf="battery_sensor" value="${this._config.battery_sensor||""}">
        </div>
        <div id="s-list"></div>
        <button id="add" class="btn-add">+ CAPTEUR</button>
      </div>`;
    this._initialRenderDone = true;
    this._attachEvents();
    this._renderSensors();
  }
  _attachEvents() {
    this.querySelectorAll("input[data-conf]").forEach(el => {
      el.addEventListener("change", (e) => { this._config[e.target.dataset.conf] = e.target.value; this._fire(); });
    });
    this.querySelector("#add").onclick = () => {
      if(!this._config.sensors) this._config.sensors = [];
      this._config.sensors.push({name:"Humidité", entity:"", icon:"mdi:water", unit:"%", max:100, warn_below:20, danger_above:80});
      this._fire(); this._renderSensors();
    };
  }
  _renderSensors() {
    const list = this.querySelector("#s-list");
    list.innerHTML = "";
    (this._config.sensors || []).forEach((s, i) => {
      const d = document.createElement("div"); d.className = "scard";
      d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:11px;color:#60a5fa">SENS ${i+1}</b><button class="del">X</button></div>
        <input class="sn" placeholder="Nom" value="${s.name}">
        <input class="se" placeholder="Entité" value="${s.entity}">
        <div style="display:flex;gap:4px">
          <input class="sw" type="number" placeholder="Min" value="${s.warn_below}">
          <input class="sd" type="number" placeholder="Max" value="${s.danger_above}">
          <input class="sm" type="number" placeholder="Barre Max" value="${s.max}">
        </div>`;
      const upd = (cls, field, isNum) => {
        d.querySelector(cls).addEventListener("change", (e) => {
          this._config.sensors[i][field] = isNum ? parseFloat(e.target.value) : e.target.value; this._fire();
        });
      };
      upd(".sn", "name"); upd(".se", "entity"); upd(".sw", "warn_below", true); upd(".sd", "danger_above", true); upd(".sm", "max", true);
      d.querySelector(".del").onclick = () => { this._config.sensors.splice(i, 1); this._fire(); this._renderSensors(); };
      list.appendChild(d);
    });
  }
  _fire() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro" });
