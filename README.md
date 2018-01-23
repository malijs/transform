# mali-transform

[![Greenkeeper badge](https://badges.greenkeeper.io/malijs/transform.svg)](https://greenkeeper.io/)

Mali response payload transform middleware

[![npm version](https://img.shields.io/npm/v/mali-transform.svg?style=flat-square)](https://www.npmjs.com/package/mali-transform)
[![build status](https://img.shields.io/travis/malijs/transform/master.svg?style=flat-square)](https://travis-ci.org/malijs/transform)

## API

<a name="module_mali-transform"></a>

### mali-transform ⇒ <code>function</code>
Mali payload transform middleware. If the response object has a specified function
that function it's executed upon payload. Only applies for <code>UNARY</code> and
<code>REQUEST_STREAM</code> call types.

**Returns**: <code>function</code> - the middleware function  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>String</code> | The name of the function property to check against in the response object |

**Example**  

```js
const xform = require('mali-transform')

function handler(ctx) {
  const obj = {
    email: 'bob@gmail.com',
    password: 'mysecret'
  }

  obj.xform = function() {
    return {
      email: this.email
    }
  }

  ctx.res = obj // password will not be in the payload to client
}

app.use('fn', xform('xform'), handler)
```

## License

  Apache-2.0
