'use strict';
const Settings = require('./settings.model');

class SettingsRepository {
  /** Always a single document – get or create */
  static get() {
    return Settings.findOne().lean();
  }

  /** Upsert shop settings */
  static upsert(data) {
    return Settings.findOneAndUpdate({}, data, {
      new:     true,
      upsert:  true,
      runValidators: true,
    }).lean();
  }
}

module.exports = SettingsRepository;
