
import { GoogleGenAI, Type } from "@google/genai";
import { SubjectInput, PlanPreferences, GeneratedPlan, DailyPlan, GroupMessage } from "../types";

// Initialize the Gemini Client
// We must access process.env.API_KEY directly for the environment variable replacement to work correctly in the build/runtime.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.STRING,
      description: "A strategic summary of the study plan, explaining the logic behind allocation."
    },
    schedule: {
      type: Type.ARRAY,
      description: "The daily schedule generated.",
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
          totalStudyTime: { type: Type.NUMBER, description: "Total minutes planned for this day" },
          sessions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subjectName: { type: Type.STRING },
                durationMinutes: { type: Type.NUMBER },
                focusTopic: { type: Type.STRING, description: "Specific sub-topic or Chapter to focus on" },
                reasoning: { type: Type.STRING, description: "Why this subject/duration was chosen now" }
              },
              required: ["subjectName", "durationMinutes", "focusTopic", "reasoning"]
            }
          }
        },
        required: ["date", "sessions", "totalStudyTime"]
      }
    },
    stats: {
      type: Type.OBJECT,
      properties: {
        subjectAllocation: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              totalMinutes: { type: Type.NUMBER }
            },
            required: ["name", "totalMinutes"]
          }
        }
      },
      required: ["subjectAllocation"]
    }
  },
  required: ["overview", "schedule", "stats"]
};

// Schema for Image Analysis
const SYLLABUS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Name of the subject or course" },
      difficulty: { type: Type.NUMBER, description: "Inferred difficulty 1-10 based on complexity" },
      examDate: { type: Type.STRING, description: "Exam date in YYYY-MM-DD format (infer next likely date if not explicit)" },
      chapters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            difficulty: { type: Type.NUMBER },
            isHighPriority: { type: Type.BOOLEAN }
          }
        }
      }
    },
    required: ["name", "difficulty", "examDate"]
  }
};

export const parseSyllabusImage = async (base64Image: string): Promise<SubjectInput[]> => {
  const prompt = `
    Analyze this image (syllabus, exam schedule, or study plan).
    Extract all distinct subjects/courses found.
    
    For each subject:
    1. Identify the Name.
    2. Infer a Difficulty (1-10) based on the complexity of the topic (e.g., Advanced Calculus = 8, Intro to Art = 3).
    3. Extract or infer the next Exam Date (YYYY-MM-DD). If only a day/month is shown, assume the next occurrence.
    4. If specific chapters/modules are listed under the subject, extract them.
    
    Return a JSON array of subjects.
  `;

  try {
    // Use Gemini 3 Pro Preview for multimodal image understanding as requested
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: SYLLABUS_SCHEMA,
        thinkingConfig: {
          thinkingBudget: 1024 // Allocate some budget for analyzing complex documents
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsedData = JSON.parse(text);
    
    // Map to SubjectInput structure with IDs
    return parsedData.map((s: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: s.name,
      difficulty: s.difficulty || 5,
      examDate: s.examDate || new Date().toISOString().split('T')[0],
      currentConfidence: 50,
      isHighPriority: false,
      chapters: (s.chapters || []).map((c: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: c.name,
        difficulty: c.difficulty || 5,
        isHighPriority: c.isHighPriority || false
      }))
    }));

  } catch (error) {
    console.error("Syllabus Analysis Error:", error);
    throw error;
  }
};

