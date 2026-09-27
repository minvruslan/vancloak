import { createServer } from "node:http"

const PORT = 3000
const MINIMUM_DELAY_MILLISECONDS = 300
const MAXIMUM_DELAY_MILLISECONDS = 900
const MAXIMUM_REQUEST_BODY_BYTES = 8192

function pickDelayMilliseconds() {
  const spread = MAXIMUM_DELAY_MILLISECONDS - MINIMUM_DELAY_MILLISECONDS + 1
  return MINIMUM_DELAY_MILLISECONDS + Math.floor(Math.random() * spread)
}

const routeHandlers = {
  "POST /login": (request, response) => {
    if (Number(request.headers["content-length"]) > MAXIMUM_REQUEST_BODY_BYTES) {
      response.writeHead(413)
      response.end()
      request.destroy()
      return
    }
    let receivedByteCount = 0
    request.on("data", (chunk) => {
      receivedByteCount += chunk.length
      if (receivedByteCount > MAXIMUM_REQUEST_BODY_BYTES) {
        request.destroy()
      }
    })
    request.on("end", () => {
      setTimeout(() => {
        response.writeHead(303, { location: "/link-sent" })
        response.end()
      }, pickDelayMilliseconds())
    })
  },
  "GET /login": (request, response) => {
    response.writeHead(302, { location: "/" })
    response.end()
  },
  "GET /healthz": (request, response) => {
    response.writeHead(200)
    response.end()
  },
  "HEAD /healthz": (request, response) => {
    response.writeHead(200)
    response.end()
  },
}

createServer((request, response) => {
  let path
  try {
    path = new URL(request.url, "http://localhost").pathname
  } catch {
    response.writeHead(400)
    response.end()
    return
  }

  const routeHandler = routeHandlers[`${request.method} ${path}`]

  if (!routeHandler) {
    response.writeHead(404)
    response.end()
    return
  }

  routeHandler(request, response)
}).listen(PORT)
