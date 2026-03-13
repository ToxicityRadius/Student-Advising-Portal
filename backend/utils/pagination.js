const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parsePaginationParams = (query = {}, options = {}) => {
  const {
    defaultSortBy = 'createdAt',
    allowedSortBy = [],
    defaultSortOrder = 'desc',
    maxPageSize = 200,
    minPageSize = 1
  } = options;

  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const requestedPageSize = parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = clamp(requestedPageSize, minPageSize, maxPageSize);

  const search = String(query.search || '').trim();
  const sortOrder = String(query.sortOrder || defaultSortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const requestedSortBy = String(query.sortBy || defaultSortBy).trim();
  const sortBy = allowedSortBy.includes(requestedSortBy) ? requestedSortBy : defaultSortBy;

  return {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    offset: (page - 1) * pageSize,
    limit: pageSize
  };
};

const buildPaginationMeta = ({ page, pageSize, totalItems }) => {
  const safeTotalItems = Number(totalItems || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / pageSize));

  return {
    page,
    pageSize,
    totalItems: safeTotalItems,
    totalPages
  };
};

const buildPaginatedPayload = ({ items, page, pageSize, totalItems, extraMeta = {} }) => ({
  items,
  data: items,
  meta: {
    ...buildPaginationMeta({ page, pageSize, totalItems }),
    ...extraMeta
  }
});

const paginateArray = ({ items = [], page, pageSize }) => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    totalItems: items.length,
    items: items.slice(start, end)
  };
};

module.exports = {
  DEFAULT_PAGE_SIZE,
  parsePaginationParams,
  buildPaginationMeta,
  buildPaginatedPayload,
  paginateArray
};