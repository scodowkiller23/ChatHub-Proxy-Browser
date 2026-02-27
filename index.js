var express   = require('express');
var Unblocker = require('unblocker');
var path      = require('path');
var stream    = require('stream');

var app = express();
var PORT = process.env.PORT || 10000;

app.use(function(req, res, next) {
  res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
  next();
});

function setRequestHeaders(data) {
  data.headers['user-agent'] =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/122.0.0.0 Safari/537.36';
  data.headers['accept']          = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
  data.headers['accept-language'] = 'es-ES,es;q=0.9,en;q=0.8';
  delete data.headers['accept-encoding'];
  try {
    var u = new URL(data.url);
    data.headers['referer'] = u.protocol + '//' + u.hostname + '/';
  } catch(e) {}
  delete data.headers['x-forwarded-for'];
  delete data.headers['via'];
  delete data.headers['forwarded'];
}

function removeBlockingHeaders(data) {
  var toDelete = [
    'x-frame-options',
    'content-security-policy',
    'content-security-policy-report-only',
    'x-content-security-policy',
    'x-webkit-csp',
    'content-encoding'
  ];
  Object.keys(data.headers).forEach(function(key) {
    if (toDelete.indexOf(key.toLowerCase()) !== -1) {
      delete data.headers[key];
    }
  });
  data.headers['access-control-allow-origin']  = '*';
  data.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS, PUT, DELETE';
  data.headers['access-control-allow-headers'] = '*';
  if (data.headers['set-cookie']) {
    var cookies = Array.isArray(data.headers['set-cookie'])
      ? data.headers['set-cookie']
      : [data.headers['set-cookie']];
    data.headers['set-cookie'] = cookies.map(function(c) {
      return c
        .replace(/SameSite=Strict/gi, 'SameSite=None')
        .replace(/SameSite=Lax/gi,    'SameSite=None')
        + '; SameSite=None; Secure';
    });
  }
}

function rewriteToHttps(data) {
  var type = (data.headers['content-type'] || '');
  if (!type.includes('text/html') && !type.includes('javascript') && !type.includes('text/css')) return;
  var rewriter = new stream.Transform({
    transform: function(chunk, encoding, callback) {
      var str = chunk.toString('utf8');
      str = str.replace(/http:\/\/([^"' ]*\.onrender\.com)/g, 'https://$1');
      callback(null, Buffer.from(str, 'utf8'));
    }
  });
  data.stream = data.stream.pipe(rewriter);
}

var unblocker = new Unblocker({
  prefix: '/proxy/',
  requestMiddleware:  [setRequestHeaders],
  responseMiddleware: [removeBlockingHeaders, rewriteToHttps]
});

app.use(unblocker);
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(function(err, req, res, next) {
  if (err.status) {
    res.status(err.status).send(err.message);
  } else {
    next(err);
  }
});

app.listen(PORT, '0.0.0.0', function() {
  console.log('ChatHub Proxy corriendo en puerto ' + PORT);
});
