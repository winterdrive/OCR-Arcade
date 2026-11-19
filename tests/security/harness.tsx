import React, { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import * as fabric from 'fabric'
import { useCanvas } from '@/domains/canvas/hooks/useCanvas'
import { VerticalTextbox } from '@/domains/canvas/fabric/VerticalTextbox'
import { useStore } from '@/shared/store/useStore'
import { applyAlignCommand } from '@/domains/canvas/services/alignmentCommands'
import { exportToPNG, exportToPPTX } from '@/domains/export/services/pptx'
import { loadPDF } from '@/domains/export/services/pdf'
import '@/shared/i18n'

const image = document.createElement('canvas')
image.width = 400
image.height = 200
const ctx = image.getContext('2d')!
ctx.fillStyle = '#ffffff'
ctx.fillRect(0, 0, 400, 200)
ctx.fillStyle = '#000000'
ctx.font = '32px Arial'
ctx.fillText('SECURITY TEST', 30, 65)
const fixture = { width: 400, height: 200, imageData: image.toDataURL() }
useStore.getState().setPages([fixture, fixture])

function Harness() {
  const hook = useCanvas(800, 400)
  useEffect(() => {
    ;(window as any).regression = {
      hook, fabric, VerticalTextbox, useStore, fixture, applyAlignCommand,
      exportToPNG, exportToPPTX, loadPDF,
    }
  })
  return <canvas ref={hook.canvasRef} />
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>)
