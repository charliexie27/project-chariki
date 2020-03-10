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
            $('#username-text').html('<span class="fa fa-user"></span>' + currentUser);
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
                window.location.protocol.replace('https', 'wss') + '//' + // http: => ws:, https: -> wss:
                window.location.host +
                '/rtmp/' +
                encodeURIComponent("rtmp://live-yto.twitch.tv/app/$STREAM_KEY$")
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

        $('#settings-btn').click(function() {
            api.getSettings(function(err, res){
                $('#stream-key').val(res.streamKey);
                $('#settings-modal').modal('show');
            });
        });

        $('#submit-settings-btn').click(function(){
            api.updateSettings({streamKey: $('#stream-key').val()}, function(err, res) {
            });
        });

        $('#view-stream-key').click(function(){
            let streamKeyElmt = $('#stream-key');
            let eyeElmt = $('#view-stream-key');
            if (streamKeyElmt.attr('type') === 'text'){
                streamKeyElmt.attr('type', 'password');
                eyeElmt.removeClass('fa-eye-slash');
                eyeElmt.addClass('fa-eye');
            }
            else if (streamKeyElmt.attr('type') === 'password'){
                streamKeyElmt.attr('type', 'text');
                eyeElmt.removeClass('fa-eye');
                eyeElmt.addClass('fa-eye-slash');
            }
        });
    }
}());