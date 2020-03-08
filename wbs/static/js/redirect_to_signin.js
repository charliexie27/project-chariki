(function () {
    let currentUser = api.getUsername();
    if (currentUser === null || currentUser === '' ) {
        window.location.href = "/signin.html";
    }
}());