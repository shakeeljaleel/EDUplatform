import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = await params;
  const session = await getSession();
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { topic, syllabusObjectiveId, teacherNotes } = await req.json();

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { batch: true }
  });

  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  let syllabusContext = "";
  if (syllabusObjectiveId) {
    const objective = await prisma.syllabusObjective.findUnique({
      where: { id: syllabusObjectiveId }
    });
    if (objective) {
      syllabusContext = `STRICT SYLLABUS REQUIREMENT [${objective.code}]: ${objective.description}. `;
    }
  }

  const teacherContext = teacherNotes ? `INTEGRATE TEACHER NOTES: ${teacherNotes}. ` : "";

  // Caching/Reuse Logic
  const existingPlan = await prisma.lessonPlan.findFirst({
    where: {
      subjectId,
      syllabusObjectiveId: syllabusObjectiveId || undefined,
      title: { contains: topic }
    }
  });

  if (existingPlan && !teacherNotes) {
    return NextResponse.json(existingPlan);
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    You are an expert Biology teacher for Edexcel/Cambridge curriculums. 
    Create a comprehensive lesson plan for the topic: "${topic}".
    The subject is "${subject.name}" for the batch "${subject.batch.name}".
    
    ${syllabusContext}
    ${teacherContext}
    
    Return the response strictly in JSON format with the following keys:
    - title: String (A catchy title for the lesson)
    - objectives: String (A Markdown list of 3-5 learning objectives, prioritized by syllabus requirements)
    - content: String (Extensive lesson content in Markdown, integrating any teacher notes provided. Include sections like Introduction, Key Concepts, Syllabus Alignment, and Conclusion)
    - keywords: String (A comma-separated list of 5-8 key scientific terms)
    - quizDraft: Array of Objects (3 multiple choice questions based on the content)

    Ensure the content is scientifically accurate, strictly aligned with the syllabus objective if provided, and engaging.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const data = JSON.parse(text);

    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        subjectId,
        teacherId: session.user.id,
        syllabusObjectiveId: syllabusObjectiveId || null,
        title: data.title,
        objectives: data.objectives,
        content: data.content,
        keywords: data.keywords,
        quizDraft: JSON.stringify(data.quizDraft),
      }
    });

    return NextResponse.json(lessonPlan);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to generate lesson plan' }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plans = await prisma.lessonPlan.findMany({
    where: { subjectId },
    include: { syllabusObjective: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(plans);
}
