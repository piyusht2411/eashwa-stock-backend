import { Router } from 'express';
import { submitRequest, whatsappWebhook } from '../controller/twillio';

const router = Router();

router.post('/submit-request', submitRequest);
router.post('/whatsapp-webhook', whatsappWebhook);


export default router;