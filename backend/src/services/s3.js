const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const BUCKET = 'zimmerflow-images';
const REGION = process.env.AWS_REGION || 'eu-north-1';

const s3 = new S3Client({ region: REGION });

async function getUploadUrl({ folder, fileExtension, contentType }) {
  const key = `${folder}/${crypto.randomUUID()}.${fileExtension}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { uploadUrl, publicUrl, key };
}

async function deleteObject(publicUrl) {
  const key = publicUrl.split('.amazonaws.com/')[1];
  if (!key) return;
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3.send(command);
}

module.exports = { getUploadUrl, deleteObject };
