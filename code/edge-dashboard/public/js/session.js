(function () {
    const startSessionButton = document.getElementById('start-session-btn');

    async function isSessionValid(sessionId) {
        try {
            const response = await fetch('/api/session/' + encodeURIComponent(sessionId));
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    (async () => {
        const existingSessionId = localStorage.getItem('sessionId');
        if (existingSessionId) {
            const isValid = await isSessionValid(existingSessionId);
            if (isValid) {
                window.location.replace('/dashboard?sessionId=' + encodeURIComponent(existingSessionId));
                return;
            } else {
                localStorage.removeItem('sessionId');
            }
        }
    })();

    startSessionButton?.addEventListener('click', async () => {
        if (startSessionButton.disabled) return;
        startSessionButton.disabled = true;

        try {
            const response = await fetch('/api/session/', { method: 'POST' });
            if (response.status !== 201) {
                throw new Error('Session creation failed');
            }
            const sessionData = await response.json();
            localStorage.setItem('sessionId', sessionData.id);
            let redirectUrl = '/dashboard?sessionId=' + encodeURIComponent(sessionData.id);
            if (sessionData.offline) {
                redirectUrl += '&offline=true';
            }
            window.location.replace(redirectUrl);
        } catch (error) {
            window.IoTToasts?.show(error.message, { variant: 'danger', delay: 5000 });
        } finally {
            startSessionButton.disabled = false;
        }
    });
})();