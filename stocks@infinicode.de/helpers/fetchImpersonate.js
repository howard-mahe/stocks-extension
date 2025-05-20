const GLib = imports.gi.GLib
const Gio = imports.gi.Gio

const generateQueryString = params => {
  if (!params) {
    return ''
  }

  // filter items without value & create pair list of paramName=paramValue
  const paramKeyValues = Object.keys(params).filter(paramName => params[paramName]).map(paramName => {
    let paramValue = params[paramName]

    if (typeof paramValue === 'boolean') {
      paramValue = paramValue ? 1 : 0
    }

    return `${paramName}=${paramValue}`
  })

  return `?${paramKeyValues.join('&')}`
}

var fetch = ({
  url,
  method = 'GET',
  headers,
  queryParameters,
  impersonate = 'chrome116',
  cookies = null
}) => {
  return new Promise((resolve, reject) => {
    url = url + generateQueryString(queryParameters)

    // log(`Fetching url: ${url}`)

    // const args = [`curl-impersonate-${impersonate}`, '-s', '-X', method]
    const args = [`/usr/bin/curl_${impersonate}`, '-s', '-X', method]

    // Add headers
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        args.push('-H', `${key}: ${value}`)
      }
    }

    if (cookies) {
      args.push('-H', `Cookie: ${cookies.join(';')}`)
    }

    args.push('-i') // include headers in output
    args.push(url)

    try {
      const [success, pid, stdinFd, stdoutFd, stderrFd] = GLib.spawn_async_with_pipes(
        null, args, null, GLib.SpawnFlags.DO_NOT_REAP_CHILD, null
      )

      GLib.close(stdinFd)

      const stdoutStream = new Gio.DataInputStream({
        base_stream: new Gio.UnixInputStream({ fd: stdoutFd, close_fd: true })
      })

      function readAllLines (accum = '') {
        return new Promise((resolve, reject) => {
          function readNext (buffer = '') {
            stdoutStream.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, res) => {
              try {
                const [line] = stream.read_line_finish(res)
                if (line === null) {
                  resolve(buffer) // End of stream
                  return
                }

                readNext(buffer + line.toString() + '\n')
              } catch (e) {
                reject(e)
              }
            })
          }

          readNext(accum)
        })
      }

      readAllLines()
        .then(data => {
          GLib.spawn_close_pid(pid)

          // Split headers and body
          const [rawHeaders, ...bodyParts] = data.split('\r\n\r\n')
          const body = bodyParts.join('\r\n\r\n')

          const headers = {}
          rawHeaders.split('\r\n').forEach((line, index) => {
            if (index === 0) return // skip "HTTP/1.1 200 OK"
            const [key, ...rest] = line.split(':')
            if (key && rest.length > 0) {
              headers[key.trim()] = rest.join(':').trim()
            }
          })

          const statusMatch = rawHeaders.match(/^HTTP\/\d\.\d\s+(\d+)/)
          const status = statusMatch ? parseInt(statusMatch[1]) : 200

          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: `${status}`,
            headers,
            text: () => body,
            json: () => JSON.parse(body)
          })
        })
        .catch(err => {
          log(`Could not parse response body ${err}`)
          GLib.spawn_close_pid(pid)
          reject(err)
        })
    } catch (e) {
      reject(e)
    }
  })
}
