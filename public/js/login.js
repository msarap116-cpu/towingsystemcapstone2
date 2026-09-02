// login.js

//event listener for eyecontact
document.addEventListener("DOMContentLoaded", () => {
    const passwordInput = document.getElementById("password");
    const toggleBtn = document.querySelector(".toggle-password");
    const eyeIcon = document.querySelector(".eye-icon");
    const eyeSlashIcon = document.querySelector(".eye-slash-icon");

    if (passwordInput && toggleBtn && eyeIcon && eyeSlashIcon) {
        toggleBtn.addEventListener("click", function () {
            if (passwordInput.type === "password") {
                // Show password → switch to eye-slash icon
                passwordInput.type = "text";
                eyeIcon.style.display = "none";
                eyeSlashIcon.style.display = "block";
            } else {
                // Hide password → switch to eye icon
                passwordInput.type = "password";
                eyeIcon.style.display = "block";
                eyeSlashIcon.style.display = "none";
            }
        });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});
//handle the login
async function handleLogin(e) {
    console.log("starting the handleLogin");

    e.preventDefault();

    console.log(typeof API_BASE_URL);

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const loginBtn = document.getElementById("loginBtn");

    const originalText = loginBtn.innerHTML;

    loginBtn.innerHTML = "Logging in...";
    loginBtn.disabled = true;

    try {

        console.log("sending request to API_BASE_URL", `${API_BASE_URL}/users/login/`);
        const response = await fetch(`${API_BASE_URL}/users/login`, {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })

        });

        const data = await response.json();

        if (response.ok) {

            sessionStorage.setItem("token", data.token);
            sessionStorage.setItem("user", JSON.stringify(data.user));

            showAlert("Login successful!", "success");

            // ---- Determine redirect URL ----
            let redirectUrl = null;
            const params = new URLSearchParams(window.location.search);
            const returnTo = params.get('returnTo');

            if (returnTo) {
                // Decode the URL in case it was encoded
                redirectUrl = decodeURIComponent(returnTo);
            } else {
                // Fallback: role‑based dashboard
                if (data.user.role === "admin") {
                    redirectUrl = "admin-dashboard";
                } else if (data.user.role === "driver") {
                    redirectUrl = "driver-dashboard";
                } else {
                    redirectUrl = "dashboard";
                }
            }

            // Redirect after a short delay (so the alert can be seen)
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);

        } else {

            showAlert(data.error || "Login failed", "danger");

        }

    } catch (error) {

        console.error(error);

        showAlert("Network error", "danger");

    } finally {

        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;

    }
}