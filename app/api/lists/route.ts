import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/lists - Get all lists for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const lists = await prisma.list.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            task: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // For smart lists, dynamically fetch filtered tasks
    const listsWithTasks = await Promise.all(
      lists.map(async (list) => {
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

          return { ...list, filteredTasks };
        }
        return list;
      })
    );

    return NextResponse.json(listsWithTasks);
  } catch (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch lists" },
      { status: 500 }
    );
  }
}

// POST /api/lists - Create a new list
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { name, listType, filterCriteria, color } = body;

    if (!name || !listType) {
      return NextResponse.json(
        { error: "Name and listType are required" },
        { status: 400 }
      );
    }

    if (!["simple", "smart"].includes(listType)) {
      return NextResponse.json(
        { error: "listType must be 'simple' or 'smart'" },
        { status: 400 }
      );
    }

    const list = await prisma.list.create({
      data: {
        userId,
        name,
        listType,
        filterCriteria: filterCriteria ? JSON.stringify(filterCriteria) : null,
        color: color || null,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Error creating list:", error);
    return NextResponse.json(
      { error: "Failed to create list" },
      { status: 500 }
    );
  }
}
