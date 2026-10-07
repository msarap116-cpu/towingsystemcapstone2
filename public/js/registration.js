// registration.js


 let isSubmitting = false

document.addEventListener("DOMContentLoaded", () => {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            // Get the TWO icons inside THIS specific button
            const eyeIcon = this.querySelector('.eye-icon');
            const eyeSlashIcon = this.querySelector('.eye-slash-icon');

            if (input && eyeIcon && eyeSlashIcon) {
                if (input.type === 'password') {
                    // Show password → swap to eye-slash icon
                    input.type = 'text';
                    eyeIcon.style.display = 'none';
                    eyeSlashIcon.style.display = 'block';
                    this.setAttribute('aria-label', 'Hide password');
                } else {
                    // Hide password → swap to eye icon
                    input.type = 'password';
                    eyeIcon.style.display = 'block';
                    eyeSlashIcon.style.display = 'none';
                    this.setAttribute('aria-label', 'Show password');
                }
            }
        });
    });

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});
async function handleRegister(e) {
    e.preventDefault();

        if (isSubmitting) return;      // double safety
    isSubmitting = true;

    const submitBtn = document.querySelector('#registrationForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...'; // optional, para malinaw sa user
        console.log('submit button is clicked');
    }

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    // Clear previous password error
    const passwordError = document.getElementById('passwordError');

    if (passwordError) {
        passwordError.style.display = 'none';
        passwordError.textContent = '';
    }

    // Validate email
    const emailValidation = validateEmail(email);

    if (!emailValidation.isValid) {
        showAlert(emailValidation.message, 'danger');
        return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);

    if (!passwordValidation.isValid) {
        if (passwordError) {
            passwordError.textContent = passwordValidation.message;
            passwordError.style.display = 'block';
        }

        document.getElementById('password').focus();
        return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
        showAlert('Passwords do not match!', 'danger');
        return;
    }

    // Validate phone
    const phoneValidation = validatePhoneNumber(phone);

    if (!phoneValidation.isValid) {
        showAlert(phoneValidation.message, 'danger');
        return;
    }

    const payload = {
        name,
        email: emailValidation.correctedEmail || email,
        phone,
        password,
        role: 'Customer'
    };

    console.log('📤 Sending registration:', payload);


try {
    const data = await apiFetch('/users/register', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    console.log('Registration successful:', data);

    // Make sure no registration token is kept
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    // Show success notification
    showAlert(
        'Registration successful! Redirecting to login...',
        'success'
    );

    // Redirect to login after notification
    setTimeout(() => {
        window.location.replace('/login');
    }, 8000);

} catch (error) {
    console.error('❌ Registration error:', error);

    showAlert(
        error.message || 'Registration failed. Please try again.',
        'danger'
    );

} finally {
    isSubmitting = false;
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
}
}

// Helper function for showing alerts
function showAlert(message, type = 'danger') {
    // Remove any existing alert
    const existingAlert = document.querySelector('.alert-message');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-message alert alert-${type}`;
    alertDiv.style.cssText = `
        padding: 12px 20px;
        margin: 15px 0;
        border-radius: 8px;
        font-weight: 500;
        ${type === 'danger' ? 'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
        ${type === 'success' ? 'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
        ${type === 'warning' ? 'background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba;' : ''}
    `;
    alertDiv.textContent = message;

    const formContainer = document.querySelector('.form-container');
    formContainer.insertBefore(alertDiv, formContainer.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Validate Email Function
function validateEmail(email) {
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }

    // Split email into local part and domain
    const [localPart, domain] = email.split('@');

    // Common domain typos mapping - only for full domain corrections
    const domainCorrections = {
        'gmail.con': 'gmail.com',
        'gmail.cm': 'gmail.com',
        'gmail.co': 'gmail.com',
        'gmail.c': 'gmail.com',
        'yahoo.con': 'yahoo.com',
        'yahoo.cm': 'yahoo.com',
        'yahoo.co': 'yahoo.com',
        'hotmail.con': 'hotmail.com',
        'hotmail.cm': 'hotmail.com',
        'hotmail.co': 'hotmail.com',
        'outlook.con': 'outlook.com',
        'outlook.cm': 'outlook.com',
        'outlook.co': 'outlook.com',
    };

    // Common TLD typos - only for the last part of the domain
    const tldCorrections = {
        '.con': '.com',
        '.can': '.com',
        '.cmo': '.com',
        '.comm': '.com',
        '.comn': '.com',
        '.coom': '.com',
        '.cpm': '.com',
        '.xom': '.com',
        '.vom': '.com'
    };

    let correctedDomain = domain.toLowerCase();
    let hasCorrection = false;

    // First check full domain typos (e.g., gmail.con -> gmail.com)
    for (const [wrong, correct] of Object.entries(domainCorrections)) {
        if (correctedDomain === wrong) {
            correctedDomain = correct;
            hasCorrection = true;
            break;
        }
    }

    // If no full domain correction found, check TLD typos
    if (!hasCorrection) {
        for (const [wrong, correct] of Object.entries(tldCorrections)) {
            if (correctedDomain.endsWith(wrong)) {
                // Only replace at the end of the domain
                const domainWithoutTld = correctedDomain.slice(0, -wrong.length);
                correctedDomain = domainWithoutTld + correct;
                hasCorrection = true;
                break;
            }
        }
    }

    // Construct corrected email
    const correctedEmail = `${localPart}@${correctedDomain}`;

    // If a correction was made and the email is different
    if (hasCorrection && correctedEmail !== email) {
        return {
            isValid: true,
            correctedEmail: correctedEmail,
            message: `Did you mean ${correctedEmail}?`
        };
    }

    // Check for missing dots in common domains
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domainWithoutDot = correctedDomain.replace(/\./g, '');

    for (const commonDomain of commonDomains) {
        const commonDomainWithoutDot = commonDomain.replace(/\./g, '');
        if (domainWithoutDot === commonDomainWithoutDot && correctedDomain !== commonDomain) {
            return {
                isValid: true,
                correctedEmail: `${localPart}@${commonDomain}`,
                message: `Did you mean ${localPart}@${commonDomain}?`
            };
        }
    }

    return { isValid: true, correctedEmail: null };
}

// ===== PASSWORD VALIDATION FUNCTION =====
function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/;
    if (!passwordRegex.test(password)) {
        return {
            isValid: false,
            message: '😤😒😒😒'
        };
    }
    return { isValid: true };
}

// ===== PHILIPPINE PHONE VALIDATION FUNCTION =====
function validatePhoneNumber(phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phPhoneRegex = /^(09\d{9}|\+639\d{9})$/;
    if (!phPhoneRegex.test(cleanPhone)) {
        return {
            isValid: false,
            message: 'Enter a valid PH number: start with 09XXXXXXXXX or +639XXXXXXXXX'
        };
    }
    return { isValid: true };
}

// ===== DOM CONTENT LOADED - SECOND EVENT LISTENER =====
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm_password');
    const phoneInput = document.getElementById('phone');
    const passwordError = document.getElementById('passwordError');
    const helperText = document.querySelector('.text-muted');
    let phoneStatus = null;

    // ===== PASSWORD INPUT: ONLY GREEN ON SUCCESS =====
    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            const password = this.value;
            this.classList.remove('error');
            if (passwordError) passwordError.style.display = 'none';
            if (helperText) helperText.style.color = '';

            if (password.length >= 8) {
                const validation = validatePassword(password);
                if (validation.isValid) {
                    this.classList.add('success');
                    if (passwordError) {
                        passwordError.textContent = '✓ Password is strong';
                        passwordError.style.display = 'block';
                        passwordError.style.color = '#28a745';
                    }
                    if (helperText) helperText.style.color = '#28a745';
                } else {
                    this.classList.remove('success');
                }
            } else {
                this.classList.remove('success');
            }
        });
    }

    // ===== PHONE INPUT: ONLY GREEN ON SUCCESS =====
    if (phoneInput) {
        phoneInput.addEventListener('input', function () {
            const phone = this.value.trim();
            this.classList.remove('error');
            if (phoneStatus) phoneStatus.style.display = 'none';

            const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (cleanPhone.length >= 11) {
                const validation = validatePhoneNumber(phone);
                if (validation.isValid) {
                    this.classList.add('success');
                    if (!phoneStatus) {
                        phoneStatus = document.createElement('div');
                        phoneStatus.id = 'phoneStatus';
                        phoneStatus.style.marginTop = '5px';
                        phoneStatus.style.fontSize = '14px';
                        this.parentNode.appendChild(phoneStatus);
                    }
                    phoneStatus.textContent = '✓ Valid Philippine number';
                    phoneStatus.style.display = 'block';
                    phoneStatus.style.color = '#28a745';
                } else {
                    this.classList.remove('success');
                }
            } else {
                this.classList.remove('success');
            }
        });
    }

    // ===== CONFIRM PASSWORD INPUT: ONLY GREEN ON MATCH =====
    if (confirmInput) {
        confirmInput.addEventListener('input', function () {
            const pass = passwordInput ? passwordInput.value : '';
            const confirm = this.value;
            this.classList.remove('error');
            if (passwordError) passwordError.style.display = 'none';

            if (confirm.length > 0 && pass === confirm) {
                this.classList.add('success');
                if (passwordError) {
                    passwordError.textContent = '✓ Passwords match';
                    passwordError.style.display = 'block';
                    passwordError.style.color = '#28a745';
                }
            } else {
                this.classList.remove('success');
            }
        });
    }

    // ===== SUBMIT: SHOW RED ERRORS ONLY NOW =====

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();


            if(isSubmitting) return;

             let isFormValid = true;

            // ---- Password ----
            if (passwordInput) {
                const validation = validatePassword(passwordInput.value);
                if (!validation.isValid) {
                    isFormValid = false;
                    passwordInput.classList.add('error');
                    passwordInput.classList.remove('success');
                    if (passwordError) {
                        passwordError.textContent = validation.message;
                        passwordError.style.display = 'block';
                        passwordError.style.color = '#dc3545';
                    }
                    if (helperText) helperText.style.color = '#dc3545';
                }
            }

            // ---- Confirm Password ----
            if (confirmInput && passwordInput) {
                const pass = passwordInput.value;
                const confirm = confirmInput.value;
                if (!confirm || confirm !== pass) {
                    isFormValid = false;
                    confirmInput.classList.add('error');
                    confirmInput.classList.remove('success');
                    if (passwordError) {
                        if (confirm && confirm !== pass) {
                            passwordError.textContent = '✗ Passwords do not match';
                        }
                        passwordError.style.display = 'block';
                        passwordError.style.color = '#dc3545';
                    }
                }
            }

            // ---- Phone ----
            if (phoneInput) {
                const validation = validatePhoneNumber(phoneInput.value);
                if (!validation.isValid) {
                    isFormValid = false;
                    phoneInput.classList.add('error');
                    phoneInput.classList.remove('success');
                    if (!phoneStatus) {
                        phoneStatus = document.createElement('div');
                        phoneStatus.id = 'phoneStatus';
                        phoneStatus.style.marginTop = '5px';
                        phoneStatus.style.fontSize = '14px';
                        phoneInput.parentNode.appendChild(phoneStatus);
                    }
                    phoneStatus.textContent = validation.message;
                    phoneStatus.style.display = 'block';
                    phoneStatus.style.color = '#dc3545';
                }
            }

            // If form is valid, call handleRegister
            if (isFormValid) {
                handleRegister(e);
            }
        });
    }
});

// ===== EMAIL AVAILABILITY CHECK =====
let emailCheckTimeout;

// Check email availability function
async function checkEmailAvailability(email) {
    try {
        const response = await fetch('/api/users/check-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        // Check if response is OK
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Email check error:', errorData);
            return true; // Assume available if check fails
        }

        const data = await response.json();
        console.log('📧 Email availability response:', data);

        // If there's a correction suggestion, show it
        if (data.correctedEmail && data.correctedEmail !== email) {
            const suggestionDiv = document.getElementById('emailSuggestion');
            if (suggestionDiv) {
                suggestionDiv.textContent = `Did you mean: ${data.correctedEmail}? Click to apply.`;
                suggestionDiv.style.display = 'block';
                suggestionDiv.style.cursor = 'pointer';
                suggestionDiv.onclick = function () {
                    const emailInput = document.getElementById('email');
                    if (emailInput) {
                        emailInput.value = data.correctedEmail;
                        suggestionDiv.style.display = 'none';
                        // Re-trigger the check
                        emailInput.dispatchEvent(new Event('blur'));
                    }
                };
            }
        }

        return data.available;

    } catch (error) {
        console.error('❌ Email check error:', error);
        return true; // Assume available if check fails
    }
}

// ===== EMAIL INPUT BLUR EVENT =====
const emailInput = document.getElementById('email');
if (emailInput) {
    emailInput.addEventListener('blur', async function () {
        const emailValidation = validateEmail(this.value);
        const suggestionDiv = document.getElementById('emailSuggestion');
        const emailStatus = document.getElementById('emailStatus');

        if (!emailValidation.isValid) {
            if (emailStatus) {
                emailStatus.textContent = 'Please enter a valid email address';
                emailStatus.style.color = 'red';
                emailStatus.style.display = 'block';
            }
            suggestionDiv.style.display = 'none';
            return;
        }

        if (emailValidation.correctedEmail && emailValidation.correctedEmail !== this.value) {
            suggestionDiv.textContent = `Did you mean: ${emailValidation.correctedEmail}?`;
            suggestionDiv.style.display = 'block';
            suggestionDiv.style.cursor = 'pointer';

            suggestionDiv.onclick = function () {
                emailInput.value = emailValidation.correctedEmail;
                suggestionDiv.style.display = 'none';
                // Trigger another check after correction
                emailInput.dispatchEvent(new Event('blur'));
            };
        } else {
            suggestionDiv.style.display = 'none';
        }

        // Check email availability if valid
        if (emailValidation.isValid) {
            const emailToCheck = emailValidation.correctedEmail || this.value;

            // Debounce the check
            clearTimeout(emailCheckTimeout);
            emailCheckTimeout = setTimeout(async () => {
                const isAvailable = await checkEmailAvailability(emailToCheck);
                if (emailStatus) {
                    if (!isAvailable) {
                        emailStatus.textContent = 'Email already registered';
                        emailStatus.style.color = 'red';
                        emailStatus.style.display = 'block';
                    } else {
                        emailStatus.textContent = 'available, ensure that it is active';
                        emailStatus.style.color = 'green';
                        emailStatus.style.display = 'block';
                    }
                }
            }, 500);
        }
    });
}