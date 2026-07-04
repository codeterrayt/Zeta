const puppeteer = require("puppeteer-core")
const { Pool } = require("pg")
const { PrismaPg } = require("@prisma/adapter-pg")
const { PrismaClient } = require("@prisma/client")
const fs = require("fs")
const path = require("path")
const GIFEncoder = require("gif-encoder-2")
const { PNG } = require("pngjs")

require("dotenv").config()

const outputDir = "D:\\Projects\\OpenJira\\docs\\images"
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// 2x Nearest-Neighbor Downsampler to scale 1440x900 viewport to 720x450 preview
function downsample2x(srcPng) {
  const targetWidth = srcPng.width / 2
  const targetHeight = srcPng.height / 2
  const dstPng = new PNG({ width: targetWidth, height: targetHeight })
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcIdx = ((y * 2) * srcPng.width + (x * 2)) * 4
      const dstIdx = (y * targetWidth + x) * 4
      
      dstPng.data[dstIdx] = srcPng.data[srcIdx]         // R
      dstPng.data[dstIdx + 1] = srcPng.data[srcIdx + 1] // G
      dstPng.data[dstIdx + 2] = srcPng.data[srcIdx + 2] // B
      dstPng.data[dstIdx + 3] = srcPng.data[srcIdx + 3] // A
    }
  }
  return dstPng
}

// Helper to create a GIF with support for variable delays per frame
function createGif(frames, outPath, width, height, delays) {
  return new Promise((resolve, reject) => {
    const encoder = new GIFEncoder(width, height)
    const writeStream = fs.createWriteStream(outPath)
    encoder.createReadStream().pipe(writeStream)
    
    encoder.start()
    encoder.setRepeat(0)   // repeat forever
    encoder.setQuality(10)
    
    let p = Promise.resolve()
    frames.forEach((fPath, index) => {
      const delay = Array.isArray(delays) ? (delays[index] || 100) : delays
      p = p.then(() => {
        return new Promise((res, rej) => {
          fs.createReadStream(fPath)
            .pipe(new PNG())
            .on("parsed", function() {
              encoder.setDelay(delay)
              encoder.addFrame(this.data)
              res()
            })
            .on("error", rej)
        })
      })
    })
    
    p.then(() => {
      encoder.finish()
      resolve()
    }).catch(reject)
  })
}

// Helper to create the low-res preview version of the GIF by downsampling the same frames
function createPreviewGif(frames, outPath, width, height, delays) {
  return new Promise((resolve, reject) => {
    const encoder = new GIFEncoder(width, height)
    const writeStream = fs.createWriteStream(outPath)
    encoder.createReadStream().pipe(writeStream)
    
    encoder.start()
    encoder.setRepeat(0)   // repeat forever
    encoder.setQuality(10)
    
    let p = Promise.resolve()
    frames.forEach((fPath, index) => {
      const delay = Array.isArray(delays) ? (delays[index] || 100) : delays
      p = p.then(() => {
        return new Promise((res, rej) => {
          fs.createReadStream(fPath)
            .pipe(new PNG())
            .on("parsed", function() {
              const downsampled = downsample2x(this)
              encoder.setDelay(delay)
              encoder.addFrame(downsampled.data)
              res()
            })
            .on("error", rej)
        })
      })
    })
    
    p.then(() => {
      encoder.finish()
      resolve()
    }).catch(reject)
  })
}

