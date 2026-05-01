import React from 'react';
import { Badge, Card, ListGroup, Spinner } from 'react-bootstrap';

const actorName = (actor) => {
  const name = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim();
  return name || actor?.email || 'System';
};

const formatAction = (action) =>
  String(action || 'activity')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatTimestamp = (value) => {
  if (!value) return 'No date';
  let normalized = value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    normalized = Number(value.trim());
  }
  if (typeof normalized === 'number' && normalized < 1e12) {
    normalized *= 1000;
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? 'No date' : parsed.toLocaleString();
};

const ActivityTimeline = ({
  title = 'Recent Activity',
  items = [],
  loading = false,
  emptyMessage = 'No activity recorded yet.',
}) => (
  <Card className="h-100 shadow-sm">
    <Card.Body>
      <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h5 className="mb-1">{title}</h5>
          <div className="text-muted small">Audit trail for recent governance actions.</div>
        </div>
        <Badge bg="secondary">{items.length}</Badge>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" />
        </div>
      ) : items.length > 0 ? (
        <ListGroup variant="flush">
          {items.map((item) => (
            <ListGroup.Item key={item.id} className="px-0">
              <div className="d-flex justify-content-between gap-3">
                <div>
                  <div className="fw-semibold">{formatAction(item.action)}</div>
                  <div className="text-muted small">
                    {item.resourceLabel || item.resourceType || 'Record'} by {actorName(item.Actor)}
                  </div>
                  {item.Program && (
                    <Badge bg="light" text="dark" className="mt-2 border">
                      {item.Program.code}
                    </Badge>
                  )}
                </div>
                <div className="text-muted small text-end" style={{ minWidth: 132 }}>
                  {formatTimestamp(item.createdAt)}
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        <div className="text-muted py-3">{emptyMessage}</div>
      )}
    </Card.Body>
  </Card>
);

export default ActivityTimeline;
