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

    // Get all habits for this user
    const habits = await prisma.habit.findMany({
      where: { userId },
      select: { id: true },
    });

    const habitIds = habits.map((h) => h.id);

    // Get all items (habits only) for this user
    const items = await prisma.item.findMany({
      where: { userId, itemType: 'habit' },
      select: { id: true },
    });

    const itemIds = items.map((i) => i.id);

    // Get completions for habits on the target date using range query
    const habitCompletions = habitIds.length > 0 ? await prisma.habitCompletion.findMany({
      where: {
        habitId: { in: habitIds },
        completionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        habitId: true,
      },
    }) : [];

    // Get completions for items on the target date using range query
    const itemCompletions = itemIds.length > 0 ? await prisma.itemCompletion.findMany({
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
    }) : [];

    // Return arrays of completed IDs
    const completedHabitIds = habitCompletions.map((c) => c.habitId);
    const completedItemIds = itemCompletions.map((c) => c.itemId);

    return NextResponse.json({
      completedHabitIds,
      completedItemIds,
      date: dateStr
    });
  } catch (error) {
    console.error("Error fetching completions:", error);
    return NextResponse.json(
      { error: "Failed to fetch completions" },
      { status: 500 }
    );
  }
}
