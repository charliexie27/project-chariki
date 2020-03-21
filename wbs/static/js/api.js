let api = (function(){
    "use strict";

    let module = {};

    function send(method, url, data, callback){
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    module.getUsername = function(){
        return document.cookie.replace(/(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    };

    module.signup = function(username, password){
        send("POST", "/signup/", {username, password}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(api.getUsername());
        });
    };

    module.signin = function(username, password){
        send("POST", "/signin/", {username, password}, function(err, res){
            if (err) return notifyErrorListeners(err);
            notifyUserListeners(api.getUsername());
        });
    };

    module.updateSettings = function(settings, callback){
        send("POST", "/settings/", settings, callback);
    };

    module.getSettings = function(callback){
        send("GET", "/settings/", null, callback);
    };

    let userListeners = [];
    let errorListeners = [];

    function notifyUserListeners(username){
        userListeners.forEach(function(listener){
            listener(username);
        });
    }

    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    }


    module.onUserUpdate = function(listener){
        userListeners.push(listener);
        listener(api.getUsername());
    };

    module.onError = function(handler){
        errorListeners.push(handler);
    };

    return module;
})();