const { authJwt } = require("../middlewares");
const db = require("../models");
const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const Role = db.role;
const User = db.user;

exports.allAccess = (req, res) => {
  res.status(200).send("Public Content.");
};

exports.userBoard = (req, res) => {
  res.status(200).send("User Content.");
};

exports.adminBoard = (req, res) => {
  res.status(200).send("Admin Content.");
};

exports.moderatorBoard = (req, res) => {
  res.status(200).send("Moderator Content.");
};

exports.setBio = (req, res) => {
  let token = req.headers["x-access-token"];

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) return res.status(401).send({ message: "Unauthorized!" });

    req.userId = decoded.id;

    User.findById(decoded.id, function (err, user) {
      if (user) {
        if (err) return res.status(401).send({ message: err });

        user.bio = req.body.newbio;

        user.save(function (err) {
          if (err) return res.status(401).send({ message: err });

          res.status(200).send({ message: "Updatet bio" });
        });
      } else {
        return res.status(400).send({ message: "User not found" });
      }
    }); 
  });
};
