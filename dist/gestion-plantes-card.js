// PLANT CARD v1.3.0 — Sélecteur d'entités custom, fiable

// ============================================================
// CARTE
// ============================================================
class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass   = null;
  }

  static getConfigElement() { return document.createElement("plant-card-editor"); }

  static getStubConfig() {
    return {
      name: "Ma plante", subtitle: "Monstera Deliciosa",
      image: "", plant_image: "",
      moisture_sensor: "", temperature_sensor: "",
      conductivity_sensor: "", light_sensor: "", battery_sensor: "",
    };
  }

  setConfig(config) { this._config = config; this._render(); }

  set hass(hass) { this._hass = hass; this._render(); }

  getCardSize() { return 4; }

  _render() {
    const c = this._config;
    if (!c) return;
    const getVal = (eid) => {
      if (!eid || !this._hass) return null;
      const s = this._hass.states[eid];
      return s ? parseFloat(s.state) : null;
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
    const danger = temp != null && temp > 30 ? `<span class="danger">&#9888; DANGER</span>` : "";
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block}
        .bg{position:relative;border-radius:24px;overflow:hidden;color:white;font-family:sans-serif}
        .bg-img{width:100%;height:100%;object-fit:cover;filter:blur(6px) brightness(.6);position:absolute;inset:0}
        .card{position:relative;padding:24px;backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.3);border-radius:24px;background:rgba(255,255,255,.08);box-shadow:0 10px 40px rgba(0,0,0,.4)}
        h1{margin:0;font-size:28px;font-weight:700;text-align:center}
        h2{margin:4px 0 20px;font-size:16px;opacity:.7;font-style:italic;text-align:center}
        .plant-img{display:block;margin:0 auto 20px;max-height:180px}
        .row{margin:14px 0}
        .lbl{display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-bottom:6px;opacity:.9}
        .val{color:#5ce1e6;font-weight:600;display:flex;align-items:center;gap:6px}
        .bar{height:6px;background:rgba(255,255,255,.2);border-radius:10px;overflow:hidden}
        .fill{height:100%;background:linear-gradient(90deg,#4fd1c5,#63b3ed);border-radius:10px;transition:width .4s}
        .danger{color:#ff5a5a;font-weight:600;font-size:12px}
      </style>
      <div class="bg">
        ${c.image ? `<img class="bg-img" src="${c.image}" alt="">` : ""}
        <div class="card">
          <h1>${c.name || "Ma plante"}</h1>
          <h2>${c.subtitle || ""}</h2>
          ${c.plant_image ? `<img class="plant-img" src="${c.plant_image}" alt="">` : ""}
          ${c.moisture_sensor     ? `<div class="row"><div class="lbl"><span>&#128167; Humidite</span><span class="val">${moisture != null ? moisture+"%" : "--"}</span></div>${bar(moisture)}</div>` : ""}
          ${c.conductivity_sensor ? `<div class="row"><div class="lbl"><span>&#127807; Engrais</span><span class="val">${cond != null ? cond+" uS/cm" : "--"}</span></div>${bar(cond != null ? cond/20 : null)}</div>` : ""}
          ${c.light_sensor        ? `<div class="row"><div class="lbl"><span>&#9728; Lumiere</span><span class="val">${light != null ? light+" lx" : "--"}</span></div>${bar(light != null ? light/100 : null)}</div>` : ""}
          ${c.temperature_sensor  ? `<div class="row"><div class="lbl"><span>&#127777; Temperature</span><span class="val">${temp != null ? temp+"C" : "--"} ${danger}</span></div>${bar(temp != null ? temp*3 : null)}</div>` : ""}
          ${c.battery_sensor      ? `<div class="row"><div class="lbl"><span>&#128267; Batterie</span><span class="val">${battery != null ? battery+"%" : "--"}</span></div>${bar(battery)}</div>` : ""}
        </div>
      </div>`;
  }
}

// ============================================================
// EDITEUR — sélecteur d'entités custom (pas de ha-entity-picker)
// ============================================================
class PlantCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass   = null;
    this._ready  = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._ready) this._refreshPickers();
  }

  setConfig(config) {
    this._config = { ...config };
    if (!this._ready) { this._build(); this._ready = true; }
    else this._syncAll();
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true,
    }));
  }

  // ---- Sélecteur d'entités custom ----------------------------------------
  // Crée un <input> + <datalist> à partir de hass.states, sans dépendance HA
  _entityPicker(key, placeholder) {
    const val = this._config[key] || "";
    return `
      <div class="picker-wrap" data-key="${key}">
        <input
          class="picker-input"
          data-key="${key}"
          value="${val}"
          placeholder="${placeholder || 'sensor.mon_capteur'}"
          autocomplete="off"
          spellcheck="false"
        />
        <div class="suggestions" data-key="${key}"></div>
      </div>`;
  }

  // Filtre les entités selon ce que l'utilisateur tape
  _filterEntities(query) {
    if (!this._hass) return [];
    const q = query.toLowerCase();
    return Object.keys(this._hass.states)
      .filter(id => id.toLowerCase().includes(q))
      .slice(0, 40); // max 40 résultats
  }

  // Attache les événements sur tous les pickers
  _bindPickers() {
    this.querySelectorAll(".picker-input[data-key]").forEach(input => {
      const key  = input.dataset.key;
      const list = this.querySelector(`.suggestions[data-key="${key}"]`);

      // Afficher les suggestions quand on tape ou qu'on clique
      const showSuggestions = () => {
        const matches = this._filterEntities(input.value);
        if (!matches.length) { list.style.display = "none"; return; }
        list.innerHTML = matches.map(id =>
          `<div class="suggestion-item" data-id="${id}">${id}</div>`
        ).join("");
        list.style.display = "block";

        // Clic sur une suggestion
        list.querySelectorAll(".suggestion-item").forEach(item => {
          item.onmousedown = (e) => {
            e.preventDefault(); // empêche le blur de l'input
            input.value = item.dataset.id;
            this._config[key] = item.dataset.id;
            list.style.display = "none";
            this._fire();
          };
        });
      };

      input.addEventListener("input",  showSuggestions);
      input.addEventListener("focus",  showSuggestions);
      input.addEventListener("blur",   () => { setTimeout(() => { list.style.display = "none"; }, 150); });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { list.style.display = "none"; }
        if (e.key === "Enter") {
          this._config[key] = input.value;
          list.style.display = "none";
          this._fire();
        }
      });
      // Sauvegarde si on quitte sans choisir dans la liste
      input.addEventListener("change", () => {
        this._config[key] = input.value;
        this._fire();
      });
    });
  }

  // Met à jour la liste des suggestions (quand hass change)
  _refreshPickers() {
    // Rien à faire : les suggestions se recalculent à la prochaine frappe/focus
  }

  // ---- Inputs texte -------------------------------------------------------
  _bindInputs() {
    this.querySelectorAll("input.txt[data-key]").forEach(input => {
      input.addEventListener("input", (e) => {
        clearTimeout(input._t);
        input._t = setTimeout(() => {
          this._config[e.target.dataset.key] = e.target.value;
          this._fire();
        }, 400);
      });
    });
  }

  // Met à jour les valeurs sans toucher au focus
  _syncAll() {
    this.querySelectorAll("input.txt[data-key]").forEach(input => {
      if (document.activeElement !== input)
        input.value = this._config[input.dataset.key] || "";
    });
    this.querySelectorAll("input.picker-input[data-key]").forEach(input => {
      if (document.activeElement !== input)
        input.value = this._config[input.dataset.key] || "";
    });
  }

  // ---- Construction du DOM ------------------------------------------------
  _build() {
    this.innerHTML = `
      <style>
        .editor{padding:16px;font-family:var(--primary-font-family,sans-serif)}
        .section{background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:16px}
        .stitle{font-size:15px;font-weight:bold;margin-bottom:12px;color:#333}
        .ibox{background:#e8f5e9;border-left:4px solid #4caf50;padding:10px 12px;margin-bottom:16px;border-radius:4px;font-size:13px;color:#2e7d32}
        .field{margin-bottom:14px;position:relative}
        .field label{display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:#555}
        input{width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box}
        input:focus{outline:none;border-color:#4caf50}

        /* Sélecteur custom */
        .picker-wrap{position:relative}
        .picker-input{width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;background:white}
        .picker-input:focus{outline:none;border-color:#4caf50}
        .suggestions{
          position:absolute;top:100%;left:0;right:0;
          background:white;border:1px solid #ddd;border-top:none;
          border-radius:0 0 6px 6px;max-height:220px;overflow-y:auto;
          z-index:9999;display:none;box-shadow:0 4px 12px rgba(0,0,0,.15)
        }
        .suggestion-item{
          padding:8px 12px;font-size:13px;cursor:pointer;
          border-bottom:1px solid #f0f0f0;color:#333
        }
        .suggestion-item:hover{background:#e8f5e9;color:#2e7d32}
        .tip{font-size:11px;color:#999;margin-top:3px}
      </style>

      <div class="editor">
        <div class="ibox">&#127807; Configurez votre carte. Cliquez sur un champ capteur et tapez pour filtrer la liste.</div>

        <div class="section">
          <div class="stitle">Informations</div>
          <div class="field"><label>Nom</label>
            <input class="txt" data-key="name" placeholder="Ma plante">
          </div>
          <div class="field"><label>Sous-titre</label>
            <input class="txt" data-key="subtitle" placeholder="Monstera Deliciosa">
          </div>
        </div>

        <div class="section">
          <div class="stitle">Images</div>
          <div class="field"><label>Image de fond (URL)</label>
            <input class="txt" data-key="image" placeholder="/local/fond.jpg">
          </div>
          <div class="field"><label>Image de la plante (URL)</label>
            <input class="txt" data-key="plant_image" placeholder="/local/plante.png">
          </div>
        </div>

        <div class="section">
          <div class="stitle">Capteurs</div>
          <div class="field"><label>&#128167; Humidite</label>
            ${this._entityPicker("moisture_sensor")}
            <div class="tip">Ex: sensor.plante_moisture</div>
          </div>
          <div class="field"><label>&#127807; Engrais / Conductivite</label>
            ${this._entityPicker("conductivity_sensor")}
            <div class="tip">Ex: sensor.plante_conductivity</div>
          </div>
          <div class="field"><label>&#9728; Lumiere</label>
            ${this._entityPicker("light_sensor")}
            <div class="tip">Ex: sensor.plante_illuminance</div>
          </div>
          <div class="field"><label>&#127777; Temperature</label>
            ${this._entityPicker("temperature_sensor")}
            <div class="tip">Ex: sensor.plante_temperature</div>
          </div>
          <div class="field"><label>&#128267; Batterie</label>
            ${this._entityPicker("battery_sensor")}
            <div class="tip">Ex: sensor.plante_battery</div>
          </div>
        </div>
      </div>`;

    this._bindInputs();
    this._bindPickers();
    this._syncAll();
  }
}

// ============================================================
// ENREGISTREMENT — nom fixe, une seule installation
// ============================================================
customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plant-card",
  name: "Plant Card",
  description: "Carte de suivi de plante",
  preview: true,
});

console.info("%c PLANT-CARD %c v1.3.0 ",
  "color:white;background:#4caf50;font-weight:bold",
  "color:#4caf50;background:white;font-weight:bold");
