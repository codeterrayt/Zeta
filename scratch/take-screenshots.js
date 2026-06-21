const puppeteer = require("puppeteer-core")
const { Pool } = require("pg")
const { PrismaPg } = require("@prisma/adapter-pg")
const { PrismaClient } = require("@prisma/client")
const fs = require("fs")
const path = require("path")
const GIFEncoder = require("gif-encoder-2")
const { PNG } = require("pngjs")

require("dotenv").config()

const outputDir = "D:\\Projects\\OpenJiraLanding\\public\\screenshots"
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// 2x Nearest-Neighbor Downsampler to scale 1440x900 desktop viewport to 720x450 desktop preview
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

// Helper to create the low-res preview version of the GIF by downsampling the same desktop frames
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
  console.log("Connecting to DB to fetch Project ID and Chat Group ID...")
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  
  const project = await prisma.project.findFirst()
  if (!project) {
    console.error("No project found!")
    process.exit(1)
  }
  const projectId = project.id
  console.log(`Found Project ID: ${projectId}`)

  const chatGroup = await prisma.chatGroup.findFirst({
    where: { name: "Engineering core" }
  })
  if (!chatGroup) {
    console.error("No chat group found!")
    process.exit(1)
  }
  const chatGroupId = chatGroup.id
  console.log(`Found Chat Group ID: ${chatGroupId}`)

  const t1 = await prisma.task.findFirst({
    where: { title: { startsWith: "OPEN-T3B2" } }
  })
  const t1Id = t1.id

  console.log("Launching Microsoft Edge in Desktop Viewport (1440x900)...")
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  })
  
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  
  console.log("Navigating to login page...")
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" })
  
  console.log("Filling login form...")
  await page.type('input[name="email"]', "admin@zeta.dev")
  await page.type('input[name="password"]', "password123")
  
  console.log("Clicking sign-in...")
  await page.click('button[type="submit"]')
  
  console.log("Waiting 6 seconds for login and dashboard layout to load...")
  await new Promise(r => setTimeout(r, 6000))
  await hideDevOverlay(page)
  
  // ------------------ 1. DASHBOARD SMOOTH SCROLLING GIF ------------------
  console.log("Capturing Dashboard Scroll frames...")
  const dbFrames = []
  
  // Smooth scroll down and up
  const dbScrollSteps = []
  for (let s = 0; s <= 600; s += 30) dbScrollSteps.push(s)
  for (let s = 570; s >= 30; s -= 30) dbScrollSteps.push(s)
  
  const dbDelays = dbScrollSteps.map(() => 50) // 50ms per frame for smooth 20 FPS scrolling
  
  for (let i = 0; i < dbScrollSteps.length; i++) {
    const scrollVal = dbScrollSteps[i]
    await page.evaluate((s) => {
      const container = document.getElementById("dashboard-scroll-container")
      if (container) container.scrollTop = s
    }, scrollVal)
    await new Promise(r => setTimeout(r, 50)) // wait 50ms for smooth repaint
    await hideDevOverlay(page)
    
    const fPath = path.join(outputDir, `db-scroll-f-${i}.png`)
    await page.screenshot({ path: fPath })
    dbFrames.push(fPath)
  }
  
  console.log("Compiling Dashboard GIFs...")
  await createGif(dbFrames, path.join(outputDir, "highres-dashboard.gif"), 1440, 900, dbDelays)
  await createPreviewGif(dbFrames, path.join(outputDir, "preview-dashboard.gif"), 720, 450, dbDelays)
  
  // Cleanup temp files
  dbFrames.forEach(f => fs.unlinkSync(f))

  // ------------------ 2. KANBAN TRANSITION GIF ------------------
  console.log(`Navigating to project board: ${projectId}...`)
  await page.goto(`http://localhost:3000/projects/${projectId}`, { waitUntil: "networkidle2" })
  await new Promise(r => setTimeout(r, 4000))
  await hideDevOverlay(page)

  console.log("Capturing Kanban transitions...")
  const kbFrames = []
  const kbDelays = [1500, 1500, 1500] // Stay on each state for 1.5s
  
  // Frame 1: In Progress
  await hideDevOverlay(page)
  let fPath = path.join(outputDir, "kb-f-0.png")
  await page.screenshot({ path: fPath })
  kbFrames.push(fPath)

  // Frame 2: Review
  await prisma.task.update({ where: { id: t1Id }, data: { status: "REVIEW" } })
  await new Promise(r => setTimeout(r, 1800))
  await hideDevOverlay(page)
  fPath = path.join(outputDir, "kb-f-1.png")
  await page.screenshot({ path: fPath })
  kbFrames.push(fPath)

  // Frame 3: Done
  await prisma.task.update({ where: { id: t1Id }, data: { status: "DONE" } })
  await new Promise(r => setTimeout(r, 1800))
  await hideDevOverlay(page)
  fPath = path.join(outputDir, "kb-f-2.png")
  await page.screenshot({ path: fPath })
  kbFrames.push(fPath)

  console.log("Compiling Kanban GIFs...")
  await createGif(kbFrames, path.join(outputDir, "highres-kanban.gif"), 1440, 900, kbDelays)
  await createPreviewGif(kbFrames, path.join(outputDir, "preview-kanban.gif"), 720, 450, kbDelays)
  
  kbFrames.forEach(f => fs.unlinkSync(f))

  // Reset status
  await prisma.task.update({ where: { id: t1Id }, data: { status: "IN_PROGRESS" } })
  await new Promise(r => setTimeout(r, 1000))

  // ------------------ 3. CHAT SMOOTH TYPING ANIMATION GIF ------------------
  console.log(`Navigating to chat room: ${chatGroupId}...`)
  await page.goto(`http://localhost:3000/chat?chatGroupId=${chatGroupId}`, { waitUntil: "networkidle2" })
  await new Promise(r => setTimeout(r, 4500))
  await hideDevOverlay(page)

  console.log("Capturing Chat Typing frames...")
  const chatFrames = []
  const chatDelays = []
  
  let frameIndex = 0
  
  // 1. Initial State
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `chat-f-${frameIndex}.png`)
  await page.screenshot({ path: fPath })
  chatFrames.push(fPath)
  chatDelays.push(800) // Delay of 800ms
  frameIndex++

  // 2. Type text base character-by-character
  const text1 = "Checking action scripts "
  await page.focus('.ProseMirror')
  
  for (let i = 0; i < text1.length; i += 2) {
    const chunk = text1.substring(i, i + 2)
    await page.type('.ProseMirror', chunk)
    await new Promise(r => setTimeout(r, 100))
    await hideDevOverlay(page)
    
    fPath = path.join(outputDir, `chat-f-${frameIndex}.png`)
    await page.screenshot({ path: fPath })
    chatFrames.push(fPath)
    chatDelays.push(100) // Typing speed
    frameIndex++
  }

  // 3. Type '@' (Trigger mention autocomplete)
  await page.type('.ProseMirror', '@')
  await new Promise(r => setTimeout(r, 800)) // wait for dropdown animation
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `chat-f-${frameIndex}.png`)
  await page.screenshot({ path: fPath })
  chatFrames.push(fPath)
  chatDelays.push(1000) // Keep dropdown visible for 1s
  frameIndex++

  // 4. Press enter to select the mention
  await page.keyboard.press('Enter')
  await new Promise(r => setTimeout(r, 200))
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `chat-f-${frameIndex}.png`)
  await page.screenshot({ path: fPath })
  chatFrames.push(fPath)
  chatDelays.push(600)
  frameIndex++

  // 5. Type ' and @file:' (Trigger file autocomplete)
  const text2 = " and @file:"
  for (let i = 0; i < text2.length; i++) {
    await page.type('.ProseMirror', text2[i])
    await new Promise(r => setTimeout(r, 50))
  }
  await new Promise(r => setTimeout(r, 800)) // wait for dropdown animation
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `chat-f-${frameIndex}.png`)
  await page.screenshot({ path: fPath })
  chatFrames.push(fPath)
  chatDelays.push(1000) // Keep dropdown visible for 1s
  frameIndex++

  // 6. Press enter to select the file mention
  await page.keyboard.press('Enter')
  await new Promise(r => setTimeout(r, 200))
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `chat-f-${frameIndex}.png`)
  await page.screenshot({ path: fPath })
  chatFrames.push(fPath)
  chatDelays.push(600)
  frameIndex++

  // 7. Click send button and wait for message post
  await page.click('button.bg-primary')
  await new Promise(r => setTimeout(r, 1200)) // wait for render
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `chat-f-${frameIndex}.png`)
  await page.screenshot({ path: fPath })
  chatFrames.push(fPath)
  chatDelays.push(2000) // Stay on sent state for 2s

  console.log("Compiling Chat GIFs...")
  await createGif(chatFrames, path.join(outputDir, "highres-chat.gif"), 1440, 900, chatDelays)
  await createPreviewGif(chatFrames, path.join(outputDir, "preview-chat.gif"), 720, 450, chatDelays)
  
  chatFrames.forEach(f => fs.unlinkSync(f))

  // ------------------ 4. DOCUMENTATION STATIC IMAGES ------------------
  console.log("Navigating to documentation for static captures...")
  await page.goto("http://localhost:3000/documentation", { waitUntil: "networkidle2" })
  await new Promise(r => setTimeout(r, 4000))
  await hideDevOverlay(page)
  
  console.log("Capturing Documentation...")
  const docPath = path.join(outputDir, "highres-docs.png")
  await page.screenshot({ path: docPath })
  
  // Use our JS downsampler to create the preview docs image as a desktop downsampled layout
  const docPng = await new Promise((res, rej) => {
    fs.createReadStream(docPath)
      .pipe(new PNG())
      .on("parsed", function() { res(this) })
      .on("error", rej)
  })
  const previewDocPng = downsample2x(docPng)
  await new Promise((res, rej) => {
    const writeStream = fs.createWriteStream(path.join(outputDir, "preview-docs.png"))
    previewDocPng.pack().pipe(writeStream)
    writeStream.on("finish", res)
    writeStream.on("error", rej)
  })

  console.log("All smooth animated GIFs and desktop layout previews generated successfully!")
  await browser.close()
  await prisma.$disconnect()
  await pool.end()
}

run().catch(console.error)
