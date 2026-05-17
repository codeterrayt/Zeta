"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function summarizeThread(threadContent: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { success: false, error: "Gemini API key is missing" }
    }

    // We can use gemini-1.5-pro or gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `Summarize the following Zeta-style discussion thread or task history. Highlight the main decisions, current blockers, and next steps in a concise bulleted list.\n\nThread Content:\n${threadContent}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return { success: true, summary: text }
  } catch (error) {
    console.error("Gemini AI Error:", error)
    return { success: false, error: "Failed to generate summary" }
  }
}
