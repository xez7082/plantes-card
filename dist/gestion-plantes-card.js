render() {
  const config = this._config;
  if (!config) return;

  const getState = (eid) => {
    if (!eid || !this._hass) return null;
    return this._hass.states[eid] || null;
  };

  const getVal = (eid) => {
    const s = getState(eid);
    return s ? parseFloat(s.state) : null;
  };

  const getStr = (eid) => {
    const s = getState(eid);
    return s ? s.state : "--";
  };

  const moisture = getVal(config.moisture_sensor);
  const temp     = getVal(config.temperature_sensor);
  const cond     = getVal(config.conductivity_sensor);
  const light    = getVal(config.light_sensor);
  const battery  = getVal(config.battery_sensor);

  const bar = (pct) => {
    const width = isNaN(pct) || pct == null ? 0 : Math.min(Math.max(pct, 0), 100);
    return `
      <div class="bar">
        <div class="fill" style="width:${width}%"></div>
      </div>
    `;
  };

  const tempDanger = temp != null && temp > 30
    ? `<span class="danger">⚠ DANGER</span>`
    : "";

  this.shadowRoot.innerHTML = `
    <style>
      :host {
        display: block;
      }
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
      .row {
        margin: 14px 0;
      }
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

        ${config.plant_image ? `
          <img class="plant-img" src="${config.plant_image}" alt="Plante">
        ` : ""}

        ${config.moisture_sensor ? `
          <div class="row">
            <div class="label">
              <span>💧 Humidité</span>
              <span class="value">${moisture != null ? moisture + "%" : "--"}</span>
            </div>
            ${bar(moisture)}
          </div>
        ` : ""}

        ${config.conductivity_sensor ? `
          <div class="row">
            <div class="label">
              <span>🌿 Engrais</span>
              <span class="value">${cond != null ? cond + " µS/cm" : "--"}</span>
            </div>
            ${bar(cond != null ? cond / 20 : null)}
          </div>
        ` : ""}

        ${config.light_sensor ? `
          <div class="row">
            <div class="label">
              <span>☀️ Lumière</span>
              <span class="value">${light != null ? light + " lx" : "--"}</span>
            </div>
            ${bar(light != null ? light / 100 : null)}
          </div>
        ` : ""}

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
          </div>
        ` : ""}

        ${config.battery_sensor ? `
          <div class="row">
            <div class="label">
              <span>🔋 Batterie</span>
              <span class="value">${battery != null ? battery + "%" : "--"}</span>
            </div>
            ${bar(battery)}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}
