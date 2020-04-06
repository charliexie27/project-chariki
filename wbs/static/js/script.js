(function () {
    "use strict";

    window.onload = function(){
        let currentUser = api.getUsername();
        if (currentUser !== null || currentUser !== '' ) {
            $('#username-text').html('<span class="fa fa-user"></span>' + currentUser);
        }

        const capturedVideoElmt = document.getElementById('captured_video');
        let videoStream;
        let camStream;
        let combinedStream;

        let parseResolution = function(resolutionString) {
            let widthHeight = resolutionString.split('x');
            return {width: parseInt(widthHeight[0]), height: parseInt(widthHeight[1])};
        };

        $('#select_app_btn').click(function() {
            try {
                api.getSettings(async function(err, res){
                    let displayMediaOptions = {
                        video: true,
                        audio: true
                    };

                    let widthHeight = parseResolution(res.resolution);
                    displayMediaOptions.video = {
                        width: widthHeight.width,
                        height: widthHeight.height
                    };

                    videoStream = changeResolution(await navigator.mediaDevices.getDisplayMedia(displayMediaOptions), widthHeight.width, widthHeight.height);
                    if (camStream){
                        combinedStream = mergeVideoAndCam(camStream, widthHeight.width, widthHeight.height);
                        capturedVideoElmt.srcObject = combinedStream;
                    }
                    else{
                        capturedVideoElmt.srcObject = videoStream;
                    }
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

            // Hide capture application and webcam buttons
            $('#select_app_btn').hide();
            $('#select_app_btn').prop('disabled', true);

            $('#cam-btn').hide();
            $('#cam-stop-btn').hide();
            $('#cam-btn').prop('disabled', true);
            $('#cam-stop-btn').prop('disabled', true);

            // Disable mic button and volume
            $('#mic-btn.fa-microphone-slash').unbind('click');
            $('#mic-btn.fa-microphone').unbind('click');
            $('#mic-volume').prop('disabled', true);

            ws.addEventListener('open', (e) => {
                let mediaStream;

                if (combinedStream) {
                    mediaStream = combinedStream.clone();
                }
                else if (videoStream) {
                    mediaStream = videoStream.clone();
                }
                else if (camStream) {
                    mediaStream = camStream.clone();
                }

                if ($('#mic-btn').hasClass('fa-microphone')){
                    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                        .then(function(stream) {
                            if (mediaStream.getAudioTracks().length !== 0){
                                let newMediaStream = mergeAudioStreams(mediaStream, stream);
                                newMediaStream.addTrack(mediaStream.getVideoTracks()[0]);
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
                                if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                                    ws.send(e.data);
                                }
                            });

                            mediaRecorder.addEventListener('stop', ws.close.bind(ws, 1000));

                            mediaRecorder.start(500);
                        })
                        .catch(function(err){
                            mediaRecorder = new MediaRecorder(mediaStream, {
                                mimeType: 'video/webm;codecs=h264',
                                videoBitsPerSecond : 3000000,
                                audioBitsPerSecond: 128000
                            });

                            mediaRecorder.addEventListener('dataavailable', (e) => {
                                if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                                    ws.send(e.data);
                                }
                            });

                            mediaRecorder.addEventListener('stop', ws.close.bind(ws, 1000));

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
                        if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                            ws.send(e.data);
                        }
                    });

                    mediaRecorder.addEventListener('stop', ws.close.bind(ws, 1000));

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

                $('#select_app_btn').show();
                $('#select_app_btn').prop('disabled', false);

                if (camStream){
                    $('#cam-stop-btn').show();
                    $('#cam-stop-btn').prop('disabled', false);
                }
                else{
                    $('#cam-btn').show();
                    $('#cam-btn').prop('disabled', false);
                }

                $('#mic-btn.fa-microphone-slash').click(unmuteMic);
                $('#mic-btn.fa-microphone').click(muteMic);
                $('#mic-volume').prop('disabled', false);
            });

            $('#stop_live_btn').unbind('click');
            $('#stop_live_btn').click(function(){
                ws.close(1000);
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

        let mergeVideoAndCam = function(camStream, width, height) {
            let merger = new VideoStreamMerger({
                width: width,
                height: height,
            });
            merger.addStream(videoStream, {
                x: 0,
                y: 0,
                width: merger.width,
                height: merger.height,
                mute: videoStream.getAudioTracks().length === 0
            });

            merger.addStream(camStream, {
                x: merger.width - (merger.width * 0.3),
                y: merger.height - (merger.height * 0.3),
                width: merger.width * 0.3,
                height: merger.height * 0.3,
                mute: true
            });

            merger.start();

            return merger.result;
        };

        let changeResolution = function(stream, width, height) {
            let merger = new VideoStreamMerger({
                width: width,
                height: height,
            });
            merger.addStream(stream, {
                x: 0,
                y: 0,
                width: merger.width,
                height: merger.height,
                mute: stream.getAudioTracks().length === 0
            });

            merger.start();

            return merger.result;
        };

        $('#cam-btn').click(function() {
           navigator.mediaDevices.getUserMedia({ video: true, audio: false })
               .then(function(stream) {
                   camStream = stream;
                   if (!videoStream){
                       capturedVideoElmt.srcObject = camStream;
                   }
                   else{
                       api.getSettings(function(err, res) {
                           let widthHeight = parseResolution(res.resolution);
                           combinedStream = mergeVideoAndCam(stream, widthHeight.width, widthHeight.height);
                           capturedVideoElmt.srcObject = combinedStream;
                       });
                   }

                   $('#cam-btn').prop('disabled', true);
                   $('#cam-stop-btn').prop('disabled', false);
                   $('#cam-btn').hide();
                   $('#cam-stop-btn').show();

                   $('#stop_app_btn').prop('disabled', false);
                   $('#go_live_btn').prop('disabled', false);
               });
        });

        $('#cam-stop-btn').click(function() {
           camStream = null;
           combinedStream = null;
           if (videoStream){
               capturedVideoElmt.srcObject = videoStream;
           }
           else{
               capturedVideoElmt.srcObject = null;
           }

            $('#cam-btn').prop('disabled', false);
            $('#cam-stop-btn').prop('disabled', true);
            $('#cam-btn').show();
            $('#cam-stop-btn').hide();
        });
    };
}());