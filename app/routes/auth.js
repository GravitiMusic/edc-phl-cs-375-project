const express = require('express');
const router = express.Router();
let argon2 = require("argon2");
let crypto = require("crypto");
let db = require('../database');


let tokenStorage = {};

/* returns a random 32 byte string */
function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

let cookieOptions = {
  httpOnly: true,
  secure: true, 
  sameSite: "strict",
};

function validateLogin(body) {
  return true; //TODO
}

router.post("/login", async (req, res) => {
  let { body } = req;
  console.log("Got body: ", body)
  if (!validateLogin(body)) {
    console.log("Invalid login");
    res.sendStatus(400);
  }

  let {username, password} = body;
  
  let result;
  try {
    result = await db.query(
      "SELECT password FROM users WHERE username = $1",
      [username],
    );
  } catch (error) {
    console.log("SELECT FAILED", error);
    return res.sendStatus(500);
  }

  // username doesn't exist (to be expected every time because we haven't implemented acc creation)
  if (result.rows.length === 0) {
    console.log("Username doesn't exist:", username)
    return res.sendStatus(400); //TODO
  }
  let hash = result.rows[0].password;
  console.log(username, password, hash);


  let verifyResult;
  try {
    verifyResult = await argon2.verify(hash, password);
  } catch (error) {
    console.log("VERIFY FAILED", error);
    return res.sendStatus(500); // TODO
  }

  // password doesn't match
   if (!verifyResult) {
    console.log("Credentials didn't match");
    return res.sendStatus(400); // TODO
  }

  // generate login token, save in cookie
  let token = makeToken();
  console.log("Generated token", token);
  tokenStorage[token] = username;
  return res.cookie("token", token, cookieOptions).send();
});

module.exports = router;