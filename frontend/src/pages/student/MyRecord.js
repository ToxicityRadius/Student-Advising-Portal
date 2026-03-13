import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import api from '../../utils/api';
import SARLayout from '../../components/sar/SARLayout';

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const MyRecord = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [sar, setSar] = useState(null);

  const loadMyRecord = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const listResponse = await api.get('/sars');
      const sarItems = listResponse.data?.items || listResponse.data?.data || [];
      const ownSar = Array.isArray(sarItems) ? sarItems[0] : null;
      if (!ownSar) {
        setSar(null);
        return;
      }
      const sarResponse = await api.get(`/sars/${ownSar.id}`);
      setSar(sarResponse.data?.data || null);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to load your academic record.') });
      setSar(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyRecord();
  }, [loadMyRecord]);

  const handleExportPDF = async () => {
    if (!sar?.id) return;
    setExporting(true);
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
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to export the record as PDF.') });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">My Academic Record</h2>
          <p className="text-muted mb-0">View your student record and academic progress details.</p>
        </div>
        <Button onClick={handleExportPDF} disabled={!sar?.id || exporting}>
          {exporting ? 'Exporting...' : 'Export as PDF'}
        </Button>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <SARLayout sar={sar} versions={[]} role="student" />
      )}
    </div>
  );
};

export default MyRecord;
