// PLANT CARD PRO v3.2.2 - Correction du défilement lors de la saisie
class PlantCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }
  static getConfigElement() { return document.createElement("plant-card-editor"); }
  static getStubConfig() { return { name: "Spathiphyllum", plant_image: "https://www.fleuriste-marseille.com/wp-content/uploads/2021/04/spathiphyllum.jpg", sensors: [] }; }
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
        .card{background:var(--ha-card-background,#1c1c1c);border-radius:15px;padding:20px;color:white;border:1px solid #333;font-family:sans-serif}
        .hrow{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px}
        .title{font-size:1.4em;font-weight:bold;color:#4caf50}
        .bat{display:flex;align-items:center;gap:4px;font-size:14px;font-weight:600;color:${batColor}}
        .plant-img{display:block;width:120px;height:120px;object-fit:cover;margin:0 auto 20px;border-radius:50%;border:3px solid #4caf50;box-shadow:0 4px 10px rgba(0,0,0,0.5)}
        .srow{margin-bottom:14px}
        .info{display:flex;align-items:center;font-size:14px;margin-bottom:6px}
        .info ha-icon{margin-right:10px;--mdc-icon-size:20px;color:#4caf50}
        .lbl{flex-grow:1;opacity:.9}
        .val{font-weight:bold}
        .bar-bg{background:rgba(255,255,255,.1);height:8px;border-radius:4px;overflow:hidden}
        .bar-fill{background:linear-gradient(90deg,#4caf50,#81c784);height:100%;transition:width .8s ease}
        .bar-warn{background:linear-gradient(90deg,#ff9800,#ffc107)}
        .bar-danger{background:linear-gradient(90deg,#f44336,#ff5252)}
      </style>
      <div class="card">
        <div class="hrow">
          <div class="title">${c.name || "Ma Plante"}</div>
          ${battVal != null ? `<div class="bat"><ha-icon icon="mdi:battery"></ha-icon>${battVal}%</div>` : ""}
        </div>
        <img class="plant-img" src="${c.plant_image || ""}">
        ${(c.sensors || []).map(s => {
          const st = this._hass.states[s.entity];
          const val = st ? st.state : "--";
          const num = parseFloat(val);
          const isDng = s.danger_above != null && num > s.danger_above;
          const isWrn = s.warn_below != null && num < s.warn_below;
          const pct = s.max ? Math.min(Math.max((num / s.max) * 100, 0), 100) : Math.min(Math.max(num, 0), 100);
          return `<div class="srow">
            <div class="info"><ha-icon icon="${s.icon || "mdi:sprout"}"></ha-icon><span class="lbl">${s.name}</span><span class="val">${val} ${s.unit||""}</span></div>
            <div class="bar-bg"><div class="${isDng?'bar-fill bar-danger':isWrn?'bar-fill bar-warn':'bar-fill'}" style="width:${isNaN(pct)?0:pct}%"></div></div>
          </div>`;
        }).join("")}
      </div>`;
  }
}

class PlantCardEditor extends HTMLElement {
  setConfig(config) { this._config = JSON.parse(JSON.stringify(config)); this._render(); }
  set hass(hass) { this._hass = hass; }

  _render() {
    if (this._initialRenderDone) return; // Empêche le re-rendu total à chaque frappe
    
    this.innerHTML = `
      <style>
        .edit-wrap{padding:10px;font-family:sans-serif;color:#333}
        .section{background:#f0f0f0;padding:12px;border-radius:10px;margin-bottom:10px;border:1px solid #ddd}
        input{width:100%;padding:8px;margin:5px 0;box-sizing:border-box;border-radius:5px;border:1px solid #ccc}
        label{font-size:12px;font-weight:bold;color:#666}
        .scard{background:white;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px}
        .btn-add{width:100%;padding:12px;background:#4caf50;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold}
      </style>
      <div class="edit-wrap">
        <div class="section">
          <label>Nom de la plante</label><input id="n" data-conf="name" value="${this._config.name||""}">
          <label>URL Image</label><input id="img" data-conf="plant_image" value="${this._config.plant_image||""}">
          <label>Batterie (sensor...)</label><input id="bat" data-conf="battery_sensor" value="${this._config.battery_sensor||""}">
        </div>
        <div id="s-list"></div>
        <button id="add" class="btn-add">+ Ajouter un Capteur</button>
      </div>`;

    this._initialRenderDone = true;
    this._attachEvents();
    this._renderSensors();
  }

  _attachEvents() {
    this.querySelectorAll("input[data-conf]").forEach(el => {
      el.addEventListener("change", (e) => {
        this._config[e.target.dataset.conf] = e.target.value;
        this._fire();
      });
    });
    this.querySelector("#add").onclick = () => {
      if(!this._config.sensors) this._config.sensors = [];
      this._config.sensors.push({name:"Humidité", entity:"", icon:"mdi:water", unit:"%", max:100, warn_below:20, danger_above:80});
      this._fire();
      this._renderSensors();
    };
  }

  _renderSensors() {
    const list = this.querySelector("#s-list");
    list.innerHTML = "";
    (this._config.sensors || []).forEach((s, i) => {
      const d = document.createElement("div");
      d.className = "scard";
      d.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b style="color:#4caf50">CAPTEUR ${i+1}</b>
          <button class="del" data-idx="${i}" style="color:#f44336;border:none;background:none;cursor:pointer;font-weight:bold">Supprimer</button>
        </div>
        <label>Nom</label><input class="sn" data-idx="${i}" value="${s.name}">
        <label>Entité</label><input class="se" data-idx="${i}" value="${s.entity}">
        <div style="display:flex;gap:5px">
          <div><label>Icône</label><input class="si" data-idx="${i}" value="${s.icon}"></div>
          <div><label>Unité</label><input class="su" data-idx="${i}" value="${s.unit}"></div>
          <div><label>Max</label><input class="sm" data-idx="${i}" type="number" value="${s.max}"></div>
        </div>
        <div style="display:flex;gap:5px;margin-top:5px;background:#fff9c4;padding:5px;border-radius:5px">
          <div><label>Min (Rouge)</label><input class="sw" data-idx="${i}" type="number" value="${s.warn_below}"></div>
          <div><label>Max (Rouge)</label><input class="sd" data-idx="${i}" type="number" value="${s.danger_above}"></div>
        </div>`;
      
      const upd = (cls, field, isNum) => {
        d.querySelector(cls).addEventListener("change", (e) => {
          this._config.sensors[i][field] = isNum ? parseFloat(e.target.value) : e.target.value;
          this._fire();
        });
      };

      upd(".sn", "name"); upd(".se", "entity"); upd(".si", "icon"); upd(".su", "unit");
      upd(".sm", "max", true); upd(".sw", "warn_below", true); upd(".sd", "danger_above", true);
      
      d.querySelector(".del").onclick = () => {
        this._config.sensors.splice(i, 1);
        this._fire();
        this._renderSensors();
      };
      list.appendChild(d);
    });
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro" });
