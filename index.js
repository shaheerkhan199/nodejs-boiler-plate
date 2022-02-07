const express = require("express");
const app = express();
const { PORT, jwtPrivateKey } = require("./startup/config");
var cors = require('cors');
const fs = require('fs');
const https = require("https");

app.use(cors())
app.use(express.static('public'));
app.use("/public", express.static('public'));

app.use(express.urlencoded({
  extended: false
}));
app.use(express.json());

require("./startup/routes")(app);

if (!jwtPrivateKey) {
  console.error("FATAL ERROR: jwtPrivateKey is not defined.")
  process.exit(1)
}

const port = PORT || 3001
//For Dev http
if (process.env.NODE_ENV == "development") {
  app.listen(port, () => console.log(`Listening on port: ${port}, and the environment is: ${process.env.NODE_ENV}`));
}
else {
  var options = {
    key: fs.readFileSync('/etc/letsencrypt/live/tickfilm.5stardesigners.net/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/tickfilm.5stardesigners.net/fullchain.pem'),
    passphrase: ''
  };
  https.createServer(options, app).listen(port, () => console.log(`Listening on port: ${port}, and the environment is: ${process.env.NODE_ENV}`));
}