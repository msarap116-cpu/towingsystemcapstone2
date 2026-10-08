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

        // Restore any existing lockout state
        if (isLockedOut()) {
            lockLoginForm();
        }
    }
});

// ---- Login attempt limiter config ----
const MAX_ATTEMPTS = 4;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes (optional)

// ---- Attempt tracking helpers ----
function getFailedAttempts() {
    return parseInt(sessionStorage.getItem("failedLoginAttempts") || "0", 10);
}

function setFailedAttempts(count) {
    sessionStorage.setItem("failedLoginAttempts", String(count));
}

function getLockoutUntil() {
    return parseInt(sessionStorage.getItem("loginLockoutUntil") || "0", 10);
}

function setLockoutUntil(timestamp) {
    sessionStorage.setItem("loginLockoutUntil", String(timestamp));
}

function isLockedOut() {
    const lockoutUntil = getLockoutUntil();

    // Permanent lockout (no expiry set)
    if (lockoutUntil === -1) return true;

    // Timed lockout
    if (lockoutUntil > Date.now()) return true;

    // Lockout expired → reset
    if (lockoutUntil > 0 && lockoutUntil <= Date.now()) {
        resetLoginAttempts();
    }
    return false;
}

function resetLoginAttempts() {
    sessionStorage.removeItem("failedLoginAttempts");
    sessionStorage.removeItem("loginLockoutUntil");
}

function lockLoginForm() {
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = "Too many attempts – locked";
    }
    if (loginForm) {
        loginForm.querySelectorAll("input, button").forEach(el => {
            el.disabled = true;
        });
    }

    showAlert(
        `Too many failed login attempts. Please try again later.`,
        "danger"
    );
}

//handle the login
async function handleLogin(e) {
    console.log("starting the handleLogin");

    e.preventDefault();

    // ---- Block if already locked out ----
    if (isLockedOut()) {
        showAlert("Too many failed login attempts. Please try again later.", "danger");
        lockLoginForm();
        return;
    }

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

            // ---- Successful login → reset attempts ----
            resetLoginAttempts();

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

            // ---- Failed login → increment attempt count ----
            const attempts = getFailedAttempts() + 1;
            setFailedAttempts(attempts);

            const remaining = MAX_ATTEMPTS - attempts;

            if (attempts >= MAX_ATTEMPTS) {
                // Lock the account
                setLockoutUntil(-1); // permanent until reset
                // Or for timed lockout, use: setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);

                showAlert(
                    "Too many failed login attempts. Your account has been temporarily locked.",
                    "danger"
                );
                lockLoginForm();
                return;
            }

            showAlert(
                `${data.error || "Login failed"}. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
                "danger"
            );

        }

    } catch (error) {

        console.error(error);

        // Network errors do NOT count toward the attempt limit
        showAlert("Network error", "danger");

    } finally {

        // Don't re-enable the form if locked out
        if (!isLockedOut()) {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }

    }
}