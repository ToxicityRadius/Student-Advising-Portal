import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EditSARModal from '../../components/adviser/EditSARModal';
import SARLayout from '../../components/sar/SARLayout';
import api from '../../utils/api';
import useSarData from '../../hooks/useSarData';
import { fetchCurriculumsCached } from '../../utils/curriculumsCache';
import AdviserLayout from '../../components/adviser/AdviserLayout';
import { getErrorMessage } from '../../utils/errorHelpers';

const StudentDetail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sarId } = useParams();

  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [curriculums, setCurriculums] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const { sar, versions, loading, error: sarFetchError, reload } = useSarData(sarId);

  const canExportPdf = user?.role === 'adviser' || user?.role === 'admin';
  const canEditSar = user?.role === 'adviser' || user?.role === 'admin';

  const loadSarData = useCallback(async () => {
    setAlert({ variant: '', message: '' });
    await reload();
  }, [reload]);

  useEffect(() => {
    if (sarFetchError) {
      setAlert({ variant: 'danger', message: getErrorMessage(sarFetchError, 'Failed to load the student academic record.') });
    }
  }, [sarFetchError]);

  useEffect(() => {
    fetchCurriculumsCached({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' })
      .then((res) => setCurriculums(res?.items || res?.data || []))
      .catch(() => setCurriculums([]));
  }, []);

  const handleEditSAR = async (payload) => {
    setEditSubmitting(true);
    setAlert({ variant: '', message: '' });
    try {
      const formData = new FormData();
      formData.append('studentName', payload.studentName);
      formData.append('studentNumber', payload.studentNumber);
      formData.append('yearLevel', payload.yearLevel);
      formData.append('curriculumId', payload.curriculumId);

      if (payload.studentProfile) {
        formData.append('studentProfile', JSON.stringify(payload.studentProfile));
      }

      if (payload.profilePicture) {
        formData.append('profile_picture', payload.profilePicture);
      }

      if (payload.removeProfilePicture) {
        formData.append('remove_profile_picture', 'true');
      }

      await api.put(`/sars/${sar.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await loadSarData();
      setAlert({ variant: 'success', message: 'Student academic record updated successfully.' });
    } catch (error) {
      throw error;
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!sar?.id) return;
    setActionLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const response = await api.get(`/sars/${sar.id}/export/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SAR-${sar.studentNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to export the SAR PDF.') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInitialStudyPlan = async () => {
    if (!sar?.id) return;
    setActionLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const response = await api.post(`/sars/${sar.id}/study-plan/generate`);
      await loadSarData();
      setAlert({ variant: 'success', message: 'Initial study plan generated successfully.' });
      const newVersionId = response.data?.data?.id;
      if (newVersionId) {
        navigate(`/adviser/students/${sar.id}/plan/${newVersionId}`);
      }
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to generate the initial study plan.') });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdviserLayout activePage="students" pageTitle="Student Detail">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Student Academic Record</h2>
          <p className="text-muted mb-0">Review student profile data and available study plan versions.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {canEditSar && sar && (
            <Button onClick={() => setShowEditModal(true)} variant="light" className="border border-dark" disabled={actionLoading}>
              Edit Record
            </Button>
          )}
          {canExportPdf && (
            <Button onClick={handleExportPDF} disabled={!sar?.id || actionLoading} variant="primary">
              {actionLoading ? 'Working...' : 'Export PDF'}
            </Button>
          )}
          <Button as={Link} to="/adviser/students" variant="light" className="border border-dark">
            Back to Records
          </Button>
        </div>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <SARLayout
          sar={sar}
          versions={versions}
          role={user?.role}
          sarId={sarId}
          onGeneratePlan={handleGenerateInitialStudyPlan}
          onRefresh={loadSarData}
          isActionLoading={actionLoading}
          onTermChange={loadSarData}
        />
      )}

      <EditSARModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onSubmit={handleEditSAR}
        sar={sar}
        curriculums={curriculums}
        submitting={editSubmitting}
      />
    </AdviserLayout>
  );
};

export default StudentDetail;
