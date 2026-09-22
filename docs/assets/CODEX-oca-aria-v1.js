(function () {
    'use strict';

    var body = document.body;
    var themeToggle = document.querySelector('[data-theme-toggle]');
    var themeLabel = themeToggle && themeToggle.querySelector('.theme-label');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function setTheme(theme) {
        var isDark = theme === 'dark';
        body.classList.toggle('dark', isDark);
        body.classList.toggle('light', !isDark);
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
        themeLabel.textContent = isDark ? 'OSCURO' : 'CLARO';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            setTheme(body.classList.contains('dark') ? 'light' : 'dark');
        });
    }

    function startGlitch() {
        if (reducedMotion.matches) return;

        var element = document.querySelector('.glitch-text');
        if (!element) return;

        var original = element.getAttribute('data-text') || element.textContent;
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        window.setInterval(function () {
            if (document.hidden || Math.random() < 0.9) return;

            var text = original.split('');
            var candidates = [];
            text.forEach(function (character, index) {
                if (character !== ' ') candidates.push(index);
            });
            var index = candidates[Math.floor(Math.random() * candidates.length)];
            text[index] = chars[Math.floor(Math.random() * chars.length)];
            element.textContent = text.join('');

            window.setTimeout(function () {
                element.textContent = original;
            }, 70);
        }, 420);
    }

    var form = document.querySelector('[data-registration-demo]');
    var status = document.querySelector('[data-form-status]');

    if (form && status) {
        form.querySelector('button[type="submit"]').disabled = false;

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var email = form.elements.email;
            var phone = form.elements.phone;
            var emailValid = email.validity.valid;
            var phoneValid = /^[0-9]{8}$/.test(phone.value);

            email.setAttribute('aria-invalid', String(!emailValid));
            phone.setAttribute('aria-invalid', String(!phoneValid));
            status.classList.toggle('is-error', !(emailValid && phoneValid));

            if (!emailValid || !phoneValid) {
                status.textContent = 'Revise el correo y escriba exactamente 8 dígitos después de +504. Nada se envió.';
                (!emailValid ? email : phone).focus();
                return;
            }

            status.textContent = 'El formato parece correcto. Nada se envió ni se guardó; registro, OTP, pago y activación siguen pendientes.';
        });

        form.elements.phone.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 8);
        });
    }

    startGlitch();
}());
