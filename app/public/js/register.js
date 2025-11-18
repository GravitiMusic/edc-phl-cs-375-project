let nameInput = document.getElementById("name");
let usernameInput = document.getElementById("username");
let emailInput = document.getElementById("email");
let phoneInput = document.getElementById("phone");
let passwordInput = document.getElementById("password");
let registerButton = document.getElementById("submit");
let messageElement = document.getElementById("message");

registerButton.addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent form from submitting normally
    
    let name = nameInput.value.trim();
    let user = usernameInput.value.trim();
    let email = emailInput.value.trim();
    let phone = phoneInput.value.trim();
    let pass = passwordInput.value;

    // Basic validation
    if (!user || !pass || !email) {
        showMessage("Please enter username, email, and password", true);
        return;
    }

    // Disable button while registering
    registerButton.disabled = true;
    registerButton.textContent = "Registering...";

    try {
        const response = await window.csrfProtection.protectedFetch("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name || null,
                username: user,
                email: email,
                phone: phone || null,
                password: pass
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Registration successful!
            console.log("✅ Registration successful:", data);
            showMessage("Registration successful! Press login to login.", false);
        } else {
            // Login failed
            console.error("❌ Registration failed:", data);
            showMessage(data.error || "Registration failed. Please try again.", true);
            registerButton.disabled = false;
            registerButton.textContent = "Register";
        }
    } catch (error) {
        console.error("❌ Error during registration:", error);
        showMessage("An error occurred. Please try again.", true);
        registerButton.disabled = false;
        registerButton.textContent = "Register";
    }
});

// Helper function to show messages
function showMessage(message, isError) {
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.color = isError ? "#dc3545" : "#28a745";
        messageElement.style.display = "block";
    }
}