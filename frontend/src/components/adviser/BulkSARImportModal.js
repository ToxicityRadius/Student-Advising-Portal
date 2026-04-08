import React, { useCallback, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Table } from 'react-bootstrap';

const parseCSVText = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  const required = ['studentname', 'studentnumber', 'email', 'yearlevel'];
  const missing = required.filter((r) => !headers.some((h) => h.replace(/[_\s]/g, '') === r));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  const col = (name) => headers.findIndex((h) => h.replace(/[_\s]/g, '') === name);

  const nameIdx = col('studentname');
  const numIdx = col('studentnumber');
  const emailIdx = col('email');
  const yearIdx = col('yearlevel');

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const studentName = cols[nameIdx] || '';
    const studentNumber = cols[numIdx] || '';
    const email = cols[emailIdx] || '';
    const yearLevel = cols[yearIdx] || '';

    if (!studentName && !email) continue;

    const rowErrors = [];
    if (!studentName) rowErrors.push('missing name');
    if (!studentNumber) rowErrors.push('missing student number');
    if (!email.toLowerCase().endsWith('@tip.edu.ph'))
      rowErrors.push('email must end with @tip.edu.ph');
    const yr = Number(yearLevel);
    if (!yr || yr < 1 || yr > 5) rowErrors.push('yearLevel must be 1-5');

    if (rowErrors.length) {
      errors.push(`Row ${i + 1}: ${rowErrors.join('; ')}`);
    }

    rows.push({
      studentName,
      studentNumber,
      email: email.toLowerCase(),
      yearLevel: yr || 1,
      line: i + 1,
      valid: rowErrors.length === 0,
    });
  }

  return { rows, errors };
};

const BulkSARImportModal = ({ show, onHide, onImport, curriculumId, importing = false }) => {
  const [preview, setPreview] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [parseError, setParseError] = useState('');

  const reset = useCallback(() => {
    setPreview([]);
    setParseErrors([]);
    setParseError('');
  }, []);

  const handleClose = () => {
    reset();
    onHide();
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      reset();
      return;
    }

    setParseError('');
    setParseErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { rows, errors } = parseCSVText(event.target.result);
        if (rows.length === 0) {
          setParseError('No valid data rows found in CSV');
          setPreview([]);
        } else {
          setPreview(rows);
          setParseErrors(errors);
        }
      } catch (err) {
        setParseError(err.message);
        setPreview([]);
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read the file');
    };
    reader.readAsText(selected);
  };

  const validRows = preview.filter((r) => r.valid);

  const handleSubmit = async () => {
    if (validRows.length === 0) return;

    const payload = validRows.map(({ studentName, studentNumber, email, yearLevel }) => ({
      studentName,
      studentNumber,
      email,
      yearLevel,
      curriculumId: curriculumId || undefined,
    }));
    await onImport(payload);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Bulk Import Students</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3">
          Upload a CSV with columns: <code>studentName</code>, <code>studentNumber</code>,{' '}
          <code>email</code>, <code>yearLevel</code>. Emails must end with @tip.edu.ph.
        </p>

        <Form.Group className="mb-3">
          <Form.Label>CSV File</Form.Label>
          <Form.Control type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </Form.Group>

        {parseError && <Alert variant="danger">{parseError}</Alert>}

        {parseErrors.length > 0 && (
          <Alert variant="warning">
            <strong>
              {parseErrors.length} validation issue{parseErrors.length !== 1 ? 's' : ''}:
            </strong>
            <ul className="mb-0 mt-1">
              {parseErrors.slice(0, 10).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {parseErrors.length > 10 && <li>...and {parseErrors.length - 10} more</li>}
            </ul>
          </Alert>
        )}

        {preview.length > 0 && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>Preview</strong>
              <div className="d-flex gap-2">
                <Badge bg="success">{validRows.length} valid</Badge>
                {preview.length - validRows.length > 0 && (
                  <Badge bg="danger">{preview.length - validRows.length} invalid</Badge>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <Table size="sm" bordered hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Student #</th>
                    <th>Email</th>
                    <th>Year</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className={row.valid ? '' : 'table-danger'}>
                      <td>{row.line}</td>
                      <td>{row.studentName}</td>
                      <td>{row.studentNumber}</td>
                      <td>{row.email}</td>
                      <td>{row.yearLevel}</td>
                      <td>
                        <Badge bg={row.valid ? 'success' : 'danger'} className="text-uppercase">
                          {row.valid ? 'OK' : 'Error'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={validRows.length === 0 || importing}
        >
          {importing
            ? 'Importing...'
            : `Import ${validRows.length} Student${validRows.length !== 1 ? 's' : ''}`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BulkSARImportModal;
