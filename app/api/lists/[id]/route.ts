import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/lists/[id] - Get a single list
export async function GET(
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

    const list = await prisma.list.findFirst({
      where: { id: listId, userId },
      include: {
        items: {
          include: { task: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // For smart lists, fetch filtered tasks
    if (list.listType === "smart" && list.filterCriteria) {
      const criteria = JSON.parse(list.filterCriteria);
      const where: any = { userId, itemType: "task" };

      if (criteria.priority) where.priority = criteria.priority;
      if (criteria.effort) where.effort = criteria.effort;
      if (criteria.duration) where.duration = criteria.duration;
      if (criteria.focus) where.focus = criteria.focus;

      const filteredTasks = await prisma.item.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ ...list, filteredTasks });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("Error fetching list:", error);
    return NextResponse.json({ error: "Failed to fetch list" }, { status: 500 });
  }
}

// PATCH /api/lists/[id] - Update a list
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

    const existingList = await prisma.list.findFirst({
      where: { id: listId, userId },
    });

    if (!existingList) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.filterCriteria !== undefined && existingList.listType === "smart") {
      updateData.filterCriteria = JSON.stringify(body.filterCriteria);
    }

    const updatedList = await prisma.list.update({
      where: { id: listId },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("Error updating list:", error);
    return NextResponse.json({ error: "Failed to update list" }, { status: 500 });
  }
}

// DELETE /api/lists/[id] - Delete a list
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

    const list = await prisma.list.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    await prisma.list.delete({ where: { id: listId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting list:", error);
    return NextResponse.json({ error: "Failed to delete list" }, { status: 500 });
  }
}
