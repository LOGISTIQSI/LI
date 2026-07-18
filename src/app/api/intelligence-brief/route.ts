import { NextRequest, NextResponse } from "next/server";
import { generateDailyBrief, getStoredBrief } from "@/lib/ai/executive";

/**
 * GET /api/intelligence-brief?company_id=X
 *   - Returns today's brief if already generated, or generates a new one
 *
 * GET /api/intelligence-brief?company_id=X&date=YYYY-MM-DD
 *   - Returns historical brief if it exists (does NOT auto-generate for past dates)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = parseInt(searchParams.get("company_id") || "1", 10);
  const dateParam = searchParams.get("date") || "";

  const today = new Date().toISOString().slice(0, 10);
  const targetDate = dateParam || today;

  // Only auto-generate for today's date
  const shouldAutoGenerate = targetDate === today;

  try {
    // Check if brief already exists for the requested date
    let brief = await getStoredBrief(companyId, targetDate);

    if (!brief && shouldAutoGenerate) {
      // Generate new brief for today
      brief = await generateDailyBrief(companyId, targetDate);
    }

    if (!brief) {
      return NextResponse.json(
        { error: `No brief found for ${targetDate}. Briefs are only auto-generated for today.` },
        { status: 404 }
      );
    }

    return NextResponse.json(brief);
  } catch (err) {
    console.error("Failed to get intelligence brief:", err);
    return NextResponse.json(
      { error: "Failed to generate intelligence brief" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/intelligence-brief
 *   - Force-regenerate today's brief
 *   Body: { company_id?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const companyId = body.company_id || 1;
    const today = new Date().toISOString().slice(0, 10);

    const brief = await generateDailyBrief(companyId, today);

    return NextResponse.json(brief, { status: 201 });
  } catch (err) {
    console.error("Failed to generate intelligence brief:", err);
    return NextResponse.json(
      { error: "Failed to generate intelligence brief" },
      { status: 500 }
    );
  }
}
