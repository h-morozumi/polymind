import { useState } from 'react'

export function App(): React.JSX.Element {
  const [message, setMessage] = useState('')

  const handlePing = async (): Promise<void> => {
    try {
      const response = await window.api.ping()
      setMessage(response)
    } catch {
      setMessage('Error: IPC failed')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="mb-4 text-4xl font-bold">Hello, polymind</h1>
      <p className="mb-6 text-gray-400">Electron + React + TypeScript</p>
      <button
        onClick={handlePing}
        className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-500"
      >
        Ping Main Process
      </button>
      {message && <p className="mt-4 text-green-400">{message}</p>}
    </div>
  )
}
