import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Form,
  Button,
  Row,
  Col,
} from "react-bootstrap";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import AuthBackgroundShell from "../components/auth/AuthBackgroundShell";
import { AuthCenteredCard, AuthFeedback, AuthInput } from "../components/auth/AuthFormPrimitives";
import backgroundImage from "../assets/images/bg.png";
import studentAdvisingLogo from "../assets/images/STUDENT ADVISING LOGO 1.png";

const Register = () => {
  const [formData, setFormData] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    gender: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || "student";
  const isFaculty = role === "faculty";
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!isFaculty && !/^\d{7}$/.test(formData.studentId)) {
      setError("Student Number must be exactly 7 digits");
      return;
    }

    // Faculty email validation
    if (
      isFaculty &&
      !formData.email.toLowerCase().endsWith(".cpe@tip.edu.ph")
    ) {
      setError("Faculty email must end with .cpe@tip.edu.ph");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        studentId: isFaculty ? null : formData.studentId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender || null,
        email: formData.email,
        password: formData.password,
        role: isFaculty ? "adviser" : "student",
      });

      setSuccess(response.message);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      // Decode the JWT token from Google
      const decoded = jwtDecode(credentialResponse.credential);

      // Check if email ends with @tip.edu.ph
      if (!decoded.email.toLowerCase().endsWith("@tip.edu.ph")) {
        setError(
          "Only TIP email addresses (@tip.edu.ph) are allowed to sign in.",
        );
        setLoading(false);
        return;
      }

      // Send the Google token to your backend for verification and login
      const { data } = await api.post("/auth/google", {
        token: credentialResponse.credential,
        email: decoded.email,
        name: decoded.name,
      });

      // Store the token and user data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Navigate to dashboard
      navigate("/dashboard");
      window.location.reload();
    } catch (err) {
      console.error("Google Sign-In error:", err);
      setError(
        err.response?.data?.message ||
          "An error occurred during Google Sign-In. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign-In failed. Please try again.");
  };

  return (
    <AuthBackgroundShell backgroundImage={backgroundImage} topBarTop="6%" contentClassName="py-5">
      <AuthCenteredCard
        logo={studentAdvisingLogo}
        heading={isFaculty ? "Faculty Registration" : "Create an Account"}
        colProps={{ xs: 12, sm: 9, md: 7, lg: 6, xl: 5, style: { maxWidth: "380px" } }}
      >
        <AuthFeedback
          error={error}
          setError={setError}
          success={success}
          setSuccess={setSuccess}
        />

        <Form onSubmit={handleSubmit}>
          {!isFaculty && (
            <AuthInput
              type="text"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              required
              placeholder="Student Number (7 digits)"
              pattern="\d{7}"
              maxLength="7"
              title="Student Number must be exactly 7 digits"
            />
          )}

          <Row>
            <Col md={6}>
              <AuthInput
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="First Name"
              />
            </Col>
            <Col md={6}>
              <AuthInput
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Last Name"
              />
            </Col>
          </Row>

                  <Form.Group className="mb-3">
                    <Form.Select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="">Gender (Optional)</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Form.Select>
                  </Form.Group>

          <AuthInput
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Email Address"
          />

          <AuthInput
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Password"
          />

          <AuthInput
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Confirm Password"
          />

                  <Button
                    type="submit"
                    variant="warning"
                    className="w-100 fw-bold text-dark mb-3"
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Register"}
                  </Button>

                  <div className="position-relative text-center mb-3">
                    <hr />
                    <span
                      className="position-absolute top-50 start-50 translate-middle bg-white px-3"
                      style={{ color: "#666" }}
                    >
                      or
                    </span>
                  </div>

                  <div className="d-flex justify-content-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      text="signup_with"
                      theme="outline"
                      size="large"
                    />
                  </div>

                  <div
                    className="text-center mt-3"
                    style={{ fontSize: "0.82rem" }}
                  >
                    <span className="text-muted">
                      Already have an account?{" "}
                    </span>
                    <Link to="/login" className="text-decoration-none fw-bold">
                      Sign in
                    </Link>
                  </div>
        </Form>
      </AuthCenteredCard>
    </AuthBackgroundShell>
  );
};

export default Register;
