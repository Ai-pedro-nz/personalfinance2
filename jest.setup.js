import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.DATABASE_URL = 'file:./test.db'

// Global test utilities
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock crypto for Node.js environment
const { webcrypto } = require('node:crypto')
if (!global.crypto) {
  global.crypto = webcrypto
}

// Add missing Node.js Web APIs
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web')
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream

// Mock Web APIs for Node.js environment
try {
  if (!global.Request) {
    const { Request } = require('undici')
    global.Request = Request
  }

  if (!global.Response) {
    const { Response } = require('undici')
    global.Response = Response
  }

  if (!global.Headers) {
    const { Headers } = require('undici')
    global.Headers = Headers
  }
} catch (error) {
  // Fallback if undici is not available
  const MockHeaders = global.Headers || class MockHeaders {
    constructor(init = {}) {
      this.data = new Map()
      if (init && typeof init === 'object') {
        for (const [key, value] of Object.entries(init)) {
          this.data.set(key.toLowerCase(), value)
        }
      }
    }
    
    get(name) { return this.data.get(name.toLowerCase()) }
    set(name, value) { this.data.set(name.toLowerCase(), value) }
    has(name) { return this.data.has(name.toLowerCase()) }
  }
  
  global.Request = class MockRequest {
    constructor(url, init = {}) {
      this.url = url
      this.method = init.method || 'GET'
      this.headers = new MockHeaders(init.headers || {})
      this.body = init.body || null
    }
    
    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body)
      }
      return this.body || {}
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body || {})
    }
    
    async formData() {
      // Mock FormData that preserves File objects
      const mockFormData = {
        _entries: new Map(),
        append(name, value) {
          this._entries.set(name, value)
        },
        get(name) {
          return this._entries.get(name)
        },
        has(name) {
          return this._entries.has(name)
        },
        *entries() {
          yield* this._entries.entries()
        }
      }
      
      if (this.file) {
        mockFormData.append('csvFile', this.file)
      }
      
      return mockFormData
    }
  }
  
  global.Response = class MockResponse {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new MockHeaders(init.headers || {})
    }
    
    static json(data, init = {}) {
      return new MockResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init.headers || {})
        }
      })
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  }
  
  global.Headers = class MockHeaders {
    constructor(init = {}) {
      this.data = new Map()
      if (init) {
        if (init instanceof Map) {
          for (const [key, value] of init) {
            this.data.set(key.toLowerCase(), value)
          }
        } else if (typeof init === 'object') {
          for (const [key, value] of Object.entries(init)) {
            this.data.set(key.toLowerCase(), value)
          }
        }
      }
    }
    
    get(name) {
      return this.data.get(name.toLowerCase())
    }
    
    set(name, value) {
      this.data.set(name.toLowerCase(), value)
    }
    
    has(name) {
      return this.data.has(name.toLowerCase())
    }
    
    delete(name) {
      return this.data.delete(name.toLowerCase())
    }
    
    forEach(callback) {
      this.data.forEach(callback)
    }
    
    *[Symbol.iterator]() {
      yield* this.data
    }
  }
}

if (!global.fetch) {
  global.fetch = jest.fn()
}

// Mock NextResponse and NextRequest for API route testing
jest.mock('next/server', () => {
  const MockHeaders = global.Headers || class MockHeaders {
    constructor(init = {}) {
      this.data = new Map()
      if (init && typeof init === 'object') {
        for (const [key, value] of Object.entries(init)) {
          this.data.set(key.toLowerCase(), value)
        }
      }
    }
    
    get(name) { return this.data.get(name.toLowerCase()) }
    set(name, value) { this.data.set(name.toLowerCase(), value) }
    has(name) { return this.data.has(name.toLowerCase()) }
  }

  return {
    NextResponse: {
      json: (data, init = {}) => {
        return {
          json: async () => data,
          status: init.status || 200,
          headers: new MockHeaders(init.headers || {}),
          cookies: {
            set: jest.fn()
          }
        }
      }
    },
    NextRequest: class MockNextRequest {
      constructor(url, init = {}) {
        this.url = url
        this.method = init.method || 'GET'
        this.headers = new MockHeaders(init.headers || {})
        this.body = init.body || null
        this.cookies = new Map()
        this.file = init.file || null
      }
      
      async json() {
        if (typeof this.body === 'string') {
          return JSON.parse(this.body)
        }
        return this.body || {}
      }
      
      async formData() {
        // Mock FormData that preserves File objects
        const mockFormData = {
          _entries: new Map(),
          append(name, value) {
            this._entries.set(name, value)
          },
          get(name) {
            return this._entries.get(name)
          },
          has(name) {
            return this._entries.has(name)
          },
          *entries() {
            yield* this._entries.entries()
          }
        }
        
        if (this.file) {
          mockFormData.append('csvFile', this.file)
        }
        
        return mockFormData
      }
    }
  }
})