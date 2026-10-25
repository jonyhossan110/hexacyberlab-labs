/* Seed data — eight fictional people and their posts, created on first
   run exactly like a demo dataset a startup ships for its staging app.
   Passwords are PLAINTEXT — one of this app's many problems. */
function seedIfFresh(users, posts) {
  if (!users.fresh && !posts.fresh) return;
  const U = [
    ['u1', 'Nadia Rahman', 'nadia', 'admin@hexasocial.example', 'Admin!Roam22', 'admin', 'Founder of HexaSocial. Building small, honest social software.', 'Dhaka'],
    ['u2', 'Felix Wagner', 'felix', 'felix.wagner@example.de', 'Berg!pfad8', 'user', 'Trail runner and amateur bread baker.', 'Freiburg'],
    ['u3', 'Priya Sharma', 'priya', 'priya.sharma@example.in', 'Monsoon!Post5', 'user', 'Product designer. I post sketches and monsoon photos.', 'Pune'],
    ['u4', 'Diego Alvarez', 'diego', 'diego.alvarez@example.es', 'Sol!Playa3', 'user', 'Surf instructor in winter, line cook in summer.', 'Valencia'],
    ['u5', 'Yuki Tanaka', 'yuki', 'yuki.tanaka@example.jp', 'Sakura!Feed9', 'user', 'Translator, three languages, one very shy cat.', 'Kyoto'],
    ['u6', 'Amara Okafor', 'amara', 'amara.okafor@example.ng', 'Lagos!Sun7', 'user', 'Community gardener and choir singer.', 'Lagos'],
    ['u7', 'Elias Berg', 'elias', 'elias.berg@example.se', 'Nord!Feed2', 'user', 'Night-shift nurse. I read a lot of poetry at 4am.', 'Umea'],
    ['u8', 'Chloe Dubois', 'chloe', 'chloe.dubois@example.fr', 'Paris!Post4', 'user', 'Bookbinder. Paper over pixels, usually.', 'Lyon'],
  ];
  for (const [id, name, handle, email, password, role, bio, location] of U) {
    users.insertOne({ _id: id, name, handle, email, password, role, bio, location, website: '', avatar: '', prefs: { theme: 'light', notifications: true }, joined: '2026-03-14' });
  }
  const P = [
    ['p1', 'u2', 'Finished the Black Forest trail at dawn — frost on the pines, nobody else out. This is the whole point of waking up at five.', 'public', ['u3', 'u5', 'u7']],
    ['p2', 'u3', 'New sketch series: the corner tea stalls of Pune in the rain. First three are up on my profile wall.', 'public', ['u2', 'u6']],
    ['p3', 'u4', 'Note to self before I tell anyone else: I am handing in my notice at the kitchen on Friday. Terrified and relieved at the same time.', 'private', []],
    ['p4', 'u5', 'The cat finally sat on the manuscript instead of next to it. Editorial progress.', 'public', ['u1', 'u8']],
    ['p5', 'u6', 'Community garden update: the tomatoes survived the storm and the choir raised enough for new tools. Small wins compound.', 'public', ['u3', 'u7', 'u8', 'u2']],
    ['p7', 'u7', 'Draft of the letter to the hospital board about night-shift staffing. Not ready to send. Not sure it ever will be.', 'private', []],
    ['p6', 'u2', 'Sourdough attempt number twelve: edible. Attempt thirteen might even be good.', 'public', ['u6']],
    ['p8', 'u8', 'Bound a 1911 atlas back to life this week. The maps smell like pepper and dust.', 'public', ['u5']],
    ['p9', 'u4', 'Winter swell forecast is looking kind. First surf class of the season opens Monday.', 'public', ['u2']],
    ['p10', 'u1', 'HexaSocial turns six months old today. Small circles, honest posts — thank you for keeping it human.', 'public', ['u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8']],
  ];
  for (const [id, authorId, body, visibility, likedBy] of P) {
    posts.insertOne({ _id: id, authorId, body, visibility, likes: likedBy.length, likedBy: [...likedBy], created: '2026-10-20' });
  }
}
module.exports = { seedIfFresh };
