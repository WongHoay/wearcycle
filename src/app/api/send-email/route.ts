import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import type { NextApiRequest, NextApiResponse } from 'next';

// Configure your SMTP transporter (use environment variables for credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  const { type, data } = await request.json();
  console.log("API received:", type, data);

  try {
    switch (type) {
      case 'new_order':
        await sendNewOrderEmail(data);
        break;
      case 'new_bid':
        await Promise.all([
          sendNewBidEmail(data),
          sendBidConfirmationEmail(data),
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
        await sendPayoutPaidEmail(data);
        break;
      case 'refund':
        await sendRefundEmail(data);
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

// --- New Order Email ---

async function sendNewOrderEmail(data: any) {
  console.log("sendNewOrderEmail called with:", data);
  const { sellerEmail, sellerName, orderId, buyerName, buyerEmail, shippingAddress, items, totalAmount, orderDate } = data;
  if (sellerEmail) {
    try {
      const itemsHtml = items.map((item: any) => `
        <div style="display: flex; align-items: center; gap: 15px; margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          ${item.itemImage ? `<img src="${item.itemImage}" alt="${item.itemName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">` : '<div style="width: 60px; height: 60px; background: #e9ecef; border-radius: 6px; display: flex; align-items: center; justify-content: center;">📦</div>'}
          <div>
            <h4 style="margin: 0 0 5px 0; color: #333;">${item.itemName}</h4>
            <p style="margin: 0; color: #666; font-size: 14px;">RM ${Number(item.itemPrice || 0).toFixed(2)}</p>
          </div>
        </div>
      `).join('');

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: sellerEmail,
        subject: `🎉 New Order Received! Order #${orderId.slice(-8)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 New Order Alert!</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">You have received a new order</p>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin: 0 0 20px 0;">Order Details</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div>
                    <strong style="color: #666;">Order ID:</strong>
                    <div style="color: #333; font-weight: 600;">#${orderId.slice(-8)}</div>
                  </div>
                  <div>
                    <strong style="color: #666;">Order Date:</strong>
                    <div style="color: #333;">${orderDate}</div>
                  </div>
                  <div>
                    <strong style="color: #666;">Customer:</strong>
                    <div style="color: #333; font-weight: 600;">${buyerName}</div>
                  </div>
                  <div>
                    <strong style="color: #666;">Email:</strong>
                    <div style="color: #333;">${buyerEmail}</div>
                  </div>
                </div>
              </div>
              <div style="margin: 25px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">Items Ordered:</h3>
                ${itemsHtml}
                <div style="text-align: right; margin: 15px 0; padding: 15px; background: #e8f5e9; border-radius: 8px;">
                  <strong style="color: #2e7d32; font-size: 18px;">Total: RM ${Number(totalAmount || 0).toFixed(2)}</strong>
                </div>
              </div>
              <div style="margin: 25px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">Shipping Address:</h3>
                <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
                  <p style="margin: 0; color: #333; font-weight: 600;">${shippingAddress.fullName}</p>
                  <p style="margin: 5px 0; color: #666;">${shippingAddress.addressLine1}</p>
                  ${shippingAddress.addressLine2 ? `<p style="margin: 5px 0; color: #666;">${shippingAddress.addressLine2}</p>` : ''}
                  <p style="margin: 5px 0; color: #666;">${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}</p>
                  <p style="margin: 5px 0; color: #666;">${shippingAddress.country}</p>
                  ${shippingAddress.phone ? `<p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${shippingAddress.phone}</p>` : ''}
                </div>
              </div>
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #ffeaa7;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">📋 Next Steps:</h3>
                <ol style="margin: 0; padding-left: 20px; color: #856404; line-height: 1.6;">
                  <li>Review the order details above</li>
                  <li>Prepare the item(s) for shipping</li>
                  <li>Update the order status in your sales dashboard</li>
                  <li>Add tracking information when shipped</li>
                </ol>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/my_sales" 
                   style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                  View in Sales Dashboard
                </a>
              </div>
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  This is an automated notification from WearCycle.<br>
                  You received this because you have items listed for sale on our platform.
                </p>
              </div>
            </div>
          </div>
        `
      });
      console.log("✅ New order email sent to seller:", sellerEmail);
    } catch (err) {
      console.error("❌ Error sending new order email:", err);
    }
  }
}

// --- Payout Email ---
async function sendPayoutPaidEmail(data: any) {
  console.log("sendPayoutPaidEmail called with:", data);
  const { 
    sellerEmail, 
    sellerName, 
    amount, 
    platformFee, 
    grossAmount, 
    orderId, 
    transactionId, 
    paymentMethod,
    itemName,
    paidDate 
  } = data;
  
  if (sellerEmail) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: sellerEmail,
        subject: `💰 Payout Completed - RM ${Number(amount || 0).toFixed(2)} Transferred`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">💰 Payout Completed!</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Your earnings have been transferred</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin: 0 0 20px 0;">Hi ${sellerName},</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Great news! Your payout has been successfully processed and transferred to your account.
              </p>
              
              <div style="background: #e8f5e9; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #4CAF50;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="color: #2e7d32; font-size: 36px; font-weight: bold; margin-bottom: 5px;">
                    RM ${Number(amount || 0).toFixed(2)}
                  </div>
                  <div style="color: #666; font-size: 14px;">Amount Transferred</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                  <div style="text-align: center;">
                    <div style="color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Gross Amount</div>
                    <div style="color: #333; font-weight: 600;">RM ${Number(grossAmount || 0).toFixed(2)}</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Platform Fee</div>
                    <div style="color: #d32f2f; font-weight: 600;">-RM ${Number(platformFee || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">Payout Details</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  ${orderId ? `
                  <div>
                    <strong style="color: #666; font-size: 14px;">Order ID:</strong>
                    <div style="color: #333;">#${orderId.slice(-8)}</div>
                  </div>` : ''}
                  ${itemName ? `
                  <div>
                    <strong style="color: #666; font-size: 14px;">Item:</strong>
                    <div style="color: #333;">${itemName}</div>
                  </div>` : ''}
                  <div>
                    <strong style="color: #666; font-size: 14px;">Payment Method:</strong>
                    <div style="color: #333;">${paymentMethod || 'QR Payment'}</div>
                  </div>
                  <div>
                    <strong style="color: #666; font-size: 14px;">Transfer Date:</strong>
                    <div style="color: #333;">${paidDate || new Date().toLocaleDateString()}</div>
                  </div>
                  ${transactionId ? `
                  <div style="grid-column: span 2;">
                    <strong style="color: #666; font-size: 14px;">Transaction Reference:</strong>
                    <div style="color: #333; font-family: monospace; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">${transactionId}</div>
                  </div>` : ''}
                </div>
              </div>

              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #bbdefb;">
                <h3 style="margin: 0 0 10px 0; color: #1565c0;">💡 Important Notes:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1565c0; line-height: 1.6; font-size: 14px;">
                  <li>The transfer may take 1-2 business days to reflect in your account</li>
                  <li>Keep this email as a record of your payout</li>
                  <li>Platform fee (10%) has been automatically deducted</li>
                  <li>Contact support if you have any questions about this payout</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/my_sales" 
                   style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; margin-right: 10px;">
                  View Sales Dashboard
                </a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" 
                   style="background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                  Update Bank Details
                </a>
              </div>

              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  Thank you for selling with WearCycle! 🌱<br>
                  Questions? Contact us at wearcycle@gmail.com
                </p>
              </div>
            </div>
          </div>
        `
      });
      console.log("✅ Payout paid email sent to seller:", sellerEmail);
    } catch (err) {
      console.error("❌ Error sending payout paid email:", err);
    }
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

// --- Outbid Email ---
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

// --- Bid Won Email ---
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

// --- Bid Ended Seller Email ---
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

// --- Refund Email ---
async function sendRefundEmail(data: any) {
  console.log("sendRefundEmail called with:", data);
  const { buyerEmail, buyerName, orderId, refundAmount } = data;
  if (buyerEmail) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: buyerEmail,
        subject: `Refund for Order ${orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">Refund Notification</h2>
            <p>Dear ${buyerName},</p>
            <p>Your payment for order <strong>${orderId}</strong> has been <span style="color: #d32f2f; font-weight: bold;">rejected</span>. We will proceed with a refund of <strong>RM ${refundAmount}</strong>.</p>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Next Steps:</strong></p>
              <ol style="margin: 0; padding-left: 20px; color: #856404; line-height: 1.6;">
                <li>Please reply to this email with your bank account details or phone number for e-wallet transfer.</li>
                <li>If you have any questions, feel free to contact us.</li>
              </ol>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Best regards,<br>WearCycle Admin Team
            </p>
            <p style="margin-top: 10px; color: #999; font-size: 12px;">
              This is an automated notification from WearCycle.
            </p>
          </div>
        `
      });
      console.log("Refund email sent to buyer:", buyerEmail);
    } catch (err) {
      console.error("Error sending refund email:", err);
    }
  }
}