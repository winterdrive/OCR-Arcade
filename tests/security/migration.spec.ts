import { test, expect, type Download } from '@playwright/test'
import JSZip from 'jszip'
import { PNG } from 'pngjs'

async function downloadBytes(download: Download) {
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

test.beforeEach(async ({ page }) => {
  ;(page as any).securityErrors = []
  page.on('pageerror', error => (page as any).securityErrors.push(error.message))
  // Fixture uses synthetic images only; refuse non-local network traffic.
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return ['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol === 'data:'
      ? route.continue() : route.abort()
  })
  await page.goto('/tests/security/harness.html')
  await expect.poll(() => page.evaluate(() => Boolean((window as any).regression?.hook.fabricRef.current?.backgroundImage))).toBe(true)
})

test.afterEach(async ({ page }) => {
  expect((page as any).securityErrors).toEqual([])
})

test('StrictMode canvas loads background and preserves top-left coordinates', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const result = await page.evaluate(() => {
    const { fabric, hook } = (window as any).regression
    const canvas = hook.fabricRef.current
    const rect = new fabric.Rect({ left: 20, top: 30, width: 40, height: 20, strokeWidth: 0 })
    canvas.add(rect)
    return { left: rect.getBoundingRect().left, top: rect.getBoundingRect().top, origin: rect.originX, image: canvas.backgroundImage.width }
  })
  expect(result).toEqual({ left: 20, top: 30, origin: 'left', image: 400 })
  expect(errors).toEqual([])
})

test('edited text, custom properties and background survive page switching', async ({ page }) => {
  await page.evaluate(() => {
    const { hook, VerticalTextbox, useStore } = (window as any).regression
    const canvas = hook.fabricRef.current
    const text = new VerticalTextbox('Editable regression', { id: 'regression-text', left: 30, top: 80, width: 250, fontSize: 24, minHeight: 80, verticalAlign: 'bottom' })
    canvas.add(text)
    canvas.setActiveObject(text)
    text.set('text', 'Edited regression')
    canvas.fire('text:changed', { target: text })
    window.dispatchEvent(new Event('canvas:saveCurrentPage'))
    useStore.getState().setCurrentPageIndex(1)
  })
  await expect.poll(() => page.evaluate(() => (window as any).regression.hook.fabricRef.current.getObjects().length)).toBe(0)
  await page.evaluate(() => (window as any).regression.useStore.getState().setCurrentPageIndex(0))
  await expect.poll(() => page.evaluate(() => (window as any).regression.hook.fabricRef.current.getObjects()[0]?.text)).toBe('Edited regression')
  const restored = await page.evaluate(() => {
    const { hook, VerticalTextbox } = (window as any).regression
    const text = hook.fabricRef.current.getObjects()[0]
    return { custom: text instanceof VerticalTextbox, id: text.id, minHeight: text.minHeight, align: text.verticalAlign }
  })
  expect(restored).toEqual({ custom: true, id: 'regression-text', minHeight: 80, align: 'bottom' })
})

test('multiple selection aligns at non-default zoom', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { fabric, hook, applyAlignCommand } = (window as any).regression
    const canvas = hook.fabricRef.current
    canvas.setZoom(2)
    const a = new fabric.Rect({ left: 20, top: 25, width: 20, height: 20 })
    const b = new fabric.Rect({ left: 100, top: 70, width: 30, height: 30 })
    canvas.add(a, b)
    canvas.setActiveObject(new fabric.ActiveSelection([a, b], { canvas }))
    const changed = applyAlignCommand(canvas, 'alignLeft')
    return { changed, difference: Math.abs(a.getBoundingRect().left - b.getBoundingRect().left) }
  })
  expect(result.changed).toBe(true)
  expect(result.difference).toBeLessThan(0.01)
})

test('PNG and editable PPTX exports contain the edited document', async ({ page }) => {
  await page.evaluate(() => {
    const { hook, VerticalTextbox } = (window as any).regression
    hook.fabricRef.current.add(new VerticalTextbox('Export regression', { left: 20, top: 90, width: 300, fontSize: 22, minHeight: 60, verticalAlign: 'bottom' }))
  })
  const pngDownload = page.waitForEvent('download')
  await page.evaluate(async () => {
    const { hook, fixture, exportToPNG } = (window as any).regression
    await exportToPNG(fixture, hook.fabricRef.current.toObject(), 'security-regression.png')
  })
  const png = PNG.sync.read(await downloadBytes(await pngDownload))
  expect([png.width, png.height]).toEqual([400, 200])
  expect(png.data.some((value, i) => i % 4 !== 3 && value < 128)).toBe(true)
  const pptxDownload = page.waitForEvent('download')
  await page.evaluate(async () => {
    const { hook, fixture, exportToPPTX } = (window as any).regression
    await exportToPPTX({ pages: [fixture], canvasStates: [hook.fabricRef.current.toObject()], mode: 'editable' })
  })
  const zip = await JSZip.loadAsync(await downloadBytes(await pptxDownload))
  const slide = await zip.file('ppt/slides/slide1.xml')!.async('string')
  expect(slide).toContain('Export regression')
  expect(slide).toContain('anchor="b"')
  expect(Object.keys(zip.files).some(path => path.startsWith('ppt/media/') && path.endsWith('.png'))).toBe(true)
})

test('patched Fabric escapes hostile font families during SVG serialization', async ({ page }) => {
  const svg = await page.evaluate(() => {
    const { fabric } = (window as any).regression
    return new fabric.Textbox('Safe text', { fontFamily: '\"><script>alert(1)</script><g x="' }).toSVG()
  })
  expect(svg).not.toContain('<script>')
})

test('PDF.js renders a real PDF through its bundled worker', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << >> /Contents 4 0 R >>',
      '<< /Length 23 >>\nstream\n0 0 100 100 re f\n\nendstream',
    ]
    let pdf = '%PDF-1.4\n'
    const offsets = [0]
    objects.forEach((object, i) => {
      offsets.push(pdf.length)
      pdf += `${i + 1} 0 obj\n${object}\nendobj\n`
    })
    const start = pdf.length
    pdf += 'xref\n0 5\n0000000000 65535 f \n'
    pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
    pdf += `trailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n${start}\n%%EOF`
    const pages = await (window as any).regression.loadPDF(new File([pdf], 'fixture.pdf', { type: 'application/pdf' }))
    return pages.map((p: any) => ({ width: p.width, height: p.height, png: p.imageData.startsWith('data:image/png;base64,') }))
  })
  expect(result).toEqual([{ width: 400, height: 200, png: true }])
})
