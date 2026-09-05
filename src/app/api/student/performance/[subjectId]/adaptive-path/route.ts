import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function GET(req: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const session = await getSession();
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // 1. Gather all quiz and exam performance for this subject
  const [quizzes, exams] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, quiz: { subjectId }, status: 'GRADED' },
      include: { quiz: true, answers: true }
    }),
    prisma.examRecord.findMany({
      where: { userId, subjectId },
      include: { subject: true }
    })
  ]);

  if (quizzes.length === 0 && exams.length === 0) {
    return NextResponse.json({ message: 'Not enough data to generate path yet. Take some quizzes!' });
  }

  // 2. Format performance data for AI analysis
  const performanceSummary = {
    quizzes: quizzes.map(q => ({
      title: q.quiz.title,
      topic: q.quiz.topic,
      scorePct: q.score // Assuming score is already a percentage or points
    })),
    exams: exams.map(e => ({
      title: e.title,
      scorePct: (e.marks / (e.maxMarks || 1)) * 100
    }))
  };

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    You are an expert academic counselor specialized in Biology. 
    Analyze the following performance data for a student in the subject of "${exams[0]?.subject.name || 'Biology'}":
    ${JSON.stringify(performanceSummary)}

    Return a strictly JSON response with the following keys:
    - analysis: String (A 2-sentence summary of their current standing)
    - weakTopics: Array of Strings (Top 3 topics they need to improve)
    - recommendedActions: Array of Objects, each with "topic", "action" (e.g. "Review Chapter 4 notes"), and "priority" ("High", "Medium")
    - encouragement: String (A motivating sentence)
    
    Keep the advice specific and scientifically grounded.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = JSON.parse(response.text());

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to generate adaptive path' }, { status: 500 });
  }
}
