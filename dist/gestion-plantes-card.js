// PLANT CARD PRO v3.1.6 - Scan Profond de l'entité de recherche
class PlantCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }
  static getConfigElement() { return document.createElement("plant-card-editor"); }
  static getStubConfig() { return { name: "Ma Plante", plant_image: "/local/fleurdelune.png", sensors: [] }; }
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
        .opb-sub{font-size:11px;color:#81c784;opacity:.7;margin-top:2px}
        .bat{display:flex;align-items:center;gap:4px;font-size:.9em;font-weight:600;color:${batColor}}
        .bat ha-icon{--mdc-icon-size:20px}
        .plant-img{display:block;width:120px;height:120px;object-fit:cover;margin:0 auto 20px;border-radius:50%;border:3px solid #4caf50;box-shadow:0 4px 10px rgba(0,0,0,.5)}
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
          <div><div class="title">${c.name || "Plante"}</div>${c.opb_pid ? `<div class="opb-sub">🌿 ${c.opb_pid}</div>` : ""}</div>
          ${battVal != null ? `<div class="bat"><ha-icon icon="mdi:battery"></ha-icon>${battVal}%</div>` : ""}
        </div>
        <img class="plant-img" src="${c.plant_image || "/local/fleurdelune.png"}">
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

  async _opbSearch(query) {
    const status = this.querySelector("#opb-status");
    const results = this.querySelector("#opb-results");
    status.textContent = "🔍 Interrogation de l'API...";
    results.innerHTML = "";
    
    try {
      await this._hass.callService("openplantbook", "search", { alias: query });
      
      // On attend 3 secondes pour laisser le temps au cloud de répondre
      await new Promise(r => setTimeout(r, 3000));
      
      let found = null;
      const opbState = this._hass.states["openplantbook.search_result"];

      if (opbState) {
        const attr = opbState.attributes;
        // SCAN TOUS LES ATTRIBUTS POSSIBLES
        found = attr.results || attr.data || attr.plant_list || attr.items || attr.list;
        
        // SI PAS DANS LES ATTRIBUTS, REGARDER L'ETAT
        if (!found && opbState.state && opbState.state !== "unknown" && opbState.state !== "none") {
          try {
            // Est-ce du JSON dans le texte ?
            found = JSON.parse(opbState.state);
          } catch(e) {
            // Est-ce du texte avec des deux-points ?
            const lines = opbState.state.split('\n');
            if (lines.length > 0 && lines[0].includes(':')) {
              found = lines.map(line => {
                const parts = line.split(':');
                return { pid: parts[0].trim(), display_pid: parts[1] ? parts[1].trim() : parts[0].trim() };
              });
            }
          }
        }
      }

      if (!found || (Array.isArray(found) && found.length === 0)) {
        status.innerHTML = `<span style="color:red">❌ Données toujours vides.</span><br><small>Vérifiez que l'API OpenPlantBook n'est pas en erreur.</small>`;
        return;
      }
      
      const list = Array.isArray(found) ? found : Object.values(found);
      status.textContent = "✅ " + list.length + " variétés trouvées :";
      results.innerHTML = list.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:10px;margin-bottom:8px;border-radius:8px;color:#333;border:1px solid #4caf50;box-shadow: 0 2px 4px rgba(0,0,0,0.1)">
          <div style="font-size:11px"><b>${p.display_pid || p.pid}</b><br><small style="color:#666">${p.pid}</small></div>
          <button style="background:#4caf50;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:bold" onclick="this.closest('plant-card-editor')._opbLoadPlant('${p.pid}')">Utiliser</button>
        </div>`).join("");
    } catch(e) { status.textContent = "Erreur : " + e.message; }
  }

  async _opbLoadPlant(pid) {
    const status = this.querySelector("#opb-status");
    status.textContent = "⌛ Importation des seuils...";
    try {
      await this._hass.callService("openplantbook", "get_plant", { plant_pid: pid });
      await new Promise(r => setTimeout(r, 2000));
      
      const plant = Object.values(this._hass.states).find(s => 
        (s.attributes?.pid === pid || s.attributes?.plant_pid === pid || s.attributes?.species === pid)
      );

      if (plant) {
        const a = plant.attributes;
        this._config.opb_pid = pid;
        this._config.sensors.forEach(s => {
          const n = (s.name || "").toLowerCase();
          if (n.includes("humid") || n.includes("sol")) { 
            s.warn_below = a.min_soil_moist; s.danger_above = a.max_soil_moist; s.max=100;
          }
          if (n.includes("temp")) { 
            s.warn_below = a.min_temp; s.danger_above = a.max_temp; s.max=50;
          }
        });
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
        status.textContent = "✅ " + pid + " appliqué !";
        this._render();
      } else {
        status.textContent = "❌ Détails introuvables pour " + pid;
      }
    } catch(e) { status.textContent = "Erreur import : " + e.message; }
  }

  _render() {
    this.innerHTML = `
      <style>
        .edit-wrap{padding:10px;font-family:sans-serif;color:#333}
        .section{background:#f0f0f0;padding:12px;border-radius:10px;margin-bottom:10px}
        input{width:100%;padding:8px;margin:5px 0;box-sizing:border-box;border-radius:5px;border:1px solid #ccc}
        label{font-size:12px;font-weight:bold}
        .scard{background:white;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px}
      </style>
      <div class="edit-wrap">
        <div class="section" style="background:#e8f5e9; border: 2px solid #4caf50">
          <label>🌿 OpenPlantBook</label>
          <div style="display:flex;gap:5px"><input id="q" placeholder="Ex: spathiphyllum"><button id="sq" style="background:#4caf50;color:white;border:none;border-radius:5px;padding:0 15px;cursor:pointer;font-weight:bold">Chercher</button></div>
          <div id="opb-status" style="font-size:11px;margin-top:8px;font-weight:bold;color:#1b5e20"></div>
          <div id="opb-results" style="max-height: 250px; overflow-y: auto; margin-top:5px"></div>
        </div>
        <div class="section">
          <label>Nom de la plante</label><input id="n" value="${this._config.name||""}">
          <label>URL Image</label><input id="img" value="${this._config.plant_image||""}">
          <label>Entité Batterie</label><input id="bat" value="${this._config.battery_sensor||""}">
        </div>
        <div id="s-list"></div>
        <button id="add" style="width:100%;padding:12px;background:#2196f3;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold">+ Ajouter un Capteur</button>
      </div>`;

    this.querySelector("#sq").onclick = () => this._opbSearch(this.querySelector("#q").value);
    this.querySelector("#n").oninput = (e) => { this._config.name = e.target.value; this._fire(); };
    this.querySelector("#img").oninput = (e) => { this._config.plant_image = e.target.value; this._fire(); };
    this.querySelector("#bat").oninput = (e) => { this._config.battery_sensor = e.target.value; this._fire(); };
    this.querySelector("#add").onclick = () => { this._config.sensors.push({name:"Humidité", entity:"", icon:"mdi:water", unit:"%"}); this._fire(); this._render(); };
    
    const list = this.querySelector("#s-list");
    this._config.sensors.forEach((s, i) => {
      const d = document.createElement("div");
      d.className = "scard";
      d.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:12px">CAPTEUR ${i+1}</b><button class="del" style="color:#f44336;border:none;background:none;cursor:pointer;font-weight:bold">Supprimer</button></div>
        <label>Nom</label><input class="sn" value="${s.name}">
        <label>Entité (sensor...)</label><input class="se" value="${s.entity}">
        <div style="display:flex;gap:5px">
          <div><label>Icône</label><input class="si" value="${s.icon}"></div>
          <div><label>Unité</label><input class="su" value="${s.unit}"></div>
        </div>
        <div style="display:flex;gap:5px">
          <div><label>Min (💧)</label><input class="sw" type="number" value="${s.warn_below||""}"></div>
          <div><label>Max (⚠️)</label><input class="sd" type="number" value="${s.danger_above||""}"></div>
        </div>`;
      
      d.querySelector(".sn").oninput = (e) => { this._config.sensors[i].name = e.target.value; this._fire(); };
      d.querySelector(".se").oninput = (e) => { this._config.sensors[i].entity = e.target.value; this._fire(); };
      d.querySelector(".si").oninput = (e) => { this._config.sensors[i].icon = e.target.value; this._fire(); };
      d.querySelector(".su").oninput = (e) => { this._config.sensors[i].unit = e.target.value; this._fire(); };
      d.querySelector(".sw").oninput = (e) => { this._config.sensors[i].warn_below = parseFloat(e.target.value); this._fire(); };
      d.querySelector(".sd").oninput = (e) => { this._config.sensors[i].danger_above = parseFloat(e.target.value); this._fire(); };
      d.querySelector(".del").onclick = () => { this._config.sensors.splice(i, 1); this._fire(); this._render(); };
      list.appendChild(d);
    });
  }
  _fire() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro" });
