import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { loginCustomer, signupCustomer } from "../api/customerApi";
import { getOptimizedAssetPath } from "../utils/storefront";

export default function AccountPage({ context }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loginIdentity, setLoginIdentity] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signup, setSignup] = useState({ fullName: "", email: "", mobile: "", password: "", confirmPassword: "" });
  const [forgotIdentity, setForgotIdentity] = useState("");
  const [signupConsent, setSignupConsent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.add("account-page");
    return () => document.body.classList.remove("account-page");
  }, []);

  if (context.authUser) return <Navigate to="/profile" replace />;

  function applyCustomerSession(customer) {
    context.setAuthUser({ id: customer.id, fullName: customer.fullName, email: customer.email, mobile: customer.mobile });
    context.setCustomerProfile({
      firstName: customer.firstName || String(customer.fullName || "").split(" ")[0] || "",
      lastName: customer.lastName || String(customer.fullName || "").split(" ").slice(1).join(" "),
      contact: customer.email,
      phone: customer.mobile
    });
  }

  const submitLogin = async (event) => {
    event.preventDefault();
    const identity = loginIdentity.trim().toLowerCase();
    try {
      const response = await loginCustomer({ identity, password: loginPassword });
      const customer = response.data?.customer;
      if (!customer) throw new Error("We could not match those account details.");
      applyCustomerSession(customer);
      context.notify("Login successful");
      navigate("/profile");
    } catch (error) {
      setError(error.message || "We could not match those account details.");
    }
  };

  const submitSignup = async (event) => {
    event.preventDefault();
    if (!signup.fullName || !signup.email || !signup.mobile || !signup.password || !signup.confirmPassword) {
      setError("Please complete all account details.");
      return;
    }
    if (signup.password !== signup.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!signupConsent) {
      setError("Please agree to the terms before creating an account.");
      return;
    }

    try {
      const response = await signupCustomer({
        fullName: signup.fullName.trim(),
        email: signup.email.trim(),
        mobile: signup.mobile.trim(),
        password: signup.password
      });
      const customer = response.data?.customer;
      if (!customer) throw new Error("Account could not be created.");
      applyCustomerSession(customer);
      context.notify("Account created");
      navigate("/profile");
    } catch (error) {
      setError(error.message || "Account could not be created.");
    }
  };

  const submitForgot = (event) => {
    event.preventDefault();
    if (!forgotIdentity.trim()) {
      setError("Please enter your email address or mobile number.");
      return;
    }
    context.notify("Reset link sent");
    setForgotIdentity("");
    setForgotOpen(false);
    setError("");
  };

  const signInGoogle = async () => {
    const demoUser = { fullName: "Google Customer", email: "google.customer@avyona.example", mobile: "9999999999", password: "google-auth" };
    try {
      let response;
      try {
        response = await signupCustomer(demoUser);
      } catch {
        response = await loginCustomer({ identity: demoUser.email, password: demoUser.password });
      }
      const customer = response.data?.customer;
      if (!customer) throw new Error("Google sign in failed.");
      applyCustomerSession(customer);
      context.notify("Signed in with Google");
      navigate("/profile");
    } catch (error) {
      setError(error.message || "Google sign in failed.");
    }
  };

  return (
    <main className="container account-main">
      <section className="account-shell">
        <div className="account-brand-panel">
          <div className="account-brand-top">
            <img className="account-brand-logo" src={getOptimizedAssetPath("/images/avyona logo.png")} alt="Avyona logo" />
            <p className="account-brand-caption">Avyona Account</p>
          </div>
          <div className="account-brand-copy"><p className="eyebrow">Welcome</p><h1>Welcome to Avyona</h1><p>Create your Avyona account to enjoy a smooth shopping experience.</p></div>
        </div>
        <div className="account-form-panel">
          <div className="account-form-header"><img className="account-form-logo" src={getOptimizedAssetPath("/images/avyona logo.png")} alt="Avyona logo" /><p className="account-trust-line">Your information is secure with Avyona.</p></div>
          <div className="account-heading-block"><p className="eyebrow">Avyona Account</p><h2>{mode === "login" ? "Welcome Back" : "Create Your Account"}</h2><p>{mode === "login" ? "Login to access your orders, saved details, and wishlist." : "Register your Avyona profile and start shopping with ease."}</p></div>
          <div className="account-tab-switcher" role="tablist">
            <button className={`account-tab ${mode === "login" ? "active" : ""}`} type="button" onClick={() => { setMode("login"); setError(""); }}>Login</button>
            <button className={`account-tab ${mode === "signup" ? "active" : ""}`} type="button" onClick={() => { setMode("signup"); setError(""); }}>Create Account</button>
          </div>
          {mode === "login" ? (
            <div className="account-panel active">
              {!forgotOpen ? (
                <form id="account-login-form" name="accountLoginForm" className="account-form" onSubmit={submitLogin}>
                  <label className="account-field" htmlFor="account-login-identity"><span>Email Address or Mobile Number</span><input id="account-login-identity" name="loginIdentity" autoComplete="username" value={loginIdentity} onChange={(event) => setLoginIdentity(event.target.value)} required /></label>
                  <label className="account-field" htmlFor="account-login-password"><span>Password</span><input id="account-login-password" name="loginPassword" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></label>
                  <div className="account-form-meta"><button className="account-text-link" type="button" onClick={() => { setForgotOpen(true); setError(""); }}>Forgot Password?</button></div>
                  <button className="primary-button account-submit" type="submit">Login</button>
                  <div className="account-social-block"><div className="account-divider"><span>or</span></div><button className="account-google-button" type="button" onClick={signInGoogle}><span className="account-google-icon">G</span><span>Sign in with Google</span></button></div>
                  <p className="account-switch-copy">Don't have an account? <button className="account-inline-switch" type="button" onClick={() => { setMode("signup"); setError(""); }}>Create Account</button></p>
                  {error ? <p className="account-form-error">{error}</p> : null}
                </form>
              ) : (
                <form id="account-forgot-password-form" name="accountForgotPasswordForm" className="account-form" onSubmit={submitForgot}>
                  <label className="account-field" htmlFor="account-forgot-identity"><span>Email Address or Mobile Number</span><input id="account-forgot-identity" name="forgotIdentity" autoComplete="username" value={forgotIdentity} onChange={(event) => setForgotIdentity(event.target.value)} required /></label>
                  <button className="primary-button account-submit" type="submit">Send Reset Link</button>
                  <p className="account-switch-copy">Remembered your password? <button className="account-inline-switch" type="button" onClick={() => setForgotOpen(false)}>Back to Login</button></p>
                  {error ? <p className="account-form-error">{error}</p> : null}
                </form>
              )}
            </div>
          ) : (
            <div className="account-panel active">
              <form id="account-signup-form" name="accountSignupForm" className="account-form" onSubmit={submitSignup}>
                <label className="account-field" htmlFor="account-signup-full-name"><span>Full Name</span><input id="account-signup-full-name" name="fullName" autoComplete="name" value={signup.fullName} onChange={(event) => setSignup({ ...signup, fullName: event.target.value })} required /></label>
                <label className="account-field" htmlFor="account-signup-email"><span>Email Address</span><input id="account-signup-email" name="email" type="email" autoComplete="email" value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} required /></label>
                <label className="account-field" htmlFor="account-signup-mobile"><span>Mobile Number</span><input id="account-signup-mobile" name="mobile" autoComplete="tel" value={signup.mobile} onChange={(event) => setSignup({ ...signup, mobile: event.target.value })} required /></label>
                <label className="account-field" htmlFor="account-signup-password"><span>Password</span><input id="account-signup-password" name="password" type="password" autoComplete="new-password" value={signup.password} onChange={(event) => setSignup({ ...signup, password: event.target.value })} required /></label>
                <label className="account-field" htmlFor="account-signup-confirm-password"><span>Confirm Password</span><input id="account-signup-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={signup.confirmPassword} onChange={(event) => setSignup({ ...signup, confirmPassword: event.target.value })} required /></label>
                <label className="account-checkbox" htmlFor="account-signup-consent">
                  <input id="account-signup-consent" name="signupConsent" type="checkbox" checked={signupConsent} onChange={(event) => setSignupConsent(event.target.checked)} />
                  <span>I agree to the Terms of Service and Privacy Policy</span>
                </label>
                <button className="primary-button account-submit" type="submit">Create Account</button>
                <p className="account-switch-copy">Already have an account? <button className="account-inline-switch" type="button" onClick={() => { setMode("login"); setError(""); }}>Login</button></p>
                {error ? <p className="account-form-error">{error}</p> : null}
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
