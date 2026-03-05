import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Card,
  Table,
  Button,
  Spinner,
  Alert,
  Badge
} from 'react-bootstrap';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StudyPlan = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/advising/my-plan');
      setPlan(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load study plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleGenerate = async () => {
    setError('');
    setSuccess('');
    setGenerating(true);
    try {
      const res = await api.post('/advising/generate');
      setPlan(res.data.data.plan);
      const { totalSubjects, totalUnits, term } = res.data.data.summary;
      setSuccess(
        `Study plan generated for ${term} — ${totalSubjects} subject(s), ${totalUnits} units.`
      );
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  // Group PlanSubjects by projected_term (or fall back to target_term)
  const groupByTerm = (planSubjects) => {
    const groups = {};
    for (const ps of planSubjects) {
      const term = ps.projected_term || ps.target_term || 'Unassigned';
      if (!groups[term]) groups[term] = [];
      groups[term].push(ps);
    }
    return groups;
  };

  const subjects = plan?.PlanSubjects || [];
  const totalUnits = subjects.reduce((sum, ps) => sum + (ps.Subject?.units || 0), 0);
  const isApproved = plan?.status === 'approved';
  const isVoided = plan?.status === 'voided';

  // Show generate button if no plan, or plan is voided
  const canGenerate = !plan || isVoided;

  const termGroups = groupByTerm(subjects);

  // ── PDF Generation ──
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHNOLOGICAL INSTITUTE OF THE PHILIPPINES', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPUTER ENGINEERING DEPARTMENT', pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL APPROVED STUDY PLAN', pageWidth / 2, 30, { align: 'center' });

    // Student info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const studentName = user ? `${user.firstName} ${user.lastName}` : 'N/A';
    const studentIdStr = user?.studentId || 'N/A';
    doc.text(`Student Name: ${studentName}`, 14, 40);
    doc.text(`Student ID: ${studentIdStr}`, 14, 46);

    // Table data
    const tableData = subjects.map(ps => [
      ps.projected_term || ps.target_term || '',
      ps.Subject?.course_code || '',
      ps.Subject?.title || '',
      ps.Subject?.units != null ? String(ps.Subject.units) : ''
    ]);

    const tableResult = autoTable(doc, {
      startY: 52,
      head: [['Term', 'Course Code', 'Course Title', 'Units']],
      body: tableData,
      theme: 'plain',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Signature blocks — use doc.lastAutoTable (v5), fall back to return value
    const finalY = (doc.lastAutoTable?.finalY ?? tableResult?.finalY ?? 120) + 30;
    const sigLine = '________________________';
    doc.setFontSize(9);

    // Left — Student
    doc.text(sigLine, 14, finalY);
    doc.text('Student Signature over', 14, finalY + 5);
    doc.text('Printed Name', 14, finalY + 10);

    // Center — Adviser
    doc.text(sigLine, pageWidth / 2, finalY, { align: 'center' });
    doc.text('Adviser Signature over', pageWidth / 2, finalY + 5, { align: 'center' });
    doc.text('Printed Name', pageWidth / 2, finalY + 10, { align: 'center' });

    // Right — Program Chair
    doc.text(sigLine, pageWidth - 14, finalY, { align: 'right' });
    doc.text('Program Chair Signature over', pageWidth - 14, finalY + 5, { align: 'right' });
    doc.text('Printed Name', pageWidth - 14, finalY + 10, { align: 'right' });

    doc.save('Approved_Study_Plan.pdf');
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="warning" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">My Study Plan</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && <Alert variant="success">{success}</Alert>}

      {isVoided && (
        <Alert variant="danger" className="fs-5">
          <Alert.Heading>Plan Voided</Alert.Heading>
          Your study plan has been voided due to a recently failed subject. Please generate a new study plan.
        </Alert>
      )}

      {isApproved && (
        <Alert variant="success" className="fs-5">
          <Alert.Heading>Plan Approved</Alert.Heading>
          Your Study Plan has been Approved by your Adviser. It is now locked and submitted for demand forecasting.
        </Alert>
      )}

      {isApproved && (
        <Button variant="dark" className="mb-3" onClick={generatePDF}>
          Download Official PDF
        </Button>
      )}

      {canGenerate && (
        <Button
          variant="warning"
          className="mb-3"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Generating…
            </>
          ) : (
            'Generate New Study Plan'
          )}
        </Button>
      )}

      {!plan ? (
        <Card body className="text-center text-muted">
          No study plan yet. Click the button above to generate one.
        </Card>
      ) : (
        <>
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>
                <strong>Plan #{plan.id}</strong>{' '}
                <Badge
                  bg={
                    plan.status === 'approved'
                      ? 'success'
                      : plan.status === 'voided'
                      ? 'danger'
                      : 'info'
                  }
                  className="ms-2"
                >
                  {plan.status}
                </Badge>
              </span>
              <span className="text-muted">
                {subjects.length} subject(s) &middot; {totalUnits} units
              </span>
            </Card.Header>
          </Card>

          {subjects.length === 0 ? (
            <Card body>
              <p className="text-muted mb-0">
                No subjects recommended — you may have completed all eligible courses.
              </p>
            </Card>
          ) : (
            Object.entries(termGroups).map(([term, termSubjects]) => {
              const termUnits = termSubjects.reduce(
                (sum, ps) => sum + (ps.Subject?.units || 0),
                0
              );
              const hasHistorical = termSubjects.some((ps) => ps.is_historical);

              return (
                <Card key={term} className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <strong>{term}</strong>
                    <span className="text-muted">
                      {termSubjects.length} subject(s) &middot; {termUnits} units
                      {hasHistorical && (
                        <Badge bg="success" className="ms-2">
                          Completed Term
                        </Badge>
                      )}
                    </span>
                  </Card.Header>
                  <Card.Body>
                    <Table striped bordered hover responsive size="sm">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Course Code</th>
                          <th>Title</th>
                          <th>Units</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {termSubjects.map((ps, idx) => (
                          <tr key={ps.id}>
                            <td>{idx + 1}</td>
                            <td>{ps.Subject?.course_code}</td>
                            <td>
                              {ps.Subject?.title}{' '}
                              {ps.is_historical ? (
                                <Badge bg="success">Completed</Badge>
                              ) : (
                                <Badge bg="primary">Projected</Badge>
                              )}
                            </td>
                            <td>{ps.Subject?.units}</td>
                            <td>
                              {ps.is_historical ? (
                                <Badge bg="success">Completed</Badge>
                              ) : (
                                <Badge bg="primary">Projected</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              );
            })
          )}
        </>
      )}
    </Container>
  );
};

export default StudyPlan;
