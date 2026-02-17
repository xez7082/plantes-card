render() {
  if (!this.shadowRoot) this.attachShadow({ mode: "open" });

  const config = this._config;
  // Sécurité : on vérifie que hass et states existent avant d'appeler la valeur
  const getS = (eid) => {
    const stateObj = this._hass?.states[eid];
    return stateObj ? stateObj.state : "--";
  };

  // On convertit en nombre pour les calculs de barres, sinon on garde "--"
  const moisture = parseFloat(getS(config.moisture_sensor));
  const temp = parseFloat(getS(config.temperature_sensor));
  const cond = parseFloat(getS(config.conductivity_sensor));
  const light = parseFloat(getS(config.light_sensor));
  const battery = parseFloat(getS(config.battery_sensor));

  // Fonction bar modifiée pour gérer les valeurs NaN (si sensor indisponible)
  const bar = (value, max = 100) => {
    const pct = isNaN(value) ? 0 : Math.min(Math.max((value / max) * 100, 0), 100);
    return `
      <div class="bar">
        <div class="fill" style="width:${pct}%"></div>
      </div>
    `;
  };

  this.shadowRoot.innerHTML = `
  <style>
    .bg {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .bg-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: blur(8px) brightness(0.5);
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .card {
      position: relative;
      z-index: 1;
      padding: 24px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 24px;
      background: rgba(0, 0, 0, 0.2);
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }

    h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    h2 {
      margin: 4px 0 20px;
      font-size: 14px;
      opacity: 0.8;
      font-style: italic;
      text-align: center;
    }

    .plant-img {
      display: block;
      margin: 0 auto 20px;
      max-height: 150px;
      filter: drop-shadow(0 10px 10px rgba(0,0,0,0.3));
    }

    .row {
      margin: 16px 0;
    }

    .label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      margin-bottom: 8px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .value {
      color: #5ce1e6;
      font-weight: 700;
      font-family: 'Roboto Mono', monospace;
    }

    .bar {
      height: 8px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      overflow: hidden;
    }

    .fill {
      height: 100%;
      background: linear-gradient(90deg, #4fd1c5, #63b3ed);
      border-radius: 10px;
      transition: width 0.8s ease-in-out;
    }

    .danger {
      color: #ff5a5a;
      font-weight: 800;
      font-size: 10px;
      background: rgba(255, 0, 0, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 6px;
      vertical-align: middle;
    }
  </style>

  <div class="bg">
    ${config.image ? `<img class="bg-image" src="${config.image}">` : ""}

    <div class="card">
      <h1>${config.name || "Ma plante"}</h1>
      <h2>${config.subtitle || ""}</h2>

      ${config.plant_image ? `<img class="plant-img" src="${config.plant_image}">` : ""}

      ${config.moisture_sensor ? `
        <div class="row">
          <div class="label">💧 Humidité <span class="value">${isNaN(moisture) ? '--' : moisture}%</span></div>
          ${bar(moisture, 100)}
        </div>` : ""}

      ${config.conductivity_sensor ? `
        <div class="row">
          <div class="label">🌿 Engrais <span class="value">${isNaN(cond) ? '--' : cond} µS/cm</span></div>
          ${bar(cond, 2000)}
        </div>` : ""}

      ${config.light_sensor ? `
        <div class="row">
          <div class="label">☀️ Lumière <span class="value">${isNaN(light) ? '--' : light} lx</span></div>
          ${bar(light, 10000)}
        </div>` : ""}

      ${config.temperature_sensor ? `
        <div class="row">
          <div class="label">
            🌡 Température
            <span class="value">
              ${isNaN(temp) ? '--' : temp}°C 
              ${temp > 30 ? '<span class="danger">ALERTE CHALEUR</span>' : ''}
            </span>
          </div>
          ${bar(temp, 40)}
        </div>` : ""}

      ${config.battery_sensor ? `
        <div class="row">
          <div class="label">🔋 Batterie <span class="value">${isNaN(battery) ? '--' : battery}%</span></div>
          ${bar(battery, 100)}
        </div>` : ""}
    </div>
  </div>
  `;
}
