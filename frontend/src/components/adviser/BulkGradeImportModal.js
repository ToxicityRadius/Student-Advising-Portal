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

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim());

  const codeIdx = headers.findIndex((h) => h.toLowerCase() === 'coursecode');
  const gradeIdx = headers.findIndex((h) => h.toLowerCase() === 'grade');

  if (codeIdx === -1 || gradeIdx === -1) {
    throw new Error('CSV must have "courseCode" and "grade" columns');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const courseCode = cols[codeIdx] || '';
    const grade = cols[gradeIdx] || '';
    if (courseCode) {
      rows.push({ courseCode, grade, line: i + 1 });
    }
  }

  return rows;
};

const BulkGradeImportModal = ({ show, onHide, onImport, importing = false }) => {
  const [preview, setPreview] = useState([]);
  const [parseError, setParseError] = useState('');

  const reset = useCallback(() => {
    setPreview([]);
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

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rows = parseCSVText(event.target.result);
        if (rows.length === 0) {
          setParseError('No valid data rows found in CSV');
          setPreview([]);
        } else {
          setPreview(rows);
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

  const handleSubmit = async () => {
    if (preview.length === 0) return;

    const payload = preview.map(({ courseCode, grade }) => ({ courseCode, grade }));
    await onImport(payload);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Import Grades from CSV</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3">
          Upload a CSV file with columns: <code>courseCode</code>, <code>grade</code>. Grades can be
          numeric (1.00–5.00), INC, or Pending.
        </p>

        <Form.Group className="mb-3">
          <Form.Label>CSV File</Form.Label>
          <Form.Control type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </Form.Group>

        {parseError && <Alert variant="danger">{parseError}</Alert>}

        {preview.length > 0 && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>Preview</strong>
              <Badge bg="secondary">
                {preview.length} row{preview.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <Table size="sm" bordered hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Course Code</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.line}</td>
                      <td>{row.courseCode}</td>
                      <td>{row.grade || <span className="text-muted">—</span>}</td>
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
          disabled={preview.length === 0 || importing}
        >
          {importing
            ? 'Importing...'
            : `Import ${preview.length} Grade${preview.length !== 1 ? 's' : ''}`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BulkGradeImportModal;
