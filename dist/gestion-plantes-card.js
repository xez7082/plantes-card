// PLANT CARD v2.2.0

class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

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
    const batIcon  = battVal == null ? "mdi:battery" : battVal > 75 ? "mdi:battery" : battVal > 50 ? "mdi:battery-70" : battVal > 20 ? "mdi:battery-30" : "mdi:battery-alert";

    const bar = (pct) => {
      const w = (pct == null || isNaN(pct)) ? 0 : Math.min(Math.max(pct, 0), 100);
      return `<div class="bar-bg"><div class="bar-fill" style="width:${w}%"></div></div>`;
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card { background: var(--ha-card-background,#1c1c1c); border-radius:15px; padding:20px; color:white; border:1px solid #333; }
        .hrow { display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; }
        .title { font-size:1.4em; font-weight:bold; color:#4caf50; }
        .bat { display:flex; align-items:center; gap:4px; font-size:.9em; font-weight:600; color:${batColor}; }
        .bat ha-icon { --mdc-icon-size:20px; color:${batColor}; }
        .plant-img { display:block; width:120px; height:120px; object-fit:cover; margin:0 auto 20px; border-radius:50%; border:3px solid #4caf50; box-shadow:0 4px 10px rgba(0,0,0,.5); }
        .srow { margin-bottom:14px; }
        .info { display:flex; align-items:center; font-size:14px; margin-bottom:6px; }
        .info ha-icon { margin-right:10px; --mdc-icon-size:20px; color:#4caf50; }
        .lbl { flex-grow:1; opacity:.9; }
        .val { font-weight:bold; }
        .unit { font-size:.8em; color:#aaa; margin-left:2px; }
        .alert { font-size:13px; margin-left:4px; }
        .bar-bg { background:rgba(255,255,255,.1); height:8px; border-radius:4px; overflow:hidden; }
        .bar-fill { background:linear-gradient(90deg,#4caf50,#81c784); height:100%; border-radius:4px; transition:width .8s ease; }
      </style>
      <div class="card">
        <div class="hrow">
          <div class="title">${c.name || "Plante"}</div>
          ${battVal != null ? `<div class="bat"><ha-icon icon="${batIcon}"></ha-icon>${battVal}%</div>` : ""}
        </div>
        <img class="plant-img" src="${c.plant_image || '/local/fleurdelune.png'}" alt="">
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
                <ha-icon icon="${s.icon || 'mdi:sprout'}"></ha-icon>
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
// ÉDITEUR
// ============================================================
class PlantCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass   = null;
    this._ready  = false;
  }

  set hass(hass) {
    this._hass = hass;
  }

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

  // ---- Sélecteur d'entités ------------------------------------------------
  _makePicker(container, currentVal, onSelect) {
    container.innerHTML = `
      <input class="pi" value="${currentVal || ""}"
        placeholder="Tapez pour rechercher..." autocomplete="off" spellcheck="false">
      <div class="sl"></div>`;

    const input = container.querySelector(".pi");
    const list  = container.querySelector(".sl");

    const suggest = () => {
      if (!this._hass) return;
      const q = (input.value || "").toLowerCase();
      const matches = Object.keys(this._hass.states)
        .filter(id => !q || id.toLowerCase().includes(q))
        .sort()
        .slice(0, 60);
      if (!matches.length) { list.style.display = "none"; return; }
      list.innerHTML = matches.map(id => {
        const domain = id.split(".")[0];
        const color  = { sensor:"#4caf50", binary_sensor:"#2196f3", switch:"#ff9800" }[domain] || "#888";
        return `<div class="si">
          <span class="si-dot" style="background:${color}"></span>
          <span class="si-id">${id}</span>
        </div>`;
      }).join("");
      list.style.display = "block";
      list.querySelectorAll(".si").forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          const val = item.querySelector(".si-id").textContent;
          input.value = val;
          list.style.display = "none";
          onSelect(val);
        };
      });
    };

    input.addEventListener("focus",  suggest);
    input.addEventListener("input",  suggest);
    input.addEventListener("blur",   () => setTimeout(() => { list.style.display = "none"; }, 200));
    input.addEventListener("keydown", e => {
      if (e.key === "Escape") list.style.display = "none";
      if (e.key === "Enter") { list.style.display = "none"; onSelect(input.value); }
    });
    input.addEventListener("change", () => onSelect(input.value));

    return input;
  }

  // ---- Sélecteur d'icônes MDI ---------------------------------------------
  _makeIconPicker(container, currentVal, onSelect) {
    // Liste d'icônes utiles pour les plantes
    const ICONS = [
      "mdi:water","mdi:water-percent","mdi:thermometer","mdi:white-balance-sunny",
      "mdi:lightning-bolt","mdi:leaf","mdi:sprout","mdi:flower","mdi:tree",
      "mdi:cactus","mdi:grass","mdi:seed","mdi:pine-tree","mdi:nature",
      "mdi:ph","mdi:molecule-co2","mdi:air-filter","mdi:weather-windy",
      "mdi:battery","mdi:battery-70","mdi:battery-30","mdi:battery-alert",
      "mdi:chart-line","mdi:gauge","mdi:speedometer","mdi:beaker",
      "mdi:flask","mdi:test-tube","mdi:eyedropper","mdi:watering-can",
      "mdi:weather-rainy","mdi:cloud","mdi:sun-thermometer","mdi:fertilizer",
    ];

    container.innerHTML = `
      <input class="pi" value="${currentVal || ""}"
        placeholder="ex: mdi:water" autocomplete="off" spellcheck="false">
      <div class="sl icon-sl"></div>`;

    const input = container.querySelector(".pi");
    const list  = container.querySelector(".sl");

    const suggest = () => {
      const q = (input.value || "").toLowerCase().replace("mdi:", "");
      const matches = ICONS.filter(ic => !q || ic.replace("mdi:", "").includes(q));
      if (!matches.length) { list.style.display = "none"; return; }
      list.innerHTML = matches.map(ic => `
        <div class="si icon-item">
          <ha-icon icon="${ic}" style="--mdc-icon-size:20px;margin-right:8px;color:#4caf50"></ha-icon>
          <span class="si-id">${ic}</span>
        </div>`).join("");
      list.style.display = "block";
      list.querySelectorAll(".si").forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          const val = item.querySelector(".si-id").textContent;
          input.value = val;
          list.style.display = "none";
          onSelect(val);
        };
      });
    };

    input.addEventListener("focus",  suggest);
    input.addEventListener("input",  suggest);
    input.addEventListener("blur",   () => setTimeout(() => { list.style.display = "none"; }, 200));
    input.addEventListener("change", () => onSelect(input.value));

    return input;
  }

  // ---- Build initial ------------------------------------------------------
  _build() {
    this.innerHTML = `
      <style>
        .wrap { padding:12px; font-family:var(--primary-font-family,sans-serif); }
        .section { background:#f5f5f5; border-radius:8px; padding:14px; margin-bottom:14px; }
        .stitle { font-size:14px; font-weight:bold; margin-bottom:10px; color:#333; }
        .field { margin-bottom:12px; }
        .field label { display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:#444; }

        /* inputs texte */
        .ti { width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:6px; font-size:13px; box-sizing:border-box; background:#fff; color:#222; }
        .ti:focus { outline:none; border-color:#4caf50; }

        /* picker commun */
        .pw { position:relative; }
        .pi { width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:6px; font-size:13px; box-sizing:border-box; background:#fff; color:#222; }
        .pi:focus { outline:none; border-color:#4caf50; }

        /* liste déroulante */
        .sl {
          position:absolute; top:calc(100% + 2px); left:0; right:0;
          background:#fff; border:1px solid #ccc; border-radius:6px;
          max-height:220px; overflow-y:auto;
          z-index:9999; display:none;
          box-shadow:0 6px 20px rgba(0,0,0,.15);
        }
        .si {
          display:flex; align-items:center;
          padding:8px 10px; font-size:13px; cursor:pointer;
          border-bottom:1px solid #f0f0f0; color:#222;
        }
        .si:hover { background:#e8f5e9; color:#2e7d32; }
        .si-dot { width:8px; height:8px; border-radius:50%; margin-right:8px; flex-shrink:0; }
        .si-id { color:#222; }
        .icon-item { color:#222; }

        /* sensor cards */
        .scard { border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:10px; background:#fff; }
        .scard-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .scard-num { font-weight:bold; color:#4caf50; font-size:13px; }
        .g2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .btn-del { background:#ff5252; color:#fff; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:12px; }
        .btn-del:hover { background:#ff1744; }
        .btn-add { width:100%; padding:11px; background:#4caf50; color:#fff; border:none; border-radius:7px; cursor:pointer; font-size:14px; font-weight:500; margin-top:4px; }
        .btn-add:hover { background:#388e3c; }
        .no-sensor { color:#999; font-size:13px; text-align:center; padding:14px; }
      </style>

      <div class="wrap">
        <div class="section">
          <div class="stitle">&#127807; Informations</div>
          <div class="field"><label>Nom de la plante</label>
            <input class="ti" id="f-name" placeholder="Ma plante">
          </div>
          <div class="field"><label>URL de l'image</label>
            <input class="ti" id="f-img" placeholder="/local/plante.png">
          </div>
        </div>

        <div class="section">
          <div class="stitle">&#128267; Batterie</div>
          <div class="field"><label>Entité batterie</label>
            <div class="pw" id="pw-batt"></div>
          </div>
        </div>

        <div class="section">
          <div class="stitle">Capteurs</div>
          <div id="sensor-list"></div>
          <button class="btn-add" id="btn-add">&#43; Ajouter un capteur</button>
        </div>
      </div>`;

    // Champs texte fixes
    const fn = this.querySelector("#f-name");
    const fi = this.querySelector("#f-img");
    fn.value = this._config.name || "";
    fi.value = this._config.plant_image || "";

    fn.addEventListener("input", () => { clearTimeout(fn._t); fn._t = setTimeout(() => { this._config.name = fn.value; this._fire(); }, 350); });
    fi.addEventListener("input", () => { clearTimeout(fi._t); fi._t = setTimeout(() => { this._config.plant_image = fi.value; this._fire(); }, 350); });

    // Picker batterie
    this._makePicker(
      this.querySelector("#pw-batt"),
      this._config.battery_sensor,
      (v) => { this._config.battery_sensor = v; this._fire(); }
    );

    // Bouton ajouter
    this.querySelector("#btn-add").onclick = () => {
      this._config.sensors.push({ name: "Capteur", entity: "", icon: "mdi:water", unit: "%" });
      this._fire();
      this._buildSensors();
    };

    this._buildSensors();
  }

  _syncBase() {
    const fn = this.querySelector("#f-name");
    const fi = this.querySelector("#f-img");
    if (fn && document.activeElement !== fn) fn.value = this._config.name || "";
    if (fi && document.activeElement !== fi) fi.value = this._config.plant_image || "";
  }

  // ---- Liste sensors (reconstruite sans toucher au reste) -----------------
  _buildSensors() {
    const container = this.querySelector("#sensor-list");
    if (!container) return;

    if (!this._config.sensors.length) {
      container.innerHTML = `<div class="no-sensor">Aucun capteur. Cliquez sur + pour en ajouter.</div>`;
      return;
    }

    container.innerHTML = this._config.sensors.map((s, i) => `
      <div class="scard" data-i="${i}">
        <div class="scard-head">
          <span class="scard-num">Capteur ${i + 1}</span>
          <button class="btn-del" data-i="${i}">&#128465; Supprimer</button>
        </div>
        <div class="g2">
          <div class="field"><label>Nom</label>
            <input class="ti sf" data-i="${i}" data-f="name" value="${s.name || ""}" placeholder="Humidité">
          </div>
          <div class="field"><label>Unité</label>
            <input class="ti sf" data-i="${i}" data-f="unit" value="${s.unit || "%"}" placeholder="%">
          </div>
        </div>
        <div class="field"><label>Entité capteur</label>
          <div class="pw sp-pw" data-i="${i}"></div>
        </div>
        <div class="field"><label>Icône</label>
          <div class="pw ic-pw" data-i="${i}"></div>
        </div>
        <div class="g2">
          <div class="field"><label>Max (barre %)</label>
            <input class="ti sf" data-i="${i}" data-f="max" type="number" value="${s.max || ""}" placeholder="100">
          </div>
          <div class="field"><label>&#9888; Alerte si &gt;</label>
            <input class="ti sf" data-i="${i}" data-f="danger_above" type="number" value="${s.danger_above ?? ""}" placeholder="">
          </div>
        </div>
      </div>`).join("");

    // Lier champs texte
    container.querySelectorAll("input.sf").forEach(input => {
      input.addEventListener("input", () => {
        clearTimeout(input._t);
        input._t = setTimeout(() => {
          const i = parseInt(input.dataset.i);
          const f = input.dataset.f;
          const raw = input.value;
          this._config.sensors[i][f] = (f === "max" || f === "danger_above")
            ? (raw === "" ? undefined : parseFloat(raw))
            : raw;
          this._fire();
        }, 350);
      });
    });

    // Pickers entités
    container.querySelectorAll(".sp-pw").forEach(wrap => {
      const i = parseInt(wrap.dataset.i);
      this._makePicker(wrap, this._config.sensors[i].entity, (v) => {
        this._config.sensors[i].entity = v;
        this._fire();
      });
    });

    // Pickers icônes
    container.querySelectorAll(".ic-pw").forEach(wrap => {
      const i = parseInt(wrap.dataset.i);
      this._makeIconPicker(wrap, this._config.sensors[i].icon, (v) => {
        this._config.sensors[i].icon = v;
        this._fire();
      });
    });

    // Boutons supprimer
    container.querySelectorAll(".btn-del").forEach(btn => {
      btn.onclick = () => {
        this._config.sensors.splice(parseInt(btn.dataset.i), 1);
        this._fire();
        this._buildSensors();
      };
    });
  }
}

// ============================================================
customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });
console.info("%c PLANT-CARD %c v2.2.0 ",
  "color:white;background:#4caf50;font-weight:bold",
  "color:#4caf50;background:white;font-weight:bold");
