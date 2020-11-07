const express = require('express');
const https = require('https');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const helmet = require('helmet'); 
const { default: contentSecurityPolicy } = require('helmet/dist/middlewares/content-security-policy');
const { response } = require('express');
var mysql = require('mysql');  
var con = mysql.createConnection({  
    host:'localhost',  
    user:'xx',  
    password:'xx',  
    database:'mysql'  
}); 

const serverName = "xx"; //server name - the domain name, xx.domainname.com

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

app.post('/api/login', function (req, res) {
    response = { //test for JSON sending
        username: req.body.username,
        password: req.body.password
    };
    let username = req.body.username;
    let password = req.body.password;
    console.log(req.body);
    console.log("username:" + username);
    console.log("password:" + password);
    let func = await login(username, password);
    console.log(func);
    res.send(JSON.stringify(response)); 
});
app.post('/api/register', function (req, res) {
    let username = req.body.username;
    let password = req.body.password;
    console.log(req.body);
    console.log("username:" + username);
    console.log("password:" + password);
    res.send("OK");
});

async function login(username, password) {
    var query = "SELECT * FROM authentication"
    con.query(query,function(err,rows){  
        if(err)  
            throw err;  
        console.log(rows);  
    });  
}
//PORT LISTEN START
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8888);
console.log("Listening on port 8888");
//API END