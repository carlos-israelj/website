import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidWalletAddress, isValidSessionId } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { placementId, sessionId, viewDuration, slotId, walletAddress } = body;

    console.log('📊 View tracking request:', {
      placementId,
      sessionId,
      viewDuration,
      slotId,
      walletAddress: walletAddress || 'anonymous'
    });

    if (!placementId || !sessionId || !viewDuration) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // BUG FIX: viewDuration was accepted from the client without any validation.
    // A malicious user could POST viewDuration=999999 to claim maximum credits
    // without watching any ad.  The valid milestones are [10, 30, 60, 120, 240, 480]
    // seconds (as defined in Ad402Slot.tsx).  Any value outside this set is rejected.
    const VALID_VIEW_DURATIONS = [10, 30, 60, 120, 240, 480];
    const parsedDuration = Number(viewDuration);
    if (!VALID_VIEW_DURATIONS.includes(parsedDuration)) {
      console.warn('⚠️ Rejected invalid viewDuration:', viewDuration);
      return NextResponse.json(
        { success: false, error: `Invalid viewDuration. Must be one of: ${VALID_VIEW_DURATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // BUG FIX: Validate wallet address and session ID if provided to prevent malformed data
    if (walletAddress && !isValidWalletAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    if (!isValidSessionId(sessionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // Check if this view was already tracked
    const existingView = await prisma.adView.findFirst({
      where: {
        placementId: placementId,
        sessionId: sessionId
      }
    });

    if (existingView) {
      console.log('⚠️ View already tracked for this session');
      return NextResponse.json({
        success: true,
        viewDuration: existingView.viewDuration,
        creditsEarned: parseFloat(existingView.creditsEarned.toString()),
        message: 'View already tracked'
      });
    }

    // Calculate credits: 0.05 XLM for 30+ seconds
    const creditsEarned = viewDuration >= 30 ? 0.05 : 0.01;

    // 🎯 CREATE VIEW RECORD (with or without wallet)
    const adView = await prisma.adView.create({
      data: {
        placementId: placementId,
        sessionId: sessionId,
        walletAddress: walletAddress || null,
        viewDuration: viewDuration,
        creditsEarned: creditsEarned,
        claimed: walletAddress ? true : false, // Mark as claimed if wallet connected
      }
    });

    console.log('✅ View record created:', adView.id);

    // 🎯 IF WALLET CONNECTED: Add credits immediately
    if (walletAddress) {
      console.log('💰 Wallet connected, adding credits to:', walletAddress);
      
      const existingCredit = await prisma.adCredit.findUnique({
        where: { walletAddress: walletAddress }
      });

      if (existingCredit) {
        await prisma.adCredit.update({
          where: { walletAddress: walletAddress },
          data: {
            credits: { increment: creditsEarned },
            totalEarned: { increment: creditsEarned }
          }
        });
        console.log(`✅ Added ${creditsEarned} XLM to existing account`);
      } else {
        await prisma.adCredit.create({
          data: {
            walletAddress: walletAddress,
            credits: creditsEarned,
            totalEarned: creditsEarned,
            totalSpent: 0
          }
        });
        console.log(`✅ Created new credit account with ${creditsEarned} XLM`);
      }
    } else {
      // 🎯 NO WALLET: Credits stored in session (pending)
      console.log('💾 No wallet connected, credits stored as pending for session:', sessionId);
    }

    // Increment view count on placement
    await prisma.adPlacement.update({
      where: { id: placementId },
      data: { viewCount: { increment: 1 } }
    });

    return NextResponse.json({
      success: true,
      viewDuration: viewDuration,
      creditsEarned: creditsEarned,
      claimed: walletAddress ? true : false,
      message: walletAddress 
        ? `🎉 Earned ${creditsEarned} XLM for watching ad!`
        : `💾 Earned ${creditsEarned} XLM! Connect wallet at checkout to claim.`
    });

  } catch (error) {
    console.error('❌ Error tracking view:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to track views.' },
    { status: 405 }
  );
}