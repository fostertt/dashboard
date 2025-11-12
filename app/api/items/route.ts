import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET /api/items - Get all items (tasks, habits, reminders)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get("type"); // Filter by type if provided

    const where: any = { userId };
    if (itemType) {
      where.itemType = itemType;
    }

    const items = await prisma.item.findMany({
      where,
      select: {
        id: true,
        userId: true,
        itemType: true,
        name: true,
        description: true,
        scheduleType: true,
        scheduleDays: true,
        scheduledTime: true,
        dueDate: true,
        dueTime: true,
        reminderDatetime: true,
        reminderRecurrence: true,
        reminderDays: true,
        isCompleted: true,
        completedAt: true,
        isDismissed: true,
        dismissedAt: true,
        priority: true,
        status: true,
        parentItemId: true,
        isParent: true,
        createdAt: true,
        updatedAt: true,
        recurrenceType: true,
        recurrenceInterval: true,
        recurrenceUnit: true,
        recurrenceAnchor: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

// POST /api/items - Create a new item (task, habit, or reminder)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.id;

    const body = await request.json();
    const {
      itemType,
      name,
      description,
      // Habit fields
      scheduleType,
      scheduleDays,
      scheduledTime,
      // Task fields
      dueDate,
      dueTime,
      priority,
      status = "pending",
      recurrenceType,
      recurrenceInterval,
      recurrenceUnit,
      recurrenceAnchor,
      // Reminder fields
      reminderDatetime,
      reminderRecurrence,
      reminderDays,
      // Hierarchy
      parentItemId,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!itemType || !["habit", "task", "reminder"].includes(itemType)) {
      return NextResponse.json(
        { error: "Valid itemType is required (habit, task, or reminder)" },
        { status: 400 }
      );
    }

    // Type-specific validations
    if (itemType === "habit" && !scheduleType) {
      return NextResponse.json(
        { error: "scheduleType is required for habits" },
        { status: 400 }
      );
    }

    if (itemType === "reminder" && !reminderDatetime) {
      return NextResponse.json(
        { error: "reminderDatetime is required for reminders" },
        { status: 400 }
      );
    }

    // Create the item
    const item = await prisma.item.create({
      data: {
        userId,
        name,
        itemType,
        description,
        scheduleType,
        scheduleDays,
        scheduledTime,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime,
        reminderDatetime,
        reminderRecurrence,
        reminderDays,
        priority,
        status,
        parentItemId,
        isParent: false,
        isCompleted: false,
        isDismissed: false,
        createdAt: new Date().toISOString(),
        recurrenceType,
        recurrenceInterval,
        recurrenceUnit,
        recurrenceAnchor,
      },
    });

    // If this is a sub-item, update the parent
    if (parentItemId) {
      await prisma.item.update({
        where: { id: parentItemId },
        data: { isParent: true },
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }
}
