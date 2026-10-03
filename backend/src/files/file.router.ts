import { Router } from 'express';
import multer from 'multer';
import { FileController } from './file.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { MAX_FILE_SIZE_BYTES } from '../config/constants';

const upload = multer({
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  storage: multer.memoryStorage(),
});

export function createFileRouter(): Router {
  const router = Router();
  const controller = new FileController();

  router.use(authMiddleware);

  router.post('/upload', upload.single('file'), controller.upload);
  router.get('/submission/:submissionId', controller.listForSubmission);
  router.get('/:id', controller.getById);
  router.get('/:id/download', controller.download);

  return router;
}
