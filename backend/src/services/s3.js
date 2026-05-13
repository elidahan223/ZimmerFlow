const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

// S3 buckets live in a specific region that may differ from where Cognito (AWS_REGION) lives.
// Prefer S3_REGION; fall back to AWS_REGION then to eu-north-1 for legacy buckets.
const REGION = process.env.S3_REGION || process.env.AWS_REGION || 'eu-north-1';
const IMAGES_BUCKET = process.env.AWS_S3_IMAGES_BUCKET || 'zimmerflow-images';
const CONTRACTS_BUCKET = process.env.AWS_S3_CONTRACTS_BUCKET || 'zimmerflow-contracts';

const s3 = new S3Client({ region: REGION });

// Public images: returns a public URL (bucket policy allows public reads)
async function getImageUploadUrl({ folder, fileExtension, contentType }) {
  const key = `${folder}/${crypto.randomUUID()}.${fileExtension}`;
  const command = new PutObjectCommand({
    Bucket: IMAGES_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://${IMAGES_BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { uploadUrl, publicUrl, key };
}

// Private contracts: returns key only — reads require presigned URL via getContractDownloadUrl
async function getContractUploadUrl({ fileExtension = 'pdf', contentType = 'application/pdf' } = {}) {
  const key = `contracts/${crypto.randomUUID()}.${fileExtension}`;
  const command = new PutObjectCommand({
    Bucket: CONTRACTS_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { uploadUrl, key };
}

// Direct server-side upload of a contract PDF buffer
async function uploadContractBuffer(buffer, { fileExtension = 'pdf', contentType = 'application/pdf' } = {}) {
  const key = `contracts/${crypto.randomUUID()}.${fileExtension}`;
  await s3.send(new PutObjectCommand({
    Bucket: CONTRACTS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
}

async function getContractDownloadUrl(key, expiresIn = 600, downloadFilename = null) {
  const params = { Bucket: CONTRACTS_BUCKET, Key: key };
  if (downloadFilename) {
    params.ResponseContentDisposition = `attachment; filename="${downloadFilename}"`;
  }
  const command = new GetObjectCommand(params);
  return getSignedUrl(s3, command, { expiresIn });
}

async function deleteImage(publicUrl) {
  const key = publicUrl.split('.amazonaws.com/')[1];
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: IMAGES_BUCKET, Key: key }));
}

async function deleteContract(key) {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: CONTRACTS_BUCKET, Key: key }));
}

// Backward compatibility for existing callers
async function getUploadUrl(opts) {
  return getImageUploadUrl(opts);
}
async function deleteObject(publicUrl) {
  return deleteImage(publicUrl);
}

module.exports = {
  getImageUploadUrl,
  getContractUploadUrl,
  uploadContractBuffer,
  getContractDownloadUrl,
  deleteImage,
  deleteContract,
  getUploadUrl,
  deleteObject,
};
