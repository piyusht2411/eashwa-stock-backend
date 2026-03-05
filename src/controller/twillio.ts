import { Request, Response } from "express";
import twilio from "twilio";
import dotenv from "dotenv";
import messageUser from "../model/messageUser";
import * as orderService from "../services/orderService";
import * as notificationService from "../services/notificationService";
import Order from "../model/order";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const submitRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    name,
    productDescription,
    vendorName,
    userPhoneNumber,
    amount,
    time,
  } = req.body;

  try {
    const formResposne = await client.messages.create({
      from: "whatsapp:+919911130173",
      to: `whatsapp:+917827705405`,
      contentSid: "HXd8e43d7ddd29316e06c8492c56b5748b",
      contentVariables: JSON.stringify({
        "1": name,
        "2": productDescription,
        "3": vendorName,
        "4": time,
        "5": amount,
      }),
    });
    const secondResponse = await client.messages.create({
      from: "whatsapp:+919911130173",
      to: `whatsapp:+918218698921`,
      contentSid: "HXd8e43d7ddd29316e06c8492c56b5748b",
      contentVariables: JSON.stringify({
        "1": name,
        "2": productDescription,
        "3": vendorName,
        "4": time,
        "5": amount,
      }),
    });
    const existingUser = await messageUser.findOne({
      whatsappNumber: userPhoneNumber,
    });
    if (existingUser) {
      const updatedUser = await messageUser.updateOne(
        { whatsappNumber: userPhoneNumber },
        {
          $set: {
            messageId: formResposne.sid,
            secondMessageId: secondResponse.sid,
            name,
            productDescription,
            vendorName,
            amount,
            time,
          },
        }
      );
    } else {
      const newMessage = new messageUser({
        name,
        messageId: formResposne.sid,
        secondMessageId: secondResponse.sid,
        whatsappNumber: userPhoneNumber,
        productDescription,
        vendorName,
        amount,
        time,
      });
      await newMessage.save();
    }

    res.status(200).json({ success: true, message: "Request sent to admin." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to send message.", error });
  }
};

export const whatsappWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const originalBody = req.body.Body ? req.body.Body.trim() : "";
  const messageFromAdmin = originalBody.toLowerCase();
  const body = req.body;
  const reply = body.Body ? body.Body.toLowerCase().trim() : "";
  const repliedSid = body.OriginalRepliedMessageSid;
  const fromNumber = req.body.From;
  try {
    let order = await orderService.findOrderBySid(repliedSid);
    if (order && (reply === "received" || reply === "not received")) {
      if (reply === "received") {
        const orderId = `ORD-${Date.now()}`;
        //@ts-ignore
        const updatedOrder = await orderService.updateOrder(order._id, {
          status: "ready_for_dispatch",
          orderId,
          remark: "",
        });
        await notificationService.sendNotificationToUser(
          order.submittedBy,
          "Your payment has been received.",
          "HX1449433d60e7fe1ddfbb333486d928cf"
        );
        if (updatedOrder) {
          await notificationService.sendDispatchNotification(updatedOrder);
        }
        const remarkInputMessage = await client.messages.create({
          from: "whatsapp:+919911130173",
          to: fromNumber,
          contentSid: "HX77b39830b7781c29e1b9bee6eb2d3702",
        });
        //@ts-ignore
        await orderService.updateOrder(order._id, {
          remarkInputSid: remarkInputMessage.sid,
        });
      } else if (reply === "not received") {
        //@ts-ignore
        await orderService.updateOrder(order._id, {
          status: "payment_not_received",
        });
        await notificationService.sendNotificationToUser(
          order.submittedBy.toString(),
          "Payment not received. Please check with Accounts Department.",
          "HX17353f91b0a16019c35b353c2ff19fa2"
        );
      }
      res.send("<Response></Response>");
      return;
    }
    if (!order) {
      order = await Order.findOne({ remarkInputSid: repliedSid });
      if (order && messageFromAdmin.startsWith("remark:")) {
        const remark = originalBody.replace(/^remark\s*:\s*/i, "").trim();
        //@ts-ignore
        await orderService.updateOrder(order._id, {
          remark,
          remarkInputSid: null,
        });
        res.send("<Response></Response>");
        return;
      }
    }
    let messageWhatsapp: typeof messageUser | null = await messageUser.findOne({
      messageId: body.OriginalRepliedMessageSid,
    });
    if (messageWhatsapp === null) {
      messageWhatsapp = await messageUser.findOne({
        secondMessageId: body.OriginalRepliedMessageSid,
      });
    }
    if (messageFromAdmin === "accept") {
      await client.messages.create({
        from: "whatsapp:+919911130173",
        //@ts-ignore
        to: `whatsapp:${messageWhatsapp.whatsappNumber}`,
        contentSid: "HXf2dd29e93e8f5588d14f3a1c75fc5391",
        contentVariables: JSON.stringify({
          "1": messageWhatsapp?.name,
          //@ts-ignore
          "2": messageWhatsapp?.productDescription,
          //@ts-ignore
          "3": messageWhatsapp?.vendorName,
          //@ts-ignore
          "4": messageWhatsapp?.time,
          //@ts-ignore
          "5": `₹${messageWhatsapp?.amount}`,
        }),
      });
      await client.messages.create({
        from: "whatsapp:+919911130173",
        //@ts-ignore
        to: `whatsapp:+919411654217`,
        contentSid: "HXc92a36fb628d717d8505d7c6a9669781",
        contentVariables: JSON.stringify({
          "1": messageWhatsapp?.name,
          //@ts-ignore
          "2": messageWhatsapp?.productDescription,
          //@ts-ignore
          "3": messageWhatsapp?.vendorName,
          //@ts-ignore
          "4": messageWhatsapp?.time,
          //@ts-ignore
          "5": `₹${messageWhatsapp?.amount}`,
        }),
      });
      if (req.body.From === "whatsapp:+917723866666") {
        await client.messages.create({
          from: "whatsapp:+919911130173",
          //@ts-ignore
          to: `whatsapp:+919990148011`,
          contentSid: "HXb5947d790365975417f2bcc62852ab88",
        });
      } else if (req.body.From === "whatsapp:+919990148011") {
        await client.messages.create({
          from: "whatsapp:+919911130173",
          //@ts-ignore
          to: `whatsapp:+917723866666`,
          contentSid: "HXb5947d790365975417f2bcc62852ab88",
        });
      }
      res.status(200).send("<Response></Response>");
    } else if (messageFromAdmin === "reject") {
      await client.messages.create({
        from: "whatsapp:+919911130173",
        to: `${req.body.From}`,
        contentSid: "HXc4e1cf97fcc0a1434c8154b59aa99b9a",
      });
      res.status(200).send("<Response></Response>");
    } else if (messageFromAdmin.startsWith("reason:")) {
      const rejectionReason = messageFromAdmin
        .replace(/^reason:\s*/i, "")
        .trim();
      await client.messages.create({
        from: "whatsapp:+919911130173",
        //@ts-ignore
        to: `whatsapp:${messageWhatsapp.whatsappNumber}`,
        contentSid: "HX1d9067b37433fd2e8b5b8af4a2a09e12",
        contentVariables: JSON.stringify({
          "1": rejectionReason,
          "2": messageWhatsapp?.name,
          //@ts-ignore
          "3": messageWhatsapp?.productDescription,
          //@ts-ignore
          "4": messageWhatsapp?.vendorName,
          //@ts-ignore
          "5": messageWhatsapp?.time,
          //@ts-ignore
          "6": `₹${messageWhatsapp?.amount}`,
        }),
      });
      if (req.body.From === "whatsapp:+917723866666") {
        await client.messages.create({
          from: "whatsapp:+919911130173",
          //@ts-ignore
          to: `whatsapp:+919990148011`,
          contentSid: "HXbc0d42ac7ebeac2c22ca5dc2aba4577a",
          contentVariables: JSON.stringify({
            "1": rejectionReason,
          }),
        });
      } else if (req.body.From === "whatsapp:+919990148011") {
        await client.messages.create({
          from: "whatsapp:+919911130173",
          //@ts-ignore
          to: `whatsapp:+917723866666`,
          contentSid: "HXbc0d42ac7ebeac2c22ca5dc2aba4577a",
          contentVariables: JSON.stringify({
            "1": rejectionReason,
          }),
        });
      }
      res.status(200).send("<Response></Response>");
    } else {
      res.status(200).send("<Response></Response>");
    }
  } catch (error) {
    console.error("Error handling admin response:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to process admin response." });
  }
};
