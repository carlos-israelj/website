import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    
    console.log('🔍 Fetching queue info for:', slotId);

    // Find ad slot
    const adSlot = await prisma.adSlot.findFirst({
      where: {
        slotIdentifier: slotId,
        active: true
      }
    });

    if (!adSlot) {
      return NextResponse.json({
        slotId,
        position: 0,
        totalInQueue: 0,
        isAvailable: true,
        minimumBid: '0.25'
      });
    }

    // Get active placement
    const activePlacement = await prisma.adPlacement.findFirst({
      where: {
        slotId: adSlot.id,
        status: 'active',
        expiresAt: { gt: new Date() }
      }
    });

    // Get queue (sorted by queue position)
    const queuedPlacements = await prisma.adPlacement.findMany({
      where: {
        slotId: adSlot.id,
        status: 'queued'
      },
      orderBy: [
        { queuePosition: 'asc' }
      ],
      select: {
        id: true,
        bidAmount: true,
        queuePosition: true,
        startsAt: true,
        expiresAt: true
      }
    });

    const totalInQueue = queuedPlacements.length;

    // Calculate minimum bid to get into queue
    const highestQueueBid = queuedPlacements.length > 0 
      ? Math.max(...queuedPlacements.map(p => parseFloat(p.bidAmount?.toString() || '0')))
      : parseFloat(adSlot.basePrice.toString());

    const minimumBid = (highestQueueBid + 0.01).toFixed(2); // Need to bid higher than highest

    // If no active ad, slot is available
    if (!activePlacement) {
      return NextResponse.json({
        slotId,
        position: 0,
        totalInQueue: totalInQueue,
        isAvailable: true,
        minimumBid: adSlot.basePrice.toString(),
        queueInfo: queuedPlacements.map((p, i) => ({
          position: i + 1,
          bidAmount: p.bidAmount?.toString(),
          startsAt: p.startsAt.toISOString()
        }))
      });
    }

    // Slot is occupied
    console.log(`📊 Active ad expires: ${activePlacement.expiresAt}`);
    console.log(`📊 ${totalInQueue} ads in queue`);
    console.log(`💰 Minimum bid to compete: ${minimumBid}`);

    return NextResponse.json({
      slotId,
      position: totalInQueue, // Next position
      totalInQueue: totalInQueue,
      nextActivation: activePlacement.expiresAt.toISOString(),
      isAvailable: false,
      minimumBid: minimumBid,
      currentAd: {
        expiresAt: activePlacement.expiresAt.toISOString(),
        timeRemaining: Math.max(0, activePlacement.expiresAt.getTime() - Date.now())
      },
      queueInfo: queuedPlacements.map((p, i) => ({
        position: i + 1,
        bidAmount: p.bidAmount?.toString(),
        startsAt: p.startsAt.toISOString(),
        expiresAt: p.expiresAt.toISOString()
      }))
    });

  } catch (error) {
    console.error('❌ Error getting queue info:', error);
    // BUG FIX: Error details were exposed to clients, revealing implementation details
    // that could aid attackers. In production, only return generic error messages.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    // In development, include details for debugging
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown'
      },
      { status: 500 }
    );
  }
}