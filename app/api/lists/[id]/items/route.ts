import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/lists/[id]/items - Add item to list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const listId = parseInt(id);
    const userId = session.user.id;
    const body = await request.json();

    const { text, dueDate, priority, effort, duration, focus } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Verify list exists and belongs to user
    const list = await prisma.list.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.listType === "smart") {
      return NextResponse.json(
        { error: "Cannot add items to smart lists" },
        { status: 400 }
      );
    }

    // Get max order for new item
    const maxOrder = await prisma.listItem.aggregate({
      where: { listId },
      _max: { order: true },
    });
    const newOrder = (maxOrder._max.order || 0) + 1;

    let taskId: number | null = null;

    // If dueDate provided, create a Task first
    if (dueDate) {
      const task = await prisma.item.create({
        data: {
          userId,
          itemType: "task",
          name: text,
          dueDate: new Date(dueDate),
          priority: priority || null,
          effort: effort || null,
          duration: duration || null,
          focus: focus || null,
          isParent: false,
          isCompleted: false,
        },
      });
      taskId = task.id;
    }

    const listItem = await prisma.listItem.create({
      data: {
        listId,
        text,
        taskId,
        order: newOrder,
      },
      include: { task: true },
    });

    return NextResponse.json(listItem, { status: 201 });
  } catch (error) {
    console.error("Error adding list item:", error);
    return NextResponse.json(
      { error: "Failed to add list item" },
      { status: 500 }
    );
  }
}

// PATCH /api/lists/[id]/items - Update list item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const listId = parseInt(id);
    const userId = session.user.id;
    const body = await request.json();

    const { itemId, text, isChecked, order, dueDate } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    // Verify list and item
    const list = await prisma.list.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const existingItem = await prisma.listItem.findFirst({
      where: { id: itemId, listId },
      include: { task: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (order !== undefined) updateData.order = order;
    if (isChecked !== undefined) {
      updateData.isChecked = isChecked;

      // Sync with linked task if exists
      if (existingItem.taskId) {
        await prisma.item.update({
          where: { id: existingItem.taskId },
          data: {
            isCompleted: isChecked,
            completedAt: isChecked ? new Date().toISOString() : null,
          },
        });
      }
    }

    // If adding dueDate to item without task, create task
    if (dueDate && !existingItem.taskId) {
      const task = await prisma.item.create({
        data: {
          userId,
          itemType: "task",
          name: existingItem.text,
          dueDate: new Date(dueDate),
          isParent: false,
          isCompleted: existingItem.isChecked,
        },
      });
      updateData.taskId = task.id;
    }

    const updatedItem = await prisma.listItem.update({
      where: { id: itemId },
      data: updateData,
      include: { task: true },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating list item:", error);
    return NextResponse.json(
      { error: "Failed to update list item" },
      { status: 500 }
    );
  }
}

// DELETE /api/lists/[id]/items - Delete list item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const listId = parseInt(id);
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const itemId = parseInt(searchParams.get("itemId") || "0");

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const list = await prisma.list.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const item = await prisma.listItem.findFirst({
      where: { id: itemId, listId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Delete the list item (task stays if linked)
    await prisma.listItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting list item:", error);
    return NextResponse.json(
      { error: "Failed to delete list item" },
      { status: 500 }
    );
  }
}
