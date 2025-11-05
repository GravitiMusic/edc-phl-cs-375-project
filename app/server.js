//added for CodeMirror
const path = require("path");



const express = require("express");
let cookieParser = require("cookie-parser");

const app = express();

const port = 3000;
const hostname = "localhost";

//removed for codemirror
//app.use(express.static("public"));

//testing for Codemirror:
app.use(express.static(path.join(__dirname, "public")));

//Middleware
app.use(express.json());
app.use(cookieParser())

//Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});

module.exports = app;
