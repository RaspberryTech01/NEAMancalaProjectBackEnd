const express = require('express');
const https = require('https');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); 
const str = require('@supercharge/strings')
const { default: contentSecurityPolicy } = require('helmet/dist/middlewares/content-security-policy');
const { response } = require('express');
var mysql = require('mysql');  
var con = mysql.createConnection({  
    host:'localhost',  
    user:'xx',  
    Password:'xx',  
    database:'mysql'  
}); 
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});
const serverName = "xx"; //server name - the domain name, xx.domainname.com

var privateKey  = fs.readFileSync('/etc/letsencrypt/live/' + serverName + '.sunnahvpn.com/privkey.pem', 'utf8'); //location to https private key
var certificate = fs.readFileSync('/etc/letsencrypt/live/' + serverName + '.sunnahvpn.com/fullchain.pem', 'utf8'); //location to fullchain key
var credentials = {key: privateKey, cert: certificate};
const app = express();

app.use(express.json({ limit: '10kb' })); // Body limit is 10
//SECURITY START 
const limit = rateLimit({
    max: 100, // max requests
    windowMs: 60 * 60 * 1000, // 1 Hour
    message: 'Too many requests' // message to send
});
app.use('/api/', limit); // Setting limiter on specific routes

// adding Helmet to enhance your API's security
app.use(helmet());
//SECURITY END
//API START

app.post('/api/login', async function (req, res) {
    let Username = req.body.Username; //TEST START
    let Password = req.body.Password;
    console.log(req.body);
    console.log("Username:" + Username);
    console.log("Password:" + Password); //TEST END

    let func = await login(Username, Password);

    let response = { //test for JSON sending
        ApiResponse: func[0],
        UserID: func[1],
        AuthKey: func[2],
        Wins: func[3],
        Losses: func[4],
        TotalScore: func[5]
    };
    res.send(JSON.stringify(response)); 
});
app.post('/api/register', async function (req, res) {
    let Username = req.body.Username; //TEST START
    let Password = req.body.Password;
    console.log(req.body);
    console.log("Username:" + Username);
    console.log("Password:" + Password);//TEST  END
    
    let func = await register(Username, Password);
    let response = { //test for JSON sending
        ApiResponse: func[0],
        UserID: func[1],
        AuthKey: func[2]
    };
    res.send(JSON.stringify(response)); 
});

app.post('/api/getinfo', async function (req, res) {
    let UserID = req.body.UserID; //TEST START
    let AuthKey = req.body.AuthKey;
    console.log(req.body);
    console.log("UserID:" + UserID);
    console.log("AuthKey:" + AuthKey);//TEST  END
    
    let func = await getInfo(UserID, AuthKey);
    let response = { //test for JSON sending
        ApiResponse: func[0],
        AISave: func[1],
        UserSave: func[2]
    };
    res.send(JSON.stringify(response)); 
});

const query = (q) => new Promise((resolve, reject) => {
    con.query(q, function (err, result, fields) {
      if (err) {
        reject(err);
        return;
      }
  
      resolve(result);
    });
  }); 
  
async function login(Username, Password) {  
    var promise = new Promise(async function (resolve, reject) {
        //DATE
        let date_ob = new Date();
        let year = date_ob.getFullYear();
        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
        let date = ("0" + date_ob.getDate()).slice(-2);
        //QUERY
        var query = "SELECT * FROM authentication WHERE Username = '" + Username + "'";
        con.query(query,function(err,result,fields){
            if(err)  
                throw err;  
            if (result.length > 0) {
                let usernameResult = result[0].Username; //result[0] since we only expect one result to be returned
                let PasswordResult = result[0].Password;
                let userIDResult = result[0].UserID;
                let authKey = str.random(32); //random 16 value

                try{
                    if (PasswordResult == Password) {
                        
                        var updateOne = "UPDATE authentication SET LastLogin = '" + year + "-" + month + "-" + date + "', AuthKey ='" + authKey + "' WHERE UserID = " + userIDResult;
                        await query(updateOne);

                        var queryTwo = "SELECT * FROM player WHERE UserID = '" + userIDResult + "'";
                        let selectResultTwo = await query(queryTwo)
                        let wins = selectResultTwo[0].Wins;
                        let losses = selectResultTwo[0].Losses;
                        let totalScore = selectResultTwo[0].TotalScore;
                        //add user game ID
                        resolve([true, userIDResult, authKey, wins, losses, totalScore]);
                    }
                    else{
                        resolve([false, "null", false, false, false]);
                    }
                }
                catch{
                    resolve([false, "null", false, false, false]);
                }
            }
            else{
                resolve([false, "null", false, false, false]);
            }
        });
    });  
    return promise;
}

async function register(Username, Password){
    let date_ob = new Date();
    let year = date_ob.getFullYear();
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let date = ("0" + date_ob.getDate()).slice(-2);
    let authKey = str.random(32); //random 16 value
    let breakOut = false;
   
    try{
        var insertOne = "INSERT INTO authentication (Username, Password, LastLogin, AuthKey) VALUES ('" + Username + "', '" + Password + "', '"+ year +"-"+ month +"-"+ date +"', '" + authKey + "');"; 
        await query(insertOne);

        var queryOne = "SELECT UserID FROM authentication WHERE Username = '" + Username + "'";
        let selectResultOne = await query(queryOne);
        if (selectResultOne.length > 0){
            let userIDResult = selectResultOne[0].UserID;
            var insertTwo = "INSERT INTO player(UserID, Wins, Losses, TotalScore) VALUES ("+ userIDResult +", 0, 0, 0);";
            let insertResultTwo = await query(insertTwo);
            return([true, userIDResult, authKey]);
        }
    }
    catch(err){
        console.log(err);
    }
    //let userIDResult;
    return([false, false, false]);
}
async function getInfo(Username, UserID, AuthKey){
    try{
        var queryOne = `SELECT AuthKey FROM authentication where UserID = ${UserID}`;
        let selectResultOne = await query(queryOne);
        if (selectResultOne.length > 0){
            let authKeyResult = selectResultOne[0].AuthKey;
            if(authKeyResult == AuthKey){

            }
            else{

            }
        }
    }
    catch(err){

    }
}
//PORT LISTEN START
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8888);
console.log("Listening on port 8888");
//API END