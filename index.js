const express = require("express");
const bodyParser = require("body-parser");
const log = require("debug")("ak-sender");
const help = require("./help");

const opts = "AK_BASE AK_USERNAME AK_PASSWORD".split(" ");

opts.forEach(env_var => {
  if (!process.env[env_var]) {
    console.log("Missing %s - exiting.", env_var);
    process.exit(1);
  }
});

const config = {
  base: process.env.AK_BASE,
  username: process.env.AK_USERNAME,
  password: process.env.AK_PASSWORD
};

const api = require("./api")(config);

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) =>
  res.send("Hey there! This endpoint only accepts POST")
);

app.post(
  "/",
  (req, res) =>
    help.hasAllKeys(req.body, ["mailing_id", "subject", "html"])
      ? help
          .cloneAndSend(
            api,
            req.body.mailing_id,
            req.body.subject,
            req.body.html
          )
          .then(data => res.json(data)) // sends created and sent mailing back
      : // .catch(err => res.status(500).json(err))
        res.status(400).json({
          error: `'mailing_id', 'subject', and 'html' are required body attributes`
        })
);

app.listen(process.env.PORT || 3000);
log("Server started on %d", process.env.PORT || 3000);
