(function(){
    "use strict";

    window.onload = function(){
        api.onUserUpdate(function(username){
            if (username) window.location.href = '/';
        });

        api.onError(function(err){
            console.error("[error]", err);
        });

        api.onError(function(err){
            let statusCode = err.match(/\[(.*?)\]/)[1];

            switch(statusCode){
                case "400":
                    $('.signin-error-text').text('Username or password is missing.');
                    break;
                case "401":
                    $('.signin-error-text').text('Invalid username or password.');
                    break;
                case "409":
                    $('.signin-error-text').text('The username already exists.');
                    break;
                default:
                    $('.signin-error-text').text('An unknown error has occurred.');
                    break;
            }

            $('#incorrect-signin-error').show();
        });

        function submit(action){
            if (document.querySelector("form").checkValidity()){
                let username = document.querySelector("form [name=username]").value;
                let password =document.querySelector("form [name=password]").value;
                api[action](username, password);
            }
        }

        $('#signin_submit_btn').click(function(){
            submit('signin');
        });

        $('#signup_submit_btn').click(function(){
            submit('signup');
        });

        document.querySelector('form').addEventListener('submit', function(e){
            e.preventDefault();
        });

        $('#signin-close-error').click(function(){
            $('#incorrect-signin-error').hide();
        });
    };
}());


