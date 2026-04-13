const http = require('http')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const PORT = Number(process.env.PORT || 4000)
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_dev_secret'
const DB_PATH = path.join(__dirname, 'db.json')

const allowedTaskStatus = new Set(['todo', 'in_progress', 'done'])
const allowedTaskPriority = new Set(['low', 'medium', 'high'])
const allowedProjectStatus = new Set(['planned', 'active', 'completed'])
const allowedProjectPriority = new Set(['low', 'medium', 'high'])

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  })
  res.end(JSON.stringify(payload))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Invalid JSON payload'))
      }
    })
  })
}

function readDb() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  const parsed = JSON.parse(raw)
  const sanitized = {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    projects: Array.isArray(parsed.projects)
      ? parsed.projects.map((project) => normalizeProject(project))
      : [],
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
  }

  if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
    writeDb(sanitized)
  }

  return sanitized
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' })
}

function getAuthUser(req, db) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const userId = typeof payload === 'object' ? payload.sub : null
    if (!userId || typeof userId !== 'string') return null
    return db.users.find((user) => user.id === userId) || null
  } catch {
    return null
  }
}

function canAccessProject(db, projectId, userId) {
  const project = db.projects.find((item) => item.id === projectId)
  if (!project) return false
  if (project.owner_id === userId) return true
  return db.tasks.some((task) => task.project_id === projectId && task.assignee_id === userId)
}

function parsePath(urlPathname) {
  return urlPathname.split('/').filter(Boolean)
}

function validationError(res, fields) {
  sendJson(res, 400, { error: 'validation failed', fields })
}

function unauthorized(res) {
  sendJson(res, 401, { error: 'unauthorized' })
}

function forbidden(res) {
  sendJson(res, 403, { error: 'forbidden' })
}

function notFound(res) {
  sendJson(res, 404, { error: 'not found' })
}

