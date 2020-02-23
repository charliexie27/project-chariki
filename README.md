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
