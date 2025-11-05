import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    public_id: `perfiles/${Date.now()}-${file.originalname}`,
    allowed_formats: ['jpg', 'png', 'jpeg'],
  }),
});

const upload = multer({ storage });

// Ruta para subir imagen
router.post('/profile-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No se envió ninguna imagen' });
    return;
  }
  res.json({ url: req.file.path });
});

export default router;
