(function () {
    "use strict";

    let displayMediaOptions = {
        video: {
            cursor: "always"
        },
        audio: false
    };

    window.onload = function(){
        const capturedVideoElmt = document.getElementById('captured_video');

        $('#select_app_btn').click(async function() {
            try {
                capturedVideoElmt.srcObject = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                $('#stop_app_btn').prop('disabled', false);
            } catch(err) {
                console.error("Error: " + err);
            }
        });

        $('#stop_app_btn').click(function() {
            let tracks = capturedVideoElmt.srcObject.getTracks();

            tracks.forEach(track => track.stop());
            capturedVideoElmt.srcObject = null;
            $('#stop_app_btn').prop('disabled', true);
        });
    }
}());