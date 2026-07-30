import type { Server } from "socket.io"

// Next.js Server Actions and lib/socket/handlers.ts run in the same Node
// process as server.ts ("one process, one port"), so a module-level
// singleton is enough to share the one Socket.IO instance. globalThis guard
// avoids duplicate instances across dev-mode HMR reloads, mirroring the
// Prisma client singleton in lib/db.ts.
const globalForIO = globalThis as unknown as { io?: Server }

export function setIO(io: Server) {
  globalForIO.io = io
}

export function getIO(): Server | null {
  return globalForIO.io ?? null
}
