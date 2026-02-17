// PLANT CARD PRO v3.1.2 - Édition Stable
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
                ${isDng ? `<span class="alert" title="Trop haut">⚠️</span>` : ""}
                ${isWrn ? `<span class="alert" title="Trop bas">💧</span>` : ""}
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
    try {
      await this._hass.callService("openplantbook", "search", { alias: query });
      await new Promise(r => setTimeout(r, 2000));
      let found = null;
      for (const eid in this._hass.states) {
        const s = this._hass.states[eid];
        if (eid.includes("openplantbook") && s.attributes?.results) { found = s.attributes.results; break; }
      }
      if (!found) { status.textContent = "Aucun résultat trouvé dans les états HA."; return; }
      
      const list = Array.isArray(found) ? found : Object.values(found);
      status.textContent = "Résultats :";
      results.innerHTML = list.map(p => `
        <div class="opb-item" style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:8px;margin-bottom:5px;border-radius:5px;border:1px solid #ddd;color:#333">
          <div style="font-size:12px"><b>${p.display_pid || p.pid}</b><br>${p.pid}</div>
          <button class="opb-btn" data-pid="${p.pid}" style="background:#4caf50;color:white;border:none;padding:5px;border-radius:4px;cursor:pointer">Utiliser</button>
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
        // Mapping automatique simple
        this._config.sensors.forEach(s => {
          const n = (s.name || "").toLowerCase();
          if (n.includes("humid") || n.includes("sol")) { s.warn_below = a.min_soil_moist; s.danger_above = a.max_soil_moist; }
          if (n.includes("temp")) { s.warn_below = a.min_temp; s.danger_above = a.max_temp; }
        });
        this._fire();
        this.querySelector("#opb-status").textContent = "✓ Seuils appliqués pour " + pid;
      }
    } catch(e) { alert("Erreur chargement: " + e.message); }
  }

  _build() {
    this.innerHTML = `
      <style>
        .section{background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:12px;color:#333}
        .field{margin-bottom:10px}
        label{display:block;font-size:12px;font-weight:bold}
        input{width:100%;padding:8px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px}
        button{cursor:pointer;margin-top:5px}
        .scard{border:1px solid #ddd;padding:10px;margin-bottom:10px;border-radius:5px;background:#fff}
      </style>
      <div class="section" style="background:#e8f5e9">
        <label>Recherche OpenPlantBook</label>
        <div style="display:flex;gap:5px"><input id="opb-query" placeholder="Spathiphyllum..."><button id="opb-btn">Chercher</button></div>
        <div id="opb-status" style="font-size:11px;margin-top:5px"></div>
        <div id="opb-results"></div>
      </div>
      <div class="section">
        <label>Nom</label><input id="f-name" value="${this._config.name || ""}">
        <label>Image</label><input id="f-img" value="${this._config.plant_image || ""}">
        <label>Entité Batterie</label><input id="f-batt" value="${this._config.battery_sensor || ""}">
      </div>
      <div class="section">
        <label>Capteurs</label>
        <div id="sensor-list"></div>
        <button id="add-s" style="width:100%;padding:10px;background:#4caf50;color:white;border:none;border-radius:5px">+ Ajouter Capteur</button>
      </div>`;

    this.querySelector("#opb-btn").onclick = () => this._opbSearch(this.querySelector("#opb-query").value);
    this.querySelector("#f-name").oninput = (e) => { this._config.name = e.target.value; this._fire(); };
    this.querySelector("#f-img").oninput = (e) => { this._config.plant_image = e.target.value; this._fire(); };
    this.querySelector("#f-batt").oninput = (e) => { this._config.battery_sensor = e.target.value; this._fire(); };
    this.querySelector("#add-s").onclick = () => { this._config.sensors.push({name:"Nouveau", entity:"", unit:"%"}); this._fire(); this._renderSensors(); };
    this._renderSensors();
  }

  _renderSensors() {
    const list = this.querySelector("#sensor-list");
    list.innerHTML = this._config.sensors.map((s, i) => `
      <div class="scard">
        <label>Nom</label><input class="sn" data-i="${i}" value="${s.name}">
        <label>Entité</label><input class="se" data-i="${i}" value="${s.entity}">
        <div style="display:flex;gap:5px">
          <div><label>Min</label><input class="sw" data-i="${i}" type="number" value="${s.warn_below || ""}"></div>
          <div><label>Max</label><input class="sd" data-i="${i}" type="number" value="${s.danger_above || ""}"></div>
        </div>
        <button class="del-s" data-i="${i}" style="color:red;border:none;background:none;font-size:11px">Supprimer</button>
      </div>`).join("");

    list.querySelectorAll("input").forEach(input => {
      input.oninput = (e) => {
        const i = e.target.dataset.i;
        if(e.target.classList.contains("sn")) this._config.sensors[i].name = e.target.value;
        if(e.target.classList.contains("se")) this._config.sensors[i].entity = e.target.value;
        if(e.target.classList.contains("sw")) this._config.sensors[i].warn_below = parseFloat(e.target.value);
        if(e.target.classList.contains("sd")) this._config.sensors[i].danger_above = parseFloat(e.target.value);
        this._fire();
      };
    });
    list.querySelectorAll(".del-s").forEach(btn => btn.onclick = (e) => { this._config.sensors.splice(e.target.dataset.i, 1); this._fire(); this._renderSensors(); });
  }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro" });
