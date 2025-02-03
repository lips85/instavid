# InstaVid: AI-Powered Video Content Generator

InstaVid는 텍스트 입력만으로 전문적인 숏폼 비디오를 자동으로 생성하는 AI 기반 도구입니다.

## 주요 기능

### 1. AI 스크립트 생성

- 주제 입력만으로 전문적인 스크립트 자동 생성
- GPT-4 기반의 자연스러운 내러티브 구성

### 2. 음성 합성

- 다양한 AI 보이스 옵션 제공
- 자연스러운 음성 톤과 억양 구현
- 실시간 음성 미리듣기 기능

### 3. 자동 자막 생성

- 음성 인식을 통한 정확한 자막 생성
- 타임라인 자동 동기화
- 가독성 높은 자막 스타일링

### 4. AI 이미지 생성

- 스크립트 기반 장면별 이미지 자동 생성
- 고품질 이미지 생성 (1024x1024)
- 네거티브 프롬프트를 통한 품질 제어

### 5. 비디오 편집 자동화

- 이미지 전환 효과 자동 적용
  - 줌인/줌아웃 효과
  - 패닝 효과
- 배경 음악 자동 믹싱
- 자막 애니메이션 효과

### 6. YouTube 메타데이터 생성

- AI 기반 제목 최적화
- 설명 및 태그 자동 생성
- SEO 최적화 지원

## 기술 스택

### Frontend

- Next.js 14
- TypeScript
- TailwindCSS
- ShadcnUI
- React

### Backend

- FastAPI
- Python
- MoviePy
- OpenCV
- NumPy

### AI/ML

- GPT-4
- Flux
- Whisper ASR

### 클라우드 서비스

- AWS S3
- CloudFront

## 설치 방법

1. 저장소 클론

```bash
git clone https://github.com/newtonjw/instavid.git
cd instavid
```

2. 프론트엔드 설정

```bash
npm install
```

3. 백엔드 설정

```bash
cd backend
pip install -r requirements.txt
```

4. 환경 변수 설정

```bash
# Frontend (.env)
OPENAI_API_KEY=your_key
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_key
AWS_REGION=your_region
AWS_BUCKET_NAME=your_bucket
CLOUDFRONT_URL=your_url
FASTAPI_URL=http://localhost:8001

# Backend (.env)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_key
AWS_REGION=your_region
AWS_BUCKET_NAME=your_bucket
OPENAI_API_KEY=your_key
```

5. 실행

```bash
# Frontend
npm run dev

# Backend
python run.py
```

## 라이선스

MIT License
