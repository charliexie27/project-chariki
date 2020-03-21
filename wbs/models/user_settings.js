let mongoose = require('mongoose');

let UserSettingsSchema = mongoose.Schema({
    _id: {type: String, required: true},
    streamKey: String,
    resolution: String
});

module.exports = mongoose.model('UserSettings', UserSettingsSchema);