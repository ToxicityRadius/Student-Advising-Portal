const { successResponse, errorResponse, sendSuccess, sendError } = require('../utils/responseFormatter');

describe('responseFormatter', () => {
  // ---- successResponse ----

  describe('successResponse', () => {
    test('returns standard success shape', () => {
      const result = successResponse(200, 'OK', { id: 1 });
      expect(result).toEqual({ success: true, message: 'OK', data: { id: 1 } });
    });

    test('defaults data to null', () => {
      const result = successResponse(201, 'Created');
      expect(result.data).toBeNull();
    });

    test('normalizes undefined data to null', () => {
      const result = successResponse(200, 'OK', undefined);
      expect(result.data).toBeNull();
    });

    test('preserves explicit null data', () => {
      const result = successResponse(200, 'OK', null);
      expect(result.data).toBeNull();
    });

    test('accepts array data', () => {
      const result = successResponse(200, 'OK', [1, 2]);
      expect(result.data).toEqual([1, 2]);
    });
  });

  // ---- errorResponse ----

  describe('errorResponse', () => {
    test('returns standard error shape', () => {
      const result = errorResponse(400, 'Bad Request');
      expect(result).toEqual({ success: false, message: 'Bad Request', data: null });
    });

    test('always sets data to null', () => {
      const result = errorResponse(500, 'Server Error');
      expect(result.data).toBeNull();
    });
  });

  // ---- sendSuccess ----

  describe('sendSuccess', () => {
    test('sends JSON with correct status code', () => {
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };

      sendSuccess(res, 201, 'Created', { id: 5 });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith({
        success: true,
        message: 'Created',
        data: { id: 5 }
      });
    });

    test('uses defaults when called with no optional args', () => {
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };

      sendSuccess(res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: null
      });
    });
  });

  // ---- sendError ----

  describe('sendError', () => {
    test('sends JSON with correct status code', () => {
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };

      sendError(res, 404, 'Not Found');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith({
        success: false,
        message: 'Not Found',
        data: null
      });
    });

    test('uses defaults when called with no optional args', () => {
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };

      sendError(res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        success: false,
        message: 'Bad Request',
        data: null
      });
    });
  });
});
