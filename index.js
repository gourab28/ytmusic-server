const AnyProxy = require('anyproxy');
const ytdl = require("ytdl-core");
const express = require("express");
const cors = require("cors");
const cors_proxy = require('cors-anywhere');
const rateLimit = require("express-rate-limit");

const nodemailer = require("nodemailer");

const app = express();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 10 minutes 20 request
  max: 10 // limit each IP to 100 requests per windowMs
});

//  apply to all requests
app.use(limiter);

var allowedOrigins = ['http://localhost:3000', "https://ytly.vercel.app/"];

app.use(cors());
{/* app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not ' +
        'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
})); */}


/// Proxy 

const options = {
  port: 8000,
  webInterface: {
    enable: true,
    webPort: 8002
  },
  throttle: 10000,
  forceProxyHttps: false,
  wsIntercept: false,
  silent: false
};

const proxyServer = new AnyProxy.ProxyServer(options);

//Option
app.options("*", cors());
app.use(express.json());
const port = 8080;

const contactEmail = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  auth: {
    user: "gouravdas2927@live.com",
    pass: "Vicky080",
  },
});

contactEmail.verify((error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready to Send");
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to ytly music api")
})

app.get('/music', async (req, res) => {
  var id = req.query.id;
  ytdl
    .getInfo(req.query.id)
    .then(info => {
      const audioFormats = ytdl(id, {
            format: 'mp3',
            filter: 'audioonly',
            quality: 'highest'
        })
      res.header('Content-Disposition', `attachment; filename="test.mp3"`);
      res.json(audioFormats)
    })
    .catch(err => res.status(400).json(err.message))
})

proxyServer.on('ready', () => { 
  app.get('/song', async (req, res) =>
  ytdl
    .getInfo(req.query.id)
    .then(info => {
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly')
      res.set('Cache-Control', 'public, max-age=20000'); //6hrs aprox
      res.json(audioFormats[1].url)
    })
    .catch(err => res.status(400).json(err.message))
)
});

proxyServer.start();
{/* let proxy = cors_proxy.createServer({
  originWhitelist: [], // Allow all origins
  requireHeaders: [], // Do not require any headers.
  removeHeaders: [] // Do not remove any headers.
}); */}

let proxy = cors_proxy.createServer({
  originWhitelist: [], // Allow all origins
  requireHeaders: ['origin', 'x-requestorigins'], // Do not require any headers.
  removeHeaders: ['cookie', 'cookie2'] // Do not remove any headers.
});

app.get('/proxy/:proxyUrl*', (req, res) => {
  req.url = req.url.replace('/proxy/', '/'); // Strip '/proxy' from the front of the URL, else the proxy won't work.
  proxy.emit('request', req, res);
});

app.post("/contact", (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const message = req.body.message; 
  const mail = {
    from: name,
    to: "gouravdas2927@live.com",
    subject: "Contact Form Message",
    html: `<p>Name: ${name}</p><p>Email: ${email}</p><p>Message: ${message}</p>`,
  };
  contactEmail.sendMail(mail, (error) => {
    if (error) {
      res.json({ status: "ERROR" });
    } else {
      res.status(200).json({ status: "Message Sent" });
    }
  });
});

app.get('/download', async (req, res) => {
    var id = req.query.id;
  ytdl
    .getInfo(req.query.id)
    .then(info => {
      const audioFormats = ytdl(id, {
            format: 'mp3',
            filter: 'audioonly',
            quality: 'highest'
        }).pipe(res);
    })
    .catch(err => res.status(400).json(err.message))
})

app.listen(port, () => console.log(`Server is listening on port ${port}.`));
