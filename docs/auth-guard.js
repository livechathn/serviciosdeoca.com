// SERVICIOS DE OCA — Auth Guard
// Include at the top of any protected page with the correct relative depth path.
// Redirects to login/ if no valid oca_token in sessionStorage.
(function() {
    var TOKEN_KEY = 'oca_token';
    var token = sessionStorage.getItem(TOKEN_KEY);

    // SITE_BASE: works locally (nginx ~/Documents/) and on production
    // Local:  /maniac/websites/serviciosdeoca.com/docs/aria/ → /maniac/.../docs/
    // Prod:   /aria/ → /
    var base = (location.pathname.match(/^(.*\/docs\/)/) || ['', '/'])[1];
    var loginUrl = base + 'login/';

    function redirect() { window.location.replace(loginUrl); }

    if (!token) { redirect(); return; }

    try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp < Date.now() / 1000) {
            sessionStorage.removeItem(TOKEN_KEY);
            redirect();
        }
    } catch(e) {
        sessionStorage.removeItem(TOKEN_KEY);
        redirect();
    }
})();
