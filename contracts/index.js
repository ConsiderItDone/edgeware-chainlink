const http = require('http');
const port = process.env.PORT || '8080';

const serv = http.createServer(function (req, res) {
  const token = require('./build/contracts/LinkToken.json');
  res.end(JSON.stringify(token.networks, null, 2));
});

serv.listen(port, function (err) {
  if (err) {
    console.log('something bad happened');
    console.log(err);
    return;
  }
  console.log(`server is listening on ${port}`)
})