import test from 'ava'
import path from 'path'
import caller from 'grpc-caller'
import Mali from 'mali'

import mw from '../'

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getHostport (port) {
  return '0.0.0.0:'.concat(port || getRandomInt(1000, 60000))
}

const PROTO_PATH = path.resolve(__dirname, './xform.proto')
const DYNAMIC_HOST = getHostport()
const apps = []
let client

class MyClass {
  constructor (data) {
    this.message = data.message
    this.value = data.value
    this.secret = data.secret
  }

  payload () {
    return {
      message: this.message.toUpperCase(),
      value: this.value
    }
  }
}

test.before('should dynamically create service', t => {
  function handler2 (ctx) {
    const obj = ctx.req
    obj.xform = function xfrom () {
      return {
        message: this.message
      }
    }

    ctx.res = obj
  }

  function handler1 (ctx) {
    ctx.res = ctx.req
  }

  function handler3 (ctx) {
    const o = new MyClass(ctx.req)
    ctx.res = o
  }

  const app = new Mali(PROTO_PATH, 'TransformService')
  t.truthy(app)
  apps.push(app)

  app.use('do1', handler1)
  app.use('do2', mw('xform'), handler2)
  app.use('do3', mw('payload'), handler3)
  const server = app.start(DYNAMIC_HOST)

  t.truthy(server)

  client = caller(DYNAMIC_HOST, PROTO_PATH, 'TransformService')
})

test('async call service no transform', async t => {
  t.plan(5)
  const response = await client.do1({ message: 'Hello World', value: 'value 1' })
  t.truthy(response)
  t.truthy(response.message)
  t.truthy(response.value)
  t.is(response.message, 'Hello World')
  t.is(response.value, 'value 1')
})

test('async call service with transform', async t => {
  t.plan(4)
  const response = await client.do2({ message: 'Hello World', value: 'value 1' })
  t.truthy(response)
  t.truthy(response.message)
  t.falsy(response.value)
  t.is(response.message, 'Hello World')
})

test('async call service with transform within prototype', async t => {
  t.plan(6)
  const response = await client.do3({ message: 'Hello', value: 'value 3', secret: 'secret stuffs' })
  t.truthy(response)
  t.truthy(response.message)
  t.truthy(response.value)
  t.falsy(response.secret)
  t.is(response.message, 'HELLO')
  t.is(response.value, 'value 3')
})

test.after.always('guaranteed cleanup', t => {
  apps.forEach(app => app.close())
})
