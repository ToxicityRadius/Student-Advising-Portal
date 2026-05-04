import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';

const PreviewTable = ({ title, rows, variant = 'light' }) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h6 className="mb-0">{title}</h6>
        <Badge bg={variant}>{rows.length}</Badge>
      </div>
      <div className="table-responsive">
        <Table size="sm" bordered className="mb-0">
          <thead>
            <tr>
              <th>Course</th>
              <th>Grade</th>
              {'status' in (rows[0] || {}) && <th>Status</th>}
              {'message' in (rows[0] || {}) && <th>Issue</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.courseCode || row.line}-${index}`}>
                <td>
                  <span className="fw-semibold">{row.courseCode}</span>
                  {row.courseName && <div className="text-muted small">{row.courseName}</div>}
                </td>
                <td>{row.grade || '-'}</td>
                {'status' in row && <td>{row.status}</td>}
                {'message' in row && <td>{row.message}</td>}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

const PdfGradeImportModal = ({
  show,
  onHide,
  onPreview,
  onImport,
  onClearPreview,
  preview,
  error,
  previewing = false,
  importing = false,
}) => {
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!show) {
      setFile(null);
    }
  }, [show]);

  const handleClose = () => {
    if (!previewing && !importing) {
      onHide();
    }
  };

  const canImport = Boolean(preview?.canImport && file && !previewing && !importing);

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Import PDF Checklist</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form.Group className="mb-3" controlId="pdf-checklist-file">
          <Form.Label>PDF checklist file</Form.Label>
          <Form.Control
            type="file"
            accept="application/pdf,.pdf"
            disabled={previewing || importing}
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              onClearPreview?.();
            }}
          />
        </Form.Group>

        {preview && (
          <div className="border rounded p-3 bg-light">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-2 mb-3">
              <div>
                <div className="text-muted small">Student</div>
                <div className="fw-semibold">{preview.identity?.studentName || '-'}</div>
                <div className="text-muted small">{preview.identity?.studentNumber || '-'}</div>
              </div>
              <div className="text-md-end">
                <div className="text-muted small">Curriculum</div>
                <div className="fw-semibold">{preview.curriculumTitle || '-'}</div>
              </div>
            </div>

            {preview.warnings?.length > 0 && (
              <Alert variant="warning" className="py-2">
                {preview.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </Alert>
            )}

            <PreviewTable title="Matched grades" rows={preview.matchedRows} variant="success" />
            <PreviewTable title="Unmatched rows" rows={preview.unmatchedRows} variant="warning" />
            <PreviewTable title="Invalid rows" rows={preview.invalidRows} variant="danger" />
            <PreviewTable title="Duplicate rows" rows={preview.duplicateRows} variant="danger" />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={handleClose}
          disabled={previewing || importing}
        >
          Cancel
        </Button>
        <Button
          variant="outline-primary"
          onClick={() => onPreview(file)}
          disabled={!file || previewing || importing}
        >
          {previewing ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" />
              Reading PDF
            </>
          ) : (
            'Preview PDF'
          )}
        </Button>
        <Button variant="primary" onClick={() => onImport(file)} disabled={!canImport}>
          {importing ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" />
              Importing
            </>
          ) : (
            'Import Matched Grades'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PdfGradeImportModal;
