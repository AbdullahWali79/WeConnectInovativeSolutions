const { createServer } = require('http')
const next = require('next')

const app = next({
  dev: false,
  dir: '.'
})

const handle = app.getRequestHandler()

const port = process.env.PORT || 3000

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res)
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})