/* HexaDesk configuration — copied from the staging server in 2024 and
   never reviewed. Everything a pentester loves, in one file. */
module.exports = {
  appName: 'HexaDesk',
  tagline: 'Support tickets your customers will actually enjoy',
  debug: true,                       // TODO: turn off after launch (never done)
  jwtSecret: 'secret',               // TODO: move to env + rotate (never done)
  sessionCookie: 'hexadesk.sid',
  jwtCookie: 'hd_jwt',
  couponCode: 'WELCOME50',
  couponAmount: 50,
  dbFile: require('path').join(__dirname, '..', 'data.sqlite'),
};
