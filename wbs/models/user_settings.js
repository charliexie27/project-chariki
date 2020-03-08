let mongoose = require('mongoose');
let bcrypt = require('bcrypt');

let UserSettingsSchema = mongoose.Schema({
    _id: {type: String, required: true},
    streamKey: String
});

UserSettingsSchema.pre('save', function(next) {
    let userSettings = this;

    // generate a new salt and hash
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(userSettings.streamKey, salt, function(err, hash) {
            userSettings.streamKey = hash;
            next();
        });
    });
});

module.exports = mongoose.model('UserSettings', UserSettingsSchema);