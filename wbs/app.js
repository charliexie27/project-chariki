const express = require('express');
const fs = require('fs');
const child_process = require('child_process');
const WebSocketServer = require('ws').Server;
const app = express();

let User = require('./models/users');
let UserSettings = require('./models/user_settings');

let mongoose = require('mongoose');
let mongoDb = 'mongodb://localhost:27017/wbs_db';
mongoose.connect(mongoDb, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

let bodyParser = require('body-parser');
app.use(bodyParser.json());

const cookie = require('cookie');
const cookieParser = require('cookie-parser');

const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const secret = 'ekdIVty7KtoWu92wKodT';
const store = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
});
app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
    store: store,
    cookie: {httpOnly: true, secure: true, sameSite: true}
}));

app.use(function(req, res, next){
    req.user = ('user' in req.session)? req.session.user : null;
    let username = (req.user)? req.user._id : '';
    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
        path : '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
        secure: true,
        sameSite: true
    }));
    next();
});

app.use(express.static('static'));

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

let isAuthenticated = function(req, res, next) {
    if (!req.user) return res.status(401).end("access denied");
    next();
};

const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const ivLength = 16;
const encryptionKey = 'RheOGbv77XZBhIaXr86sLRzC8jWKumPQ';

let encryptStreamKey = function(streamKey) {
    if (streamKey.length === 0){
        return '';
    }
    let iv = crypto.randomBytes(ivLength);
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey), iv);
    let encrypted = cipher.update(streamKey);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

let decryptStreamKey = function(encryptedStreamKey) {
    if (encryptedStreamKey.length === 0){
        return '';
    }
    let streamKeyParts = encryptedStreamKey.split(':');
    let iv = Buffer.from(streamKeyParts.shift(), 'hex');
    let encryptedText = Buffer.from(streamKeyParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(encryptionKey), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
};

// curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/signup/
app.post('/signup/', function (req, res, next) {
    // extract data from HTTP request
    if (!('username' in req.body)) return res.status(400).end('username is missing');
    if (!('password' in req.body)) return res.status(400).end('password is missing');
    User.countDocuments({_id: req.body.username}, function(err, count){
        if (err) return res.status(500).end(err);
        if (count != 0) return res.status(409).end("username " + req.body.username + " already exists");

        let newUser = new User({
            _id: req.body.username,
            password: req.body.password
        });
        let newUserSettings = new UserSettings({
           _id: req.body.username,
           streamKey: '',
           resolution: '1280x720'
        });
        newUser.save(function(err){
            if (err) return res.status(500).end(err);
            newUserSettings.save(function(err){
                if (err) return res.status(500).end(err);
                User.findOne({_id: req.body.username}, function(err, user){
                    if (err) return res.status(500).end(err);
                    // start a session
                    req.session.user = user;
                    res.setHeader('Set-Cookie', cookie.serialize('username', user._id, {
                        path : '/',
                        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
                        secure: true,
                        sameSite: true
                    }));
                    return res.json("user " + user._id + " signed up");
                });
            });
        });
    });
});

// curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/signin/
app.post('/signin/', function (req, res, next) {
    // extract data from HTTP request
    if (!('username' in req.body)) return res.status(400).end('username is missing');
    if (!('password' in req.body)) return res.status(400).end('password is missing');

    // retrieve user from the database
    User.findOne({_id: req.body.username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("Invalid username or password");

        user.comparePassword(req.body.password, function(err, valid){
            if (err) return res.status(500).end(err);
            if (!valid) return res.status(401).end("Invalid username or password");
            // start a session
            req.session.user = user;
            res.setHeader('Set-Cookie', cookie.serialize('username', user._id, {
                path : '/',
                maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
                secure: true,
                sameSite: true
            }));
            return res.json("user " + req.body.username + " signed in");
        });
    });
});

// curl -b cookie.txt -c cookie.txt localhost:3000/signout/
app.get('/signout/', function (req, res, next) {
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
        path : '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
        secure: true,
        sameSite: true
    }));
    res.redirect('/');
});

