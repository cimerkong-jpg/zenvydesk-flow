import { useEffect, useState } from 'react'

import { apiBaseUrl, endpointPaths } from './config'
import {
  fetchHealth,
  getFacebookLoginUrl,
  runScheduledSmoke,
  type ScheduledRunResponse,
} from './lib/api'

type StatusState =
  | { kind: 'idle' }
  | { kind: 'ok'; detail: string }
  | { kind: 'error'; detail: string }

function App() {
  const [backendStatus, setBackendStatus] = useState<StatusState>({ kind: 'idle' })
  const [workerStatus, setWorkerStatus] = useState<StatusState>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false

    const loadHealth = async () => {
      try {
        const response = await fetchHealth()
        if (!cancelled) {
          setBackendStatus({ kind: 'ok', detail: response.status })
        }
      } catch (error) {
        if (!cancelled) {
          const detail = error instanceof Error ? error.message : 'Unknown error'
          setBackendStatus({ kind: 'error', detail })
        }
      }
    }

    void loadHealth()

    return () => {
      cancelled = true
    }
  }, [])

  const handleWorkerSmoke = async () => {
    setWorkerStatus({ kind: 'idle' })

    try {
      const result = await runScheduledSmoke()
      setWorkerStatus({
        kind: 'ok',
        detail: formatWorkerResult(result),
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error'
      setWorkerStatus({ kind: 'error', detail })
    }
  }

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Frontend Support Slice</p>
        <h1>ZenvyDesk Web Integration</h1>
        <p className="lede">
          This page is intentionally minimal. It wires the web app to the current
          FastAPI contracts without taking ownership of the commercial UI design.
        </p>
      </section>

      <section className="panel">
        <h2>Environment</h2>
        <dl className="kv">
          <div>
            <dt>Frontend origin</dt>
            <dd>http://localhost:3000</dd>
          </div>
          <div>
            <dt>Backend base URL</dt>
            <dd>{apiBaseUrl}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <h2>Endpoint Contracts</h2>
        <ul className="endpointList">
          <li>
            <code>GET {endpointPaths.health}</code>
            <span>{renderStatusText(backendStatus)}</span>
          </li>
          <li>
            <code>GET {endpointPaths.facebookLogin}</code>
            <a href={getFacebookLoginUrl()}>Open Facebook login</a>
          </li>
          <li>
            <code>GET {endpointPaths.facebookCallback}</code>
            <span>Backend callback route registered</span>
          </li>
          <li>
            <code>POST {endpointPaths.scheduledRun}</code>
            <button type="button" onClick={handleWorkerSmoke}>
              Run worker smoke
            </button>
          </li>
        </ul>

        {workerStatus.kind !== 'idle' ? (
          <p className={`status ${workerStatus.kind}`}>{workerStatus.detail}</p>
        ) : null}
      </section>
    </main>
  )
}

const renderStatusText = (status: StatusState): string => {
  if (status.kind === 'idle') {
    return 'Checking backend health...'
  }

  if (status.kind === 'ok') {
    return `Backend health: ${status.detail}`
  }

  return `Backend health failed: ${status.detail}`
}

const formatWorkerResult = (result: ScheduledRunResponse): string =>
  `success=${result.success}, processed=${result.processed_count}, posted=${result.posted_count}, failed=${result.failed_count}, skipped=${result.skipped_count}`

export default App
