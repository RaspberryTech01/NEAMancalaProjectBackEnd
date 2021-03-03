const express = require('express'); //used in running the express API server
const https = require('https'); //used for securing the API route
const fs = require('fs'); //filesystem module
const rateLimit = require('express-rate-limit'); //library to set a rate limit on routes
const helmet = require('helmet');  //used to help prevent against API attacks
const str = require('@supercharge/strings') //used for generating random strings
const { default: contentSecurityPolicy } = require('helmet/dist/middlewares/content-security-policy');//helmet middleware
var mysql = require('mysql');  //mysql database library
var con = mysql.createConnection({  //creates the mysql connection
    host:'localhost',  //host
    user:'xx',   //username
    Password:'xx',   //password
    database:'congkak'  //database
}); 
con.connect(function(err) { //try and connect
    if (err) throw err;
    console.log("Connected!");
});
const serverName = "xx"; //server name - the domain name, xx.domainname.com

var privateKey  = fs.readFileSync('/etc/letsencrypt/live/' + serverName + '.sunnahvpn.com/privkey.pem', 'utf8'); //location to https private key
var certificate = fs.readFileSync('/etc/letsencrypt/live/' + serverName + '.sunnahvpn.com/fullchain.pem', 'utf8'); //location to fullchain key
var credentials = {key: privateKey, cert: certificate};
const app = express(); //instantiate express

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

