import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhHtBQUGzYS5sOSh4thghEeGimj9JN5cI",
  authDomain: "cosmic-cfc13.firebaseapp.com",
  projectId: "cosmic-cfc13",
  storageBucket: "cosmic-cfc13.firebasestorage.app",
  messagingSenderId: "107175390315",
  appId: "1:107175390315:web:c2b085ffb7904ce6a5552e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const card = document.getElementById("auth-card");
const authForm = document.getElementById("auth-form");
const toggleBtn = document.getElementById("toggle-auth");
const googleBtn = document.getElementById("google-btn");
const errorMsg = document.getElementById("error-message");
const modal = document.getElementById("verify-modal");
const resendBtn = document.getElementById("resend-btn");

let isLoginMode = true;
let resendTimer = 30;

// Animation Toggle
toggleBtn.addEventListener("click", () => {
  card.classList.add("card-flip");

  setTimeout(() => {
    isLoginMode = !isLoginMode;
    document.getElementById("form-title").innerText = isLoginMode
      ? "Login"
      : "Signup";
    document.getElementById("signup-fields").style.display = isLoginMode
      ? "none"
      : "block";
    document.getElementById("confirm-group").style.display = isLoginMode
      ? "none"
      : "block";
    document.getElementById("main-input").placeholder = isLoginMode
      ? "Email or Username"
      : "Email";
    document.getElementById("submit-btn").innerText = isLoginMode
      ? "Login"
      : "Signup";
    document.querySelector(".toggle-text").innerHTML = isLoginMode
      ? 'New User? <span id="toggle-auth">Create Account</span>'
      : 'Already have an account? <span id="toggle-auth">Login</span>';

    // Re-attach listener to new span
    document
      .getElementById("toggle-auth")
      .addEventListener("click", () => toggleBtn.click());

    errorMsg.innerText = "";
    card.classList.remove("card-flip");
  }, 300);
});

async function handleVerificationFlow(user) {
  await user.reload();
  if (auth.currentUser.emailVerified) {
    window.location.href = "authencation.html";
  } else {
    await sendEmailVerification(user);
    document.getElementById("user-email-display").innerText = user.email;
    modal.style.display = "flex";
    startResendTimer();
  }
}

// Validation helper
const checkPass = (p) => /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/.test(p);

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.innerText = "";
  document
    .querySelectorAll("input")
    .forEach((i) => i.classList.remove("invalid"));

  const email = document.getElementById("main-input").value;
  const password = document.getElementById("password").value;

  if (isLoginMode) {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      handleVerificationFlow(res.user);
    } catch (err) {
      errorMsg.innerText = "Invalid credentials.";
      document
        .querySelectorAll("input")
        .forEach((i) => i.classList.add("invalid"));
    }
  } else {
    const confirm = document.getElementById("confirm-password").value;
    const user = document.getElementById("username").value;
    if (!user) {
      errorMsg.innerText = "Username required.";
      return;
    }
    if (!checkPass(password)) {
      errorMsg.innerText =
        "Password must be 8+ chars with Uppercase & Special.";
      return;
    }
    if (password !== confirm) {
      errorMsg.innerText = "Passwords do not match.";
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      handleVerificationFlow(res.user);
    } catch (err) {
      errorMsg.innerText =
        err.code === "auth/email-already-in-use"
          ? "Email already in use!"
          : err.message;
    }
  }
});

googleBtn.addEventListener("click", async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    handleVerificationFlow(res.user);
  } catch (err) {
    errorMsg.innerText = "Google Login failed.";
  }
});

// Resend Timer Logic
function startResendTimer() {
  resendBtn.disabled = true;
  resendTimer = 30;
  const timer = setInterval(() => {
    resendTimer--;
    resendBtn.innerText = `Resend Code (${resendTimer}s)`;
    if (resendTimer <= 0) {
      clearInterval(timer);
      resendBtn.innerText = "Resend Code";
      resendBtn.disabled = false;
    }
  }, 1000);
}

document.getElementById("close-modal").onclick = () =>
  (modal.style.display = "none");

// Auto-check Verification Status
setInterval(async () => {
  if (modal.style.display === "flex" && auth.currentUser) {
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified)
      window.location.href = "authencation.html";
  }
}, 3000);
