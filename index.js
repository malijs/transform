const CallType = require('mali-call-types')

/**
 * Mali payload transform middleware. If the response object has a specified function
 * that function it's executed upon payload. Only applies for <code>UNARY</code> and
 * <code>REQUEST_STREAM</code> call types.
 * @module mali-transform
 *
 * @param  {String} fn The name of the function property to check against in the response object
 * @return {Function} the middleware function
 * @example
 * const xform = require('mali-transform')
 *
 * function handler(ctx) {
 *   const obj = {
 *     email: 'bob@gmail.com',
 *     password: 'mysecret'
 *   }
 *
 *   obj.xform = function() {
 *     return {
 *       email: this.email
 *     }
 *   }
 *
 *   ctx.res = obj // password will not be in the payload to client
 * }
 *
 * app.use('fn', xform('xform'), handler)
 */
module.exports = function (fn) {
  return function transform (ctx, next) {
    if (ctx.type === CallType.RESPONSE_STREAM || ctx.type === CallType.RESPONSE_STREAM) {
      return next()
    }

    return next().then(() => {
      if (ctx.res && typeof ctx.res === 'object' &&
        (typeof ctx.res[fn] === 'function' || typeof Object.getPrototypeOf(ctx.res)[fn] === 'function')) {
        ctx.res = ctx.res[fn]()
      }
    })
  }
}