// USER SETTINGS
app.post('/settings/', isAuthenticated, function (req, res, next) {
    // extract data from HTTP request
    let settings = {};
    if ('streamKey' in req.body){
        settings.streamKey = encryptStreamKey(req.body.streamKey);
    }
    if ('resolution' in req.body){
        settings.resolution = req.body.resolution;
    }
    UserSettings.updateOne({_id: req.user._id}, settings , { upsert: true }, function(err, count){
        if (err) return res.status(500).end(err);
        return res.json("User settings updated successfully for " + req.user._id + ".");
    });
});

app.get('/settings/', isAuthenticated, function(req, res, next) {
    UserSettings.findOne({_id: req.user._id}, function(err, userSettings){
        if (err) return res.status(500).end(err);
        if (!userSettings) return res.status(404).end('User settings not found.');
        if (userSettings.streamKey){
            userSettings.streamKey = decryptStreamKey(userSettings.streamKey);
        }
        return res.json(userSettings);
    });
});

const http = require('http');
const PORT = 3000;

// let privateKey = fs.readFileSync( 'server.key' );
// let certificate = fs.readFileSync( 'server.crt' );
// let config = {
//     key: privateKey,
//     cert: certificate
// };

const server = http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});

const wss = new WebSocketServer({
    server: server
});

/*
    Code adapted from https://github.com/fbsamples/Canvas-Streaming-Example
 */
wss.on('connection', (ws, req) => {
    // Ensure that the URL starts with '/rtmp/', and extract the target RTMP URL.
    let match;
    if ( !(match = req.url.match(/^\/rtmp\/(.*)$/)) ) {
        ws.terminate(); // No match, reject the connection.
        return;
    }

    ws.upgradeReq = req;
    //get sessionID
    let cookies = cookie.parse(ws.upgradeReq.headers.cookie);
    let sid = cookieParser.signedCookie(cookies["connect.sid"], secret);
    //get the session object
    store.get(sid, function (err, ss) {
        //create the session object and append on upgradeReq
        store.createSession(ws.upgradeReq, ss);

        if (!ws.upgradeReq.session.user){
            console.log('Access denied.');
            ws.terminate();
            return;
        }

        // retrieve user from the database
        UserSettings.findOne({_id: ws.upgradeReq.session.user._id}, function(err, userSettings){
            if (err){
                console.log('An error occured while retrieve user settings from the database: ' + err);
                ws.terminate();
                return;
            }

            if (!userSettings || !userSettings.streamKey || userSettings.streamKey === ''){
                console.log('User settings stream key not found.');
                ws.terminate();
                return;
            }

            const rtmpUrl = decodeURIComponent(match[1]).replace('$STREAM_KEY$', decryptStreamKey(userSettings.streamKey));
            console.log('Starting stream on RTMP URL:', rtmpUrl);

            const ffmpeg = child_process.spawn('ffmpeg', [
                '-y',
                // FFmpeg will read input video from STDIN
                '-i', '-',

                '-s', '1280x720',

                '-framerate', '30',

                '-ac', '2',

                '-ar', '44100',

                '-b:v', '3000k',

                '-minrate', '3000k',

                '-maxrate', '3000k',

                // or libx264
                '-c:v', 'copy',

                '-preset', 'ultrafast',

                '-acodec', 'aac',

                '-threads', '0',

                '-pix_fmt', 'yuv420p',

                '-f', 'flv',

                rtmpUrl
            ]);

            // If FFmpeg stops for any reason, close the WebSocket connection.
            ffmpeg.on('end', (code, signal) => {
                console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
                ws.terminate();
            });

            // If FFmpeg stops for any reason, close the WebSocket connection.
            ffmpeg.on('close', (code, signal) => {
                console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
                ws.terminate();
            });

            // Handle STDIN pipe errors by logging to the console.
            // These errors most commonly occur when FFmpeg closes and there is still
            // data to write.  If left unhandled, the server will crash.
            ffmpeg.stdin.on('error', (e) => {
                console.log('FFmpeg STDIN Error', e);
            });

            // FFmpeg outputs all of its messages to STDERR.  Let's log them to the console.
            ffmpeg.stderr.on('data', (data) => {
                console.log(data.toString());
            });

            // When data comes in from the WebSocket, write it to FFmpeg's STDIN.
            ws.on('message', (msg) => {
                console.log('DATA', msg);
                ffmpeg.stdin.write(msg);
            });

            // If the client disconnects, stop FFmpeg.
            ws.on('close', (e) => {
                ffmpeg.kill('SIGINT');
            });
        });
    });
});