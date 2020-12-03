const express = require('express');
const https = require('https');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
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
app.use('/api/', limit); // Setting limiter on specific routes

// Data Sanitization against XSS
app.use(xss());
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

    //console.log(func);
    let response = { //test for JSON sending
        ApiResponse: func[0],
        UserID: func[1],
        AuthKey: func[2],
        Wins: func[3],
        Losses: func[4],
        TotalScore: func[5]
    };
    //res.send(func);
    res.send(JSON.stringify(await response)); 
});
app.post('/api/register', async function (req, res) {
    let Username = req.body.Username; //TEST START
    let Password = req.body.Password;
    console.log(req.body);
    console.log("Username:" + Username);
    console.log("Password:" + Password);//TEST  END
    
    let func = await register(Username, Password);
    //console.log(func);
    let response = { //test for JSON sending
        ApiResponse: func[0],
        UserID: func[1],
        AuthKey: func[2]
    };
    //res.send(func);
    res.send(JSON.stringify(await response)); 
});

app.post('/api/getinfo', async function (req, res) {
    let userID = req.body.userID; //TEST START
    let Password = req.body.Password;
    console.log(req.body);
    console.log("Username:" + Username);
    console.log("Password:" + Password);//TEST  END
    
    let func = await register(Username, Password);
    //console.log(func);
    let response = { //test for JSON sending
        apiResponse: func[0],
        UserID: func[1]
    };
    //res.send(func);
    res.send(JSON.stringify(await response)); 
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
                //console.log(result);  
                let usernameResult = result[0].Username; //result[0] since we only expect one result to be returned
                let PasswordResult = result[0].Password;
                let userIDResult = result[0].UserID;

                
                let authKey = str.random(32); //random 16 value

                console.log({PasswordResult});
                try{
                    if (PasswordResult == Password) {
                        
                        var query = "UPDATE authentication SET LastLogin = '" + year + "-" + month + "-" + date + "', AuthKey ='" + authKey + "' WHERE UserID = " + userIDResult;
                        
                        con.query(query,function(err,result,fields){
                        if(err)  
                                throw err;  
                        })

                        var query = "SELECT * FROM player WHERE UserID = '" + userIDResult + "'";
                        con.query(query,function(err,result,fields){
                        if(err)  
                                throw err;  
                        })
                        let wins = result[0].Wins;
                        let losses = result[0].Losses;
                        let totalScore = result[0].TotalScore
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
        con.query(insertOne, async function(err,result,fields){
            try{
                if(err)  
                    throw err;  
                if (result.length > 0) {
                    console.log(result);
                    console.log("INSERTED");  
                }
                console.log("INSERTED1");
            }catch(err){console.log(err)}
        });

        var queryTwo = "SELECT UserID FROM authentication WHERE Username = '" + Username + "'";
        con.query(queryTwo, function(err,result,fields){
            if(err)  
                throw err;  
            if (result.length > 0) {
                //console.log(result);  
                let userIDResult = result[0].UserID; //result[0] since we only expect one result to be returned
                //console.log(userIDResult);
                var insertTwo = "INSERT INTO player(UserID, Wins, Losses, TotalScore) VALUES ("+ userIDResult +", 0, 0, 0);";
                con.query(insertTwo,function(err,result,fields){
                    if(err){
                        throw err;  
                    }
                    else{
                        return([true, userIDResult, authKey]);
                    }
                });
            }
            else{
                return([false, false, false]);
            }
            
        });
    }
    catch(err){
        console.log(err);
    }
    //let userIDResult;
    return([false, false, false]);
}



//PORT LISTEN START
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8888);
console.log("Listening on port 8888");
//API END