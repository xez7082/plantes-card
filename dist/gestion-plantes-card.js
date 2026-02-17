_buildDOM() {
  this.innerHTML = `
    <style>
      .editor { padding:16px; font-family:var(--primary-font-family, sans-serif); }
      .section { background:#f9f9f9; border-radius:8px; padding:16px; margin-bottom:16px; }
      .section-title { font-size:15px; font-weight:bold; margin-bottom:12px; color:#333; }
      .field { margin-bottom:14px; }
      .field label { display:block; font-size:13px; font-weight:500; margin-bottom:4px; color:#555; }
      .field input { width:100%; padding:8px 12px; border:1px solid #ddd; border-radius:6px; font-size:14px; box-sizing:border-box; }
      ha-entity-picker { display:block; }
    </style>

    <div class="editor">
      <div class="section">
        <div class="section-title">Capteurs</div>

        <div class="field">
          <label>Humidité</label>
          <ha-entity-picker data-key="moisture_sensor" include-domains="sensor"></ha-entity-picker>
        </div>

        <div class="field">
          <label>Conductivité</label>
          <ha-entity-picker data-key="conductivity_sensor" include-domains="sensor"></ha-entity-picker>
        </div>

        <div class="field">
          <label>Lumière</label>
          <ha-entity-picker data-key="light_sensor" include-domains="sensor"></ha-entity-picker>
        </div>

        <div class="field">
          <label>Température</label>
          <ha-entity-picker data-key="temperature_sensor" include-domains="sensor"></ha-entity-picker>
        </div>

        <div class="field">
          <label>Batterie</label>
          <ha-entity-picker data-key="battery_sensor" include-domains="sensor"></ha-entity-picker>
        </div>
      </div>
    </div>
  `;

  // 🔹 IMPORTANT : donner hass immédiatement aux pickers
  this.querySelectorAll("ha-entity-picker").forEach(picker => {
    if (this._hass) picker.hass = this._hass;

    picker.addEventListener("value-changed", (e) => {
      this._config[picker.dataset.key] = e.detail.value;
      this._fire();
    });
  });
}
