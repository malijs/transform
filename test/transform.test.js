import test from 'ava'
import path from 'path'
import caller from 'grpc-caller'
import Mali from 'mali'
import hl from 'highland'
import async from 'async'
import _ from 'lodash'
import pMap from 'p-map'

import mw from '../'

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getHostport (port) {
  return '0.0.0.0:'.concat(port || getRandomInt(1000, 60000))
}

const ARRAY_DATA = [
  { message: '1 foo' },
  { message: '2 bar' },
  { message: '3 asd' },
  { message: '4 qwe' },
  { message: '5 rty' },
  { message: '6 zxc' }
]

function getArrayData () {
  return _.cloneDeep(ARRAY_DATA)
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

class MyClass2 {
  constructor (data) {
    this.message = data.message
  }

  toPayload () {
    return {
      message: this.message.replace(/:/gi, '|')
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

  async function handler4 (ctx) {
    return new Promise((resolve, reject) => {
      hl(ctx.req)
        .map(d => {
          return d.message.toUpperCase()
        })
        .collect()
        .toCallback((err, r) => {
          if (err) {
            return reject(err)
          }

          ctx.res = new MyClass2({
            message: r.join(':')
          })
          resolve()
        })
    })
  }

  const app = new Mali(PROTO_PATH, 'TransformService')
  t.truthy(app)
  apps.push(app)

  app.use('do1', handler1)
  app.use('do2', mw('xform'), handler2)
  app.use('do3', mw('payload'), handler3)
  app.use('do4', mw('toPayload'), handler4)
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

test.cb('should handle transform within req stream handler', t => {
  t.plan(4)
  const call = client.do4((err, res) => {
    t.falsy(err)
    t.truthy(res)
    t.truthy(res.message)
    t.is(res.message, '1 FOO|2 BAR|3 ASD|4 QWE|5 RTY|6 ZXC')
    t.end()
  })

  async.eachSeries(getArrayData(), (d, asfn) => {
    call.write(d)
    _.delay(asfn, _.random(10, 50))
  }, () => {
    call.end()
  })
})

test.after.always('cleanup', async t => {
  await pMap(apps, app => app.close())
})
