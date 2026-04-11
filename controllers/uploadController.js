const { UploadService } = require('../services/uploadService');
const { PrismaClient } = require('@prisma/client');
const aiService = require('../services/aiService');
const prisma = new PrismaClient();

class UploadController {
  /**
   * Upload and analyze photo
   */
  async uploadPhoto(req, res) {
    try {
      console.log('\n📸 Photo upload request received');
      
      const { leadId, sessionId } = req.body;
      const file = req.file;

      // Validate file
      if (!file) {
        console.log('❌ No file in request');
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      console.log(`📁 File: ${file.originalname}`);
      console.log(`📊 Size: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`🎨 Type: ${file.mimetype}`);

      // Step 1: Upload to Cloudinary
      console.log('☁️  Uploading to Cloudinary...');
      const uploadResult = await UploadService.uploadPhoto(
        file.buffer,
        file.originalname
      );
      console.log('✅ Cloudinary success:', uploadResult.url);

      // Step 2: Analyze photo with AI
      console.log('🧠 Analyzing photo with Estate Contractor AI...');
      let analysis;
      try {
        analysis = await aiService.analyzeImage(uploadResult.url);
        console.log('✅ Analysis complete');
      } catch (analysisError) {
        console.error('⚠️  AI analysis failed, using fallback response');
        analysis = UploadController.getFallbackAnalysis();
      }

      // Step 3: Save to database
      let photoRecord = null;
      if (leadId) {
        try {
          photoRecord = await prisma.photo.create({
            data: {
              leadId,
              url: uploadResult.url,
              filename: file.originalname
            }
          });
          console.log('💾 Saved to database:', photoRecord.id);
        } catch (dbError) {
          console.error('⚠️  Database save failed:', dbError.message);
          // Continue even if DB save fails
        }
      } else {
        console.log('ℹ️  No leadId provided, skipping database save');
      }

      // Step 4: Try to notify admin (non-blocking)
      UploadController.tryNotifyAdmin(uploadResult.url, analysis, leadId);

      // Success response
      res.json({
        success: true,
        photoUrl: uploadResult.url,
        analysis: analysis,
        photoId: photoRecord?.id,
        message: 'Photo uploaded and analyzed successfully'
      });

      console.log('✅ Photo upload complete\n');

    } catch (error) {
      console.error('❌ Upload error:', error);
      
      // Detailed error response
      res.status(500).json({
        success: false,
        error: 'Upload failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Try to notify admin (static method - non-blocking)
   */
  static tryNotifyAdmin(photoUrl, analysis, leadId) {
    try {
      const notificationService = require('../services/notificationService');
      
      if (notificationService && typeof notificationService.sendNotification === 'function') {
        notificationService.sendNotification({
          type: 'photo_upload',
          title: '📸 New Photo Uploaded',
          message: leadId ? `Lead ID: ${leadId}` : 'New photo from website visitor',
          data: {
            photoUrl,
            analysis: analysis.substring(0, 200)
          },
          timestamp: new Date().toISOString()
        });
        console.log('📢 Admin notified about photo upload');
      } else {
        console.log('ℹ️  Notification service not available');
      }
    } catch (error) {
      console.log('ℹ️  Admin notification skipped:', error.message);
    }
  }

  /**
   * Fallback analysis if AI fails (static method)
   */
  static getFallbackAnalysis() {
    return `📸 **Photo Uploaded Successfully!**

Thank you for sharing the image. Our expert team will analyze it and provide detailed recommendations within 24 hours.

**What we'll assess:**
✓ Current condition of the space
✓ Problem areas and issues  
✓ Best renovation solutions
✓ Accurate cost estimate

**Next Steps:**
Schedule a FREE on-site inspection for detailed analysis and accurate quote.

📞 **Contact:** 62891 37586  
📱 **WhatsApp:** +91 6289137586  
📧 **Email:** iestatecontractor2@gmail.com

Would you like our team to call you back?`;
  }

  /**
   * Get all photos for a lead
   */
  async getLeadPhotos(req, res) {
    try {
      const { leadId } = req.params;

      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required'
        });
      }

      const photos = await prisma.photo.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        count: photos.length,
        photos
      });

    } catch (error) {
      console.error('❌ Get photos error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve photos'
      });
    }
  }

  /**
   * Delete a photo
   */
  async deletePhoto(req, res) {
    try {
      const { photoId } = req.params;

      if (!photoId) {
        return res.status(400).json({
          success: false,
          error: 'Photo ID is required'
        });
      }

      await prisma.photo.delete({
        where: { id: photoId }
      });

      res.json({
        success: true,
        message: 'Photo deleted successfully'
      });

    } catch (error) {
      console.error('❌ Delete photo error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete photo'
      });
    }
  }
}

module.exports = new UploadController();
