// PLANT CARD PRO v3.1.3 - Version Complète Fixée
class PlantCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }

  static getConfigElement() { return document.createElement("plant-card-editor"); }
  static getStubConfig() {
    return { name: "Ma Plante", plant_image: "/local/fleurdelune.png", sensors: [] };
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = [];
    this._render();
  }

  set hass(hass) { this._hass = hass; this._render(); }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const battObj = c.battery_sensor ? this._hass.states[c.battery_sensor] : null;
    const battVal = battObj ? parseFloat(battObj.state) : null;
    const batColor = battVal == null ? "#888" : battVal > 50 ? "#4caf50" : battVal > 20 ? "#ff9800" : "#f44336";

    this.shadowRoot.innerHTML = `
      <style>
        .card{background:var(--ha-card-background,#1c1c1c);border-radius:15px;padding:20px;color:white;border:1px solid #333}
        .hrow{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px}
        .title{font-size:1.4em;font-weight:bold;color:#4caf50}
        .opb-sub{font-size:11px;color:#81c784;opacity:.7;margin-top:2px}
        .bat{display:flex;align-items:center;gap:4px;font-size:.9em;font-weight:600;color:${batColor}}
        .bat ha-icon{--mdc-icon-size:20px}
        .plant-img{display:block;width:120px;height:120px;object-fit:cover;margin:0 auto 20px;border-radius:50%;border:3px solid #4caf50;box-shadow:0 4px 10px rgba(0,0,0,.5)}
        .srow{margin-bottom:14px}
        .info{display:flex;align-items:center;font-size:14px;margin-bottom:6px}
        .info ha-icon{margin-right:10px;--mdc-icon-size:20px;color:#4caf50}
        .lbl{flex-grow:1;opacity:.9}
        .val{font-weight:bold}
        .unit{font-size:.8em;color:#aaa;margin-left:2px}
        .alert{font-size:16px;margin-left:6px}
        .bar-bg{background:rgba(255,255,255,.1);height:8px;border-radius:4px;overflow:hidden}
        .bar-fill{background:linear-gradient(90deg,#4caf50,#81c784);height:100%;transition:width .8s ease}
        .bar-warn{background:linear-gradient(90deg,#ff9800,#ffc107)}
        .bar-danger{background:linear-gradient(90deg,#f44336,#ff5252)}
      </style>
      <div class="card">
        <div class="hrow">
          <div>
            <div class="title">${c.name || "Plante"}</div>
            ${c.opb_pid ? `<div class="opb-sub">&#127807; ${c.opb_pid}</div>` : ""}
          </div>
          ${battVal != null ? `<div class="bat"><ha-icon icon="mdi:battery"></ha-icon>${battVal}%</div>` : ""}
        </div>
        <img class="plant-img" src="${c.plant_image || "/local/fleurdelune.png"}">
        ${(c.sensors || []).map(s => {
          if (!s?.entity) return "";
          const st = this._hass.states[s.entity];
          const val = st ? st.state : "--";
          const num = parseFloat(val);
          const isDng = s.danger_above != null && num > s.danger_above;
          const isWrn = s.warn_below != null && num < s.warn_below;
          const pct = s.max ? Math.min(Math.max((num / s.max) * 100, 0), 100) : Math.min(Math.max(num, 0), 100);
          
          let barClass = "bar-fill";
          if (isDng) barClass += " bar-danger";
          else if (isWrn) barClass += " bar-warn";

          return `
            <div class="srow">
              <div class="info">
                <ha-icon icon="${s.icon || "mdi:sprout"}"></ha-icon>
                <span class="lbl">${s.name || "Capteur"}</span>
                <span class="val">${val}<span class="unit">${s.unit || ""}</span></span>
                ${isDng ? `<span class="alert">⚠️</span>` : ""}
                ${isWrn ? `<span class="alert">💧</span>` : ""}
              </div>
              <div class="bar-bg"><div class="${barClass}" style="width:${isNaN(pct) ? 0 : pct}%"></div></div>
            </div>`;
        }).join("")}
      </div>`;
  }
}

// ============================================================
// EDITEUR
// ============================================================
class PlantCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._ready = false;
  }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = [];
    if (!this._ready) { this._build(); this._ready = true; }
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true,
    }));
  }

  async _opbSearch(query) {
    const status = this.querySelector("#opb-status");
    const results = this.querySelector("#opb-results");
    if (!query) return;
    status.textContent = "Recherche...";
    results.innerHTML = "";
    try {
      await this._hass.callService("openplantbook", "search", { alias: query });
      await new Promise(r => setTimeout(r, 2000));
      
      let found = null;
      for (const eid in this._hass.states) {
        const s = this._hass.states[eid];
        const attr = s.attributes;
        if (attr && (attr.results || attr.data || attr.plant_list)) {
          if (eid.includes("openplantbook") || attr.friendly_name?.toLowerCase().includes("plant")) {
            found = attr.results || attr.data || attr.plant_list;
            break;
          }
        }
      }

      if (!found) { status.textContent = "Aucun résultat trouvé dans les états HA."; return; }
      
      const list = Array.isArray(found) ? found : Object.values(found);
      status.textContent = "Plantes trouvées :";
      results.innerHTML = list.map(p => `
        <div class="opb-item" style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:8px;margin-bottom:5px;border-radius:5px;border:1px solid #ddd;color:#333">
          <div style="font-size:12px"><b>${p.display_pid || p.pid}</b><br>${p.pid}</div>
          <button class="opb-btn" data-pid="${p.pid}" style="background:#4caf50;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer">Utiliser</button>
        </div>`).join("");

      results.querySelectorAll(".opb-btn").forEach(btn => {
        btn.onclick = () => this._opbLoadPlant(btn.dataset.pid);
      });
    } catch(e) { status.textContent = "Erreur: " + e.message; }
  }

  async _opbLoadPlant(pid) {
    try {
      await this._hass.callService("openplantbook", "get_plant", { plant_pid: pid });
      await new Promise(r => setTimeout(r, 1500));
      const plantState = Object.values(this._hass.states).find(s => s.attributes?.pid === pid || s.attributes?.plant_pid === pid);
      if (plantState) {
        const a = plantState.attributes;
        this._config.opb_pid = pid;
        this._config.name = this._config.name || a.display_pid || pid;
        this._config.sensors.forEach(s => {
          const n = (s.name || "").toLowerCase();
          if (n.includes("humid") || n.includes("sol")) { s.warn_below = a.min_soil_moist; s.danger_above = a.max_soil_moist; s.max = 100; s.icon = "mdi:water"; }
          if (n.includes("temp")) { s.warn_below = a.min_temp; s.danger_above = a.max_temp; s.max = 50; s.icon = "mdi:thermometer"; }
          if (n.includes("lum") || n.includes("lux")) { s.warn_below = a.min_light_lux; s.danger_above = a.max_light_lux; s.max = a.max_light_lux * 1.2; s.icon = "mdi:white-balance-sunny"; }
        });
        this._fire();
        this._build(); // Rafraîchir l'éditeur
      }
    } catch(e) { alert("Erreur: " + e.message); }
  }

  _build() {
    this.innerHTML = `
      <style>
        .wrap{padding:10px;color:#333;font-family:sans-serif}
        .section{background:#f4f4f4;padding:12px;border-radius:10px;margin-bottom:15px}
        .field{margin-bottom:12px}
        label{display:block;font-size:12px;font-weight:bold;margin-bottom:4px}
        input{width:100%;padding:8px;box-sizing:border-box;border:1px solid #ccc;border-radius:5px}
        button{cursor:pointer;font-weight:bold}
        .scard{border:1px solid #ddd;padding:12px;margin-bottom:10px;border-radius:8px;background:#fff}
        .btn-add{width:100%;padding:12px;background:#4caf50;color:white;border:none;border-radius:8px}
        .btn-del{background:none;border:none;color:#f44336;font-size:12px;padding:0}
      </style>
      <div class="wrap">
        <div class="section" style="background:#e8f5e9;border:1px solid #c8e6c9">
          <label>🌿 OpenPlantBook (HACS)</label>
          <div style="display:flex;gap:5px"><input id="opb-query" placeholder="Ex: Spathiphyllum"><button id="opb-btn" style="padding:8px;background:#4caf50;color:white;border:none;border-radius:5px">Chercher</button></div>
          <div id="opb-status" style="font-size:11px;margin-top:5px;color:#2e7d32"></div>
          <div id="opb-results" style="margin-top:5px"></div>
        </div>
        <div class="section">
          <div class="field"><label>Nom de la plante</label><input id="f-name" value="${this._config.name || ""}"></div>
          <div class="field"><label>URL Image</label><input id="f-img" value="${this._config.plant_image || ""}"></div>
          <div class="field"><label>Entité Batterie</label><input id="f-batt" value="${this._config.battery_sensor || ""}"></div>
        </div>
        <div class="section">
          <label>Capteurs de données</label>
          <div id="sensor-list"></div>
          <button class="btn-add" id="add-s">+ Ajouter un capteur</button>
        </div>
      </div>`;

    this.querySelector("#opb-btn").onclick = () => this._opbSearch(this.querySelector("#opb-query").value);
    this.querySelector("#f-name").oninput = (e) => { this._config.name = e.target.value; this._fire(); };
    this.querySelector("#f-img").oninput = (e) => { this._config.plant_image = e.target.value; this._fire(); };
    this.querySelector("#f-batt").oninput = (e) => { this._config.battery_sensor = e.target.value; this._fire(); };
    this.querySelector("#add-s").onclick = () => { this._config.sensors.push({name:"Nouveau", entity:"", icon:"mdi:water", unit:"%"}); this._fire(); this._renderSensors(); };
    this._renderSensors();
  }

  _renderSensors() {
    const list = this.querySelector("#sensor-list");
    list.innerHTML = this._config.sensors.map((s, i) => `
      <div class="scard">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b style="font-size:13px">Capteur ${i+1}</b>
          <button class="btn-del" data-i="${i}">Supprimer</button>
        </div>
        <div class="field"><label>Nom</label><input class="sn" data-i="${i}" value="${s.name || ""}"></div>
        <div class="field"><label>Entité</label><input class="se" data-i="${i}" value="${s.entity || ""}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="field"><label>Icône (mdi:...)</label><input class="si" data-i="${i}" value="${s.icon || "mdi:water"}"></div>
          <div class="field"><label>Unité</label><input class="su" data-i="${i}" value="${s.unit || ""}"></div>
          <div class="field"><label>Alerte si <</label><input class="sw" data-i="${i}" type="number" value="${s.warn_below || ""}"></div>
          <div class="field"><label>Alerte si ></label><input class="sd" data-i="${i}" type="number" value="${s.danger_above || ""}"></div>
        </div>
        <div class="field"><label>Valeur Max barre (ex: 100)</label><input class="sm" data-i="${i}" type="number" value="${s.max || ""}"></div>
      </div>`).join("");

    list.querySelectorAll("input").forEach(input => {
      input.oninput = (e) => {
        const i = e.target.dataset.i;
        const val = e.target.value;
        if(e.target.classList.contains("sn")) this._config.sensors[i].name = val;
        if(e.target.classList.contains("se")) this._config.sensors[i].entity = val;
        if(e.target.classList.contains("si")) this._config.sensors[i].icon = val;
        if(e.target.classList.contains("su")) this._config.sensors[i].unit = val;
        if(e.target.classList.contains("sw")) this._config.sensors[i].warn_below = val === "" ? undefined : parseFloat(val);
        if(e.target.classList.contains("sd")) this._config.sensors[i].danger_above = val === "" ? undefined : parseFloat(val);
        if(e.target.classList.contains("sm")) this._config.sensors[i].max = val === "" ? undefined : parseFloat(val);
        this._fire();
      };
    });
    list.querySelectorAll(".btn-del").forEach(btn => btn.onclick = (e) => { 
      this._config.sensors.splice(e.target.dataset.i, 1); 
      this._fire(); this._renderSensors(); 
    });
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
