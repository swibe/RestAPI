const mongoose = require("mongoose");

const User = mongoose.models(
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
        ]
    })
);

module.exports = User;