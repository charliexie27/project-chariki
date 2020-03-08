(function(){
    "use strict";

    window.onload = function(){
        api.onUserUpdate(function(username){
            if (username) window.location.href = '/';
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
    };
}());


