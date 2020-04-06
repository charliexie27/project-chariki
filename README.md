# WBS (Web Broadcaster Software)

WBS is an application that allows you to stream a live video feed to a streaming platform from the browser.

## Team Members

- Taiki Takinami
- Ying Feng (Charlie) Xie

## Technology

- [Node.js](https://nodejs.org/en/): Our backend framework.
- [FFmpeg](https://www.ffmpeg.org/): Has an RTMP client that will be used to send video data to Twitch.
- [Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API): To capture a specific application.
- [CanvasCaptureMediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/CanvasCaptureMediaStreamTrack): To create a video stream from a HTML canvas element.
- [MediaDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices): To access media input devices like cameras and microphones.
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API): To enable a persistent connection to stream binary data to Twitch.
- [Bootstrap](https://getbootstrap.com/): Will be used for the UI.
- [jQuery](https://jquery.com/): Will be used to simplify JavaScript code. Also, needed to use certain components offered by Bootstrap.

## Beta Version

- Sign up and sign in to store stream key. It should be private so will need to be stored using salted hash similar to passwords.
- Stream a specific application to Twitch.
- Finish the UI.

## Final Version

- Webcam support and being able to position the webcam feed in the stream.
- Microphone support.
- Change video quality.
- Add and position elements (images, webcam video, text, etc.) in the video stream.

## Technical Challenges

- The screen capture API allows streaming an specific application but does not support adding extra elements to the video. Therefore, allowing users to place elements, such as images and webcam video, on the stream and move the elements around to their liking will be difficult.

- In order to be able to add elements to the stream, we will need to stream from a HTML canvas element. Converting this canvas element to a valid video format that Twitch will accept will be challenging.

- Adding microphone support will also be challenging because we will need to be able to combine audio from screen capture and audio that is captured from the microphone.

- Encoding video can be taxing on both the device and the server and can result in lower FPS so finding the correct bitrate/encoding preset will be a challenge.

- Dealing with the video feeds from these multiple APIs (camera/microphone, images, text on-screen applications, etc.) and mixing them together into a single video feed will be a challenge.

## Installation Instructions

1. Download FFmpeg from <https://www.ffmpeg.org/download.html>. If you're on Windows, extract the zip file, then add the bin folder to your PATH in environment variables. To test that it's installed correctly, just type 'ffmpeg' in the command line and see if the command is recognized. For Mac users, the simplest way is to install it through homebrew with `brew install ffmpeg`.

2. Install MongoDB using the instructions in <https://www.freecodecamp.org/news/learn-mongodb-a4ce205e7739/>. Same as step 1, if you're on Windows, add the bin folder to your PATH in environment variables. For Mac users, the simplest way is (again) to install it through homebrew. First tap the Mongodb homebrew tap with `brew tap mongodb/brew` then install with `brew install mongodb-community@4.2`.

3. Run `npm install` in the wbs folder of this repository.

4. Generate a secret key and a public certificate for HTTPS by running `openssl req -x509 -nodes -newkey rsa:4096 -keyout server.key -out server.crt` in the wbs folder of this repository.

5. Start the local MongoDB server by running `mongod` in the command line. For Mac users who've installed MongoDB with homebrew, start the database server with `mongod --dbpath /usr/local/var/mongodb`. The path of the database must be specified or the default `/data/db` will be used and will cause an error.

6. Using another command line, start the app with `node app.js`. Access it in <https://localhost:3000>.

7. Sign in, then hover over your username in the top right and click Account Settings to save your stream key. If certain features don't work, try using Google Chrome. If it still doesn't work, then it's a bug.

## API Documentation
### Authentication

- description: Sign up
- request: `POST /signup/`
    - content-type: `application/json`
    - body:
      - username: (string) the username for the new account
      - password: (string) the password for the new account
- response: 200
    - body: user 'username' signed up
- response: 400
    - body: username or password is missing
- response: 409
    - body: username 'username' already exists

``` 
$ curl -H "Content-Type: application/json"
        -X POST -d '{"username":"alice","password":"alice"}'
        -c cookie.txt
        https://localhost:3000/signup/
```

- description: Sign in
- request: `POST /signin/`
    - content-type: `application/json`
    - body:
      - username: (string) the username for the new account
      - password: (string) the password for the new account
- response: 200
    - body: user 'username' signed in
- response: 400
    - body: username or password is missing
- response: 401
    - body: Invalid username or password   

``` 
$ curl -H "Content-Type: application/json"
        -X POST -d '{"username":"alice","password":"alice"}'
        -c cookie.txt
        https://localhost:3000/signin/
```

- description: Sign out
- request: `GET /signout/`
- response: 200
    - redirect to / 

``` 
$ curl
    -b cookie.txt
    -c cookie.txt
    https://localhost:3000/signout/
```

### User settings

- description: Update user settings for logged in user.
- request: `POST /settings/`
    - content-type: `application/json`
    - body:
      - streamKey: (string) the stream key for Twitch
      - resolution: (string) the resolution that the user will stream in. Default is 1280x720.
- response: 200
    - body: User settings updated successfully for 'username'.
- response: 401
    - body: access denied
    
``` 
$ curl -X POST 
       -H "Content-Type: application/json" 
       -d '{"streamKey":"19fjthisistotallyarealkeyf","resolution":"1920x1080"}'
       -b cookie.txt
       https://localhost:3000/settings/
```

- description: Retrieve the settings of the authenticated user.
- request: `GET /settings/`
- response: 200
    - content-type: `application/json`
    - body:
      - streamKey: (string) the stream key for Twitch
      - resolution: (string) the resolution that the user will stream in.
- response: 401
    - body: access denied
- response: 404
    - body: User settings not found.
 
``` 
$ curl -b cookie.txt https://localhost:3000/settings/
``` 
