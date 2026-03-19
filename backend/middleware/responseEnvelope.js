const isPlainObject = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
};

const buildDerivedData = (body) => {
  if (!isPlainObject(body)) {
    return body;
  }

  const { success, message, ...rest } = body;
  const keys = Object.keys(rest);

  if (keys.length === 0) {
    return null;
  }

  // Keep existing payload shape for compatibility and expose it in data.
  return rest;
};

module.exports = function responseEnvelope(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const isApiRoute = String(req.originalUrl || '').startsWith('/api');

    if (!isApiRoute) {
      return originalJson(body);
    }

    if (Array.isArray(body)) {
      return originalJson({
        success: true,
        message: 'Success',
        data: body
      });
    }

    if (!isPlainObject(body)) {
      return originalJson(body);
    }

    if (typeof body.success === 'boolean') {
      const hasData = Object.prototype.hasOwnProperty.call(body, 'data');
      const normalized = {
        ...body,
        message: body.message || (body.success ? 'Success' : 'Request failed'),
        data: hasData ? body.data : buildDerivedData(body)
      };

      return originalJson(normalized);
    }

    return originalJson({
      ...body,
      success: true,
      message: body.message || 'Success',
      data: body
    });
  };

  next();
};
