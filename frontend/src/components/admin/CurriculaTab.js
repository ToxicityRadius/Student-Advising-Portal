import React from 'react';
import { Badge, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PaginationControls from '../../components/PaginationControls';

const CurriculaTab = ({
  curricula,
  curriculaQuery,
  setCurriculaQuery,
  curriculaMeta,
  curriculumForm,
  setCurriculumForm,
  createCurriculum,
  activateCurriculum,
  activeCurriculumIds,
  submitting,
  /* CSV import/export */
  selectedCurriculumIdForCsv,
  setSelectedCurriculumIdForCsv,
  csvFile,
  setCsvFile,
  importPreview,
  setImportPreview,
  importing,
  exporting,
  previewCsvImport,
  applyCsvImport,
  exportCsv,
  isAdmin,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {isAdmin && (
        <Row className="g-3 mb-3">
          <Col lg={4}>
            <div className="border rounded p-3 bg-light h-100">
              <h5>Create Curriculum</h5>
              <Form onSubmit={createCurriculum}>
                <Form.Group className="mb-2">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    value={curriculumForm.name}
                    onChange={(event) =>
                      setCurriculumForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={curriculumForm.description}
                    onChange={(event) =>
                      setCurriculumForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </Form.Group>
                <Button type="submit" disabled={submitting}>
                  Create
                </Button>
              </Form>
            </div>
          </Col>

          <Col lg={8}>
            <Card className="h-100">
              <Card.Body>
                <h5 className="mb-1">CSV Import/Export</h5>
                <div className="text-muted small mb-3">
                  Export a curriculum CSV, preview a new CSV with row-level validation, then apply
                  with transactional safety.
                </div>

                <Row className="g-2 align-items-end">
                  <Col md={4}>
                    <Form.Label>Curriculum</Form.Label>
                    <Form.Select
                      value={selectedCurriculumIdForCsv}
                      onChange={(event) => setSelectedCurriculumIdForCsv(event.target.value)}
                    >
                      <option value="">Select curriculum</option>
                      {curricula.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {item.isActive ? ' (Active)' : ''}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={5}>
                    <Form.Label>CSV File</Form.Label>
                    <Form.Control
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => {
                        setCsvFile(event.target.files?.[0] || null);
                        setImportPreview(null);
                      }}
                    />
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <Button
                      variant="outline-primary"
                      onClick={exportCsv}
                      disabled={exporting || importing || !selectedCurriculumIdForCsv}
                    >
                      {exporting ? 'Exporting...' : 'Export CSV'}
                    </Button>
                  </Col>
                </Row>

                <div className="d-flex gap-2 mt-3">
                  <Button
                    variant="outline-secondary"
                    onClick={previewCsvImport}
                    disabled={importing || exporting || !csvFile || !selectedCurriculumIdForCsv}
                  >
                    {importing ? 'Working...' : 'Preview Import'}
                  </Button>
                  <Button
                    variant="success"
                    onClick={applyCsvImport}
                    disabled={importing || exporting || !csvFile || !selectedCurriculumIdForCsv}
                  >
                    {importing ? 'Applying...' : 'Apply Import'}
                  </Button>
                </div>

                {importPreview && (
                  <div className="mt-3 border rounded p-3 bg-light">
                    <div className="fw-semibold mb-1">Import Summary</div>
                    <div className="small text-muted mb-2">
                      Total rows: {importPreview.summary?.totalRows || 0} · Dry run:{' '}
                      {String(Boolean(importPreview.dryRun))}
                    </div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {Object.entries(importPreview.summary?.byType || {}).map(([type, count]) => (
                        <Badge key={type} bg="secondary">
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                    {importPreview.hasErrors ? (
                      <>
                        <div className="text-danger small fw-semibold mb-2">
                          Row-level errors must be resolved before successful apply.
                        </div>
                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                          <Table size="sm" bordered>
                            <thead>
                              <tr>
                                <th>Row</th>
                                <th>Type</th>
                                <th>Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(importPreview.rowErrors || []).slice(0, 30).map((row, idx) => (
                                <tr key={`${row.rowNumber}-${idx}`}>
                                  <td>{row.rowNumber}</td>
                                  <td>{row.rowType || '-'}</td>
                                  <td>{row.message}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <div className="text-success small">No validation errors detected.</div>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <div className="d-flex flex-column flex-md-row gap-2 mb-3">
        <Form.Control
          placeholder="Search curricula"
          value={curriculaQuery.search}
          onChange={(event) =>
            setCurriculaQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))
          }
        />
        <Form.Select
          value={curriculaQuery.sortBy}
          onChange={(event) =>
            setCurriculaQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))
          }
          style={{ maxWidth: 220 }}
        >
          <option value="createdAt">Sort by Created Date</option>
          <option value="name">Sort by Name</option>
          <option value="isActive">Sort by Status</option>
        </Form.Select>
        <Form.Select
          value={curriculaQuery.sortOrder}
          onChange={(event) =>
            setCurriculaQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))
          }
          style={{ maxWidth: 180 }}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </Form.Select>
      </div>

      <Table striped bordered hover responsive className="table-fixed-cols">
        <thead>
          <tr>
            <th style={{ width: '20%' }}>Name</th>
            <th style={{ width: '35%' }}>Description</th>
            <th style={{ width: '15%' }}>Status</th>
            <th className="text-end" style={{ width: '30%' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {curricula.map((item) => {
            const itemIsActive = item.isActive || activeCurriculumIds?.has?.(item.id);

            return (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.description || '-'}</td>
                <td>
                  {itemIsActive ? (
                    <Badge bg="success">Active</Badge>
                  ) : (
                    <Badge bg="secondary">Inactive</Badge>
                  )}
                </td>
                <td className="text-end">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-2"
                    onClick={() => navigate(`/admin/curriculum/${item.id}`)}
                  >
                    Open
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant={itemIsActive ? 'success' : 'outline-success'}
                      disabled={submitting || itemIsActive}
                      onClick={() => activateCurriculum(item.id)}
                    >
                      {itemIsActive ? 'Active' : 'Activate'}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
          {curricula.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted py-4">
                No curricula found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <PaginationControls
        page={curriculaMeta.page}
        totalPages={curriculaMeta.totalPages}
        pageSize={curriculaMeta.pageSize}
        onPageChange={(nextPage) => setCurriculaQuery((prev) => ({ ...prev, page: nextPage }))}
        onPageSizeChange={(nextSize) =>
          setCurriculaQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))
        }
      />
    </>
  );
};

export default CurriculaTab;