function normalizeTags(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean)
  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function normalizeProject(project) {
  return {
    ...project,
    status: project.status || 'planned',
    priority: project.priority || 'medium',
    due_date: project.due_date || '',
    tags: normalizeTags(project.tags),
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: 'bad request' })
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    })
    res.end()
    return
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`)
  const segments = parsePath(parsedUrl.pathname)
  const db = readDb()

  try {
    if (req.method === 'POST' && parsedUrl.pathname === '/auth/register') {
      const body = await parseBody(req)
      const fields = {}
      if (!body.name) fields.name = 'is required'
      if (!body.email) fields.email = 'is required'
      if (!body.password) fields.password = 'is required'
      if (Object.keys(fields).length > 0) {
        validationError(res, fields)
        return
      }

      const email = String(body.email).toLowerCase().trim()
      const existing = db.users.find((user) => user.email.toLowerCase() === email)
      if (existing) {
        validationError(res, { email: 'already exists' })
        return
      }

      const newUser = {
        id: randomUUID(),
        name: String(body.name).trim(),
        email,
        password_hash: await bcrypt.hash(String(body.password), 10),
      }

      db.users.push(newUser)
      writeDb(db)

      sendJson(res, 201, { token: createToken(newUser), user: publicUser(newUser) })
      return
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/auth/login') {
      const body = await parseBody(req)
      const fields = {}
      if (!body.email) fields.email = 'is required'
      if (!body.password) fields.password = 'is required'
      if (Object.keys(fields).length > 0) {
        validationError(res, fields)
        return
      }

      const email = String(body.email).toLowerCase().trim()
      const user = db.users.find((item) => item.email.toLowerCase() === email)
      if (!user) {
        unauthorized(res)
        return
      }

      const validPassword = await bcrypt.compare(String(body.password), user.password_hash)
      if (!validPassword) {
        unauthorized(res)
        return
      }

      sendJson(res, 200, { token: createToken(user), user: publicUser(user) })
      return
    }

    const authUser = getAuthUser(req, db)
    if (!authUser) {
      unauthorized(res)
      return
    }

    if (req.method === 'GET' && parsedUrl.pathname === '/users') {
      const users = db.users.map((u) => {
        const assignedTaskIds = new Set(
          db.tasks.filter((t) => t.assignee_id === u.id).map((t) => t.project_id),
        )
        const project_count = db.projects.filter(
          (p) => p.owner_id === u.id || assignedTaskIds.has(p.id),
        ).length
        const task_count = db.tasks.filter((t) => t.assignee_id === u.id).length
        return { ...publicUser(u), project_count, task_count }
      })
      sendJson(res, 200, { users })
      return
    }

    if (req.method === 'GET' && parsedUrl.pathname === '/projects') {
      const projects = db.projects.filter((project) => {
        if (project.owner_id === authUser.id) return true
        return db.tasks.some(
          (task) => task.project_id === project.id && task.assignee_id === authUser.id,
        )
      })
      sendJson(res, 200, { projects: projects.map(normalizeProject) })
      return
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/projects') {
      const body = await parseBody(req)
      const fields = {}
      if (!body.name || !String(body.name).trim()) fields.name = 'is required'
      if (body.status && !allowedProjectStatus.has(body.status)) fields.status = 'is invalid'
      if (body.priority && !allowedProjectPriority.has(body.priority))
        fields.priority = 'is invalid'
      if (Object.keys(fields).length > 0) {
        validationError(res, fields)
        return
      }
      const project = {
        id: randomUUID(),
        name: String(body.name).trim(),
        description: body.description ? String(body.description) : '',
        status: body.status || 'planned',
        priority: body.priority || 'medium',
        due_date: body.due_date ? String(body.due_date) : '',
        tags: normalizeTags(body.tags),
        owner_id: authUser.id,
        created_at: new Date().toISOString(),
      }
      db.projects.push(normalizeProject(project))
      writeDb(db)
      sendJson(res, 201, normalizeProject(project))
      return
    }

    if (segments[0] === 'projects' && segments[1] && !segments[2]) {
      const projectId = segments[1]
      const project = db.projects.find((item) => item.id === projectId)
      if (!project) {
        notFound(res)
        return
      }
      if (!canAccessProject(db, projectId, authUser.id)) {
        forbidden(res)
        return
      }

      if (req.method === 'GET') {
        const tasks = db.tasks.filter((task) => task.project_id === projectId)
        sendJson(res, 200, { ...normalizeProject(project), tasks })
        return
      }

      if (req.method === 'PATCH') {
        if (project.owner_id !== authUser.id) {
          forbidden(res)
          return
        }
        const body = await parseBody(req)
        if (body.name !== undefined) project.name = String(body.name).trim()
        if (body.description !== undefined) project.description = String(body.description)
        if (body.status !== undefined && !allowedProjectStatus.has(body.status)) {
          validationError(res, { status: 'is invalid' })
          return
        }
        if (body.priority !== undefined && !allowedProjectPriority.has(body.priority)) {
          validationError(res, { priority: 'is invalid' })
          return
        }
        if (body.status !== undefined) project.status = body.status
        if (body.priority !== undefined) project.priority = body.priority
        if (body.due_date !== undefined) project.due_date = String(body.due_date)
        if (body.tags !== undefined) project.tags = normalizeTags(body.tags)
        Object.assign(project, normalizeProject(project))
        writeDb(db)
        sendJson(res, 200, normalizeProject(project))
        return
      }

      if (req.method === 'DELETE') {
        if (project.owner_id !== authUser.id) {
          forbidden(res)
          return
        }
        db.projects = db.projects.filter((item) => item.id !== projectId)
        db.tasks = db.tasks.filter((task) => task.project_id !== projectId)
        writeDb(db)
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        })
        res.end()
        return
      }
    }

    if (
      segments[0] === 'projects' &&
      segments[1] &&
      segments[2] === 'tasks' &&
      segments.length === 3
    ) {
      const projectId = segments[1]
      const project = db.projects.find((item) => item.id === projectId)
      if (!project) {
        notFound(res)
        return
      }
      if (!canAccessProject(db, projectId, authUser.id)) {
        forbidden(res)
        return
      }

      if (req.method === 'GET') {
        const statusFilter = parsedUrl.searchParams.get('status')
        const assigneeFilter = parsedUrl.searchParams.get('assignee')
        let tasks = db.tasks.filter((task) => task.project_id === projectId)
        if (statusFilter) tasks = tasks.filter((task) => task.status === statusFilter)
        if (assigneeFilter) tasks = tasks.filter((task) => task.assignee_id === assigneeFilter)
        sendJson(res, 200, { tasks })
        return
      }

      if (req.method === 'POST') {
        const body = await parseBody(req)
        const fields = {}
        if (!body.title) fields.title = 'is required'
        if (!body.assignee_id) fields.assignee_id = 'is required'
        if (!body.due_date) fields.due_date = 'is required'
        if (Object.keys(fields).length > 0) {
          validationError(res, fields)
          return
        }

        const status = body.status || 'todo'
        const priority = body.priority || 'medium'

        if (!allowedTaskStatus.has(status)) {
          validationError(res, { status: 'is invalid' })
          return
        }
        if (!allowedTaskPriority.has(priority)) {
          validationError(res, { priority: 'is invalid' })
          return
        }

        const now = new Date().toISOString()
        const task = {
          id: randomUUID(),
          project_id: projectId,
          title: String(body.title),
          description: body.description ? String(body.description) : '',
          status,
          priority,
          assignee_id: String(body.assignee_id),
          due_date: String(body.due_date),
          created_at: now,
          updated_at: now,
        }
        db.tasks.push(task)
        writeDb(db)
        sendJson(res, 201, task)
        return
      }
    }

    if (segments[0] === 'tasks' && segments[1] && segments.length === 2) {
      const task = db.tasks.find((item) => item.id === segments[1])
      if (!task) {
        notFound(res)
        return
      }

      if (!canAccessProject(db, task.project_id, authUser.id)) {
        forbidden(res)
        return
      }

      if (req.method === 'PATCH') {
        const body = await parseBody(req)
        if (body.status !== undefined && !allowedTaskStatus.has(body.status)) {
          validationError(res, { status: 'is invalid' })
          return
        }
        if (body.priority !== undefined && !allowedTaskPriority.has(body.priority)) {
          validationError(res, { priority: 'is invalid' })
          return
        }
        if (body.title !== undefined) task.title = String(body.title)
        if (body.description !== undefined) task.description = String(body.description)
        if (body.status !== undefined) task.status = body.status
        if (body.priority !== undefined) task.priority = body.priority
        if (body.assignee_id !== undefined) task.assignee_id = String(body.assignee_id)
        if (body.due_date !== undefined) task.due_date = String(body.due_date)
        task.updated_at = new Date().toISOString()
        writeDb(db)
        sendJson(res, 200, task)
        return
      }

      if (req.method === 'DELETE') {
        db.tasks = db.tasks.filter((item) => item.id !== task.id)
        writeDb(db)
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        })
        res.end()
        return
      }
    }

    notFound(res)
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON payload') {
      sendJson(res, 400, { error: 'validation failed', fields: { body: 'invalid json' } })
      return
    }
    sendJson(res, 500, { error: 'internal server error' })
  }
})

readDb()

server.listen(PORT, () => {
  console.log(`Mock API v3 listening on http://localhost:${PORT}`)
  console.log('  project_count = owned + assigned projects | task_count = assigned tasks')
  console.log(`Fields supported: name, description, status, priority, due_date, tags`)
})
