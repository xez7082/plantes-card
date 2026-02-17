// PLANT CARD v1.2.0

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

  static getConfigElement() {
    return document.createElement("plant-card-editor");
  }

  static getStubConfig() {
    return {
      name: "Ma plante",
      subtitle: "Monstera Deliciosa",
      image: "",
      plant_image: "",
      moisture_sensor: "",
      temperature_sensor: "",
      conductivity_sensor: "",
      light_sensor: "",
      battery_sensor: "",
    };
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() { return 4; }

  render() {
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

    const danger = temp != null && temp > 30
      ? `<span class="danger">&#9888; DANGER</span>` : "";

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
        .fill{height:100%;background:linear-gradient(90deg,#4fd1c5,#63b3ed);border-radius:10px;transition:width .4s ease}
        .danger{color:#ff5a5a;font-weight:600;font-size:12px}
      </style>
      <div class="bg">
        ${c.image ? `<img class="bg-img" src="${c.image}" alt="">` : ""}
        <div class="card">
          <h1>${c.name || "Ma plante"}</h1>
          <h2>${c.subtitle || ""}</h2>
          ${c.plant_image ? `<img class="plant-img" src="${c.plant_image}" alt="">` : ""}
          ${c.moisture_sensor ? `<div class="row"><div class="lbl"><span>&#128167; Humidite</span><span class="val">${moisture != null ? moisture+"%" : "--"}</span></div>${bar(moisture)}</div>` : ""}
          ${c.conductivity_sensor ? `<div class="row"><div class="lbl"><span>&#127807; Engrais</span><span class="val">${cond != null ? cond+" uS/cm" : "--"}</span></div>${bar(cond != null ? cond/20 : null)}</div>` : ""}
          ${c.light_sensor ? `<div class="row"><div class="lbl"><span>&#9728; Lumiere</span><span class="val">${light != null ? light+" lx" : "--"}</span></div>${bar(light != null ? light/100 : null)}</div>` : ""}
          ${c.temperature_sensor ? `<div class="row"><div class="lbl"><span>&#127777; Temperature</span><span class="val">${temp != null ? temp+"C" : "--"} ${danger}</span></div>${bar(temp != null ? temp*3 : null)}</div>` : ""}
          ${c.battery_sensor ? `<div class="row"><div class="lbl"><span>&#128267; Batterie</span><span class="val">${battery != null ? battery+"%" : "--"}</span></div>${bar(battery)}</div>` : ""}
        </div>
      </div>
    `;
  }
}

// ============================================================
// EDITEUR
// ============================================================

class PlantCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass   = null;
    this._ready  = false;
  }

  // HA injecte hass à chaque tick
  set hass(hass) {
    this._hass = hass;
    // Injecter dans les pickers déjà prêts (après upgrade)
    this._injectHass();
  }

  setConfig(config) {
    this._config = { ...config };
    if (!this._ready) {
      this._buildDOM();
    } else {
      this._syncInputs();
    }
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  // Injecter hass dans les pickers une fois qu'ils sont upgradés
  _injectHass() {
    if (!this._hass) return;
    this.querySelectorAll("ha-entity-picker").forEach(p => {
      p.hass = this._hass;
    });
  }

  async _buildDOM() {
    // 1. Construire le HTML
    this.innerHTML = `
      <style>
        .editor{padding:16px;font-family:var(--primary-font-family,sans-serif)}
        .section{background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:16px}
        .stitle{font-size:15px;font-weight:bold;margin-bottom:12px;color:#333}
        .ibox{background:#e8f5e9;border-left:4px solid #4caf50;padding:10px 12px;margin-bottom:16px;border-radius:4px;font-size:13px;color:#2e7d32}
        .field{margin-bottom:14px}
        .field label{display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:#555}
        .field input{width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box}
        .field input:focus{outline:none;border-color:#4caf50}
        ha-entity-picker{display:block;width:100%}
      </style>
      <div class="editor">
        <div class="ibox">&#127807; Configurez votre carte de plante.</div>

        <div class="section">
          <div class="stitle">Informations</div>
          <div class="field"><label>Nom</label><input data-key="name" placeholder="Ma plante"></div>
          <div class="field"><label>Sous-titre</label><input data-key="subtitle" placeholder="Monstera Deliciosa"></div>
        </div>

        <div class="section">
          <div class="stitle">Images</div>
          <div class="field"><label>Image de fond (URL)</label><input data-key="image" placeholder="/local/fond.jpg"></div>
          <div class="field"><label>Image de la plante (URL)</label><input data-key="plant_image" placeholder="/local/plante.png"></div>
        </div>

        <div class="section">
          <div class="stitle">Capteurs</div>
          <div class="field"><label>&#128167; Humidite</label>
            <ha-entity-picker data-key="moisture_sensor" allow-custom-entity></ha-entity-picker>
          </div>
          <div class="field"><label>&#127807; Engrais / Conductivite</label>
            <ha-entity-picker data-key="conductivity_sensor" allow-custom-entity></ha-entity-picker>
          </div>
          <div class="field"><label>&#9728; Lumiere</label>
            <ha-entity-picker data-key="light_sensor" allow-custom-entity></ha-entity-picker>
          </div>
          <div class="field"><label>&#127777; Temperature</label>
            <ha-entity-picker data-key="temperature_sensor" allow-custom-entity></ha-entity-picker>
          </div>
          <div class="field"><label>&#128267; Batterie</label>
            <ha-entity-picker data-key="battery_sensor" allow-custom-entity></ha-entity-picker>
          </div>
        </div>
      </div>
    `;

    // 2. Lier les inputs texte (debounce — pas de re-render)
    this.querySelectorAll("input[data-key]").forEach(input => {
      input.addEventListener("input", (e) => {
        clearTimeout(input._t);
        input._t = setTimeout(() => {
          this._config[e.target.dataset.key] = e.target.value;
          this._fire();
        }, 400);
      });
    });

    // 3. Attendre que ha-entity-picker soit défini par HA (async !)
    await customElements.whenDefined("ha-entity-picker");

    // 4. Maintenant les pickers sont upgradés → on peut leur injecter hass et value
    this.querySelectorAll("ha-entity-picker[data-key]").forEach(picker => {
      const key = picker.dataset.key;

      // Injecter hass (nécessaire pour la liste des entités)
      if (this._hass) picker.hass = this._hass;

      // Valeur initiale
      picker.value = this._config[key] || "";

      // Écouter les changements
      picker.addEventListener("value-changed", (e) => {
        this._config[key] = e.detail.value;
        this._fire();
      });
    });

    this._ready = true;

    // Sync les inputs texte aussi
    this._syncInputs();
  }

  // Met à jour les inputs sans toucher au champ actif
  _syncInputs() {
    this.querySelectorAll("input[data-key]").forEach(input => {
      if (document.activeElement !== input) {
        input.value = this._config[input.dataset.key] || "";
      }
    });
    // Pickers déjà gérés via value-changed, on met juste à jour value si besoin
    if (this._ready) {
      this.querySelectorAll("ha-entity-picker[data-key]").forEach(picker => {
        picker.value = this._config[picker.dataset.key] || "";
      });
    }
  }
}

// ============================================================
// ENREGISTREMENT
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

console.info(
  "%c PLANT-CARD %c v1.2.0 ",
  "color:white;background:#4caf50;font-weight:bold",
  "color:#4caf50;background:white;font-weight:bold"
);