app.post('/api/login', async function (req, res) { //API route
    let Username = req.body.Username; 
    let Password = req.body.Password;
    console.log(req.body); //TEST START
    console.log("Username:" + Username);
    console.log("Password:" + Password); //TEST END

    let func = await login(Username, Password);//login user

    let response = { 
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
    let Username = req.body.Username; 
    let Password = req.body.Password;
    console.log(req.body); //TEST START
    console.log("Username:" + Username);
    console.log("Password:" + Password); //TEST END
    
    let func = await register(Username, Password); //register user
    let response = { //test for JSON sending
        ApiResponse: func[0],
        UserID: func[1]
    };
    res.send(JSON.stringify(response)); 
});

app.post('/api/getinfo', async function (req, res) { 
    let Username = req.body.Username; 
    let UserID = req.body.UserID; 
    let AuthKey = req.body.AuthKey;
    console.log(req.body);//TEST START
    console.log("UserID:" + UserID);
    console.log("AuthKey:" + AuthKey);//TEST  END
    
    let func = await getInfo(Username, UserID, AuthKey); //get user info
    let response = { 
        ApiResponse: func[0],
        UserGameID: func[1],
        UserSave: func[2],
        AISave: func[3],
        WhichTurn: func[4]
    };
    res.send(JSON.stringify(response)); 
});
app.post('/api/savegame', async function (req, res) {
    let Username = req.body.Username; 
    let UserID = req.body.UserID; 
    let AuthKey = req.body.AuthKey;

    let UserSave = req.body.UserSave;
    let AISave = req.body.AISave;
    let WhichTurn = req.body.WhichTurn;

    let func = await saveGame(Username, UserID, AuthKey, UserSave, AISave, WhichTurn); //save user's game
    let response = { 
        ApiResponse: func[0]
    };
    res.send(JSON.stringify(response)); 
});

app.post('/api/savedata', async function (req, res) { 
    let Username = req.body.Username; 
    let UserID = req.body.UserID; 
    let AuthKey = req.body.AuthKey;
    let Shells = req.body.Shells;
    let Win = req.body.Win;

    let func = await updateData(Username, UserID, AuthKey, Shells, Win); //update data after game
    let response = { 
        ApiResponse: func[0]
    };
    res.send(JSON.stringify(response)); 
});

app.post('/api/leaderboard', async function (req, res) {
    let func = await getLeaderboard(); //get leaderboard data
    let response = { 
        UserOneName: func[0],
        UserOnePoints: func[1],
        UserTwoName: func[2],
        UserTwoPoints: func[3],
        UserThreeName: func[4],
        UserThreePoints: func[5]
    };
    res.send(JSON.stringify(response));
});


const query = (q) => new Promise((resolve, reject) => { //function for running queries on the database
    con.query(q, function (err, result, fields) {
      if (err) {
        reject(err);
        return;
      }
  
      resolve(result);
    });
  }); 
  
async function login(Username, Password) {  //function for logging in user
    //DATE
    try{
        let date_ob = new Date(); //split date into parts
        let year = date_ob.getFullYear();
        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
        let date = ("0" + date_ob.getDate()).slice(-2); 
        //QUERY
        let queryOne = `SELECT * FROM authentication WHERE Username = "${Username}";`; //get all data about user
        let selectResultOne = await query(queryOne);
        if(selectResultOne.length > 0){ //if user is found
            try{
                let PasswordResult = selectResultOne[0].Password;
                let authKey = str.random(32); //random 32 bit value for authorization key
                if (PasswordResult == Password) { //if passwords match
                    
                    var updateOne = `UPDATE authentication SET LastLogin = "${year}-${month}-${date}", AuthKey = "${authKey}" WHERE Username = "${Username}";`;
                    await query(updateOne);

                    var queryTwo = `SELECT * FROM player WHERE Username = "${Username}";`;
                    let selectResultTwo = await query(queryTwo)
                    let userIDResult = selectResultTwo[0].UserID;
                    let wins = selectResultTwo[0].Wins;
                    let losses = selectResultTwo[0].Losses;
                    let totalScore = selectResultTwo[0].TotalScore;
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

async function register(Username, Password){ //function for registering
    let date_ob = new Date();
    let year = date_ob.getFullYear();
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let date = ("0" + date_ob.getDate()).slice(-2);
    let authKey = str.random(32); //random 32 bit value
    try{
        var insertOne = `INSERT INTO authentication (Username, Password, LastLogin, AuthKey) VALUES ("${Username}", "${Password}", "${year}-${month}-${date}", "${authKey}");`; 
        await query(insertOne); //tries and insert new user

        var insertTwo = `INSERT INTO player(Username, Wins, Losses, TotalScore) VALUES ("${Username}", 0, 0, 0);`;
        await query(insertTwo);

        var selectOne = `SELECT UserID FROM player WHERE Username = "${Username}";`
        selectResultOne = await query(selectOne);
        return([true, selectResultOne[0].UserID]);
    }
    catch(err){ //if an error occurs
        console.log(err);
        return([false, false]);
    }
}
async function getInfo(Username, UserID, AuthKey){ //get user saved game from DB
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

async function saveGame(Username, UserID, AuthKey, UserOneShells, UserTwoShells, WhichTurn){ //save a user's game
    try{
        var queryOne = `SELECT AuthKey FROM authentication WHERE Username = "${Username}";`;
        let selectResultOne = await query(queryOne);
        if (selectResultOne.length > 0){
            let authKeyResult = selectResultOne[0].AuthKey;
            if(authKeyResult == AuthKey){
                date = new Date(); //had to use UTC as had some issues with saving in database
                date = date.getUTCFullYear() + '-' +
                    ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
                    ('00' + date.getUTCDate()).slice(-2) + ' ' + 
                    ('00' + date.getUTCHours()).slice(-2) + ':' + 
                    ('00' + date.getUTCMinutes()).slice(-2) + ':' + 
                    ('00' + date.getUTCSeconds()).slice(-2);
                var insertOne = `INSERT INTO savedgame (UserID, UserOneShells, UserTwoShells, WhichTurn, SavedDate) VALUES
                ("${UserID}", "${UserOneShells}", "${UserTwoShells}", "${WhichTurn}", "${date}");`
                await query(insertOne)
                return([true])
            }
            else{
                return([false])
            }
        }
    }
    catch(err){
        console.log(err);
        return([false]);
    }
}
async function updateData(Username, UserID, AuthKey, Shells, Win){ //updates user data in database
    try{
        var queryOne = `SELECT AuthKey FROM authentication WHERE Username = "${Username}";`;
        let selectResultOne = await query(queryOne);
        if (selectResultOne.length > 0){
            let authKeyResult = selectResultOne[0].AuthKey;
            if(authKeyResult == AuthKey){
                var queryTwo = `SELECT * FROM player WHERE Username = "${Username}";`;
                let selectResultTwo = await query(queryTwo);
                if(Win == true){ //if user won the game
                    let wins = selectResultTwo[0].Wins;
                    let total = selectResultTwo[0].TotalScore;
                    wins++;
                    total = total + parseInt(Shells);
                    var updateOne = `UPDATE player SET Wins = "${wins}", TotalScore = "${total}" WHERE Username = "${Username}";`;
                    await query(updateOne);
                    return[true];
                }
                else if(Win == false){ //if user lost the game
                    let losses = selectResultTwo[0].Losses;
                    let total = selectResultTwo[0].TotalScore;
                    losses++;
                    total = total + parseInt(Shells);
                    var updateOne = `UPDATE player SET Losses = "${losses}", TotalScore = "${total}" WHERE Username = "${Username}";`;
                    await query(updateOne);
                    return [true];
                }
                return [false]
            }
            else{
                return([false])
            }
        }
    }
    catch(err){
        console.log(err);
        return([false]);
    }
}
async function getLeaderboard(){ //gets leaderboard data
    try{
        let result
        var queryOne = `SELECT Username, TotalScore FROM player ORDER BY TotalScore DESC;` //get players in descending order of score
        let selectResultOne = await query(queryOne);
        if(selectResultOne < 1){ //if there are no users in database
            return["None", 0, "None", 0, "None", 0]
        }
        else if(selectResultOne < 2){ //if only 1 person in database
            return[selectResultOne[0].Username, selectResultOne[0].TotalScore, "None", 0, "None", 0]
        }
        else if(selectResultOne < 3){ //if only 2 people in database
            return[selectResultOne[0].Username, selectResultOne[0].TotalScore, 
            selectResultOne[1].Username, selectResultOne[1].TotalScore, "None", 0]
        }
        else{ //if 3 or more people in database
            return[selectResultOne[0].Username, selectResultOne[0].TotalScore, 
            selectResultOne[1].Username, selectResultOne[1].TotalScore,
             selectResultOne[2].Username, selectResultOne[2].TotalScore]
        }
    }
    catch(err){
        console.log(err)
    }
}
//PORT LISTEN START
var httpsServer = https.createServer(credentials, app); //https creation
httpsServer.listen(8888); //run https server on port 8888
console.log("Listening on port 8888");
//API END