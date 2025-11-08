let usernameInput = document.getElementById("username");
let passwordInput = document.getElementById("password");
let loginButton = document.getElementById("submit");
let messageElement = document.getElementById("message");

loginButton.addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent form from submitting normally
    
    let user = usernameInput.value;
    let pass = passwordInput.value;

    // Basic validation
    if (!user || !pass) {
        showMessage("Please enter username and password", true);
        return;
    }

    // Disable button while logging in
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        const response = await fetch("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: user,
                password: pass
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Login successful!
            console.log("✅ Login successful:", data);
            showMessage("Login successful! Redirecting...", false);
            
            // Redirect to home page after 1 second
            setTimeout(() => {
                window.location.href = "/pages/home.html";
            }, 1000);
        } else {
            // Login failed
            console.error("❌ Login failed:", data);
            showMessage(data.error || "Login failed. Please try again.", true);
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    } catch (error) {
        console.error("❌ Error during login:", error);
        showMessage("An error occurred. Please try again.", true);
        loginButton.disabled = false;
        loginButton.textContent = "Login";
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