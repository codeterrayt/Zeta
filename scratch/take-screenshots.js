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
  const sprintId = t1.sprintId
  console.log(`Found Sprint ID for task: ${sprintId}`)

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
  console.log("Capturing Dashboard Scroll frames with interactive hovers...")
  const dbFrames = []
  const dbDelays = []
  let dbFrameIdx = 0

  // Frame 1: View Top stats cards
  await hideDevOverlay(page)
  let dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
  await page.screenshot({ path: dbFPath })
  dbFrames.push(dbFPath)
  dbDelays.push(2000) // Stay at top for 2.0s
  dbFrameIdx++

  // Scroll down slowly to the charts (scroll position 0 to 350)
  for (let s = 10; s <= 350; s += 10) {
    await page.evaluate((scrollVal) => {
      const container = document.getElementById("dashboard-scroll-container")
      if (container) container.scrollTop = scrollVal
    }, s)
    await new Promise(r => setTimeout(r, 100))
    await hideDevOverlay(page)
    
    dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
    await page.screenshot({ path: dbFPath })
    dbFrames.push(dbFPath)
    dbDelays.push(100) // slow scroll delay
    dbFrameIdx++
  }

  // State 2: Hover over AreaChart to trigger Zoom and show tooltip (Velocity Trend)
  console.log("Hovering over Velocity Trend AreaChart...")
  const areaChartRect = await page.evaluate(() => {
    const el = document.querySelector('.recharts-area')?.closest('.recharts-wrapper')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  
  if (areaChartRect) {
    // Hover at the center of the chart first to trigger the hover zoom transition
    const centerX = areaChartRect.left + areaChartRect.width * 0.5
    const centerY = areaChartRect.top + areaChartRect.height * 0.5
    await page.mouse.move(centerX, centerY)
    await new Promise(r => setTimeout(r, 600)) // wait for zoom scaling animation (500ms)
    await hideDevOverlay(page)
    dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
    await page.screenshot({ path: dbFPath })
    dbFrames.push(dbFPath)
    dbDelays.push(800) // show zoomed state briefly
    dbFrameIdx++

    // Hover at 2 different points along the Velocity Trend chart
    const relativeXs = [0.35, 0.75]
    for (const relX of relativeXs) {
      const x = areaChartRect.left + areaChartRect.width * relX
      const y = areaChartRect.top + areaChartRect.height * 0.4
      await page.mouse.move(x, y)
      await new Promise(r => setTimeout(r, 400)) // wait for tooltip animation
      await hideDevOverlay(page)
      
      dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
      await page.screenshot({ path: dbFPath })
      dbFrames.push(dbFPath)
      dbDelays.push(1800) // View tooltip point for 1.8s
      dbFrameIdx++
    }
  }

  // State 3: Hover over BarChart to trigger Zoom and show tooltip (Project Load)
  console.log("Hovering over Project Load BarChart...")
  const barChartRect = await page.evaluate(() => {
    const el = document.querySelector('.recharts-bar')?.closest('.recharts-wrapper')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })

  if (barChartRect) {
    // Hover at the center of the chart first to trigger hover zoom transition
    const centerX = barChartRect.left + barChartRect.width * 0.5
    const centerY = barChartRect.top + barChartRect.height * 0.5
    await page.mouse.move(centerX, centerY)
    await new Promise(r => setTimeout(r, 600)) // wait for zoom scaling animation
    await hideDevOverlay(page)
    dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
    await page.screenshot({ path: dbFPath })
    dbFrames.push(dbFPath)
    dbDelays.push(800)
    dbFrameIdx++

    // Hover at 2 different points along the project workload bar chart
    const relativeYs = [0.35, 0.70]
    for (const relY of relativeYs) {
      const x = barChartRect.left + barChartRect.width * 0.6
      const y = barChartRect.top + barChartRect.height * relY
      await page.mouse.move(x, y)
      await new Promise(r => setTimeout(r, 400))
      await hideDevOverlay(page)
      
      dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
      await page.screenshot({ path: dbFPath })
      dbFrames.push(dbFPath)
      dbDelays.push(1800) // View tooltip point for 1.8s
      dbFrameIdx++
    }
  }

  // Scroll down further to the activity feed and cards (scroll position 350 to 650)
  // Move mouse out of charts first so tooltips disappear
  await page.mouse.move(10, 10)
  for (let s = 360; s <= 650; s += 10) {
    await page.evaluate((scrollVal) => {
      const container = document.getElementById("dashboard-scroll-container")
      if (container) container.scrollTop = scrollVal
    }, s)
    await new Promise(r => setTimeout(r, 100))
    await hideDevOverlay(page)
    
    dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
    await page.screenshot({ path: dbFPath })
    dbFrames.push(dbFPath)
    dbDelays.push(100)
    dbFrameIdx++
  }

  // State 4: Hover over Team Performance info icon button to trigger focus tooltip
  console.log("Hovering over Team Performance Info Button...")
  const infoBtnRect = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'))
    const infoDiv = divs.find(d => d.className.includes('group/info'))
    const btn = infoDiv ? infoDiv.querySelector('button') : null
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })

  if (infoBtnRect) {
    const x = infoBtnRect.left + infoBtnRect.width / 2
    const y = infoBtnRect.top + infoBtnRect.height / 2
    await page.mouse.move(x, y)
    await new Promise(r => setTimeout(r, 400)) // wait for tooltip display transition
    await hideDevOverlay(page)
    
    dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
    await page.screenshot({ path: dbFPath })
    dbFrames.push(dbFPath)
    dbDelays.push(2500) // View tooltip explanation for 2.5s
    dbFrameIdx++
  }

  // Scroll back to the top (scroll position 650 to 0)
  // Move mouse away to clear info button hover tooltip
  await page.mouse.move(10, 10)
  for (let s = 640; s >= 0; s -= 15) {
    await page.evaluate((scrollVal) => {
      const container = document.getElementById("dashboard-scroll-container")
      if (container) container.scrollTop = scrollVal
    }, s)
    await new Promise(r => setTimeout(r, 100))
    await hideDevOverlay(page)
    
    dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
    await page.screenshot({ path: dbFPath })
    dbFrames.push(dbFPath)
    dbDelays.push(100)
    dbFrameIdx++
  }

  // Final top view pause
  await hideDevOverlay(page)
  dbFPath = path.join(outputDir, `db-scroll-f-${dbFrameIdx}.png`)
  await page.screenshot({ path: dbFPath })
  dbFrames.push(dbFPath)
  dbDelays.push(1000)
  dbFrameIdx++

  console.log("Compiling Dashboard GIFs...")
  await createGif(dbFrames, path.join(outputDir, "highres-dashboard.gif"), 1440, 900, dbDelays)
  await createPreviewGif(dbFrames, path.join(outputDir, "preview-dashboard.gif"), 720, 450, dbDelays)
  
  // Cleanup temp files
  dbFrames.forEach(f => fs.unlinkSync(f))

  // ------------------ 2. KANBAN TRANSITION GIF ------------------
  console.log(`Navigating to sprint board: ${projectId}/sprints/${sprintId}...`)
  await page.goto(`http://localhost:3000/projects/${projectId}/sprints/${sprintId}`, { waitUntil: "networkidle2" })
  await new Promise(r => setTimeout(r, 4500))
  await hideDevOverlay(page)

  console.log("Capturing Kanban transitions...")
  const kbFrames = []
  const kbDelays = []
  let kbFrameIdx = 0

  // Helper to get coordinates
  const getCardCoord = async (tid) => {
    return await page.evaluate((id) => {
      const el = document.querySelector(`[data-rfd-draggable-id="${id}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }, tid)
  }

  const getColumnCoord = async (cid) => {
    return await page.evaluate((id) => {
      const el = document.querySelector(`[data-rfd-droppable-id="${id}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }, cid)
  }

  // Frame 1: Hover over task card in IN_PROGRESS
  let cardCoord = await getCardCoord(t1Id)
  if (cardCoord) {
    await page.mouse.move(cardCoord.x, cardCoord.y)
    await new Promise(r => setTimeout(r, 400))
  }
  await hideDevOverlay(page)
  let kbFPath = path.join(outputDir, `kb-f-${kbFrameIdx}.png`)
  await page.screenshot({ path: kbFPath })
  kbFrames.push(kbFPath)
  kbDelays.push(1500) // Hover for 1.5s
  kbFrameIdx++

  // Move from IN_PROGRESS to REVIEW
  console.log("Moving card from IN_PROGRESS to REVIEW...")
  let targetColCoord = await getColumnCoord("REVIEW")
  if (cardCoord && targetColCoord) {
    // Start database update
    await prisma.task.update({ where: { id: t1Id }, data: { status: "REVIEW" } })
    
    // Simulate mouse move from start to target in 5 frames
    const steps = 5
    for (let i = 1; i <= steps; i++) {
      const x = cardCoord.x + (targetColCoord.x - cardCoord.x) * (i / steps)
      const y = cardCoord.y + (targetColCoord.y - cardCoord.y) * (i / steps)
      await page.mouse.move(x, y)
      await new Promise(r => setTimeout(r, 150)) // wait for smooth animation
      await hideDevOverlay(page)
      
      kbFPath = path.join(outputDir, `kb-f-${kbFrameIdx}.png`)
      await page.screenshot({ path: kbFPath })
      kbFrames.push(kbFPath)
      kbDelays.push(150)
      kbFrameIdx++
    }
  } else {
    // Fallback if elements not found
    await prisma.task.update({ where: { id: t1Id }, data: { status: "REVIEW" } })
    await new Promise(r => setTimeout(r, 1800))
  }

  // Frame at REVIEW
  await new Promise(r => setTimeout(r, 600)) // ensure reactive updates completed
  await hideDevOverlay(page)
  cardCoord = await getCardCoord(t1Id)
  if (cardCoord) {
    await page.mouse.move(cardCoord.x, cardCoord.y)
  }
  kbFPath = path.join(outputDir, `kb-f-${kbFrameIdx}.png`)
  await page.screenshot({ path: kbFPath })
  kbFrames.push(kbFPath)
  kbDelays.push(1500) // Hover for 1.5s
  kbFrameIdx++

  // Move from REVIEW to DONE
  console.log("Moving card from REVIEW to DONE...")
  targetColCoord = await getColumnCoord("DONE")
  if (cardCoord && targetColCoord) {
    await prisma.task.update({ where: { id: t1Id }, data: { status: "DONE" } })
    
    const steps = 5
    for (let i = 1; i <= steps; i++) {
      const x = cardCoord.x + (targetColCoord.x - cardCoord.x) * (i / steps)
      const y = cardCoord.y + (targetColCoord.y - cardCoord.y) * (i / steps)
      await page.mouse.move(x, y)
      await new Promise(r => setTimeout(r, 150))
      await hideDevOverlay(page)
      
      kbFPath = path.join(outputDir, `kb-f-${kbFrameIdx}.png`)
      await page.screenshot({ path: kbFPath })
      kbFrames.push(kbFPath)
      kbDelays.push(150)
      kbFrameIdx++
    }
  } else {
    await prisma.task.update({ where: { id: t1Id }, data: { status: "DONE" } })
    await new Promise(r => setTimeout(r, 1800))
  }

  // Frame at DONE
  await new Promise(r => setTimeout(r, 600))
  await hideDevOverlay(page)
  cardCoord = await getCardCoord(t1Id)
  if (cardCoord) {
    await page.mouse.move(cardCoord.x, cardCoord.y)
  }
  kbFPath = path.join(outputDir, `kb-f-${kbFrameIdx}.png`)
  await page.screenshot({ path: kbFPath })
  kbFrames.push(kbFPath)
  kbDelays.push(1500)
  kbFrameIdx++

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

  // ------------------ 4. DOCUMENTATION ANIMATED FLOW GIF ------------------
  console.log("Navigating to documentation list for GIF captures...")
  await page.goto("http://localhost:3000/documentation", { waitUntil: "networkidle2" })
  await new Promise(r => setTimeout(r, 4000))
  await hideDevOverlay(page)

  const docFrames = []
  const docDelays = []
  let docFrameIdx = 0

  // Frame 1: List of documents
  fPath = path.join(outputDir, `doc-f-${docFrameIdx}.png`)
  await page.screenshot({ path: fPath })
  docFrames.push(fPath)
  docDelays.push(2000) // view list for 2s
  docFrameIdx++

  // Navigate to new document page
  console.log("Navigating to create document page...")
  await page.goto("http://localhost:3000/documentation/new", { waitUntil: "networkidle2" })
  await new Promise(r => setTimeout(r, 3000))
  await hideDevOverlay(page)

  // Frame 2: Empty create form
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `doc-f-${docFrameIdx}.png`)
  await page.screenshot({ path: fPath })
  docFrames.push(fPath)
  docDelays.push(1000) // show empty form for 1s
  docFrameIdx++

  // Frame 3+: Type title character by character
  const docTitle = "CI/CD Parallel Runner Specifications"
  await page.focus('input[placeholder="Document Title..."]')
  
  for (let i = 0; i < docTitle.length; i += 3) {
    const chunk = docTitle.substring(i, i + 3)
    await page.type('input[placeholder="Document Title..."]', chunk)
    await new Promise(r => setTimeout(r, 100))
    await hideDevOverlay(page)
    
    fPath = path.join(outputDir, `doc-f-${docFrameIdx}.png`)
    await page.screenshot({ path: fPath })
    docFrames.push(fPath)
    docDelays.push(100) // typing speed
    docFrameIdx++
  }

  // Type body content character-by-character
  const docBody = "Automated runners config. Mentions: @"
  await page.focus('.ProseMirror')
  
  for (let i = 0; i < docBody.length; i += 2) {
    const chunk = docBody.substring(i, i + 2)
    await page.type('.ProseMirror', chunk)
    await new Promise(r => setTimeout(r, 100))
    await hideDevOverlay(page)
    
    fPath = path.join(outputDir, `doc-f-${docFrameIdx}.png`)
    await page.screenshot({ path: fPath })
    docFrames.push(fPath)
    docDelays.push(100)
    docFrameIdx++
  }

  // Wait for mention autocomplete list to render
  await new Promise(r => setTimeout(r, 800))
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `doc-f-${docFrameIdx}.png`)
  await page.screenshot({ path: fPath })
  docFrames.push(fPath)
  docDelays.push(1000) // dropdown visible for 1s
  docFrameIdx++

  // Press Enter to select the mention
  await page.keyboard.press('Enter')
  await new Promise(r => setTimeout(r, 200))
  await hideDevOverlay(page)
  fPath = path.join(outputDir, `doc-f-${docFrameIdx}.png`)
  await page.screenshot({ path: fPath })
  docFrames.push(fPath)
  docDelays.push(800)
  docFrameIdx++

  // Click Publish Document button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const publishBtn = btns.find(b => b.textContent.includes('Publish Document'))
    if (publishBtn) publishBtn.click()
  })
  
  // Wait for redirect to /documentation
  await new Promise(r => setTimeout(r, 3500))
  await hideDevOverlay(page)
  
  // Final frame: Redirected back to documentation list with the new document published!
  fPath = path.join(outputDir, `doc-f-${docFrameIdx}.png`)
  await page.screenshot({ path: fPath })
  docFrames.push(fPath)
  docDelays.push(2500) // show final list for 2.5s

  console.log("Compiling Documentation GIFs...")
  await createGif(docFrames, path.join(outputDir, "highres-docs.gif"), 1440, 900, docDelays)
  await createPreviewGif(docFrames, path.join(outputDir, "preview-docs.gif"), 720, 450, docDelays)
  
  docFrames.forEach(f => fs.unlinkSync(f))

  console.log("All smooth animated GIFs and desktop layout previews generated successfully!")
  await browser.close()
  await prisma.$disconnect()
  await pool.end()
}

run().catch(console.error)
