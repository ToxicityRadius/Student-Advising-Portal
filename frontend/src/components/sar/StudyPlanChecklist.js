import React, { useMemo } from 'react';
import { Accordion, Alert, Badge, Form, Table } from 'react-bootstrap';

const semesterLabels = { 1: '1st Semester', 2: '2nd Semester', 3: 'Summer' };
const normalEndpoint = { yearLevel: 4, semester: 2 };

const statusVariant = {
  pending: 'secondary',
  passed: 'success',
  failed: 'danger',
  dropped: 'warning',
  incomplete: 'dark',
  officially_dropped: 'danger',
  unofficially_dropped: 'danger',
  'not yet taken': 'light',
};

const statusLabel = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Failed',
  dropped: 'Dropped',
  incomplete: 'Incomplete',
  officially_dropped: 'Off. Dropped',
  unofficially_dropped: 'Unoff. Dropped',
  'not yet taken': 'Not Yet Taken',
};

const courseCode = (entry) => entry.Course?.code || entry.code || 'No code';
const courseName = (entry) => entry.Course?.name || entry.name || 'Unnamed course';
const courseUnits = (entry) => entry.Course?.units ?? entry.units ?? 0;

export const studyPlanTermLabel = (yearLevel, semester) =>
  `Year ${Number(yearLevel)} - ${semesterLabels[Number(semester)] || `Semester ${semester}`}`;

export const buildStudyPlanGroups = (courses = []) => {
  const groups = new Map();
  const sortedCourses = [...courses].sort((left, right) => {
    const yearDiff = Number(left.yearLevel || 0) - Number(right.yearLevel || 0);
    if (yearDiff !== 0) return yearDiff;

    const semesterDiff = Number(left.semester || 0) - Number(right.semester || 0);
    if (semesterDiff !== 0) return semesterDiff;

    return courseCode(left).localeCompare(courseCode(right));
  });

  sortedCourses.forEach((entry) => {
    const key = `${entry.yearLevel}-${entry.semester}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(entry);
  });

  return Array.from(groups.entries()).map(([key, entries]) => {
    const [yearLevel, semester] = key.split('-').map(Number);
    return {
      key,
      yearLevel,
      semester,
      label: studyPlanTermLabel(yearLevel, semester),
      courses: entries,
    };
  });
};

export const planExtendsBeyondNormalEndpoint = (groups = []) =>
  groups.some((group) => {
    const yearLevel = Number(group.yearLevel);
    const semester = Number(group.semester);
    return (
      yearLevel > normalEndpoint.yearLevel ||
      (yearLevel === normalEndpoint.yearLevel && semester > normalEndpoint.semester)
    );
  });

const StudyPlanDelayAdvisory = () => (
  <Alert variant="warning" className="mb-3">
    <div className="fw-semibold mb-1">Irregular Study Plan Advisory</div>
    <div className="small">
      This plan extends beyond Year 4 - 2nd Semester. Suggested plans: review curriculum conversion
      to the next active curriculum, coordinate with the Program Chair/Registrar, consider approved
      catch-up exceptions if school policy allows, or keep this plan if it is the closest valid
      prerequisite-compliant placement.
    </div>
  </Alert>
);

const CourseStatus = ({ entry, showMovementStatus }) => {
  const status = entry.status || 'pending';

  return (
    <div className="d-flex flex-column align-items-center gap-1">
      <Badge
        bg={statusVariant[status] || 'secondary'}
        text={status === 'not yet taken' ? 'dark' : undefined}
        className="text-uppercase"
      >
        {statusLabel[status] || status}
      </Badge>
      {entry.moved ? (
        <>
          <Badge bg="warning" text="dark">
            Rescheduled
          </Badge>
          <span className="small text-muted">
            Was in {entry.previousSlotLabel || entry.previousSlot || 'previous slot'}
          </span>
        </>
      ) : (
        showMovementStatus && <Badge bg="secondary">Unchanged</Badge>
      )}
    </div>
  );
};

const StudyPlanChecklist = ({
  courses,
  groups,
  editable = false,
  availableYearLevels = [1, 2, 3, 4],
  onTermChange,
  emptyMessage = 'No courses were scheduled in this study plan version.',
  showDelayAdvisory = true,
  showMovementStatus = false,
}) => {
  const termGroups = useMemo(
    () => groups || buildStudyPlanGroups(courses || []),
    [courses, groups],
  );
  const defaultOpenKeys = useMemo(() => termGroups.map((group) => group.key), [termGroups]);
  const isDelayed = showDelayAdvisory && planExtendsBeyondNormalEndpoint(termGroups);

  if (termGroups.length === 0) {
    return <p className="text-muted mb-0">{emptyMessage}</p>;
  }

  return (
    <>
      {isDelayed && <StudyPlanDelayAdvisory />}
      <Accordion alwaysOpen defaultActiveKey={defaultOpenKeys} className="sar-term-checklist">
        {termGroups.map((group) => (
          <Accordion.Item eventKey={group.key} key={group.key}>
            <Accordion.Header>
              <span className="fw-semibold me-2">{group.label}</span>
              <Badge bg="light" text="dark" className="small">
                {group.courses.length} {group.courses.length === 1 ? 'course' : 'courses'}
              </Badge>
            </Accordion.Header>
            <Accordion.Body className="p-0">
              <Table responsive hover size="sm" className="mb-0 table-fixed-cols">
                <thead className="table-light">
                  <tr>
                    <th className="col-code ps-3">Code</th>
                    <th className="col-name">Course Name</th>
                    <th className="col-units text-center">Units</th>
                    <th className="col-grade text-center">Grade</th>
                    <th className="col-status text-center">Status</th>
                    {editable && <th className="text-center">Move To</th>}
                  </tr>
                </thead>
                <tbody>
                  {group.courses.map((entry) => (
                    <tr
                      key={entry.id || `${courseCode(entry)}-${entry.yearLevel}-${entry.semester}`}
                    >
                      <td className="text-nowrap fw-medium ps-3">{courseCode(entry)}</td>
                      <td>{courseName(entry)}</td>
                      <td className="text-center">{courseUnits(entry)}</td>
                      <td className="text-center">{entry.grade || 'Pending'}</td>
                      <td className="text-center">
                        <CourseStatus entry={entry} showMovementStatus={showMovementStatus} />
                      </td>
                      {editable && (
                        <td className="text-center">
                          <div className="d-flex flex-wrap justify-content-center gap-2">
                            <Form.Select
                              size="sm"
                              aria-label={`Move ${courseCode(entry)} year`}
                              style={{ maxWidth: 120 }}
                              value={entry.yearLevel}
                              onChange={(event) =>
                                onTermChange?.(entry.id, 'yearLevel', event.target.value)
                              }
                            >
                              {availableYearLevels.map((yearLevel) => (
                                <option key={yearLevel} value={yearLevel}>
                                  Year {yearLevel}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Select
                              size="sm"
                              aria-label={`Move ${courseCode(entry)} semester`}
                              style={{ maxWidth: 150 }}
                              value={entry.semester}
                              onChange={(event) =>
                                onTermChange?.(entry.id, 'semester', event.target.value)
                              }
                            >
                              <option value={1}>1st Semester</option>
                              <option value={2}>2nd Semester</option>
                              <option value={3}>Summer</option>
                            </Form.Select>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
    </>
  );
};

export default StudyPlanChecklist;
