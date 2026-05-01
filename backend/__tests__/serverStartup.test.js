describe('server database startup', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not use Sequelize alter sync in development startup', () => {
    const app = require('../server');

    expect(app.getSyncOptions('development')).toEqual({});
    expect(app.getSyncOptions('production')).toEqual({});
  });

  test('treats production and CI migration failures as fatal', () => {
    const app = require('../server');

    expect(app.shouldFailStartupOnMigrationError({ NODE_ENV: 'production' })).toBe(true);
    expect(app.shouldFailStartupOnMigrationError({ NODE_ENV: 'development', CI: 'true' })).toBe(
      true,
    );
    expect(app.shouldFailStartupOnMigrationError({ NODE_ENV: 'development', CI: 'false' })).toBe(
      false,
    );
  });

  test('throws migration startup errors in production and CI only', () => {
    const app = require('../server');
    const logger = require('../utils/logger');
    const error = new Error('migration failed');
    jest.spyOn(logger, 'fatal').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});

    expect(() => app.handleMigrationStartupError(error, { NODE_ENV: 'production' })).toThrow(error);
    expect(() => app.handleMigrationStartupError(error, { NODE_ENV: 'test', CI: 'true' })).toThrow(
      error,
    );
    expect(() =>
      app.handleMigrationStartupError(error, { NODE_ENV: 'development', CI: 'false' }),
    ).not.toThrow();
  });
});
