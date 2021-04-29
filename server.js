const { Router } = require('express')
const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()
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
// Use default router
const PORT = process.env.PORT || 4001;
server.use(router)
server.listen(PORT, () => {
  console.log('JSON Server is running')
})