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
    database:'congkak'  
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
        UserID: func[1]
    };
    res.send(JSON.stringify(response)); 
});

app.post('/api/getinfo', async function (req, res) {
    let Username = req.body.Username; //TEST START
    let UserID = req.body.UserID; 
    let AuthKey = req.body.AuthKey;
    console.log(req.body);
    console.log("UserID:" + UserID);
    console.log("AuthKey:" + AuthKey);//TEST  END
    
    let func = await getInfo(Username, UserID, AuthKey);
    let response = { //test for JSON sending
        ApiResponse: func[0],
        UserGameID: func[1],
        AISave: func[2],
        UserSave: func[2],
        WhichTurn: func[3]
    };
    res.send(JSON.stringify(response)); 
});
app.post('/api/savegame', async function (req, res) {
    let Username = req.body.Username; //TEST START
    let UserID = req.body.UserID; 
    let AuthKey = req.body.AuthKey;
});

app.post('/api/savedata', async function (req, res) {
    let Username = req.body.Username; //TEST START
    let UserID = req.body.UserID; 
    let AuthKey = req.body.AuthKey;
    let Shells = req.body.Shells;
    let Win = req.body.Win;

    let func = await updateData(Username, UserID, AuthKey, Shells, Win);
    let response = { //test for JSON sending
        ApiResponse: func[0]
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
    //DATE
    try{
        let date_ob = new Date();
        let year = date_ob.getFullYear();
        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
        let date = ("0" + date_ob.getDate()).slice(-2);
        //QUERY
        let queryOne = `SELECT * FROM authentication WHERE Username = "${Username}";`;
        let selectResultOne = await query(queryOne);
        if(selectResultOne.length > 0){
            try{
                let PasswordResult = selectResultOne[0].Password;
                let authKey = str.random(32); //random 32 bit value
                if (PasswordResult == Password) {
                    
                    var updateOne = `UPDATE authentication SET LastLogin = "${year}-${month}-${date}", AuthKey = "${authKey}" WHERE Username = "${Username}";`;
                    await query(updateOne);

                    var queryTwo = `SELECT * FROM player WHERE Username = "${Username}";`;
                    let selectResultTwo = await query(queryTwo)
                    let userIDResult = selectResultTwo[0].UserID;
                    let wins = selectResultTwo[0].Wins;
                    let losses = selectResultTwo[0].Losses;
                    let totalScore = selectResultTwo[0].TotalScore;
                    //add user game ID
                    return([true, userIDResult, authKey, wins, losses, totalScore]);
                }
                else{
                    return([false, "null", "null", "null", "null"]);
                }
            }
            catch(err){
                console.log(err);
                return([false, "null", "null", "null", "null"]);
            }
        }
    }
    catch{
        return([false, "null", false, false, false]);
    }
}

async function register(Username, Password){
    let date_ob = new Date();
    let year = date_ob.getFullYear();
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let date = ("0" + date_ob.getDate()).slice(-2);
    let authKey = str.random(32); //random 32 bit value
    try{
        var insertOne = `INSERT INTO authentication (Username, Password, LastLogin, AuthKey) VALUES ("${Username}", "${Password}", "${year}-${month}-${date}", "${authKey}");`; 
        await query(insertOne);

        var insertTwo = `INSERT INTO player(Username, Wins, Losses, TotalScore) VALUES ("${Username}", 0, 0, 0);`;
        await query(insertTwo);

        var selectOne = `SELECT UserID FROM player WHERE Username = "${Username}";`
        selectResultOne = await query(selectOne);
        return([true, selectResultOne[0].UserID]);
    }
    catch(err){
        console.log(err);
        return([false, false]);
    }
}
async function getInfo(Username, UserID, AuthKey){
    try{
        var queryOne = `SELECT AuthKey FROM authentication WHERE Username = "${Username}";`;
        let selectResultOne = await query(queryOne);
        if (selectResultOne.length > 0){
            let authKeyResult = selectResultOne[0].AuthKey;
            if(authKeyResult == AuthKey){
                var queryTwo = `SELECT UserGameID, UserOneShells, UserTwoShells, WhichTurn FROM savedgame WHERE UserID = "${UserID}" ORDER BY SavedDate DESC;`;
                let selectResultTwo = await query(queryTwo);
                if(selectResultTwo.length > 0){
                    let UserGameID = selectResultTwo[0].UserGameID;
                    let UserOneShells = selectResultTwo[0].UserOneShells;
                    let UserTwoShells = selectResultTwo[0].UserTwoShells;
                    let WhichTurn = selectResultTwo[0].WhichTurn;
                    return([true, UserGameID, UserOneShells, UserTwoShells, WhichTurn]);
                }
                else{
                    return([false, "null", "null", "null", "null"]);
                }
            }
            else{
                return([false, "null", "null", "null", "null"]);
            }
        }
    }
    catch(err){
        console.log(err);
        return([false, "null", "null", "null", "null"]);
    }
}

async function saveGame(Username, UserID, AuthKey){
    try{
        var queryOne = `SELECT AuthKey FROM authentication WHERE Username = "${Username}";`;
        let selectResultOne = await query(queryOne);
        if (selectResultOne.length > 0){
            let authKeyResult = selectResultOne[0].AuthKey;
            if(authKeyResult == AuthKey){

            }
        }
    }
    catch(err){
        console.log(err);
        return([false, "null", "null", "null", "null"]);
    }
}
async function updateData(Username, UserID, AuthKey, Shells, Win){
    try{
        var queryOne = `SELECT AuthKey FROM authentication WHERE Username = "${Username}";`;
        let selectResultOne = await query(queryOne);
        if (selectResultOne.length > 0){
            let authKeyResult = selectResultOne[0].AuthKey;
            if(authKeyResult == AuthKey){
                var queryTwo = `SELECT * FROM authentication WHERE Username = "${Username}";`;
                let selectResultTwo = await query(queryTwo);
                if(Win == true){
                    let wins = selectResultTwo.Wins;
                    let total = selectResultTwo.TotalScore;
                    wins++;
                    total = total + parseInt(Shells);
                    var updateOne = `UPDATE player SET Wins = "${wins}", TotalScore = "${authKey}" WHERE Username = "${Username}";`;
                    await query(updateOne);
                }
                else if(Win == false){
                    let losses = selectResultTwo.Losses;
                    let total = selectResultTwo.TotalScore;
                    Losses++;
                    total = total + parseInt(Shells);
                    var updateOne = `UPDATE player SET Wins = "${wins}", TotalScore = "${authKey}" WHERE Username = "${Username}";`;
                    await query(updateOne);
                }
                
            }
        }
    }
    catch(err){
        console.log(err);
        return([false, "null", "null", "null", "null"]);
    }
}
//PORT LISTEN START
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8888);
console.log("Listening on port 8888");
//API END