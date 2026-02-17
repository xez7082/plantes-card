class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
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

  getCardSize() {
    return 4;
  }

  render() {
    const config = this._config;
    if (!config) return;

    const getVal = (eid) => {
      if (!eid || !this._hass) return null;
      const s = this._hass.states[eid];
      return s ? parseFloat(s.state) : null;
    };

    const moisture = getVal(config.moisture_sensor);
    const temp     = getVal(config.temperature_sensor);
    const cond     = getVal(config.conductivity_sensor);
    const light    = getVal(config.light_sensor);
    const battery  = getVal(config.battery_sensor);

    const bar = (pct) => {
      const width = (pct == null || isNaN(pct)) ? 0 : Math.min(Math.max(pct, 0), 100);
      return `<div class="bar"><div class="fill" style="width:${width}%"></div></div>`;
    };

    const tempDanger = temp != null && temp > 30
      ? `<span class="danger">⚠ DANGER</span>` : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        .bg {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          color: white;
          font-family: sans-serif;
        }
        .bg-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(6px) brightness(0.6);
          position: absolute;
          inset: 0;
        }
        .card {
          position: relative;
          padding: 24px;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 24px;
          background: rgba(255,255,255,0.08);
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        }
        h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          text-align: center;
        }
        h2 {
          margin: 4px 0 20px;
          font-size: 16px;
          opacity: 0.7;
          font-style: italic;
          text-align: center;
        }
        .plant-img {
          display: block;
          margin: 0 auto 20px;
          max-height: 180px;
        }
        .row { margin: 14px 0; }
        .label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          margin-bottom: 6px;
          opacity: 0.9;
        }
        .value {
          color: #5ce1e6;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bar {
          height: 6px;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          overflow: hidden;
        }
        .fill {
          height: 100%;
          background: linear-gradient(90deg, #4fd1c5, #63b3ed);
          border-radius: 10px;
          transition: width 0.4s ease;
        }
        .danger {
          color: #ff5a5a;
          font-weight: 600;
          font-size: 12px;
        }
      </style>

      <div class="bg">
        ${config.image ? `<img class="bg-img" src="${config.image}" alt="">` : ""}
        <div class="card">
          <h1>${config.name || "Ma plante"}</h1>
          <h2>${config.subtitle || ""}</h2>

          ${config.plant_image
            ? `<img class="plant-img" src="${config.plant_image}" alt="Plante">`
            : ""}

          ${config.moisture_sensor ? `
            <div class="row">
              <div class="label">
                <span>💧 Humidité</span>
                <span class="value">${moisture != null ? moisture + "%" : "--"}</span>
              </div>
              ${bar(moisture)}
            </div>` : ""}

          ${config.conductivity_sensor ? `
            <div class="row">
              <div class="label">
                <span>🌿 Engrais</span>
                <span class="value">${cond != null ? cond + " µS/cm" : "--"}</span>
              </div>
              ${bar(cond != null ? cond / 20 : null)}
            </div>` : ""}

          ${config.light_sensor ? `
            <div class="row">
              <div class="label">
                <span>☀️ Lumière</span>
                <span class="value">${light != null ? light + " lx" : "--"}</span>
              </div>
              ${bar(light != null ? light / 100 : null)}
            </div>` : ""}

          ${config.temperature_sensor ? `
            <div class="row">
              <div class="label">
                <span>🌡 Température</span>
                <span class="value">
                  ${temp != null ? temp + "°C" : "--"}
                  ${tempDanger}
                </span>
              </div>
              ${bar(temp != null ? temp * 3 : null)}
            </div>` : ""}

          ${config.battery_sensor ? `
            <div class="row">
              <div class="label">
                <span>🔋 Batterie</span>
                <span class="value">${battery != null ? battery + "%" : "--"}</span>
              </div>
              ${bar(battery)}
            </div>` : ""}
        </div>
      </div>
    `;
  }
}

// ============================================================
// ÉDITEUR VISUEL
// ============================================================

class PlantCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  // Quand hass change, on injecte dans les ha-entity-picker déjà présents
  set hass(hass) {
    this._hass = hass;
    // Injecter hass dans tous les pickers déjà dans le DOM sans re-render
    this.querySelectorAll("ha-entity-picker").forEach(picker => {
      picker.hass = hass;
    });
  }

  setConfig(config) {
    this._config = { ...config };
    this.render(); // render une seule fois à l'init
  }

  configChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  // Champ texte simple — NE PAS re-render, juste sauvegarder
  _bindInputs() {
    this.querySelectorAll("input[data-key]").forEach(input => {
      input.addEventListener("change", (e) => {
        this._config[e.target.dataset.key] = e.target.value;
        this.configChanged();
      });
      // "change" se déclenche quand on quitte le champ → pas de saut
      // Si vous voulez la sauvegarde en direct sans saut, on utilise
      // un debounce plutôt que oninput
      input.addEventListener("input", (e) => {
        clearTimeout(input._timer);
        input._timer = setTimeout(() => {
          this._config[e.target.dataset.key] = e.target.value;
          this.configChanged();
        }, 500); // attend 500ms après la dernière frappe
      });
    });
  }

  // Pickers d'entités — utilise ha-entity-picker natif de HA
  _bindPickers() {
    this.querySelectorAll("ha-entity-picker[data-key]").forEach(picker => {
      picker.hass = this._hass;
      picker.addEventListener("value-changed", (e) => {
        this._config[picker.dataset.key] = e.detail.value;
        this.configChanged();
        // PAS de render() ici → pas de saut !
      });
    });
  }

  _textField(label, key, placeholder = "") {
    const val = this._config[key] || "";
    return `
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:#555;">
          ${label}
        </label>
        <input
          data-key="${key}"
          value="${val}"
          placeholder="${placeholder}"
          style="width:100%;padding:8px 12px;border:1px solid #ddd;
                 border-radius:6px;font-size:14px;box-sizing:border-box;"
        />
      </div>
    `;
  }

  _pickerField(label, key) {
    const val = this._config[key] || "";
    return `
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:#555;">
          ${label}
        </label>
        <ha-entity-picker
          data-key="${key}"
          value="${val}"
          allow-custom-entity
          style="display:block;"
        ></ha-entity-picker>
      </div>
    `;
  }

  render() {
    this.innerHTML = `
      <style>
        .editor { padding: 16px; }
        .section {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 15px;
          font-weight: bold;
          margin-bottom: 12px;
          color: #333;
        }
        .info-box {
          background: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 10px 12px;
          margin-bottom: 16px;
          border-radius: 4px;
          font-size: 13px;
          color: #2e7d32;
        }
      </style>

      <div class="editor">
        <div class="info-box">
          🌱 Configurez votre carte de plante ci-dessous.
        </div>

        <div class="section">
          <div class="section-title">🌿 Informations</div>
          ${this._textField("Nom de la plante", "name", "Ma plante")}
          ${this._textField("Sous-titre / variété", "subtitle", "Monstera Deliciosa")}
        </div>

        <div class="section">
          <div class="section-title">🖼️ Images</div>
          ${this._textField("Image de fond (URL)", "image", "/local/plants/fond.jpg")}
          ${this._textField("Image de la plante (URL)", "plant_image", "/local/plants/plante.png")}
        </div>

        <div class="section">
          <div class="section-title">📡 Capteurs</div>
          ${this._pickerField("💧 Humidité", "moisture_sensor")}
          ${this._pickerField("🌿 Engrais / Conductivité", "conductivity_sensor")}
          ${this._pickerField("☀️ Lumière", "light_sensor")}
          ${this._pickerField("🌡 Température", "temperature_sensor")}
          ${this._pickerField("🔋 Batterie", "battery_sensor")}
        </div>
      </div>
    `;

    // Lier les événements UNE SEULE FOIS après le render
    this._bindInputs();
    this._bindPickers();
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
  description: "Carte de suivi de plante avec humidité, température, lumière et plus",
  preview: true,
});

console.info(
  "%c PLANT-CARD %c v1.0.0 ",
  "color: white; background: #4caf50; font-weight: bold;",
  "color: #4caf50; background: white; font-weight: bold;"
);
