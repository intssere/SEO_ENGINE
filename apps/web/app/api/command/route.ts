import { NextResponse } from "next/server";
import { answerOperationalQuestion } from "../../../lib/operational-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { question?: unknown };
    if (typeof body.question !== "string" || body.question.trim().length < 2 || body.question.length > 500) {
      return NextResponse.json({ answer: "Enter a short operational SEO question." }, { status: 400 });
    }
    const answer = await answerOperationalQuestion(body.question);
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: "SEO ENGINE could not process that read-only query." }, { status: 500 });
  }
}
