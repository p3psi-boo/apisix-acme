const fs = require('fs')
const path = require('path')
const KoaRouter = require('@koa/router')
const config = require('./config')
const task = require('./task')

const router = new KoaRouter()

// 查询任务
router.get('/apisix_acme/task_status', async (ctx, next) => {
  if (ctx.state.verifyToken != config.verify_token) {
    ctx.body = { code: 401, message: 'invalid VERIFY_TOKEN' }
    return
  }

  const domain = ctx.query.domain
  if (!domain) {
    ctx.body = { code: 400, message: 'domain is required' }
    return
  }
  const status = await task.queryTask(domain)
  ctx.body = { code: 200, data: status }
})

// 创建任务
router.post('/apisix_acme/task_create', async (ctx, next) => {
  if (ctx.state.verifyToken != config.verify_token) {
    ctx.body = { code: 401, message: 'invalid VERIFY_TOKEN' }
    return
  }

  const body = ctx.request.body || {}
  const domain = body.domain
  const serviceList = body.serviceList || []
  const mail = body.mail || config.acme_mail
  const force = body.force === true

  if (!domain) {
    ctx.body = { code: 400, message: 'domain is required' }
    return
  }

  const result = await task.createTask(domain, mail, serviceList, force)
  ctx.body = result
})

// acme text verify
// 主要是处理 /.well-known/acme-challenge/random 这个请求
router.get('(.*)', (ctx, next) => {
  let file = ctx.params[0]

  const filePath = path.join(__dirname, 'www', file)

  if (!fs.existsSync(filePath)) {
    ctx.status = 404
    return
  }

  const state = fs.statSync(filePath)
  if (state.isDirectory()) {
    ctx.status = 404
    return
  }

  ctx.body = fs.readFileSync(filePath, 'utf8')
})

module.exports = router
