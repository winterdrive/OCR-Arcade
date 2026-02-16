import React from 'react'
import ReactDOM from 'react-dom/client'
import { setLogging } from 'tesseract.js'
import App from './App.tsx'
import '@/shared/styles/index.css'
import i18n from '@/shared/i18n'
import { I18nextProvider } from 'react-i18next'

const shouldSuppressConsoleMessage = (value: unknown) => {
  if (typeof value !== 'string') return false
  return (
    value.includes('Parameter not found:') ||
    value.includes('Attempted to set parameters') ||
    value.includes('is maintained with support from locize.com') ||
    value.includes('Multiple readback operations using getImageData are faster with the willReadFrequently') ||
    value.includes("The provided value 'alphabetical' is not a valid enum value of type CanvasTextBaseline")
  )
}

const suppressConsoleNoise = () => {
  const originalWarn = console.warn.bind(console)
  const originalError = console.error.bind(console)
  const originalInfo = console.info.bind(console)

  const firstMessageArg = (args: unknown[]) => args[0]

  console.warn = (...args: unknown[]) => {
    if (shouldSuppressConsoleMessage(firstMessageArg(args))) {
      return
    }
    originalWarn(...args)
  }

  console.error = (...args: unknown[]) => {
    if (shouldSuppressConsoleMessage(firstMessageArg(args))) {
      return
    }
    originalError(...args)
  }

  console.info = (...args: unknown[]) => {
    if (shouldSuppressConsoleMessage(firstMessageArg(args))) {
      return
    }
    originalInfo(...args)
  }
}

setLogging(false)

if (import.meta.env.PROD) {
  suppressConsoleNoise()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>,
)
