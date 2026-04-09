//login.js

document.addEventListener("DOMContentLoaded", () => {
    // --- Password toggle functionality ---
    const passwordInput = document.getElementById("password");
    const toggleBtn = document.querySelector(".toggle-password");

    if (passwordInput && toggleBtn) {
        toggleBtn.addEventListener("click", function() {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleBtn.textContent = "🙈";  // change icon to indicate visible
            } else {
                passwordInput.type = "password";
                toggleBtn.textContent = "👁️";  // change icon back🙈
            }
        });
    }

    // --- Login form handler ---
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});

async function handleLogin(e) {

    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const loginBtn = document.getElementById("loginBtn");

    const originalText = loginBtn.innerHTML;

    loginBtn.innerHTML = "Logging in...";
    loginBtn.disabled = true;

    try {

        const response = await fetch(`${API_BASE_URL}/users/login`, {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })

        });

        const data = await response.json();

        if (response.ok) {

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            showAlert("Login successful!", "success");

            setTimeout(() => {

                if (data.user.role === "admin") {
                    window.location.href = "admin-dashboard";
                }
                else if (data.user.role === "driver") {
                    window.location.href = "driver-dashboard";
                }
                else {
                    window.location.href = "dashboard";
                }

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