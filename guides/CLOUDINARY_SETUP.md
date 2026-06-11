# Cloudinary Setup Guide

Your video upload feature uses Cloudinary to store and serve video files. Follow these steps to set it up:

## Quick Setup (5 minutes)

### 1. Create Cloudinary Account

1. Go to [Cloudinary Signup](https://cloudinary.com/users/register/free)
2. Sign up with your email or GitHub account
3. Choose the **Free Plan** (includes 25GB storage, 25GB bandwidth/month)
4. Verify your email address
5. Complete the onboarding

### 2. Get Your Credentials

After signing in, you'll see your dashboard with your credentials:

1. Go to [Cloudinary Console Dashboard](https://console.cloudinary.com/console)
2. Find your **Account Details** section (top of the dashboard)
3. You'll see three important values:
   - **Cloud Name**: Your unique cloud identifier (e.g., `dxyz123abc`)
   - **API Key**: Your public API key (e.g., `123456789012345`)
   - **API Secret**: Your private API secret (e.g., `AbCdEfGhIjKlMnOpQrStUvWxYz`)

### 3. Add Credentials to .env

Open your `.env` file and update the Cloudinary configuration:

```env
# Cloudinary Configuration (REQUIRED for video uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name-here
CLOUDINARY_API_KEY=your-api-key-here
CLOUDINARY_API_SECRET=your-api-secret-here
```

**Example:**
```env
CLOUDINARY_CLOUD_NAME=dxyz123abc
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz
```

### 4. (Optional) Create Upload Preset for Unsigned Uploads

For simpler uploads, you can create an upload preset:

1. Go to **Settings** → **Upload** in your Cloudinary dashboard
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure:
   - **Name**: `affiliatexchange-videos`
   - **Signing Mode**: Unsigned
   - **Folder**: `affiliatexchange/videos` (optional)
   - **Resource type**: Auto
5. Click **Save**

Then add to your `.env`:
```env
CLOUDINARY_UPLOAD_PRESET=affiliatexchange-videos
```

**Note:** If you don't set an upload preset, the system will use signed uploads (more secure).

### 5. Restart Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 6. Test Video Upload

1. Go to an approved retainer contract or offer
2. Click "Submit Video" or "Upload Video"
3. Upload a video file
4. Should upload successfully to Cloudinary! ✅

---

## How It Works

### Video Upload Flow

1. **Frontend** requests upload parameters from backend (`/api/objects/upload`)
2. **Backend** generates Cloudinary signature or returns upload preset
3. **Frontend** uploads video directly to Cloudinary (not through your server)
4. **Cloudinary** processes and stores the video
5. **Frontend** receives the video URL and saves it to database

### Video Serving

Videos are served directly from Cloudinary's CDN:
- URL format: `https://res.cloudinary.com/your-cloud/video/upload/v123456/folder/filename.mp4`
- Automatic optimization and adaptive streaming
- Fast global delivery via CDN

---

## Troubleshooting

### Error: "Upload failed"

**Check your credentials:**
```bash
# In your .env file:
CLOUDINARY_CLOUD_NAME=... # Must match your dashboard
CLOUDINARY_API_KEY=...    # Must match your dashboard
CLOUDINARY_API_SECRET=... # Must match your dashboard (keep secret!)
```

**Restart your server:**
```bash
npm run dev
```

### Error: "Invalid signature"

- ✅ Make sure `CLOUDINARY_API_SECRET` is correct
- ✅ Check that there are no extra spaces in `.env` values
- ✅ Restart server after updating `.env`

### Error: "Upload preset not found"

If using unsigned upload preset:
- ✅ Create the preset in Cloudinary dashboard (Settings → Upload → Upload presets)
- ✅ Set signing mode to **Unsigned**
- ✅ Update `CLOUDINARY_UPLOAD_PRESET` in `.env`
- ✅ Restart server

Or remove `CLOUDINARY_UPLOAD_PRESET` to use signed uploads instead.

### Videos upload but show as broken

- ✅ Check that the `secure_url` is being saved to database (not `url`)
- ✅ Use HTTPS URLs (`https://res.cloudinary.com/...`)
- ✅ Verify video format is supported (MP4, MOV, AVI, WebM, etc.)

### File size too large

Free plan limits:
- ✅ Max file size: 100MB per upload
- ✅ For larger files, upgrade to a paid plan or compress videos before upload

---

## Cloudinary Pricing

### Free Tier (Forever)
- **Storage:** 25 GB
- **Bandwidth:** 25 GB/month
- **Transformations:** 25,000/month
- **Video processing:** Limited

**Perfect for:**
- Development and testing
- Small applications
- ~100-500 videos depending on size

### Paid Plans (If Needed)

**Plus Plan ($89/month):**
- Storage: 140 GB
- Bandwidth: 140 GB/month
- Transformations: 135,000/month
- Advanced video features

**Advanced Plan ($224/month):**
- Storage: 310 GB
- Bandwidth: 310 GB/month
- Transformations: 210,000/month
- Premium support

See [Cloudinary Pricing](https://cloudinary.com/pricing) for details.

---

## Security Best Practices

1. ✅ **Never commit** `.env` file to git
2. ✅ **Add to .gitignore:**
   ```
   .env
   .env.local
   .env.production
   ```
3. ✅ **Rotate API secrets** regularly (every 90 days)
4. ✅ **Use signed uploads** for production (more secure than unsigned)
5. ✅ **Set upload restrictions** in Cloudinary dashboard:
   - Maximum file size
   - Allowed formats (video only)
   - Resource types

---

## Advanced Features

### Video Transformations

Cloudinary can automatically:
- **Optimize quality** for faster loading
- **Generate thumbnails** from video frames
- **Convert formats** (MP4, WebM, etc.)
- **Add watermarks** to protect content
- **Adaptive bitrate streaming** for smooth playback

Example URL with transformation:
```
https://res.cloudinary.com/your-cloud/video/upload/
  q_auto,        # Auto quality
  f_auto,        # Auto format
  w_800          # Max width 800px
/affiliatexchange/videos/video-id.mp4
```

### Access Control

For private videos:
1. Enable **Strict transformations** in dashboard
2. Use **signed URLs** with expiration
3. Configure **allowed domains** for video embedding

### Analytics

Track video performance:
1. Go to **Reports** → **Usage** in dashboard
2. View:
   - Storage usage
   - Bandwidth consumption
   - Transformation requests
   - Popular videos

---

## Comparing to Google Cloud Storage

**Why Cloudinary?**

| Feature | Cloudinary | Google Cloud Storage |
|---------|-----------|---------------------|
| Setup Time | 5 minutes | 15-20 minutes |
| Video Optimization | Built-in | Manual |
| CDN | Included | Extra cost |
| Thumbnails | Auto-generated | Manual |
| Free Tier | 25GB storage + bandwidth | 5GB storage only |
| API Complexity | Simple | More complex |
| Best For | Video/image apps | General file storage |

---

## Need Help?

1. Check [Cloudinary Documentation](https://cloudinary.com/documentation)
2. Browse [Video Upload Guide](https://cloudinary.com/documentation/upload_videos)
3. Test uploads with [Upload Widget Demo](https://demo.cloudinary.com/uw/)
4. Contact [Cloudinary Support](https://support.cloudinary.com/) (even on free plan!)

Your videos will be stored at:
`https://res.cloudinary.com/your-cloud/video/upload/affiliatexchange/videos/...`

---

## Migration from Google Cloud Storage

If you were previously using Google Cloud Storage:

1. Update `.env` with Cloudinary credentials (remove GCS variables)
2. The code has been updated to use Cloudinary API
3. Existing videos in GCS will remain there
4. New uploads will go to Cloudinary
5. (Optional) Migrate old videos:
   - Download from GCS
   - Re-upload to Cloudinary
   - Update database URLs

---

**That's it!** Your video upload feature is now powered by Cloudinary. 🎥
