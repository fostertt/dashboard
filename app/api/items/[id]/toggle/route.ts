import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// POST /api/items/[id]/toggle - Toggle item completion for a date
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const itemId = parseInt(id);
    const { date } = await request.json();

    // Check ownership
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { userId: true, itemType: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only habits can be toggled with completion tracking
    if (item.itemType !== 'habit') {
      return NextResponse.json(
        { error: 'Only habits can be toggled' },
        { status: 400 }
      );
    }

    // Normalize to YYYY-MM-DD format, then create Date object at start of day UTC
    let dateStr: string;
    if (date) {
      dateStr = date;
    } else {
      const today = new Date();
      dateStr = today.toISOString().split("T")[0];
    }

    // Create date at start of day in UTC for consistent storage
    const completionDate = new Date(dateStr + "T00:00:00.000Z");

    // Check if already completed (use range query to handle any timezone variations)
    const startOfDay = new Date(dateStr + "T00:00:00.000Z");
    const endOfDay = new Date(dateStr + "T23:59:59.999Z");

    const existing = await prisma.itemCompletion.findFirst({
      where: {
        itemId: itemId,
        completionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existing) {
      // Remove completion
      await prisma.itemCompletion.delete({
        where: { id: existing.id },
      });

      return NextResponse.json({ completed: false });
    } else {
      // Add completion
      await prisma.itemCompletion.create({
        data: {
          itemId: itemId,
          completionDate: completionDate,
          createdAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({ completed: true });
    }
  } catch (error) {
    console.error("Error toggling item:", error);
    return NextResponse.json(
      { error: "Failed to toggle item" },
      { status: 500 }
    );
  }
}