async function hideDevOverlay(page) {
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      nextjs-portal,
      [data-nextjs-toast-wrapper],
      #nextjs-dev-overlay,
      #__next-vite-dev-overlay,
      #webpack-hot-middleware-clientOverlay-host {
        display: none !important;
      }
    `
    document.head.appendChild(style)
  })
}

async function run() {
  console.log("Connecting to DB for cleanup...")
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  
  // Clean up any existing projects with this name to make the script repeatable
  console.log("Cleaning up past project runs...")
  await prisma.project.deleteMany({
    where: { name: "Alpha Initiative" }
  })
  
  console.log("Launching Microsoft Edge in Desktop Viewport (1440x900)...")
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  })
  
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  
  const frames = []
  const delays = []
  let frameIdx = 0
  
  const captureFrame = async (delay = 1000) => {
    await new Promise(r => setTimeout(r, 100))
    await hideDevOverlay(page)
    const fPath = path.join(outputDir, `temp-f-${frameIdx}.png`)
    await page.screenshot({ path: fPath })
    frames.push(fPath)
    delays.push(delay)
    frameIdx++
  }

  // 1. Log In Flow
  console.log("Navigating to login page...")
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" })
  await captureFrame(1000)
  
  console.log("Entering credentials...")
  await page.type('input[name="email"]', "admin@zeta.dev")
  await page.type('input[name="password"]', "password123")
  await captureFrame(1000)
  
  console.log("Logging in...")
  await page.click('button[type="submit"]')
  await new Promise(r => setTimeout(r, 6000)) // Wait for dashboard render
  await captureFrame(1500)

  // 2. Go to Projects Page
  console.log("Navigating to Projects Page...")
  await page.evaluate(() => {
    const sidebarLinks = Array.from(document.querySelectorAll('a'))
    const projectsLink = sidebarLinks.find(a => a.getAttribute('href') === '/projects')
    if (projectsLink) projectsLink.click()
  })
  await new Promise(r => setTimeout(r, 2000))
  await captureFrame(1500)

  // 3. Open Create Project Modal
  console.log("Opening Create Project Modal...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find(b => b.textContent.includes('Create Project'))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 1000))
  await captureFrame(1200)

  // 4. Fill Create Project Form
  console.log("Filling Project details...")
  const projectName = "Alpha Initiative"
  const projectDesc = "Core frontend components, authentication, and layout widgets."
  
  await page.type('input[name="name"]', projectName)
  await captureFrame(800)
  
  await page.type('textarea[name="description"]', projectDesc)
  await captureFrame(1000)

  console.log("Submitting Project Form...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find(b => b.textContent.includes('Create Project') && b.type === 'submit')
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000)) // Wait for modal close and refresh
  await captureFrame(1500)

  // Click on the newly created project link
  console.log("Clicking on project Alpha Initiative...")
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    const projLink = links.find(a => a.textContent.includes('Alpha Initiative'))
    if (projLink) projLink.click()
  })
  await new Promise(r => setTimeout(r, 4500)) // Wait for project details page to load
  await captureFrame(2000)

  // 5. Open Create Sprint Modal
  console.log("Opening Create Sprint Modal (Sprint 1)...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find(b => b.textContent.includes('Create Sprint'))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 1000))
  await captureFrame(1200)

  // 6. Fill Create Sprint 1 Form
  console.log("Filling Sprint 1 details...")
  await page.type('input[name="title"]', "Sprint 1: Core Setup")
  await captureFrame(1000)

  console.log("Submitting Sprint 1 Form...")
  await page.click('form button[type="submit"]')
  await new Promise(r => setTimeout(r, 2500))
  await captureFrame(1500)

  // 7. Open Create Sprint Modal again for Sprint 2
  console.log("Opening Create Sprint Modal (Sprint 2)...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find(b => b.textContent.includes('Create Sprint'))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 1000))
  await captureFrame(1200)

  // 8. Fill Create Sprint 2 Form
  console.log("Filling Sprint 2 details...")
  await page.type('input[name="title"]', "Sprint 2: UI Design")
  await captureFrame(1000)

  console.log("Submitting Sprint 2 Form...")
  await page.click('form button[type="submit"]')
  await new Promise(r => setTimeout(r, 2500))
  await captureFrame(2000) // Show multiple sprints listed

  // 9. Create a Task inside Sprint 1
  console.log("Opening Create Task Modal...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find(b => b.textContent.includes('Create Task'))
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 1000))
  await captureFrame(1200)

  // 10. Fill Create Task Form
  console.log("Filling Task details...")
  await page.type('input[name="title"]', "Implement User Authentication")
  await captureFrame(800)

  // Select Sprint 1 from dropdown
  const sprintIdVal = await page.evaluate(() => {
    const select = document.querySelector('select[name="sprintId"]')
    if (!select) return null
    const option = Array.from(select.options).find(opt => opt.text.includes('Sprint 1: Core Setup'))
    return option ? option.value : null
  })
  if (sprintIdVal) {
    console.log(`Selecting sprintId option: ${sprintIdVal}`)
    await page.select('select[name="sprintId"]', sprintIdVal)
    await captureFrame(800)
  }

  // Type in TipTap description editor
  await page.focus('.ProseMirror')
  await page.type('.ProseMirror', "Set up NextAuth.js credentials provider and seed initial admin user.")
  await captureFrame(1200)

  console.log("Submitting Task Form...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const btn = btns.find(b => b.textContent.includes('Create Task') && b.type === 'submit')
    if (btn) btn.click()
  })
  await new Promise(r => setTimeout(r, 3000))
  await captureFrame(1800)

  // 11. Expand Sprint 1 to show the created task
  console.log("Expanding Sprint 1 accordion...")
  await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('h3'))
    const sprintHeader = headers.find(h => h.textContent.includes('Sprint 1: Core Setup'))
    if (sprintHeader) {
      const row = sprintHeader.closest('.flex.items-center.justify-between')
      const expandBtn = row ? row.querySelector('button') : null
      if (expandBtn) expandBtn.click()
    }
  })
  await new Promise(r => setTimeout(r, 1500))
  await captureFrame(2500) // Show task inside Sprint 1 list

  // 12. Navigate to Dashboard to show Activity Feed
  console.log("Navigating back to main Dashboard...")
  await page.evaluate(() => {
    const sidebarLinks = Array.from(document.querySelectorAll('a'))
    const homeLink = sidebarLinks.find(a => a.getAttribute('href') === '/')
    if (homeLink) homeLink.click()
  })
  await new Promise(r => setTimeout(r, 3500))
  
  // Scroll down to show Activity Feed on dashboard
  await page.evaluate(() => {
    const container = document.getElementById("dashboard-scroll-container")
    if (container) container.scrollTop = 500
  })
  await new Promise(r => setTimeout(r, 1000))
  await captureFrame(4000) // Stay on Activity Feed for 4s

  console.log("Compilation starting...")
  console.log(`Total captured frames: ${frames.length}`)
  
  await createGif(frames, path.join(outputDir, "highres-project-sprints.gif"), 1440, 900, delays)
  await createPreviewGif(frames, path.join(outputDir, "preview-project-sprints.gif"), 720, 450, delays)
  
  console.log("Cleaning up temp images...")
  frames.forEach(f => fs.unlinkSync(f))
  
  console.log("Finished generating project-sprints GIFs successfully!")
  await browser.close()
  await prisma.$disconnect()
  await pool.end()
}

run().catch(console.error)
