import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidWalletAddress, isValidSessionId } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, walletAddress } = body;

    console.log('🔗 Claiming credits for session:', sessionId, '→ wallet:', walletAddress);

    if (!sessionId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or walletAddress' },
        { status: 400 }
      );
    }

    // BUG FIX: Wallet address and session ID were not validated before use in database queries.
    // Malformed values could cause application errors or be exploited for injection attacks.
    if (!isValidWalletAddress(walletAddress)) {
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

    // Find all unclaimed views for this session
    const unclaimedViews = await prisma.adView.findMany({
      where: {
        sessionId: sessionId,
        claimed: false
      }
    });

    if (unclaimedViews.length === 0) {
      console.log('ℹ️ No unclaimed credits found for session');
      return NextResponse.json({
        success: true,
        creditsClaimed: 0,
        message: 'No pending credits to claim'
      });
    }

    // Calculate total credits
    const totalCredits = unclaimedViews.reduce((sum, view) => {
      return sum + parseFloat(view.creditsEarned.toString());
    }, 0);

    console.log(`💰 Found ${unclaimedViews.length} unclaimed views, total: ${totalCredits} XLM`);

    // Update all views to claimed and link to wallet
    await prisma.adView.updateMany({
      where: {
        sessionId: sessionId,
        claimed: false
      },
      data: {
        claimed: true,
        walletAddress: walletAddress
      }
    });

    // Add credits to wallet
    const existingCredit = await prisma.adCredit.findUnique({
      where: { walletAddress: walletAddress }
    });

    if (existingCredit) {
      await prisma.adCredit.update({
        where: { walletAddress: walletAddress },
        data: {
          credits: { increment: totalCredits },
          totalEarned: { increment: totalCredits }
        }
      });
      console.log(`✅ Added ${totalCredits} XLM to existing wallet`);
    } else {
      await prisma.adCredit.create({
        data: {
          walletAddress: walletAddress,
          credits: totalCredits,
          totalEarned: totalCredits,
          totalSpent: 0
        }
      });
      console.log(`✅ Created new credit account with ${totalCredits} XLM`);
    }

    return NextResponse.json({
      success: true,
      creditsClaimed: totalCredits,
      viewsClaimed: unclaimedViews.length,
      message: `🎉 Claimed ${totalCredits} XLM from ${unclaimedViews.length} ad views!`
    });

  } catch (error) {
    console.error('❌ Error claiming credits:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to claim credits.' },
    { status: 405 }
  );
}