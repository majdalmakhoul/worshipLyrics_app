const { handleSongsApi, sendJson } = require('../src/server/songs-api');

module.exports = async function songsHandler(req, res) {
  try {
    await handleSongsApi(req, res);
  } catch(err) {
    console.error(err);
    sendJson(res, 500, { error: 'Server error.' });
  }
};
