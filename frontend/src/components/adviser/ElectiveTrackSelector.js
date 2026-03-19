import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHelpers';

const ElectiveTrackSelector = ({ sarId, curriculumId, selectedTrackId, onTrackSelected }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [chosenTrackId, setChosenTrackId] = useState('');
  const [alert, setAlert] = useState({ variant: '', message: '' });

  useEffect(() => {
    const loadTracks = async () => {
      setLoading(true);
      setAlert({ variant: '', message: '' });

      try {
        const response = await api.get(`/curriculums/${curriculumId}/elective-tracks`);
        const items = Array.isArray(response.data?.data) ? response.data.data : [];
        setTracks(items);
      } catch (error) {
        setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to load elective tracks.') });
        setTracks([]);
      } finally {
        setLoading(false);
      }
    };

    if (curriculumId) {
      loadTracks();
    }
  }, [curriculumId]);

  useEffect(() => {
    if (selectedTrackId) {
      setChosenTrackId(String(selectedTrackId));
    }
  }, [selectedTrackId]);

  const handleSelectTrack = async () => {
    if (!chosenTrackId) {
      setAlert({ variant: 'danger', message: 'Please select an elective track first.' });
      return;
    }

    setSubmitting(true);
    setAlert({ variant: '', message: '' });

    try {
      const response = await api.patch(`/sars/${sarId}/elective-track`, {
        electiveTrackId: Number(chosenTrackId)
      });

      const payload = response.data?.data || null;
      setAlert({
        variant: 'success',
        message: payload?.draftVersion
          ? 'Elective track selected and draft study plan updated successfully.'
          : 'Elective track selected successfully.'
      });
      onTrackSelected(payload);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to select elective track.') });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" />
        </Card.Body>
      </Card>
    );
  }

  const isChanged = selectedTrackId ? String(chosenTrackId) !== String(selectedTrackId) : Boolean(chosenTrackId);

  return (
    <Card className="shadow-sm mb-4 border-warning">
      <Card.Body>
        <h5 className="mb-2">Elective Track Selection</h5>

        {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

        {tracks.length === 0 ? (
          <Alert variant="warning" className="mb-0">No elective tracks are configured for this curriculum.</Alert>
        ) : (
          <div className="d-flex flex-column flex-md-row gap-2">
            <Form.Select
              value={chosenTrackId}
              onChange={(event) => setChosenTrackId(event.target.value)}
              aria-label="Select elective track"
            >
              <option value="">Select elective track</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>{track.name}</option>
              ))}
            </Form.Select>
            <Button onClick={handleSelectTrack} disabled={submitting || !chosenTrackId || !isChanged}>
              {submitting ? 'Saving...' : selectedTrackId ? 'Change Track' : 'Confirm Track'}
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ElectiveTrackSelector;