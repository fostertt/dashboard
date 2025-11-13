import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/items/[id]/toggle - Toggle item completion for a specific date
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = "48868489";
    const itemId = parseInt(params.id);
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    // Check if item exists and belongs to user
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Parse the date
    const completionDate = new Date(date);

    // Check if completion exists for this date
    const existingCompletion = await prisma.itemCompletion.findFirst({
      where: {
        itemId,
        completionDate,
      },
    });

    if (existingCompletion) {
      // Remove completion
      await prisma.itemCompletion.delete({
        where: {
          id: existingCompletion.id,
        },
      });

      return NextResponse.json({ completed: false });
    } else {
      // Add completion
      await prisma.itemCompletion.create({
        data: {
          itemId,
          completionDate,
        },
      });

      return NextResponse.json({ completed: true });
    }
  } catch (error) {
    console.error("Error toggling item completion:", error);
    return NextResponse.json(
      { error: "Failed to toggle item completion" },
      { status: 500 }
    );
  }
}
