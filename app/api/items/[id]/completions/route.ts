import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET /api/items/[id]/completions - Get completion history for an item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const itemId = parseInt(id);

    // Check ownership
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { userId: true },
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

    // Get query params for date range filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: any = { itemId };

    if (startDate || endDate) {
      where.completionDate = {};
      if (startDate) {
        where.completionDate.gte = new Date(startDate + "T00:00:00.000Z");
      }
      if (endDate) {
        where.completionDate.lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    const completions = await prisma.itemCompletion.findMany({
      where,
      orderBy: {
        completionDate: 'desc',
      },
    });

    return NextResponse.json(completions);
  } catch (error) {
    console.error("Error fetching item completions:", error);
    return NextResponse.json(
      { error: "Failed to fetch completions" },
      { status: 500 }
    );
  }
}
