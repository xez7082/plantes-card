// PLANT CARD PRO v3.3.0 - Glassmorphism Bleu
class PlantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getConfigElement() {
    return document.createElement("plant-card-editor");
  }

  static getStubConfig() {
    return {
      name: "Fleur de Lune",
      latin_name: "Spathiphyllum 'Coco Cupido'",
      plant_image: "https://assets.floraccess.com/assets/plants/detail/spathiphyllum-sensation-xxl-fr.jpg",
      sensors: [
        { name: "Humidité Sol", entity: "sensor.miflora_moisture", icon: "mdi:water", unit: "%", max: 100, warn_below: 20, danger_above: 75 },
        { name: "Température", entity: "sensor.miflora_temperature", icon: "mdi:thermometer", unit: "°C", max: 50, warn_below: 15, danger_above: 30 }
      ]
    };
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const battObj = c.battery_sensor ? this._hass.states[c.battery_sensor] : null;
    const battVal = battObj ? parseFloat(battObj.state) : null;
    const batColor = battVal == null ? "#888" : battVal > 50 ? "#4caf50" : battVal > 20 ? "#ff9800" : "#f44336";

    this.shadowRoot.innerHTML = `
      <style>
        .card {
          background: rgba(140, 198, 255, 0.1); /* Bleu clair très transparent */
          backdrop-filter: blur(15px); /* Effet de flou derrière */
          border-radius: 20px;
          padding: 25px;
          color: white;
          font-family: 'Roboto', sans-serif;
          border: 1px solid rgba(140, 198, 255, 0.3); /* Bordure bleue semi-transparente */
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); /* Ombre légère pour la profondeur */
          position: relative;
          overflow: hidden; /* Important pour le fond image */
          display: flex;
          flex-direction: column;
          min-height: 200px; /* Hauteur min pour voir l'effet */
        }
        
        /* Fond image de la plante en Glassmorphism */
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url('${c.plant_image || ""}');
          background-size: cover;
          background-position: center;
          filter: blur(10px) brightness(0.7); /* Flou + obscurcissement de l'image de fond */
          opacity: 0.3; /* Transparence de l'image de fond */
          z-index: -1; /* Placer derrière le contenu */
          border-radius: 20px; /* S'assurer que le blur ne dépasse pas les coins */
        }

        .hrow {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          z-index: 1; /* Assure que le texte est au-dessus de l'image floue */
        }
        .title-group {
          display: flex;
          flex-direction: column;
        }
        .title {
          font-size: 1.6em;
          font-weight: 700;
          color: #e0f7fa; /* Bleu très clair */
          line-height: 1.2;
          text-shadow: 1px 1px 3px rgba(0,0,0,0.4);
        }
        .latin {
          font-size: 0.9em;
          font-style: italic;
          color: #a7d9f7; /* Bleu plus doux */
          opacity: 0.9;
          margin-top: 2px;
        }
        .bat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 1em;
          font-weight: 600;
          color: ${batColor};
          background: rgba(255,255,255,0.15); /* Fond batterie semi-transparent */
          padding: 5px 10px;
          border-radius: 12px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1;
        }
        .bat ha-icon {
          --mdc-icon-size: 20px;
        }
        
        /* Image de la plante principale au centre (si configurée) */
        .plant-main-img {
          display: block;
          width: 150px; /* Taille légèrement augmentée */
          height: 150px;
          object-fit: contain; /* Garde les proportions de l'image */
          margin: 0 auto 25px;
          border-radius: 15px; /* Coins arrondis pour l'image principale */
          border: 3px solid rgba(255, 255, 255, 0.4); /* Bordure légère */
          box-shadow: 0 6px 20px rgba(0,0,0,0.4); /* Ombre plus prononcée */
          z-index: 1;
        }

        .srow {
          background: rgba(255, 255, 255, 0.1); /* Fond des capteurs semi-transparent */
          border-radius: 12px;
          padding: 12px 15px;
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          z-index: 1;
        }
        .info {
          display: flex;
          align-items: center;
          font-size: 15px;
          margin-bottom: 8px;
        }
        .info ha-icon {
          margin-right: 12px;
          --mdc-icon-size: 22px;
          color: #7dd3fc; /* Bleu clair icônes */
        }
        .lbl {
          flex-grow: 1;
          opacity: 0.9;
          font-weight: 500;
        }
        .val {
          font-weight: 700;
          color: #e0f7fa;
        }
        .bar-bg {
          background: rgba(255, 255, 255, 0.15);
          height: 10px;
          border-radius: 5px;
          overflow: hidden;
        }
        .bar-fill {
          background: linear-gradient(90deg, #3b82f6, #60a5fa); /* Dégradé de bleu pour la barre */
          height: 100%;
          transition: width 0.8s ease;
        }
        .bar-warn {
          background: linear-gradient(90deg, #f59e0b, #fbbf24); /* Orange pour avertissement */
        }
        .bar-danger {
          background: linear-gradient(90deg, #ef4444, #f87171); /* Rouge pour danger */
        }
      </style>
      <div class="card">
        <div class="hrow">
          <div class="title-group">
            <div class="title">${c.name || "Ma Plante"}</div>
            ${c.latin_name ? `<div class="latin">${c.latin_name}</div>` : ""}
          </div>
          ${battVal != null ? `<div class="bat"><ha-icon icon="mdi:battery"></ha-icon>${battVal}%</div>` : ""}
        </div>
        ${c.plant_image ? `<img class="plant-main-img" src="${c.plant_image}">` : ''}
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

// L'éditeur reste le même que la v3.2.3 pour la stabilité
class PlantCardEditor extends HTMLElement {
  setConfig(config) { this._config = JSON.parse(JSON.stringify(config)); this._render(); }
  set hass(hass) { this._hass = hass; }

  _render() {
    if (this._initialRenderDone) return;
    
    this.innerHTML = `
      <style>
        .edit-wrap{padding:15px;font-family:sans-serif;color:white;background: #1c2a48; border-radius:12px; border: 1px solid #3e5b99;}
        .section{background:rgba(255,255,255,0.1);padding:15px;border-radius:10px;margin-bottom:15px;border:1px solid rgba(255,255,255,0.2);backdrop-filter: blur(5px);}
        input{width:100%;padding:10px;margin:8px 0;box-sizing:border-box;border-radius:6px;border:1px solid #3e5b99;background:#0d162a;color:white;}
        label{font-size:13px;font-weight:bold;color:#a5b4fc;}
        .scard{background:rgba(255,255,255,0.05);padding:12px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-bottom:10px;}
        .btn-add{width:100%;padding:14px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;}
        .del{color:#ff8a80;border:none;background:none;cursor:pointer;font-weight:bold;}
      </style>
      <div class="edit-wrap">
        <h3 style="margin-top:0;color:#60a5fa;">Configuration Visuelle</h3>
        <div class="section">
          <label>Nom commun</label><input id="n" data-conf="name" value="${this._config.name||""}">
          <label>Nom Latin (Petit texte)</label><input id="lat" data-conf="latin_name" value="${this._config.latin_name||""}">
          <label>URL Image</label><input id="img" data-conf="plant_image" value="${this._config.plant_image||""}">
          <label>Entité Batterie</label><input id="bat" data-conf="battery_sensor" value="${this._config.battery_sensor||""}">
        </div>
        <div id="s-list"></div>
        <button id="add" class="btn-add">+ AJOUTER UN CAPTEUR</button>
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
          <b style="color:#60a5fa">CAPTEUR ${i+1}</b>
          <button class="del" data-idx="${i}">Supprimer</button>
        </div>
        <label>Nom</label><input class="sn" value="${s.name}">
        <label>Entité</label><input class="se" value="${s.entity}">
        <div style="display:flex;gap:8px">
          <div><label>Icône</label><input class="si" value="${s.icon}"></div>
          <div><label>Unité</label><input class="su" value="${s.unit}"></div>
          <div><label>Max</label><input class="sm" type="number" value="${s.max}"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <div style="flex:1"><label>Alerte Min</label><input class="sw" type="number" value="${s.warn_below}"></div>
          <div style="flex:1"><label>Alerte Max</label><input class="sd" type="number" value="${s.danger_above}"></div>
        </div>`;
      
      const upd = (cls, field, isNum) => {
        d.querySelector(cls).addEventListener("change", (e) => {
          this._config.sensors[i][field] = isNum ? parseFloat(e.target.value) : e.target.value;
          this._fire();
        });
      };
      upd(".sn", "name"); upd(".se", "entity"); upd(".si", "icon"); upd(".su", "unit");
      upd(".sm", "max", true); upd(".sw", "warn_below", true); upd(".sd", "danger_above", true);
      d.querySelector(".del").onclick = () => { this._config.sensors.splice(i, 1); this._fire(); this._renderSensors(); };
      list.appendChild(d);
    });
  }
  _fire() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}

customElements.define("plant-card", PlantCard);
customElements.define("plant-card-editor", PlantCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "plant-card", name: "Plant Card Pro" });