export const generateStudyPlan = async (
  subjects: SubjectInput[],
  preferences: PlanPreferences
): Promise<GeneratedPlan> => {
  
  const today = new Date().toISOString().split('T')[0];

  const prompt = `
    Act as an expert Academic Planning Agent.
    
    Context:
    Current Date: ${today}
    Start Date: ${preferences.startDate}
    Daily Available Minutes: ${preferences.dailyAvailableHours * 60}
    
    Subjects & Constraints:
    ${JSON.stringify(subjects, null, 2)}
    
    Goal:
    Create a realistic, weighted study schedule for the next 7 days.
    
    Reasoning Rules:
    0. **STRICT PRIORITY OVERRIDE**: Any subject (or specific CHAPTER within a subject) with "isHighPriority": true MUST be prioritized above all others. It should appear in the schedule daily or as frequently as possible.
    1. **Chapter Breakdown**: 
       - IF a subject has 'chapters' listed: Assign specific chapters to sessions as the 'focusTopic'. Prioritize chapters that are high difficulty or high priority.
       - IF a subject has NO 'chapters' listed: The 'focusTopic' MUST be "General Review" or "Core Concepts". DO NOT invent or hallucinate specific chapter names if none are provided in the input.
    2. Prioritize subjects with upcoming exams (Urgency).
    3. Allocate more time to higher difficulty ratings (Complexity).
    4. Don't burn the student out; allow short breaks implied between sessions (but fill the available daily hours).
    5. If an exam is tomorrow, focus exclusively on that subject.
    6. Break down sessions into manageable chunks (e.g., 45-90 mins).
    
    Task:
    Generate a JSON response containing the daily schedule.
  `;

  try {
    // Using Flash for speed, but requesting Thinking for the logic of allocation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        // Enable thinking to allow the model to calculate weights and time distribution
        thinkingConfig: {
          thinkingBudget: 2048 
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as GeneratedPlan;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const rescheduleStudyPlan = async (
  subjects: SubjectInput[],
  preferences: PlanPreferences,
  currentPlan: GeneratedPlan
): Promise<GeneratedPlan> => {
  const today = new Date().toISOString().split('T')[0];

  // Identify missed sessions
  const missedSessions: any[] = [];
  const completedSessions: any[] = [];

  currentPlan.schedule.forEach(day => {
    day.sessions.forEach(session => {
      if (session.status === 'missed') {
        missedSessions.push({ ...session, originalDate: day.date });
      } else if (session.status === 'completed') {
        completedSessions.push(session);
      }
    });
  });

  const prompt = `
    Act as an intelligent Study Coach. The user has fallen behind on their schedule and needs a **Smart Reschedule**.

    Context:
    Current Date: ${today}
    Remaining Days in original plan: Start from tomorrow or today depending on time.
    Daily Available Minutes: ${preferences.dailyAvailableHours * 60}

    Missed Sessions (MUST be re-integrated):
    ${JSON.stringify(missedSessions, null, 2)}

    Completed Sessions (Do NOT schedule these again):
    ${JSON.stringify(completedSessions, null, 2)}

    Subjects Context:
    ${JSON.stringify(subjects, null, 2)}

    Goal:
    Regenerate the study plan starting from ${today}.
    1. Take all 'Missed Sessions' and redistribute them intelligently into the coming days.
    2. Do not schedule topics that are already 'Completed'.
    3. Maintain the priority rules (High Priority subjects first).
    4. Adjust the overview to explain how the schedule was adapted (e.g., "I've moved your missed Calculus session to Saturday and increased daily load slightly").

    Return the full JSON schedule structure.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingBudget: 2048
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as GeneratedPlan;

  } catch (error) {
    console.error("Reschedule Error:", error);
    throw error;
  }
};

export const suggestVideoResources = async (subject: string) => {
  const prompt = `
    Generate 3 high-quality, specific video search queries for finding educational videos on YouTube about: "${subject}".
    The queries should target core concepts or difficult topics within this subject.
    
    Return ONLY a JSON array of strings. Example: ["Calculus derivatives explained", "Chain rule examples", "Limits and continuity visualization"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Video Suggestion Error:", error);
    return [];
  }
}

export const summarizeGroupChat = async (messages: GroupMessage[]) => {
  const transcript = messages
    .slice(-50) // Last 50 messages
    .map(m => `${m.userName}: ${m.content}`)
    .join('\n');

  const prompt = `
    Summarize the following study group chat conversation in 3-5 bullet points. 
    Focus on key decisions, study topics discussed, or shared resources.
    Keep it concise and helpful for someone who just joined.
    
    Chat Transcript:
    ${transcript}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    return response.text || "No summary available.";
  } catch (error) {
    console.error("Summarization Error:", error);
    return "Failed to generate summary.";
  }
};

export const generateBotReply = async (groupName: string, userMessage: string, botName: string): Promise<string> => {
  const prompt = `
    You are acting as a student named "${botName}" in a study group chat for "${groupName}".
    
    Recent message from a real user: "${userMessage}"
    
    Task: Write a short, natural reply (max 15 words).
    Persona: Student, helpful but casual. Use slang/abbreviations like 'lol', 'idk', 'rn' if appropriate.
    Do NOT sound like an AI assistant. Sound like a peer.
    
    Reply text only:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Bot Reply Generation Error:", error);
    return ""; // Return empty to signal fallback to static responses
  }
};

export const generateBotTopic = async (groupName: string, botName: string): Promise<string> => {
  const prompt = `
    Act as a student named "${botName}" in a study group for "${groupName}".
    Post a short message (1 sentence) starting a conversation about a specific hard topic in this subject.
    Example: "Does anyone actually understand Eigenvectors?"
    Text only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    return "";
  }
};

export const generateBotStudyTip = async (groupName: string, botName: string): Promise<string> => {
  const prompt = `
    Act as a student named "${botName}" in a study group for "${groupName}".
    Share a very short (1 sentence) specific study tip, mnemonic, or resource recommendation for this subject.
    Example: "For history dates, I just make a timeline on my wall." or "Wolfram Alpha is the only reason I'm passing calc."
    Casual tone.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    return "";
  }
};

export const generateICS = (plan: GeneratedPlan) => {
  let icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MindMap AI//Study Planner//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  plan.schedule.forEach(day => {
    // We'll assume a start time of 09:00 AM for the first session
    // and increment by duration + 15 min break
    let currentHour = 9;
    let currentMinute = 0;

    const dateStr = day.date.replace(/-/g, ''); // YYYYMMDD

    day.sessions.forEach(session => {
      // Format Start Time
      const startH = currentHour.toString().padStart(2, '0');
      const startM = currentMinute.toString().padStart(2, '0');
      const dtStart = `${dateStr}T${startH}${startM}00`;

      // Calculate End Time
      let endMinute = currentMinute + session.durationMinutes;
      let endHour = currentHour + Math.floor(endMinute / 60);
      endMinute = endMinute % 60;

      const endH = endHour.toString().padStart(2, '0');
      const endM = endMinute.toString().padStart(2, '0');
      const dtEnd = `${dateStr}T${endH}${endM}00`;

      icsContent += 
`BEGIN:VEVENT
SUMMARY:Study: ${session.subjectName}
DTSTART:${dtStart}
DTEND:${dtEnd}
DESCRIPTION:Focus Topic: ${session.focusTopic}\\nReasoning: ${session.reasoning}
STATUS:CONFIRMED
END:VEVENT
`;

      // Increment time for next session (Session + 15m break)
      currentMinute = endMinute + 15;
      currentHour = endHour + Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    });
  });

  icsContent += `END:VCALENDAR`;

  // Trigger Download
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'mindmap_study_plan.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
