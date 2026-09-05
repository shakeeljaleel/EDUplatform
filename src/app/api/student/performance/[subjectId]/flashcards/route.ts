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

  try {
    // 1. Get student performance (quizzes & exams)
    const [quizzes, exams, objectives, subject] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId, quiz: { subjectId }, status: 'GRADED' },
        include: { quiz: true }
      }),
      prisma.examRecord.findMany({
        where: { userId, subjectId }
      }),
      prisma.syllabusObjective.findMany({
        where: { subjectId }
      }),
      prisma.subject.findUnique({
        where: { id: subjectId }
      })
    ]);

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const performanceSummary = {
      quizzes: quizzes.map(q => ({
        title: q.quiz.title,
        topic: q.quiz.topic,
        score: q.score
      })),
      exams: exams.map(e => ({
        title: e.title,
        scorePct: (e.marks / (e.maxMarks || 100)) * 100
      })),
      objectives: objectives.map(obj => ({
        code: obj.code,
        description: obj.description
      }))
    };

    // 2. Query Gemini to generate flashcards
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert tutor specialized in "${subject.name}".
      Based on the student's performance data and learning objectives, generate a set of 5-8 revision flashcards.
      If the student has weak spots (low quiz or exam scores), focus the cards on those weak topics.
      If there is little performance data, base the cards on the syllabus learning objectives.

      Data:
      ${JSON.stringify(performanceSummary)}

      Return a strictly JSON response that contains an array of flashcard objects:
      {
        "flashcards": [
          {
            "id": "unique-id-1",
            "front": "Question or concept (e.g. What is the powerhouse of the cell?)",
            "back": "Answer or explanation (e.g. Mitochondria, which generates ATP through cellular respiration.)",
            "category": "Topic Name (e.g. Cell Biology)"
          },
          ...
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Flashcard Generation Error:', err);
    return NextResponse.json({ error: 'Failed to generate flashcards: ' + err.message }, { status: 500 });
  }
}
