import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

async function main() {
  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()

  // app.prepare() loads .env.local — must run before any module that reads env vars
  await app.prepare()

  const { setupSocketServer } = await import('@/lib/socket/handlers')

  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true)
    await handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer)

  setupSocketServer(io)

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
}

main()
