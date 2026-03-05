import {Schema, model, Document } from "mongoose";
import { mUser } from "../types";

const messageUserSchema = new Schema<mUser>({
    name: {
        type: String,
        required: true,
    },
    messageId: {
        type: String,
        required: true,
    },
    productDescription: {
        type: String,
        required: true,
    },
    vendorName: {
        type: String,
        required: true,
    },
    amount: {
        type: String,
        required: true,
    },
    secondMessageId: {
        type: String,
        required: true,
    },
    whatsappNumber: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },

})

const messageUser = model('MessageUser', messageUserSchema);

export default messageUser;
