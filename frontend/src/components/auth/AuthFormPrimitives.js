import React from "react";
import { Alert, Card, Col, Container, Form, Row } from "react-bootstrap";

export const AuthCenteredCard = ({ children, colProps, cardBodyClassName = "p-3 p-md-4", logo, logoAlt = "Student Advising Logo", logoStyle = { maxWidth: "220px", height: "auto" }, heading, headingStyle = { fontSize: "1.3rem" }, subtext, subtextClassName = "text-muted mb-3", subtextStyle = { fontSize: "0.85rem" }, headingClassName = "mb-3 text-start" }) => (
  <Container className="position-relative" style={{ zIndex: 1 }}>
    <Row className="justify-content-center">
      <Col {...colProps}>
        <Card className="shadow-lg border-0" style={{ position: "relative", zIndex: 3, borderRadius: "20px", overflow: "hidden" }}>
          <Card.Body className={cardBodyClassName}>
            {logo ? (
              <div className="text-center mb-3">
                <img src={logo} alt={logoAlt} style={logoStyle} />
              </div>
            ) : null}
            {heading ? <h2 className={headingClassName} style={headingStyle}>{heading}</h2> : null}
            {subtext ? <p className={subtextClassName} style={subtextStyle}>{subtext}</p> : null}
            {children}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Container>
);

export const AuthFeedback = ({ error, setError, success, setSuccess }) => (
  <>
    {error ? (
      <Alert variant="danger" dismissible onClose={() => setError("")}>
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {error}
      </Alert>
    ) : null}
    {success ? (
      <Alert variant="success" dismissible onClose={() => setSuccess("")}>
        <i className="bi bi-check-circle-fill me-2"></i>
        {success}
      </Alert>
    ) : null}
  </>
);

export const AuthInput = ({ className = "mb-3", ...props }) => (
  <Form.Group className={className}>
    <Form.Control {...props} />
  </Form.Group>
);
