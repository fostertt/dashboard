import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/items/[id] - Get a single item
export async function GET(
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

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
      },
      include: {
        completions: true,
        subItems: true,
        parent: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}

// PATCH /api/items/[id] - Update an item
export async function PATCH(
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

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Handle sub-items if provided
    const subItems = body.subItems;
    const hasSubItems = Array.isArray(subItems) && subItems.length > 0;

    // Update the item
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        name: body.name,
        description: body.description,
        scheduleType: body.scheduleType,
        scheduleDays: body.scheduleDays,
        scheduledTime: body.scheduledTime,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        dueTime: body.dueTime,
        priority: body.priority || null,
        recurrenceType: body.recurrenceType,
        recurrenceInterval: body.recurrenceInterval,
        recurrenceUnit: body.recurrenceUnit,
        recurrenceAnchor: body.recurrenceAnchor,
        reminderDatetime: body.reminderDatetime ? new Date(body.reminderDatetime) : null,
        reminderRecurrence: body.reminderRecurrence,
        reminderDays: body.reminderDays,
        effort: body.effort || null,
        duration: body.duration || null,
        focus: body.focus || null,
        isParent: hasSubItems,
      },
    });

    // Manage sub-items if provided
    if (Array.isArray(subItems)) {
      // Get existing sub-items
      const existingSubItems = await prisma.item.findMany({
        where: { parentItemId: itemId },
      });

      const existingSubItemIds = existingSubItems.map((si) => si.id);
      const providedSubItemIds = subItems
        .filter((si: any) => si.id)
        .map((si: any) => si.id);

      // Delete sub-items that are no longer in the list
      const subItemsToDelete = existingSubItemIds.filter(
        (id) => !providedSubItemIds.includes(id)
      );
      if (subItemsToDelete.length > 0) {
        // Delete completions first
        await prisma.itemCompletion.deleteMany({
          where: { itemId: { in: subItemsToDelete } },
        });
        await prisma.item.deleteMany({
          where: { id: { in: subItemsToDelete } },
        });
      }

      // Update or create sub-items
      for (const subItem of subItems) {
        if (subItem.id) {
          // Update existing sub-item
          await prisma.item.update({
            where: { id: subItem.id },
            data: {
              name: subItem.name?.trim() || "",
              dueDate: subItem.dueDate ? new Date(subItem.dueDate) : null,
            },
          });
        } else if (subItem.name && subItem.name.trim()) {
          // Create new sub-item
          await prisma.item.create({
            data: {
              userId,
              itemType: existingItem.itemType,
              name: subItem.name.trim(),
              parentItemId: itemId,
              isParent: false,
              dueDate: subItem.dueDate ? new Date(subItem.dueDate) : null,
              priority: null,
              effort: null,
              duration: null,
              focus: null,
              scheduleType:
                existingItem.itemType === "habit"
                  ? existingItem.scheduleType
                  : null,
              scheduleDays:
                existingItem.itemType === "habit"
                  ? existingItem.scheduleDays
                  : null,
            },
          });
        }
      }
    }

    // Fetch the updated item with sub-items
    const itemWithSubItems = await prisma.item.findUnique({
      where: { id: itemId },
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

    return NextResponse.json(itemWithSubItems);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE /api/items/[id] - Delete an item
export async function DELETE(
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

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Delete all completions first
    await prisma.itemCompletion.deleteMany({
      where: { itemId },
    });

    // Delete the item
    await prisma.item.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
