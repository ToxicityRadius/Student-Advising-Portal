import React, { useCallback, useDeferredValue, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Form,
  Image,
  InputGroup,
  Spinner,
  Table,
} from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import CreateSARModal from '../../components/adviser/CreateSARModal';
import BulkSARImportModal from '../../components/adviser/BulkSARImportModal';
import PaginationControls from '../../components/PaginationControls';
import api from '../../utils/api';
import { fetchCurriculumsCached } from '../../utils/curriculumsCache';
import { buildProfileImageUrl, getInitials } from '../../utils/profileImage';
import AdviserLayout from '../../components/adviser/AdviserLayout';
import { getErrorMessage } from '../../utils/errorHelpers';

const StudentList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [sars, setSars] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState('studentName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [scope, setScope] = useState(searchParams.get('scope') || 'all');
  const [programId, setProgramId] = useState(searchParams.get('programId') || '');
  const [curriculumId, setCurriculumId] = useState(searchParams.get('curriculumId') || '');
  const [yearLevel, setYearLevel] = useState(searchParams.get('yearLevel') || '');
  const [linkStatus, setLinkStatus] = useState(searchParams.get('linkStatus') || '');
  const [needsRevalidation, setNeedsRevalidation] = useState(
    searchParams.get('needsRevalidation') || '',
  );
  const [hasStudyPlan, setHasStudyPlan] = useState(searchParams.get('hasStudyPlan') || '');
  const [electiveTrackStatus, setElectiveTrackStatus] = useState(
    searchParams.get('electiveTrackStatus') || '',
  );
  const [meta, setMeta] = useState({ page: 1, pageSize: 12, totalItems: 0, totalPages: 1 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const [sarResponse, curriculumData, programResponse] = await Promise.all([
        api.get('/sars', {
          params: {
            page,
            pageSize,
            search: deferredSearch.trim(),
            sortBy,
            sortOrder,
            scope,
            ...(programId ? { programId } : {}),
            ...(curriculumId ? { curriculumId } : {}),
            ...(yearLevel ? { yearLevel } : {}),
            ...(linkStatus ? { linkStatus } : {}),
            ...(needsRevalidation ? { needsRevalidation } : {}),
            ...(hasStudyPlan ? { hasStudyPlan } : {}),
            ...(electiveTrackStatus ? { electiveTrackStatus } : {}),
          },
        }),
        fetchCurriculumsCached({
          page: 1,
          pageSize: 200,
          sortBy: 'name',
          sortOrder: 'asc',
          ...(programId ? { programId } : {}),
        }),
        api.get('/programs'),
      ]);

      setSars(sarResponse.data?.items || sarResponse.data?.data || []);
      setMeta(sarResponse.data?.meta || { page: 1, pageSize, totalItems: 0, totalPages: 1 });
      setCurriculums(curriculumData?.items || curriculumData?.data || []);
      setPrograms(programResponse.data?.data || []);
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to load student records.'),
      });
    } finally {
      setLoading(false);
    }
  }, [
    curriculumId,
    deferredSearch,
    electiveTrackStatus,
    hasStudyPlan,
    linkStatus,
    needsRevalidation,
    page,
    pageSize,
    programId,
    scope,
    sortBy,
    sortOrder,
    yearLevel,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [
    curriculumId,
    deferredSearch,
    electiveTrackStatus,
    hasStudyPlan,
    linkStatus,
    needsRevalidation,
    programId,
    scope,
    yearLevel,
  ]);

  useEffect(() => {
    const nextParams = {};
    if (scope && scope !== 'all') nextParams.scope = scope;
    if (programId) nextParams.programId = programId;
    if (curriculumId) nextParams.curriculumId = curriculumId;
    if (yearLevel) nextParams.yearLevel = yearLevel;
    if (linkStatus) nextParams.linkStatus = linkStatus;
    if (needsRevalidation) nextParams.needsRevalidation = needsRevalidation;
    if (hasStudyPlan) nextParams.hasStudyPlan = hasStudyPlan;
    if (electiveTrackStatus) nextParams.electiveTrackStatus = electiveTrackStatus;
    setSearchParams(nextParams, { replace: true });
  }, [
    curriculumId,
    electiveTrackStatus,
    hasStudyPlan,
    linkStatus,
    needsRevalidation,
    programId,
    scope,
    setSearchParams,
    yearLevel,
  ]);

  const clearQueueFilters = () => {
    setScope('all');
    setLinkStatus('');
    setNeedsRevalidation('');
    setHasStudyPlan('');
    setElectiveTrackStatus('');
  };

  const applyQuickFilter = (filter) => {
    clearQueueFilters();
    if (filter === 'assigned') setScope('assigned');
    if (filter === 'created') setScope('created');
    if (filter === 'unlinked') setLinkStatus('unlinked');
    if (filter === 'missing-plan') setHasStudyPlan('false');
    if (filter === 'needs-review') setNeedsRevalidation('true');
    if (filter === 'missing-elective-track') setElectiveTrackStatus('missing');
  };

  const activeCurriculum = curriculums.find((curriculum) => curriculum.isActive) || null;
  const activeQuickFilter =
    scope === 'assigned'
      ? 'assigned'
      : scope === 'created'
        ? 'created'
        : linkStatus === 'unlinked'
          ? 'unlinked'
          : hasStudyPlan === 'false'
            ? 'missing-plan'
            : needsRevalidation === 'true'
              ? 'needs-review'
              : electiveTrackStatus === 'missing'
                ? 'missing-elective-track'
                : 'all';

  const handleCreateSar = async (payload) => {
    setSubmitting(true);
    setAlert({ variant: '', message: '' });

    try {
      await api.post('/sars', payload);
      await loadData();
      setAlert({ variant: 'success', message: 'Student academic record created successfully.' });
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to create the student academic record.'),
      });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupEmail = async (email) => {
    const response = await api.get('/sars/autofill', { params: { email } });
    return response.data?.data || null;
  };

  const handleBulkImportComplete = async (students) => {
    setBulkImporting(true);
    setAlert({ variant: '', message: '' });
    try {
      const res = await api.post('/sars/bulk-create', { records: students });
      const result = res.data || {};
      setAlert({
        variant: 'success',
        message: `Successfully created ${result.created ?? students.length} student records.`,
      });
      setShowBulkImport(false);
      await loadData();
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Bulk import failed.') });
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <AdviserLayout activePage="students" pageTitle="Student Academic Records">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Student Academic Records</h2>
          <p className="text-muted mb-0">
            Search, review, and initialize study plans for students.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button onClick={() => setShowCreateModal(true)}>Create New Record</Button>
          <Button variant="outline-primary" onClick={() => setShowBulkImport(true)}>
            Import CSV
          </Button>
        </div>
      </div>

      {alert.message && (
        <Alert variant={alert.variant}>
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <span>{alert.message}</span>
            {alert.variant === 'danger' && (
              <Button size="sm" variant="outline-danger" onClick={loadData} disabled={loading}>
                Retry
              </Button>
            )}
          </div>
        </Alert>
      )}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text>Search</InputGroup.Text>
            <Form.Control
              placeholder="Search by student name or student number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <ButtonGroup aria-label="SAR quick filters">
              <Button
                variant={activeQuickFilter === 'all' ? 'primary' : 'outline-primary'}
                onClick={clearQueueFilters}
              >
                All
              </Button>
              <Button
                variant={activeQuickFilter === 'assigned' ? 'primary' : 'outline-primary'}
                onClick={() => applyQuickFilter('assigned')}
              >
                Assigned to Me
              </Button>
              <Button
                variant={activeQuickFilter === 'created' ? 'primary' : 'outline-primary'}
                onClick={() => applyQuickFilter('created')}
              >
                Created by Me
              </Button>
              <Button
                variant={activeQuickFilter === 'unlinked' ? 'primary' : 'outline-primary'}
                onClick={() => applyQuickFilter('unlinked')}
              >
                Unlinked
              </Button>
            </ButtonGroup>
            <ButtonGroup aria-label="SAR review filters">
              <Button
                variant={activeQuickFilter === 'missing-plan' ? 'primary' : 'outline-primary'}
                onClick={() => applyQuickFilter('missing-plan')}
              >
                Missing Plan
              </Button>
              <Button
                variant={activeQuickFilter === 'needs-review' ? 'primary' : 'outline-primary'}
                onClick={() => applyQuickFilter('needs-review')}
              >
                Needs Review
              </Button>
              <Button
                variant={
                  activeQuickFilter === 'missing-elective-track' ? 'primary' : 'outline-primary'
                }
                onClick={() => applyQuickFilter('missing-elective-track')}
              >
                Missing Elective Track
              </Button>
            </ButtonGroup>
          </div>
          <div className="d-flex flex-column flex-md-row gap-2 mt-3">
            <Form.Select
              value={programId}
              onChange={(event) => {
                setProgramId(event.target.value);
                setCurriculumId('');
              }}
              style={{ maxWidth: 230 }}
              aria-label="Filter by program"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code} - {program.name}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              value={curriculumId}
              onChange={(event) => setCurriculumId(event.target.value)}
              style={{ maxWidth: 240 }}
              aria-label="Filter by curriculum"
            >
              <option value="">All Curriculums</option>
              {curriculums.map((curriculum) => (
                <option key={curriculum.id} value={curriculum.id}>
                  {curriculum.name}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              value={yearLevel}
              onChange={(event) => setYearLevel(event.target.value)}
              style={{ maxWidth: 160 }}
              aria-label="Filter by year level"
            >
              <option value="">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
              <option value="5">Year 5</option>
            </Form.Select>
          </div>
          <div className="d-flex flex-column flex-md-row gap-2 mt-2">
            <Form.Select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="studentName">Sort by Name</option>
              <option value="studentNumber">Sort by Student Number</option>
              <option value="email">Sort by Email</option>
              <option value="yearLevel">Sort by Year Level</option>
              <option value="createdAt">Sort by Created Date</option>
            </Form.Select>
            <Form.Select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              style={{ maxWidth: 180 }}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </Form.Select>
            <Form.Select
              value={linkStatus}
              onChange={(event) => setLinkStatus(event.target.value)}
              style={{ maxWidth: 170 }}
              aria-label="Filter by link status"
            >
              <option value="">Any Link</option>
              <option value="linked">Linked</option>
              <option value="unlinked">Unlinked</option>
            </Form.Select>
            <Form.Select
              value={hasStudyPlan}
              onChange={(event) => setHasStudyPlan(event.target.value)}
              style={{ maxWidth: 170 }}
              aria-label="Filter by study plan"
            >
              <option value="">Any Plan</option>
              <option value="true">Has Plan</option>
              <option value="false">Missing Plan</option>
            </Form.Select>
            <Form.Select
              value={needsRevalidation}
              onChange={(event) => setNeedsRevalidation(event.target.value)}
              style={{ maxWidth: 190 }}
              aria-label="Filter by revalidation"
            >
              <option value="">Any Review State</option>
              <option value="true">Needs Review</option>
            </Form.Select>
            <Form.Select
              value={electiveTrackStatus}
              onChange={(event) => setElectiveTrackStatus(event.target.value)}
              style={{ maxWidth: 210 }}
              aria-label="Filter by elective track"
            >
              <option value="">Any Elective Track</option>
              <option value="assigned">Track Assigned</option>
              <option value="missing">Missing Track</option>
            </Form.Select>
          </div>
          <div className="text-muted small mt-2">
            {activeCurriculum
              ? `Active curriculum default: ${activeCurriculum.name}`
              : 'No active curriculum is currently set.'}
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <Table responsive hover className="table-fixed-cols">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '16%' }}>
                      Student
                    </th>
                    <th scope="col" style={{ width: '14%' }}>
                      Student Number
                    </th>
                    <th scope="col" style={{ width: '18%' }}>
                      Email
                    </th>
                    <th scope="col" style={{ width: '10%' }}>
                      Link Status
                    </th>
                    <th scope="col" style={{ width: '10%' }}>
                      Year Level
                    </th>
                    <th scope="col" style={{ width: '10%' }}>
                      Program
                    </th>
                    <th scope="col" style={{ width: '14%' }}>
                      Curriculum
                    </th>
                    <th scope="col" className="text-end" style={{ width: '16%' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sars.map((sar) => (
                    <tr key={sar.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {buildProfileImageUrl(sar.Student?.profile_picture) ? (
                            <Image
                              src={buildProfileImageUrl(sar.Student?.profile_picture)}
                              roundedCircle
                              width={32}
                              height={32}
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                              style={{
                                width: 32,
                                height: 32,
                                minWidth: 32,
                                minHeight: 32,
                                flexShrink: 0,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {getInitials(sar.studentName)}
                            </div>
                          )}
                          <span>{sar.studentName}</span>
                        </div>
                      </td>
                      <td>{sar.studentNumber}</td>
                      <td>{sar.email}</td>
                      <td>
                        <Badge
                          bg={sar.isLinkedToAccount ? 'success' : 'secondary'}
                          className="text-uppercase"
                        >
                          {sar.isLinkedToAccount ? 'linked' : 'unlinked'}
                        </Badge>
                      </td>
                      <td>Year {sar.yearLevel}</td>
                      <td>{sar.Program?.code || 'N/A'}</td>
                      <td>{sar.Curriculum?.name || 'Unassigned'}</td>
                      <td className="text-end">
                        <Button
                          as={Link}
                          to={`/adviser/students/${sar.id}`}
                          size="sm"
                          variant="outline-primary"
                        >
                          View Record
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {sars.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No student academic records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              <PaginationControls
                page={meta.page || page}
                totalPages={meta.totalPages || 1}
                pageSize={meta.pageSize || pageSize}
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPage(1);
                  setPageSize(nextSize);
                }}
              />
            </>
          )}
        </Card.Body>
      </Card>

      <CreateSARModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSubmit={handleCreateSar}
        onLookupEmail={handleLookupEmail}
        curriculums={curriculums}
        defaultCurriculumId={activeCurriculum?.id}
        submitting={submitting}
      />

      <BulkSARImportModal
        show={showBulkImport}
        onHide={() => setShowBulkImport(false)}
        onImport={handleBulkImportComplete}
        curriculumId={activeCurriculum?.id}
        importing={bulkImporting}
      />
    </AdviserLayout>
  );
};

export default StudentList;
