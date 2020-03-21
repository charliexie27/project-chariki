(function () {
    "use strict";

    window.onload = function(){
        let currentUser = api.getUsername();
        if (currentUser !== null || currentUser !== '' ) {
            $('#username-text').html('<span class="fa fa-user"></span>' + currentUser);
        }

        const capturedVideoElmt = document.getElementById('captured_video');
        let videoStream;

        $('#select_app_btn').click(function() {
            try {
                api.getSettings(async function(err, res){
                    let displayMediaOptions = {
                        video: true,
                        audio: true
                    };

                    if (res.resolution){
                        let widthHeight = res.resolution.split('x');
                        displayMediaOptions.video = {
                            width: parseInt(widthHeight[0]),
                            height: parseInt(widthHeight[1])
                        }
                    }

                    videoStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                    capturedVideoElmt.srcObject = videoStream;
                    $('#stop_app_btn').prop('disabled', false);
                    $('#go_live_btn').prop('disabled', false);
                });
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

            let ws = new WebSocket(
                window.location.protocol.replace('https', 'wss') + '//' + // http: => ws:, https: -> wss:
                window.location.host +
                '/rtmp/' +
                encodeURIComponent("rtmp://live-yto.twitch.tv/app/$STREAM_KEY$")
            );

            // Change button to stop
            $('#go_live_btn').css('display', 'none');
            $('#stop_live_btn').css('display', 'inline-block');
            $('#go_live_btn').prop('disabled', true);
            $('#stop_live_btn').prop('disabled', false);

            // Change overlay text to LIVE
            $('#video-overlay').addClass('live');
            $('#video-overlay').removeClass('offline');
            $('#video-overlay').text('LIVE');

            $('#mic-volume').prop('disabled', true);

            ws.addEventListener('open', (e) => {
                let mediaStream = videoStream.clone();

                if ($('#mic-btn').hasClass('fa-microphone')){
                    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                        .then(function(stream) {
                            if (videoStream.getAudioTracks().length !== 0){
                                let newMediaStream = mergeAudioStreams(videoStream, stream);
                                newMediaStream.addTrack(videoStream.getVideoTracks()[0]);
                                mediaStream = newMediaStream.clone();
                            }
                            else{
                                mediaStream.addTrack(adjustVolume(stream, '#mic-volume').getAudioTracks()[0]);
                            }

                            mediaRecorder = new MediaRecorder(mediaStream, {
                                mimeType: 'video/webm;codecs=h264',
                                videoBitsPerSecond : 3000000,
                                audioBitsPerSecond: 128000
                            });

                            mediaRecorder.addEventListener('dataavailable', (e) => {
                                ws.send(e.data);
                            });

                            mediaRecorder.addEventListener('stop', ws.close.bind(ws));

                            mediaRecorder.start(500);
                        })
                        .catch(function(err){
                            mediaRecorder = new MediaRecorder(mediaStream, {
                                mimeType: 'video/webm;codecs=h264',
                                videoBitsPerSecond : 3000000,
                                audioBitsPerSecond: 128000
                            });

                            mediaRecorder.addEventListener('dataavailable', (e) => {
                                ws.send(e.data);
                            });

                            mediaRecorder.addEventListener('stop', ws.close.bind(ws));

                            mediaRecorder.start(500);
                        });
                    }
                else{
                    mediaRecorder = new MediaRecorder(mediaStream, {
                        mimeType: 'video/webm;codecs=h264',
                        videoBitsPerSecond : 3000000,
                        audioBitsPerSecond: 128000
                    });

                    mediaRecorder.addEventListener('dataavailable', (e) => {
                        ws.send(e.data);
                    });

                    mediaRecorder.addEventListener('stop', ws.close.bind(ws));

                    mediaRecorder.start(500);
                }
            });

            ws.addEventListener('close', (e) => {
                mediaRecorder.stop();
                $('#video-overlay').addClass('offline');
                $('#video-overlay').removeClass('live');
                $('#video-overlay').text('OFFLINE');

                $('#go_live_btn').css('display', '');
                $('#stop_live_btn').css('display', 'none');
                $('#go_live_btn').prop('disabled', false);
                $('#stop_live_btn').prop('disabled', true);

                $('#mic-volume').prop('disabled', false);
            });

            $('#stop_live_btn').unbind('click');
            $('#stop_live_btn').click(function(){
                ws.close();
            });
        });

        $('#settings-btn').click(function() {
            api.getSettings(function(err, res){
                $('#stream-key').val(res.streamKey);
                $('#resolution').val(res.resolution);
                $('#settings-modal').modal('show');
            });
        });

        $('#submit-settings-btn').click(function(){
            api.updateSettings({
                streamKey: $('#stream-key').val(),
                resolution: $('#resolution').val()
            }, function(err, res) {
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

        // Merge audio function adapted from https://paul.kinlan.me/screen-recorderrecording-microphone-and-the-desktop-audio-at-the-same-time/
        const mergeAudioStreams = (desktopStream, voiceStream) => {
            const context = new AudioContext();

            // Create a couple of sources
            const source1 = context.createMediaStreamSource(desktopStream);
            const source2 = context.createMediaStreamSource(voiceStream);
            const destination = context.createMediaStreamDestination();

            const desktopGain = context.createGain();
            const voiceGain = context.createGain();

            desktopGain.gain.value = 0.7;
            voiceGain.gain.value = $('#mic-volume').val();

            source1.connect(desktopGain).connect(destination);
            // Connect source2
            source2.connect(voiceGain).connect(destination);

            return destination.stream;
        };

        let adjustVolume = function(stream, id){
            if (stream.getAudioTracks().length === 0){
                return;
            }

            const context = new AudioContext();

            const source = context.createMediaStreamSource(stream);
            const destination = context.createMediaStreamDestination();

            const gainNode = context.createGain();

            gainNode.gain.value = $(id).val();

            source.connect(gainNode).connect(destination);

            return destination.stream;
        };

        let unmuteMic = function(){
            $('#mic-btn').addClass('fa-microphone');
            $('#mic-btn').removeClass('fa-microphone-slash');
            $('#mic-volume').prop('disabled', false);

            $('#mic-btn.fa-microphone').click(muteMic);
        };

        let muteMic = function(){
            $('#mic-btn').addClass('fa-microphone-slash');
            $('#mic-btn').removeClass('fa-microphone');
            $('#mic-volume').prop('disabled', true);

            $('#mic-btn.fa-microphone-slash').click(unmuteMic);
        };

        $('#mic-btn.fa-microphone-slash').click(unmuteMic);
        $('#mic-btn.fa-microphone').click(muteMic);
    }
}());