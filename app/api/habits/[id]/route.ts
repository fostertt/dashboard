import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';

// GET /api/habits/[id] - Get a single habit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params; // AWAIT params first
    const habitId = parseInt(id);

    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        habit_completions: true,
        subTasks: true,
        parent: true,
      },
    });

    if (!habit) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (habit.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json(habit);
  } catch (error) {
    console.error('Error fetching habit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habit' },
      { status: 500 }
    );
  }
}

// PATCH /api/habits/[id] - Update a habit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params; // AWAIT params first
    const habitId = parseInt(id);
    const body = await request.json();

    // Check ownership before update
    const existing = await prisma.habit.findUnique({
      where: { id: habitId },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const habit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        ...body,
        updatedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json(habit);
  } catch (error) {
    console.error('Error updating habit:', error);
    return NextResponse.json(
      { error: 'Failed to update habit' },
      { status: 500 }
    );
  }
}

// DELETE /api/habits/[id] - Delete a habit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params; // AWAIT params first
    const habitId = parseInt(id);

    // Check ownership before delete
    const existing = await prisma.habit.findUnique({
      where: { id: habitId },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await prisma.habit.delete({
      where: { id: habitId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting habit:', error);
    return NextResponse.json(
      { error: 'Failed to delete habit' },
      { status: 500 }
    );
  }
}
