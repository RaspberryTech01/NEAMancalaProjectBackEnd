const express = require('express');
const https = require('https');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const helmet = require('helmet'); 

const serverName = "xx"; //server name - the domain name, xx.domainname.com
const serverDir = "ubuntu"; //serverHomeDirName - the home directory of the user running this script
var privateKey  = fs.readFileSync('/etc/letsencrypt/live/' + serverName + '.sunnahvpn.com/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/letsencrypt/live/' + serverName + '.sunnahvpn.com/fullchain.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};
const app = express();

app.use(express.json({ limit: '10kb' })); // Body limit is 10
//SECURITY START 
const limit = rateLimit({
    max: 100,// max requests
    windowMs: 60 * 60 * 1000, // 1 Hour
    message: 'Too many requests' // message to send
});
app.use('/api/', limit); // Setting limiter on specific route

// Data Sanitization against XSS
app.use(xss());
// adding Helmet to enhance your API's security
app.use(helmet());
//SECURITY END
//API START
app.get('/api/login/:username/:password', (req, res) => {
    let usernameTest = req.params.username;
    let passwordTest = req.params.password;
    console.log(usernameTest);
    console.log(passwordTest);
    res.send("Working I think");
})
//PORT LISTEN START
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8888);
console.log("Listening on port 8888");
//API END