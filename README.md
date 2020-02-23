# Cool New OBS Thingy
Description of the cool new OBS thingy here

## Team Members
- Taiki Takinami
- Ying Feng (Charlie) Xie

## Technology
- Node.js
- [FFmpeg](https://www.ffmpeg.org/): Has an RTMP client to send video data to Twitch. May use https://github.com/Kagami/ffmpeg.js/ or we can just call a command line argument from javascript
- [Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Using_Screen_Capture): To capture an application
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API): To enable a persistent connection to stream binary data to Twitch
- Bootstrap?
- jQuery?

## Beta Version
- UI
- Stream an application to Twitch
- Signin, Signup to store stream key

## Final Version
- Add images, move elements around the stream
- Video quality?
- Webcam support

## Technical Challenges
- The screen capture API allows streaming an specific application but does not support adding extra elements to it. Therefore, allowing users to place elements, such as images and webcam video, on the video and move the elements around to their liking will be a challenge.