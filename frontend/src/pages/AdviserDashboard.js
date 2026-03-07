import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Col,
  Container,
  Modal,
  Row,
  Spinner,
  Table,
  Tab,
  Tabs
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function getStudentName(student) {
  if (!student) return 'Unknown Student';

  const first = student.firstName || student.first_name || '';
  const last = student.lastName || student.last_name || '';
  const fullName = `${first} ${last}`.trim();

  return fullName || 'Unknown Student';
}

function getStatusBadgeVariant(status) {
  switch ((status || '').toLowerCase()) {
    case 'approved':
      return 'success';
    case 'voided_due_to_failure':
      return 'danger';
    case 'pending':
      return 'warning';
    case 'draft':
      return 'secondary';
    default:
      return 'dark';
  }
}

function formatStatus(status) {
  return (status || 'unknown').replaceAll('_', ' ');
}

const AdviserDashboard = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/advising/pending');
      setPlans(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load adviser study plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const urgentPlans = useMemo(
    () => plans.filter(plan => plan.status === 'voided_due_to_failure'),
    [plans]
  );

  const reviewPlans = useMemo(
    () => plans.filter(plan => plan.status === 'draft' || plan.status === 'pending'),
    [plans]
  );

  const approvedPlans = useMemo(
    () => plans.filter(plan => plan.status === 'approved'),
    [plans]
  );

  const groupedSubjects = useMemo(() => {
    if (!selectedPlan) return [];

    const grouped = (selectedPlan.PlanSubjects || []).reduce((acc, planSubject) => {
      const termLabel = planSubject.target_term || 'Unscheduled';
      if (!acc[termLabel]) acc[termLabel] = [];
      acc[termLabel].push(planSubject);
      return acc;
    }, {});

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(term => ({ term, subjects: grouped[term] }));
  }, [selectedPlan]);

  const handleApprove = async (planId) => {
    try {
      setError('');
      const response = await api.put(`/advising/plan/${planId}/approve`);
      const updatedPlan = response.data?.data;

      if (updatedPlan) {
        setPlans(prev => prev.map(plan => (plan.id === updatedPlan.id ? updatedPlan : plan)));
        setSelectedPlan(updatedPlan);
      } else {
        await fetchPlans();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve plan.');
    }
  };

  const renderPlanTable = (planList, emptyMessage) => {
    if (planList.length === 0) {
      return <Alert variant="info">{emptyMessage}</Alert>;
    }

    return (
      <Table hover responsive>
        <thead className="table-light">
          <tr>
            <th>Student Name</th>
            <th>Program</th>
            <th>Year Level</th>
            <th>Status</th>
            <th style={{ width: '140px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {planList.map(plan => (
            <tr key={plan.id}>
              <td>
                {getStudentName(plan.Student)}
                <div className="text-muted small">{plan.Student?.studentId || 'No ID'}</div>
              </td>
              <td>{plan.Student?.program || 'N/A'}</td>
              <td>{plan.Student?.year_level || 'N/A'}</td>
              <td>
                <Badge bg={getStatusBadgeVariant(plan.status)} className="text-capitalize">
                  {formatStatus(plan.status)}
                </Badge>
              </td>
              <td>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => setSelectedPlan(plan)}
                >
                  View 360
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-3">Adviser Dashboard</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Tabs defaultActiveKey="needs-review" className="mb-4">
        <Tab
          eventKey="needs-review"
          title={
            <>
              Needs Review <Badge bg="warning" text="dark">{reviewPlans.length}</Badge>
            </>
          }
        >
          {renderPlanTable(reviewPlans, 'No draft or pending plans need review right now.')}
        </Tab>

        <Tab
          eventKey="urgent"
          title={
            <>
              Urgent Intervention <Badge bg="danger">{urgentPlans.length}</Badge>
            </>
          }
        >
          {renderPlanTable(urgentPlans, 'No voided_due_to_failure plans require urgent intervention.')}
        </Tab>

        <Tab
          eventKey="approved"
          title={
            <>
              Approved <Badge bg="success">{approvedPlans.length}</Badge>
            </>
          }
        >
          {renderPlanTable(approvedPlans, 'No approved plans yet.')}
        </Tab>
      </Tabs>

      <Modal
        size="xl"
        show={!!selectedPlan}
        onHide={() => setSelectedPlan(null)}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedPlan ? `${getStudentName(selectedPlan.Student)} (${selectedPlan.Student?.studentId || 'No ID'})` : 'Advisee 360-Degree View'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPlan && (
            <Row>
              <Col md={4}>
                <Table bordered size="sm" className="mb-0">
                  <tbody>
                    <tr>
                      <th>Program</th>
                      <td>{selectedPlan.Student?.program || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Year Level</th>
                      <td>{selectedPlan.Student?.year_level || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Contact Number</th>
                      <td>{selectedPlan.Student?.contact_number || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Current Plan Status</th>
                      <td>
                        <Badge bg={getStatusBadgeVariant(selectedPlan.status)} className="text-capitalize">
                          {formatStatus(selectedPlan.status)}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={8}>
                {(() => {
                  const failedSubjectIds = selectedPlan.Student?.Grades
                    ?.filter(g => g.status === 'failed')
                    .map(g => g.SubjectId) || [];

                  if (groupedSubjects.length === 0) {
                    return <Alert variant="secondary">No plan subjects available for this study plan.</Alert>;
                  }

                  return groupedSubjects.map(group => (
                    <div key={group.term} className="mb-4">
                      <h6 className="mb-2">{group.term}</h6>
                      <Table bordered hover responsive size="sm">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '150px' }}>Course Code</th>
                            <th>Title</th>
                            <th style={{ width: '90px' }}>Units</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.subjects.map(planSubject => {
                            const subject = planSubject.Subject;
                            return (
                              <tr key={planSubject.id}>
                                <td>{subject?.course_code || 'N/A'}</td>
                                <td>
                                  {subject?.title || 'N/A'}
                                  {selectedPlan.status === 'voided_due_to_failure' && failedSubjectIds.includes(subject?.id) && (
                                    <Badge bg="danger" className="ms-2">Failed - Caused Void</Badge>
                                  )}
                                </td>
                                <td>{subject?.units ?? 'N/A'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  ));
                })()}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedPlan?.status !== 'voided_due_to_failure' && (
            <>
              <Button
                variant="primary"
                onClick={() => navigate(`/study-plan?studentId=${selectedPlan.Student?.id}`)}
              >
                Edit Plan
              </Button>
              {selectedPlan?.status !== 'approved' && (
                <Button variant="success" onClick={() => handleApprove(selectedPlan.id)}>
                  Approve Plan
                </Button>
              )}
            </>
          )}
          <Button variant="secondary" onClick={() => setSelectedPlan(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdviserDashboard;
