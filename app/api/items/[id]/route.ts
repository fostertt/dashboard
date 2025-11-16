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
        priority: body.priority,
        effort: body.effort,
        duration: body.duration,
        focus: body.focus,
        recurrenceType: body.recurrenceType,
        recurrenceInterval: body.recurrenceInterval,
        recurrenceUnit: body.recurrenceUnit,
        recurrenceAnchor: body.recurrenceAnchor,
        reminderDatetime: body.reminderDatetime ? new Date(body.reminderDatetime) : null,
        reminderRecurrence: body.reminderRecurrence,
        reminderDays: body.reminderDays,
      },
    });

    return NextResponse.json(updatedItem);
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
