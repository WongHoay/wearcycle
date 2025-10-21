import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  const { type, data, to, subject, text } = await request.json();
  console.log("API received:", type, data);

  try {
    switch (type) {
      case 'new_bid':
        await Promise.all([
          sendNewBidEmail(data),
          sendBidConfirmationEmail(data), // New: confirmation to the bidder
          (data.outbidEmail && data.outbidEmail.previousBidderId !== data.bidderId)
            ? sendOutbidEmail(data.outbidEmail)
            : Promise.resolve()
        ]);
        break;
      case 'outbid':
        if (data.previousBidderId !== data.bidderId) {
          await sendOutbidEmail(data);
        }
        break;
      case 'bid_won':
        await Promise.all([
          sendBidWonEmail(data),
          sendBidEndedSellerEmail(data)
        ]);
        break;
      case 'bid_ended_seller':
        await sendBidEndedSellerEmail(data);
        break;
      case 'payout_paid':
        // Send payout notification to seller
        if (to && subject && text) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #388e3c;">Payout Completed</h2>
                    <p>${text}</p>
                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                      This is an automated notification from WearCycle.
                    </p>
                  </div>`
          });
        }
        break;
      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

async function sendNewBidEmail(data: any) {
  console.log("sendNewBidEmail called with:", data);
  const { sellerEmail, bidderName, bidAmount, itemTitle, itemId } = data;
  if (sellerEmail) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: sellerEmail,
        subject: `New Bid on "${itemTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c9a26d;">New Bid Alert!</h2>
            <p>${bidderName} placed a bid on your item.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${itemTitle}</h3>
              <p style="margin: 5px 0;"><strong>New Bid:</strong> RM ${bidAmount}</p>
              <p style="margin: 5px 0;"><strong>Bidder:</strong> ${bidderName}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/view_item?id=${itemId}" 
               style="background: #c9a26d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Item
            </a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              This is an automated notification from WearCycle.
            </p>
          </div>
        `
      });
      console.log("Email sent to seller:", sellerEmail);
    } catch (err) {
      console.error("Error sending seller email:", err);
    }
  }
}

// New function: Send confirmation email to the new bidder
async function sendBidConfirmationEmail(data: any) {
  console.log("sendBidConfirmationEmail called with:", data);
  const { bidderEmail, bidderName, bidAmount, itemTitle, itemId } = data;
  if (bidderEmail) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: bidderEmail,
        subject: `Bid Confirmation: "${itemTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #388e3c;">Bid Placed Successfully!</h2>
            <p>Hi ${bidderName}, your bid has been successfully placed.</p>
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #388e3c;">
              <h3 style="margin: 0 0 10px 0;">${itemTitle}</h3>
              <p style="margin: 5px 0;"><strong>Your Bid:</strong> RM ${bidAmount}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
              <p style="margin: 0; color: #856404;">
                <strong>📧 Email Notifications:</strong> You'll receive updates if someone outbids you or when the auction ends.
              </p>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/view_item?id=${itemId}" 
               style="background: #388e3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Auction
            </a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Good luck with your bid! This is an automated notification from WearCycle.
            </p>
          </div>
        `
      });
      console.log("Bid confirmation email sent to:", bidderEmail);
    } catch (err) {
      console.error("Error sending bid confirmation email:", err);
    }
  }
}

async function sendOutbidEmail(data: any) {
  console.log("sendOutbidEmail called with:", data);
  const { bidderEmail, currentBid, itemTitle, itemId, minIncrement } = data;
  if (bidderEmail) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: bidderEmail,
        subject: `You've been outbid on "${itemTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">You've Been Outbid!</h2>
            <p>Someone has placed a higher bid on an item you were bidding on.</p>
            <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
              <h3 style="margin: 0 0 10px 0;">${itemTitle}</h3>
              <p style="margin: 5px 0;"><strong>Current Highest Bid:</strong> RM ${currentBid}</p>
              <p style="margin: 5px 0;"><strong>Minimum Next Bid:</strong> RM ${currentBid + minIncrement}</p>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/view_item?id=${itemId}" 
               style="background: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Place Higher Bid
            </a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Act fast! The auction might end soon.
            </p>
          </div>
        `
      });
      console.log("Outbid email sent to:", bidderEmail);
    } catch (err) {
      console.error("Error sending outbid email:", err);
    }
  }
}

async function sendBidWonEmail(data: any) {
   console.log("sendBidWonEmail called with:", data);
  const { winnerEmail, itemTitle, itemId, winningBid } = data;
  if (winnerEmail) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: winnerEmail,
        subject: `Congratulations! You won "${itemTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #388e3c;">You Won the Auction!</h2>
            <p>Congratulations, you have won the auction for <strong>${itemTitle}</strong>!</p>
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Winning Bid:</strong> RM ${winningBid}</p>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/checkout?id=${itemId}&type=bid" 
               style="background: #388e3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Proceed to Checkout
            </a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Thank you for participating in WearCycle auctions!
            </p>
          </div>
        `
      });
      console.log("Bid won email sent to:", winnerEmail);
    } catch (err) {
      console.error("Error sending bid won email:", err);
    }
  }
}

async function sendBidEndedSellerEmail(data: any) {
   console.log("sendBidEndedSellerEmail called with:", data);
  const { sellerEmail, itemTitle, winnerName, winningBid, itemId } = data;
  if (sellerEmail) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: sellerEmail,
        subject: `Auction Ended for "${itemTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1976d2;">Your Auction Has Ended</h2>
            <p>The auction for <strong>${itemTitle}</strong> has ended.</p>
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Winner:</strong> ${winnerName}</p>
              <p><strong>Winning Bid:</strong> RM ${winningBid}</p>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/view_item?id=${itemId}" 
               style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Item
            </a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Thank you for using WearCycle!
            </p>
          </div>
        `
      });
      console.log("Bid ended email sent to seller:", sellerEmail);
    } catch (err) {
      console.error("Error sending bid ended seller email:", err);
    }
  }
}