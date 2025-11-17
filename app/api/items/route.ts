import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/items - Get all items (tasks, habits, reminders)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get("type"); // Filter by type if provided

    const where: any = { userId, parentItemId: null }; // Only get top-level items
    if (itemType) {
      where.itemType = itemType;
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        completions: true,
        subItems: {
          include: {
            completions: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

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
      // Metadata fields
      effort,
      duration,
      focus,
      // Sub-items
      subItems,
    } = body;

    // Validate required fields
    if (!itemType || !name) {
      return NextResponse.json(
        { error: "itemType and name are required" },
        { status: 400 }
      );
    }

    if (!["task", "habit", "reminder"].includes(itemType)) {
      return NextResponse.json(
        { error: "itemType must be task, habit, or reminder" },
        { status: 400 }
      );
    }

    // Check if this item will have sub-items
    const hasSubItems = Array.isArray(subItems) && subItems.length > 0;

    // Create the item
    const item = await prisma.item.create({
      data: {
        userId,
        itemType,
        name,
        description,
        scheduleType,
        scheduleDays,
        scheduledTime,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime,
        priority: priority || null,
        recurrenceType,
        recurrenceInterval,
        recurrenceUnit,
        recurrenceAnchor,
        reminderDatetime: reminderDatetime ? new Date(reminderDatetime) : null,
        reminderRecurrence,
        reminderDays,
        parentItemId,
        isParent: hasSubItems,
        effort: effort || null,
        duration: duration || null,
        focus: focus || null,
      },
    });

    // If this is a sub-item, update the parent
    if (parentItemId) {
      await prisma.item.update({
        where: { id: parentItemId },
        data: { isParent: true },
      });
    }

    // Create sub-items if provided
    if (hasSubItems) {
      for (const subItem of subItems) {
        if (subItem.name && subItem.name.trim()) {
          await prisma.item.create({
            data: {
              userId,
              itemType, // Inherit type from parent
              name: subItem.name.trim(),
              parentItemId: item.id,
              isParent: false,
              dueDate: subItem.dueDate ? new Date(subItem.dueDate) : null,
              // Sub-items don't get metadata fields
              priority: null,
              effort: null,
              duration: null,
              focus: null,
              // Inherit schedule from parent for habits
              scheduleType: itemType === "habit" ? scheduleType : null,
              scheduleDays: itemType === "habit" ? scheduleDays : null,
            },
          });
        }
      }
    }

    // Fetch the item with sub-items included
    const itemWithSubItems = await prisma.item.findUnique({
      where: { id: item.id },
      include: {
        completions: true,
        subItems: {
          include: {
            completions: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json(itemWithSubItems, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }
}
