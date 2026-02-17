render() {
  if (!this.shadowRoot) this.attachShadow({ mode: "open" });

  const config = this._config;
  const getS = (eid) => this._hass?.states[eid]?.state || "--";

  const moisture = getS(config.moisture_sensor);
  const temp = getS(config.temperature_sensor);
  const cond = getS(config.conductivity_sensor);
  const light = getS(config.light_sensor);
  const battery = getS(config.battery_sensor);

  const bar = (value) => `
    <div class="bar">
      <div class="fill" style="width:${Math.min(value,100)}%"></div>
    </div>
  `;

  this.shadowRoot.innerHTML = `
  <style>
    .bg {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      color: white;
      font-family: sans-serif;
    }

    .bg img {
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

    .plant {
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
      font-size: 14px;
      margin-bottom: 6px;
      opacity: 0.9;
    }

    .value {
      color: #5ce1e6;
      font-weight: 600;
    }

    .bar {
      height: 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 10px;
      overflow: hidden;
    }

    .fill {
      height: 100%;
      background: linear-gradient(90deg,#4fd1c5,#63b3ed);
      border-radius: 10px;
    }

    .danger {
      color: #ff5a5a;
      font-weight: 600;
      margin-left: 6px;
    }
  </style>

  <div class="bg">
    ${config.image ? `<img src="${config.image}">` : ""}

    <div class="card">
      <h1>${config.name || "Ma plante"}</h1>
      <h2>${config.subtitle || ""}</h2>

      ${
        config.plant_image
          ? `<img class="plant" src="${config.plant_image}">`
          : ""
      }

      ${config.moisture_sensor ? `
        <div class="row">
          <div class="label">💧 Humidité <span class="value">${moisture}%</span></div>
          ${bar(moisture)}
        </div>` : ""}

      ${config.conductivity_sensor ? `
        <div class="row">
          <div class="label">🌿 Engrais <span class="value">${cond} µS/cm</span></div>
          ${bar(cond/20)}
        </div>` : ""}

      ${config.light_sensor ? `
        <div class="row">
          <div class="label">☀️ Lumière <span class="value">${light} lx</span></div>
          ${bar(light/100)}
        </div>` : ""}

      ${config.temperature_sensor ? `
        <div class="row">
          <div class="label">
            🌡 Température
            <span class="value">${temp}°C ${temp > 30 ? '<span class="danger">DANGER</span>' : ''}</span>
          </div>
          ${bar(temp*3)}
        </div>` : ""}

      ${config.battery_sensor ? `
        <div class="row">
          <div class="label">🔋 Batterie <span class="value">${battery}%</span></div>
          ${bar(battery)}
        </div>` : ""}
    </div>
  </div>
  `;
}
