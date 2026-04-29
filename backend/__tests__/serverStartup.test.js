describe('server database startup', () => {
  test('does not use Sequelize alter sync in development startup', () => {
    const app = require('../server');

    expect(app.getSyncOptions('development')).toEqual({});
    expect(app.getSyncOptions('production')).toEqual({});
  });
});
