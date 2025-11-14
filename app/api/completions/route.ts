import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET /api/completions?date=YYYY-MM-DD - Get all completions for a specific date
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.id;

    // Get date from query params, default to today
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // Normalize to YYYY-MM-DD format for consistent comparison
    let dateStr: string;
    if (dateParam) {
      dateStr = dateParam;
    } else {
      const today = new Date();
      dateStr = today.toISOString().split("T")[0];
    }

    // Create date object for start and end of day (for range query)
    const startOfDay = new Date(dateStr + "T00:00:00.000Z");
    const endOfDay = new Date(dateStr + "T23:59:59.999Z");

    // Get all habits for this user (only recurring items)
    const items = await prisma.item.findMany({
      where: {
        userId,
        itemType: "habit",
        scheduleType: "daily"
      },
      select: { id: true },
    });

    const itemIds = items.map((item) => item.id);

    if (itemIds.length === 0) {
      return NextResponse.json({ completedHabitIds: [], date: dateStr });
    }

    // Get completions for these habits on the target date using range query
    const completions = await prisma.itemCompletion.findMany({
      where: {
        itemId: { in: itemIds },
        completionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        itemId: true,
      },
    });

    // Return array of completed habit IDs
    const completedHabitIds = completions.map((c) => c.itemId);

    return NextResponse.json({ completedHabitIds, date: dateStr });
  } catch (error) {
    console.error("Error fetching completions:", error);
    return NextResponse.json(
      { error: "Failed to fetch completions" },
      { status: 500 }
    );
  }
}
