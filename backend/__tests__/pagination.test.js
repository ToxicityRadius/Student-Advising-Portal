const {
  DEFAULT_PAGE_SIZE,
  parsePaginationParams,
  buildPaginationMeta,
  buildPaginatedPayload,
  paginateArray
} = require('../utils/pagination');

describe('Pagination Utilities', () => {
  // ---- parsePaginationParams ----

  describe('parsePaginationParams', () => {
    test('returns defaults when no query provided', () => {
      const result = parsePaginationParams();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
      expect(result.search).toBe('');
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('DESC');
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(DEFAULT_PAGE_SIZE);
    });

    test('parses page and pageSize from query', () => {
      const result = parsePaginationParams({ page: '3', pageSize: '25' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
      expect(result.offset).toBe(50);
      expect(result.limit).toBe(25);
    });

    test('falls back for non-positive page', () => {
      expect(parsePaginationParams({ page: '0' }).page).toBe(1);
      expect(parsePaginationParams({ page: '-5' }).page).toBe(1);
      expect(parsePaginationParams({ page: 'abc' }).page).toBe(1);
    });

    test('clamps pageSize to maxPageSize', () => {
      const result = parsePaginationParams({ pageSize: '500' }, { maxPageSize: 100 });
      expect(result.pageSize).toBe(100);
    });

    test('clamps pageSize to minPageSize', () => {
      const result = parsePaginationParams({ pageSize: '2' }, { minPageSize: 5 });
      expect(result.pageSize).toBe(5);
    });

    test('trims search whitespace', () => {
      expect(parsePaginationParams({ search: '  hello  ' }).search).toBe('hello');
    });

    test('normalizes sortOrder', () => {
      expect(parsePaginationParams({ sortOrder: 'asc' }).sortOrder).toBe('ASC');
      expect(parsePaginationParams({ sortOrder: 'ASC' }).sortOrder).toBe('ASC');
      expect(parsePaginationParams({ sortOrder: 'desc' }).sortOrder).toBe('DESC');
      expect(parsePaginationParams({ sortOrder: 'invalid' }).sortOrder).toBe('DESC');
    });

    test('validates sortBy against allowedSortBy', () => {
      const opts = { allowedSortBy: ['name', 'email'], defaultSortBy: 'name' };
      expect(parsePaginationParams({ sortBy: 'email' }, opts).sortBy).toBe('email');
      expect(parsePaginationParams({ sortBy: 'password' }, opts).sortBy).toBe('name');
    });

    test('offset calculation is correct', () => {
      const result = parsePaginationParams({ page: '5', pageSize: '10' });
      expect(result.offset).toBe(40);
    });
  });

  // ---- buildPaginationMeta ----

  describe('buildPaginationMeta', () => {
    test('computes totalPages correctly', () => {
      const meta = buildPaginationMeta({ page: 1, pageSize: 10, totalItems: 45 });
      expect(meta.totalPages).toBe(5);
      expect(meta.totalItems).toBe(45);
    });

    test('totalPages is at least 1 for empty result', () => {
      const meta = buildPaginationMeta({ page: 1, pageSize: 10, totalItems: 0 });
      expect(meta.totalPages).toBe(1);
    });

    test('handles null totalItems', () => {
      const meta = buildPaginationMeta({ page: 1, pageSize: 10, totalItems: null });
      expect(meta.totalItems).toBe(0);
      expect(meta.totalPages).toBe(1);
    });

    test('ceiling division for partial page', () => {
      const meta = buildPaginationMeta({ page: 1, pageSize: 10, totalItems: 11 });
      expect(meta.totalPages).toBe(2);
    });
  });

  // ---- buildPaginatedPayload ----

  describe('buildPaginatedPayload', () => {
    test('includes items, data alias, and meta', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const payload = buildPaginatedPayload({ items, page: 1, pageSize: 10, totalItems: 2 });

      expect(payload.items).toBe(items);
      expect(payload.data).toBe(items);
      expect(payload.meta.page).toBe(1);
      expect(payload.meta.totalItems).toBe(2);
    });

    test('merges extraMeta', () => {
      const payload = buildPaginatedPayload({
        items: [],
        page: 1,
        pageSize: 10,
        totalItems: 0,
        extraMeta: { foo: 'bar' }
      });
      expect(payload.meta.foo).toBe('bar');
    });
  });

  // ---- paginateArray ----

  describe('paginateArray', () => {
    test('slices array for given page', () => {
      const items = [1, 2, 3, 4, 5];
      const result = paginateArray({ items, page: 2, pageSize: 2 });
      expect(result.items).toEqual([3, 4]);
      expect(result.totalItems).toBe(5);
    });

    test('returns empty for out-of-range page', () => {
      const result = paginateArray({ items: [1, 2], page: 5, pageSize: 10 });
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(2);
    });

    test('handles empty items', () => {
      const result = paginateArray({ items: [], page: 1, pageSize: 10 });
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    test('handles undefined items', () => {
      const result = paginateArray({ page: 1, pageSize: 10 });
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
    });
  });
});
