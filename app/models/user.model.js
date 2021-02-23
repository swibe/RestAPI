const mongoose = require('mongoose');

const User = mongoose.model(
    "User",
    new mongoose.Schema({
        username: String,
        email: String,
        password: String,
        roles: [
            {
                type: mongoose.Schema.Types.ObjectID,
                ref: "Role"
            }
        ],
        bio: String
    })
);

module.exports = User;