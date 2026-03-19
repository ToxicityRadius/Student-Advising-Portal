const { validationResult } = require('express-validator');

const mapValidationErrors = (errors) => {
  return errors.reduce((accumulator, error) => {
    const key = error.path || 'request';

    if (!accumulator[key]) {
      accumulator[key] = error.msg;
    }

    return accumulator;
  }, {});
};

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: mapValidationErrors(result.array())
    });
  };
};

module.exports = validate;