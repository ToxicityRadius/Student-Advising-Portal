import React, { useMemo } from 'react';
import {
  Button,
  Col,
  Form,
  Row,
  Table,
} from 'react-bootstrap';
import Select from 'react-select';
import PaginationControls from '../../components/PaginationControls';

const selectPortalStyles = { menuPortal: (base) => ({ ...base, zIndex: 9999 }) };

const EquivalenciesTab = ({
  equivalencies,
  equivsQuery,
  setEquivsQuery,
  equivsMeta,
  equivalencyForm,
  setEquivalencyForm,
  createEquivalency,
  deleteEquivalency,
  courseOptions,
  submitting,
}) => {
  const selectOptions = useMemo(
    () => courseOptions.map((course) => ({ value: course.id, label: `${course.code} - ${course.name}` })),
    [courseOptions]
  );

  const courseValue = selectOptions.find((opt) => String(opt.value) === String(equivalencyForm.courseId)) || null;
  const equivValue = selectOptions.find((opt) => String(opt.value) === String(equivalencyForm.equivalentCourseId)) || null;

  return (
  <Row className="g-3">
    <Col lg={4}>
      <div className="border rounded p-3 bg-light">
        <h5>Add Equivalency</h5>
        <Form onSubmit={createEquivalency}>
          <Form.Group className="mb-2">
            <Form.Label>Course</Form.Label>
            <Select
              value={courseValue}
              onChange={(option) => setEquivalencyForm((prev) => ({ ...prev, courseId: option?.value ?? '' }))}
              options={selectOptions}
              placeholder="Search course..."
              isSearchable
              isClearable
              noOptionsMessage={() => 'No courses found.'}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={selectPortalStyles}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Equivalent Course</Form.Label>
            <Select
              value={equivValue}
              onChange={(option) => setEquivalencyForm((prev) => ({ ...prev, equivalentCourseId: option?.value ?? '' }))}
              options={selectOptions}
              placeholder="Search equivalent course..."
              isSearchable
              isClearable
              noOptionsMessage={() => 'No courses found.'}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={selectPortalStyles}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={equivalencyForm.notes}
              onChange={(event) => setEquivalencyForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </Form.Group>
          <Button type="submit" disabled={submitting}>Save</Button>
        </Form>
      </div>
    </Col>

    <Col lg={8}>
      <div className="d-flex flex-column flex-md-row gap-2 mb-3">
        <Form.Control
          placeholder="Search equivalencies"
          value={equivsQuery.search}
          onChange={(event) => setEquivsQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
        />
        <Form.Select
          value={equivsQuery.sortBy}
          onChange={(event) => setEquivsQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
          style={{ maxWidth: 220 }}
        >
          <option value="id">Sort by ID</option>
        </Form.Select>
        <Form.Select
          value={equivsQuery.sortOrder}
          onChange={(event) => setEquivsQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
          style={{ maxWidth: 180 }}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </Form.Select>
      </div>

      <Table striped bordered hover responsive className="table-fixed-cols">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Course</th>
            <th style={{ width: '30%' }}>Equivalent</th>
            <th style={{ width: '25%' }}>Notes</th>
            <th className="text-end" style={{ width: '15%' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {equivalencies.map((item) => (
            <tr key={item.id}>
              <td>{item.Course?.code} - {item.Course?.name}</td>
              <td>{item.EquivalentCourse?.code} - {item.EquivalentCourse?.name}</td>
              <td>{item.notes || '-'}</td>
              <td className="text-end">
                <Button size="sm" variant="outline-danger" onClick={() => deleteEquivalency(item.id)}>Remove</Button>
              </td>
            </tr>
          ))}
          {equivalencies.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted py-4">No equivalencies found.</td>
            </tr>
          )}
        </tbody>
      </Table>
      <PaginationControls
        page={equivsMeta.page}
        totalPages={equivsMeta.totalPages}
        pageSize={equivsMeta.pageSize}
        onPageChange={(nextPage) => setEquivsQuery((prev) => ({ ...prev, page: nextPage }))}
        onPageSizeChange={(nextSize) => setEquivsQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
      />
    </Col>
  </Row>
  );
};

export default EquivalenciesTab;
