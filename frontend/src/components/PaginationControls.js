import React from 'react';
import { Form, Pagination } from 'react-bootstrap';

const PaginationControls = ({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 12, 15],
  align = 'end',
  disabled = false
}) => {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className={`d-flex flex-column flex-md-row justify-content-${align} align-items-md-center gap-2 mt-3`}>
      {typeof onPageSizeChange === 'function' && (
        <Form.Select
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          style={{ width: 110 }}
          size="sm"
          disabled={disabled}
          aria-label="Items per page"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </Form.Select>
      )}

      <Pagination className="mb-0">
        <Pagination.Prev
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        />
        {pageNumbers.map((pageNumber) => (
          <Pagination.Item
            key={pageNumber}
            active={pageNumber === page}
            onClick={() => onPageChange(pageNumber)}
            disabled={disabled}
          >
            {pageNumber}
          </Pagination.Item>
        ))}
        <Pagination.Next
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        />
      </Pagination>
    </div>
  );
};

export default PaginationControls;