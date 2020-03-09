(function () {
    "use strict";

    let displayMediaOptions = {
        video: {
            cursor: "always"
        },
        audio: false
    };

    window.onload = function(){
        let currentUser = api.getUsername();
        if (currentUser !== null || currentUser !== '' ) {
            $('#username-text').html(currentUser);
        }

        const capturedVideoElmt = document.getElementById('captured_video');

        $('#select_app_btn').click(async function() {
            try {
                capturedVideoElmt.srcObject = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                $('#stop_app_btn').prop('disabled', false);
                $('#go_live_btn').prop('disabled', false);
            } catch(err) {
                console.error("Error: " + err);
            }
        });

        $('#stop_app_btn').click(function() {
            let tracks = capturedVideoElmt.srcObject.getTracks();

            tracks.forEach(track => track.stop());
            capturedVideoElmt.srcObject = null;
            $('#stop_app_btn').prop('disabled', true);
            $('#go_live_btn').prop('disabled', true);
        });

        /*
            Code adapted from https://github.com/fbsamples/Canvas-Streaming-Example
         */
        $('#go_live_btn').click(function() {
            let mediaRecorder;
            let mediaStream;

            const ws = new WebSocket(
                window.location.protocol.replace('http', 'ws') + '//' + // http: => ws:, https: -> wss:
                window.location.host +
                '/rtmp/' +
                encodeURIComponent("rtmp://live-yto.twitch.tv/app/YOUR_STREAM_KEY_HERE")
            );

            ws.addEventListener('open', (e) => {
                mediaStream = capturedVideoElmt.captureStream();
                mediaRecorder = new MediaRecorder(mediaStream, {
                    mimeType: 'video/webm;codecs=h264',
                    videoBitsPerSecond : 3000000
                });

                mediaRecorder.addEventListener('dataavailable', (e) => {
                    ws.send(e.data);
                });

                mediaRecorder.addEventListener('stop', ws.close.bind(ws));

                mediaRecorder.start(1000);
            });

            ws.addEventListener('close', (e) => {
                mediaRecorder.stop();
            });
        });
    }
}());