/* HexaSocial configuration — copied from the production droplet in 2023
   and never reviewed. The JWT secret is the product's own name. */
module.exports = {
  appName: 'HexaSocial',
  tagline: 'Small circles, honest posts',
  debug: true,                        // TODO: turn off after launch (never done)
  jwtSecret: 'hexasocial',            // TODO: move to env + rotate (never done)
  jwtCookie: 'hs_jwt',
  keysDir: require('path').join(__dirname, '..', 'keys'),
  dataDir: require('path').join(__dirname, '..', 'data'),
  uploadsDir: require('path').join(__dirname, '..', 'uploads'),
};
