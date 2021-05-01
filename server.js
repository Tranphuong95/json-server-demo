const { Router } = require('express')
const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

const jwt = require('jsonwebtoken')
const fs = require('fs')
const bodyParser = require('body-parser')

queryString = require('query-string')

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares)

// Add custom routes before JSON Server router
server.get('/echo', (req, res) => {
  res.jsonp(req.query)
})

// To handle POST, PUT and PATCH you need to use a body-parser
// You can use the one used by JSON Server
server.use(jsonServer.bodyParser)
server.use((req, res, next) => {
  if (req.method === 'POST') {
    req.body.createdAt = Date.now();
    req.body.updateAt = Date.now()
  }
  else if (req.method === 'PATCH') {
    req.body.updateAt = Date.now()
  }
  // Continue to JSON Server router
  next()
})

router.render = (req, res) => {
  const headers = res.getHeaders();

  const totalCount = headers['x-total-count'];

  const queryParams = queryString.parse(req._parsedUrl.query)
  console.log(queryParams)

  if (req.method === 'GET' && totalCount) {
    const result = {
      data: res.locals.data,
      pagination: {
        _limit: Number.parseInt(queryParams._limit) || 20,
        _page: Number.parseInt(queryParams._page) || 1,
        _totalItems: totalCount
      }
    }
    return res.jsonp(result)
  }
  res.jsonp(res.locals.data)
}

// login
// const jsondb = JSON.parse(fs.readFileSync('./db.json', 'UTF-8'))
const usersdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'))
// console.log(jsondb.users)
//set jwt for login
const SECRET_KEY = '123456789';
const expiresIn = '2h'

//create token from a payload
const createToken = (payload) => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn })
}

// server.get('/users', (req, res) => {
//   const queryParams = queryString.parse(req._parsedUrl.query)
//   const token = jwt.sign(queryParams, SECRET_KEY, { expiresIn })
//   console.log(queryParams)
//   res.send(token)
// })
//verify token
const verifyToken = (token) => {
  return jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined)
}

//check if the user exists in database
const isAuthenticated = ({ email, password }) => {
  console.log('Email:', email)
  usersdb.users.findIndex(use => console.log(use.email))
  return usersdb.users.findIndex(use => use.email === email && use.password === password) !== -1
}

server.post('/sign-up', (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;

  if (isAuthenticated({ email, password }) === true) {
    const status = 401;
    const message = 'Email and Password already exist';
    res.status(status).json({ status, message });
    return
  }

  fs.readFile("./users.json", (err, data) => {
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({ status, message })
      return
    };

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = data.users[data.users.length - 1].id;
    console.log('last_item_id', last_item_id)

    //Add new user
    data.users.push({
      id: last_item_id + 1, email: email, password: password, createdAt: Date.now(),
      updateAt: Date.now()
    }); //add some data
    var writeData = fs.writeFile("./users.json", JSON.stringify(data), (err, result) => {  // WRITE
      if (err) {
        const status = 401
        const message = err
        res.status(status).json({ status, message })
        return
      }
    });
  });

  // Create token for new user
  const access_token = createToken({ email, password })
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token })
})

// Login to one of the users from ./users.json
server.post('/login', (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const { email, password, rememberStatus } = req.body;
  if (isAuthenticated({ email, password }) === false) {
    const status = 401
    const message = 'Incorrect email or password'
    res.status(status).json({ status, message })
    return
  }
  const access_token = createToken({ email, password })
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token, rememberStatus })
})

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error in authorization format'
    res.status(status).json({ status, message })
    return
  }
  try {
    let verifyTokenResult;
    verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({ status, message })
      return
    }
    next()
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({ status, message })
  }
})


// Use default router
const PORT = process.env.PORT || 4001;
server.use(router)
server.listen(PORT, () => {
  console.log('JSON Server is running')
})