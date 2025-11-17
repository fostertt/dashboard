import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/items/[id]/toggle - Toggle item completion for a specific date
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id } = await params;
    const itemId = parseInt(id);
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
      include: {
        subItems: {
          include: {
            completions: true,
          },
        },
        listItem: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Determine if this is a recurring item (habit with schedule) or one-time item (task/reminder)
    const isRecurring = item.scheduleType && item.scheduleType !== "";

    if (isRecurring) {
      // For recurring items (habits): use ItemCompletion table to track by date
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
        // Check if this is a parent with incomplete sub-items
        if (item.isParent && item.subItems && item.subItems.length > 0) {
          // For recurring items, check if all sub-items have completions for this date
          const incompleteSubItems = item.subItems.filter((subItem) => {
            const hasCompletionForDate = subItem.completions.some(
              (c) =>
                new Date(c.completionDate).toDateString() ===
                completionDate.toDateString()
            );
            return !hasCompletionForDate;
          });

          if (incompleteSubItems.length > 0) {
            return NextResponse.json(
              {
                error: "Cannot complete parent item until all sub-items are completed",
                incompleteCount: incompleteSubItems.length,
              },
              { status: 400 }
            );
          }
        }

        // Add completion
        await prisma.itemCompletion.create({
          data: {
            itemId,
            completionDate,
          },
        });

        return NextResponse.json({ completed: true });
      }
    } else {
      // For non-recurring items (tasks/reminders): toggle isCompleted field
      const newCompletedState = !item.isCompleted;

      // Check if this is a parent with incomplete sub-items (only when trying to complete)
      if (
        newCompletedState &&
        item.isParent &&
        item.subItems &&
        item.subItems.length > 0
      ) {
        const incompleteSubItems = item.subItems.filter(
          (subItem) => !subItem.isCompleted
        );

        if (incompleteSubItems.length > 0) {
          return NextResponse.json(
            {
              error: "Cannot complete parent item until all sub-items are completed",
              incompleteCount: incompleteSubItems.length,
            },
            { status: 400 }
          );
        }
      }

      await prisma.item.update({
        where: { id: itemId },
        data: {
          isCompleted: newCompletedState,
          completedAt: newCompletedState ? new Date().toISOString() : null,
        },
      });

      // Sync with linked list item if exists
      if (item.listItem) {
        await prisma.listItem.update({
          where: { id: item.listItem.id },
          data: { isChecked: newCompletedState },
        });
      }

      return NextResponse.json({ completed: newCompletedState });
    }
  } catch (error) {
    console.error("Error toggling item completion:", error);
    return NextResponse.json(
      { error: "Failed to toggle item completion" },
      { status: 500 }
    );
  }
}
