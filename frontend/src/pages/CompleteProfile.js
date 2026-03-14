import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const programOptions = ["BSCpE", "BSCS", "BSIT", "BSCE", "BSEE", "BSME"];

const CompleteProfile = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    middle_name: user?.middle_name || "",
    last_name: user?.last_name || "",
    student_id: user?.studentId || "",
    program: user?.program || "",
    contact_number: user?.contact_number || "",
    year_level: user?.year_level || "",
    gender: user?.gender || "",
  });
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const response = await api.get(`/users/${user.id}`);
        const profile = response.data.user || {};

        setFormData((prev) => ({
          ...prev,
          first_name: profile.first_name || prev.first_name || "",
          middle_name: profile.middle_name || prev.middle_name || "",
          last_name: profile.last_name || prev.last_name || "",
          student_id:
            profile.studentId || prev.student_id || user.studentId || "",
          program: profile.program || prev.program || "",
          contact_number: profile.contact_number || prev.contact_number || "",
          year_level:
            profile.current_year_level ||
            profile.year_level ||
            prev.year_level ||
            "",
          gender: profile.gender || prev.gender || "",
        }));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      }
    };

    fetchProfile();
  }, [user?.id, user?.studentId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        program: formData.program,
        contact_number: formData.contact_number,
        year_level: formData.year_level,
        gender: formData.gender || null,
      };

      const response = await api.put(`/users/${user.id}/profile`, payload);
      const freshToken = response.data.token;

      if (freshToken) {
        localStorage.setItem("token", freshToken);
        await login(freshToken);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: "720px" }}>
      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-3">Complete Your Profile</h3>
          <p className="text-muted">
            Please complete your required profile details before continuing.
          </p>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Middle Name</Form.Label>
              <Form.Control
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            {user.role === "student" && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Student ID</Form.Label>
                  <Form.Control
                    name="student_id"
                    value={formData.student_id}
                    readOnly
                    disabled
                  />
                  <Form.Text className="text-muted">
                    Student ID is set during registration and cannot be changed
                    on this page.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Program</Form.Label>
                  <Form.Select
                    name="program"
                    value={formData.program}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Program</option>
                    {programOptions.map((program) => (
                      <option key={program} value={program}>
                        {program}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Year Level</Form.Label>
                  <Form.Select
                    name="year_level"
                    value={formData.year_level}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Year Level</option>
                    {[1, 2, 3, 4, 5].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-4">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Gender</Form.Label>
              <Form.Select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender (Optional)</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>

            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Saving..." : "Save and Continue"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CompleteProfile;
