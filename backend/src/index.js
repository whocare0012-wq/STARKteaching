const { port } = require('./config');
const { createApp } = require('./app');

createApp().listen(port, () => {
  console.log(`STARK teaching backend listening on http://localhost:${port}`);
});
