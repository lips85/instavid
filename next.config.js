/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
            `${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com`,  // 이 형식도 추가
            process.env.CLOUDFRONT_URL,
        ].filter(Boolean),
    },
    // CORS 관련 헤더 설정 제거 (불필요할 수 있음)
}

module.exports = nextConfig 