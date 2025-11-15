// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // Get all three form elements
    const emailForm = document.getElementById('form-send-email');
    const otpForm = document.getElementById('form-enter-otp');
    const resetForm = document.getElementById('form-reset-password');

    // Make sure we are on the right page
    if (emailForm && otpForm && resetForm) {

        // --- Step 1: Handle Send Email ---
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // In a real app, you'd call your backend to send the email here
            console.log("Sending OTP to email:", document.getElementById('reset-email').value);
            
            // Show the next step
            emailForm.style.display = 'none';
            otpForm.style.display = 'block';
        });

        // --- Step 2: Handle Verify OTP ---
        otpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // In a real app, you'd verify the OTP with your backend
            console.log("Verifying OTP:", document.getElementById('otp-code').value);

            // For now, we'll assume it's correct and show the next step
            otpForm.style.display = 'none';
            resetForm.style.display = 'block';
        });

        // --- Step 3: Handle Reset Password ---
        resetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            // In a real app, you'd send the new password to your backend
            console.log("Resetting password...");

            // For now, just show a success message and redirect to login
            alert("Password has been reset successfully! Please sign in.");
            window.location.href = 'login.html';
        });
    }
    
    // Run Feather icons (if they exist on the page)
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});