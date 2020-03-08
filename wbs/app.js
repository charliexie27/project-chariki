const express = require('express');
const app = express();
const child_process = require('child_process');
const WebSocketServer = require('ws').Server;

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

const session = require('express-session');
app.use(session({
    secret: 'P3hg4h1qp5',
    resave: false,
    saveUninitialized: true
}));

app.use(function(req, res, next){
    req.user = ('user' in req.session)? req.session.user : null;
    let username = (req.user)? req.user._id : '';
    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
        path : '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    next();
});

app.use(express.static('static'));

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

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
        newUser.save(function(err){
            if (err) return res.status(500).end(err);
            User.findOne({_id: req.body.username}, function(err, user){
                if (err) return res.status(500).end(err);
                // start a session
                req.session.user = user;
                res.setHeader('Set-Cookie', cookie.serialize('username', user._id, {
                    path : '/',
                    maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
                }));
                return res.json("user " + user._id + " signed up");
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
                maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
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
        maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    res.redirect('/');
});

const http = require('http');
const PORT = 3000;

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

    const rtmpUrl = decodeURIComponent(match[1]);
    console.log('Starting stream on RTMP URL:', rtmpUrl);

    const ffmpeg = child_process.spawn('ffmpeg', [
        // FFmpeg will read input video from STDIN
        '-i', '-',

        '-s', '1280x720',

        '-framerate', '30',

        '-b:v', '3000k',

        '-minrate', '3000k',

        '-maxrate', '3000k',

        // or libx264
        '-c:v', 'copy',

        '-preset', 'ultrafast',

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