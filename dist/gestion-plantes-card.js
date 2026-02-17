// PLANT CARD — version corrigée

// ============================================================
// CARTE
// ============================================================
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

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 4; }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const img = c.plant_image || "/local/fleurdelune.png";
    const battObj = c.battery_sensor ? this._hass.states[c.battery_sensor] : null;
    const battVal = battObj ? parseFloat(battObj.state) : null;

    // Couleur batterie
    const batColor = battVal == null ? "#888"
      : battVal > 50 ? "#4caf50"
      : battVal > 20 ? "#ff9800"
      : "#f44336";

    const batIcon = battVal == null ? "mdi:battery"
      : battVal > 75 ? "mdi:battery"
      : battVal > 50 ? "mdi:battery-70"
      : battVal > 20 ? "mdi:battery-30"
      : "mdi:battery-alert";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card { background: var(--ha-card-background, #1c1c1c); border-radius: 15px; padding: 20px; color: white; border: 1px solid #333; }
        .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .header { font-size: 1.4em; font-weight: bold; color: #4caf50; }
        .battery { display: flex; align-items: center; gap: 4px; font-size: 0.9em; font-weight: 600; color: ${batColor}; }
        .battery ha-icon { --mdc-icon-size: 20px; color: ${batColor}; }
        .plant-img { display: block; width: 120px; height: 120px; object-fit: cover; margin: 0 auto 20px; border-radius: 50%; border: 3px solid #4caf50; box-shadow: 0 4px 10px rgba(0,0,0,.5); }
        .sensor-row { margin-bottom: 14px; }
        .info { display: flex; align-items: center; font-size: 14px; margin-bottom: 6px; }
        .info ha-icon { margin-right: 10px; --mdc-icon-size: 20px; color: #4caf50; }
        .label-text { flex-grow: 1; opacity: .9; }
        .val { font-weight: bold; color: #fff; }
        .unit { font-size: .8em; color: #aaa; margin-left: 2px; }
        .bar-bg { background: rgba(255,255,255,.1); height: 8px; border-radius: 4px; overflow: hidden; }
        .bar-fill { background: linear-gradient(90deg, #4caf50, #81c784); height: 100%; border-radius: 4px; transition: width .8s ease; }
        .danger { color: #ff5a5a; font-size: 12px; margin-left: 4px; }
      </style>
      <div class="card">
        <div class="header-container">
          <div class="header">${c.name || "Plante"}</div>
          ${battVal != null ? `
            <div class="battery">
              <ha-icon icon="${batIcon}"></ha-icon>
              ${battVal}%
            </div>` : ""}
        </div>
        <img class="plant-img" src="${img}" alt="">
        <div id="sensors">
          ${(c.sensors || []).map(s => {
            if (!s || !s.entity) return "";
            const stateObj = this._hass.states[s.entity];
            const val = stateObj ? stateObj.state : "--";
            const num = parseFloat(val);
            const pct = (s.max && !isNaN(num)) ? Math.min((num / s.max) * 100, 100) : Math.min(num, 100);
            const isDanger = s.danger_above != null && !isNaN(num) && num > s.danger_above;
            const isWarn   = s.warn_below  != null && !isNaN(num) && num < s.warn_below;
            return `
              <div class="sensor-row">
                <div class="info">
                  <ha-icon icon="${s.icon || "mdi:sprout"}"></ha-icon>
                  <span class="label-text">${s.name || "Capteur"}</span>
                  <span>
                    <span class="val">${val}</span>
                    <span class="unit">${s.unit || ""}</span>
                    ${isDanger ? `<span class="danger">&#9888;</span>` : ""}
                    ${isWarn   ? `<span class="danger" style="color:#ff9800">&#128308;</span>` : ""}
                  </span>
                </div>
                <div class="bar-bg">
                  <div class="bar-fill" style="width:${isNaN(pct) ? 0 : pct}%"></div>
                </div>
              </div>`;
          }).join("")}
        </div>
      </div>`;
  }
}

// ============================================================
// EDITEUR — DOM construit une seule fois, jamais reconstruit
// ============================================================
class PlantCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass   = null;
    this._ready  = false;
  }

  // FIX 1 : ne jamais re-render quand hass change, juste injecter dans les pickers
  set hass(hass) {
    this._hass = hass;
    if (this._ready) {
      this.querySelectorAll("ha-entity-picker").forEach(p => { p.hass = hass; });
    }
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.sensors) this._config.sensors = [];
    if (!this._ready) {
      this._build();
      this._ready = true;
    } else {
      this._syncBase();
    }
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true,
    }));
  }

  // ---- Construction du squelette (une seule fois) -------------------------
  _build() {
    this.innerHTML = `
      <style>
        .wrap { padding: 12px; }
        .section { background: #f5f5f5; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
        .stitle { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #333; }
        .field { margin-bottom: 12px; }
        .field label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px; color: #555; }

        /* Sélecteur d'entités custom — fiable sans ha-entity-picker */
        .pw { position: relative; }
        .pi {
          width: 100%; padding: 8px 10px; border: 1px solid #ddd;
          border-radius: 6px; font-size: 13px; box-sizing: border-box; background: white;
        }
        .pi:focus { outline: none; border-color: #4caf50; }
        .sl {
          position: absolute; top: 100%; left: 0; right: 0;
          background: white; border: 1px solid #ddd; border-top: none;
          border-radius: 0 0 6px 6px; max-height: 200px; overflow-y: auto;
          z-index: 9999; display: none; box-shadow: 0 4px 12px rgba(0,0,0,.15);
        }
        .si { padding: 7px 10px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
        .si:hover { background: #e8f5e9; }

        /* Inputs texte */
        .ti {
          width: 100%; padding: 8px 10px; border: 1px solid #ddd;
          border-radius: 6px; font-size: 13px; box-sizing: border-box;
        }
        .ti:focus { outline: none; border-color: #4caf50; }

        /* Sensor cards */
        .scard { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: white; }
        .scard-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .scard-title { font-weight: bold; color: #4caf50; font-size: 13px; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .btn-del { background: #ff5252; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; }
        .btn-del:hover { background: #ff1744; }
        .btn-add { width: 100%; padding: 10px; background: #4caf50; color: white; border: none; border-radius: 7px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .btn-add:hover { background: #388e3c; }
        .no-sensor { color: #999; font-size: 13px; text-align: center; padding: 12px; }
      </style>
      <div class="wrap">
        <div class="section">
          <div class="stitle">Informations</div>
          <div class="field"><label>Nom de la plante</label>
            <input class="ti" id="f-name" placeholder="Ma plante">
          </div>
          <div class="field"><label>URL de l'image</label>
            <input class="ti" id="f-img" placeholder="/local/plante.png">
          </div>
        </div>

        <div class="section">
          <div class="stitle">&#128267; Batterie (affichée à côté du nom)</div>
          <div class="field"><label>Entité batterie</label>
            <div class="pw" id="pw-batt">
              <input class="pi" id="pi-batt" placeholder="sensor.plante_battery" autocomplete="off" spellcheck="false">
              <div class="sl" id="sl-batt"></div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="stitle">Capteurs</div>
          <div id="sensor-list"></div>
          <button class="btn-add" id="btn-add">&#43; Ajouter un capteur</button>
        </div>
      </div>`;

    // Lier les champs fixes
    this._bindBase();
    // Construire la liste des sensors
    this._buildSensors();
  }

  // ---- Champs fixes (nom, image, batterie) --------------------------------
  _bindBase() {
    const nameInput = this.querySelector("#f-name");
    const imgInput  = this.querySelector("#f-img");
    const piBatt    = this.querySelector("#pi-batt");
    const slBatt    = this.querySelector("#sl-batt");

    // Sync valeurs initiales
    nameInput.value = this._config.name         || "";
    imgInput.value  = this._config.plant_image  || "";
    piBatt.value    = this._config.battery_sensor || "";

    nameInput.addEventListener("input", () => {
      clearTimeout(nameInput._t);
      nameInput._t = setTimeout(() => { this._config.name = nameInput.value; this._fire(); }, 350);
    });

    imgInput.addEventListener("input", () => {
      clearTimeout(imgInput._t);
      imgInput._t = setTimeout(() => { this._config.plant_image = imgInput.value; this._fire(); }, 350);
    });

    this._bindPicker(piBatt, slBatt, (v) => { this._config.battery_sensor = v; this._fire(); });

    this.querySelector("#btn-add").onclick = () => {
      this._config.sensors.push({ name: "Capteur", entity: "", icon: "mdi:water", unit: "%" });
      this._fire();
      this._buildSensors();
    };
  }

  _syncBase() {
    const n = this.querySelector("#f-name");
    const i = this.querySelector("#f-img");
    const b = this.querySelector("#pi-batt");
    if (n && document.activeElement !== n) n.value = this._config.name || "";
    if (i && document.activeElement !== i) i.value = this._config.plant_image || "";
    if (b && document.activeElement !== b) b.value = this._config.battery_sensor || "";
  }

  // ---- Picker d'entités custom (sans ha-entity-picker) -------------------
  _bindPicker(input, list, onSelect) {
    const suggest = () => {
      if (!this._hass) { list.style.display = "none"; return; }
      const q = (input.value || "").toLowerCase();
      const matches = Object.keys(this._hass.states)
        .filter(id => id.toLowerCase().includes(q))
        .slice(0, 50);
      if (!matches.length) { list.style.display = "none"; return; }
      list.innerHTML = matches.map(id => `<div class="si">${id}</div>`).join("");
      list.style.display = "block";
      list.querySelectorAll(".si").forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          input.value = item.textContent;
          list.style.display = "none";
          onSelect(item.textContent);
        };
      });
    };

    input.addEventListener("input",   suggest);
    input.addEventListener("focus",   suggest);
    input.addEventListener("blur",    () => setTimeout(() => { list.style.display = "none"; }, 150));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") list.style.display = "none";
      if (e.key === "Enter")  { list.style.display = "none"; onSelect(input.value); }
    });
    input.addEventListener("change",  () => onSelect(input.value));
  }

  // ---- Liste des sensors (reconstruite sans toucher au reste) -------------
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
          <span class="scard-title">Capteur ${i + 1}</span>
          <button class="btn-del" data-i="${i}">&#128465; Supprimer</button>
        </div>
        <div class="row2">
          <div class="field"><label>Nom</label>
            <input class="ti sf" data-i="${i}" data-f="name" value="${s.name || ""}" placeholder="Humidité">
          </div>
          <div class="field"><label>Icône MDI</label>
            <input class="ti sf" data-i="${i}" data-f="icon" value="${s.icon || "mdi:water"}" placeholder="mdi:water">
          </div>
        </div>
        <div class="field"><label>Entité capteur</label>
          <div class="pw">
            <input class="pi sp-pi" data-i="${i}" value="${s.entity || ""}"
              placeholder="sensor.plante_moisture" autocomplete="off" spellcheck="false">
            <div class="sl sp-sl" data-i="${i}"></div>
          </div>
        </div>
        <div class="row2">
          <div class="field"><label>Unité</label>
            <input class="ti sf" data-i="${i}" data-f="unit" value="${s.unit || "%"}" placeholder="%">
          </div>
          <div class="field"><label>Max (barre)</label>
            <input class="ti sf" data-i="${i}" data-f="max" type="number" value="${s.max || ""}" placeholder="100">
          </div>
        </div>
        <div class="row2">
          <div class="field"><label>&#9888; Alerte si &gt;</label>
            <input class="ti sf" data-i="${i}" data-f="danger_above" type="number" value="${s.danger_above ?? ""}" placeholder="">
          </div>
          <div class="field"><label>&#128308; Alerte si &lt;</label>
            <input class="ti sf" data-i="${i}" data-f="warn_below" type="number" value="${s.warn_below ?? ""}" placeholder="">
          </div>
        </div>
      </div>`).join("");

    // Lier les champs texte des sensors
    container.querySelectorAll("input.sf").forEach(input => {
      input.addEventListener("input", () => {
        clearTimeout(input._t);
        input._t = setTimeout(() => {
          const i = parseInt(input.dataset.i);
          const f = input.dataset.f;
          const raw = input.value;
          this._config.sensors[i][f] = (f === "max" || f === "danger_above" || f === "warn_below")
            ? (raw === "" ? undefined : parseFloat(raw))
            : raw;
          this._fire();
        }, 350);
      });
    });

    // Lier les pickers d'entités des sensors
    container.querySelectorAll(".sp-pi").forEach(input => {
      const i    = parseInt(input.dataset.i);
      const list = container.querySelector(`.sp-sl[data-i="${i}"]`);
      this._bindPicker(input, list, (v) => {
        this._config.sensors[i].entity = v;
        this._fire();
      });
    });

    // Boutons supprimer
    container.querySelectorAll(".btn-del").forEach(btn => {
      btn.onclick = () => {
        this._config.sensors.splice(parseInt(btn.dataset.i), 1);
        this._fire();
        this._buildSensors(); // reconstruire seulement la liste
      };
    });
  }
}

// ============================================================
customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro", preview: true });

console.info("%c PLANT-CARD %c v2.1.0 ",
  "color:white;background:#4caf50;font-weight:bold",
  "color:#4caf50;background:white;font-weight:bold");
