let mongoose = require('mongoose');
let bcrypt = require('bcrypt');

let UserSchema = mongoose.Schema({
    _id: {type: String, required: true},
    password: {type: String, required: true}
});

UserSchema.pre('save', function(next) {
    let user = this;

    // generate a new salt and hash
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(user.password, salt, function(err, hash) {
            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = function(candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.password, function(err, valid) {
        if (err) return callback(err);
        callback(null, valid);
    });
};

module.exports = mongoose.model('User', UserSchema);