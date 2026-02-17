// PLANT CARD v3.1.0 — OpenPlantBook via proxy HA (sans CORS)

// ============================================================
// CARTE
// ============================================================
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
  getCardSize() { return 4; }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const battObj = c.battery_sensor ? this._hass.states[c.battery_sensor] : null;
    const battVal = battObj ? parseFloat(battObj.state) : null;
    const batColor = battVal == null ? "#888" : battVal > 50 ? "#4caf50" : battVal > 20 ? "#ff9800" : "#f44336";
    const batIcon  = battVal == null ? "mdi:battery"
      : battVal > 75 ? "mdi:battery"
      : battVal > 50 ? "mdi:battery-70"
      : battVal > 20 ? "mdi:battery-30"
      : "mdi:battery-alert";

    const bar = (pct) => {
      const w = (pct == null || isNaN(pct)) ? 0 : Math.min(Math.max(pct, 0), 100);
      return `<div class="bar-bg"><div class="bar-fill" style="width:${w}%"></div></div>`;
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block}
        .card{background:var(--ha-card-background,#1c1c1c);border-radius:15px;padding:20px;color:white;border:1px solid #333}
        .hrow{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px}
        .title{font-size:1.4em;font-weight:bold;color:#4caf50}
        .opb-sub{font-size:11px;color:#81c784;opacity:.7;margin-top:2px}
        .bat{display:flex;align-items:center;gap:4px;font-size:.9em;font-weight:600;color:${batColor}}
        .bat ha-icon{--mdc-icon-size:20px;color:${batColor}}
        .plant-img{display:block;width:120px;height:120px;object-fit:cover;margin:0 auto 20px;border-radius:50%;border:3px solid #4caf50;box-shadow:0 4px 10px rgba(0,0,0,.5)}
        .srow{margin-bottom:14px}
        .info{display:flex;align-items:center;font-size:14px;margin-bottom:6px}
        .info ha-icon{margin-right:10px;--mdc-icon-size:20px;color:#4caf50}
        .lbl{flex-grow:1;opacity:.9}
        .val{font-weight:bold}
        .unit{font-size:.8em;color:#aaa;margin-left:2px}
        .alert{font-size:13px;margin-left:4px}
        .bar-bg{background:rgba(255,255,255,.1);height:8px;border-radius:4px;overflow:hidden}
        .bar-fill{background:linear-gradient(90deg,#4caf50,#81c784);height:100%;border-radius:4px;transition:width .8s ease}
      </style>
      <div class="card">
        <div class="hrow">
          <div>
            <div class="title">${c.name || "Plante"}</div>
            ${c.opb_pid ? `<div class="opb-sub">&#127807; ${c.opb_pid}</div>` : ""}
          </div>
          ${battVal != null ? `<div class="bat"><ha-icon icon="${batIcon}"></ha-icon>${battVal}%</div>` : ""}
        </div>
        <img class="plant-img" src="${c.plant_image || "/local/fleurdelune.png"}" alt="">
        ${(c.sensors || []).map(s => {
          if (!s || !s.entity) return "";
          const st  = this._hass.states[s.entity];
          const val = st ? st.state : "--";
          const num = parseFloat(val);
          const pct = s.max && !isNaN(num) ? (num / s.max) * 100 : num;
          const dng = s.danger_above != null && !isNaN(num) && num > s.danger_above;
          const wrn = s.warn_below   != null && !isNaN(num) && num < s.warn_below;
          return `
            <div class="srow">
              <div class="info">
                <ha-icon icon="${s.icon || "mdi:sprout"}"></ha-icon>
                <span class="lbl">${s.name || "Capteur"}</span>
                <span class="val">${val}<span class="unit">${s.unit || ""}</span></span>
                ${dng ? `<span class="alert" style="color:#ff5a5a">&#9888;</span>` : ""}
                ${wrn ? `<span class="alert" style="color:#ff9800">&#128308;</span>` : ""}
              </div>
              ${bar(isNaN(pct) ? 0 : pct)}
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
    this._hass   = null;
    this._ready  = false;
  }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = [];
    if (!this._ready) { this._build(); this._ready = true; }
    else this._syncBase();
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true,
    }));
  }

  // ---- Picker entités -------------------------------------------------------
  _makePicker(wrap, currentVal, onSelect) {
    wrap.innerHTML = `
      <input class="pi" value="${currentVal || ""}" placeholder="Tapez pour rechercher..." autocomplete="off" spellcheck="false">
      <div class="sl"></div>`;
    const input = wrap.querySelector(".pi");
    const list  = wrap.querySelector(".sl");
    const suggest = () => {
      if (!this._hass) return;
      const q = (input.value || "").toLowerCase();
      const matches = Object.keys(this._hass.states).filter(id => !q || id.toLowerCase().includes(q)).sort().slice(0, 60);
      if (!matches.length) { list.style.display = "none"; return; }
      list.innerHTML = matches.map(id => {
        const color = { sensor:"#4caf50", binary_sensor:"#2196f3", switch:"#ff9800" }[id.split(".")[0]] || "#888";
        return `<div class="si"><span class="si-dot" style="background:${color}"></span>${id}</div>`;
      }).join("");
      list.style.display = "block";
      list.querySelectorAll(".si").forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          const v = item.textContent.trim();
          input.value = v; list.style.display = "none"; onSelect(v);
        };
      });
    };
    input.addEventListener("focus",  suggest);
    input.addEventListener("input",  suggest);
    input.addEventListener("blur",   () => setTimeout(() => { list.style.display = "none"; }, 200));
    input.addEventListener("change", () => onSelect(input.value));
  }

  // ---- Picker icônes --------------------------------------------------------
  _makeIconPicker(wrap, currentVal, onSelect) {
    const ICONS = [
      "mdi:water","mdi:water-percent","mdi:thermometer","mdi:white-balance-sunny",
      "mdi:lightning-bolt","mdi:leaf","mdi:sprout","mdi:flower","mdi:tree",
      "mdi:cactus","mdi:grass","mdi:seed","mdi:pine-tree","mdi:nature",
      "mdi:ph","mdi:molecule-co2","mdi:air-filter","mdi:weather-windy",
      "mdi:battery","mdi:gauge","mdi:beaker","mdi:flask","mdi:watering-can",
      "mdi:weather-rainy","mdi:sun-thermometer","mdi:fertilizer","mdi:eyedropper",
    ];
    wrap.innerHTML = `
      <input class="pi" value="${currentVal || ""}" placeholder="ex: mdi:water" autocomplete="off" spellcheck="false">
      <div class="sl"></div>`;
    const input = wrap.querySelector(".pi");
    const list  = wrap.querySelector(".sl");
    const suggest = () => {
      const q = (input.value || "").toLowerCase().replace("mdi:", "");
      const matches = ICONS.filter(ic => !q || ic.replace("mdi:", "").includes(q));
      if (!matches.length) { list.style.display = "none"; return; }
      list.innerHTML = matches.map(ic => `
        <div class="si icon-si">
          <ha-icon icon="${ic}" style="--mdc-icon-size:18px;margin-right:8px;color:#4caf50;flex-shrink:0"></ha-icon>
          <span>${ic}</span>
        </div>`).join("");
      list.style.display = "block";
      list.querySelectorAll(".si").forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          const v = item.querySelector("span").textContent;
          input.value = v; list.style.display = "none"; onSelect(v);
        };
      });
    };
    input.addEventListener("focus",  suggest);
    input.addEventListener("input",  suggest);
    input.addEventListener("blur",   () => setTimeout(() => { list.style.display = "none"; }, 200));
    input.addEventListener("change", () => onSelect(input.value));
  }

  // ---- OpenPlantBook — appel via HA backend (proxy, pas de CORS) -----------
  // Utilise l'intégration HACS "Olen/homeassistant-plant" qui expose des services HA.
  // L'appel passe par HA (websocket) => pas de CORS, pas besoin de token côté JS.

  _opbAvailable() {
    return !!(this._hass && this._hass.services && this._hass.services.openplantbook);
  }

  async _opbSearch(query) {
    const status  = this.querySelector("#opb-status");
    const results = this.querySelector("#opb-results");
    if (!query || query.length < 2) return;

    // Vérifier si l'intégration est installée
    if (!this._opbAvailable()) {
      status.innerHTML = `
        <b>Intégration OpenPlantBook non détectée.</b><br>
        <small>
          Installez d'abord via HACS :<br>
          <b>Dépôts personnalisés &rarr; Olen/homeassistant-plant</b><br>
          Puis configurez vos credentials dans <b>Paramètres &rarr; Appareils &rarr; OpenPlantBook</b>
        </small>`;
      status.className = "opb-status err";
      return;
    }

    status.textContent = "Recherche...";
    status.className   = "opb-status";
    results.innerHTML  = "";

    try {
      // Appel du service via websocket HA (pas de fetch = pas de CORS)
      await this._hass.callService("openplantbook", "search", { alias: query });

      // L'intégration met à jour un sensor/input après la recherche
      // Attendre 1,5 secondes pour laisser HA traiter
      await new Promise(r => setTimeout(r, 1500));

      // Chercher les résultats dans les états HA
      // L'intégration stocke généralement dans input_text.openplantbook_result ou sensor
      let found = null;
      for (const [eid, state] of Object.entries(this._hass.states)) {
        if (eid.includes("openplantbook") && state.attributes && state.attributes.results) {
          found = state.attributes.results;
          break;
        }
      }

      // Fallback : chercher un sensor avec les résultats de recherche
      if (!found) {
        const searchState = this._hass.states["sensor.openplantbook_search"]
          || this._hass.states["input_text.openplantbook_search"]
          || Object.values(this._hass.states).find(s =>
              s.entity_id.startsWith("openplantbook") &&
              (s.state === query || (s.attributes && s.attributes.alias === query))
            );
        if (searchState && searchState.attributes) {
          found = searchState.attributes.results || searchState.attributes;
        }
      }

      if (!found) {
        status.textContent = "Résultats non trouvés. Vérifiez les états HA (cherchez 'openplantbook').";
        status.className   = "opb-status err";
        return;
      }

      const list = Array.isArray(found) ? found
        : Object.entries(found).map(([pid, data]) => ({
            pid,
            display_pid: typeof data === "object" ? (data.display_pid || pid) : pid,
          }));

      if (!list.length) {
        status.textContent = "Aucun résultat pour : " + query;
        status.className   = "opb-status err";
        return;
      }

      status.textContent = list.length + " résultat(s)";
      status.className   = "opb-status ok";

      results.innerHTML = list.map(p => `
        <div class="opb-item">
          <div>
            <div class="opb-name">${p.display_pid || p.pid}</div>
            <div class="opb-sub">${p.pid}</div>
          </div>
          <button class="opb-btn" data-pid="${p.pid}">&#10003; Utiliser</button>
        </div>`).join("");

      results.querySelectorAll(".opb-btn").forEach(btn => {
        btn.onclick = () => this._opbLoadPlant(btn.dataset.pid);
      });

    } catch(e) {
      status.textContent = "Erreur : " + e.message;
      status.className   = "opb-status err";
    }
  }

  async _opbLoadPlant(pid) {
    const status = this.querySelector("#opb-status");
    status.textContent = "Chargement des données de la plante...";
    status.className   = "opb-status";

    try {
      await this._hass.callService("openplantbook", "get_plant", { plant_pid: pid });
      await new Promise(r => setTimeout(r, 1500));

      // Chercher l'état créé pour cette plante
      const plantState = Object.values(this._hass.states).find(s =>
        s.entity_id.startsWith("openplantbook.") &&
        (s.attributes.pid === pid ||
         s.attributes.plant_pid === pid ||
         s.entity_id.endsWith(pid.toLowerCase().replace(/[\s-]+/g, "_")))
      );

      const a = plantState ? plantState.attributes : {};

      // Mapper vers les sensors
      const MAP = [
        { keys:["min_soil_moist","min_moisture"],  field:"warn_below",   match:["moisture","humidite","water","sol"] },
        { keys:["max_soil_moist","max_moisture"],  field:"danger_above", match:["moisture","humidite","water","sol"] },
        { keys:["min_temp","min_temperature"],     field:"warn_below",   match:["temp"] },
        { keys:["max_temp","max_temperature"],     field:"danger_above", match:["temp"] },
        { keys:["min_light_lux","min_illuminance"],field:"warn_below",   match:["light","lux","lumi","illumin"] },
        { keys:["max_light_lux","max_illuminance"],field:"danger_above", match:["light","lux","lumi","illumin"] },
        { keys:["min_soil_ec","min_conductivity"], field:"warn_below",   match:["ec","conduct","engrais"] },
        { keys:["max_soil_ec","max_conductivity"], field:"danger_above", match:["ec","conduct","engrais"] },
      ];
      const getV = (obj, keys) => { for (const k of keys) if (obj[k] != null) return obj[k]; return null; };

      let applied = 0;
      this._config.sensors.forEach(s => {
        const name = (s.name || s.entity || "").toLowerCase();
        MAP.forEach(m => {
          const v = getV(a, m.keys);
          if (v != null && m.match.some(kw => name.includes(kw))) { s[m.field] = v; applied++; }
        });
        if (["moisture","humidite","sol"].some(kw => name.includes(kw))) {
          const mx = getV(a, ["max_soil_moist","max_moisture"]); if (mx) s.max = mx;
        }
        if (name.includes("temp")) {
          const mx = getV(a, ["max_temp","max_temperature"]); if (mx) s.max = mx * 3;
        }
        if (["light","lux","illumin"].some(kw => name.includes(kw))) {
          const mx = getV(a, ["max_light_lux","max_illuminance"]); if (mx) s.max = mx;
        }
      });

      this._config.opb_pid = pid;
      this._config.name    = this._config.name || a.display_pid || pid;
      this._fire();

      const info = [
        getV(a,["min_soil_moist"]) != null ? "Humidite : " + getV(a,["min_soil_moist"]) + "-" + getV(a,["max_soil_moist"]) + "%" : null,
        getV(a,["min_temp"])       != null ? "Temp : " + getV(a,["min_temp"]) + "-" + getV(a,["max_temp"]) + "C" : null,
        getV(a,["min_light_lux"])  != null ? "Lumiere : " + getV(a,["min_light_lux"]) + "-" + getV(a,["max_light_lux"]) + " lx" : null,
      ].filter(Boolean).join(" - ");

      status.innerHTML = "<b>&#10003; " + (a.display_pid || pid) + "</b> " +
        (applied > 0 ? "(" + applied + " seuil(s) applique(s))" : "(0 capteur correspondant - verifiez les noms)") +
        (info ? "<br><small>" + info + "</small>" : "");
      status.className = "opb-status ok";

      this._buildSensors();
      const fn = this.querySelector("#f-name");
      if (fn) fn.value = this._config.name;

    } catch(e) {
      status.textContent = "Erreur : " + e.message;
      status.className   = "opb-status err";
    }
  }

  // ---- Build ----------------------------------------------------------------
  _build() {
    this.innerHTML = `
      <style>
        .wrap{padding:12px;font-family:var(--primary-font-family,sans-serif)}
        .section{background:#f5f5f5;border-radius:8px;padding:14px;margin-bottom:14px}
        .stitle{font-size:14px;font-weight:bold;margin-bottom:10px;color:#333}
        .field{margin-bottom:12px}
        .field label{display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:#444}
        .ti{width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;background:#fff;color:#222}
        .ti:focus{outline:none;border-color:#4caf50}
        .pw{position:relative}
        .pi{width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;background:#fff;color:#222}
        .pi:focus{outline:none;border-color:#4caf50}
        .sl{position:absolute;top:calc(100% + 2px);left:0;right:0;background:#fff;border:1px solid #ccc;border-radius:6px;max-height:220px;overflow-y:auto;z-index:9999;display:none;box-shadow:0 6px 20px rgba(0,0,0,.15)}
        .si{display:flex;align-items:center;padding:8px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid #f0f0f0;color:#222}
        .si:hover{background:#e8f5e9;color:#2e7d32}
        .si-dot{width:8px;height:8px;border-radius:50%;margin-right:8px;flex-shrink:0}
        .icon-si{align-items:center}

        /* OpenPlantBook */
        .opb-section{background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:14px;margin-bottom:14px}
        .opb-title{font-size:14px;font-weight:bold;color:#2e7d32;margin-bottom:8px}
        .opb-help{font-size:12px;color:#444;margin-bottom:10px;line-height:1.6}
        .opb-help b{color:#2e7d32}
        .opb-help a{color:#2e7d32}
        .opb-row{display:flex;gap:8px}
        .opb-input{flex:1;padding:8px 10px;border:1px solid #a5d6a7;border-radius:6px;font-size:13px;background:#fff;color:#222}
        .opb-input:focus{outline:none;border-color:#4caf50}
        .opb-btn-search{padding:8px 14px;background:#4caf50;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500}
        .opb-btn-search:hover{background:#388e3c}
        .opb-status{font-size:12px;margin-top:8px;color:#555;line-height:1.5;min-height:16px}
        .opb-status.ok{color:#2e7d32}
        .opb-status.err{color:#c62828}
        .opb-results{margin-top:8px}
        .opb-item{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#fff;border:1px solid #c8e6c9;border-radius:6px;margin-bottom:6px}
        .opb-name{font-size:13px;font-weight:600;color:#1b5e20}
        .opb-sub{font-size:11px;color:#888;font-style:italic}
        .opb-btn{padding:5px 10px;background:#4caf50;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px;white-space:nowrap}
        .opb-btn:hover{background:#388e3c}

        /* Sensor cards */
        .scard{border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px;background:#fff}
        .scard-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .scard-num{font-weight:bold;color:#4caf50;font-size:13px}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .btn-del{background:#ff5252;color:#fff;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;font-size:12px}
        .btn-del:hover{background:#ff1744}
        .btn-add{width:100%;padding:11px;background:#4caf50;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:14px;font-weight:500;margin-top:4px}
        .btn-add:hover{background:#388e3c}
        .no-sensor{color:#999;font-size:13px;text-align:center;padding:14px}
      </style>

      <div class="wrap">

        <!-- OPENPLANTBOOK -->
        <div class="opb-section">
          <div class="opb-title">&#127807; OpenPlantBook</div>
          <div class="opb-help">
            Requiert l'intégration <a href="https://github.com/Olen/homeassistant-plant" target="_blank"><b>homeassistant-plant</b></a> (HACS).<br>
            Une fois installée et configurée, recherchez votre plante pour auto-remplir les seuils.
          </div>
          <div class="field">
            <div class="opb-row">
              <input class="opb-input" id="opb-query" placeholder="ex: monstera deliciosa, lavandula...">
              <button class="opb-btn-search" id="opb-search-btn">&#128269; Chercher</button>
            </div>
          </div>
          <div id="opb-status" class="opb-status"></div>
          <div id="opb-results" class="opb-results"></div>
        </div>

        <!-- INFORMATIONS -->
        <div class="section">
          <div class="stitle">Informations</div>
          <div class="field"><label>Nom de la plante</label>
            <input class="ti" id="f-name" placeholder="Ma plante" value="">
          </div>
          <div class="field"><label>URL de l'image</label>
            <input class="ti" id="f-img" placeholder="/local/plante.png" value="">
          </div>
        </div>

        <!-- BATTERIE -->
        <div class="section">
          <div class="stitle">&#128267; Batterie</div>
          <div class="field"><label>Entité batterie</label>
            <div class="pw" id="pw-batt"></div>
          </div>
        </div>

        <!-- CAPTEURS -->
        <div class="section">
          <div class="stitle">Capteurs</div>
          <div id="sensor-list"></div>
          <button class="btn-add" id="btn-add">&#43; Ajouter un capteur</button>
        </div>
      </div>`;

    // Champs de base
    const fn = this.querySelector("#f-name");
    const fi = this.querySelector("#f-img");
    fn.value = this._config.name || "";
    fi.value = this._config.plant_image || "";
    fn.addEventListener("input", () => { clearTimeout(fn._t); fn._t = setTimeout(() => { this._config.name = fn.value; this._fire(); }, 350); });
    fi.addEventListener("input", () => { clearTimeout(fi._t); fi._t = setTimeout(() => { this._config.plant_image = fi.value; this._fire(); }, 350); });

    // Picker batterie
    this._makePicker(this.querySelector("#pw-batt"), this._config.battery_sensor,
      v => { this._config.battery_sensor = v; this._fire(); });

    // OpenPlantBook
    const opbQuery = this.querySelector("#opb-query");
    this.querySelector("#opb-search-btn").onclick = () => this._opbSearch(opbQuery.value.trim());
    opbQuery.addEventListener("keydown", e => { if (e.key === "Enter") this._opbSearch(opbQuery.value.trim()); });

    // Ajouter capteur
    this.querySelector("#btn-add").onclick = () => {
      this._config.sensors.push({ name: "Capteur", entity: "", icon: "mdi:water", unit: "%" });
      this._fire(); this._buildSensors();
    };

    this._buildSensors();
  }

  _syncBase() {
    const fn = this.querySelector("#f-name");
    const fi = this.querySelector("#f-img");
    if (fn && document.activeElement !== fn) fn.value = this._config.name || "";
    if (fi && document.activeElement !== fi) fi.value = this._config.plant_image || "";
  }

  _buildSensors() {
    const container = this.querySelector("#sensor-list");
    if (!container) return;
    if (!this._config.sensors.length) {
      container.innerHTML = `<div class="no-sensor">Aucun capteur. Cliquez sur + pour en ajouter.</div>`;
      return;
    }
    container.innerHTML = this._config.sensors.map((s, i) => `
      <div class="scard">
        <div class="scard-head">
          <span class="scard-num">Capteur ${i + 1}</span>
          <button class="btn-del" data-i="${i}">&#128465; Supprimer</button>
        </div>
        <div class="g2">
          <div class="field"><label>Nom</label>
            <input class="ti sf" data-i="${i}" data-f="name" value="${s.name || ""}" placeholder="Humidite">
          </div>
          <div class="field"><label>Unite</label>
            <input class="ti sf" data-i="${i}" data-f="unit" value="${s.unit || "%"}" placeholder="%">
          </div>
        </div>
        <div class="field"><label>Entite capteur</label>
          <div class="pw sp-pw" data-i="${i}"></div>
        </div>
        <div class="field"><label>Icone</label>
          <div class="pw ic-pw" data-i="${i}"></div>
        </div>
        <div class="g2">
          <div class="field"><label>Max (barre)</label>
            <input class="ti sf" data-i="${i}" data-f="max" type="number" value="${s.max || ""}" placeholder="100">
          </div>
          <div class="field"><label>&#9888; Alerte si &gt;</label>
            <input class="ti sf" data-i="${i}" data-f="danger_above" type="number" value="${s.danger_above != null ? s.danger_above : ""}">
          </div>
        </div>
        <div class="field"><label>&#128308; Alerte si &lt;</label>
          <input class="ti sf" data-i="${i}" data-f="warn_below" type="number" value="${s.warn_below != null ? s.warn_below : ""}">
        </div>
      </div>`).join("");

    container.querySelectorAll("input.sf").forEach(input => {
      input.addEventListener("input", () => {
        clearTimeout(input._t);
        input._t = setTimeout(() => {
          const i = parseInt(input.dataset.i), f = input.dataset.f;
          this._config.sensors[i][f] = ["max","danger_above","warn_below"].includes(f)
            ? (input.value === "" ? undefined : parseFloat(input.value))
            : input.value;
          this._fire();
        }, 350);
      });
    });

    container.querySelectorAll(".sp-pw").forEach(wrap => {
      const i = parseInt(wrap.dataset.i);
      this._makePicker(wrap, this._config.sensors[i].entity, v => { this._config.sensors[i].entity = v; this._fire(); });
    });

    container.querySelectorAll(".ic-pw").forEach(wrap => {
      const i = parseInt(wrap.dataset.i);
      this._makeIconPicker(wrap, this._config.sensors[i].icon, v => { this._config.sensors[i].icon = v; this._fire(); });
    });

    container.querySelectorAll(".btn-del").forEach(btn => {
      btn.onclick = () => {
        this._config.sensors.splice(parseInt(btn.dataset.i), 1);
        this._fire(); this._buildSensors();
      };
    });
  }
}

// ============================================================
customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
console.info("%c PLANT-CARD %c v3.1.0 ",
  "color:white;background:#4caf50;font-weight:bold",
  "color:#4caf50;background:white;font-weight:bold");
